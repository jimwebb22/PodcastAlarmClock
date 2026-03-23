const dgram = require('dgram');
const { Sonos } = require('sonos');
const { updateSpeakerIp } = require('../db/models');

let discoveredDevices = [];
let isDiscovering = false;

// For test isolation only
function __resetForTesting() {
  discoveredDevices = [];
  isDiscovering = false;
}

async function discoverSpeakers() {
  if (isDiscovering) {
    return discoveredDevices;
  }

  isDiscovering = true;
  discoveredDevices = [];

  return new Promise((resolve) => {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const foundAddresses = new Set();
    const pendingDescriptions = [];

    // SSDP M-SEARCH for Sonos ZonePlayer devices
    const PLAYER_SEARCH = Buffer.from(
      'M-SEARCH * HTTP/1.1\r\n' +
      'HOST: 239.255.255.250:1900\r\n' +
      'MAN: "ssdp:discover"\r\n' +
      'MX: 3\r\n' +
      'ST: urn:schemas-upnp-org:device:ZonePlayer:1\r\n\r\n'
    );

    socket.on('error', (err) => {
      console.error('SSDP socket error:', err.message);
    });

    socket.on('message', (buffer, rinfo) => {
      try {
        const response = buffer.toString();
        // Check for Sonos device response (case-insensitive to handle firmware variations)
        if (response.match(/Sonos/i)) {
          const addr = rinfo.address;
          if (!foundAddresses.has(addr)) {
            foundAddresses.add(addr);
            console.log(`SSDP: Found Sonos device at ${addr}`);
            const device = new Sonos(addr);
            const descPromise = device.deviceDescription()
              .then(info => {
                // Use the permanent RINCON hardware UUID instead of IP address.
                // IPs can change on DHCP renewal; RINCON IDs are stable forever.
                const rinconUuid = info.UDN ? info.UDN.replace('uuid:', '') : addr;
                discoveredDevices.push({
                  uuid: rinconUuid,
                  name: info.roomName || info.displayName || addr,
                  model: info.modelName || 'Sonos',
                  host: addr,
                  deviceObject: device
                });
                console.log(`SSDP: Added speaker "${info.roomName || info.displayName}" (${rinconUuid}) at ${addr}`);
              })
              .catch(err => {
                console.error(`SSDP: Error getting device description for ${addr}:`, err.message);
              });
            pendingDescriptions.push(descPromise);
          }
        }
      } catch (err) {
        console.error('SSDP: Error processing response:', err.message);
      }
    });

    socket.bind(() => {
      socket.setBroadcast(true);
      // Send to both SSDP multicast and broadcast addresses
      socket.send(PLAYER_SEARCH, 0, PLAYER_SEARCH.length, 1900, '239.255.255.250');
      socket.send(PLAYER_SEARCH, 0, PLAYER_SEARCH.length, 1900, '255.255.255.255');
      console.log('SSDP: Sent M-SEARCH packets, waiting for responses...');
    });

    // After 10 seconds, close socket and wait for any pending device descriptions
    setTimeout(() => {
      try { socket.close(); } catch (e) { /* already closed */ }

      // Wait up to 5 more seconds for pending deviceDescription() calls to finish
      const descTimeout = new Promise(r => setTimeout(r, 5000));
      Promise.race([Promise.allSettled(pendingDescriptions), descTimeout])
        .then(() => {
          console.log(`SSDP discovery complete: found ${discoveredDevices.length} speaker(s)`);
          isDiscovering = false;
          resolve(discoveredDevices);
        });
    }, 10000);
  });
}

/**
 * Connect directly to a Sonos device by IP address, bypassing SSDP discovery.
 * Use this when SSDP discovery fails (firewall, firmware changes, IP changes).
 * @param {string} ipAddress - IP address of the Sonos device
 * @returns {Promise<Object>} Speaker info object
 */
