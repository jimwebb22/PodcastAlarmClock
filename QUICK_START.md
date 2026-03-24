# Quick Start — Podcast Alarm Clock

## First-time setup (any platform)

```bash
git clone <repo-url>
cd PodcastAlarmClock
npm run setup
npm start
```

Open **http://localhost:3001**

## What `npm run setup` does

1. Copies `.env.example` → `.env` (skips if `.env` already exists)
2. Runs `npm install` (installs server + client dependencies)
3. Runs `npm run build` (builds the React UI)

## First-time configuration

1. **Speakers** — Click "Discover Speakers", select the ones to use for alarms
2. **Podcasts** — Paste one or more RSS feed URLs and click Add
3. **Alarm** — Set time, select days, set volume, click Save
4. **Enable** — Toggle the alarm ON
5. **Test** — Click "Test Alarm Now" to confirm everything works

## macOS: Native App (recommended)

For a Dock icon and no Terminal window required:

```bash
brew install --cask platypus
# Platypus.app → Settings → Install Command Line Tool
bash scripts/build-macos-app.sh
# Then open /Applications/PodcastAlarmClock.app
```

After any code change: `bash scripts/build-macos-app.sh` (quit app first)

## Common commands

```bash
npm start                  # start server (http://localhost:3001)
npm run dev                # start with auto-reload (development)
npm run build              # rebuild React UI
bash scripts/build-macos-app.sh  # rebuild and redeploy macOS app

# Clear played episode history (to replay episodes during testing)
curl -X DELETE http://localhost:3001/api/podcasts/played

# View logs (macOS app)
tail -f ~/Library/Logs/PodcastAlarmClock/server.log

# View database (macOS app)
sqlite3 ~/Library/Application\ Support/PodcastAlarmClock/podcast-alarm.db ".tables"
```

## More detail

See **README.md** for full documentation, API reference, and troubleshooting.
