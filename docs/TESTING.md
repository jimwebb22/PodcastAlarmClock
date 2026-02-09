# Testing Checklist

This document provides a comprehensive testing checklist for the Podcast Alarm Clock application (v2.0 - RSS-based).

## Backend API Testing

### Health Check
- [ ] `GET /health` - Returns server health status
  - [ ] Returns `{status: 'ok', timestamp}`
  - [ ] Responds quickly (< 100ms)

### Alarm Configuration
- [ ] `GET /api/alarm/config` - Returns current alarm configuration
  - [ ] Returns time, enabled, weekdays, volume
  - [ ] Handles database errors gracefully
- [ ] `PUT /api/alarm/config` - Updates alarm configuration
  - [ ] Validates time format (HH:MM)
  - [ ] Validates volume (0-100)
  - [ ] Validates at least one weekday selected when enabling
  - [ ] Converts weekday values to 1/0 for SQLite
  - [ ] Reschedules alarm after update
  - [ ] Returns success/error response
- [ ] `GET /api/alarm/status` - Returns alarm status
  - [ ] Shows if alarm is scheduled
  - [ ] Shows next trigger time
  - [ ] Shows if currently playing
- [ ] `POST /api/alarm/test` - Triggers test alarm immediately
  - [ ] Builds playlist from RSS feeds
  - [ ] Groups speakers properly
  - [ ] Starts playback at configured volume
  - [ ] Includes DIDL-Lite metadata
  - [ ] Returns immediately (runs in background)
- [ ] `POST /api/alarm/stop` - Stops current playback
  - [ ] Clears Sonos queue
  - [ ] Ungroups speakers
  - [ ] Returns success confirmation
- [ ] `GET /api/alarm/logs` - Get recent alarm logs
  - [ ] Returns logs with timestamps
  - [ ] Shows success/failure status
  - [ ] Includes error messages if any
  - [ ] Respects limit query parameter

### Sonos Speakers
- [ ] `GET /api/speakers/discover` - Discovers Sonos speakers
  - [ ] Finds all speakers on local network
  - [ ] Returns speaker name, UUID, model
  - [ ] Handles network discovery errors
  - [ ] Times out appropriately (< 10 seconds)
- [ ] `GET /api/speakers/selected` - Gets selected speakers
  - [ ] Returns currently configured speakers
  - [ ] Maps database fields to frontend format
- [ ] `POST /api/speakers/selected` - Saves selected speakers
  - [ ] Validates speaker array format
  - [ ] Maps frontend fields to database format
  - [ ] Updates database correctly
  - [ ] Returns success confirmation

### Podcast Management (RSS)
- [ ] `GET /api/podcasts/feeds` - Lists saved RSS feeds
  - [ ] Returns all podcast feeds
  - [ ] Includes feed name and URL
  - [ ] Shows creation timestamp
- [ ] `POST /api/podcasts/feeds` - Adds new RSS feed
  - [ ] Validates URL format
  - [ ] Parses feed to extract title
  - [ ] Validates feed has audio enclosures
  - [ ] Prevents duplicate feeds
  - [ ] Returns feed info and episode count
  - [ ] Handles invalid feeds gracefully
- [ ] `DELETE /api/podcasts/feeds/:id` - Removes feed
  - [ ] Validates feed ID
  - [ ] Removes feed from database
  - [ ] Cascades to played_episodes
  - [ ] Returns success confirmation
- [ ] `POST /api/podcasts/feeds/preview` - Previews feed
  - [ ] Validates URL format
  - [ ] Returns feed metadata
  - [ ] Shows sample episodes
  - [ ] Doesn't save to database
- [ ] `GET /api/podcasts/episodes` - Gets latest episodes
  - [ ] Returns newest episode from each feed
  - [ ] Respects skipPlayed parameter
  - [ ] Includes episode metadata
  - [ ] Handles feed fetch errors
- [ ] `GET /api/podcasts/played` - Gets played episodes
  - [ ] Returns played episodes history
  - [ ] Respects limit parameter
  - [ ] Filters by feedId if provided
  - [ ] Includes timestamps
- [ ] `DELETE /api/podcasts/played` - Clears played history
  - [ ] Clears all played episodes if no feedId
  - [ ] Clears specific feed if feedId provided
  - [ ] Returns deletion count

### RSS Parsing Service
- [ ] Parses valid RSS feeds correctly
- [ ] Extracts episode titles, audio URLs, GUIDs
- [ ] Handles iTunes-specific tags
- [ ] Extracts artwork URLs (episode-level and feed-level)
- [ ] Handles missing enclosures gracefully
- [ ] Times out after 30 seconds
- [ ] Validates audio file format (MP3)

