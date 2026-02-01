import React, { useState, useEffect } from 'react';
import { spotify } from '../api';

function SpotifyAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await spotify.getStatus();
      setAuthenticated(res.data.authenticated);
      setLoading(false);
    } catch (err) {
      console.error('Error checking Spotify auth status:', err);
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await spotify.getAuthUrl();
      // Redirect to Spotify authorization URL
      window.location.href = res.data.authUrl;
    } catch (err) {
      console.error('Error getting Spotify auth URL:', err);
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Spotify Connection</h3>
          <p className="text-sm text-gray-600">
            {authenticated
              ? 'Connected to Spotify'
              : 'Connect your Spotify account to access podcasts'}
          </p>
        </div>
        {!authenticated && (
          <button
            onClick={handleConnect}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition"
          >
            Connect Spotify
          </button>
        )}
        {authenticated && (
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            <span className="text-green-600 font-medium">Connected</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default SpotifyAuth;
