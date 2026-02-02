const Parser = require('rss-parser');
const { getPodcastFeeds, isEpisodePlayed } = require('../db/models');

const parser = new Parser({
  timeout: 30000, // 30 second timeout
  headers: {
    'User-Agent': 'PodcastAlarmClock/1.0'
  },
  customFields: {
    item: [
      ['enclosure', 'enclosure'],
      ['itunes:duration', 'duration'],
      ['itunes:image', 'itunesImage']
    ]
  }
});

/**
 * Parse an RSS feed and extract podcast information
 * @param {string} feedUrl - URL of the RSS feed
 * @returns {Promise<Object>} Feed information with title and episodes
 */
async function parseFeed(feedUrl) {
  try {
    const feed = await parser.parseURL(feedUrl);

    return {
      title: feed.title || 'Unknown Podcast',
      description: feed.description || '',
      image: feed.image?.url || feed.itunes?.image || null,
      link: feed.link || feedUrl,
      episodes: (feed.items || []).map(item => ({
        title: item.title || 'Untitled Episode',
        description: item.contentSnippet || item.content || '',
        pubDate: item.pubDate || item.isoDate || null,
        audioUrl: getAudioUrl(item),
        duration: item.duration || item.itunes?.duration || null,
        guid: item.guid || item.link || item.title
      }))
    };
  } catch (error) {
    console.error(`Error parsing feed ${feedUrl}:`, error.message);
    throw new Error(`Failed to parse feed: ${error.message}`);
  }
}

/**
 * Extract the audio URL from an RSS item
 * @param {Object} item - RSS item object
 * @returns {string|null} Audio URL or null if not found
 */
function getAudioUrl(item) {
  // Try enclosure first (standard RSS podcasts)
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }

  // Try media content
  if (item['media:content'] && item['media:content']['$']?.url) {
    return item['media:content']['$'].url;
  }

  // Fallback to link if it ends with audio extension
  if (item.link && /\.(mp3|m4a|ogg|wav|aac)(\?.*)?$/i.test(item.link)) {
    return item.link;
  }

  return null;
}

/**
 * Validate that a URL is a valid podcast RSS feed
 * @param {string} feedUrl - URL to validate
 * @returns {Promise<Object>} Feed info if valid
 */
async function validateFeed(feedUrl) {
  const feed = await parseFeed(feedUrl);

  // Check if feed has any episodes with audio
  const episodesWithAudio = feed.episodes.filter(ep => ep.audioUrl);

  if (episodesWithAudio.length === 0) {
    throw new Error('This feed does not contain any playable audio episodes');
  }

  return {
    title: feed.title,
    description: feed.description,
    image: feed.image,
    episodeCount: episodesWithAudio.length
  };
}

/**
 * Get the latest episode from a feed
 * @param {string} feedUrl - URL of the RSS feed
 * @param {number} limit - Maximum number of episodes to return
 * @returns {Promise<Array>} Array of episode objects
 */
async function getLatestEpisodes(feedUrl, limit = 1) {
  const feed = await parseFeed(feedUrl);

  // Filter to only episodes with audio and sort by date (newest first)
  const episodesWithAudio = feed.episodes
    .filter(ep => ep.audioUrl)
    .sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate) : new Date(0);
      const dateB = b.pubDate ? new Date(b.pubDate) : new Date(0);
      return dateB - dateA;
    })
    .slice(0, limit);

  return episodesWithAudio.map(ep => ({
    ...ep,
    feedTitle: feed.title
  }));
}

/**
 * Get the latest unplayed episode from each configured podcast feed
 * @param {boolean} skipPlayed - Whether to skip already played episodes
 * @param {number} episodesToCheck - How many recent episodes to check per feed
 * @returns {Promise<Array>} Array of episode objects with audio URLs
 */
async function getLatestEpisodesFromAllFeeds(skipPlayed = true, episodesToCheck = 10) {
  const feeds = await getPodcastFeeds();

  if (feeds.length === 0) {
    console.log('No podcast feeds configured');
    return [];
  }

  const episodePromises = feeds.map(async (feed) => {
    try {
      // Fetch multiple episodes so we can find unplayed ones
      const episodes = await getLatestEpisodes(feed.feed_url, episodesToCheck);

      if (episodes.length === 0) {
        return null;
      }

      // Find the first unplayed episode
      for (const episode of episodes) {
        const episodeWithFeed = {
          ...episode,
          feedId: feed.id,
          feedName: feed.feed_name
        };

        if (!skipPlayed) {
          return episodeWithFeed;
        }

        // Check if this episode has been played
        const played = await isEpisodePlayed(feed.id, episode.guid);
        if (!played) {
          return episodeWithFeed;
        }
        console.log(`Skipping already played: ${feed.feed_name} - ${episode.title}`);
      }

      // All recent episodes have been played
      console.log(`All recent episodes from ${feed.feed_name} have been played`);
      return null;
    } catch (error) {
      console.error(`Error fetching episodes from ${feed.feed_name}:`, error.message);
      return null;
    }
  });

  const results = await Promise.all(episodePromises);

  // Filter out failed/empty fetches and sort by date (newest first)
  return results
    .filter(ep => ep !== null)
    .sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate) : new Date(0);
      const dateB = b.pubDate ? new Date(b.pubDate) : new Date(0);
      return dateB - dateA;
    });
}

/**
 * Preview episodes from a feed URL (for UI validation)
 * @param {string} feedUrl - URL to preview
 * @param {number} limit - Number of episodes to preview
 * @returns {Promise<Object>} Feed info with preview episodes
 */
async function previewFeed(feedUrl, limit = 5) {
  const feed = await parseFeed(feedUrl);

  const episodesWithAudio = feed.episodes
    .filter(ep => ep.audioUrl)
    .slice(0, limit);

  return {
    title: feed.title,
    description: feed.description,
    image: feed.image,
    totalEpisodes: feed.episodes.filter(ep => ep.audioUrl).length,
    previewEpisodes: episodesWithAudio.map(ep => ({
      title: ep.title,
      pubDate: ep.pubDate,
      duration: ep.duration
    }))
  };
}

module.exports = {
  parseFeed,
  validateFeed,
  getLatestEpisodes,
  getLatestEpisodesFromAllFeeds,
  previewFeed
};
