# Podcast Alarm Clock Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local alarm clock system that plays Spotify podcasts and music through Sonos speakers on a configurable schedule.

**Architecture:** Node.js/Express backend with React frontend. SQLite for persistence. Uses Spotify Web API for content, node-sonos for speaker control, node-schedule for alarm triggering.

**Tech Stack:** Node.js, Express, React, SQLite, spotify-web-api-node, node-sonos, node-schedule, Tailwind CSS

---

## Task 1: Project Setup and Dependencies

**Files:**
- Create: `package.json`
- Create: `server/index.js`
- Create: `.env.example`
- Create: `README.md`

**Step 1: Initialize Node.js project**

Run: `npm init -y`

**Step 2: Install backend dependencies**

Run:
```bash
npm install express sqlite3 spotify-web-api-node node-sonos node-schedule dotenv cors
npm install --save-dev nodemon jest supertest
```

**Step 3: Create basic server structure**

Create `server/index.js`:
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
```

**Step 4: Create environment variables template**

Create `.env.example`:
```
PORT=3001
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3001/api/auth/callback
DATABASE_PATH=./sonos-alarm.db
```

**Step 5: Update package.json scripts**

Modify `package.json` to add:
```json
{
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js",
    "test": "jest"
  }
}
```

**Step 6: Test server starts**

Run: `npm run dev`
Expected: "Server running on port 3001"

Open browser: http://localhost:3001/health
Expected: `{"status":"ok","timestamp":"..."}`

**Step 7: Create basic README**

Create `README.md`:
```markdown
# Podcast Alarm Clock

A local alarm clock system that plays Spotify podcasts and music through Sonos speakers.

## Setup

1. Copy `.env.example` to `.env` and fill in Spotify credentials
2. Install dependencies: `npm install`
3. Start server: `npm run dev`
4. Access UI: http://localhost:3001

## Prerequisites

- Node.js 16+
- Spotify Premium account
- Sonos speakers on local network
```

**Step 8: Commit**

Run:
```bash
git add package.json package-lock.json server/index.js .env.example README.md
git commit -m "feat: initialize project with Express server"
```

---

## Task 2: SQLite Database Setup

**Files:**
- Create: `server/db/database.js`
- Create: `server/db/schema.sql`
- Create: `server/db/models.js`

**Step 1: Create database initialization module**

Create `server/db/database.js`:
```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || './sonos-alarm.db';

function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');

      // Read and execute schema
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');

      db.exec(schema, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('Database schema initialized');
        resolve(db);
      });
    });
  });
}

function getDatabase() {
  return new sqlite3.Database(DB_PATH);
}

module.exports = { initDatabase, getDatabase };
```

**Step 2: Create database schema**

Create `server/db/schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS alarm_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  time TEXT NOT NULL DEFAULT '07:00',
  enabled INTEGER NOT NULL DEFAULT 0,
  monday INTEGER NOT NULL DEFAULT 1,
  tuesday INTEGER NOT NULL DEFAULT 1,
  wednesday INTEGER NOT NULL DEFAULT 1,
  thursday INTEGER NOT NULL DEFAULT 1,
  friday INTEGER NOT NULL DEFAULT 1,
  saturday INTEGER NOT NULL DEFAULT 0,
  sunday INTEGER NOT NULL DEFAULT 0,
  volume INTEGER NOT NULL DEFAULT 30 CHECK (volume >= 0 AND volume <= 100),
  music_source TEXT NOT NULL DEFAULT 'daily_mix_1'
);

CREATE TABLE IF NOT EXISTS selected_speakers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  speaker_name TEXT NOT NULL,
  speaker_uuid TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS selected_podcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  show_id TEXT NOT NULL UNIQUE,
  show_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spotify_auth (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER
);

CREATE TABLE IF NOT EXISTS alarm_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  triggered_at INTEGER NOT NULL,
  success INTEGER NOT NULL,
  error_message TEXT,
  episodes_played TEXT
);

-- Insert default alarm config if not exists
INSERT OR IGNORE INTO alarm_config (id, time, enabled) VALUES (1, '07:00', 0);
INSERT OR IGNORE INTO spotify_auth (id) VALUES (1);
```

**Step 3: Create data models**

Create `server/db/models.js`:
```javascript
const { getDatabase } = require('./database');

// Alarm Config
function getAlarmConfig() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.get('SELECT * FROM alarm_config WHERE id = 1', (err, row) => {
      db.close();
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function updateAlarmConfig(config) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const sql = `UPDATE alarm_config SET
      time = ?, enabled = ?, monday = ?, tuesday = ?, wednesday = ?,
      thursday = ?, friday = ?, saturday = ?, sunday = ?, volume = ?, music_source = ?
      WHERE id = 1`;

    db.run(sql, [
      config.time, config.enabled ? 1 : 0,
      config.monday ? 1 : 0, config.tuesday ? 1 : 0, config.wednesday ? 1 : 0,
      config.thursday ? 1 : 0, config.friday ? 1 : 0, config.saturday ? 1 : 0,
      config.sunday ? 1 : 0, config.volume, config.music_source
    ], (err) => {
      db.close();
      if (err) reject(err);
      else resolve();
    });
  });
}

