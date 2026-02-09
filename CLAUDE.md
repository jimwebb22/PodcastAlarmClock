# Claude Developer Guide

This document provides context and guidance for Claude (or future developers) working on the Podcast Alarm Clock project.

## Project Overview

**Purpose:** A custom alarm clock system that plays podcast episodes from RSS feeds through Sonos speakers.

**Key Features:**
- Wake up to newest episodes from any podcast via RSS feeds
- Web-based mobile-responsive configuration interface
- Weekly recurring schedule with master on/off toggle
- Dynamic Sonos speaker grouping
- No external service authentication required - works with any public podcast
- Runs locally on Mac mini

**Tech Stack:**
- Backend: Node.js, Express, SQLite
- Frontend: React with Tailwind CSS
- Services: RSS parsing (rss-parser), node-sonos
- Scheduling: node-cron
- Deployment: PM2

## Recent Updates (February 2026)

### Session: February 9, 2026 - Queue Playback Fix & Infrastructure

**Critical Sonos Queue Fix:**
- **Problem**: Only first episode played; queue showed "(Not in Use)"; playback stopped after first track
- **Root Cause**: Tracks were queued but Sonos was playing from cached/old transport state instead of the new queue
- **Solution**: After populating queue, explicitly set AVTransport URI to `x-rincon-queue:RINCON_<device-id>#0` protocol
- **Result**: Queue now shows "In Use", all episodes play sequentially, no cached state interference

**PM2 Background Server Management:**
- Installed and configured PM2 process manager for production deployment
- Server now runs in background, survives terminal closure
- Updated `start-server.command` and `stop-server.command` to be PM2-aware
- Added npm scripts: `pm2:start`, `pm2:stop`, `pm2:restart`, `pm2:logs`, `pm2:status`
- Documented manual startup (default) vs optional auto-start on boot workflows
- Fixed PM2 app name throughout documentation (`podcast-alarm-clock`)

**Documentation Overhaul:**
- **README.md**: Added complete API endpoint documentation, PM2 setup instructions, troubleshooting for played episodes and queue issues
- **CLAUDE.md**: Enhanced with queue management details, played episodes tracking, maintenance tasks section, PM2 configuration
- **TESTING.md**: Complete rewrite from Spotify-based v1.0 to RSS-based v2.0 implementation
- **Historical docs**: Marked v1.0 design/implementation plans as historical reference

**Custom Branding:**
- Replaced React atom logo with alarm clock favicon (⏰)
- Created custom SVG and PNG icons (favicon.svg, logo192.png, logo512.png)
- Updated favicon.ico with 32x32 alarm clock icon
- Added cache-busting parameters for Safari compatibility
- Icons now display correctly in browser tabs, iOS/Android home screens, bookmarks

**Developer Experience:**
- Added comprehensive inline code comments explaining queue fix
- Documented `x-rincon-queue` protocol for future developers
- Added maintenance tasks section with database management commands
- Improved troubleshooting documentation for common testing scenarios

**Metadata Support Added:**
- Full DIDL-Lite XML metadata for Sonos "Now Playing" display
- Episode titles, podcast names, and artwork appear in Sonos apps
- Support for both desktop and mobile Sonos applications
- Episode artwork extracted from RSS feeds (per-episode or feed-level fallback)

**Sonos Playback Improvements:**
- Fixed UPnP error 701 by using correct setAVTransportURI format
- Enhanced reliability with proper stop/flush/queue sequence
- Metadata passed as options object to ensure proper display
- Added Rincon-specific tags (r:streamContent, r:radioShowMd) for mobile apps
- **CRITICAL FIX:** Queue continuity issue resolved by setting AVTransport URI to queue source (`x-rincon-queue:RINCON_xxx#0`) after populating queue, ensuring sequential playback through all episodes

**Frontend Fixes:**
- AlarmStatus component reads config from correct API path
- AlarmConfig weekday toggles use 1/0 values instead of booleans
- Error messages reference podcast feeds instead of Spotify

