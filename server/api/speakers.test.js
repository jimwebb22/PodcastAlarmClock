const request = require('supertest');
const express = require('express');

jest.mock('../services/sonos');
jest.mock('../db/models');

const sonos = require('../services/sonos');
const { getSelectedSpeakers, setSelectedSpeakers } = require('../db/models');
const speakersRouter = require('./speakers');

const app = express();
app.use(express.json());
app.use('/speakers', speakersRouter);

describe('POST /speakers/discover-by-ip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 400 when IP address is not provided', async () => {
    const res = await request(app)
      .post('/speakers/discover-by-ip')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('IP address required');
  });

  test('returns speaker info with RINCON UUID when IP connects successfully', async () => {
    sonos.discoverByIp.mockResolvedValue({
      uuid: 'RINCON_347E5C1234560400',
      name: 'Living Room',
      model: 'Sonos One',
      host: '192.168.1.100',
      deviceObject: {}
    });

    const res = await request(app)
      .post('/speakers/discover-by-ip')
      .send({ ip: '192.168.1.100' });

    expect(res.status).toBe(200);
    expect(res.body.speaker).toEqual({
      uuid: 'RINCON_347E5C1234560400',
      name: 'Living Room',
      model: 'Sonos One'
    });
    expect(sonos.discoverByIp).toHaveBeenCalledWith('192.168.1.100');
  });

  test('returns 500 with helpful message when IP is unreachable', async () => {
    sonos.discoverByIp.mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await request(app)
      .post('/speakers/discover-by-ip')
      .send({ ip: '192.168.1.100' });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('192.168.1.100');
  });
});
