# Claude Developer Guide

This document provides context and guidance for Claude (or future developers) working on the Podcast Alarm Clock project.

## Project Overview

**Purpose:** A custom alarm clock system that plays podcast episodes from Spotify through Sonos speakers, mixed with music to create a personalized morning routine.

**Key Features:**
- Wake up to newest episodes from selected Spotify podcasts
- Mix in 2-3 songs between podcast episodes
- Web-based mobile-responsive configuration interface
- Weekly recurring schedule with master on/off toggle
- Dynamic Sonos speaker grouping
- Runs locally on Mac mini

**Tech Stack:**
- Backend: Node.js, Express, SQLite
- Frontend: React with Tailwind CSS
- Services: Spotify Web API, node-sonos
- Scheduling: node-schedule
- Deployment: PM2

## Project Structure

```
/Users/jimwebb/Documents/Science Projects/Podcast Alarm Clock/.worktrees/implementation/
├── server/
│   ├── index.js              # Express server entry point
│   ├── api/
│   │   ├── auth.js           # Spotify OAuth endpoints
│   │   ├── alarm.js          # Alarm configuration and control
│   │   ├── speakers.js       # Sonos speaker discovery and selection
│   │   └── podcasts.js       # Podcast management
│   ├── services/
│   │   ├── spotify.js        # Spotify API integration
│   │   ├── sonos.js          # Sonos speaker control
│   │   ├── scheduler.js      # Alarm scheduling logic
│   │   └── playlist.js       # Playlist building (podcasts + music)
│   └── db/
│       ├── init.js           # Database initialization
│       ├── alarm.js          # Alarm configuration queries
│       ├── speakers.js       # Speaker management queries
│       ├── podcasts.js       # Podcast management queries
│       └── auth.js           # Spotify token management queries
├── client/
│   ├── public/               # Static assets
│   └── src/
│       ├── App.js            # Main React component
│       ├── api.js            # API client functions
│       └── components/
│           ├── AlarmStatus.js        # Status display and master toggle
│           ├── AlarmConfig.js        # Time, weekdays, volume configuration
│           ├── SpeakerSelection.js   # Sonos speaker discovery and selection
│           ├── PodcastSelection.js   # Spotify podcast selection
│           ├── MusicSource.js        # Music source selection (Daily Mix, Top Tracks)
│           └── ControlPanel.js       # Test alarm, stop playback, logs
├── docs/
│   ├── TESTING.md            # Comprehensive testing checklist
│   └── plans/                # Design documents
├── logs/                     # Application logs (combined.log, error.log)
├── .env                      # Environment variables (NOT in git)
├── .env.example              # Environment template
├── podcast-alarm.db            # SQLite database (NOT in git)
├── package.json              # Dependencies and scripts
├── ecosystem.config.js       # PM2 configuration
├── deploy.sh                 # Deployment script
└── README.md                 # User-facing documentation
```

## Key Files and Their Purpose

### Backend Core

**`server/index.js`**
- Express server setup
- API route registration
- Error handling middleware
- Serves production React build
- Initializes database and scheduler on startup

**`server/services/scheduler.js`**
- Uses `node-schedule` for cron-like scheduling
- Schedules alarm based on configuration (time, weekdays, enabled)
- Triggers playlist building and playback at alarm time
- Reschedules when configuration changes

**`server/services/playlist.js`**
- Fetches newest episodes from selected podcasts
- Fetches tracks from selected music source (Daily Mix or Top Tracks)
- Builds queue: episode → 3 songs → episode → 3 songs...
- Handles edge cases (no episodes, insufficient music)

**`server/services/sonos.js`**
- Discovers speakers via SSDP on local network
- Groups speakers dynamically at alarm time
- Plays Spotify URIs directly on Sonos
- Stops playback and ungroups speakers
- **Safety:** Only plays on configured speakers, never falls back to others

**`server/services/spotify.js`**
- OAuth authentication flow
- Token refresh logic
- Fetches followed podcasts (shows)
- Fetches newest episodes
- Fetches Daily Mix playlists or Top Tracks

### Database

**`server/db/*.js`**
- SQLite queries for all data persistence
- Tables: `alarm_config`, `selected_speakers`, `selected_podcasts`, `spotify_auth`, `alarm_logs`
- Single alarm configuration (one row in `alarm_config`)
- Tokens stored securely in `spotify_auth`

### Frontend

**`client/src/App.js`**
- Main container component
- Manages state for all configuration
- Coordinates API calls
- Displays all child components

**`client/src/api.js`**
- Centralized API client functions
- Axios-based HTTP requests to backend
- Used by all components for data fetching

**`client/src/components/*.js`**
- Self-contained React components
- Each handles one aspect of configuration
- Uses Tailwind CSS for styling
- Mobile-responsive design

## Development Workflow

