import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Alarm endpoints
export const getAlarms = () => api.get('/alarms');
export const createAlarm = (alarmData) => api.post('/alarms', alarmData);
export const updateAlarm = (id, alarmData) => api.put(`/alarms/${id}`, alarmData);
export const deleteAlarm = (id) => api.delete(`/alarms/${id}`);
export const testAlarm = (id) => api.post(`/alarms/${id}/test`);

// Alarm config and status
export const alarm = {
  getConfig: () => api.get('/alarm/config'),
  updateConfig: (config) => api.put('/alarm/config', config),
  getStatus: () => api.get('/alarm/status'),
  test: () => api.post('/alarm/test'),
  stop: () => api.post('/alarm/stop')
};

// Speaker endpoints
export const getSpeakers = () => api.get('/speakers/discover');
export const getSpeakerInfo = () => api.get('/speakers/info');

// Playlist endpoints
export const getPlaylists = () => api.get('/playlists');
export const createPlaylist = (playlistData) => api.post('/playlists', playlistData);
export const updatePlaylist = (id, playlistData) => api.put(`/playlists/${id}`, playlistData);
export const deletePlaylist = (id) => api.delete(`/playlists/${id}`);

// Podcast endpoints
export const getPodcasts = () => api.get('/podcasts');
export const addPodcast = (podcastData) => api.post('/podcasts', podcastData);
export const updatePodcast = (id, podcastData) => api.put(`/podcasts/${id}`, podcastData);
export const deletePodcast = (id) => api.delete(`/podcasts/${id}`);
export const getLatestEpisode = (id) => api.get(`/podcasts/${id}/latest`);
export const searchPodcasts = (query) => api.get('/podcasts/search', { params: { q: query } });

// Spotify endpoints
export const getSpotifyAuthUrl = () => api.get('/spotify/auth-url');
export const getSpotifyStatus = () => api.get('/spotify/status');

export default api;
