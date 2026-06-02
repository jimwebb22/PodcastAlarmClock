# Podcast Alarm Clock

A local alarm clock that wakes you up with fresh podcast episodes played through Sonos speakers. No accounts, no API keys, no cloud services — just RSS feeds and your local network.

## Features

- Wake up to the newest episodes from your favorite podcasts
- Works with any podcast that has a public RSS feed
- Configure alarm time, weekdays, and volume
- Support for multiple Sonos speakers with grouping
- Tracks played episodes to avoid replaying content
- Mobile-responsive web interface

## Quick Start

**Requirements:** Node.js 18+, Sonos speakers on the same local network

```bash
git clone <repo-url>
cd PodcastAlarmClock
npm run setup        # copies .env, installs deps, builds UI
npm start            # starts server on http://localhost:3001
```

Open **http://localhost:3001** in your browser, then:

1. Click **Discover Speakers** to find your Sonos speakers and select which to use
2. Add podcast RSS feed URLs (paste any public feed URL)
3. Set alarm time, select days, set volume
4. Toggle alarm **ON**

Use **Test Alarm Now** to verify everything works before relying on it.

## Configuration

Copy `.env.example` to `.env` (done automatically by `npm run setup`) and edit as needed:

```
PORT=3001                        # server port (default: 3001)
DATABASE_PATH=./podcast-alarm.db # SQLite database path
```

## Development

```bash
# Terminal 1: backend (port 3001)
npm run dev

# Terminal 2: React dev server (port 3000, auto-proxies API)
cd client && npm start
```

## macOS App Wrapper (Recommended on macOS)

For a native macOS experience with a Dock icon and no Terminal window required, build the app using [Platypus](https://sveinbjorn.org/platypus):

```bash
brew install --cask platypus
# Open Platypus.app → Settings → Install Command Line Tool

bash scripts/build-macos-app.sh
# Deploys runtime to ~/Library/Application Support/PodcastAlarmClock/
# Installs PodcastAlarmClock.app to /Applications/
```

**First launch:** Right-click → Open → Open (Gatekeeper bypass for unsigned app), then allow Local Network access when prompted.

**After code changes:** Quit the app, run `bash scripts/build-macos-app.sh`, relaunch.

**Auto-start on login:** System Settings → General → Login Items → add `PodcastAlarmClock.app`

**Logs:** `tail -f ~/Library/Logs/PodcastAlarmClock/server.log`

> **Note:** Do NOT use PM2 on macOS for production. macOS blocks PM2-managed background processes from accessing the local network, which prevents Sonos speaker discovery.

## PM2 (Optional, Linux/non-macOS)

PM2 works well on Linux for background process management:

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # auto-start on boot
```

## Project Structure

```
PodcastAlarmClock/
├── server/
│   ├── api/              # Express API routes (alarm, speakers, podcasts)
│   ├── services/         # RSS parsing, Sonos control, scheduler, playlist
│   └── db/               # SQLite database, schema, models
├── client/               # React web app (Tailwind CSS)
├── scripts/
│   ├── build-macos-app.sh    # Builds PodcastAlarmClock.app (macOS)
│   ├── platypus-launcher.sh  # Launcher script inside the .app
│   └── build-icon.sh         # Generates .icns from logo512.png
├── .env.example          # Environment template
├── ecosystem.config.js   # PM2 config (optional)
└── package.json
```

## API Endpoints

### Health
- `GET /health` — status and timestamp

### Podcasts
- `GET /api/podcasts/feeds` — list saved feeds
- `POST /api/podcasts/feeds` — add feed (`{feedUrl}`)
- `DELETE /api/podcasts/feeds/:id` — remove feed
- `POST /api/podcasts/feeds/preview` — preview feed before adding
- `GET /api/podcasts/episodes` — latest episodes from all feeds
- `GET /api/podcasts/played` — played episode history
- `DELETE /api/podcasts/played` — clear played history

### Alarm
- `GET /api/alarm/config` — get config
- `PUT /api/alarm/config` — update config
- `GET /api/alarm/status` — current status
- `POST /api/alarm/test` — trigger test alarm immediately
- `POST /api/alarm/stop` — stop playback
- `GET /api/alarm/logs` — recent alarm logs

### Speakers
- `GET /api/speakers/discover` — discover via SSDP
- `POST /api/speakers/discover-by-ip` — add speaker by IP (`{ip}`)
- `GET /api/speakers/selected` — get selected speakers
- `POST /api/speakers/selected` — save selected speakers

## Troubleshooting

### No UI (blank page after `npm start`)

Run `npm run build` to build the React client, then restart the server.

### Speakers Not Found

- Verify speakers are on the same network as the server
- Check firewall isn't blocking SSDP (UDP port 1900)
- Try adding speakers by IP: use the "Add by IP" field in the UI

### Alarm Not Triggering

- Check the alarm is toggled ON
- Verify at least one weekday is selected
- Confirm at least one podcast feed is added
- Check logs for errors

### No Episodes Available

The system tracks played episodes to avoid repeats. Clear the history to replay:

```bash
curl -X DELETE http://localhost:3001/api/podcasts/played
# or directly (dev / npm start — DB in project root):
sqlite3 podcast-alarm.db "DELETE FROM played_episodes;"
# or when running the macOS app (DB under ~/Library):
sqlite3 ~/Library/Application\ Support/PodcastAlarmClock/podcast-alarm.db "DELETE FROM played_episodes;"
```

### Server Not Restarting After Reboot (macOS App)

The app does not auto-start by default. Add it to Login Items:
System Settings → General → Login Items → click **+** → select `PodcastAlarmClock.app`

## Known Limitations

- Single alarm only (one time/schedule configuration)
- Requires Mac/server to be awake at alarm time
- Sonos speakers must be on the same LAN as the server
- No snooze

## License

ISC — see [LICENSE](LICENSE)
