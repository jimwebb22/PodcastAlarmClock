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

1. Build and deploy with PM2:
   ```bash
   npm run deploy
   ```

2. Manage with PM2:
   ```bash
   pm2 status                    # View status
   pm2 logs podcast-alarm        # View logs
   pm2 restart podcast-alarm     # Restart service
   pm2 stop podcast-alarm        # Stop service
   ```

3. Enable auto-start on boot:
   ```bash
   pm2 startup
   pm2 save
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
- View logs: `pm2 logs podcast-alarm`
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

## API Endpoints

- `GET /api/podcasts/feeds` - List saved podcast feeds
- `POST /api/podcasts/feeds` - Add new feed
- `DELETE /api/podcasts/feeds/:id` - Remove feed
- `GET /api/alarm/config` - Get alarm configuration
- `PUT /api/alarm/config` - Update alarm configuration
- `POST /api/alarm/test` - Trigger test alarm
- `POST /api/alarm/stop` - Stop playback
- `GET /api/speakers/discover` - Discover Sonos speakers

## License

ISC
