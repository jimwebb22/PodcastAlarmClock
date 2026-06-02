const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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
const clientBuildPath = path.join(__dirname, '../client/build');
if (!fs.existsSync(path.join(clientBuildPath, 'index.html'))) {
  console.warn('');
  console.warn('  WARNING: client/build/index.html not found.');
  console.warn('  Run "npm run build" (or "npm run setup") to build the React UI.');
  console.warn('  The API will work but the web interface will not load.');
  console.warn('');
}
app.use(express.static(clientBuildPath));
// Catch-all handler for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Initialize database before starting server
initDatabase()
  .then(async () => {
    console.log('Database ready');

    // Initialize scheduler
    await scheduler.rescheduleAlarm();
    console.log('Scheduler initialized');

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Open http://localhost:${PORT} in your browser`);
    });

    // Graceful shutdown on SIGTERM (PM2, Docker, kill) or SIGINT (Ctrl+C)
    const shutdown = (signal) => {
      console.log(`\nReceived ${signal}, shutting down...`);
      scheduler.stopAlarm().catch(() => {});
      server.close(() => {
        console.log('Server stopped.');
        process.exit(0);
      });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });

module.exports = app;