async function discoverByIp(ipAddress) {
  console.log(`discoverByIp: connecting to ${ipAddress}:1400...`);
  const device = new Sonos(ipAddress);

  // 5-second timeout — deviceDescription() HTTP call hangs for 60+ seconds on unreachable devices
  const timeoutMs = 5000;
  const info = await Promise.race([
    device.deviceDescription(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`No response from ${ipAddress} after ${timeoutMs / 1000}s — device may be off or IP may have changed`)), timeoutMs)
    )
  ]);

  // Use the permanent RINCON hardware UUID instead of IP address
  const rinconUuid = info.UDN ? info.UDN.replace('uuid:', '') : ipAddress;

  const speakerInfo = {
    uuid: rinconUuid,
    name: info.roomName || info.displayName || ipAddress,
    model: info.modelName || 'Sonos',
    host: ipAddress,
    deviceObject: device
  };

  console.log(`discoverByIp: success — "${speakerInfo.name}" (${speakerInfo.uuid}) at ${ipAddress}`);

  // Update or add to discoveredDevices so the rest of the system can use it
  const existingIndex = discoveredDevices.findIndex(d => d.uuid === rinconUuid);
  if (existingIndex >= 0) {
    discoveredDevices[existingIndex] = speakerInfo;
  } else {
    discoveredDevices.push(speakerInfo);
  }

  return speakerInfo;
}

function getSpeakerByUuid(uuid) {
  return discoveredDevices.find(d => d.uuid === uuid);
}

async function groupSpeakers(coordinatorUuid, memberUuids) {
  const coordinator = getSpeakerByUuid(coordinatorUuid);
  if (!coordinator) {
    throw new Error(`Coordinator speaker ${coordinatorUuid} not found`);
  }

  const members = memberUuids
    .map(uuid => getSpeakerByUuid(uuid))
    .filter(Boolean);

  if (members.length !== memberUuids.length) {
    throw new Error('Some member speakers not found');
  }

  try {
    // Join all members to coordinator
    for (const member of members) {
      if (member.uuid !== coordinatorUuid) {
        await member.deviceObject.joinGroup(coordinator.name);
      }
    }
    return coordinator;
  } catch (err) {
    console.error('Error grouping speakers:', err);
    throw err;
  }
}

async function ungroupSpeakers(speakerUuids) {
  for (const uuid of speakerUuids) {
    const speaker = getSpeakerByUuid(uuid);
    if (speaker) {
      try {
        await speaker.deviceObject.leaveGroup();
      } catch (err) {
        console.error(`Error ungrouping speaker ${uuid}:`, err);
      }
    }
  }
}

async function setVolume(speakerUuid, volume) {
  const speaker = getSpeakerByUuid(speakerUuid);
  if (!speaker) {
    throw new Error(`Speaker ${speakerUuid} not found`);
  }

  await speaker.deviceObject.setVolume(volume);
}

/**
 * Create DIDL-Lite metadata XML for a track
 * @param {Object} metadata - Track metadata (title, artist, albumArt, audioUrl)
 * @returns {string} DIDL-Lite XML
 */