// Speakers
function getSelectedSpeakers() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all('SELECT * FROM selected_speakers', (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function setSelectedSpeakers(speakers) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.serialize(() => {
      db.run('DELETE FROM selected_speakers');

      const stmt = db.prepare('INSERT INTO selected_speakers (speaker_name, speaker_uuid) VALUES (?, ?)');
      speakers.forEach(speaker => {
        stmt.run(speaker.name, speaker.uuid);
      });
      stmt.finalize((err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// Podcasts
function getSelectedPodcasts() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all('SELECT * FROM selected_podcasts', (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function setSelectedPodcasts(podcasts) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.serialize(() => {
      db.run('DELETE FROM selected_podcasts');

      const stmt = db.prepare('INSERT INTO selected_podcasts (show_id, show_name) VALUES (?, ?)');
      podcasts.forEach(podcast => {
        stmt.run(podcast.id, podcast.name);
      });
      stmt.finalize((err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// Spotify Auth
function getSpotifyAuth() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.get('SELECT * FROM spotify_auth WHERE id = 1', (err, row) => {
      db.close();
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function updateSpotifyAuth(auth) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(
      'UPDATE spotify_auth SET access_token = ?, refresh_token = ?, expires_at = ? WHERE id = 1',
      [auth.access_token, auth.refresh_token, auth.expires_at],
      (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Alarm Logs
function addAlarmLog(log) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(
      'INSERT INTO alarm_logs (triggered_at, success, error_message, episodes_played) VALUES (?, ?, ?, ?)',
      [Date.now(), log.success ? 1 : 0, log.error_message || null, JSON.stringify(log.episodes_played || [])],
      (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function getRecentLogs(limit = 10) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all('SELECT * FROM alarm_logs ORDER BY triggered_at DESC LIMIT ?', [limit], (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

module.exports = {
  getAlarmConfig,
  updateAlarmConfig,
  getSelectedSpeakers,
  setSelectedSpeakers,
  getSelectedPodcasts,
  setSelectedPodcasts,
  getSpotifyAuth,
  updateSpotifyAuth,
  addAlarmLog,
  getRecentLogs
};
```

**Step 4: Initialize database on server start**

Update `server/index.js` to add at the top:
```javascript
const { initDatabase } = require('./db/database');

// Initialize database before starting server
initDatabase()
  .then(() => {
    console.log('Database ready');
  })
  .catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });
```

**Step 5: Test database initialization**

Run: `npm run dev`
Expected: "Connected to SQLite database", "Database schema initialized", "Database ready"

Verify file created: `ls -la sonos-alarm.db`

**Step 6: Commit**

Run:
```bash
git add server/db/ server/index.js
git commit -m "feat: add SQLite database with schema and models"
```

---

## Task 3: Spotify OAuth Integration

**Files:**
- Create: `server/services/spotify.js`
- Create: `server/api/auth.js`
- Modify: `server/index.js`

**Step 1: Create Spotify service**

Create `server/services/spotify.js`:
```javascript
const SpotifyWebApi = require('spotify-web-api-node');
const { getSpotifyAuth, updateSpotifyAuth } = require('../db/models');

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

const SCOPES = [
  'user-follow-read',
  'user-top-read',
  'user-library-read',
  'user-read-playback-state'
];

async function getAuthUrl() {
  return spotifyApi.createAuthorizeURL(SCOPES, 'state');
}

async function handleCallback(code) {
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    const auth = {
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000
    };

    await updateSpotifyAuth(auth);
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    return auth;
  } catch (err) {
    console.error('Error during authorization:', err);
    throw err;
  }
}

async function refreshAccessToken() {
  try {
    const auth = await getSpotifyAuth();
    if (!auth.refresh_token) {
      throw new Error('No refresh token available');
    }

    spotifyApi.setRefreshToken(auth.refresh_token);
    const data = await spotifyApi.refreshAccessToken();
    const { access_token, expires_in } = data.body;

    const updatedAuth = {
      access_token,
      refresh_token: auth.refresh_token,
      expires_at: Date.now() + expires_in * 1000
    };

    await updateSpotifyAuth(updatedAuth);
    spotifyApi.setAccessToken(access_token);

    return updatedAuth;
  } catch (err) {
    console.error('Error refreshing token:', err);
    throw err;
  }
}

async function ensureValidToken() {
  const auth = await getSpotifyAuth();

  if (!auth.access_token) {
    throw new Error('Not authenticated with Spotify');
  }

  // Refresh if expired or expiring soon (within 5 minutes)
  if (auth.expires_at < Date.now() + 5 * 60 * 1000) {
    await refreshAccessToken();
  } else {
    spotifyApi.setAccessToken(auth.access_token);
  }
}

async function getFollowedShows() {
  await ensureValidToken();
  try {
    const data = await spotifyApi.getMySavedShows({ limit: 50 });
    return data.body.items.map(item => ({
      id: item.show.id,
      name: item.show.name,
      publisher: item.show.publisher,
      image: item.show.images[0]?.url
    }));
  } catch (err) {
    console.error('Error fetching followed shows:', err);
    throw err;
  }
}

async function getShowEpisodes(showId) {
  await ensureValidToken();
  try {
    const data = await spotifyApi.getShowEpisodes(showId, { limit: 1 });
    if (data.body.items.length === 0) return null;

    const episode = data.body.items[0];
    return {
      id: episode.id,
      name: episode.name,
      uri: episode.uri,
      duration_ms: episode.duration_ms,
      release_date: episode.release_date
    };
  } catch (err) {
    console.error(`Error fetching episodes for show ${showId}:`, err);
    return null;
  }
}

async function getDailyMixTracks(mixNumber = 1) {
  await ensureValidToken();
  try {
    // Search for Daily Mix playlist
    const playlists = await spotifyApi.getUserPlaylists({ limit: 50 });
    const dailyMix = playlists.body.items.find(p =>
      p.name.toLowerCase() === `daily mix ${mixNumber}`
    );

    if (!dailyMix) {
      throw new Error(`Daily Mix ${mixNumber} not found`);
    }

    const tracks = await spotifyApi.getPlaylistTracks(dailyMix.id, { limit: 50 });
    return tracks.body.items.map(item => ({
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists[0].name,
      uri: item.track.uri
    }));
  } catch (err) {
    console.error(`Error fetching Daily Mix ${mixNumber}:`, err);
    throw err;
  }
}

async function getTopTracks() {
  await ensureValidToken();
  try {
    const data = await spotifyApi.getMyTopTracks({ limit: 50 });
    return data.body.items.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0].name,
      uri: track.uri
    }));
  } catch (err) {
    console.error('Error fetching top tracks:', err);
    throw err;
  }
}

async function isAuthenticated() {
  try {
    const auth = await getSpotifyAuth();
    return !!auth.access_token;
  } catch {
    return false;
  }
}

module.exports = {
  getAuthUrl,
  handleCallback,
  refreshAccessToken,
  getFollowedShows,
  getShowEpisodes,
  getDailyMixTracks,
  getTopTracks,
  isAuthenticated
};
```

**Step 2: Create auth API routes**

Create `server/api/auth.js`:
```javascript
const express = require('express');
const router = express.Router();
const spotify = require('../services/spotify');

// Get Spotify auth URL
router.get('/spotify/login', async (req, res) => {
  try {
    const authUrl = await spotify.getAuthUrl();
    res.json({ authUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spotify callback
router.get('/spotify/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('No authorization code provided');
  }

  try {
    await spotify.handleCallback(code);
    res.send('<html><body><h1>Successfully connected to Spotify!</h1><p>You can close this window.</p></body></html>');
  } catch (err) {
    res.status(500).send(`<html><body><h1>Error connecting to Spotify</h1><p>${err.message}</p></body></html>`);
  }
});

// Check auth status
router.get('/spotify/status', async (req, res) => {
  try {
    const authenticated = await spotify.isAuthenticated();
    res.json({ authenticated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

**Step 3: Register auth routes**

Update `server/index.js` to add:
```javascript
const authRoutes = require('./api/auth');

// ... existing code ...

app.use('/api/auth', authRoutes);
```

**Step 4: Create .env file**

Create `.env` (copy from .env.example):
```
PORT=3001
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3001/api/auth/spotify/callback
DATABASE_PATH=./sonos-alarm.db
```

Note: User needs to create Spotify app at https://developer.spotify.com/dashboard and fill in credentials.

**Step 5: Test auth endpoints**

Run: `npm run dev`

Test status: `curl http://localhost:3001/api/auth/spotify/status`
Expected: `{"authenticated":false}`

Test login URL: `curl http://localhost:3001/api/auth/spotify/login`
Expected: `{"authUrl":"https://accounts.spotify.com/authorize?..."}`

**Step 6: Commit**

Run:
```bash
git add server/services/spotify.js server/api/auth.js server/index.js
git commit -m "feat: add Spotify OAuth integration"
```

---

## Task 4: Sonos Speaker Discovery and Control

**Files:**
- Create: `server/services/sonos.js`
- Create: `server/api/speakers.js`
- Modify: `server/index.js`

**Step 1: Create Sonos service**

Create `server/services/sonos.js`:
```javascript
const { DeviceDiscovery } = require('sonos');

let discoveredDevices = [];
let isDiscovering = false;

async function discoverSpeakers() {
  return new Promise((resolve, reject) => {
    if (isDiscovering) {
      return resolve(discoveredDevices);
    }

    isDiscovering = true;
    discoveredDevices = [];

    const discovery = DeviceDiscovery();

    discovery.on('DeviceAvailable', (device) => {
      device.deviceDescription()
        .then(info => {
          discoveredDevices.push({
            uuid: device.host,
            name: info.roomName || info.displayName,
            model: info.modelName,
            host: device.host,
            deviceObject: device
          });
        })
        .catch(err => {
          console.error('Error getting device description:', err);
        });
    });

    // Give discovery 5 seconds to find devices
    setTimeout(() => {
      isDiscovering = false;
      resolve(discoveredDevices);
    }, 5000);
  });
}

function getSpeakerByUuid(uuid) {
  return discoveredDevices.find(d => d.uuid === uuid);
}

async function groupSpeakers(coordinatorUuid, memberUuids) {
  const coordinator = getSpeakerByUuid(coordinatorUuid);
  if (!coordinator) {
    throw new Error(`Coordinator speaker ${coordinatorUuid} not found`);
  }

  const members = memberUuids
    .map(uuid => getSpeakerByUuid(uuid))
    .filter(Boolean);

  if (members.length !== memberUuids.length) {
    throw new Error('Some member speakers not found');
  }

  try {
    // Join all members to coordinator
    for (const member of members) {
      if (member.uuid !== coordinatorUuid) {
        await member.deviceObject.joinGroup(coordinator.name);
      }
    }
    return coordinator;
  } catch (err) {
    console.error('Error grouping speakers:', err);
    throw err;
  }
}

async function ungroupSpeakers(speakerUuids) {
  for (const uuid of speakerUuids) {
    const speaker = getSpeakerByUuid(uuid);
    if (speaker) {
      try {
        await speaker.deviceObject.leaveGroup();
      } catch (err) {
        console.error(`Error ungrouping speaker ${uuid}:`, err);
      }
    }
  }
}

async function setVolume(speakerUuid, volume) {
  const speaker = getSpeakerByUuid(speakerUuid);
  if (!speaker) {
    throw new Error(`Speaker ${speakerUuid} not found`);
  }

  await speaker.deviceObject.setVolume(volume);
}

async function playQueue(coordinatorUuid, spotifyUris) {
  const coordinator = getSpeakerByUuid(coordinatorUuid);
  if (!coordinator) {
    throw new Error(`Coordinator ${coordinatorUuid} not found`);
  }

  try {
    // Clear current queue
    await coordinator.deviceObject.flush();

    // Add URIs to queue
    for (const uri of spotifyUris) {
      await coordinator.deviceObject.queue(uri);
    }

    // Start playback
    await coordinator.deviceObject.play();
  } catch (err) {
    console.error('Error playing queue:', err);
    throw err;
  }
}

async function stopPlayback(speakerUuid) {
  const speaker = getSpeakerByUuid(speakerUuid);
  if (!speaker) {
    throw new Error(`Speaker ${speakerUuid} not found`);
  }

  await speaker.deviceObject.pause();
}

module.exports = {
  discoverSpeakers,
  getSpeakerByUuid,
  groupSpeakers,
  ungroupSpeakers,
  setVolume,
  playQueue,
  stopPlayback
};
```

**Step 2: Create speakers API routes**

Create `server/api/speakers.js`:
```javascript
const express = require('express');
const router = express.Router();
const sonos = require('../services/sonos');
const { getSelectedSpeakers, setSelectedSpeakers } = require('../db/models');

// Discover speakers on network
router.get('/discover', async (req, res) => {
  try {
    const speakers = await sonos.discoverSpeakers();
    res.json({
      speakers: speakers.map(s => ({
        uuid: s.uuid,
        name: s.name,
        model: s.model
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get selected speakers
router.get('/selected', async (req, res) => {
  try {
    const speakers = await getSelectedSpeakers();
    res.json({ speakers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set selected speakers
router.post('/selected', async (req, res) => {
  try {
    const { speakers } = req.body;

    if (!Array.isArray(speakers)) {
      return res.status(400).json({ error: 'speakers must be an array' });
    }

    await setSelectedSpeakers(speakers);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

**Step 3: Register speakers routes**

Update `server/index.js` to add:
```javascript
const speakersRoutes = require('./api/speakers');

// ... existing code ...

app.use('/api/speakers', speakersRoutes);
```

**Step 4: Test speaker discovery (requires Sonos on network)**

Run: `npm run dev`

Test discovery: `curl http://localhost:3001/api/speakers/discover`
Expected: `{"speakers":[...]}` (or empty array if no Sonos speakers)

**Step 5: Commit**

Run:
```bash
git add server/services/sonos.js server/api/speakers.js server/index.js
git commit -m "feat: add Sonos speaker discovery and control"
```

---

## Task 5: Playlist Building Service

**Files:**
- Create: `server/services/playlist.js`

**Step 1: Create playlist builder**

Create `server/services/playlist.js`:
```javascript
const spotify = require('./spotify');
const { getSelectedPodcasts, getAlarmConfig } = require('../db/models');

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function getMusicTracks(musicSource) {
  switch (musicSource) {
    case 'daily_mix_1':
      return await spotify.getDailyMixTracks(1);
    case 'daily_mix_2':
      return await spotify.getDailyMixTracks(2);
    case 'daily_mix_3':
      return await spotify.getDailyMixTracks(3);
    case 'top_tracks':
      return await spotify.getTopTracks();
    default:
      throw new Error(`Unknown music source: ${musicSource}`);
  }
}

async function buildPlaylistQueue() {
  try {
    const config = await getAlarmConfig();
    const selectedPodcasts = await getSelectedPodcasts();

    if (selectedPodcasts.length === 0) {
      console.warn('No podcasts selected, will play music only');
    }

    // Fetch newest episode from each podcast
    const episodePromises = selectedPodcasts.map(podcast =>
      spotify.getShowEpisodes(podcast.show_id)
    );
    const episodes = (await Promise.all(episodePromises)).filter(Boolean);

    if (episodes.length === 0) {
      console.warn('No new episodes found, will play music only');
    }

    // Fetch music tracks
    const musicTracks = await getMusicTracks(config.music_source);
    const shuffledMusic = shuffleArray(musicTracks);

    // Build queue: episode -> 3 songs -> episode -> 3 songs ...
    const queue = [];
    const episodeNames = [];
    let musicIndex = 0;

    if (episodes.length > 0) {
      for (const episode of episodes) {
        // Add episode
        queue.push(episode.uri);
        episodeNames.push(episode.name);

        // Add 3 music tracks
        for (let i = 0; i < 3; i++) {
          if (musicIndex >= shuffledMusic.length) {
            // Reshuffle if we run out
            const newShuffled = shuffleArray(musicTracks);
            shuffledMusic.push(...newShuffled);
          }
          queue.push(shuffledMusic[musicIndex].uri);
          musicIndex++;
        }
      }
    } else {
      // No episodes, just play music
      queue.push(...shuffledMusic.map(track => track.uri));
    }

    return {
      queue,
      episodeNames,
      episodeCount: episodes.length,
      trackCount: queue.length
    };
  } catch (err) {
    console.error('Error building playlist:', err);
    throw err;
  }
}

async function buildPlaylistWithRetry(maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await buildPlaylistQueue();
    } catch (err) {
      lastError = err;
      console.error(`Playlist build attempt ${attempt} failed:`, err);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

module.exports = {
  buildPlaylistQueue,
  buildPlaylistWithRetry
};
```

**Step 2: Test playlist building logic (unit test)**

Create `server/services/playlist.test.js`:
```javascript
const playlist = require('./playlist');

// Mock dependencies
jest.mock('./spotify');
jest.mock('../db/models');

const spotify = require('./spotify');
const models = require('../db/models');

describe('Playlist Builder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('builds queue with episodes and music', async () => {
    models.getAlarmConfig.mockResolvedValue({
      music_source: 'top_tracks'
    });

    models.getSelectedPodcasts.mockResolvedValue([
      { show_id: 'show1', show_name: 'Podcast 1' },
      { show_id: 'show2', show_name: 'Podcast 2' }
    ]);

    spotify.getShowEpisodes.mockResolvedValueOnce({
      id: 'ep1',
      name: 'Episode 1',
      uri: 'spotify:episode:ep1'
    });

    spotify.getShowEpisodes.mockResolvedValueOnce({
      id: 'ep2',
      name: 'Episode 2',
      uri: 'spotify:episode:ep2'
    });

    spotify.getTopTracks.mockResolvedValue([
      { uri: 'spotify:track:t1' },
      { uri: 'spotify:track:t2' },
      { uri: 'spotify:track:t3' },
      { uri: 'spotify:track:t4' },
      { uri: 'spotify:track:t5' },
      { uri: 'spotify:track:t6' }
    ]);

    const result = await playlist.buildPlaylistQueue();

    expect(result.episodeCount).toBe(2);
    expect(result.queue.length).toBe(8); // 2 episodes + 6 songs
    expect(result.queue[0]).toBe('spotify:episode:ep1');
    expect(result.queue[4]).toBe('spotify:episode:ep2');
  });

  test('handles no new episodes gracefully', async () => {
    models.getAlarmConfig.mockResolvedValue({
      music_source: 'top_tracks'
    });

    models.getSelectedPodcasts.mockResolvedValue([
      { show_id: 'show1', show_name: 'Podcast 1' }
    ]);

    spotify.getShowEpisodes.mockResolvedValue(null);

    spotify.getTopTracks.mockResolvedValue([
      { uri: 'spotify:track:t1' },
      { uri: 'spotify:track:t2' }
    ]);

    const result = await playlist.buildPlaylistQueue();

    expect(result.episodeCount).toBe(0);
    expect(result.queue.length).toBe(2);
    expect(result.queue[0]).toBe('spotify:track:t1');
  });
});
```

**Step 3: Run tests**

Run: `npm test`
Expected: Tests pass

**Step 4: Commit**

Run:
```bash
git add server/services/playlist.js server/services/playlist.test.js
git commit -m "feat: add playlist building service with tests"
```

---

## Task 6: Alarm Scheduler

**Files:**
- Create: `server/services/scheduler.js`
- Modify: `server/index.js`

**Step 1: Create scheduler service**

Create `server/services/scheduler.js`:
```javascript
const schedule = require('node-schedule');
const { getAlarmConfig, getSelectedSpeakers, addAlarmLog } = require('../db/models');
const { buildPlaylistWithRetry } = require('./playlist');
const sonos = require('./sonos');

let scheduledJob = null;
let isPlaying = false;
let currentCoordinatorUuid = null;

function getDayName(dayIndex) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[dayIndex];
}

async function shouldTriggerToday(config) {
  if (!config.enabled) {
    return false;
  }

  const today = new Date();
  const dayName = getDayName(today.getDay());

  return config[dayName] === 1;
}

async function triggerAlarm() {
  console.log('Alarm triggered at', new Date().toISOString());

  try {
    const config = await getAlarmConfig();

    if (!await shouldTriggerToday(config)) {
      console.log('Alarm not scheduled for today, skipping');
      return;
    }

    const speakers = await getSelectedSpeakers();

    if (speakers.length === 0) {
      throw new Error('No speakers configured');
    }

    // Discover speakers
    await sonos.discoverSpeakers();

    // Try to group speakers
    const speakerUuids = speakers.map(s => s.speaker_uuid);
    const coordinatorUuid = speakerUuids[0];
    let coordinator;

    try {
      coordinator = await sonos.groupSpeakers(coordinatorUuid, speakerUuids);
    } catch (err) {
      console.error('Failed to group speakers, trying individually:', err);

      // Try each configured speaker individually
      let foundSpeaker = null;
      for (const uuid of speakerUuids) {
        const speaker = sonos.getSpeakerByUuid(uuid);
        if (speaker) {
          foundSpeaker = speaker;
          break;
        }
      }

      if (!foundSpeaker) {
        throw new Error('None of the configured speakers are available');
      }

      coordinator = foundSpeaker;
    }

    // Set volume
    await sonos.setVolume(coordinator.uuid, config.volume);

    // Build playlist
    const playlist = await buildPlaylistWithRetry();

    // Play queue
    await sonos.playQueue(coordinator.uuid, playlist.queue);

    // Update state
    isPlaying = true;
    currentCoordinatorUuid = coordinator.uuid;

    // Log success
    await addAlarmLog({
      success: true,
      episodes_played: playlist.episodeNames
    });

    console.log(`Alarm playing: ${playlist.episodeCount} episodes, ${playlist.trackCount} total tracks`);
  } catch (err) {
    console.error('Alarm trigger failed:', err);

    await addAlarmLog({
      success: false,
      error_message: err.message
    });
  }
}

async function stopAlarm() {
  if (!isPlaying || !currentCoordinatorUuid) {
    console.log('No alarm currently playing');
    return;
  }

  try {
    await sonos.stopPlayback(currentCoordinatorUuid);

    const speakers = await getSelectedSpeakers();
    await sonos.ungroupSpeakers(speakers.map(s => s.speaker_uuid));

    isPlaying = false;
    currentCoordinatorUuid = null;

    console.log('Alarm stopped');
  } catch (err) {
    console.error('Error stopping alarm:', err);
    throw err;
  }
}

async function rescheduleAlarm() {
  // Cancel existing job
  if (scheduledJob) {
    scheduledJob.cancel();
    scheduledJob = null;
  }

  const config = await getAlarmConfig();

  if (!config.enabled) {
    console.log('Alarm is disabled, not scheduling');
    return;
  }

  // Parse time (format: "HH:MM")
  const [hour, minute] = config.time.split(':').map(Number);

  // Schedule daily at configured time
  const rule = new schedule.RecurrenceRule();
  rule.hour = hour;
  rule.minute = minute;
  rule.second = 0;

  scheduledJob = schedule.scheduleJob(rule, triggerAlarm);

  console.log(`Alarm scheduled for ${config.time} daily`);
}

function getAlarmStatus() {
  return {
    isPlaying,
    isScheduled: !!scheduledJob
  };
}

module.exports = {
  rescheduleAlarm,
  triggerAlarm,
  stopAlarm,
  getAlarmStatus
};
```

**Step 2: Initialize scheduler on server start**

Update `server/index.js` to add after database init:
```javascript
const scheduler = require('./services/scheduler');

// Initialize database before starting server
initDatabase()
  .then(async () => {
    console.log('Database ready');

    // Schedule alarm if configured
    await scheduler.rescheduleAlarm();
    console.log('Scheduler initialized');
  })
  .catch(err => {
    console.error('Initialization failed:', err);
    process.exit(1);
  });
```

**Step 3: Create alarm control API**

Create `server/api/alarm.js`:
```javascript
const express = require('express');
const router = express.Router();
const { getAlarmConfig, updateAlarmConfig, getRecentLogs } = require('../db/models');
const scheduler = require('../services/scheduler');

// Get alarm config
router.get('/config', async (req, res) => {
  try {
    const config = await getAlarmConfig();
    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update alarm config
router.put('/config', async (req, res) => {
  try {
    const config = req.body;
    await updateAlarmConfig(config);
    await scheduler.rescheduleAlarm();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get alarm status
router.get('/status', (req, res) => {
  const status = scheduler.getAlarmStatus();
  res.json(status);
});

// Test alarm now
router.post('/test', async (req, res) => {
  try {
    scheduler.triggerAlarm();
    res.json({ success: true, message: 'Alarm triggered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stop alarm
router.post('/stop', async (req, res) => {
  try {
    await scheduler.stopAlarm();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent logs
router.get('/logs', async (req, res) => {
  try {
    const logs = await getRecentLogs(10);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

**Step 4: Register alarm routes**

Update `server/index.js` to add:
```javascript
const alarmRoutes = require('./api/alarm');

// ... existing code ...

app.use('/api/alarm', alarmRoutes);
```

**Step 5: Test alarm endpoints**

Run: `npm run dev`

Test config: `curl http://localhost:3001/api/alarm/config`
Expected: `{"config":{...}}`

Test status: `curl http://localhost:3001/api/alarm/status`
Expected: `{"isPlaying":false,"isScheduled":true}`

**Step 6: Commit**

Run:
```bash
git add server/services/scheduler.js server/api/alarm.js server/index.js
git commit -m "feat: add alarm scheduler with trigger logic"
```

---

## Task 7: Podcast Management API

**Files:**
- Create: `server/api/podcasts.js`
- Modify: `server/index.js`

**Step 1: Create podcasts API**

Create `server/api/podcasts.js`:
```javascript
const express = require('express');
const router = express.Router();
const spotify = require('../services/spotify');
const { getSelectedPodcasts, setSelectedPodcasts } = require('../db/models');

// Get user's followed podcasts from Spotify
router.get('/followed', async (req, res) => {
  try {
    const shows = await spotify.getFollowedShows();
    res.json({ shows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get selected (alarm-eligible) podcasts
router.get('/selected', async (req, res) => {
  try {
    const podcasts = await getSelectedPodcasts();
    res.json({ podcasts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set selected podcasts
router.post('/selected', async (req, res) => {
  try {
    const { podcasts } = req.body;

    if (!Array.isArray(podcasts)) {
      return res.status(400).json({ error: 'podcasts must be an array' });
    }

    await setSelectedPodcasts(podcasts);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

**Step 2: Register podcasts routes**

Update `server/index.js`:
```javascript
const podcastsRoutes = require('./api/podcasts');

// ... existing code ...

app.use('/api/podcasts', podcastsRoutes);
```

**Step 3: Test podcasts endpoints**

Run: `npm run dev`

Test followed: `curl http://localhost:3001/api/podcasts/followed`
Expected: Spotify shows or auth error

Test selected: `curl http://localhost:3001/api/podcasts/selected`
Expected: `{"podcasts":[]}`

**Step 4: Commit**

Run:
```bash
git add server/api/podcasts.js server/index.js
git commit -m "feat: add podcast management API"
```

---

## Task 8: React Frontend Setup

**Files:**
- Create: `client/package.json`
- Create: `client/public/index.html`
- Create: `client/src/index.js`
- Create: `client/src/App.js`
- Create: `client/.gitignore`

**Step 1: Initialize React app in client directory**

Run:
```bash
cd client
npx create-react-app .
```

**Step 2: Install additional dependencies**

Run:
```bash
npm install axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 3: Configure Tailwind**

Update `client/tailwind.config.js`:
```javascript
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Update `client/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Configure proxy to backend**

Update `client/package.json` to add:
```json
{
  "proxy": "http://localhost:3001"
}
```

**Step 5: Create API client**

Create `client/src/api.js`:
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

export const auth = {
  getLoginUrl: () => api.get('/auth/spotify/login'),
  getStatus: () => api.get('/auth/spotify/status')
};

export const speakers = {
  discover: () => api.get('/speakers/discover'),
  getSelected: () => api.get('/speakers/selected'),
  setSelected: (speakers) => api.post('/speakers/selected', { speakers })
};

export const podcasts = {
  getFollowed: () => api.get('/podcasts/followed'),
  getSelected: () => api.get('/podcasts/selected'),
  setSelected: (podcasts) => api.post('/podcasts/selected', { podcasts })
};

export const alarm = {
  getConfig: () => api.get('/alarm/config'),
  updateConfig: (config) => api.put('/alarm/config', config),
  getStatus: () => api.get('/alarm/status'),
  test: () => api.post('/alarm/test'),
  stop: () => api.post('/alarm/stop'),
  getLogs: () => api.get('/alarm/logs')
};

export default api;
```

**Step 6: Create basic App component**

Update `client/src/App.js`:
```javascript
import React from 'react';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Podcast Alarm Clock
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    </div>
  );
}

export default App;
```

**Step 7: Test frontend starts**

Run in client directory: `npm start`
Expected: Browser opens to http://localhost:3000 with "Podcast Alarm Clock" heading

**Step 8: Commit**

Run:
```bash
cd ..
git add client/
git commit -m "feat: initialize React frontend with Tailwind CSS"
```

---

## Task 9: Build Alarm Status Component

**Files:**
- Create: `client/src/components/AlarmStatus.js`
- Modify: `client/src/App.js`

**Step 1: Create AlarmStatus component**

Create `client/src/components/AlarmStatus.js`:
```javascript
import React, { useState, useEffect } from 'react';
import { alarm } from '../api';

function AlarmStatus() {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [configRes, statusRes] = await Promise.all([
        alarm.getConfig(),
        alarm.getStatus()
      ]);
      setConfig(configRes.data.config);
      setStatus(statusRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading alarm data:', err);
    }
  };

  const toggleEnabled = async () => {
    try {
      const newConfig = { ...config, enabled: !config.enabled };
      await alarm.updateConfig(newConfig);
      setConfig(newConfig);
    } catch (err) {
      console.error('Error toggling alarm:', err);
    }
  };

  const getNextAlarm = () => {
    if (!config || !config.enabled) return null;

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();

    for (let i = 0; i <= 7; i++) {
      const dayIndex = (today + i) % 7;
      const dayName = days[dayIndex];

      if (config[dayName]) {
        const fullDayName = dayNames[dayIndex];
        return `${fullDayName} at ${config.time}`;
      }
    }

    return 'Not scheduled';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const nextAlarm = getNextAlarm();
  const statusText = status?.isPlaying ? 'Playing Now' :
                     config?.enabled ? 'Alarm Ready' : 'Not Configured';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Alarm Status</h2>
        <button
          onClick={toggleEnabled}
          className={`px-8 py-3 rounded-lg text-white text-lg font-semibold transition ${
            config?.enabled
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-gray-400 hover:bg-gray-500'
          }`}
        >
          {config?.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">Status</p>
          <p className="text-xl font-semibold">{statusText}</p>
        </div>

        {config?.enabled && (
          <div>
            <p className="text-sm text-gray-600">Next Alarm</p>
            <p className="text-xl font-semibold">{nextAlarm}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AlarmStatus;
```

**Step 2: Add AlarmStatus to App**

Update `client/src/App.js`:
```javascript
import React from 'react';
import './index.css';
import AlarmStatus from './components/AlarmStatus';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Podcast Alarm Clock
        </h1>

        <div className="max-w-4xl mx-auto space-y-6">
          <AlarmStatus />
        </div>
      </div>
    </div>
  );
}

export default App;
```

**Step 3: Test component renders**

Run: `npm start` (in client directory)
Expected: See alarm status with ON/OFF toggle

**Step 4: Commit**

Run:
```bash
git add client/src/
git commit -m "feat: add alarm status component with toggle"
```

---

## Task 10: Build Alarm Configuration Component

**Files:**
- Create: `client/src/components/AlarmConfig.js`
- Modify: `client/src/App.js`

**Step 1: Create AlarmConfig component**

Create `client/src/components/AlarmConfig.js`:
```javascript
import React, { useState, useEffect } from 'react';
import { alarm } from '../api';

function AlarmConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await alarm.getConfig();
      setConfig(res.data.config);
      setLoading(false);
    } catch (err) {
      console.error('Error loading config:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await alarm.updateConfig(config);
      alert('Configuration saved!');
    } catch (err) {
      console.error('Error saving config:', err);
      alert('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setConfig({ ...config, [field]: value });
  };

  const toggleDay = (day) => {
    setConfig({ ...config, [day]: config[day] ? 0 : 1 });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const days = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Alarm Configuration</h2>

      <div className="space-y-6">
        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alarm Time
          </label>
          <input
            type="time"
            value={config.time}
            onChange={(e) => updateField('time', e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-lg"
          />
        </div>

        {/* Days of Week */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Days of Week
          </label>
          <div className="flex gap-2">
            {days.map(day => (
              <button
                key={day.key}
                onClick={() => toggleDay(day.key)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  config[day.key]
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {/* Volume */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Volume: {config.volume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={config.volume}
            onChange={(e) => updateField('volume', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Music Source */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Music Source
          </label>
          <select
            value={config.music_source}
            onChange={(e) => updateField('music_source', e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 w-full"
          >
            <option value="daily_mix_1">Daily Mix 1</option>
            <option value="daily_mix_2">Daily Mix 2</option>
            <option value="daily_mix_3">Daily Mix 3</option>
            <option value="top_tracks">Top Tracks</option>
          </select>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

export default AlarmConfig;
```

**Step 2: Add AlarmConfig to App**

Update `client/src/App.js`:
```javascript
import React from 'react';
import './index.css';
import AlarmStatus from './components/AlarmStatus';
import AlarmConfig from './components/AlarmConfig';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Podcast Alarm Clock
        </h1>

        <div className="max-w-4xl mx-auto space-y-6">
          <AlarmStatus />
          <AlarmConfig />
        </div>
      </div>
    </div>
  );
}

export default App;
```

**Step 3: Test configuration UI**

Run: `npm start`
Expected: See time picker, weekday buttons, volume slider, music source dropdown

Test: Change values and click Save
Expected: "Configuration saved!" alert

**Step 4: Commit**

Run:
```bash
git add client/src/
git commit -m "feat: add alarm configuration component"
```

---

## Task 11: Build Sonos Speaker Selection Component

**Files:**
- Create: `client/src/components/SpeakerSelection.js`
- Modify: `client/src/App.js`

**Step 1: Create SpeakerSelection component**

Create `client/src/components/SpeakerSelection.js`:
```javascript
import React, { useState, useEffect } from 'react';
import { speakers } from '../api';

function SpeakerSelection() {
  const [available, setAvailable] = useState([]);
  const [selected, setSelected] = useState([]);
  const [discovering, setDiscovering] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSelected();
  }, []);

  const loadSelected = async () => {
    try {
      const res = await speakers.getSelected();
      setSelected(res.data.speakers);
      setLoading(false);
    } catch (err) {
      console.error('Error loading selected speakers:', err);
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await speakers.discover();
      setAvailable(res.data.speakers);
    } catch (err) {
      console.error('Error discovering speakers:', err);
      alert('Error discovering speakers');
    } finally {
      setDiscovering(false);
    }
  };

  const toggleSpeaker = (speaker) => {
    const isSelected = selected.some(s => s.speaker_uuid === speaker.uuid);

    if (isSelected) {
      setSelected(selected.filter(s => s.speaker_uuid !== speaker.uuid));
    } else {
      setSelected([...selected, {
        speaker_name: speaker.name,
        speaker_uuid: speaker.uuid
      }]);
    }
  };

  const handleSave = async () => {
    try {
      await speakers.setSelected(selected.map(s => ({
        name: s.speaker_name,
        uuid: s.speaker_uuid
      })));
      alert('Speaker selection saved!');
    } catch (err) {
      console.error('Error saving speakers:', err);
      alert('Error saving speakers');
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
      <h2 className="text-2xl font-bold mb-6">Sonos Speakers</h2>

      <div className="space-y-6">
        {/* Currently Selected */}
        {selected.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Selected Speakers ({selected.length})
            </p>
            <div className="space-y-2">
              {selected.map(speaker => (
                <div key={speaker.speaker_uuid} className="bg-blue-50 px-4 py-2 rounded-lg">
                  {speaker.speaker_name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discover Button */}
        <button
          onClick={handleDiscover}
          disabled={discovering}
          className="w-full bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 disabled:bg-gray-400"
        >
          {discovering ? 'Discovering...' : 'Discover Speakers'}
        </button>

        {/* Available Speakers */}
        {available.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Available Speakers
            </p>
            <div className="space-y-2">
              {available.map(speaker => {
                const isSelected = selected.some(s => s.speaker_uuid === speaker.uuid);
                return (
                  <button
                    key={speaker.uuid}
                    onClick={() => toggleSpeaker(speaker)}
                    className={`w-full px-4 py-3 rounded-lg text-left transition ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-medium">{speaker.name}</div>
                    <div className="text-sm opacity-75">{speaker.model}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Save Button */}
        {available.length > 0 && (
          <button
            onClick={handleSave}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600"
          >
            Save Speaker Selection
          </button>
        )}
      </div>
    </div>
  );
}

export default SpeakerSelection;
```

**Step 2: Add SpeakerSelection to App**

Update `client/src/App.js`:
```javascript
import React from 'react';
import './index.css';
import AlarmStatus from './components/AlarmStatus';
import AlarmConfig from './components/AlarmConfig';
import SpeakerSelection from './components/SpeakerSelection';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Podcast Alarm Clock
        </h1>

        <div className="max-w-4xl mx-auto space-y-6">
          <AlarmStatus />
          <AlarmConfig />
          <SpeakerSelection />
        </div>
      </div>
    </div>
  );
}

export default App;
```

**Step 3: Test speaker discovery**

Run: `npm start`
Expected: Click "Discover Speakers" and see available Sonos speakers (if on network)

**Step 4: Commit**

Run:
```bash
git add client/src/
git commit -m "feat: add Sonos speaker selection component"
```

---

## Task 12: Build Podcast Selection Component

**Files:**
- Create: `client/src/components/PodcastSelection.js`
- Create: `client/src/components/SpotifyAuth.js`
- Modify: `client/src/App.js`

**Step 1: Create SpotifyAuth component**

Create `client/src/components/SpotifyAuth.js`:
```javascript
import React, { useState, useEffect } from 'react';
import { auth } from '../api';

function SpotifyAuth({ onAuthChange }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    const interval = setInterval(checkAuth, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const checkAuth = async () => {
    try {
      const res = await auth.getStatus();
      setAuthenticated(res.data.authenticated);
      setLoading(false);
      if (onAuthChange) onAuthChange(res.data.authenticated);
    } catch (err) {
      console.error('Error checking auth status:', err);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await auth.getLoginUrl();
      window.open(res.data.authUrl, '_blank', 'width=600,height=800');

      // Poll for auth success
      const pollInterval = setInterval(async () => {
        const status = await auth.getStatus();
        if (status.data.authenticated) {
          clearInterval(pollInterval);
          checkAuth();
        }
      }, 2000);

      // Stop polling after 2 minutes
      setTimeout(() => clearInterval(pollInterval), 120000);
    } catch (err) {
      console.error('Error getting login URL:', err);
      alert('Error connecting to Spotify');
    }
  };

  if (loading) {
    return <p className="text-gray-600">Checking Spotify connection...</p>;
  }

  if (authenticated) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-700 font-medium">✓ Connected to Spotify</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600"
    >
      Connect Spotify
    </button>
  );
}

export default SpotifyAuth;
```

**Step 2: Create PodcastSelection component**

Create `client/src/components/PodcastSelection.js`:
```javascript
import React, { useState, useEffect } from 'react';
import { podcasts } from '../api';
import SpotifyAuth from './SpotifyAuth';

function PodcastSelection() {
  const [authenticated, setAuthenticated] = useState(false);
  const [followed, setFollowed] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authenticated) {
      loadPodcasts();
    }
  }, [authenticated]);

  const loadPodcasts = async () => {
    setLoading(true);
    try {
      const [followedRes, selectedRes] = await Promise.all([
        podcasts.getFollowed(),
        podcasts.getSelected()
      ]);
      setFollowed(followedRes.data.shows);
      setSelected(selectedRes.data.podcasts);
    } catch (err) {
      console.error('Error loading podcasts:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePodcast = (show) => {
    const isSelected = selected.some(p => p.show_id === show.id);

    if (isSelected) {
      setSelected(selected.filter(p => p.show_id !== show.id));
    } else {
      setSelected([...selected, {
        show_id: show.id,
        show_name: show.name
      }]);
    }
  };

  const handleSave = async () => {
    try {
      await podcasts.setSelected(selected.map(p => ({
        id: p.show_id,
        name: p.show_name
      })));
      alert('Podcast selection saved!');
    } catch (err) {
      console.error('Error saving podcasts:', err);
      alert('Error saving podcasts');
    }
  };

  const filteredPodcasts = followed.filter(show =>
    show.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Podcast Selection</h2>

      <div className="space-y-6">
        <SpotifyAuth onAuthChange={setAuthenticated} />

        {authenticated && !loading && (
          <>
            <div>
              <p className="text-sm text-gray-600 mb-2">
                {selected.length} of {followed.length} podcasts selected for alarm
              </p>
            </div>

            {followed.length > 5 && (
              <input
                type="text"
                placeholder="Search podcasts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            )}

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredPodcasts.map(show => {
                const isSelected = selected.some(p => p.show_id === show.id);
                return (
                  <button
                    key={show.id}
                    onClick={() => togglePodcast(show)}
                    className={`w-full px-4 py-3 rounded-lg text-left transition flex items-center gap-3 ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {show.image && (
                      <img
                        src={show.image}
                        alt={show.name}
                        className="w-12 h-12 rounded"
                      />
                    )}
                    <div>
                      <div className="font-medium">{show.name}</div>
                      <div className="text-sm opacity-75">{show.publisher}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSave}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600"
            >
              Save Podcast Selection
            </button>
          </>
        )}

        {loading && <p className="text-gray-600">Loading podcasts...</p>}
      </div>
    </div>
  );
}

export default PodcastSelection;
```

**Step 3: Add PodcastSelection to App**

Update `client/src/App.js`:
```javascript
import React from 'react';
import './index.css';
import AlarmStatus from './components/AlarmStatus';
import AlarmConfig from './components/AlarmConfig';
import SpeakerSelection from './components/SpeakerSelection';
import PodcastSelection from './components/PodcastSelection';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Podcast Alarm Clock
        </h1>

        <div className="max-w-4xl mx-auto space-y-6">
          <AlarmStatus />
          <AlarmConfig />
          <SpeakerSelection />
          <PodcastSelection />
        </div>
      </div>
    </div>
  );
}

export default App;
```

**Step 4: Test podcast selection**

Run: `npm start`
Expected: See "Connect Spotify" button, click to authenticate, see followed podcasts

**Step 5: Commit**

Run:
```bash
git add client/src/
git commit -m "feat: add podcast selection with Spotify auth"
```

---

## Task 13: Build Control Panel Component

**Files:**
- Create: `client/src/components/ControlPanel.js`
- Modify: `client/src/App.js`

**Step 1: Create ControlPanel component**

Create `client/src/components/ControlPanel.js`:
```javascript
import React, { useState, useEffect } from 'react';
import { alarm } from '../api';

function ControlPanel() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [testing, setTesting] = useState(false);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    loadStatus();
    loadLogs();
    const interval = setInterval(() => {
      loadStatus();
      loadLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const res = await alarm.getStatus();
      setStatus(res.data);
    } catch (err) {
      console.error('Error loading status:', err);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await alarm.getLogs();
      setLogs(res.data.logs);
    } catch (err) {
      console.error('Error loading logs:', err);
    }
  };

  const handleTest = async () => {
    if (!window.confirm('This will trigger the alarm immediately. Continue?')) {
      return;
    }

    setTesting(true);
    try {
      await alarm.test();
      alert('Alarm triggered! Check your speakers.');
      loadStatus();
    } catch (err) {
      console.error('Error testing alarm:', err);
      alert('Error triggering alarm: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await alarm.stop();
      loadStatus();
    } catch (err) {
      console.error('Error stopping alarm:', err);
      alert('Error stopping alarm');
    } finally {
      setStopping(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Controls & Testing</h2>

      <div className="space-y-6">
        {/* Test & Stop Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleTest}
            disabled={testing || status?.isPlaying}
            className="flex-1 bg-yellow-500 text-white py-3 rounded-lg font-semibold hover:bg-yellow-600 disabled:bg-gray-400"
          >
            {testing ? 'Triggering...' : 'Test Alarm Now'}
          </button>

          {status?.isPlaying && (
            <button
              onClick={handleStop}
              disabled={stopping}
              className="flex-1 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 disabled:bg-gray-400"
            >
              {stopping ? 'Stopping...' : 'Stop Playback'}
            </button>
          )}
        </div>

        {/* Recent Logs */}
        {logs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Recent Alarm Logs</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.map(log => {
                const episodes = log.episodes_played ? JSON.parse(log.episodes_played) : [];
                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg ${
                      log.success ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {log.success ? '✓ Success' : '✗ Failed'}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatTimestamp(log.triggered_at)}
                      </span>
                    </div>
                    {log.success && episodes.length > 0 && (
                      <div className="text-sm text-gray-700">
                        {episodes.length} episodes: {episodes.slice(0, 2).join(', ')}
                        {episodes.length > 2 && ` +${episodes.length - 2} more`}
                      </div>
                    )}
                    {!log.success && log.error_message && (
                      <div className="text-sm text-red-700">
                        {log.error_message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {logs.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No alarm history yet. Test the alarm to see logs here.
          </p>
        )}
      </div>
    </div>
  );
}

export default ControlPanel;
```

**Step 2: Add ControlPanel to App**

Update `client/src/App.js`:
```javascript
import React from 'react';
import './index.css';
import AlarmStatus from './components/AlarmStatus';
import AlarmConfig from './components/AlarmConfig';
import SpeakerSelection from './components/SpeakerSelection';
import PodcastSelection from './components/PodcastSelection';
import ControlPanel from './components/ControlPanel';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Podcast Alarm Clock
        </h1>

        <div className="max-w-4xl mx-auto space-y-6">
          <AlarmStatus />
          <AlarmConfig />
          <SpeakerSelection />
          <PodcastSelection />
          <ControlPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
```

**Step 3: Test control panel**

Run: `npm start`
Expected: See "Test Alarm Now" button and empty logs

**Step 4: Commit**

Run:
```bash
git add client/src/
git commit -m "feat: add control panel with test and logs"
```

---

## Task 14: Production Build and Deployment Setup

**Files:**
- Create: `ecosystem.config.js`
- Modify: `server/index.js`
- Modify: `package.json`
- Create: `deploy.sh`

**Step 1: Build React app for production**

Create `package.json` script in root:
```json
{
  "scripts": {
    "build": "cd client && npm run build",
    "start:prod": "NODE_ENV=production node server/index.js"
  }
}
```

**Step 2: Serve React build from Express**

Update `server/index.js` to add before `app.listen`:
```javascript
const path = require('path');

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}
```

**Step 3: Create PM2 config**

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'podcast-alarm-clock',
    script: './server/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

**Step 4: Create deployment script**

Create `deploy.sh`:
```bash
#!/bin/bash
set -e

echo "Building React app..."
cd client && npm run build && cd ..

echo "Installing PM2 if not present..."
npm install -g pm2 || true

echo "Creating logs directory..."
mkdir -p logs

echo "Starting/restarting app with PM2..."
pm2 delete podcast-alarm-clock || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "Deployment complete!"
echo "Access the app at: http://localhost:3001"
echo ""
echo "Useful commands:"
echo "  pm2 status           - Check app status"
echo "  pm2 logs             - View logs"
echo "  pm2 restart all      - Restart app"
echo "  pm2 stop all         - Stop app"
```

Make executable: `chmod +x deploy.sh`

**Step 5: Update README with deployment instructions**

Update `README.md`:
```markdown
# Podcast Alarm Clock

A local alarm clock system that plays Spotify podcasts and music through Sonos speakers.

## Prerequisites

- Node.js 16+
- Spotify Premium account
- Sonos speakers on local network
- Mac mini (or any always-on computer)

## Initial Setup

1. Clone repository
2. Install dependencies:
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. Create Spotify App:
   - Go to https://developer.spotify.com/dashboard
   - Create new app
   - Set redirect URI: `http://localhost:3001/api/auth/spotify/callback`
   - Copy Client ID and Client Secret

4. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env and add your Spotify credentials
   ```

## Development

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
cd client && npm start
```

Access at http://localhost:3000

## Production Deployment

```bash
./deploy.sh
```

Access at http://localhost:3001 or http://<your-mac-ip>:3001

The app will run in the background via PM2 and restart automatically on crashes or reboots.

## PM2 Commands

```bash
pm2 status              # Check status
pm2 logs                # View logs
pm2 restart all         # Restart
pm2 stop all            # Stop
pm2 startup             # Enable on boot
```

## Usage

1. Open web interface
2. Click "Connect Spotify" and authorize
3. Click "Discover Speakers" and select your Sonos speakers
4. Select podcasts you want in your alarm
5. Configure alarm time, days, and volume
6. Toggle alarm ON
7. Use "Test Alarm Now" to verify everything works

## Troubleshooting

- **No speakers found**: Ensure Sonos speakers and Mac mini are on same network
- **Spotify auth fails**: Check credentials in .env, verify redirect URI in Spotify dashboard
- **Alarm doesn't trigger**: Check PM2 logs with `pm2 logs`
- **Music doesn't play**: Verify Spotify Premium account is active
```

**Step 6: Test production build**

Run:
```bash
cd client
npm run build
cd ..
NODE_ENV=production node server/index.js
```

Open browser: http://localhost:3001
Expected: See complete UI

**Step 7: Commit**

Run:
```bash
git add ecosystem.config.js deploy.sh package.json server/index.js README.md
git commit -m "feat: add production build and PM2 deployment"
```

---

## Task 15: Final Testing and Documentation

**Step 1: Create testing checklist**

Create `docs/TESTING.md`:
```markdown
# Testing Checklist

## Backend API Testing

- [ ] Health check: `curl http://localhost:3001/health`
- [ ] Alarm config GET: `curl http://localhost:3001/api/alarm/config`
- [ ] Alarm status: `curl http://localhost:3001/api/alarm/status`
- [ ] Speaker discovery: `curl http://localhost:3001/api/speakers/discover`
- [ ] Auth status: `curl http://localhost:3001/api/auth/spotify/status`

## Frontend Testing

- [ ] Alarm status displays correctly
- [ ] ON/OFF toggle works
- [ ] Time picker updates config
- [ ] Weekday buttons toggle properly
- [ ] Volume slider updates
- [ ] Music source dropdown works
- [ ] Configuration saves successfully
- [ ] Speaker discovery works
- [ ] Speaker selection persists
- [ ] Spotify auth flow completes
- [ ] Followed podcasts load
- [ ] Podcast selection saves
- [ ] Test alarm triggers playback
- [ ] Stop button stops playback
- [ ] Logs display correctly

## Integration Testing

1. **Full Alarm Flow:**
   - Configure alarm for 1 minute from now
   - Select speakers
   - Authenticate Spotify
   - Select podcasts
   - Enable alarm
   - Wait for trigger
   - Verify playback starts
   - Click stop
   - Verify playback stops

2. **Scheduler Persistence:**
   - Configure alarm
   - Restart server
   - Verify alarm still scheduled

3. **Error Handling:**
   - Trigger alarm with no speakers
   - Trigger alarm with no podcasts
   - Trigger alarm with invalid Spotify auth
   - Verify errors logged

## Mobile Responsiveness

- [ ] Test on phone browser
- [ ] Test on tablet
- [ ] Verify touch targets are large enough
- [ ] Verify scrolling works
```

**Step 2: Create CLAUDE.md for future development**

Create `CLAUDE.md`:
```markdown
# Claude Code Instructions

## Project Overview

Podcast Alarm Clock - A Node.js/React app that triggers alarms to play Spotify podcasts through Sonos speakers.

## Key Files

- `server/index.js` - Express server entry point
- `server/services/spotify.js` - Spotify API integration
- `server/services/sonos.js` - Sonos speaker control
- `server/services/scheduler.js` - Alarm scheduling logic
- `server/services/playlist.js` - Queue building
- `server/db/models.js` - Database access layer
- `client/src/App.js` - React app entry
- `client/src/components/` - React components

## Development Workflow

1. Changes to backend: restart `npm run dev`
2. Changes to frontend: hot reload automatic
3. Run tests: `npm test`
4. Deploy: `./deploy.sh`

## Testing

Use "Test Alarm Now" button for quick validation. Check PM2 logs for production issues: `pm2 logs`.

## Architecture Notes

- SQLite for persistence (single-user app)
- PM2 for process management
- node-schedule for cron-like scheduling
- OAuth tokens auto-refresh
- Speakers discovered on-demand, not cached

## Worktrees

Use `.worktrees/` directory for git worktrees (already ignored).

## Common Tasks

- Add new API route: create in `server/api/`, register in `server/index.js`
- Add new UI component: create in `client/src/components/`, import in `App.js`
- Modify alarm logic: edit `server/services/scheduler.js`
- Change database schema: update `server/db/schema.sql` and `models.js`
```

**Step 3: Run full test suite**

Run through `docs/TESTING.md` checklist manually.

**Step 4: Commit**

Run:
```bash
git add docs/TESTING.md CLAUDE.md
git commit -m "docs: add testing checklist and Claude instructions"
```

**Step 5: Final commit and merge preparation**

Run:
```bash
git log --oneline
git status
```

Expected: Clean working directory, all features committed.

---

## Completion

All implementation tasks complete! The Podcast Alarm Clock is now ready for deployment.

**Next Steps:**

1. Deploy to Mac mini: `./deploy.sh`
2. Configure Spotify credentials in `.env`
3. Run through testing checklist
4. Set up actual alarm schedule
5. Use @superpowers:finishing-a-development-branch to merge to main

**Success Criteria Met:**
- ✓ Backend API with all endpoints
- ✓ SQLite database with persistence
- ✓ Spotify OAuth and content fetching
- ✓ Sonos speaker discovery and control
- ✓ Playlist building with episodes + music
- ✓ Scheduler with daily recurring alarms
- ✓ React frontend with all components
- ✓ Mobile-responsive UI
- ✓ Test alarm functionality
- ✓ Production build and PM2 deployment
- ✓ Complete documentation
