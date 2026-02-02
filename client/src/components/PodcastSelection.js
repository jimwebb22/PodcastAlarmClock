import React, { useState, useEffect } from 'react';
import { podcasts } from '../api';

function PodcastSelection() {
  const [feeds, setFeeds] = useState([]);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadFeeds();
  }, []);

  const loadFeeds = async () => {
    try {
      const res = await podcasts.getFeeds();
      setFeeds(res.data.feeds || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading feeds:', err);
      setError('Failed to load podcast feeds');
      setLoading(false);
    }
  };

  const handleAddFeed = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newFeedUrl.trim()) {
      setError('Please enter a podcast RSS feed URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(newFeedUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setAdding(true);

    try {
      const res = await podcasts.addFeed(newFeedUrl.trim());
      setFeeds([res.data.feed, ...feeds]);
      setNewFeedUrl('');
      setSuccess(`Added "${res.data.feed.feed_name}" successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding feed:', err);
      setError(err.response?.data?.error || 'Failed to add podcast feed');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFeed = async (feedId, feedName) => {
    if (!window.confirm(`Remove "${feedName}" from your podcasts?`)) {
      return;
    }

    try {
      await podcasts.removeFeed(feedId);
      setFeeds(feeds.filter(f => f.id !== feedId));
      setSuccess(`Removed "${feedName}"`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error removing feed:', err);
      setError('Failed to remove podcast feed');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Podcast Feeds</h2>

      <div className="space-y-6">
        {/* Add New Feed Form */}
        <form onSubmit={handleAddFeed} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Add Podcast RSS Feed
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com/podcast/feed.xml"
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={adding}
            />
            <button
              type="submit"
              disabled={adding}
              className={`px-6 py-2 rounded-lg text-white font-semibold transition ${
                adding
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Paste the RSS feed URL of any podcast. You can usually find this on the podcast's website or by searching "[podcast name] RSS feed".
          </p>
        </form>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Saved Feeds List */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Saved Podcasts ({feeds.length})
          </label>

          {feeds.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-lg text-gray-600 text-center">
              No podcasts added yet. Add an RSS feed URL above to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {feeds.map(feed => (
                <div
                  key={feed.id}
                  className="flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{feed.feed_name}</div>
                    <div className="text-xs text-gray-500 truncate">{feed.feed_url}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveFeed(feed.id, feed.feed_name)}
                    className="ml-3 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-1">How it works</h4>
          <p className="text-sm text-blue-700">
            The alarm will play the newest episode from each podcast you add.
            Episodes are played in order from newest to oldest.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PodcastSelection;
