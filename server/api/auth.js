const express = require('express');
const router = express.Router();
const spotify = require('../services/spotify');

/**
 * GET /api/auth/spotify/login
 * Get the Spotify authorization URL
 */
router.get('/spotify/login', (req, res) => {
  try {
    const authUrl = spotify.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /api/auth/spotify/callback
 * Handle the OAuth callback from Spotify
 */
router.get('/spotify/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ error: 'Authorization denied' });
  }

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  try {
    await spotify.handleCallback(code);
    res.json({ success: true, message: 'Successfully authenticated with Spotify' });
  } catch (err) {
    console.error('Error handling Spotify callback:', err);
    res.status(500).json({ error: 'Failed to complete authentication' });
  }
});

/**
 * GET /api/auth/spotify/status
 * Check if the user is authenticated with Spotify
 */
router.get('/spotify/status', async (req, res) => {
  try {
    const authenticated = await spotify.isAuthenticated();
    res.json({ authenticated });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({ error: 'Failed to check authentication status' });
  }
});

module.exports = router;
