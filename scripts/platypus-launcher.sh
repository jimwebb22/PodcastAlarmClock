#!/bin/bash
# Podcast Alarm Clock - Platypus App Launcher
# Runs inside the Platypus .app bundle — no window, Dock icon only.
# Server logs go to ~/Library/Logs/PodcastAlarmClock/server.log
# Database lives in ~/Library/Application Support/PodcastAlarmClock/podcast-alarm.db
# Runtime source files live in ~/Library/Application Support/PodcastAlarmClock/runtime/
#   (deployed there by scripts/build-macos-app.sh — nothing runs from ~/Documents/ at runtime)
#
# To redeploy after code changes: bash scripts/build-macos-app.sh
# To start manually via Terminal: use start-server.command instead.

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"

# Runtime source files — deployed by build-macos-app.sh, outside ~/Documents/ so TCC never prompts
PROJECT_DIR="$HOME/Library/Application Support/PodcastAlarmClock/runtime"

# Data and log locations (already established in previous session)
APP_SUPPORT="$HOME/Library/Application Support/PodcastAlarmClock"
APP_LOGS="$HOME/Library/Logs/PodcastAlarmClock"

# Step 1: Ensure directories exist (must come before log rotation)
mkdir -p "$APP_SUPPORT"
mkdir -p "$APP_LOGS"

# Step 2: Rotate log if > 5 MB (stat -f%z is macOS/BSD only — this is a macOS-only project)
LOG="$APP_LOGS/server.log"
if [ -f "$LOG" ] && [ "$(stat -f%z "$LOG")" -gt 5242880 ]; then
  mv "$LOG" "$LOG.1"
fi

# Step 3: Export DATABASE_PATH so Node picks up the correct location
export DATABASE_PATH="$APP_SUPPORT/podcast-alarm.db"

cd "$PROJECT_DIR" || {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: Runtime directory not found at $PROJECT_DIR — run scripts/build-macos-app.sh to deploy." >> "$LOG"
  exit 1
}

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

export NODE_ENV=production
exec node server/index.js \
    >> "$LOG" 2>&1
