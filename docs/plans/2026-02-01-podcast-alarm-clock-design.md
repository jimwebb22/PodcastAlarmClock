# Podcast Alarm Clock - Design Document

**Date:** 2026-02-01
**Status:** Approved
**Target:** Single home, local Mac mini deployment

---

## Overview

A custom alarm clock system that plays podcast episodes from Spotify through Sonos speakers, mixed with music to create a personalized morning routine. Solves the limitation that the Sonos app doesn't support podcast playlists as alarms.

## Core Requirements

### Primary Features
- Wake up to newest episodes from selected Spotify podcasts
- Mix in 2-3 songs from Spotify Daily Mix between podcast episodes
- Web-based configuration interface (mobile-responsive)
- Runs locally on Mac mini (no cloud dependency initially)
- Support for multiple Sonos speakers (dynamic grouping)

### Alarm Behavior
- Weekly recurring pattern (select specific days of week)
- Master on/off toggle for quick enable/disable
- Configurable alarm time and volume level
- Manual stop (continuous playback until user stops)
- Safe fallback: only play on configured speakers, never others

### User Workflow
1. Configure alarm time and select weekdays (Mon-Fri typical)
2. Select which Sonos speakers to use
3. Choose eligible podcasts from Spotify followed shows
4. Select music source (Daily Mix 1, 2, 3, or Top Tracks)
5. Set volume level
6. Toggle alarm on/off as needed

---

## Architecture

### Technology Stack

**Backend:**
- Node.js with Express
- `node-schedule` for cron-like scheduling
- `spotify-web-api-node` for Spotify integration
- `node-sonos` for local Sonos control
- SQLite for data persistence

**Frontend:**
- React with mobile-responsive design
- Tailwind CSS or Material-UI for styling
- Simple single-page interface