function createDidlMetadata(metadata) {
  const { title = 'Untitled', artist = 'Unknown Podcast', albumArt = '', audioUrl = '' } = metadata;

  // Escape XML special characters
  const escape = (str) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  // Mobile apps often need both albumArtURI and artist tags
  const albumArtXml = albumArt ? `<upnp:albumArtURI>${escape(albumArt)}</upnp:albumArtURI>` : '';

  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
  <item id="-1" parentID="-1" restricted="true">
    <res protocolInfo="http-get:*:audio/mpeg:*">${escape(audioUrl)}</res>
    ${albumArtXml}
    <dc:title>${escape(title)}</dc:title>
    <r:streamContent>${escape(title)}</r:streamContent>
    <r:radioShowMd>${escape(title)}</r:radioShowMd>
    <upnp:class>object.item.audioItem.musicTrack</upnp:class>
    <dc:creator>${escape(artist)}</dc:creator>
    <upnp:artist>${escape(artist)}</upnp:artist>
    <upnp:album>${escape(artist)}</upnp:album>
    <upnp:albumArtist>${escape(artist)}</upnp:albumArtist>
  </item>
</DIDL-Lite>`;
}

/**
 * Play a queue of audio URLs on the Sonos speaker
 * Supports direct MP3 URLs from podcast RSS feeds
 * @param {string} coordinatorUuid - UUID of the coordinator speaker
 * @param {string[]} audioUrls - Array of audio URLs (MP3, etc.)
 * @param {string[]} episodeNames - Optional array of episode names for logging
 * @param {Object[]} episodeMetadata - Optional array of metadata objects (title, artist, albumArt, audioUrl)
 */
async function playQueue(coordinatorUuid, audioUrls, episodeNames = [], episodeMetadata = []) {
  const coordinator = getSpeakerByUuid(coordinatorUuid);
  if (!coordinator) {
    throw new Error(`Coordinator ${coordinatorUuid} not found`);
  }

  if (audioUrls.length === 0) {
    throw new Error('No audio URLs provided');
  }

  try {
    // Stop any current playback first
    try {
      await coordinator.deviceObject.stop();
      console.log('Stopped current playback');
    } catch (stopErr) {
      // Ignore if nothing was playing
      console.log('Nothing playing to stop');
    }

    // Wait a moment for Sonos to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Clear current queue completely
    await coordinator.deviceObject.flush();
    console.log('Cleared queue');

    // Add ALL tracks to the queue (including the first one)
    console.log(`Adding ${audioUrls.length} tracks to queue...`);
    for (let i = 0; i < audioUrls.length; i++) {
      const episodeName = episodeNames[i] || audioUrls[i].substring(0, 80);
      console.log(`Queuing [${i + 1}/${audioUrls.length}]: ${episodeName}`);

      // Use metadata if available
      if (episodeMetadata[i]) {
        console.log(`  -> With metadata: ${episodeMetadata[i].title}`);
        const metadata = createDidlMetadata(episodeMetadata[i]);
        try {
          await coordinator.deviceObject.queue({
            uri: audioUrls[i],
            metadata: metadata
          });
        } catch (err) {
          console.error(`Error queueing with metadata for track ${i}:`, err.message);
          // Fallback without metadata
          await coordinator.deviceObject.queue(audioUrls[i]);
        }
      } else {
        console.log(`  -> No metadata available`);
        await coordinator.deviceObject.queue(audioUrls[i]);
      }
    }

    console.log(`All ${audioUrls.length} tracks queued successfully`);

    // Wait a moment for queue to settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // CRITICAL: Set play mode to NORMAL (not shuffle, not repeat)
    try {
      await coordinator.deviceObject.setPlayMode('NORMAL');
      console.log('✓ Play mode set to NORMAL');
    } catch (err) {
      console.error('Warning: Could not set play mode:', err.message);
    }

    // Get queue info to verify tracks are there
    try {
      const queue = await coordinator.deviceObject.getQueue();
      console.log(`✓ Queue contains ${queue.items.length} items`);
      if (queue.items.length > 0) {
        console.log(`  First item: ${queue.items[0].title || queue.items[0].uri}`);
        if (queue.items.length > 1) {
          console.log(`  Second item: ${queue.items[1].title || queue.items[1].uri}`);
        }
      }
    } catch (err) {
      console.error('Warning: Could not get queue info:', err.message);
    }

    // CRITICAL FIX: Set the AVTransport to use the queue
    // Problem: Even though tracks are queued, Sonos may play from cached/old state
    // Solution: Explicitly set AVTransport URI to the queue using x-rincon-queue protocol
    // Format: x-rincon-queue:RINCON_<device-id>#0
    //   - RINCON_xxx is the device's unique ID
    //   - #0 means start from beginning of queue
    // This ensures:
    //   1. Queue shows "In Use" (not "Not in Use")
    //   2. Playback continues sequentially through all queued tracks
    //   3. No cached state interferes with new playback session
    const deviceInfo = await coordinator.deviceObject.deviceDescription();
    const rinconId = deviceInfo.UDN.replace('uuid:', '');
    const queueURI = `x-rincon-queue:${rinconId}#0`;

    console.log(`Setting AVTransport to queue: ${queueURI}`);
    try {
      await coordinator.deviceObject.setAVTransportURI(queueURI);
      console.log('✓ AVTransport now pointing to queue');
    } catch (err) {
      console.error('ERROR: Failed to set queue as transport:', err.message);
      throw err;
    }

    // Wait for transport to update
    await new Promise(resolve => setTimeout(resolve, 500));

    // Now select track 1 in the queue
    try {
      await coordinator.deviceObject.selectTrack(1);
      console.log('✓ Selected track 1 in queue');
    } catch (err) {
      console.error('Warning: Could not select track:', err.message);
    }

    // Start playback
    await coordinator.deviceObject.play();
    console.log(`✓ Started playback from queue with ${audioUrls.length} episodes`);

    // Verify playback started and check current track info
    const state = await coordinator.deviceObject.getCurrentState();
    console.log(`Playback state after start: ${state}`);

    // Get current track info to verify metadata
    try {
      const currentTrack = await coordinator.deviceObject.currentTrack();
      console.log('Current track info:', JSON.stringify({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        albumArtURI: currentTrack.albumArtURI
      }, null, 2));
    } catch (err) {
      console.error('Error getting current track info:', err.message);
    }
  } catch (err) {
    console.error('Error playing queue:', err);
    throw err;
  }
}

