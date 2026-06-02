# Project Status - Podcast Alarm Clock

**Last Updated:** 2026-03-24
**Current Branch:** `main`

## Executive Summary

The Podcast Alarm Clock is **fully operational**. The system wakes you up with fresh podcast episodes played through Sonos speakers, configured via a mobile-responsive web interface.

---

## Current Version: 2.1 — Distribution-Ready

### All Features Working

| Feature | Status | Notes |
|---------|--------|-------|
| RSS podcast feeds | ✅ Working | Any public podcast feed |
| Sonos speaker discovery | ✅ Working | SSDP auto-discovery + manual IP |
| Speaker grouping | ✅ Working | Dynamic grouping at alarm time |
| Alarm scheduling | ✅ Working | Time, weekdays, volume |
| Episode playback | ✅ Working | Sequential queue via x-rincon-queue |
| Played episode tracking | ✅ Working | Prevents replaying content |
| Web UI | ✅ Working | Mobile-responsive |
| macOS app launcher | ✅ Working | Native Dock icon via Platypus |
| Auto-start on login | ✅ Working | Via macOS Login Items |
| Clone-and-run setup | ✅ Working | `npm run setup && npm start` |

---

## How to Run

### Primary Method: PodcastAlarmClock.app

The server runs inside a native macOS app — no Terminal window required.

```bash
# Build the app (one-time, or after moving the project)
bash scripts/build-macos-app.sh

# Launch: click PodcastAlarmClock.app or the Dock icon
# Stop: right-click Dock icon → Quit, or Cmd+Q
# Logs: tail -f logs/server.log
```

**First launch only:**
- Right-click → Open → Open (Gatekeeper bypass for unsigned app)
- Allow Local Network access when prompted (required for Sonos)

**Auto-start on login:**
- System Settings → General → Login Items → add `PodcastAlarmClock.app`

### Fallback: Terminal Window

```bash
# Requires Terminal window to stay open
./start-server.command   # double-click or run directly
./stop-server.command
```

> **Do NOT use PM2 for production.** macOS blocks PM2-managed processes from accessing the local network, which breaks Sonos speaker discovery.

---

## Architecture

### Key Technical Details

- **Network access**: Node process must be a child of an app bundle with Local Network permission. `PodcastAlarmClock.app` (bundle ID: `com.local.podcast-alarm-clock`) receives this permission on first launch.
- **Platypus**: Wraps `scripts/platypus-launcher.sh` into a native Cocoa app. Rebuild with `bash scripts/build-macos-app.sh`.
- **Queue playback**: Uses `x-rincon-queue:RINCON_xxx#0` URI after populating queue to ensure sequential episode playback.
- **Played episodes**: Tracked in `played_episodes` SQLite table to avoid repeating content.

### Scripts

| File | Purpose |
|------|---------|
| `scripts/build-macos-app.sh` | Builds `PodcastAlarmClock.app` using Platypus CLI |
| `scripts/platypus-launcher.sh` | Launcher script inside the app (logs to `logs/server.log`) |
| `scripts/build-icon.sh` | Generates `.icns` from `client/public/logo512.png` |

---

## Maintenance

### Clear Played Episodes (for testing)
```bash
sqlite3 podcast-alarm.db "DELETE FROM played_episodes;"
# Or via API:
curl -X DELETE http://localhost:3001/api/podcasts/played
```

### View Logs
```bash
tail -f logs/server.log
```

### Rebuild App (after moving project or updating launcher)
```bash
bash scripts/build-macos-app.sh
```

### Rebuild App Prerequisites
```bash
brew install --cask platypus
# Then install CLI: Platypus.app → Settings → Install Command Line Tool
```

---

## Known Limitations

1. **Single alarm** — database designed for one alarm configuration
2. **Local network required** — Sonos speakers must be on same network as server
3. **Mac must be awake** — no alarms if Mac is asleep or shut down
4. **Unsigned app** — Gatekeeper bypass required once on first launch
5. **No snooze** — alarm plays once; user stops it manually

---

## Future Enhancements

- Multiple alarms
- Snooze functionality
- Fade-in volume
- Local music file support
- Internet radio integration
