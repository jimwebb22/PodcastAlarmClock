const sonosService = require('./sonos');

// Mock the sonos npm library
jest.mock('sonos', () => ({
  Sonos: jest.fn()
}));

const { Sonos } = require('sonos');

describe('discoverByIp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module state between tests
    sonosService.__resetForTesting();
  });

  test('returns speaker info with stable RINCON UUID (not IP)', async () => {
    const mockDevice = {
      deviceDescription: jest.fn().mockResolvedValue({
        roomName: 'Living Room',
        modelName: 'Sonos One',
        UDN: 'uuid:RINCON_347E5C1234560400'
      })
    };
    Sonos.mockImplementation(() => mockDevice);

    const speaker = await sonosService.discoverByIp('192.168.1.100');

    expect(speaker.uuid).toBe('RINCON_347E5C1234560400');
    expect(speaker.host).toBe('192.168.1.100');
    expect(speaker.name).toBe('Living Room');
    expect(speaker.model).toBe('Sonos One');
  });

  test('uses displayName as fallback when roomName is missing', async () => {
    const mockDevice = {
      deviceDescription: jest.fn().mockResolvedValue({
        displayName: 'Bedroom Speaker',
        modelName: 'Sonos Beam',
        UDN: 'uuid:RINCON_AABBCC1234560400'
      })
    };
    Sonos.mockImplementation(() => mockDevice);

    const speaker = await sonosService.discoverByIp('192.168.1.101');

    expect(speaker.name).toBe('Bedroom Speaker');
  });

  test('throws when device is unreachable', async () => {
    Sonos.mockImplementation(() => ({
      deviceDescription: jest.fn().mockRejectedValue(new Error('Connection refused'))
    }));

    await expect(sonosService.discoverByIp('192.168.1.200')).rejects.toThrow('Connection refused');
  });

  test('makes discovered speaker available via getSpeakerByUuid using RINCON ID', async () => {
    const mockDevice = {
      deviceDescription: jest.fn().mockResolvedValue({
        roomName: 'Kitchen',
        modelName: 'Sonos Era 100',
        UDN: 'uuid:RINCON_KITCHEN1234560400'
      })
    };
    Sonos.mockImplementation(() => mockDevice);

    await sonosService.discoverByIp('192.168.1.50');

    // Lookup by RINCON ID, not IP
    const found = sonosService.getSpeakerByUuid('RINCON_KITCHEN1234560400');
    expect(found).toBeDefined();
    expect(found.name).toBe('Kitchen');
    expect(found.host).toBe('192.168.1.50');
  });

  test('updates existing entry when called again with same device (IP changed)', async () => {
    const mockDevice = {
      deviceDescription: jest.fn()
        .mockResolvedValueOnce({ roomName: 'Living Room', modelName: 'Sonos One', UDN: 'uuid:RINCON_ABC123' })
        .mockResolvedValueOnce({ roomName: 'Living Room', modelName: 'Sonos One', UDN: 'uuid:RINCON_ABC123' })
    };
    Sonos.mockImplementation(() => mockDevice);

    await sonosService.discoverByIp('192.168.1.100');
    await sonosService.discoverByIp('192.168.1.101'); // same device, new IP

    // Should not duplicate - still only one entry for same RINCON ID
    const found = sonosService.getSpeakerByUuid('RINCON_ABC123');
    expect(found).toBeDefined();
    expect(found.host).toBe('192.168.1.101'); // updated to new IP
  });
});
