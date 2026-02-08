#!/bin/bash

# Podcast Alarm Clock - Server Startup Script
# Double-click this file or run ./start-server.sh to start the server

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Podcast Alarm Clock - Starting...   ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

# Check if server is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}⚠️  Server is already running on port 3001${NC}"
    echo ""
    echo "Options:"
    echo "  1. Open http://localhost:3001 in your browser"
    echo "  2. Stop the server first with: ./stop-server.sh"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}⚠️  .env file not found${NC}"
    echo ""
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo ""
    echo -e "${BLUE}Please edit .env and add your Spotify credentials, then run this script again.${NC}"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the server
echo -e "${GREEN}✓ Starting server...${NC}"
echo ""
echo -e "${BLUE}Server will start on: ${GREEN}http://localhost:3001${NC}"
echo ""
echo -e "${BLUE}Press ${RED}Ctrl+C${BLUE} to stop the server${NC}"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

# Start server in production mode (will run in foreground so you can see logs)
npm run prod
