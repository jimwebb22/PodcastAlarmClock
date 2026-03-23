const express = require('express');
const router = express.Router();
const sonos = require('../services/sonos');
const { getSelectedSpeakers, setSelectedSpeakers } = require('../db/models');

// Discover speakers on network
// Uses IP fallback for saved speakers when SSDP multicast is blocked (PM2 background mode)
router.get('/discover', async (req, res) => {
  try {
    const savedSpeakers = await getSelectedSpeakers();
    const speakers = await sonos.discoverSpeakersWithFallback(savedSpeakers);
    res.json({
      speakers: speakers.map(s => ({
        uuid: s.uuid,
        name: s.name,
        model: s.model,
        host: s.host
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
      uuid: s.speaker_uuid,
      host: s.speaker_ip
    }));
    res.json({ speakers: mappedSpeakers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Connect to a speaker by direct IP address (bypasses SSDP discovery)
router.post('/discover-by-ip', async (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) {
      return res.status(400).json({ error: 'IP address required' });
    }

    // Basic IPv4 format validation before attempting connection
    const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (!ipRegex.test(ip.trim())) {
      return res.status(400).json({ error: 'Invalid IP address format — expected format: 192.168.1.100' });
    }

    const speaker = await sonos.discoverByIp(ip.trim());
    res.json({
      speaker: {
        uuid: speaker.uuid,
        name: speaker.name,
        model: speaker.model,
        host: speaker.host
      }
    });
  } catch (err) {
    // Differentiate error types for clearer user feedback
    let message;
    if (err.message.includes('No response') || err.message.includes('ETIMEDOUT')) {
      message = `No response from ${req.body.ip} — speaker may be off, or the IP address has changed`;
    } else if (err.code === 'ECONNREFUSED') {
      message = `Connection refused at ${req.body.ip} — the device at this IP is not a Sonos speaker`;
    } else if (err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH') {
      message = `${req.body.ip} is unreachable — check that the speaker is on the same network`;
    } else {
      message = `Could not connect to ${req.body.ip}: ${err.message}`;
    }
    res.status(500).json({ error: message });
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
      speaker_uuid: s.uuid,
      speaker_ip: s.host || null
    }));

    await setSelectedSpeakers(mappedSpeakers);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
