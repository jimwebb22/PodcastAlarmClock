#!/bin/bash
# Podcast Alarm Clock - Platypus App Launcher
# Runs inside the Platypus .app bundle — no window, Dock icon only.
# Server logs go to ~/Library/Logs/PodcastAlarmClock/server.log
# Database lives in ~/Library/Application Support/PodcastAlarmClock/podcast-alarm.db
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
exec node server/index.js \
    >> "$LOG" 2>&1
