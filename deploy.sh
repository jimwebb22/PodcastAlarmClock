#!/bin/bash

# Sonos Alarm Clock Deployment Script
# Builds the React app and restarts the PM2 service

set -e

echo "===== Sonos Alarm Clock Deployment ====="
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Error: PM2 is not installed. Install with: npm install -g pm2"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build React app
echo "Building React app..."
npm run build

# Create logs directory if it doesn't exist
mkdir -p logs

# Restart PM2 service
echo "Restarting PM2 service..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Show status
echo ""
echo "===== Deployment Complete ====="
pm2 status
echo ""
echo "Application is running on http://localhost:3001"
echo "View logs with: pm2 logs sonos-alarm-clock"
