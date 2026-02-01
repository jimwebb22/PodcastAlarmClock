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
  stop: () => api.post('/alarm/stop'),
  getLogs: (limit = 10) => api.get('/alarm/logs', { params: { limit } })
};

// Speaker endpoints
export const speakers = {
  discover: () => api.get('/speakers/discover'),
  getSelected: () => api.get('/speakers/selected'),
  setSelected: (speakers) => api.post('/speakers/selected', { speakers })
};

// Playlist endpoints
export const getPlaylists = () => api.get('/playlists');
export const createPlaylist = (playlistData) => api.post('/playlists', playlistData);
export const updatePlaylist = (id, playlistData) => api.put(`/playlists/${id}`, playlistData);
export const deletePlaylist = (id) => api.delete(`/playlists/${id}`);

// Podcast endpoints
export const podcasts = {
  getFollowed: () => api.get('/podcasts/followed'),
  getSelected: () => api.get('/podcasts/selected'),
  setSelected: (podcasts) => api.post('/podcasts/selected', { podcasts })
};

// Spotify endpoints
export const spotify = {
  getAuthUrl: () => api.get('/auth/spotify/login'),
  getStatus: () => api.get('/auth/spotify/status')
};

export default api;
