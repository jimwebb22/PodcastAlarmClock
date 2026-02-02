const rss = require('./rss');
const { getAlarmConfig } = require('../db/models');

/**
 * Build the alarm playlist queue from RSS podcast feeds
 * Since we're not using music anymore, the queue is just podcast episodes
 * @returns {Promise<Object>} Playlist info with queue and episode names
 */
async function buildPlaylistQueue() {
  try {
    const config = await getAlarmConfig();

    // Fetch newest episode from each podcast feed
    console.log('Fetching latest episodes from podcast feeds...');
    const episodes = await rss.getLatestEpisodesFromAllFeeds();

    if (episodes.length === 0) {
      console.warn('No podcast episodes found from any feeds');
      throw new Error('No podcast episodes available. Please add podcast feeds with available episodes.');
    }

    console.log(`Found ${episodes.length} episodes from configured feeds`);

    // Build queue with MP3 URLs
    const queue = [];
    const episodeNames = [];

    for (const episode of episodes) {
      if (episode.audioUrl) {
        queue.push(episode.audioUrl);
        episodeNames.push(`${episode.feedName}: ${episode.title}`);
        console.log(`Added: ${episode.feedName} - ${episode.title}`);
      }
    }

    if (queue.length === 0) {
      throw new Error('No playable episodes found in feeds');
    }

    return {
      queue,
      episodeNames,
      episodeCount: episodes.length,
      trackCount: queue.length
    };
  } catch (err) {
    console.error('Error building playlist:', err);
    throw err;
  }
}

/**
 * Build playlist with retry logic and exponential backoff
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Object>} Playlist info
 */
async function buildPlaylistWithRetry(maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await buildPlaylistQueue();
    } catch (err) {
      lastError = err;
      console.error(`Playlist build attempt ${attempt} failed:`, err.message);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

module.exports = {
  buildPlaylistQueue,
  buildPlaylistWithRetry
};
