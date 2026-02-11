# Quick Start Guide

Welcome! This guide will help you set up your Podcast Alarm Clock in just a few simple steps.

## Installation (One-Time Setup)

### Step 1: Download the Project

If you received this project as a zip file:
1. Double-click the zip file to extract it
2. Move the extracted folder to your Documents folder (or anywhere you like)

### Step 2: Run the Installer

1. Open the **PodcastAlarmClock** folder
2. **Double-click** `install.command`
3. If you see a security warning:
   - Right-click the file and select "Open"
   - Or go to System Settings → Privacy & Security → "Allow Anyway"
4. **If Node.js is not installed**, the installer will:
   - Automatically install it via Homebrew (if available), OR
   - Download and open the Node.js installer for you
   - After Node.js installs, run `install.command` again
5. Enter your Mac password when prompted (for PM2 installation)
6. Wait for installation to complete (2-5 minutes)
7. Press Enter when you see "Installation Complete"

**What the installer does:**
- Checks for Node.js and installs it if needed (fully automated!)
- Installs all required software packages
- Builds the web interface
- Sets up PM2 for background operation
- Authorizes the start/stop commands

**Note:** No manual Node.js installation required! The installer handles everything.

## Daily Use

### Starting the Server

1. **Double-click** `start-server.command`
2. Wait a few seconds for the server to start
3. Press Enter to close the window

### Opening the Alarm Clock

1. Open your web browser (Safari, Chrome, etc.)
2. Go to: **http://localhost:3001**
3. You'll see the Podcast Alarm Clock interface

### Configuring Your Alarm

#### 1. Add Podcast Feeds
- Find any podcast's RSS feed URL (see tips below)
- Paste it in the "Add Podcast RSS Feed" field
- Click "Add"
- Repeat for all podcasts you want in your alarm

**Finding RSS Feeds:**
- Search "[podcast name] RSS feed" on Google
- Check the podcast's website (usually in footer or "Subscribe" section)
- NPR podcasts: [https://www.npr.org/rss/](https://www.npr.org/rss/)

#### 2. Select Sonos Speakers
- Click "Discover Sonos Speakers"
- Check the boxes for speakers you want to use
- Click "Save Selected Speakers"

**Note:** Your Mac and Sonos speakers must be on the same Wi-Fi network.

#### 3. Set Alarm Time
- Choose your wake-up time
- Select which days the alarm should trigger
- Set your preferred volume (0-100)
- Toggle "Alarm Enabled" to ON (green)

#### 4. Test Your Alarm
- Click "Test Alarm Now" to hear it immediately
- Make sure the right speakers play
- Click "Stop Playback" when done testing

### Stopping the Server

When you want to shut down the alarm system:
1. **Double-click** `stop-server.command`
2. Press Enter to close the window

**Note:** The server must be running for the alarm to work, so keep it running if you want automatic wake-ups.

## Troubleshooting

### "Server already running" message
- You already started the server
- Just open http://localhost:3001 in your browser

### Can't discover Sonos speakers
- Make sure your Mac and Sonos are on the same Wi-Fi network
- Try restarting the Sonos app on your phone
- Restart the server (stop then start again)

### "Failed to parse feed" error
- Make sure you're using an RSS feed URL (not a website URL)
- Try opening the URL in your browser - you should see XML code

### Alarm didn't trigger
- Check that "Alarm Enabled" is toggled ON (green)
- Verify at least one weekday is selected
- Make sure you have at least one podcast feed added
- Check that the server is running

### Need more help?
- Check the full **README.md** file in the project folder
- Review the **TROUBLESHOOTING.md** file
- Check the logs folder for error messages

## Files You Can Double-Click

- **install.command** - One-time setup (run this first)
- **start-server.command** - Start the alarm server
- **stop-server.command** - Stop the alarm server
- **deploy.command** - Rebuild and restart after code changes

## Important Notes

- **Keep the server running** for automatic alarms to work
- **The server runs in the background** - you can close the terminal window
- **Your Mac must be awake and on** for the alarm to trigger
- **Energy Saver settings**: Make sure your Mac doesn't sleep when you need alarms

## First-Time Setup Checklist

- [ ] Install Node.js
- [ ] Run `install.command`
- [ ] Run `start-server.command`
- [ ] Open http://localhost:3001
- [ ] Add at least one podcast RSS feed
- [ ] Discover and select Sonos speakers
- [ ] Set alarm time and enable it
- [ ] Test with "Test Alarm Now" button
- [ ] Verify speakers play the podcast

**Congratulations!** You're all set up. Your alarm will now wake you up with fresh podcast episodes every day at your scheduled time.

---

**Questions or issues?** Check the full documentation in README.md or TROUBLESHOOTING.md files.
