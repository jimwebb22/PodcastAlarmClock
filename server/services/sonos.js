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

async function playQueue(coordinatorUuid, spotifyUris) {
  const coordinator = getSpeakerByUuid(coordinatorUuid);
  if (!coordinator) {
    throw new Error(`Coordinator ${coordinatorUuid} not found`);
  }

  try {
    // Clear current queue
    await coordinator.deviceObject.flush();

    // Add URIs to queue
    for (const uri of spotifyUris) {
      await coordinator.deviceObject.queue(uri);
    }

    // Start playback
    await coordinator.deviceObject.play();
  } catch (err) {
    console.error('Error playing queue:', err);
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

module.exports = {
  discoverSpeakers,
  getSpeakerByUuid,
  groupSpeakers,
  ungroupSpeakers,
  setVolume,
  playQueue,
  stopPlayback
};
