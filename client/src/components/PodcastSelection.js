import React, { useState, useEffect } from 'react';
import { podcasts, spotify } from '../api';

function PodcastSelection() {
  const [followedShows, setFollowedShows] = useState([]);
  const [selectedPodcasts, setSelectedPodcasts] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Check authentication status
      const authRes = await spotify.getStatus();
      setAuthenticated(authRes.data.authenticated);

      if (!authRes.data.authenticated) {
        setLoading(false);
        return;
      }

      // Load followed shows and selected podcasts
      const [followedRes, selectedRes] = await Promise.all([
        podcasts.getFollowed(),
        podcasts.getSelected()
      ]);

      setFollowedShows(followedRes.data.shows || []);
      setSelectedPodcasts(selectedRes.data.podcasts || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading podcast data:', err);
      setLoading(false);
    }
  };

  const togglePodcast = (show) => {
    const isSelected = selectedPodcasts.some(p => p.show_id === show.id);

    if (isSelected) {
      setSelectedPodcasts(selectedPodcasts.filter(p => p.show_id !== show.id));
    } else {
      setSelectedPodcasts([
        ...selectedPodcasts,
        { show_id: show.id, show_name: show.name }
      ]);
    }
  };

  const isPodcastSelected = (show) => {
    return selectedPodcasts.some(p => p.show_id === show.id);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');

    try {
      await podcasts.setSelected(selectedPodcasts);
      setSaveMessage('Podcast selection saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('Error saving podcast selection:', err);
      setSaveMessage('Error saving podcast selection');
    } finally {
      setSaving(false);
    }
  };

  const filteredShows = followedShows.filter(show =>
    show.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Podcast Selection</h2>
        <p className="text-gray-600">
          Please connect your Spotify account to access your followed podcasts.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Podcast Selection</h2>

      <div className="space-y-6">
        {/* Search Filter */}
        {followedShows.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Podcasts
            </label>
            <input
              type="text"
              placeholder="Filter by name..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Followed Podcasts List */}
        {followedShows.length === 0 ? (
          <p className="text-gray-600">No followed podcasts found.</p>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Followed Podcasts ({filteredShows.length})
            </label>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredShows.map(show => (
                <div
                  key={show.id}
                  className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    id={`podcast-${show.id}`}
                    checked={isPodcastSelected(show)}
                    onChange={() => togglePodcast(show)}
                    className="w-5 h-5 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor={`podcast-${show.id}`}
                    className="ml-3 flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{show.name}</div>
                    {show.publisher && (
                      <div className="text-sm text-gray-500">{show.publisher}</div>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Currently Selected Count */}
        {selectedPodcasts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected for Alarm ({selectedPodcasts.length})
            </label>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                {selectedPodcasts.length} podcast{selectedPodcasts.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
        )}

        {/* Save Button */}
        {followedShows.length > 0 && (
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full px-6 py-3 rounded-lg text-white font-semibold transition ${
                saving
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {saving ? 'Saving...' : 'Save Podcast Selection'}
            </button>

            {saveMessage && (
              <p
                className={`mt-2 text-center text-sm ${
                  saveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {saveMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PodcastSelection;
