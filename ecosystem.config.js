// Optional PM2 configuration — for users who want background process management.
// NOTE: On macOS, PM2-managed processes are blocked from accessing the local network,
// which prevents Sonos speaker discovery. Use the PodcastAlarmClock.app wrapper instead.
module.exports = {
  apps: [{
    name: 'podcast-alarm-clock',
    script: 'server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