**Developer Experience:**
- Human-readable episode names in server logs instead of URLs
- Comprehensive debugging output for metadata pipeline
- Clear separation of concerns: RSS → Playlist → Scheduler → Sonos

**Played Episodes Tracking:**
- System tracks all played episodes to avoid replaying content
- `played_episodes` table stores episode GUID, title, and play timestamp
- Episodes can be marked as unplayed by clearing the history
- Foreign key relationship with podcast feeds for automatic cleanup

## Project Structure

```
PodcastAlarmClock/
├── server/
│   ├── index.js              # Express server entry point
│   ├── api/
│   │   ├── alarm.js          # Alarm configuration and control
│   │   ├── speakers.js       # Sonos speaker discovery and selection
│   │   └── podcasts.js       # Podcast feed management (RSS)
│   ├── services/
│   │   ├── rss.js            # RSS feed parsing and episode extraction
│   │   ├── sonos.js          # Sonos speaker control
│   │   ├── scheduler.js      # Alarm scheduling logic
│   │   └── playlist.js       # Playlist building from RSS episodes
│   └── db/
│       ├── database.js       # Database initialization
│       ├── models.js         # Database query functions
│       └── schema.sql        # SQLite schema
├── client/
│   ├── public/               # Static assets
│   └── src/
│       ├── App.js            # Main React component
│       ├── api.js            # API client functions
│       └── components/
│           ├── AlarmStatus.js        # Status display and master toggle
│           ├── AlarmConfig.js        # Time, weekdays, volume configuration
│           ├── SpeakerSelection.js   # Sonos speaker discovery and selection
│           ├── PodcastSelection.js   # RSS feed management
│           └── ControlPanel.js       # Test alarm, stop playback, logs
├── docs/
│   ├── TESTING.md            # Comprehensive testing checklist
│   └── plans/                # Design documents
├── .env.example              # Environment template
├── podcast-alarm.db          # SQLite database (NOT in git)
├── package.json              # Dependencies and scripts
└── README.md                 # User-facing documentation
```

## Key Files and Their Purpose

### Backend Core

**`server/index.js`**
- Express server setup
- API route registration
- Serves production React build
- Initializes database and scheduler on startup

**`server/services/rss.js`**
- Parses podcast RSS feeds using `rss-parser`
- Extracts episode audio URLs from enclosure tags
- Validates feeds before adding
- Fetches latest episodes from all configured feeds

**`server/services/playlist.js`**
- Fetches newest episode from each configured podcast feed
- Builds queue of MP3 URLs sorted by date (newest first)
- Handles edge cases (no episodes, feed errors)

**`server/services/sonos.js`**
- Discovers speakers via SSDP on local network
- Groups speakers dynamically at alarm time
- Queues and plays MP3 URLs directly on Sonos with rich metadata
- Creates DIDL-Lite XML for episode titles, artwork, and artist info
- Stops playback and ungroups speakers
- **Safety:** Only plays on configured speakers, never falls back to others
- **Metadata:** Formats episode info for Sonos "Now Playing" display
- **Queue Management:** Uses `x-rincon-queue` URI protocol to ensure Sonos plays from queue (not cached state), enabling sequential playback through all queued episodes

**DIDL-Lite Metadata Format:**
The system creates XML metadata for each episode with:
- `dc:title` - Episode title
- `dc:creator` - Podcast name
- `upnp:artist` - Podcast name (for UPnP compatibility)
- `upnp:album` - Podcast name (appears as album)
- `upnp:albumArtURI` - Episode or feed artwork URL
- `r:streamContent` - Sonos-specific title for mobile apps
- `r:radioShowMd` - Sonos-specific radio show metadata

**Important:** Metadata must be passed as an options object to `setAVTransportURI`:
```javascript
await device.setAVTransportURI({
  uri: audioUrl,
  metadata: didlXmlString
});
```

