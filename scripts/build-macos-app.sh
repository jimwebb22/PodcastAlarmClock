#!/bin/bash
# Builds PodcastAlarmClock.app in the project root.
# Run this once to create the app, then drag it to your Dock.
# Re-run if the project is moved to a new location.

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP="$PROJECT_DIR/PodcastAlarmClock.app"
START_SCRIPT="$PROJECT_DIR/start-server.command"

echo ""
echo -e "${BLUE}Building Podcast Alarm Clock.app...${NC}"
echo ""

# --- Step 1: Generate icon ---
echo "  Generating icon..."
bash "$PROJECT_DIR/scripts/build-icon.sh"

# --- Step 2: Compile AppleScript as a proper .app bundle ---
# osacompile MUST target a .app path to produce a real Mach-O executable.
# Targeting any other path produces a compiled data file that macOS can't run.
echo "  Compiling launcher..."
rm -rf "$APP"
osacompile -o "$APP" << APPLESCRIPT
do shell script "open " & quoted form of "$START_SCRIPT"
APPLESCRIPT

# --- Step 3: Overlay our custom Info.plist ---
# Keep CFBundleExecutable as "applet" and CFBundleIconFile as "applet"
# because that's what osacompile names the binary and default icon.
cat > "$APP/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>applet</string>
    <key>CFBundleIconFile</key>
    <string>applet</string>
    <key>CFBundleIdentifier</key>
    <string>com.local.podcast-alarm-clock</string>
    <key>CFBundleName</key>
    <string>Podcast Alarm Clock</string>
    <key>CFBundleDisplayName</key>
    <string>Podcast Alarm Clock</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleVersion</key>
    <string>2.0</string>
    <key>CFBundleShortVersionString</key>
    <string>2.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
PLIST

# --- Step 4: Replace default icon with our alarm clock icon ---
# The default icon is applet.icns; replace it in-place.
cp "$PROJECT_DIR/PodcastAlarmClock.icns" "$APP/Contents/Resources/applet.icns"

echo ""
echo -e "${GREEN}✓ Built: $APP${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}First launch (Gatekeeper):${NC}"
echo "  Right-click PodcastAlarmClock.app → Open → Open"
echo "  (Only required once — macOS flags unsigned apps)"
echo ""
echo -e "${YELLOW}Add to Dock:${NC}"
echo "  After first launch, right-click the Dock icon"
echo "  → Options → Keep in Dock"
echo ""
echo -e "${YELLOW}Auto-start on login:${NC}"
echo "  System Settings → General → Login Items"
echo "  → click + → select PodcastAlarmClock.app"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
