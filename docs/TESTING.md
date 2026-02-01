# Testing Checklist

This document provides a comprehensive testing checklist for the Podcast Alarm Clock application.

## Backend API Testing

### Spotify Authentication
- [ ] `/api/auth/url` - Returns Spotify authorization URL
- [ ] `/api/auth/callback?code=XXX` - Exchanges code for tokens
- [ ] `/api/auth/status` - Returns authentication status
- [ ] Token refresh works automatically when expired
- [ ] Handles invalid or expired refresh tokens gracefully

### Alarm Configuration
- [ ] `GET /api/alarm/config` - Returns current alarm configuration
- [ ] `POST /api/alarm/config` - Updates alarm configuration
  - [ ] Validates time format (HH:MM)
  - [ ] Validates volume (0-100)
  - [ ] Validates weekday selections
  - [ ] Validates music source options
- [ ] `POST /api/alarm/test` - Triggers test alarm immediately
  - [ ] Builds playlist correctly
  - [ ] Groups speakers properly
  - [ ] Starts playback at configured volume
- [ ] `POST /api/alarm/stop` - Stops current playback
  - [ ] Clears queue
  - [ ] Ungroups speakers
  - [ ] Returns speakers to previous state

### Sonos Speakers
- [ ] `GET /api/speakers` - Returns list of discovered speakers
  - [ ] Discovers all speakers on network
  - [ ] Returns correct speaker metadata (name, UUID, room)
  - [ ] Handles network discovery errors
- [ ] `POST /api/speakers/select` - Saves selected speakers
  - [ ] Validates speaker UUIDs
  - [ ] Updates database correctly
  - [ ] Returns updated configuration

### Podcast Management
- [ ] `GET /api/podcasts/followed` - Returns followed podcasts from Spotify
  - [ ] Requires authentication
  - [ ] Returns correct podcast metadata
  - [ ] Handles API errors gracefully
- [ ] `POST /api/podcasts/select` - Saves selected podcasts
  - [ ] Validates Spotify show IDs
  - [ ] Updates database correctly
  - [ ] Returns updated configuration

### Scheduler Service
- [ ] Alarm schedules correctly on app startup
- [ ] Respects enabled/disabled toggle
- [ ] Triggers on correct weekdays only
- [ ] Triggers at correct time (check timezone handling)
- [ ] Reschedules after configuration changes
- [ ] Handles DST transitions correctly
- [ ] Logs execution to database

### Playlist Building Service
- [ ] Fetches newest episodes from selected podcasts
- [ ] Fetches tracks from selected music source (Daily Mix or Top Tracks)
- [ ] Builds queue with alternating pattern (episode → 3 songs → episode...)
- [ ] Handles missing episodes gracefully
- [ ] Handles insufficient music tracks (reshuffles/recycles)
- [ ] Returns empty playlist when no content available

## Frontend Testing

### Alarm Status Component
- [ ] Displays current alarm status (Ready/Playing/Not Configured)
- [ ] Shows next alarm time correctly
- [ ] Master toggle works (enables/disables alarm)
- [ ] Visual feedback on toggle state change
- [ ] Updates status when alarm is playing

### Alarm Configuration Component
- [ ] Time picker allows selecting hours and minutes
- [ ] Weekday checkboxes work correctly
- [ ] Volume slider updates value display
- [ ] Save button persists changes to backend
- [ ] Shows success/error feedback after save
- [ ] Loads existing configuration on mount

### Sonos Speaker Selection Component
- [ ] Discover Speakers button triggers discovery
- [ ] Displays all discovered speakers
- [ ] Checkbox selection works correctly
- [ ] Save button persists selected speakers
- [ ] Shows currently selected speakers
- [ ] Handles discovery errors gracefully

### Podcast Selection Component
- [ ] "Connect Spotify" button redirects to auth flow
- [ ] Shows authenticated state after login
- [ ] Loads followed podcasts after authentication
- [ ] Checkbox selection works correctly
- [ ] Search/filter functionality works
- [ ] Save button persists selected podcasts
- [ ] Shows loading state during fetch

### Control Panel Component
- [ ] "Test Alarm Now" button triggers immediate alarm
- [ ] "Stop Playback" button stops current alarm
- [ ] Shows playback status during test
- [ ] Displays last alarm log (timestamp, success/failure)
- [ ] Provides feedback on button actions

