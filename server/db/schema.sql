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
