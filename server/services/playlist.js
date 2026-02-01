const spotify = require('./spotify');
const { getSelectedPodcasts, getAlarmConfig } = require('../db/models');

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function getMusicTracks(musicSource) {
  switch (musicSource) {
    case 'daily_mix_1':
      return await spotify.getDailyMixTracks(1);
    case 'daily_mix_2':
      return await spotify.getDailyMixTracks(2);
    case 'daily_mix_3':
      return await spotify.getDailyMixTracks(3);
    case 'top_tracks':
      return await spotify.getTopTracks();
    default:
      throw new Error(`Unknown music source: ${musicSource}`);
  }
}

async function buildPlaylistQueue() {
  try {
    const config = await getAlarmConfig();
    const selectedPodcasts = await getSelectedPodcasts();

    if (selectedPodcasts.length === 0) {
      console.warn('No podcasts selected, will play music only');
    }

    // Fetch newest episode from each podcast
    const episodePromises = selectedPodcasts.map(podcast =>
      spotify.getShowEpisodes(podcast.show_id, 1)
    );
    const episodeArrays = await Promise.all(episodePromises);
    const episodes = episodeArrays
      .filter(arr => arr && arr.length > 0)
      .map(arr => arr[0]);

    if (episodes.length === 0 && selectedPodcasts.length > 0) {
      console.warn('No new episodes found, will play music only');
    }

    // Fetch music tracks
    const musicTracks = await getMusicTracks(config.music_source);
    const shuffledMusic = shuffleArray(musicTracks);

    // Build queue: episode -> 3 songs -> episode -> 3 songs ...
    const queue = [];
    const episodeNames = [];
    let musicIndex = 0;

    if (episodes.length > 0) {
      for (const episode of episodes) {
        // Add episode
        queue.push(episode.uri);
        episodeNames.push(episode.name);

        // Add 3 music tracks
        for (let i = 0; i < 3; i++) {
          if (musicIndex >= shuffledMusic.length) {
            // Reshuffle if we run out
            const newShuffled = shuffleArray(musicTracks);
            shuffledMusic.push(...newShuffled);
          }
          queue.push(shuffledMusic[musicIndex].uri);
          musicIndex++;
        }
      }
    } else {
      // No episodes, just play music
      queue.push(...shuffledMusic.map(track => track.uri));
    }

    return {
      queue,
      episodeNames,
      episodeCount: episodes.length,
      trackCount: queue.length
    };
  } catch (err) {
    console.error('Error building playlist:', err);
    throw err;
  }
}

async function buildPlaylistWithRetry(maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await buildPlaylistQueue();
    } catch (err) {
      lastError = err;
      console.error(`Playlist build attempt ${attempt} failed:`, err);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

module.exports = {
  buildPlaylistQueue,
  buildPlaylistWithRetry
};
