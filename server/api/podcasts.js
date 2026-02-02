const express = require('express');
const router = express.Router();
const rss = require('../services/rss');
const {
  getPodcastFeeds,
  addPodcastFeed,
  removePodcastFeed,
  getAllPlayedEpisodes,
  getPlayedEpisodesForFeed,
  clearPlayedEpisodes
} = require('../db/models');

// Get all saved podcast feeds
router.get('/feeds', async (req, res) => {
  try {
    const feeds = await getPodcastFeeds();
    res.json({ feeds });
  } catch (err) {
    console.error('Error getting podcast feeds:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add a new podcast feed
router.post('/feeds', async (req, res) => {
  try {
    const { feedUrl } = req.body;

    if (!feedUrl) {
      return res.status(400).json({ error: 'feedUrl is required' });
    }

    // Validate URL format
    try {
      new URL(feedUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Validate and parse the feed to get its title
    console.log(`Validating feed: ${feedUrl}`);
    const feedInfo = await rss.validateFeed(feedUrl);

    // Add to database
    const feed = await addPodcastFeed(feedUrl, feedInfo.title);

    res.json({
      success: true,
      feed: {
        id: feed.id,
        feed_url: feed.feed_url,
        feed_name: feed.feed_name,
        episodeCount: feedInfo.episodeCount
      }
    });
  } catch (err) {
    console.error('Error adding podcast feed:', err);
    res.status(400).json({ error: err.message });
  }
});

// Remove a podcast feed
router.delete('/feeds/:id', async (req, res) => {
  try {
    const feedId = parseInt(req.params.id);

    if (isNaN(feedId)) {
      return res.status(400).json({ error: 'Invalid feed ID' });
    }

    await removePodcastFeed(feedId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing podcast feed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Preview a feed before adding (validate and show episodes)
router.post('/feeds/preview', async (req, res) => {
  try {
    const { feedUrl } = req.body;

    if (!feedUrl) {
      return res.status(400).json({ error: 'feedUrl is required' });
    }

    // Validate URL format
    try {
      new URL(feedUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const preview = await rss.previewFeed(feedUrl, 5);
    res.json({ preview });
  } catch (err) {
    console.error('Error previewing feed:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get latest episodes from all feeds (for display/testing)
router.get('/episodes', async (req, res) => {
  try {
    const skipPlayed = req.query.skipPlayed !== 'false';
    const episodes = await rss.getLatestEpisodesFromAllFeeds(skipPlayed);
    res.json({ episodes });
  } catch (err) {
    console.error('Error getting episodes:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get played episodes history
router.get('/played', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const feedId = req.query.feedId ? parseInt(req.query.feedId) : null;

    let playedEpisodes;
    if (feedId) {
      playedEpisodes = await getPlayedEpisodesForFeed(feedId);
    } else {
      playedEpisodes = await getAllPlayedEpisodes(limit);
    }

    res.json({ playedEpisodes });
  } catch (err) {
    console.error('Error getting played episodes:', err);
    res.status(500).json({ error: err.message });
  }
});

// Clear played episodes history
router.delete('/played', async (req, res) => {
  try {
    const feedId = req.query.feedId ? parseInt(req.query.feedId) : null;

    const result = await clearPlayedEpisodes(feedId);
    res.json({
      success: true,
      message: feedId
        ? `Cleared ${result.deleted} played episodes for feed ${feedId}`
        : `Cleared ${result.deleted} played episodes from all feeds`
    });
  } catch (err) {
    console.error('Error clearing played episodes:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
