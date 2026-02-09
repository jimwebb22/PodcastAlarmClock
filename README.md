# Podcast Alarm Clock

A local alarm clock system that plays podcasts from RSS feeds through Sonos speakers.

## Features

- Wake up to the newest episodes from your favorite podcasts
- Works with any podcast that has a public RSS feed
- No external service accounts or API keys required
- Configure alarm time, weekdays, and volume
- Support for multiple Sonos speakers with grouping
- Mobile-responsive web interface

## Prerequisites

- Node.js 16+
- Sonos speakers on local network
- PM2 (for production deployment): `npm install -g pm2`

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment template:
   ```bash
   cp .env.example .env
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open http://localhost:3001 in your browser

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

1. **Install PM2 (one-time setup):**
   ```bash
   sudo npm install -g pm2
   ```

2. **Deploy the application:**
   ```bash
   npm run deploy
   ```
   This builds the React frontend and starts the server in the background with PM2.

### Server Management

#### Easy Way: Use the Command Files

- **Start Server**: Double-click `start-server.command`
- **Stop Server**: Double-click `stop-server.command`

These scripts handle starting and stopping the server cleanly. The server runs in the background, so you can close terminal windows without stopping the alarm.

#### Command Line: Use NPM Scripts

```bash
npm run pm2:start      # Start the server
npm run pm2:stop       # Stop the server
npm run pm2:restart    # Restart the server
npm run pm2:status     # Check server status
npm run pm2:logs       # View server logs (Ctrl+C to exit)
```

Or use PM2 commands directly:
```bash
pm2 status                          # View all PM2 processes
pm2 logs podcast-alarm-clock        # View logs
pm2 restart podcast-alarm-clock     # Restart service
pm2 stop podcast-alarm-clock        # Stop service
pm2 delete podcast-alarm-clock      # Remove completely
```

### After Mac Restart

**By default**, the server does NOT auto-start when your Mac reboots. After restarting your Mac:

1. Double-click `start-server.command`, or
2. Run `npm run pm2:start`

The server will start in the background and keep running until you stop it or restart your Mac again.

### Optional: Auto-Start on Boot

If you want the server to automatically start when your Mac boots up:

1. **Enable auto-start:**
   ```bash
   pm2 startup
   ```
   Follow the instructions it provides (will require `sudo`)

2. **Save current process list:**
   ```bash
   pm2 save
   ```

Now the alarm server will automatically start whenever your Mac reboots.

**To disable auto-start later:**
```bash
pm2 unstartup
```

**To completely remove the service:**
```bash
pm2 delete podcast-alarm-clock
pm2 unstartup
```

## Project Structure

```
PodcastAlarmClock/
├── server/
│   ├── api/              # Express API routes
│   ├── services/         # RSS parsing, Sonos, scheduler
│   └── db/               # SQLite database
├── client/               # React web app
├── .env.example          # Environment template
└── package.json
```

## Troubleshooting

### Alarm Not Triggering

- Check PM2 status: `pm2 status`
- View logs: `pm2 logs podcast-alarm-clock`
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
- Check logs for specific error messages

### Server Not Running After Restart

- The server does NOT auto-start by default after Mac reboots
- Run `start-server.command` or `npm run pm2:start` to restart it
- To enable auto-start: See "Optional: Auto-Start on Boot" section above

### Can't Stop Server

- Use `stop-server.command` or `npm run pm2:stop`
- Don't use `kill` commands directly (PM2 will restart the process)
- To remove completely: `pm2 delete podcast-alarm-clock`

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
- `GET /api/speakers/discover` - Discover Sonos speakers
- `GET /api/speakers/selected` - Get selected speakers
- `POST /api/speakers/selected` - Save selected speakers

## License

ISC
