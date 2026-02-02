const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { initDatabase } = require('./db/database');
const speakersRoutes = require('./api/speakers');
const alarmRoutes = require('./api/alarm');
const podcastsRoutes = require('./api/podcasts');
const scheduler = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/speakers', speakersRoutes);
app.use('/api/alarm', alarmRoutes);
app.use('/api/podcasts', podcastsRoutes);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  // Catch-all handler for SPA routing
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Initialize database before starting server
initDatabase()
  .then(async () => {
    console.log('Database ready');

    // Initialize scheduler
    await scheduler.rescheduleAlarm();
    console.log('Scheduler initialized');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });

module.exports = app;
