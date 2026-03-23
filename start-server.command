#!/bin/bash

# Podcast Alarm Clock - Server Startup Script
# Double-click this file to start the server.
#
# IMPORTANT: Keep this window open (minimizing is fine).
# macOS requires the server to run through Terminal to access Sonos speakers
# on the local network. Closing this window will stop the server.

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project directory
cd "$(dirname "$0")"

# Set terminal window title so the window is clearly identifiable
echo -ne "\033]0;Podcast Alarm Clock\007"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Podcast Alarm Clock - Starting...   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Stop any PM2-managed instance first to avoid port conflict
if command -v pm2 &> /dev/null; then
    if pm2 describe podcast-alarm-clock > /dev/null 2>&1; then
        echo -e "${BLUE}ℹ️  Stopping background PM2 instance...${NC}"
        pm2 stop podcast-alarm-clock > /dev/null 2>&1
        pm2 delete podcast-alarm-clock > /dev/null 2>&1
        echo ""
    fi
fi

# Check if already running on port 3001
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}⚠️  Server is already running on port 3001${NC}"
    echo ""
    echo "  Open: http://localhost:3001"
    echo "  To stop: double-click stop-server.command"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env from template..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env created${NC}"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Warn on close
trap 'echo ""; echo -e "${RED}Server stopped. Alarm will not trigger while server is off.${NC}"; sleep 3' EXIT

echo -e "${GREEN}✓ Server starting...${NC}"
echo ""
echo -e "${BLUE}  Open in browser: ${GREEN}http://localhost:3001${NC}"
echo ""
echo -e "${YELLOW}  This window will minimize automatically.${NC}"
echo -e "${YELLOW}  Click it in the Dock to expand. Don't close it.${NC}"
echo ""
echo "  To stop: double-click stop-server.command"
echo ""
echo "════════════════════════════════════════════════════"
echo ""

# Minimize this Terminal window to the Dock after a short delay.
# Running osascript from within Terminal lets it control its own window
# without requiring Automation permission from an external app.
(sleep 2 && osascript -e 'tell application "Terminal" to set miniaturized of front window to true') &

NODE_ENV=production node server/index.js