**`server/services/scheduler.js`**
- Uses `node-cron` for cron-like scheduling
- Schedules alarm based on configuration (time, weekdays, enabled)
- Triggers playlist building and playback at alarm time
- Reschedules when configuration changes

### Database

**`server/db/schema.sql`**
- SQLite schema definition
- Tables: `alarm_config`, `selected_speakers`, `podcast_feeds`, `alarm_logs`, `played_episodes`
- Single alarm configuration (one row in `alarm_config`)
- Played episodes tracking to prevent replaying content

**`server/db/models.js`**
- Query functions for all database operations
- Podcast feed CRUD operations
- Speaker selection management
- Alarm configuration and logging

### Frontend

**`client/src/App.js`**
- Main container component
- Renders all configuration sections

**`client/src/api.js`**
- Centralized API client functions
- Axios-based HTTP requests to backend

**`client/src/components/PodcastSelection.js`**
- Add podcast feeds by RSS URL
- Lists all saved feeds
- Remove feeds
- No authentication required

## Development Workflow

### Initial Setup
```bash
# Navigate to project directory
cd PodcastAlarmClock

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start the server
npm start
```

### Development Mode
```bash
# Start backend server (port 3001)
npm run dev

# In another terminal, start React dev server (port 3000)
cd client
npm start

# Access app at http://localhost:3000
# API proxied to http://localhost:3001
```

### Production Build and Deployment

#### Initial Setup (One-Time)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Build and deploy
npm run deploy
```

This builds the React app and starts the server with PM2 in background mode.

#### Server Management

**Using Command Files (Recommended for End Users):**
```bash
# Start: Double-click start-server.command
# Stop: Double-click stop-server.command
```

The command files automatically detect if PM2 is installed and use it for background operation.

**Using NPM Scripts:**
```bash
npm run pm2:start      # Start server with PM2
npm run pm2:stop       # Stop server
npm run pm2:restart    # Restart server
npm run pm2:status     # Check status
npm run pm2:logs       # View logs (Ctrl+C to exit)
```

**Using PM2 Directly:**
```bash
pm2 start ecosystem.config.js       # Start with config file
pm2 stop podcast-alarm-clock        # Stop the process
pm2 restart podcast-alarm-clock     # Restart
pm2 delete podcast-alarm-clock      # Remove completely
pm2 logs podcast-alarm-clock        # View logs
pm2 status                          # List all processes
pm2 monit                           # Real-time monitoring
```

#### Startup Behavior

**Default (Manual Start):**
- Server does NOT auto-start on Mac reboot
- User must manually start server after restart via:
  - `start-server.command` (double-click), or
  - `npm run pm2:start`

**Optional Auto-Start Configuration:**
```bash
# Enable auto-start on boot
pm2 startup

# Follow the command it outputs (requires sudo)
# Example: sudo env PATH=$PATH:/usr/local/bin pm2 startup launchd -u username --hp /Users/username

# Save current PM2 process list
pm2 save

# Disable auto-start
pm2 unstartup

# Update saved process list
pm2 save  # (after adding/removing processes)
```

**Auto-Start Notes:**
- PM2 creates a LaunchAgent on macOS to start processes on boot
- Saved process list stored in `~/.pm2/dump.pm2`
- Only processes running at time of `pm2 save` are restored
- Use `pm2 resurrect` to manually restore saved processes

### Testing
```bash
# Use "Test Alarm Now" button in UI for end-to-end testing
# This triggers full alarm sequence immediately

