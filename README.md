# Podcast Alarm Clock

A local alarm clock system that plays podcasts from RSS feeds through Sonos speakers.

## Features

- Wake up to the newest episodes from your favorite podcasts
- Works with any podcast that has a public RSS feed
- No external service accounts or API keys required
- Configure alarm time, weekdays, and volume
- Support for multiple Sonos speakers with grouping
- Mobile-responsive web interface

## Easy Installation (Recommended)

**For non-technical users or first-time setup:**

1. **Run the installer**:
   - Double-click `install.command` in the project folder
   - If Node.js is missing, the installer will automatically install it for you
   - Enter your Mac password when prompted
   - Wait 2-5 minutes for installation to complete

2. **Build and deploy the macOS app** (one-time setup):
   - Run `bash scripts/build-macos-app.sh` in Terminal
   - This deploys runtime files to `~/Library/` and installs `PodcastAlarmClock.app` in `/Applications/`

3. **Launch the server**:
   - Right-click `/Applications/PodcastAlarmClock.app` → **Open** → **Open** (first time only)
   - Allow Local Network access when macOS prompts (required for Sonos)
   - The alarm clock icon appears in your Dock — the server is running
   - Open http://localhost:3001 in your browser

4. **Configure your alarm** (see Usage section below)

**That's it!** Once set up, just click the Dock icon to start the server.

📖 **New to this?** See [QUICKSTART.md](QUICKSTART.md) for detailed step-by-step instructions.

## Manual Installation (For Developers)

If you prefer to use the command line:

### Prerequisites

- Node.js 16+
- Sonos speakers on local network
- Platypus (for building the macOS app): `brew install --cask platypus`

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment template:
   ```bash
   cp .env.example .env
   ```

3. Build the React client:
   ```bash
   npm run build
   ```

4. Build and deploy the macOS app:
   ```bash
   # Deploys runtime files to ~/Library/ and builds app to /Applications/
   # (requires Platypus — see Prerequisites)
   bash scripts/build-macos-app.sh

   # Then right-click /Applications/PodcastAlarmClock.app → Open → Open
   # Or for a plain terminal session (dev only):
   npm start
   ```

5. Open http://localhost:3001 in your browser

## Usage

### Initial Configuration

