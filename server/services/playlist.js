const rss = require('./rss');
const { getAlarmConfig, markEpisodePlayed, clearOldPlayedEpisodes } = require('../db/models');

/**
 * Build the alarm playlist queue from RSS podcast feeds
 * Skips already-played episodes and marks new ones as played
 * @returns {Promise<Object>} Playlist info with queue and episode names
 */
async function buildPlaylistQueue() {
  try {
    const config = await getAlarmConfig();

    // Clean up old played episode records (older than 30 days)
    try {
      const cleaned = await clearOldPlayedEpisodes(30);
      if (cleaned.deleted > 0) {
        console.log(`Cleaned up ${cleaned.deleted} old played episode records`);
      }
    } catch (cleanupErr) {
      console.warn('Failed to clean up old played episodes:', cleanupErr.message);
    }

    // Fetch newest unplayed episode from each podcast feed
    console.log('Fetching latest unplayed episodes from podcast feeds...');
    const episodes = await rss.getLatestEpisodesFromAllFeeds(true, 10);

    if (episodes.length === 0) {
      console.warn('No unplayed podcast episodes found from any feeds');
      throw new Error('No unplayed podcast episodes available. All recent episodes may have been played, or no feeds are configured.');
    }

    console.log(`Found ${episodes.length} unplayed episodes from configured feeds`);

    // Build queue with MP3 URLs
    const queue = [];
    const episodeNames = [];
    const episodesToMark = [];

    for (const episode of episodes) {
      if (episode.audioUrl) {
        queue.push(episode.audioUrl);
        episodeNames.push(`${episode.feedName}: ${episode.title}`);
        episodesToMark.push(episode);
        console.log(`Added: ${episode.feedName} - ${episode.title}`);
      }
    }

    if (queue.length === 0) {
      throw new Error('No playable episodes found in feeds');
    }

    // Mark all queued episodes as played
    console.log(`Marking ${episodesToMark.length} episodes as played...`);
    for (const episode of episodesToMark) {
      try {
        await markEpisodePlayed(
          episode.feedId,
          episode.guid,
          episode.title,
          episode.audioUrl
        );
      } catch (markErr) {
        console.warn(`Failed to mark episode as played: ${episode.title}`, markErr.message);
      }
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