# Check logs
tail -f logs/combined.log
tail -f logs/error.log
```

## API Endpoints

### Podcasts
- `GET /api/podcasts/feeds` - List all saved RSS feeds
- `POST /api/podcasts/feeds` - Add new RSS feed (body: `{feedUrl}`)
- `DELETE /api/podcasts/feeds/:id` - Remove a feed
- `POST /api/podcasts/feeds/preview` - Preview feed before adding (body: `{feedUrl}`)
- `GET /api/podcasts/episodes` - Get latest episodes from all feeds (query: `?skipPlayed=true`)
- `GET /api/podcasts/played` - Get played episodes history (query: `?limit=50&feedId=1`)
- `DELETE /api/podcasts/played` - Clear played episodes history (query: `?feedId=1` optional)

### Alarm
- `GET /api/alarm/config` - Get alarm configuration
- `PUT /api/alarm/config` - Update alarm configuration
- `GET /api/alarm/status` - Get alarm status
- `POST /api/alarm/test` - Trigger test alarm
- `POST /api/alarm/stop` - Stop current playback
- `GET /api/alarm/logs` - Get recent alarm logs

### Speakers
- `GET /api/speakers/discover` - Discover Sonos speakers on network
- `GET /api/speakers/selected` - Get currently selected speakers
- `POST /api/speakers/selected` - Save selected speakers (body: `{speakers: [{name, uuid}]}`)

### Health Check
- `GET /health` - Server health check (returns `{status, timestamp}`)

## Adding a Podcast

1. Find the podcast's RSS feed URL (usually on podcast website or by searching "[podcast name] RSS feed")
2. Paste URL into the "Add Podcast RSS Feed" field
3. Click "Add" - the system validates the feed and extracts the title
4. The feed appears in your saved podcasts list

Popular podcast RSS feed sources:
- NPR podcasts: https://www.npr.org/rss/
- Most podcasts list their RSS feed in show notes or website
- Podcast directories like Listen Notes show RSS feeds

## Architecture Notes

### RSS Feed Parsing
- Uses `rss-parser` npm package
- Extracts audio URLs from `<enclosure>` tags
- Handles various RSS feed formats
- 30-second timeout for feed fetching

### Speaker Safety
**CRITICAL:** The system has a safety mechanism to prevent wrong-room playback:
- Only plays on speakers explicitly selected in configuration
- If configured speakers unavailable, tries each individually
- If NONE available, fails completely and logs error
- **Never** falls back to other random speakers

### Database
- SQLite database (`podcast-alarm.db`)
- Single-user, single-alarm design
- Tables:
  - `alarm_config` - time, enabled, weekdays, volume
  - `selected_speakers` - which Sonos speakers to use
  - `podcast_feeds` - RSS feed URLs and names
  - `alarm_logs` - execution history
  - `played_episodes` - tracks played episodes to avoid replays (GUID, title, audio URL, timestamps)

### Playlist Building
1. Fetch newest episode from each configured feed
2. Sort episodes by publication date (newest first)
3. Queue all episode MP3 URLs to Sonos
4. If no episodes available, alarm fails with error

## Environment Variables

Required in `.env`:
```
PORT=3001
DATABASE_PATH=./podcast-alarm.db
```

## Common Issues and Solutions

**"No speakers discovered"**
- Verify Sonos speakers on same network
- Check firewall settings (may block SSDP discovery)
- Try restarting app: `pm2 restart podcast-alarm-clock`

**"Failed to parse feed"**
- Verify the URL is a valid RSS feed (not a webpage)
- Some feeds require specific user agents
- Try the feed URL in a browser to verify it's accessible

**"No podcast episodes available"**
- Verify at least one feed is added
- Check feeds have recent episodes with audio enclosures
- Some feeds may be geo-restricted
- Clear played_episodes table for testing: `DELETE FROM played_episodes;`

**"Alarm didn't trigger"**
- Check alarm enabled (toggle ON)
- Verify correct weekdays selected (must have at least one day)
- Check system time and timezone
- Review logs: `tail -f logs/server.log`

**"Playback fails on Sonos"**
- Check speakers powered on and network connected
- Verify podcast feeds have valid MP3 URLs
- Some podcast CDNs may block non-browser requests
- Check for UPnP errors in logs (error 701 = invalid state transition)

**"No metadata in Sonos app"**
- Desktop app should show full metadata (title, artwork, podcast name)
- Mobile app metadata depends on Sonos app version and device
- Verify metadata is being sent: check "Current track info" in logs
- Clear Sonos app cache or reinstall if mobile app shows "No Content"

**"UPnP Error 701"**
- This means "invalid state transition" - usually timing issue
- Fixed by proper stop → flush → setAVTransportURI → queue → play sequence
- Adding delays (500ms) between operations helps
- Ensure metadata passed as options object, not separate parameter

**"Weekday toggles not saving"**
- Frontend must use 1/0 values, not boolean true/false
- Backend converts truthy/falsy to 1/0 for SQLite
- Check AlarmConfig.js uses: `localConfig[day] ? 0 : 1`

**"Server not running after Mac restart"**
- By default, PM2 does NOT auto-start on reboot
- User must manually start: `start-server.command` or `npm run pm2:start`
- To enable auto-start: `pm2 startup` then `pm2 save`
- Check if auto-start is configured: `pm2 list` (should show processes after reboot)

**"stop-server.command doesn't work / server restarts immediately"**
- PM2 has autorestart enabled by default
- Use `stop-server.command` (now PM2-aware) or `npm run pm2:stop`
- Do NOT use `kill -9` on PM2-managed processes (PM2 will restart them)
- To completely remove: `pm2 delete podcast-alarm-clock`

## Project Status

**Current Version:** 2.0 - RSS-Based Implementation

All core features implemented:
- ✅ RSS feed parsing and management
- ✅ Sonos speaker discovery and control
- ✅ Podcast playlist building from RSS
- ✅ Alarm scheduling with weekday selection
- ✅ Mobile-responsive web UI
- ✅ Production deployment setup with PM2

**Key Changes from v1.0:**
- Removed Spotify dependency entirely
- Added RSS feed parsing (`rss-parser` npm package)
- Simplified architecture (no OAuth required)
- Works with any public podcast
- Removed music mixing feature (podcasts only)

**Future Enhancements:**
- Multiple alarms
- Snooze functionality
- Fade-in volume
- Local music file support
- Internet radio integration

## Maintenance Tasks

### Clearing Played Episodes (Testing/Development)

During testing, you may need to clear the played episodes history to replay content:

**Via API:**
```bash
curl -X DELETE http://localhost:3001/api/podcasts/played
```

**Via Database:**
```bash
sqlite3 podcast-alarm.db "DELETE FROM played_episodes;"
```

**Via SQL with Selective Clearing:**
```bash
# Clear all played episodes
sqlite3 podcast-alarm.db "DELETE FROM played_episodes;"

