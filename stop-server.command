#!/bin/bash

# Podcast Alarm Clock - Server Shutdown Script
# Double-click this file to stop the server.

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Podcast Alarm Clock - Stopping...   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

STOPPED=0

# Stop PM2 process if present (cleanup any leftover background instances)
if command -v pm2 &> /dev/null; then
    if pm2 describe podcast-alarm-clock > /dev/null 2>&1; then
        echo "Stopping PM2 process..."
        pm2 stop podcast-alarm-clock > /dev/null 2>&1
        pm2 delete podcast-alarm-clock > /dev/null 2>&1
        STOPPED=1
    fi
fi

# Kill any foreground node process on port 3001
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "Stopping server on port 3001..."
    lsof -ti:3001 | xargs kill 2>/dev/null
    sleep 1
    if ! lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        STOPPED=1
    else
        # Force kill if graceful stop didn't work
        lsof -ti:3001 | xargs kill -9 2>/dev/null
        sleep 1
        STOPPED=1
    fi
fi

if [ $STOPPED -eq 1 ]; then
    echo -e "${GREEN}✓ Server stopped successfully${NC}"
else
    echo -e "${BLUE}ℹ️  No server was running${NC}"
fi

echo ""
read -p "Press Enter to exit..."
