const cron = require('node-cron');
const { getAlarmConfig, getSelectedSpeakers, addAlarmLog } = require('../db/models');
const sonos = require('./sonos');
const playlist = require('./playlist');

let currentJob = null;
let isPlaying = false;
let currentCoordinatorUuid = null;
let currentSpeakerUuids = [];

// Convert day index (0=Sunday) to day name
function getDayName(dayIndex) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[dayIndex];
}

// Check if alarm should trigger today
async function shouldTriggerToday(config) {
  if (!config.enabled) {
    return false;
  }

  const today = new Date();
  const dayName = getDayName(today.getDay());

  return config[dayName] === 1;
}

// Main alarm trigger function with fallback logic
async function triggerAlarm() {
  console.log('Alarm triggered at', new Date().toISOString());

  try {
    const config = await getAlarmConfig();
    const selectedSpeakers = await getSelectedSpeakers();

    // Check if alarm should trigger today
    const shouldTrigger = await shouldTriggerToday(config);
    if (!shouldTrigger) {
      console.log('Alarm not scheduled for today');
      return;
    }

    if (selectedSpeakers.length === 0) {
      throw new Error('No speakers configured');
    }

    console.log(`Building playlist for alarm...`);
    const { queue, episodeNames, episodeMetadata } = await playlist.buildPlaylistWithRetry();

    console.log(`Built playlist with ${queue.length} items, ${episodeNames.length} episodes`);

    // Discover speakers first
    console.log('Discovering Sonos speakers...');
    await sonos.discoverSpeakers();

    // Try to group all configured speakers
    let coordinator = null;
    let groupedUuids = [];

    // Use first speaker as coordinator
    const coordinatorUuid = selectedSpeakers[0].speaker_uuid;

    // Filter to only configured speakers that were discovered
    const availableSpeakers = selectedSpeakers.filter(s =>
      sonos.getSpeakerByUuid(s.speaker_uuid) !== undefined
    );

    if (availableSpeakers.length === 0) {
      throw new Error('None of the configured speakers are available');
    }

    const availableUuids = availableSpeakers.map(s => s.speaker_uuid);

    console.log(`Found ${availableSpeakers.length}/${selectedSpeakers.length} configured speakers available`);

    // Try grouping all available configured speakers
    try {
      if (availableUuids.length > 1) {
        console.log('Attempting to group speakers...');
        coordinator = await sonos.groupSpeakers(coordinatorUuid, availableUuids);
        groupedUuids = availableUuids;
      } else {
        // Only one speaker available, no grouping needed
        coordinator = sonos.getSpeakerByUuid(coordinatorUuid);
        groupedUuids = [coordinatorUuid];
      }
    } catch (groupError) {
      console.error('Error grouping speakers:', groupError);
      // Fall back to using only the coordinator
      console.log('Falling back to single speaker playback');
      coordinator = sonos.getSpeakerByUuid(coordinatorUuid);
      groupedUuids = [coordinatorUuid];
    }

    // Set volume on all grouped speakers
    console.log(`Setting volume to ${config.volume}%...`);
    for (const uuid of groupedUuids) {
      try {
        await sonos.setVolume(uuid, config.volume);
      } catch (volError) {
        console.error(`Error setting volume on ${uuid}:`, volError);
      }
    }

    // Play the queue
    console.log('Starting playback...');
    await sonos.playQueue(coordinatorUuid, queue, episodeNames, episodeMetadata);

    // Update state
    isPlaying = true;
    currentCoordinatorUuid = coordinatorUuid;
    currentSpeakerUuids = groupedUuids;

    // Log success
    await addAlarmLog({
      triggered_at: new Date().toISOString(),
      success: 1,
      error_message: null,
      episodes_played: episodeNames
    });

    console.log('Alarm playback started successfully');
  } catch (err) {
    console.error('Error triggering alarm:', err);

    // Log failure
    try {
      await addAlarmLog({
        triggered_at: new Date().toISOString(),
        success: 0,
        error_message: err.message,
        episodes_played: null
      });
    } catch (logError) {
      console.error('Error logging alarm failure:', logError);
    }

    throw err;
  }
}

// Stop alarm playback
async function stopAlarm() {
  if (!isPlaying) {
    return;
  }

  try {
    console.log('Stopping alarm playback...');

    // Stop playback on coordinator
    if (currentCoordinatorUuid) {
      await sonos.stopPlayback(currentCoordinatorUuid);
    }

    // Ungroup all speakers
    if (currentSpeakerUuids.length > 1) {
      await sonos.ungroupSpeakers(currentSpeakerUuids);
    }

    // Reset state
    isPlaying = false;
    currentCoordinatorUuid = null;
    currentSpeakerUuids = [];

    console.log('Alarm stopped');
  } catch (err) {
    console.error('Error stopping alarm:', err);
    throw err;
  }
}

// Reschedule alarm based on current config
async function rescheduleAlarm() {
  try {
    // Cancel existing job
    if (currentJob) {
      currentJob.stop();
      currentJob = null;
    }

    const config = await getAlarmConfig();

    if (!config || !config.time) {
      console.log('No alarm configuration found');
      return;
    }

    // Parse time (format: "HH:MM")
    const [hours, minutes] = config.time.split(':').map(Number);

    // Create cron expression: "minute hour * * *"
    const cronExpression = `${minutes} ${hours} * * *`;

    console.log(`Scheduling alarm for ${config.time} (cron: ${cronExpression})`);

    // Create new cron job
    currentJob = cron.schedule(cronExpression, async () => {
      try {
        await triggerAlarm();
      } catch (err) {
        console.error('Scheduled alarm failed:', err);
      }
    });

    console.log('Alarm scheduled successfully');
  } catch (err) {
    console.error('Error rescheduling alarm:', err);
    throw err;
  }
}

// Get current alarm status
async function getAlarmStatus() {
  try {
    const config = await getAlarmConfig();
    const selectedSpeakers = await getSelectedSpeakers();

    let nextAlarmDate = null;

    if (config && config.enabled) {
      // Find next day alarm will trigger
      const today = new Date();
      const currentDay = today.getDay();
      const [hours, minutes] = config.time.split(':').map(Number);

      for (let i = 0; i <= 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const checkDay = checkDate.getDay();
        const dayName = getDayName(checkDay);

        if (config[dayName] === 1) {
          // If today and time hasn't passed yet
          if (i === 0) {
            const alarmTime = new Date(today);
            alarmTime.setHours(hours, minutes, 0, 0);
            if (alarmTime > today) {
              nextAlarmDate = alarmTime;
              break;
            }
          } else {
            // Future day
            const alarmTime = new Date(checkDate);
            alarmTime.setHours(hours, minutes, 0, 0);
            nextAlarmDate = alarmTime;
            break;
          }
        }
      }
    }

    return {
      enabled: config ? config.enabled === 1 : false,
      time: config ? config.time : null,
      volume: config ? config.volume : null,
      speakers: selectedSpeakers,
      nextAlarm: nextAlarmDate ? nextAlarmDate.toISOString() : null,
      isPlaying,
      scheduledDays: config ? {
        monday: config.monday === 1,
        tuesday: config.tuesday === 1,
        wednesday: config.wednesday === 1,
        thursday: config.thursday === 1,
        friday: config.friday === 1,
        saturday: config.saturday === 1,
        sunday: config.sunday === 1
      } : null
    };
  } catch (err) {
    console.error('Error getting alarm status:', err);
    throw err;
  }
}

module.exports = {
  triggerAlarm,
  stopAlarm,
  rescheduleAlarm,
  getAlarmStatus
};