# Clear played episodes for a specific feed
sqlite3 podcast-alarm.db "DELETE FROM played_episodes WHERE feed_id = 1;"

# View played episodes count
sqlite3 podcast-alarm.db "SELECT feed_name, COUNT(*) FROM played_episodes pe JOIN podcast_feeds pf ON pe.feed_id = pf.id GROUP BY feed_name;"
```

### Database Maintenance

**Backup database:**
```bash
cp podcast-alarm.db podcast-alarm.db.backup
```

**Reset database completely:**
```bash
rm podcast-alarm.db
pm2 restart podcast-alarm-clock  # Will recreate with schema
```

**Query alarm logs:**
```bash
sqlite3 podcast-alarm.db "SELECT datetime(triggered_at, 'unixepoch', 'localtime') as time, success, episodes_played FROM alarm_logs ORDER BY triggered_at DESC LIMIT 10;"
```

## Important Reminders

1. **Never commit sensitive files:** `.env`, `podcast-alarm.db`, `node_modules/`
2. **Always test with "Test Alarm Now"** before relying on scheduled alarms
3. **Speaker safety is critical** - verify fallback logic never plays on wrong speakers
4. **Check logs regularly** - they contain valuable debugging information
5. **Local network required** - Sonos speakers must be on same network as server
6. **Clear played episodes** during testing to replay content

---

**Happy coding!** This project is production-ready for single-home, local deployment. The RSS-based architecture is simple, has no external service dependencies, and works with any public podcast.
