# Design: Documents Permission Fix & Cleanup

**Date:** 2026-03-24
**Status:** Approved

## Problem

1. **macOS Documents permission dialog** — Every alarm trigger prompts "Podcast Alarm Clock would like to access your documents." The project directory lives inside `~/Documents/`, and the app writes two files there: `podcast-alarm.db` (SQLite) and `logs/server.log` (stdout redirect). macOS TCC gates writes to `~/Documents/` for unsigned Platypus apps and offers no persistent "always allow" option.

2. **Unbounded data growth** — `alarm_logs` table accumulates forever; `logs/server.log` grows without rotation. (Played episodes already clean up after 30 days.)

## Approach: Move Data Files Out of `~/Documents/`

Relocate the database and log to TCC-exempt macOS standard paths. No entitlements, no re-signing, no Platypus rebuild needed.

## New File Locations

| File | Old Path | New Path |
|---|---|---|
| SQLite database | `<project>/podcast-alarm.db` | `~/Library/Application Support/PodcastAlarmClock/podcast-alarm.db` |
| Server log | `<project>/logs/server.log` | `~/Library/Logs/PodcastAlarmClock/server.log` |

`~/Library/Application Support/` is the macOS standard for app data. `~/Library/Logs/` is the standard for app logs. Neither requires Documents permission.

## Changes

### 1. `scripts/platypus-launcher.sh`

- Compute `APP_SUPPORT` = `$HOME/Library/Application Support/PodcastAlarmClock`
- Compute `APP_LOGS` = `$HOME/Library/Logs/PodcastAlarmClock`
- `mkdir -p` both directories before starting the server
- Export `DATABASE_PATH="$APP_SUPPORT/podcast-alarm.db"`
- Redirect server stdout/stderr to `$APP_LOGS/server.log`
- **One-time migration**: if `<project>/podcast-alarm.db` exists and the new path does not, copy it automatically so no data is lost
- **Log rotation**: before starting the server, if `server.log` exceeds 5 MB, rename it to `server.log.1` (overwriting any previous `.1`) and start fresh

### 2. `.env.example`

- Add a comment explaining that the Platypus app overrides `DATABASE_PATH` at launch; the `.env` value (`./podcast-alarm.db`) is only used during terminal development.

### 3. `CLAUDE.md`

- Update the data file paths section to reflect new production locations.
- Document the log rotation behaviour.
- Document the one-time migration behaviour.

## Cleanup Additions

### Alarm logs pruning (`server/services/playlist.js`)

Add a call to a new `clearOldAlarmLogs(daysToKeep)` model function alongside the existing `clearOldPlayedEpisodes(30)` call. Keep 90 days of alarm logs.

### New model function (`server/db/models.js`)

```js
function clearOldAlarmLogs(daysToKeep = 90) {
  // IMPORTANT: triggered_at in alarm_logs is stored as a Unix integer (INTEGER NOT NULL),
  // NOT a datetime string. Use strftime('%s', ...) to compare, not datetime().
  // DELETE FROM alarm_logs WHERE triggered_at < strftime('%s', 'now', '-' || ? || ' days')
}
```

This mirrors the pattern in `clearOldPlayedEpisodes`, but uses `strftime('%s', ...)` instead of `datetime()`
because `played_at` is TEXT (datetime string) while `triggered_at` is INTEGER (Unix seconds).

### Log rotation (`platypus-launcher.sh`)

Ordering in the launcher must be:
1. `mkdir -p "$APP_SUPPORT"` and `mkdir -p "$APP_LOGS"` — always first
2. Log rotation check — after directories exist, before server starts
3. Server `exec`

```bash
# Step 1 already done above (mkdir -p)
# Step 2: rotate log if > 5 MB (stat -f%z is macOS/BSD syntax — macOS-only project)
LOG="$APP_LOGS/server.log"
if [ -f "$LOG" ] && [ "$(stat -f%z "$LOG")" -gt 5242880 ]; then
  mv "$LOG" "$LOG.1"
fi
```

### `npm install` redirect

The existing `npm install` redirect in `platypus-launcher.sh` (line 33) must also be updated from
`"$PROJECT_DIR/logs/server.log"` to `"$APP_LOGS/server.log"` so all output goes to a single log file.

## Migration Safety

- Old `podcast-alarm.db` in project dir is **copied** (not moved) on first launch so it remains as a backup.
- If the copy fails, the launcher **must log a visible warning** to `$APP_LOGS/server.log` before starting the server, so the failure is diagnosable. The server will start with a fresh (empty) database, meaning the alarm is disabled by default and all speaker/podcast/schedule configuration is lost and must be re-entered.
- After confirming the new DB is working correctly, the old project-dir file can be manually deleted.

**`CLAUDE.md` log path update:** The existing `tail -f logs/server.log` command documented in CLAUDE.md must be updated to `tail -f ~/Library/Logs/PodcastAlarmClock/server.log`.

## Out of Scope

- Code signing or notarisation of the Platypus app
- Rebuilding `PodcastAlarmClock.app` (not required for this fix)
- Changing development workflow (`.env` `DATABASE_PATH` remains `./podcast-alarm.db` for local dev)