1. Open the web UI (http://localhost:3001)
2. Click "Discover Speakers" to find your Sonos speakers
3. Select which speakers to use for the alarm
4. Add podcast RSS feeds (paste the feed URL)
5. Configure alarm time and select weekdays
6. Set desired volume level
7. Toggle alarm ON

### Adding Podcasts

1. Find the podcast's RSS feed URL:
   - Check the podcast's website
   - Search "[podcast name] RSS feed"
   - Use a podcast directory like Listen Notes

2. Paste the RSS feed URL into the "Add Podcast RSS Feed" field
3. Click "Add" - the system validates the feed and extracts the title
4. The podcast appears in your saved list

### Daily Operation

- **Enable/Disable**: Use the master toggle to quickly turn the alarm on/off
- **Test**: Use "Test Alarm Now" to verify configuration
- **Stop**: Use "Stop Playback" button to end alarm playback
- **Monitor**: View alarm status and next scheduled time on dashboard

## Development

Start backend and frontend separately for development:

```bash
# Terminal 1: Backend server (port 3001)
npm run dev

# Terminal 2: React dev server (port 3000)
cd client
npm start
```

Access the development UI at http://localhost:3000

## Production Deployment

### Initial Setup

1. **Build the React frontend:**
   ```bash
   npm run build
   ```

2. **Build and deploy the macOS app** (requires Platypus):
   ```bash
   brew install --cask platypus
   # Open Platypus.app → Settings → Install Command Line Tool
   bash scripts/build-macos-app.sh
   # Deploys runtime to ~/Library/ and installs app to /Applications/
   ```

3. **First launch** — right-click `/Applications/PodcastAlarmClock.app` → **Open** → **Open**, then click **Allow** when macOS asks about Local Network access.

### Server Management

#### Recommended: Use the macOS App

- **Start**: Click `/Applications/PodcastAlarmClock.app` (or Dock icon)
- **Stop**: Right-click Dock icon → **Quit** (or Cmd+Q)
- **Logs**: `tail -f ~/Library/Logs/PodcastAlarmClock/server.log`

The app runs the server directly — no Terminal window required. The alarm clock icon stays in the Dock while the server is running.

> **Important:** Do NOT use PM2 for production. macOS blocks PM2-managed background processes from accessing the local network, which prevents Sonos speaker discovery.

#### Fallback: Terminal Window

If needed, the server can be started in a Terminal window:
- **Start**: Double-click `start-server.command`
- **Stop**: Double-click `stop-server.command`

This requires the Terminal window to remain open (minimizing is fine).

### After Mac Restart

The server does NOT auto-start by default. To enable auto-start on login:

1. System Settings → General → **Login Items**
2. Click **+** and select `/Applications/PodcastAlarmClock.app`

The server will automatically start on every login with no Terminal window.

### Add to Dock (Persistent)

After launching the app once, right-click the Dock icon → **Options** → **Keep in Dock**.

### Rebuild / Redeploy After Code Changes

After editing server code or the React client, redeploy by running:
```bash
bash scripts/build-macos-app.sh
```
This re-syncs the runtime files to `~/Library/Application Support/PodcastAlarmClock/runtime/` and rebuilds the app in `/Applications/`. Quit the app first, then relaunch after the script finishes.

## Project Structure

```
PodcastAlarmClock/
├── server/
│   ├── api/              # Express API routes
│   ├── services/         # RSS parsing, Sonos, scheduler
│   └── db/               # SQLite database
├── client/               # React web app
├── scripts/
│   ├── build-macos-app.sh    # Builds PodcastAlarmClock.app
│   ├── platypus-launcher.sh  # Script run inside the .app
│   └── build-icon.sh         # Generates .icns from logo512.png
├── .env.example          # Environment template
└── package.json
```

## Troubleshooting

### Alarm Not Triggering

- Check the app is running (alarm clock icon in Dock)
- View logs: `tail -f ~/Library/Logs/PodcastAlarmClock/server.log`
- Verify alarm is enabled in UI
- Check that current day is selected
- Verify at least one podcast feed is added

### Sonos Speakers Not Found

- Verify speakers are on same network as server
- Check speaker power and network connectivity
- Click "Discover Speakers" again in UI
- Check firewall isn't blocking SSDP discovery

### Podcast Feed Errors

- Verify the URL is a valid RSS feed (not a webpage)
- Try opening the feed URL directly in a browser
- Some feeds may be geo-restricted
- Check logs for specific error messages: `tail -f ~/Library/Logs/PodcastAlarmClock/server.log`

### Server Not Running After Restart

- The server does NOT auto-start by default after Mac reboots
- Launch `/Applications/PodcastAlarmClock.app` to start it
- To enable auto-start: System Settings → General → Login Items → add `/Applications/PodcastAlarmClock.app`

### Can't Stop Server

- Right-click the Dock icon → **Quit**, or Cmd+Q while the app is focused
- Fallback: Double-click `stop-server.command`

### No Episodes Available / Test Alarm Not Playing

- **All episodes marked as played**: The system tracks played episodes to avoid replaying content
- **Clear played history**: Use the API endpoint to reset:
  ```bash
  curl -X DELETE http://localhost:3001/api/podcasts/played
  ```
- Or clear the database directly:
  ```bash
  sqlite3 ~/Library/Application\ Support/PodcastAlarmClock/podcast-alarm.db "DELETE FROM played_episodes;"
  ```
- After clearing, test the alarm again - it should find fresh episodes
- Check logs to verify: `tail -f ~/Library/Logs/PodcastAlarmClock/server.log`

### Queue Not Advancing to Next Episode

- This was a known issue that has been **fixed** in the latest version
- The system now uses the `x-rincon-queue` protocol to ensure sequential playback
- If you're still experiencing this, make sure you've pulled the latest code and rebuilt:
  ```bash
  git pull origin main
  npm run deploy
  ```

## API Endpoints

### Health Check
- `GET /health` - Health check endpoint (returns status and timestamp)

### Podcasts
- `GET /api/podcasts/feeds` - List saved podcast feeds
- `POST /api/podcasts/feeds` - Add new feed
- `DELETE /api/podcasts/feeds/:id` - Remove feed
- `POST /api/podcasts/feeds/preview` - Preview feed before adding
- `GET /api/podcasts/episodes` - Get latest episodes from all feeds
- `GET /api/podcasts/played` - Get played episodes history
- `DELETE /api/podcasts/played` - Clear played episodes history

### Alarm
- `GET /api/alarm/config` - Get alarm configuration
- `PUT /api/alarm/config` - Update alarm configuration
- `GET /api/alarm/status` - Get alarm status
- `POST /api/alarm/test` - Trigger test alarm
- `POST /api/alarm/stop` - Stop playback
- `GET /api/alarm/logs` - Get recent alarm logs

### Speakers
- `GET /api/speakers/discover` - Discover Sonos speakers via SSDP
- `POST /api/speakers/discover-by-ip` - Add a speaker by IP address (body: `{ip}`)
- `GET /api/speakers/selected` - Get selected speakers
- `POST /api/speakers/selected` - Save selected speakers

## License

ISC
