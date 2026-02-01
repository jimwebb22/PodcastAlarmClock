const express = require('express');
const router = express.Router();
const spotify = require('../services/spotify');
const { getSelectedPodcasts, setSelectedPodcasts } = require('../db/models');

// Get user's followed podcasts from Spotify
router.get('/followed', async (req, res) => {
  try {
    const shows = await spotify.getFollowedShows();
    res.json({ shows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get selected (alarm-eligible) podcasts
router.get('/selected', async (req, res) => {
  try {
    const podcasts = await getSelectedPodcasts();
    res.json({ podcasts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set selected podcasts
router.post('/selected', async (req, res) => {
  try {
    const { podcasts } = req.body;

    if (!Array.isArray(podcasts)) {
      return res.status(400).json({ error: 'podcasts must be an array' });
    }

    await setSelectedPodcasts(podcasts);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