### Scheduler Service
- [ ] Initializes on app startup
- [ ] Schedules alarm based on configuration
- [ ] Respects enabled/disabled toggle
- [ ] Triggers on correct weekdays only
- [ ] Triggers at correct time (check timezone)
- [ ] Reschedules after configuration changes
- [ ] Handles DST transitions correctly
- [ ] Logs execution to database
- [ ] Tracks played episodes to avoid replays

### Playlist Building Service
- [ ] Fetches newest episode from each RSS feed
- [ ] Sorts episodes by publication date (newest first)
- [ ] Skips already-played episodes
- [ ] Builds array of audio URLs with metadata
- [ ] Handles missing episodes gracefully
- [ ] Handles feed fetch errors
- [ ] Returns empty playlist when no new content

### Sonos Service
- [ ] Discovers speakers via SSDP
- [ ] Handles speaker grouping correctly
- [ ] Creates DIDL-Lite metadata XML
  - [ ] Includes episode title
  - [ ] Includes podcast name (artist/creator)
  - [ ] Includes artwork URL
  - [ ] Includes Rincon-specific tags for mobile apps
- [ ] Queues tracks with metadata
  - [ ] Stops current playback
  - [ ] Flushes queue
  - [ ] Sets AVTransportURI with metadata
  - [ ] Adds tracks to queue
  - [ ] Starts playback
- [ ] Sets volume correctly
- [ ] Handles UPnP errors gracefully
- [ ] Never plays on non-configured speakers (safety!)
- [ ] Ungroups speakers after playback

## Frontend Testing

### AlarmStatus Component
- [ ] Displays current alarm status
- [ ] Shows next scheduled time correctly
- [ ] Master toggle works (enables/disables)
- [ ] Reads config from correct API path
- [ ] Shows visual feedback on toggle
- [ ] Updates when alarm is playing

### AlarmConfig Component
- [ ] Time picker allows selecting hours/minutes
- [ ] Weekday toggles work correctly
- [ ] Uses 1/0 values (not booleans) for weekdays
- [ ] Volume slider updates display
- [ ] Save button persists to backend
- [ ] Shows success/error feedback
- [ ] Loads existing configuration on mount
- [ ] Validates at least one day selected

### SpeakerSelection Component
- [ ] Discover button triggers speaker discovery
- [ ] Displays all discovered speakers
- [ ] Checkbox selection works
- [ ] Save button persists selection
- [ ] Shows currently selected speakers
- [ ] Handles discovery errors gracefully
- [ ] Shows loading state during discovery

### PodcastSelection Component
- [ ] Input field accepts RSS feed URLs
- [ ] Add button validates and adds feed
- [ ] Shows feed name after adding
- [ ] Lists all saved feeds
- [ ] Remove button deletes feeds
- [ ] Shows error messages for invalid feeds
- [ ] References "podcast feeds" not "Spotify"
- [ ] No authentication required

### ControlPanel Component
- [ ] "Test Alarm Now" triggers immediate alarm
- [ ] "Stop Playback" stops current alarm
- [ ] Shows playback status during test
- [ ] Displays recent alarm logs
- [ ] Shows timestamps and success/failure
- [ ] Provides feedback on actions

## Integration Testing

### End-to-End Alarm Flow
1. [ ] Configure alarm time and weekdays
2. [ ] Set volume level
3. [ ] Discover Sonos speakers
4. [ ] Select speakers to use
5. [ ] Add RSS podcast feeds
6. [ ] Enable alarm
7. [ ] Trigger test alarm
8. [ ] Verify playback starts with metadata
9. [ ] Check episode info in Sonos app
10. [ ] Stop playback
11. [ ] Wait for scheduled time
12. [ ] Verify alarm triggers automatically
13. [ ] Verify played episodes tracked

### Error Scenarios
- [ ] No speakers selected - shows error
- [ ] No podcast feeds - shows error
- [ ] Speakers unavailable - fails safely, never uses wrong speakers
- [ ] RSS feed unavailable - logs error and skips
- [ ] Invalid RSS feed - validation prevents adding
- [ ] Network offline - fails gracefully with error
- [ ] App restart - reloads config and reschedules
- [ ] All episodes played - clears history or notifies

### Speaker Safety (CRITICAL)
- [ ] Alarm ONLY plays on configured speakers
- [ ] If configured speakers unavailable, does NOT play elsewhere
- [ ] Fails gracefully if no speakers available
- [ ] Logs error when speakers unavailable
- [ ] Never falls back to random speakers

