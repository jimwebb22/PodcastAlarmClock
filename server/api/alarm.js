const express = require('express');
const router = express.Router();
const { getAlarmConfig, updateAlarmConfig, getRecentLogs } = require('../db/models');
const scheduler = require('../services/scheduler');

// GET /api/alarm/config - Get alarm configuration
router.get('/config', async (req, res) => {
  try {
    const config = await getAlarmConfig();
    res.json(config);
  } catch (err) {
    console.error('Error getting alarm config:', err);
    res.status(500).json({ error: 'Failed to get alarm configuration' });
  }
});

// PUT /api/alarm/config - Update alarm configuration
router.put('/config', async (req, res) => {
  try {
    const {
      time,
      enabled,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
      volume,
      music_source
    } = req.body;

    // Basic validation
    if (!time || typeof enabled !== 'number') {
      return res.status(400).json({ error: 'Invalid configuration' });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
    }

    // Validate volume
    if (volume < 0 || volume > 100) {
      return res.status(400).json({ error: 'Volume must be between 0 and 100' });
    }

    await updateAlarmConfig({
      time,
      enabled,
      monday: monday ? 1 : 0,
      tuesday: tuesday ? 1 : 0,
      wednesday: wednesday ? 1 : 0,
      thursday: thursday ? 1 : 0,
      friday: friday ? 1 : 0,
      saturday: saturday ? 1 : 0,
      sunday: sunday ? 1 : 0,
      volume,
      music_source
    });

    // Reschedule alarm with new configuration
    await scheduler.rescheduleAlarm();

    res.json({ success: true, message: 'Alarm configuration updated' });
  } catch (err) {
    console.error('Error updating alarm config:', err);
    res.status(500).json({ error: 'Failed to update alarm configuration' });
  }
});

// GET /api/alarm/status - Get alarm status (playing, scheduled, etc.)
router.get('/status', async (req, res) => {
  try {
    const status = await scheduler.getAlarmStatus();
    res.json(status);
  } catch (err) {
    console.error('Error getting alarm status:', err);
    res.status(500).json({ error: 'Failed to get alarm status' });
  }
});

// POST /api/alarm/test - Trigger alarm immediately (for testing)
router.post('/test', async (req, res) => {
  try {
    // Trigger alarm in background (don't wait for it to complete)
    scheduler.triggerAlarm().catch(err => {
      console.error('Test alarm failed:', err);
    });

    res.json({ success: true, message: 'Test alarm triggered' });
  } catch (err) {
    console.error('Error triggering test alarm:', err);
    res.status(500).json({ error: 'Failed to trigger test alarm' });
  }
});

// POST /api/alarm/stop - Stop current playback
router.post('/stop', async (req, res) => {
  try {
    await scheduler.stopAlarm();
    res.json({ success: true, message: 'Alarm stopped' });
  } catch (err) {
    console.error('Error stopping alarm:', err);
    res.status(500).json({ error: 'Failed to stop alarm' });
  }
});

// GET /api/alarm/logs - Get recent alarm logs
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const logs = await getRecentLogs(limit);
    res.json(logs);
  } catch (err) {
    console.error('Error getting alarm logs:', err);
    res.status(500).json({ error: 'Failed to get alarm logs' });
  }
});

module.exports = router;