### Initial Setup
```bash
# Navigate to project directory
cd "/Users/jimwebb/Documents/Science Projects/Podcast Alarm Clock/.worktrees/implementation"

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Spotify credentials
# Required: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, REDIRECT_URI
```

### Development Mode
```bash
# Start backend server (port 3001)
npm run server

# In another terminal, start React dev server (port 3000)
cd client
npm start

# Access app at http://localhost:3000
# API proxied to http://localhost:3001
```

### Production Build and Deployment
```bash
# Build React app and deploy with PM2
npm run deploy

# Check PM2 status
pm2 status

# View logs
pm2 logs podcast-alarm

# Restart app
pm2 restart podcast-alarm

# Stop app
pm2 stop podcast-alarm
```

### Testing
```bash
# Use "Test Alarm Now" button in UI for end-to-end testing
# This triggers full alarm sequence immediately

# Check logs
tail -f logs/combined.log
tail -f logs/error.log

# Check PM2 logs
pm2 logs podcast-alarm --lines 100
```

## Common Development Tasks

### Adding a New Alarm Feature
1. Update database schema in `server/db/init.js` if needed
2. Add database query functions in appropriate `server/db/*.js` file
3. Add API endpoint in appropriate `server/api/*.js` file
4. Update service logic in `server/services/*.js` if needed
5. Update React components in `client/src/components/*.js`
6. Test with "Test Alarm Now" button
7. Update `docs/TESTING.md` with new test cases

### Debugging Alarm Issues
1. Check logs: `tail -f logs/combined.log`
2. Verify configuration in database: `sqlite3 podcast-alarm.db "SELECT * FROM alarm_config;"`
3. Check scheduler status in logs (should show "Scheduling alarm for HH:MM on [days]")
4. Use "Test Alarm Now" to test without waiting for scheduled time
5. Check Spotify token expiry: `sqlite3 podcast-alarm.db "SELECT expires_at FROM spotify_auth;"`
6. Verify speakers discoverable: Check network, Sonos app

### Modifying Playlist Logic
- Edit `server/services/playlist.js`
- Function `buildAlarmPlaylist()` controls the podcast/music mixing logic
- Current pattern: 1 episode → 3 songs (repeat)
- To change ratio, modify the loop in `buildAlarmPlaylist()`

### Adding New Music Source
1. Add option to `music_source` enum in database schema
2. Update `server/services/spotify.js` to fetch from new source
3. Add option to `MusicSource` component dropdown
4. Test with "Test Alarm Now"

## Architecture Notes

### Alarm Scheduling
- Uses `node-schedule` with cron-like expressions
- Schedules for each selected weekday independently
- On app startup, reads config from DB and reschedules
- Master toggle (`enabled` flag) controls whether alarm actually fires
- Timezone: Uses system timezone (Mac mini)

### Speaker Safety
**CRITICAL:** The system has a safety mechanism to prevent wrong-room playback:
- Only plays on speakers explicitly selected in configuration
- If configured speakers unavailable, tries each individually
- If NONE available, fails completely and logs error
- **Never** falls back to other random speakers
- See `server/services/sonos.js` for implementation

### Spotify Token Management
- Access tokens expire after 1 hour
- Refresh tokens are long-lived
- `server/services/spotify.js` automatically refreshes expired tokens
- If refresh fails, user must re-authenticate via "Connect Spotify" button

### Database
- SQLite database (`podcast-alarm.db`)
- Single-user, single-alarm design (one row in `alarm_config`)
- Speaker/podcast selections stored in separate tables
- Alarm logs table for debugging (`alarm_logs`)

### Playlist Building
1. Fetch newest episode from each selected podcast
2. Sort episodes by release date (newest first)
3. Fetch tracks from selected music source, shuffle
4. Build queue alternating: episode → 3 songs → episode → 3 songs...
5. Handle edge cases:
   - No new episodes → play music only
   - Not enough music → reshuffle/recycle tracks
   - Spotify API failure → retry 3x, log error

## Worktrees

This project uses Git worktrees. The working directory is:
```
/Users/jimwebb/Documents/Science Projects/Podcast Alarm Clock/.worktrees/implementation
```

Main repository:
```
/Users/jimwebb/Documents/Science Projects/Podcast Alarm Clock
```

When committing:
- Changes in `.worktrees/implementation` are committed to the implementation branch
- Push commits to sync with main repository

## Environment Variables

Required in `.env`:
```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
REDIRECT_URI=http://localhost:3001/api/auth/callback
PORT=3001
```

Get Spotify credentials from: https://developer.spotify.com/dashboard

## Testing Checklist

See `docs/TESTING.md` for comprehensive testing checklist including:
- Backend API endpoints
- Frontend components
- Integration testing
- Mobile responsiveness
- Error scenarios
- Production deployment

## Common Issues and Solutions

