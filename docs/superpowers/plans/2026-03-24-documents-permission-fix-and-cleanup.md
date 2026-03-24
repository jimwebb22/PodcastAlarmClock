# Documents Permission Fix & Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the macOS "would like to access your documents" permission dialog by moving the database and log file out of `~/Documents/`, and add cleanup for unbounded `alarm_logs` growth.

**Architecture:** The Platypus launcher script sets `DATABASE_PATH` as an environment variable before spawning Node, so the Node server picks up the new path transparently. No Node code changes are needed for the path move. The `clearOldAlarmLogs` model function is added alongside the existing `clearOldPlayedEpisodes` call in `playlist.js`.

**Tech Stack:** Node.js, SQLite (sqlite3), Jest (tests), bash (launcher script)

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `scripts/platypus-launcher.sh` | Add APP_SUPPORT/APP_LOGS dirs, migration, log rotation, updated DATABASE_PATH export, updated log redirects |
| Modify | `server/db/models.js` | Add `clearOldAlarmLogs(daysToKeep)` function |
| Modify | `server/services/playlist.js` | Call `clearOldAlarmLogs(90)` at alarm time |
| Create | `server/db/models.test.js` | Tests for `clearOldAlarmLogs` |
| Modify | `.env.example` | Add clarifying comment on DATABASE_PATH |
| Modify | `CLAUDE.md` | Update log path references |

---

## Task 1: Add `clearOldAlarmLogs` to models with test

**Files:**
- Modify: `server/db/models.js`
- Create: `server/db/models.test.js`

### Context

`alarm_logs` schema (from `server/db/schema.sql`):
```sql
CREATE TABLE IF NOT EXISTS alarm_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  triggered_at INTEGER NOT NULL,   -- stored as ISO string e.g. "2026-03-24T10:30:00.000Z"
  success INTEGER NOT NULL,
  error_message TEXT,
  episodes_played TEXT
);
```

Despite the column being declared `INTEGER`, `addAlarmLog` in `server/services/scheduler.js` passes
`new Date().toISOString()` (a string like `"2026-03-24T10:30:00.000Z"`). SQLite stores it as text.
Use `datetime(triggered_at)` to normalize the ISO string before comparison.

- [ ] **Step 1: Create the test file**

Create `server/db/models.test.js`:

```js
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();

// Point DATABASE_PATH to a temp file so tests don't touch the real DB
const TEST_DB = path.join(os.tmpdir(), `test-alarm-${Date.now()}.db`);
process.env.DATABASE_PATH = TEST_DB;

// Re-require after setting env so DB_PATH picks up the override
const { getDatabase } = require('./database');
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "/Users/jimwebb/Documents/Science Projects/Podcast Alarm Clock"
npx jest server/db/models.test.js --no-coverage 2>&1
```

