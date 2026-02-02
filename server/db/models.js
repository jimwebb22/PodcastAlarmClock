const { getDatabase } = require('./database');

// Alarm Config Functions
function getAlarmConfig() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.get('SELECT * FROM alarm_config WHERE id = 1', (err, row) => {
      db.close();
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function updateAlarmConfig(config) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const {
      time,
      enabled,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
      volume
    } = config;

    const sql = `
      UPDATE alarm_config
      SET time = ?,
          enabled = ?,
          monday = ?,
          tuesday = ?,
          wednesday = ?,
          thursday = ?,
          friday = ?,
          saturday = ?,
          sunday = ?,
          volume = ?
      WHERE id = 1
    `;

    db.run(
      sql,
      [time, enabled, monday, tuesday, wednesday, thursday, friday, saturday, sunday, volume],
      function(err) {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        resolve({ changes: this.changes });
      }
    );
  });
}

// Selected Speakers Functions
function getSelectedSpeakers() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all('SELECT * FROM selected_speakers', (err, rows) => {
      db.close();
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function setSelectedSpeakers(speakers) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();

    // Delete all existing speakers and insert new ones
    db.serialize(() => {
      db.run('DELETE FROM selected_speakers', (err) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }

        if (speakers.length === 0) {
          db.close();
          resolve({ inserted: 0 });
          return;
        }

        const stmt = db.prepare('INSERT INTO selected_speakers (speaker_name, speaker_uuid) VALUES (?, ?)');

        let completed = 0;
        let hasError = false;

        speakers.forEach((speaker) => {
          stmt.run([speaker.speaker_name, speaker.speaker_uuid], (err) => {
            if (err && !hasError) {
              hasError = true;
              stmt.finalize();
              db.close();
              reject(err);
              return;
            }

            completed++;
            if (completed === speakers.length && !hasError) {
              stmt.finalize();
              db.close();
              resolve({ inserted: completed });
            }
          });
        });
      });
    });
  });
}

// Podcast Feeds Functions
function getPodcastFeeds() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all('SELECT * FROM podcast_feeds ORDER BY created_at DESC', (err, rows) => {
      db.close();
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function addPodcastFeed(feedUrl, feedName) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const sql = 'INSERT INTO podcast_feeds (feed_url, feed_name) VALUES (?, ?)';

    db.run(sql, [feedUrl, feedName], function(err) {
      db.close();
      if (err) {
        // Check for unique constraint violation
        if (err.message.includes('UNIQUE constraint failed')) {
          reject(new Error('This podcast feed has already been added'));
        } else {
          reject(err);
        }
        return;
      }
      resolve({ id: this.lastID, feed_url: feedUrl, feed_name: feedName });
    });
  });
}

function removePodcastFeed(feedId) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run('DELETE FROM podcast_feeds WHERE id = ?', [feedId], function(err) {
      db.close();
      if (err) {
        reject(err);
        return;
      }
      resolve({ deleted: this.changes });
    });
  });
}

function updatePodcastFeed(feedId, feedName) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(
      'UPDATE podcast_feeds SET feed_name = ? WHERE id = ?',
      [feedName, feedId],
      function(err) {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        resolve({ changes: this.changes });
      }
    );
  });
}

// Alarm Logs Functions
function addAlarmLog(log) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const { triggered_at, success, error_message, episodes_played } = log;

    // Convert episodes_played array to JSON string if provided
    const episodesJson = episodes_played ? JSON.stringify(episodes_played) : null;

    const sql = `
      INSERT INTO alarm_logs (triggered_at, success, error_message, episodes_played)
      VALUES (?, ?, ?, ?)
    `;

    db.run(sql, [triggered_at, success, error_message, episodesJson], function(err) {
      db.close();
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID });
    });
  });
}

function getRecentLogs(limit = 10) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const sql = 'SELECT * FROM alarm_logs ORDER BY triggered_at DESC LIMIT ?';

    db.all(sql, [limit], (err, rows) => {
      db.close();
      if (err) {
        reject(err);
        return;
      }

      // Parse episodes_played JSON strings back to arrays
      const logs = rows.map(row => ({
        ...row,
        episodes_played: row.episodes_played ? JSON.parse(row.episodes_played) : null
      }));

      resolve(logs);
    });
  });
}

module.exports = {
  getAlarmConfig,
  updateAlarmConfig,
  getSelectedSpeakers,
  setSelectedSpeakers,
  getPodcastFeeds,
  addPodcastFeed,
  removePodcastFeed,
  updatePodcastFeed,
  addAlarmLog,
  getRecentLogs
};
