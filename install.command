#!/bin/bash

# Podcast Alarm Clock - Installation Script
# Double-click this file to set up the application

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                    ║${NC}"
echo -e "${BLUE}║     ${BOLD}Podcast Alarm Clock - Installation${NC}${BLUE}      ║${NC}"
echo -e "${BLUE}║                                                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}This installer will set up everything you need to run${NC}"
echo -e "${BLUE}the Podcast Alarm Clock on your Mac.${NC}"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

# Step 1: Check for Node.js
echo -e "${BOLD}Step 1/7: Checking for Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo ""
    echo -e "${YELLOW}Node.js is required to run this application.${NC}"
    echo ""

    # Check if Homebrew is available
    if command -v brew &> /dev/null; then
        echo -e "${BLUE}Good news! Homebrew is installed on your Mac.${NC}"
        echo -e "${BLUE}I can automatically install Node.js for you.${NC}"
        echo ""
        read -p "Install Node.js now? (y/n): " -n 1 -r
        echo ""

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo -e "${BLUE}Installing Node.js via Homebrew...${NC}"
            echo -e "${YELLOW}This may take a few minutes...${NC}"
            echo ""

            if brew install node; then
                echo ""
                echo -e "${GREEN}✓ Node.js installed successfully!${NC}"
                NODE_VERSION=$(node -v)
                echo -e "${GREEN}  Version: ${NODE_VERSION}${NC}"
                echo ""
                echo -e "${BLUE}Continuing with installation...${NC}"
                sleep 2
            else
                echo ""
                echo -e "${RED}✗ Failed to install Node.js via Homebrew${NC}"
                echo ""
                echo -e "${YELLOW}Please install Node.js manually:${NC}"
                echo "  1. Visit: https://nodejs.org/"
                echo "  2. Download and install the LTS version"
                echo "  3. Run this installer again"
                echo ""
                read -p "Press Enter to exit..."
                exit 1
            fi
        else
            echo ""
            echo -e "${YELLOW}Installation cancelled.${NC}"
            echo ""
            echo -e "${BLUE}To continue, please install Node.js:${NC}"
            echo "  1. Visit: https://nodejs.org/"
            echo "  2. Download and install the LTS version"
            echo "  3. Run this installer again"
            echo ""
            read -p "Press Enter to exit..."
            exit 1
        fi
    else
        # Homebrew not available - offer to download installer
        echo -e "${BLUE}I can download the Node.js installer for you.${NC}"
        echo ""
        read -p "Download Node.js installer now? (y/n): " -n 1 -r
        echo ""

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo -e "${BLUE}Downloading Node.js installer...${NC}"

            # Detect Mac architecture
            ARCH=$(uname -m)
            if [[ "$ARCH" == "arm64" ]]; then
                # Apple Silicon (M1/M2/M3)
                NODE_URL="https://nodejs.org/dist/v20.11.0/node-v20.11.0.pkg"
                echo -e "${BLUE}Detected Apple Silicon Mac${NC}"
            else
                # Intel Mac
                NODE_URL="https://nodejs.org/dist/v20.11.0/node-v20.11.0.pkg"
                echo -e "${BLUE}Detected Intel Mac${NC}"
            fi

            # Download to Downloads folder
            DOWNLOADS_DIR="$HOME/Downloads"
            NODE_PKG="$DOWNLOADS_DIR/node-installer.pkg"

            if curl -L "$NODE_URL" -o "$NODE_PKG" 2>/dev/null; then
                echo ""
                echo -e "${GREEN}✓ Downloaded Node.js installer${NC}"
                echo ""
                echo -e "${BLUE}Opening installer...${NC}"
                echo -e "${YELLOW}Please complete the Node.js installation, then run this script again.${NC}"
                echo ""

                # Open the installer
                open "$NODE_PKG"

                echo ""
                read -p "Press Enter to exit..."
                exit 0
            else
                echo ""
                echo -e "${RED}✗ Failed to download installer${NC}"
                echo ""
                echo -e "${YELLOW}Please install Node.js manually:${NC}"
                echo "  1. Visit: https://nodejs.org/"
                echo "  2. Download the LTS version"
                echo "  3. Run the installer"
                echo "  4. Run this installation script again"
                echo ""
                read -p "Press Enter to exit..."
                exit 1
            fi
        else
            echo ""
            echo -e "${YELLOW}Installation cancelled.${NC}"
            echo ""
            echo -e "${BLUE}To continue, please install Node.js:${NC}"
            echo "  1. Visit: https://nodejs.org/"
            echo "  2. Download the LTS version"
            echo "  3. Run the installer"
            echo "  4. Run this installer again"
            echo ""
            read -p "Press Enter to exit..."
            exit 1
        fi
    fi
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js is installed (${NODE_VERSION})${NC}"
fi
echo ""

