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
    // Map backend property names to frontend property names
    const mappedSpeakers = speakers.map(s => ({
      name: s.speaker_name,
      uuid: s.speaker_uuid
    }));
    res.json({ speakers: mappedSpeakers });
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

    // Map frontend property names to backend property names
    const mappedSpeakers = speakers.map(s => ({
      speaker_name: s.name,
      speaker_uuid: s.uuid
    }));

    await setSelectedSpeakers(mappedSpeakers);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
