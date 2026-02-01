const express = require('express');
const router = express.Router();
const sonos = require('../services/sonos');
const { getSelectedSpeakers, setSelectedSpeakers } = require('../db/models');

// Discover speakers on network
router.get('/discover', async (req, res) => {
  try {
    const speakers = await sonos.discoverSpeakers();
    res.json({
      speakers: speakers.map(s => ({
        uuid: s.uuid,
        name: s.name,
        model: s.model
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get selected speakers
router.get('/selected', async (req, res) => {
  try {
    const speakers = await getSelectedSpeakers();
    res.json({ speakers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set selected speakers
router.post('/selected', async (req, res) => {
  try {
    const { speakers } = req.body;

    if (!Array.isArray(speakers)) {
      return res.status(400).json({ error: 'speakers must be an array' });
    }

    await setSelectedSpeakers(speakers);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
