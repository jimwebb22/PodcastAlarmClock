const playlist = require('./playlist');

// Mock dependencies
jest.mock('./spotify');
jest.mock('../db/models');

const spotify = require('./spotify');
const models = require('../db/models');

describe('Playlist Builder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('builds queue with episodes and music', async () => {
    models.getAlarmConfig.mockResolvedValue({
      music_source: 'top_tracks'
    });

    models.getSelectedPodcasts.mockResolvedValue([
      { show_id: 'show1', show_name: 'Podcast 1' },
      { show_id: 'show2', show_name: 'Podcast 2' }
    ]);

    spotify.getShowEpisodes.mockResolvedValueOnce([
      {
        id: 'ep1',
        name: 'Episode 1',
        uri: 'spotify:episode:ep1'
      }
    ]);

    spotify.getShowEpisodes.mockResolvedValueOnce([
      {
        id: 'ep2',
        name: 'Episode 2',
        uri: 'spotify:episode:ep2'
      }
    ]);

    spotify.getTopTracks.mockResolvedValue([
      { uri: 'spotify:track:t1' },
      { uri: 'spotify:track:t2' },
      { uri: 'spotify:track:t3' },
      { uri: 'spotify:track:t4' },
      { uri: 'spotify:track:t5' },
      { uri: 'spotify:track:t6' }
    ]);

    const result = await playlist.buildPlaylistQueue();

    expect(result.episodeCount).toBe(2);
    expect(result.queue.length).toBe(8); // 2 episodes + 6 songs
    expect(result.queue[0]).toBe('spotify:episode:ep1');
    expect(result.queue[4]).toBe('spotify:episode:ep2');
  });

  test('handles no new episodes gracefully', async () => {
    models.getAlarmConfig.mockResolvedValue({
      music_source: 'top_tracks'
    });

    models.getSelectedPodcasts.mockResolvedValue([
      { show_id: 'show1', show_name: 'Podcast 1' }
    ]);

    spotify.getShowEpisodes.mockResolvedValue([]);

    spotify.getTopTracks.mockResolvedValue([
      { uri: 'spotify:track:t1' },
      { uri: 'spotify:track:t2' }
    ]);

    const result = await playlist.buildPlaylistQueue();

    expect(result.episodeCount).toBe(0);
    expect(result.queue.length).toBe(2);
    // Check that queue contains the tracks (order may vary due to shuffle)
    expect(result.queue).toContain('spotify:track:t1');
    expect(result.queue).toContain('spotify:track:t2');
  });
});