### Music Source Selection
- [ ] Dropdown shows all music source options
- [ ] Selection persists on save
- [ ] Loads current selection on mount

## Integration Testing

### End-to-End Alarm Flow
1. [ ] Configure alarm (time, weekdays, volume)
2. [ ] Select Sonos speakers
3. [ ] Authenticate with Spotify
4. [ ] Select podcasts
5. [ ] Select music source
6. [ ] Enable alarm
7. [ ] Trigger test alarm
8. [ ] Verify playback starts correctly
9. [ ] Stop playback
10. [ ] Wait for scheduled alarm time
11. [ ] Verify alarm triggers automatically
12. [ ] Verify content plays in correct order (podcast → songs → podcast...)

### Error Scenarios
- [ ] No speakers selected - shows appropriate error
- [ ] No podcasts selected - falls back to music only
- [ ] No Spotify authentication - shows "Connect Spotify" prompt
- [ ] Speakers unavailable - tries configured speakers only, never falls back to others
- [ ] Spotify API failure - retries and shows error if persistent
- [ ] Network offline during alarm - logs error and fails gracefully
- [ ] App restart - reloads configuration and reschedules alarm

### Speaker Safety
- [ ] Alarm ONLY plays on configured speakers
- [ ] If configured speakers unavailable, does NOT play on other speakers
- [ ] Fails gracefully if no configured speakers available
- [ ] Logs error when speakers unavailable

## Mobile Responsiveness

Test on multiple devices/screen sizes:

### Phone (iOS Safari, Chrome)
- [ ] Layout adjusts for narrow screens
- [ ] Touch targets are appropriately sized
- [ ] All controls accessible without horizontal scroll
- [ ] Time picker works on mobile
- [ ] Volume slider usable with touch
- [ ] Buttons are finger-friendly size

### Tablet (iPad Safari, Chrome)
- [ ] Layout uses available space effectively
- [ ] All components visible and functional
- [ ] Touch interactions work smoothly

### Desktop Browser
- [ ] Layout looks clean and organized
- [ ] All features accessible
- [ ] Responsive to window resizing

## Performance Testing

- [ ] App starts and loads configuration quickly (< 2 seconds)
- [ ] Speaker discovery completes in reasonable time (< 10 seconds)
- [ ] Podcast fetching completes quickly (< 5 seconds)
- [ ] Test alarm triggers within 2 seconds
- [ ] Database queries are fast
- [ ] No memory leaks during long-running operation

## Production Deployment

- [ ] PM2 starts app correctly with `npm run deploy`
- [ ] App restarts automatically on crash
- [ ] Logs written to file correctly
- [ ] Environment variables loaded from .env
- [ ] Build process completes successfully
- [ ] Serves production React build at root URL
- [ ] API routes work correctly with production build

## Database Testing

- [ ] SQLite database initializes correctly on first run
- [ ] Tables created with correct schema
- [ ] Configuration persists across restarts
- [ ] Selected speakers persist correctly
- [ ] Selected podcasts persist correctly
- [ ] Spotify tokens persist and refresh correctly
- [ ] Alarm logs written correctly

## Logs and Monitoring

- [ ] Application logs written to logs/combined.log
- [ ] Error logs written to logs/error.log
- [ ] Logs include timestamps
- [ ] Log rotation configured (if using Winston)
- [ ] Alarm execution logged with details
- [ ] Errors logged with stack traces

---

## Testing Notes

### Manual Testing
For end-to-end testing, use the "Test Alarm Now" button in the web UI. This triggers the full alarm sequence immediately without waiting for the scheduled time.

### Automated Testing
Currently, the project uses manual testing. Future enhancements could include:
- Unit tests for services (Spotify, Sonos, Playlist building)
- Integration tests for API endpoints
- React component tests with Jest/React Testing Library

### Common Issues

**Speakers not discovered:**
- Verify Sonos speakers on same network
- Check firewall settings
- Try `npm run deploy` to restart app

**Spotify authentication fails:**
- Verify CLIENT_ID and CLIENT_SECRET in .env
- Check REDIRECT_URI matches Spotify app settings
- Ensure callback URL accessible from browser

**Alarm doesn't trigger:**
- Check alarm is enabled (toggle ON)
- Verify correct weekdays selected
- Check system timezone matches expected time
- Review logs for errors

**Playback fails:**
- Verify Spotify Premium account
- Check speakers are powered on and connected
- Verify network connectivity
- Review logs for Sonos/Spotify errors
