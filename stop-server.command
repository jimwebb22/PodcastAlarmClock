#!/bin/bash

# Podcast Alarm Clock - Server Shutdown Script
# Run this to stop the server

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Podcast Alarm Clock - Stopping...   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

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

echo ""
read -p "Press Enter to exit..."