# Step 2: Check for npm
echo -e "${BOLD}Step 2/7: Checking for npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    echo ""
    echo "npm should be installed with Node.js. Please reinstall Node.js."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm is installed (v${NPM_VERSION})${NC}"
fi
echo ""

# Step 3: Install dependencies
echo -e "${BOLD}Step 3/7: Installing server dependencies...${NC}"
echo -e "${BLUE}This may take a few minutes...${NC}"
npm install --silent
echo -e "${GREEN}✓ Server dependencies installed${NC}"
echo ""

echo -e "${BLUE}Installing client dependencies...${NC}"
cd client
npm install --silent
cd ..
echo -e "${GREEN}✓ Client dependencies installed${NC}"
echo ""

# Step 4: Create .env file
echo -e "${BOLD}Step 4/7: Setting up environment configuration...${NC}"
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists - skipping${NC}"
else
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
fi
echo ""

# Step 5: Install PM2
echo -e "${BOLD}Step 5/7: Installing PM2 process manager...${NC}"
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 -v)
    echo -e "${GREEN}✓ PM2 is already installed (v${PM2_VERSION})${NC}"
else
    echo -e "${BLUE}Installing PM2 globally (requires administrator password)...${NC}"
    echo ""

    if sudo npm install -g pm2; then
        echo ""
        echo -e "${GREEN}✓ PM2 installed successfully${NC}"
    else
        echo ""
        echo -e "${RED}✗ Failed to install PM2${NC}"
        echo -e "${YELLOW}⚠️  You can still use the app, but the server will run in foreground mode${NC}"
        echo -e "${YELLOW}   To install PM2 later, run: sudo npm install -g pm2${NC}"
    fi
fi
echo ""

# Step 6: Build React client
echo -e "${BOLD}Step 6/7: Building React application...${NC}"
echo -e "${BLUE}This may take a few minutes...${NC}"
cd client
npm run build --silent
cd ..
echo -e "${GREEN}✓ React application built${NC}"
echo ""

# Step 7: Make command files executable
echo -e "${BOLD}Step 7/7: Authorizing command files...${NC}"
chmod +x start-server.command
chmod +x stop-server.command
chmod +x deploy.command
chmod +x install.command
echo -e "${GREEN}✓ Command files authorized${NC}"
echo ""

# Installation complete
echo "═══════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}${BOLD}✓ Installation Complete!${NC}"
echo ""
echo -e "${BLUE}${BOLD}Next Steps:${NC}"
echo ""
echo -e "  1. ${BOLD}Start the server:${NC}"
echo -e "     ${GREEN}Double-click 'start-server.command'${NC}"
echo ""
echo -e "  2. ${BOLD}Open the app:${NC}"
echo -e "     ${GREEN}Open http://localhost:3001 in your web browser${NC}"
echo ""
echo -e "  3. ${BOLD}Configure your alarm:${NC}"
echo "     • Add podcast RSS feeds"
echo "     • Select Sonos speakers"
echo "     • Set alarm time and days"
echo ""
echo -e "  4. ${BOLD}Stop the server:${NC}"
echo -e "     ${GREEN}Double-click 'stop-server.command'${NC}"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}${BOLD}Helpful Tips:${NC}"
echo ""
echo "  • The server runs in the background with PM2"
echo "  • You can close this window after starting the server"
echo "  • Logs are stored in the 'logs' folder"
echo "  • Need help? Check README.md for documentation"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
read -p "Press Enter to exit..."