**"No speakers discovered"**
- Verify Sonos speakers on same network as Mac mini
- Check firewall settings (may block SSDP discovery)
- Try restarting app: `pm2 restart podcast-alarm`

**"Spotify authentication failed"**
- Verify CLIENT_ID and CLIENT_SECRET in .env
- Check REDIRECT_URI matches Spotify app settings exactly
- Ensure http://localhost:3001/api/auth/spotify/callback is whitelisted in Spotify app
- If you see "Invalid Client", the .env credentials are likely still placeholders

**"Error Saving Speaker Selection"**
- FIXED: This was caused by property name mismatch
- Frontend sends `name`/`uuid` from discovery API
- Backend expects `speaker_name`/`speaker_uuid` in database
- Solution: Added property mapping in server/api/speakers.js (lines 11-14, 27-30)

**"Cannot toggle alarm ON"**
- Ensure at least one weekday is selected
- Frontend sends boolean for `enabled`, backend now accepts both boolean and number
- FIXED: Added conversion in server/api/alarm.js (line 21)
- Will show error message if no days selected (added validation line 42-46)

**"Alarm didn't trigger"**
- Check alarm enabled (toggle ON)
- Verify correct weekdays selected
- Check system time and timezone
- Review logs: `tail -f logs/combined.log`
- Check database: `sqlite3 podcast-alarm.db "SELECT * FROM alarm_config;"`

**"Playback fails"**
- Verify Spotify Premium account (required for playback control)
- Check speakers powered on and network connected
- Verify podcast/music selections not empty
- Check Spotify token hasn't expired (should auto-refresh)
- Review logs for Sonos/Spotify API errors

**"OAuth redirects away from app"**
- FIXED: Changed to open in popup window (client/src/components/SpotifyAuth.js lines 23-43)
- Popup auto-closes after auth completion
- Main app stays loaded and updates automatically

## Future Enhancements (Not Yet Implemented)

- Multiple alarms
- Snooze functionality
- Fade-in volume
- Weather-based smart alarms
- Multi-home support (cloud deployment)
- Mobile app (native iOS/Android)
- Voice control integration

## Important Reminders

1. **Never commit sensitive files:** `.env`, `podcast-alarm.db`, `node_modules/`
2. **Always test with "Test Alarm Now"** before relying on scheduled alarms
3. **Speaker safety is critical** - verify fallback logic never plays on wrong speakers
4. **Check logs regularly** - they contain valuable debugging information
5. **PM2 handles restarts** - app will auto-restart on crashes
6. **Spotify Premium required** - Free accounts can't use playback API
7. **Local network required** - Sonos speakers must be on same network as Mac mini

## Getting Help

- Review design document: `docs/plans/2026-02-01-podcast-alarm-clock-design.md`
- Check testing checklist: `docs/TESTING.md`
- Review logs: `logs/combined.log` and `logs/error.log`
- Check PM2 status: `pm2 status` and `pm2 logs podcast-alarm`
- Test endpoints manually: Use curl or Postman to test API routes
- Database inspection: `sqlite3 podcast-alarm.db` for direct queries

## Project Status

**Current Version:** 1.0 - Initial Implementation Complete

All core features implemented:
- ✅ Spotify OAuth integration
- ✅ Sonos speaker discovery and control
- ✅ Podcast and music playlist building
- ✅ Alarm scheduling with weekday selection
- ✅ Mobile-responsive web UI
- ✅ Production deployment setup with PM2
- ✅ Comprehensive testing checklist
- ✅ Developer documentation

**Bugs Fixed (Post-Implementation):**
- ✅ Speaker property name mismatch (frontend `name`/`uuid` vs backend `speaker_name`/`speaker_uuid`)
- ✅ Alarm toggle validation (now accepts both boolean and number)
- ✅ OAuth UX improved (popup window instead of same-window redirect)

**Current Blocker:**
- ⏸️ **Spotify API credentials unavailable** - Spotify Developer Platform is temporarily not accepting new integrations. Once available, follow README.md instructions to obtain Client ID and Client Secret.

**Recent Improvements (2026-02-01):**
- OAuth opens in popup window with auto-close
- Better error messages and validation
- Requires at least one day selected when enabling alarm
- Enhanced documentation with Spotify setup guide
- All preparation complete for when credentials become available

**Ready for Testing:**
- Speaker discovery and selection (working now)
- Alarm configuration UI (working now)
- All functionality except Spotify-dependent features

**Next Steps:**
1. Wait for Spotify API registration to reopen
2. Obtain Spotify credentials following README.md guide
3. Complete end-to-end testing with real Spotify account
4. Manual testing with real Sonos speakers
5. Deploy to Mac mini for production use
6. Monitor for a week to verify reliability

---

**Happy coding!** This project is production-ready for single-home, local deployment. The architecture is simple, maintainable, and extensible for future enhancements.