Expected: FAIL — `clearOldAlarmLogs is not a function` (or similar — function doesn't exist yet).

- [ ] **Step 3: Add `clearOldAlarmLogs` to `server/db/models.js`**

Add this function after the existing `clearOldPlayedEpisodes` function (around line 342 in models.js),
and add it to the `module.exports` at the bottom:

```js
function clearOldAlarmLogs(daysToKeep = 90) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    // Note: schema declares triggered_at as INTEGER but addAlarmLog inserts
    // new Date().toISOString() — so SQLite stores an ISO 8601 string like
    // "2026-03-24T10:30:00.000Z" (SQLite doesn't coerce types).
    // datetime(triggered_at) parses the ISO string and normalises the 'T'/'Z'
    // so comparison against datetime('now', '-N days') works correctly.
    const sql = `
      DELETE FROM alarm_logs
      WHERE datetime(triggered_at) < datetime('now', '-' || ? || ' days')
    `;

    db.run(sql, [daysToKeep], function(err) {
      db.close();
      if (err) {
        reject(err);
        return;
      }
      resolve({ deleted: this.changes });
    });
  });
}
```

Add `clearOldAlarmLogs` to the `module.exports` object at the bottom of the file.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/Users/jimwebb/Documents/Science Projects/Podcast Alarm Clock"
npx jest server/db/models.test.js --no-coverage 2>&1
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
cd "/Users/jimwebb/Documents/Science Projects/Podcast Alarm Clock"
git add server/db/models.js server/db/models.test.js
git commit -m "feat: add clearOldAlarmLogs model function with tests"
```

---

## Task 2: Wire `clearOldAlarmLogs` into playlist.js

**Files:**
- Modify: `server/services/playlist.js`

### Context

`buildPlaylistQueue()` in `playlist.js` already calls `clearOldPlayedEpisodes(30)` near the top
(lines 14-19). Add `clearOldAlarmLogs(90)` immediately after it, following the same
try/catch-and-warn pattern so a failure doesn't block the alarm.

- [ ] **Step 1: Update `server/services/playlist.js`**

In `buildPlaylistQueue()`, update the import and add the cleanup call:

At the top of the file, update the require line to also import `clearOldAlarmLogs`:
```js
const { getAlarmConfig, clearOldPlayedEpisodes, clearOldAlarmLogs } = require('../db/models');
```

After the existing `clearOldPlayedEpisodes` block (after line ~19), add:
```js
    // Clean up old alarm log records (older than 90 days)
    try {
      const cleanedLogs = await clearOldAlarmLogs(90);
      if (cleanedLogs.deleted > 0) {
        console.log(`Cleaned up ${cleanedLogs.deleted} old alarm log records`);
      }
    } catch (cleanupErr) {
      console.warn('Failed to clean up old alarm logs:', cleanupErr.message);
    }
```

- [ ] **Step 2: Run the existing server tests to verify nothing broke**

```bash
cd "/Users/jimwebb/Documents/Science Projects/Podcast Alarm Clock"
npx jest server/ --no-coverage 2>&1
```

Expected: existing tests still pass. (The stale `playlist.test.js` and `sonos.test.js` may fail
due to v1.0 Spotify mocks — that is pre-existing and acceptable; watch for NEW failures only.)

- [ ] **Step 3: Commit**

```bash
cd "/Users/jimwebb/Documents/Science Projects/Podcast Alarm Clock"
git add server/services/playlist.js
git commit -m "feat: run alarm_logs cleanup (90 days) at each alarm fire"
```

---

## Task 3: Update `platypus-launcher.sh`

**Files:**
- Modify: `scripts/platypus-launcher.sh`

### Context

This is a bash script run by the Platypus app bundle on launch. It `exec`s Node as the final step.
Environment variables set with `export` before `exec` are inherited by Node.

The full updated script:

```bash
#!/bin/bash
# Podcast Alarm Clock - Platypus App Launcher
# Runs inside the Platypus .app bundle — no window, Dock icon only.
# Server logs go to ~/Library/Logs/PodcastAlarmClock/server.log
#
# To rebuild the .app: bash scripts/build-macos-app.sh
# To start manually via Terminal: use start-server.command instead.

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"

PROJECT_DIR="/Users/jimwebb/Documents/Science Projects/Podcast Alarm Clock"

# Standard macOS locations — outside ~/Documents so TCC doesn't prompt
APP_SUPPORT="$HOME/Library/Application Support/PodcastAlarmClock"
APP_LOGS="$HOME/Library/Logs/PodcastAlarmClock"

# Step 1: Ensure directories exist (must come before log rotation or migration)
mkdir -p "$APP_SUPPORT"
mkdir -p "$APP_LOGS"

# Step 2: Rotate log if > 5 MB (stat -f%z is macOS/BSD only — this is a macOS-only project)
LOG="$APP_LOGS/server.log"
if [ -f "$LOG" ] && [ "$(stat -f%z "$LOG")" -gt 5242880 ]; then
  mv "$LOG" "$LOG.1"
fi

# Step 3: One-time migration — copy DB from old project-dir location to new App Support location
OLD_DB="$PROJECT_DIR/podcast-alarm.db"
NEW_DB="$APP_SUPPORT/podcast-alarm.db"
if [ -f "$OLD_DB" ] && [ ! -f "$NEW_DB" ]; then
  if cp "$OLD_DB" "$NEW_DB"; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] INFO: Migrated database from $OLD_DB to $NEW_DB" >> "$LOG"
  else
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARNING: Failed to migrate database from $OLD_DB to $NEW_DB — starting with a fresh database. All configuration (alarm schedule, speakers, podcast feeds) must be re-entered." >> "$LOG"
  fi
fi

# Step 4: Export DATABASE_PATH so Node picks up the new location
export DATABASE_PATH="$NEW_DB"

cd "$PROJECT_DIR" || exit 1

# Stop any PM2 instance to avoid port conflict
if command -v pm2 &> /dev/null; then
    if pm2 describe podcast-alarm-clock > /dev/null 2>&1; then
        pm2 stop podcast-alarm-clock > /dev/null 2>&1
        pm2 delete podcast-alarm-clock > /dev/null 2>&1
    fi
fi

# If already running, exit silently
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    exit 0
fi

# Ensure .env exists
[ ! -f ".env" ] && cp .env.example .env 2>/dev/null

# Ensure dependencies are installed (log goes to new APP_LOGS location)
[ ! -d "node_modules" ] && npm install >> "$LOG" 2>&1

export NODE_ENV=production
exec /usr/local/bin/node server/index.js \
    >> "$LOG" 2>&1
