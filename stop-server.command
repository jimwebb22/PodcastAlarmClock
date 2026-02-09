#!/bin/bash

# Podcast Alarm Clock - Server Shutdown Script
# Run this to stop the server (works with PM2)

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Podcast Alarm Clock - Stopping...   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 not found, using fallback method...${NC}"

    # Check if server is running
    if ! lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${BLUE}ℹ️  Server is not currently running${NC}"
        echo ""
        read -p "Press Enter to exit..."
        exit 0
    fi

    # Stop the server
    echo "Stopping server on port 3001..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null

    # Verify it stopped
    sleep 1
    if ! lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${GREEN}✓ Server stopped successfully${NC}"
    else
        echo -e "${RED}⚠️  Failed to stop server${NC}"
    fi
else
    # Use PM2 to stop the server
    echo "Checking PM2 status..."

    if pm2 describe podcast-alarm-clock > /dev/null 2>&1; then
        echo "Stopping Podcast Alarm Clock via PM2..."
        pm2 stop podcast-alarm-clock
        echo ""
        echo -e "${GREEN}✓ Server stopped successfully${NC}"
        echo ""
        echo -e "${BLUE}ℹ️  To start again: Run 'start-server.command' or 'npm run pm2:start'${NC}"
        echo -e "${BLUE}ℹ️  To remove completely: Run 'pm2 delete podcast-alarm-clock'${NC}"
    else
        echo -e "${BLUE}ℹ️  PM2 process 'podcast-alarm-clock' not found${NC}"

        # Check if server is running on port
        if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            echo "Found server on port 3001 (not managed by PM2)..."
            echo "Stopping via port kill..."
            lsof -ti:3001 | xargs kill -9 2>/dev/null
            sleep 1
            echo -e "${GREEN}✓ Server stopped${NC}"
        else
            echo -e "${BLUE}ℹ️  No server running on port 3001${NC}"
        fi
    fi
fi

echo ""
read -p "Press Enter to exit..."
