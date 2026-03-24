const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();

// Point DATABASE_PATH to a temp file so tests don't touch the real DB
const TEST_DB = path.join(os.tmpdir(), `test-alarm-${Date.now()}.db`);
process.env.DATABASE_PATH = TEST_DB;

// Re-require after setting env so DB_PATH picks up the override
const { clearOldAlarmLogs } = require('./models');

// Helper: open test DB and run schema
function initTestDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(TEST_DB);
    db.exec(`
      CREATE TABLE IF NOT EXISTS alarm_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        triggered_at INTEGER NOT NULL,
        success INTEGER NOT NULL,
        error_message TEXT,
        episodes_played TEXT
      );
    `, (err) => {
      db.close();
      if (err) reject(err);
      else resolve();
    });
  });
}

// Helper: insert a log with a given ISO timestamp
function insertLog(isoTimestamp, success = 1) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(TEST_DB);
    db.run(
      'INSERT INTO alarm_logs (triggered_at, success) VALUES (?, ?)',
      [isoTimestamp, success],
      function(err) { db.close(); err ? reject(err) : resolve(this.lastID); }
    );
  });
}

// Helper: count remaining logs
function countLogs() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(TEST_DB);
    db.get('SELECT COUNT(*) as count FROM alarm_logs', (err, row) => {
      db.close();
      err ? reject(err) : resolve(row.count);
    });
  });
}

// Helper: delete all logs (reset between tests)
function clearAllLogs() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(TEST_DB);
    db.run('DELETE FROM alarm_logs', (err) => {
      db.close();
      err ? reject(err) : resolve();
    });
  });
}

beforeAll(() => initTestDb());
afterEach(() => clearAllLogs());
afterAll(() => require('fs').unlinkSync(TEST_DB));

describe('clearOldAlarmLogs', () => {
  test('deletes logs older than daysToKeep', async () => {
    // 200 days ago — should be deleted
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
    // 10 days ago — should be kept
    const recent = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

    await insertLog(old);
    await insertLog(recent);

    const result = await clearOldAlarmLogs(90);

    expect(result.deleted).toBe(1);
    expect(await countLogs()).toBe(1);
  });

  test('keeps all logs when none are old enough', async () => {
    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    await insertLog(recent);
    await insertLog(recent);

    const result = await clearOldAlarmLogs(90);

    expect(result.deleted).toBe(0);
    expect(await countLogs()).toBe(2);
  });

  test('deletes all logs when all are old enough', async () => {
    const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    await insertLog(old);
    await insertLog(old);

    const result = await clearOldAlarmLogs(90);

    expect(result.deleted).toBe(2);
    expect(await countLogs()).toBe(0);
  });

  test('returns zero deleted when table is empty', async () => {
    const result = await clearOldAlarmLogs(90);
    expect(result.deleted).toBe(0);
  });

  test('uses custom daysToKeep', async () => {
    // 10 days ago — old enough for 7-day cutoff but not 90-day
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    await insertLog(tenDaysAgo);

    const result = await clearOldAlarmLogs(7);

    expect(result.deleted).toBe(1);
    expect(await countLogs()).toBe(0);
  });
});
