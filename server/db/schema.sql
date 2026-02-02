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
  volume INTEGER NOT NULL DEFAULT 30 CHECK (volume >= 0 AND volume <= 100)
);

CREATE TABLE IF NOT EXISTS selected_speakers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  speaker_name TEXT NOT NULL,
  speaker_uuid TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS podcast_feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_url TEXT NOT NULL UNIQUE,
  feed_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alarm_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  triggered_at INTEGER NOT NULL,
  success INTEGER NOT NULL,
  error_message TEXT,
  episodes_played TEXT
);

CREATE TABLE IF NOT EXISTS played_episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id INTEGER NOT NULL,
  episode_guid TEXT NOT NULL,
  episode_title TEXT,
  audio_url TEXT,
  played_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feed_id) REFERENCES podcast_feeds(id) ON DELETE CASCADE,
  UNIQUE(feed_id, episode_guid)
);

-- Insert default alarm config if not exists
INSERT OR IGNORE INTO alarm_config (id, time, enabled) VALUES (1, '07:00', 0);