/**
 * Play a single audio URL immediately (for testing)
 * @param {string} speakerUuid - UUID of the speaker
 * @param {string} audioUrl - Direct URL to audio file
 */
async function playUrl(speakerUuid, audioUrl) {
  const speaker = getSpeakerByUuid(speakerUuid);
  if (!speaker) {
    throw new Error(`Speaker ${speakerUuid} not found`);
  }

  try {
    await speaker.deviceObject.play(audioUrl);
    console.log(`Playing URL: ${audioUrl.substring(0, 80)}...`);
  } catch (err) {
    console.error('Error playing URL:', err);
    throw err;
  }
}

async function stopPlayback(speakerUuid) {
  const speaker = getSpeakerByUuid(speakerUuid);
  if (!speaker) {
    throw new Error(`Speaker ${speakerUuid} not found`);
  }

  await speaker.deviceObject.pause();
}

/**
 * Get current playback state
 * @param {string} speakerUuid - UUID of the speaker
 * @returns {Promise<Object>} Current playback state
 */
async function getPlaybackState(speakerUuid) {
  const speaker = getSpeakerByUuid(speakerUuid);
  if (!speaker) {
    throw new Error(`Speaker ${speakerUuid} not found`);
  }

  try {
    const state = await speaker.deviceObject.getCurrentState();
    const track = await speaker.deviceObject.currentTrack();
    return { state, track };
  } catch (err) {
    console.error('Error getting playback state:', err);
    throw err;
  }
}

/**
 * Discover speakers with IP-based fallback for saved speakers.
 * Tries SSDP first, then connects directly by IP for any saved speakers
 * not found via SSDP. This allows the alarm to work when the server runs
 * in background mode (PM2) where macOS may not grant SSDP multicast access.
 * @param {Array} savedSpeakers - Array of {speaker_uuid, speaker_name, speaker_ip} from DB
 * @returns {Promise<Array>} Discovered devices
 */
async function discoverSpeakersWithFallback(savedSpeakers = []) {
  // Try SSDP discovery first (may find zero speakers if running in background)
  try {
    await discoverSpeakers();
  } catch (err) {
    console.warn('SSDP discovery failed:', err.message);
  }

  for (const saved of savedSpeakers) {
    const discovered = getSpeakerByUuid(saved.speaker_uuid);

    if (discovered) {
      // Speaker found via SSDP — sync new IP to database if it changed (handles DHCP reassignment)
      if (discovered.host !== saved.speaker_ip) {
        console.log(`IP changed for "${saved.speaker_name}": ${saved.speaker_ip} → ${discovered.host}`);
        try {
          await updateSpeakerIp(saved.speaker_uuid, discovered.host);
        } catch (err) {
          console.warn(`Failed to update IP for "${saved.speaker_name}":`, err.message);
        }
      }
      continue; // Already found via SSDP, no IP fallback needed
    }

    // Not found via SSDP — try direct IP connection
    if (!saved.speaker_ip) continue;
    console.log(`"${saved.speaker_name}" not found via SSDP, trying IP ${saved.speaker_ip}...`);
    try {
      await discoverByIp(saved.speaker_ip);
      console.log(`Connected to "${saved.speaker_name}" via IP fallback`);
    } catch (err) {
      console.error(`IP fallback failed for "${saved.speaker_name}" at ${saved.speaker_ip}:`, err.message);
    }
  }

  return discoveredDevices;
}

module.exports = {
  discoverSpeakers,
  discoverByIp,
  discoverSpeakersWithFallback,
  getSpeakerByUuid,
  groupSpeakers,
  ungroupSpeakers,
  setVolume,
  playQueue,
  playUrl,
  stopPlayback,
  getPlaybackState,
  __resetForTesting
};
