const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDatabase } = require('./db/database');
const authRoutes = require('./api/auth');
const speakersRoutes = require('./api/speakers');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/speakers', speakersRoutes);

// Initialize database before starting server
initDatabase()
  .then(() => {
    console.log('Database ready');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });

module.exports = app;
