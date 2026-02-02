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
 * Play a queue of audio URLs on the Sonos speaker
 * Supports direct MP3 URLs from podcast RSS feeds
 * @param {string} coordinatorUuid - UUID of the coordinator speaker
 * @param {string[]} audioUrls - Array of audio URLs (MP3, etc.)
 */
async function playQueue(coordinatorUuid, audioUrls) {
  const coordinator = getSpeakerByUuid(coordinatorUuid);
  if (!coordinator) {
    throw new Error(`Coordinator ${coordinatorUuid} not found`);
  }

  try {
    // Clear current queue
    await coordinator.deviceObject.flush();

    // Add audio URLs to queue
    // node-sonos supports direct HTTP URLs for audio files
    for (const url of audioUrls) {
      console.log(`Queueing: ${url.substring(0, 80)}...`);
      await coordinator.deviceObject.queue(url);
    }

    // Start playback
    await coordinator.deviceObject.play();
    console.log(`Started playback of ${audioUrls.length} items`);
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