**Deployment:**
- Runs on Mac mini 24/7
- Accessible on local network (http://localhost:3000 or local IP)
- No external hosting required

### Application Structure

```
podcast-alarm-clock/
├── server/
│   ├── api/              # Express routes
│   ├── services/
│   │   ├── spotify.js    # Spotify API integration
│   │   ├── sonos.js      # Sonos speaker control
│   │   ├── scheduler.js  # Alarm scheduling logic
│   │   └── playlist.js   # Build podcast+music queue
│   └── db/               # SQLite database & models
├── client/               # React web app
├── logs/                 # Application logs
└── package.json
```

---

## Spotify Integration

### Authentication
- OAuth 2.0 flow via Spotify Web API
- User clicks "Connect Spotify" in UI
- App stores access and refresh tokens in SQLite
- Automatic token refresh (no re-login required)

### Required Scopes
- `user-follow-read` - access followed podcasts
- `user-top-read` - access listening history
- `user-library-read` - access Daily Mix playlists
- `user-read-playback-state` - debugging/status

### Content Retrieval

**Podcasts:**
- Fetch user's followed shows (podcasts)
- User selects which shows are "alarm-eligible"
- At alarm time, query newest episode from each eligible show
- Sort by release date (newest first)

**Music:**
- Access Spotify Daily Mix playlists (1, 2, 3) or Top Tracks
- User selects preferred music source
- Randomly shuffle tracks for variety

### API Caching
- Cache podcast/episode metadata for a few hours
- Reduces API calls and rate limit concerns
- Refresh cache overnight before alarm time

---

## Sonos Integration

### Speaker Discovery
- `node-sonos` discovers speakers via SSDP on local network
- Web UI displays all discovered speakers
- User selects speakers via checkboxes

### Dynamic Grouping
- Alarm creates fresh speaker group at trigger time
- Doesn't rely on existing groups (user may change groups during day)
- One speaker designated as coordinator, others join its group
- After alarm stops, speakers ungroup back to individual units

### Playback Control
- Play Spotify URIs directly: `spotify:episode:xxx` and `spotify:track:xxx`
- Queue built in advance: episode → 3 songs → episode → 3 songs...
- Start at configured volume level (no fade-in)
- Coordinator controls all grouped speakers synchronously

### Safety Fallback
**Critical:** If configured speakers unavailable at alarm time:
1. Try to group all configured speakers
2. If grouping fails, try each configured speaker individually
3. Play only on available speakers from the configured list
4. If NO configured speakers available, fail and log error
5. **Never fall back to other speakers** - prevents wrong-room playback

---

## Alarm Scheduling

### Configuration
- Alarm time (e.g., 7:00 AM)
- Days of week: checkboxes for Mon, Tue, Wed, Thu, Fri, Sat, Sun
- Master on/off toggle (quick disable without losing settings)
- Selected Sonos speakers (one or more)
- Volume level (0-100%)
- Eligible podcasts (subset of followed shows)
- Music source (Daily Mix 1/2/3 or Top Tracks)

### Scheduler Implementation
- Uses `node-schedule` cron jobs
- On app start, reads config from SQLite and schedules alarm
- Checks daily if:
  1. Alarm is enabled (toggle ON)
  2. Today matches a selected weekday
- If both true, trigger alarm sequence

### Timezone Handling
- Uses Mac mini's system timezone
- Automatically adjusts for daylight saving time

---

## Playlist Building Logic

### Alarm Trigger Sequence

**Step 1: Fetch Content**
- Get newest episode from each eligible podcast
- Get shuffled tracks from selected music source

**Step 2: Build Queue**
For each podcast episode:
1. Add episode URI
2. Add 3 random music tracks
3. Repeat for next episode

**Example Queue:**
```
1. Podcast: "Daily News - Feb 1"
2. Song: "Track A"
3. Song: "Track B"
4. Song: "Track C"
5. Podcast: "Tech Show - Jan 31"
6. Song: "Track D"
7. Song: "Track E"
8. Song: "Track F"
... continues
```

**Step 3: Sonos Playback**
1. Discover and group selected speakers
2. Set coordinator volume
3. Load entire queue into Sonos
4. Start playback
5. Log execution

### Edge Cases
- More episodes than music tracks: reshuffle/recycle music
- Podcast has no new episodes: skip that podcast
- No new episodes at all: play music only
- Spotify API failure: retry 3 times, fall back to cached data

---

## Data Storage (SQLite)

### Schema

**`alarm_config`** (single row)
- `id` - primary key
- `time` - string (e.g., "07:00")
- `enabled` - boolean (master toggle)
- `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday` - booleans
- `volume` - integer (0-100)
- `music_source` - string ("daily_mix_1", "daily_mix_2", "daily_mix_3", "top_tracks")

**`selected_speakers`**
- `id` - primary key
- `speaker_name` - string
- `speaker_uuid` - string (unique identifier)

**`selected_podcasts`**
- `id` - primary key
- `show_id` - string (Spotify show ID)
- `show_name` - string (display name)

**`spotify_auth`**
- `id` - primary key
- `access_token` - string
- `refresh_token` - string
- `expires_at` - timestamp

**`alarm_logs`** (optional, for debugging)
- `id` - primary key
- `triggered_at` - timestamp
- `success` - boolean
- `error_message` - string
- `episodes_played` - JSON array

---

## Web UI Design

### Main Dashboard (Single Page)

**1. Alarm Status (top)**
- Large ON/OFF toggle switch
- Next alarm indicator: "Next alarm: Monday, Feb 3 at 7:00 AM"
- Status: "Alarm Ready" / "Playing Now" / "Not Configured"

**2. Alarm Configuration**
- Time picker
- Weekday checkboxes: [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]
- Volume slider (0-100%)
- Save button

**3. Sonos Speakers**
- "Discover Speakers" button
- List of speakers with checkboxes
- Shows currently selected speakers

**4. Podcast Selection**
- "Connect Spotify" button (if not authenticated)
- List of followed podcasts with checkboxes
- Search/filter for many podcasts

**5. Music Source**
- Dropdown: Daily Mix 1, Daily Mix 2, Daily Mix 3, Top Tracks
- Preview button (shows available tracks)

**6. Testing & Controls**
- "Test Alarm Now" button (immediate trigger for testing)
- "Stop Playback" button (visible when playing)
- Last alarm log: "Last triggered: Feb 1, 7:00 AM - Success"

### Design Principles
- Mobile-responsive (accessible from phone/tablet in bed)
- Large touch-friendly controls
- Clean, minimal interface
- Functionality over aesthetics

---

## Error Handling

### Spotify API Failures
- Retry 3 times with exponential backoff
- Fall back to cached data from previous day
- Log error for troubleshooting
- Show error in UI if open

### Sonos Speaker Issues
- If configured speakers unavailable, try each individually
- Only play on configured speakers from the list
- If none available, fail completely and log error
- Never fall back to random speakers (safety)

### No New Podcast Episodes
- If no eligible podcasts have new episodes, play music only
- Log this occurrence

### Authentication Expiry
- Auto-refresh Spotify tokens
- If refresh fails, prompt "Reconnect Spotify" in UI
- Alarm won't trigger until reconnected

### Network Connectivity
- Local network required for Sonos
- Internet required for Spotify API
- If offline at alarm time, log error and skip

### App Crashes/Restarts
- On startup, immediately load config and reschedule alarm
- Use PM2 or similar for auto-restart
- Logs written to file for debugging

### Volume Safety
- Cap maximum at 100%
- Validate input before saving

---

## Future Enhancements (Out of Scope)

### Multi-Home Support
For future expansion to second home:

**Option A: Cloud-hosted system**
- Deploy on AWS with EventBridge scheduling
- Use Sonos Cloud API or VPN to reach speakers
- Single UI controls both homes
- Select "Home 1" or "Home 2" in configuration

**Option B: Separate instances**
- Run independent instance in each home
- Two separate configurations
- Simpler but less unified

**Recommendation:** Start with single-home local deployment. If multi-home needed later, evaluate cloud migration or second local instance.

### Additional Features (YAGNI for v1)
- Snooze functionality
- Multiple alarms
- Fade-in volume
- Weather-based smart alarms
- Voice control integration
- Mobile app (native iOS/Android)

---

## Implementation Notes

### Prerequisites
- Mac mini running macOS (always on)
- Sonos speakers on same local network
- Spotify Premium account (required for API playback control)
- Node.js installed on Mac mini

### Development Approach
1. Set up Node.js project structure
2. Implement Spotify OAuth and API integration
3. Implement Sonos discovery and playback control
4. Build playlist building logic
5. Implement scheduler
6. Create SQLite database and models
7. Build React frontend
8. Integration testing with real Sonos/Spotify
9. Deploy as background service on Mac mini (PM2)

### Testing Strategy
- "Test Alarm Now" button for end-to-end validation
- Unit tests for playlist building logic
- Mock Spotify/Sonos APIs for development
- Test error scenarios (offline, missing speakers, etc.)

---

## Success Criteria

- ✓ Alarm triggers reliably at configured time on selected weekdays
- ✓ Plays newest podcast episodes from eligible shows
- ✓ Mixes in 2-3 songs between episodes
- ✓ Works with multiple Sonos speakers (dynamic grouping)
- ✓ Mobile-responsive web UI for easy configuration
- ✓ Safe fallback: never plays on wrong speakers
- ✓ Survives app restarts and network issues gracefully
- ✓ Simple enough for single-user home use

---

## Conclusion

This design provides a straightforward, locally-hosted solution for waking up to a personalized mix of podcasts and music through Sonos speakers. The architecture is simple enough to implement and maintain for personal use, while being robust enough to handle real-world edge cases. The design allows for future expansion to cloud hosting or multi-home support if needed.
