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
    return res.send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h2 style="color: #dc2626;">Authorization Denied</h2>
          <p>You denied access to Spotify. Please close this window and try again.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h2 style="color: #dc2626;">Error</h2>
          <p>No authorization code received. Please close this window and try again.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  }

  try {
    await spotify.handleCallback(code);
    res.send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h2 style="color: #059669;">Success!</h2>
          <p>Successfully connected to Spotify. This window will close automatically.</p>
          <script>setTimeout(() => window.close(), 1500);</script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Error handling Spotify callback:', err);
    res.send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h2 style="color: #dc2626;">Authentication Failed</h2>
          <p>${err.message || 'Failed to complete authentication'}</p>
          <p style="font-size: 0.875rem; color: #6b7280; margin-top: 20px;">
            Please check that your Spotify credentials are configured correctly in the .env file.
          </p>
          <script>setTimeout(() => window.close(), 5000);</script>
        </body>
      </html>
    `);
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
