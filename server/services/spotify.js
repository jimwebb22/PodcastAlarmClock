const SpotifyWebApi = require('spotify-web-api-node');
const { getSpotifyAuth, updateSpotifyAuth } = require('../db/models');

// Initialize Spotify API client
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

// OAuth scopes needed for the application
const SCOPES = [
  'user-follow-read',      // Read followed podcasts
  'user-top-read',         // Read top tracks
  'user-library-read',     // Read saved content
  'user-read-playback-state' // Read playback state
];

/**
 * Get the Spotify OAuth authorization URL
 * @returns {string} Authorization URL
 */
function getAuthUrl() {
  return spotifyApi.createAuthorizeURL(SCOPES, 'state-' + Date.now());
}

/**
 * Handle OAuth callback and store tokens
 * @param {string} code - Authorization code from callback
 * @returns {Promise<Object>} Token data
 */
async function handleCallback(code) {
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const accessToken = data.body.access_token;
    const refreshToken = data.body.refresh_token;
    const expiresIn = data.body.expires_in;
    const expiresAt = Date.now() + (expiresIn * 1000);

    // Set tokens on the API client
    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refreshToken);

    // Store tokens in database
    await updateSpotifyAuth({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt
    });

    return {
      accessToken,
      refreshToken,
      expiresIn,
      expiresAt
    };
  } catch (error) {
    console.error('Error handling Spotify callback:', error);
    throw error;
  }
}

/**
 * Refresh the access token using the refresh token
 * @returns {Promise<Object>} New token data
 */
async function refreshAccessToken() {
  try {
    const tokens = await getSpotifyAuth();

    if (!tokens || !tokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    spotifyApi.setRefreshToken(tokens.refresh_token);
    const data = await spotifyApi.refreshAccessToken();

    const accessToken = data.body.access_token;
    const expiresIn = data.body.expires_in;
    const expiresAt = Date.now() + (expiresIn * 1000);

    // Update access token on the API client
    spotifyApi.setAccessToken(accessToken);

    // Update tokens in database
    await updateSpotifyAuth({
      access_token: accessToken,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt
    });

    return {
      accessToken,
      expiresIn,
      expiresAt
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

/**
 * Ensure we have a valid access token, refreshing if necessary
 * @returns {Promise<boolean>} True if token is valid
 */
async function ensureValidToken() {
  try {
    const tokens = await getSpotifyAuth();

    if (!tokens || !tokens.access_token) {
      return false;
    }

    // If token expires in less than 5 minutes, refresh it
    const expiresAt = tokens.expires_at;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiresAt - now < fiveMinutes) {
      await refreshAccessToken();
    } else {
      // Token is still valid, set it on the API client
      spotifyApi.setAccessToken(tokens.access_token);
      if (tokens.refresh_token) {
        spotifyApi.setRefreshToken(tokens.refresh_token);
      }
    }

    return true;
  } catch (error) {
    console.error('Error ensuring valid token:', error);
    return false;
  }
}

/**
 * Get user's followed shows (podcasts)
 * @returns {Promise<Array>} List of followed shows
 */
async function getFollowedShows() {
  try {
    await ensureValidToken();

    const data = await spotifyApi.getFollowedShows({ limit: 50 });

    return data.body.items.map(item => ({
      id: item.show.id,
      name: item.show.name,
      description: item.show.description,
      publisher: item.show.publisher,
      images: item.show.images,
      totalEpisodes: item.show.total_episodes
    }));
  } catch (error) {
    console.error('Error getting followed shows:', error);
    throw error;
  }
}

/**
 * Get episodes for a specific show
 * @param {string} showId - Spotify show ID
 * @param {number} limit - Number of episodes to fetch (default: 10)
 * @returns {Promise<Array>} List of episodes
 */
async function getShowEpisodes(showId, limit = 10) {
  try {
    await ensureValidToken();

    const data = await spotifyApi.getShowEpisodes(showId, { limit });

    return data.body.items.map(episode => ({
      id: episode.id,
      name: episode.name,
      description: episode.description,
      durationMs: episode.duration_ms,
      releaseDate: episode.release_date,
      uri: episode.uri
    }));
  } catch (error) {
    console.error('Error getting show episodes:', error);
    throw error;
  }
}

/**
 * Get tracks from a user's Daily Mix playlist
 * @param {number} mixNumber - Daily Mix number (1-6)
 * @returns {Promise<Array>} List of tracks
 */
async function getDailyMixTracks(mixNumber = 1) {
  try {
    await ensureValidToken();

    // Search for the Daily Mix playlist
    const playlists = await spotifyApi.getUserPlaylists({ limit: 50 });
    const dailyMix = playlists.body.items.find(
      p => p.name === `Daily Mix ${mixNumber}`
    );

    if (!dailyMix) {
      throw new Error(`Daily Mix ${mixNumber} not found`);
    }

    const tracks = await spotifyApi.getPlaylistTracks(dailyMix.id, { limit: 50 });

    return tracks.body.items.map(item => ({
      id: item.track.id,
      name: item.track.name,
      artists: item.track.artists.map(a => a.name).join(', '),
      album: item.track.album.name,
      durationMs: item.track.duration_ms,
      uri: item.track.uri
    }));
  } catch (error) {
    console.error('Error getting Daily Mix tracks:', error);
    throw error;
  }
}

/**
 * Get user's top tracks
 * @param {string} timeRange - Time range: short_term, medium_term, or long_term
 * @param {number} limit - Number of tracks to fetch (default: 20)
 * @returns {Promise<Array>} List of top tracks
 */
async function getTopTracks(timeRange = 'medium_term', limit = 20) {
  try {
    await ensureValidToken();

    const data = await spotifyApi.getMyTopTracks({
      time_range: timeRange,
      limit
    });

    return data.body.items.map(track => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      durationMs: track.duration_ms,
      uri: track.uri,
      popularity: track.popularity
    }));
  } catch (error) {
    console.error('Error getting top tracks:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated with Spotify
 * @returns {Promise<boolean>} True if authenticated
 */
async function isAuthenticated() {
  try {
    const tokens = await getSpotifyAuth();
    return !!(tokens && tokens.access_token);
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

module.exports = {
  getAuthUrl,
  handleCallback,
  refreshAccessToken,
  ensureValidToken,
  getFollowedShows,
  getShowEpisodes,
  getDailyMixTracks,
  getTopTracks,
  isAuthenticated
};
