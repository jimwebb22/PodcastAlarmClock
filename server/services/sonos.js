const { DeviceDiscovery } = require('sonos');

let discoveredDevices = [];
let isDiscovering = false;

async function discoverSpeakers() {
  return new Promise((resolve, reject) => {
    if (isDiscovering) {
      return resolve(discoveredDevices);
    }

    isDiscovering = true;
    discoveredDevices = [];

    const discovery = DeviceDiscovery();

    discovery.on('DeviceAvailable', (device) => {
      device.deviceDescription()
        .then(info => {
          discoveredDevices.push({
            uuid: device.host,
            name: info.roomName || info.displayName,
            model: info.modelName,
            host: device.host,
            deviceObject: device
          });
        })
        .catch(err => {
          console.error('Error getting device description:', err);
        });
    });

    // Give discovery 5 seconds to find devices
    setTimeout(() => {
      isDiscovering = false;
      resolve(discoveredDevices);
    }, 5000);
  });
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

    // Set the first track as the transport URI (replaces current source)
    const firstEpisode = episodeNames[0] || audioUrls[0].substring(0, 80);
    console.log(`Loading: ${firstEpisode}`);

    // Use metadata if available
    if (episodeMetadata.length > 0 && episodeMetadata[0]) {
      console.log(`Metadata for track 0:`, JSON.stringify(episodeMetadata[0], null, 2));
      const metadata = createDidlMetadata(episodeMetadata[0]);
      console.log(`DIDL metadata created (length: ${metadata.length} chars)`);
      try {
        // Pass as options object, not separate parameters
        await coordinator.deviceObject.setAVTransportURI({
          uri: audioUrls[0],
          metadata: metadata
        });
      } catch (err) {
        console.error('Error setting metadata:', err.message);
        // Fallback without metadata
        await coordinator.deviceObject.setAVTransportURI(audioUrls[0]);
      }
    } else {
      console.log('No metadata available for first track');
      await coordinator.deviceObject.setAVTransportURI(audioUrls[0]);
    }

    // Add remaining tracks to the queue
    for (let i = 1; i < audioUrls.length; i++) {
      const episodeName = episodeNames[i] || audioUrls[i].substring(0, 80);
      console.log(`Queuing [${i}/${audioUrls.length - 1}]: ${episodeName}`);

      // Use metadata if available
      if (episodeMetadata[i]) {
        console.log(`Metadata for track ${i}:`, JSON.stringify(episodeMetadata[i], null, 2));
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
        console.log(`No metadata for track ${i}`);
        await coordinator.deviceObject.queue(audioUrls[i]);
      }
    }

    // Wait a moment before playing
    await new Promise(resolve => setTimeout(resolve, 500));

    // Start playback from track 1
    await coordinator.deviceObject.play();
    console.log(`Started playback of ${audioUrls.length} episodes`);

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

module.exports = {
  discoverSpeakers,
  getSpeakerByUuid,
  groupSpeakers,
  ungroupSpeakers,
  setVolume,
  playQueue,
  playUrl,
  stopPlayback,
  getPlaybackState
};
