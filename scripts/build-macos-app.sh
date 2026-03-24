#!/bin/bash
# Builds PodcastAlarmClock.app using Platypus and deploys runtime files.
#
# What this script does:
#   1. Generates the app icon
#   2. Deploys runtime files to ~/Library/Application Support/PodcastAlarmClock/runtime/
#      (keeps Node source, client/build, node_modules outside ~/Documents/ so macOS TCC
#       never prompts for Documents access at runtime)
#   3. Builds PodcastAlarmClock.app to /Applications/
#
# Re-run after any code changes to redeploy. The .app only needs rebuilding if the
# launcher script changes (Platypus embeds its path but reads the script from disk).
#
# Requires Platypus CLI: brew install --cask platypus
# Then: Platypus app > Settings > Install Command Line Tool
# Or:   sudo ln -s /Applications/Platypus.app/Contents/Resources/platypus_clt /usr/local/bin/platypus

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP="/Applications/PodcastAlarmClock.app"
RUNTIME_DIR="$HOME/Library/Application Support/PodcastAlarmClock/runtime"
LAUNCHER="$PROJECT_DIR/scripts/platypus-launcher.sh"
ICON="$PROJECT_DIR/PodcastAlarmClock.icns"

echo ""
echo -e "${BLUE}Building Podcast Alarm Clock.app...${NC}"
echo ""

# --- Check Platypus CLI is installed ---
PLATYPUS_CLI=""
if command -v platypus &> /dev/null; then
    PLATYPUS_CLI="platypus"
elif [ -f "/Applications/Platypus.app/Contents/Resources/platypus_clt" ]; then
    PLATYPUS_CLI="/Applications/Platypus.app/Contents/Resources/platypus_clt"
else
    echo -e "${RED}Error: Platypus CLI not found.${NC}"
    echo ""
    echo "Install Platypus:"
    echo "  1. brew install --cask platypus"
    echo "  2. Open Platypus.app"
    echo "  3. Menu: Platypus > Settings > Install Command Line Tool"
    echo ""
    echo "Or run this shortcut to use the CLI from the app bundle directly:"
    echo "  sudo ln -s /Applications/Platypus.app/Contents/Resources/platypus_clt /usr/local/bin/platypus"
    exit 1
fi

# --- Step 1: Generate icon ---
echo "  Generating icon..."
bash "$PROJECT_DIR/scripts/build-icon.sh"

# --- Step 2: Deploy runtime files to ~/Library/Application Support/ ---
# This keeps all Node source, client/build, and node_modules out of ~/Documents/
# so macOS TCC never triggers a Documents permission dialog at runtime.
echo "  Deploying runtime files to $RUNTIME_DIR ..."
mkdir -p "$RUNTIME_DIR"
rsync -a --delete \
    --exclude '.git' \
    --exclude '.env' \
    --exclude 'client/src' \
    --exclude 'client/node_modules' \
    --exclude 'client/public' \
    --exclude 'docs' \
    --exclude 'scripts' \
    --exclude '*.md' \
    --exclude 'podcast-alarm.db' \
    --exclude '*.app' \
    --exclude '*.icns' \
    --exclude 'logs/' \
    "$PROJECT_DIR/" "$RUNTIME_DIR/"

# Copy .env (runtime config) — fall back to .env.example if not present
if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$RUNTIME_DIR/.env"
elif [ -f "$PROJECT_DIR/.env.example" ]; then
    cp "$PROJECT_DIR/.env.example" "$RUNTIME_DIR/.env"
fi

echo "  Runtime deployed."

# --- Step 3: Make launcher executable ---
chmod +x "$LAUNCHER"

# --- Step 4: Build with Platypus ---
echo "  Building app with Platypus..."
"$PLATYPUS_CLI" \
    -a 'Podcast Alarm Clock' \
    -o 'None' \
    -i "$ICON" \
    -I 'com.local.podcast-alarm-clock' \
    -p '/bin/bash' \
    -V '2.0' \
    -N \
    -y \
    "$LAUNCHER" \
    "$APP"

echo ""
echo -e "${GREEN}✓ Runtime deployed: $RUNTIME_DIR${NC}"
echo -e "${GREEN}✓ App built: $APP${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}First launch (Gatekeeper):${NC}"
echo "  Right-click /Applications/PodcastAlarmClock.app → Open → Open"
echo "  (Only required once — macOS flags unsigned apps)"
echo ""
echo -e "${YELLOW}Local Network permission:${NC}"
echo "  On first launch macOS will ask:"
echo "  '\"Podcast Alarm Clock\" wants to find and connect"
echo "  to devices on your local network.' → click Allow"
echo "  (Required for Sonos speaker discovery)"
echo ""
echo -e "${YELLOW}After code changes:${NC}"
echo "  Re-run this script to redeploy: bash scripts/build-macos-app.sh"
echo "  (Quit the app first, then relaunch from /Applications/)"
echo ""
echo -e "${YELLOW}Add to Dock:${NC}"
echo "  Open /Applications/PodcastAlarmClock.app"
echo "  Right-click Dock icon → Options → Keep in Dock"
echo ""
echo -e "${YELLOW}Auto-start on login:${NC}"
echo "  System Settings → General → Login Items"
echo "  → click + → select /Applications/PodcastAlarmClock.app"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
