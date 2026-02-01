# Sonos Alarm Clock

A local alarm clock system that plays Spotify podcasts and music through Sonos speakers.

## Prerequisites

- Node.js 16+
- Spotify Premium account
- Sonos speakers on local network
- PM2 (for production deployment): `npm install -g pm2`

## Setup

### Development

1. Copy `.env.example` to `.env` and fill in Spotify credentials:
   ```
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:3001/api/auth/callback
   PORT=3001
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. In a separate terminal, start React development server:
   ```bash
   cd client
   npm start
   ```

5. Access UI: http://localhost:3000

### Production

1. Ensure `.env` file is configured

2. Run deployment script:
   ```bash
   ./deploy.sh
   ```

   This will:
   - Install all dependencies
   - Build the React production bundle
   - Start/restart the PM2 service
   - Configure auto-restart on crashes

3. Access UI: http://localhost:3001

## Usage

### Initial Configuration

1. Open the web UI (http://localhost:3001 in production)
2. Click "Connect Spotify" to authorize the app
3. Discover and select your Sonos speakers
4. Configure alarm time and select weekdays
5. Choose eligible podcasts from your followed shows
6. Select music source (Daily Mix or Top Tracks)
7. Set desired volume level
8. Toggle alarm ON

### Daily Operation

- **Enable/Disable**: Use the master toggle to quickly turn the alarm on/off
- **Test**: Use "Test Alarm Now" to verify configuration
- **Stop**: Use "Stop Playback" button to end alarm playback
- **Monitor**: View alarm status and next scheduled time on dashboard

## PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs sonos-alarm-clock

# Restart service
pm2 restart sonos-alarm-clock

# Stop service
pm2 stop sonos-alarm-clock

# Start on system boot
pm2 startup
pm2 save
```

## Project Structure

```
sonos-alarm-clock/
├── server/
│   ├── api/              # Express API routes
│   ├── services/         # Spotify, Sonos, scheduler, playlist
│   └── db/               # SQLite database
├── client/               # React web app
├── logs/                 # Application logs (created by PM2)
├── ecosystem.config.js   # PM2 configuration
├── deploy.sh             # Deployment script
└── package.json
```

## Troubleshooting

### Alarm Not Triggering

- Check PM2 status: `pm2 status`
- View logs: `pm2 logs sonos-alarm-clock`
- Verify alarm is enabled in UI
- Check that current day is selected
- Ensure Spotify tokens haven't expired (reconnect if needed)

### Sonos Speakers Not Found

- Verify speakers are on same network as Mac mini
- Check speaker power and network connectivity
- Click "Discover Speakers" again in UI
- Restart Sonos speakers if needed

### Spotify Connection Issues

- Click "Connect Spotify" to re-authorize
- Verify `.env` credentials are correct
- Check Spotify API status
- View logs for specific error messages

## License

ISC
