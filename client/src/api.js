import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

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

// Podcast feed endpoints (RSS-based)
export const podcasts = {
  getFeeds: () => api.get('/podcasts/feeds'),
  addFeed: (feedUrl) => api.post('/podcasts/feeds', { feedUrl }),
  removeFeed: (feedId) => api.delete(`/podcasts/feeds/${feedId}`),
  previewFeed: (feedUrl) => api.post('/podcasts/feeds/preview', { feedUrl }),
  getEpisodes: () => api.get('/podcasts/episodes')
};

export default api;
