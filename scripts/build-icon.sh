#!/bin/bash
# Generates PodcastAlarmClock.icns from logo512.png using built-in macOS tools.
# Output: <project-root>/PodcastAlarmClock.icns

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_PNG="$PROJECT_DIR/client/public/logo512.png"
ICONSET="$PROJECT_DIR/PodcastAlarmClock.iconset"
OUTPUT="$PROJECT_DIR/PodcastAlarmClock.icns"

if [ ! -f "$SOURCE_PNG" ]; then
    echo "Error: $SOURCE_PNG not found" >&2
    exit 1
fi

rm -rf "$ICONSET"
mkdir "$ICONSET"

sips -z 16 16     "$SOURCE_PNG" --out "$ICONSET/icon_16x16.png"       > /dev/null
sips -z 32 32     "$SOURCE_PNG" --out "$ICONSET/icon_16x16@2x.png"    > /dev/null
sips -z 32 32     "$SOURCE_PNG" --out "$ICONSET/icon_32x32.png"       > /dev/null
sips -z 64 64     "$SOURCE_PNG" --out "$ICONSET/icon_32x32@2x.png"    > /dev/null
sips -z 128 128   "$SOURCE_PNG" --out "$ICONSET/icon_128x128.png"     > /dev/null
sips -z 256 256   "$SOURCE_PNG" --out "$ICONSET/icon_128x128@2x.png"  > /dev/null
sips -z 256 256   "$SOURCE_PNG" --out "$ICONSET/icon_256x256.png"     > /dev/null
sips -z 512 512   "$SOURCE_PNG" --out "$ICONSET/icon_256x256@2x.png"  > /dev/null
sips -z 512 512   "$SOURCE_PNG" --out "$ICONSET/icon_512x512.png"     > /dev/null

iconutil -c icns "$ICONSET" -o "$OUTPUT"
rm -rf "$ICONSET"

echo "Icon created: $OUTPUT"