```

- [ ] **Step 1: Replace the full content of `scripts/platypus-launcher.sh`** with the script above.

- [ ] **Step 2: Verify the script is syntactically valid**

```bash
bash -n "/Users/jimwebb/Documents/Science Projects/Podcast Alarm Clock/scripts/platypus-launcher.sh"
```

Expected: no output (no syntax errors).

- [ ] **Step 3: Smoke-test the new paths manually**

```bash
# Simulate what the launcher does (dry run — don't start the server)
APP_SUPPORT="$HOME/Library/Application Support/PodcastAlarmClock"
APP_LOGS="$HOME/Library/Logs/PodcastAlarmClock"
mkdir -p "$APP_SUPPORT" "$APP_LOGS"
echo "APP_SUPPORT: $APP_SUPPORT"
ls -la "$APP_SUPPORT"
echo "APP_LOGS: $APP_LOGS"
ls -la "$APP_LOGS"
```

Expected: both directories exist and are empty (or contain `podcast-alarm.db` if already migrated).

- [ ] **Step 4: Commit**

```bash
cd "/Users/jimwebb/Documents/Science Projects/Podcast Alarm Clock"
git add scripts/platypus-launcher.sh
git commit -m "fix: move DB and logs out of ~/Documents to fix macOS TCC permission dialog"
```

---

## Task 4: Update `.env.example` and `CLAUDE.md`

**Files:**
- Modify: `.env.example`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update `.env.example`**

Replace the `DATABASE_PATH` line with:

```bash
# Database path (used during local development via `npm run dev` or `npm start`)
# When running via PodcastAlarmClock.app, the launcher overrides this to:
#   ~/Library/Application Support/PodcastAlarmClock/podcast-alarm.db
DATABASE_PATH=./podcast-alarm.db
```

- [ ] **Step 2: Update `CLAUDE.md` log path**

Find the line in CLAUDE.md that says:
```
tail -f logs/server.log
```

Replace it (there may be multiple occurrences) with:
```
tail -f ~/Library/Logs/PodcastAlarmClock/server.log
```

Note: CLAUDE.md also contains `tail -f logs/combined.log` and `tail -f logs/error.log` under
the Testing section — those are PM2 log paths, unrelated to the Platypus launcher. Leave them
unchanged.

Also update the macOS App Wrapper section to reflect new data paths. Find the existing line:
```
- Logs when using app: `tail -f logs/server.log`
```

Replace with:
```
- Logs when using app: `tail -f ~/Library/Logs/PodcastAlarmClock/server.log`
- Database when using app: `~/Library/Application Support/PodcastAlarmClock/podcast-alarm.db`
- Old DB location (backup, safe to delete after confirming app works): `<project>/podcast-alarm.db`
```

Also update any documentation of the one-time migration behaviour. Add in the Maintenance section:

```markdown
### Log Path (Platypus App)

When running via `PodcastAlarmClock.app`:
- **Logs:** `~/Library/Logs/PodcastAlarmClock/server.log` — rotated at 5 MB (previous kept as `.log.1`)
- **Database:** `~/Library/Application Support/PodcastAlarmClock/podcast-alarm.db`
- **Migration:** On first launch after this update, the old `<project>/podcast-alarm.db` is copied
  to the new location automatically. The old file is kept as a backup.

When running via Terminal (`npm start` or `start-server.command`):
- **Logs:** stdout (terminal output)
- **Database:** `./podcast-alarm.db` (relative to project dir, from `.env`)
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/jimwebb/Documents/Science Projects/Podcast Alarm Clock"
git add .env.example CLAUDE.md
git commit -m "docs: update log/DB paths after TCC permission fix"
```

---

## Task 5: End-to-end verification

No automated tests cover the launcher (it's a shell script). Verify manually:

- [ ] **Step 1: Confirm new directories don't already exist from a failed previous run**

```bash
ls -la "$HOME/Library/Application Support/PodcastAlarmClock/" 2>/dev/null || echo "does not exist yet"
ls -la "$HOME/Library/Logs/PodcastAlarmClock/" 2>/dev/null || echo "does not exist yet"
```

- [ ] **Step 2: Launch the app**

Double-click `PodcastAlarmClock.app` from Finder (or Dock if pinned).

- [ ] **Step 3: Verify new directories and files were created**

```bash
ls -la "$HOME/Library/Application Support/PodcastAlarmClock/"
# Expected: podcast-alarm.db present (migrated from project dir)

ls -la "$HOME/Library/Logs/PodcastAlarmClock/"
# Expected: server.log present

tail -20 "$HOME/Library/Logs/PodcastAlarmClock/server.log"
# Expected: server startup messages, scheduler init, no errors
```

- [ ] **Step 4: Check for migration log message**

```bash
grep -i "migrat" "$HOME/Library/Logs/PodcastAlarmClock/server.log"
```

Expected: `INFO: Migrated database from .../podcast-alarm.db to .../Application Support/...`

- [ ] **Step 5: Verify the web UI is functional**

Open `http://localhost:3001` in a browser. Verify:
- Alarm configuration loads (time, weekdays, volume)
- Podcast feeds list loads
- Speaker selection loads

If any section is blank, it may mean the migration didn't copy the DB. Check the log for a WARNING line.

- [ ] **Step 6: Trigger a test alarm**

In the UI, click "Test Alarm Now". Verify playback starts on the Sonos speaker. No Documents permission dialog should appear.

- [ ] **Step 7: Quit and re-launch the app**

Quit via Cmd+Q (or right-click Dock icon → Quit). Re-launch. The log should NOT contain a second migration message — migration is one-time only.

- [ ] **Step 8: Final commit if any fixups were needed**

If Steps 1–7 all pass cleanly, no additional commit is needed — the plan is complete.
If any code was adjusted to fix an unexpected issue during verification:

```bash
cd "/Users/jimwebb/Documents/Science Projects/Podcast Alarm Clock"
git add -p   # stage only relevant changes
git commit -m "fix: <describe any fixup>"
```