### Played Episodes Tracking
- [ ] Episodes marked as played after alarm
- [ ] Same episode not played twice
- [ ] Clearing history allows replay
- [ ] Foreign key cascade deletes work
- [ ] GUID-based tracking prevents duplicates

## Mobile Responsiveness

Test on multiple devices/screen sizes:

### Phone (iOS Safari, Android Chrome)
- [ ] Layout adjusts for narrow screens
- [ ] Touch targets appropriately sized
- [ ] No horizontal scroll required
- [ ] Time picker works on mobile
- [ ] Volume slider usable with touch
- [ ] Buttons finger-friendly

### Tablet (iPad, Android Tablet)
- [ ] Layout uses space effectively
- [ ] All components visible
- [ ] Touch interactions smooth

### Desktop Browser
- [ ] Clean, organized layout
- [ ] All features accessible
- [ ] Responsive to window resize

## Performance Testing

- [ ] App starts quickly (< 3 seconds)
- [ ] Speaker discovery completes (< 10 seconds)
- [ ] RSS feed parsing fast (< 5 seconds per feed)
- [ ] Test alarm triggers quickly (< 2 seconds)
- [ ] Database queries fast
- [ ] No memory leaks during long operation
- [ ] PM2 keeps app running continuously

## Production Deployment

### PM2 Management
- [ ] `npm run deploy` builds and starts with PM2
- [ ] PM2 keeps app running in background
- [ ] App restarts automatically on crash
- [ ] `start-server.command` works correctly
- [ ] `stop-server.command` stops PM2 process
- [ ] Logs written to files correctly
- [ ] Auto-restart on Mac boot (if configured)

### Build Process
- [ ] React frontend builds successfully
- [ ] Environment variables loaded from .env
- [ ] Production build served at root URL
- [ ] API routes work with production build
- [ ] Static assets served correctly

## Database Testing

- [ ] SQLite database initializes on first run
- [ ] Tables created with correct schema:
  - [ ] `alarm_config` (single row, id=1)
  - [ ] `selected_speakers`
  - [ ] `podcast_feeds`
  - [ ] `alarm_logs`
  - [ ] `played_episodes`
- [ ] Configuration persists across restarts
- [ ] Foreign key constraints work
- [ ] Cascade deletes work correctly
- [ ] Default values inserted

## Logs and Monitoring

- [ ] Server logs to console with timestamps
- [ ] PM2 logs to `logs/out.log`
- [ ] PM2 errors to `logs/err.log`
- [ ] Alarm execution logged with details
- [ ] Errors include helpful messages
- [ ] Human-readable episode names in logs
- [ ] Metadata pipeline debugging output

## Metadata Testing

### Desktop Sonos App
- [ ] Episode title displays
- [ ] Podcast name displays as artist
- [ ] Artwork displays correctly
- [ ] Queue shows episode info

### Mobile Sonos App
- [ ] Episode title displays
- [ ] Podcast name displays
- [ ] Artwork displays
- [ ] "Now Playing" shows metadata
- [ ] Radio show metadata appears

### DIDL-Lite XML
- [ ] All required tags present
- [ ] Special characters escaped
- [ ] URIs properly formatted
- [ ] Namespace declarations correct

---

## Testing Notes

### Manual Testing
Use the "Test Alarm Now" button in the web UI to trigger the full alarm sequence immediately without waiting for the scheduled time.

### Automated Testing
Currently uses manual testing. Future enhancements:
- Unit tests for RSS parsing
- Integration tests for API endpoints
- React component tests with Jest
- Sonos service mocking for tests

### Common Issues

**Speakers not discovered:**
- Verify Sonos speakers on same network
- Check firewall settings (SSDP)
- Restart app: `npm run pm2:restart`

**RSS feed fails to add:**
- Verify URL is RSS feed, not webpage
- Check feed has audio enclosures
- Try feed URL in browser
- Check for geo-restrictions

**Alarm doesn't trigger:**
- Check alarm enabled (toggle ON)
- Verify at least one weekday selected
- Check system time and timezone
- Review logs: `npm run pm2:logs`

**No metadata in Sonos app:**
- Desktop app should show full metadata
- Mobile app depends on Sonos version
- Check metadata XML in logs
- Verify artwork URLs accessible

**Playback fails:**
- Check speakers powered on
- Verify network connectivity
- Check podcast CDN accessibility
- Review logs for UPnP errors

**Server won't start after reboot:**
- Run `start-server.command`
- Or enable auto-start: `pm2 startup && pm2 save`
