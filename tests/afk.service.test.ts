import { describe, it, expect, vi, beforeEach } from 'vitest';
import { afkService } from '../src/services/music/afk.service.js';

// Mock prisma database client
vi.mock('../src/database/prisma.js', () => ({
  prisma: {
    afkConfig: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock lavalink and discord client
vi.mock('../src/services/music/lavalink.service.js', () => ({
  getShoukaku: vi.fn().mockReturnValue({
    players: new Map(),
    nodes: new Map(),
  }),
  getNode: vi.fn(),
}));

vi.mock('../src/bot/client.js', () => ({
  client: {
    guilds: {
      cache: new Map(),
    },
    channels: {
      fetch: vi.fn(),
    },
  },
}));

describe('AfkService', () => {
  const guildId = 'test-guild-123';
  const voiceChannelId = 'test-voice-456';
  const textChannelId = 'test-text-789';

  beforeEach(async () => {
    await afkService.disableAfk(guildId);
  });

  it('should initially report not afk for a new guild', () => {
    expect(afkService.isAfk('unknown-guild')).toBe(false);
  });

  it('should enable AFK and cache the voice channel data', async () => {
    await afkService.setAfk(guildId, voiceChannelId, textChannelId, true);

    expect(afkService.isAfk(guildId)).toBe(true);
    expect(afkService.getAfkChannel(guildId)).toBe(voiceChannelId);

    const data = afkService.getAfkData(guildId);
    expect(data).toBeDefined();
    expect(data?.guildId).toBe(guildId);
    expect(data?.voiceChannelId).toBe(voiceChannelId);
    expect(data?.textChannelId).toBe(textChannelId);
    expect(data?.isEnabled).toBe(true);
  });

  it('should update the voice channel when bot is moved', async () => {
    await afkService.setAfk(guildId, voiceChannelId, textChannelId, true);
    expect(afkService.getAfkChannel(guildId)).toBe(voiceChannelId);

    const newVoiceChannelId = 'test-voice-new-999';
    await afkService.updateAfkChannel(guildId, newVoiceChannelId);

    expect(afkService.getAfkChannel(guildId)).toBe(newVoiceChannelId);
    expect(afkService.isAfk(guildId)).toBe(true);
  });

  it('should disable AFK mode', async () => {
    await afkService.setAfk(guildId, voiceChannelId, textChannelId, true);
    expect(afkService.isAfk(guildId)).toBe(true);

    await afkService.disableAfk(guildId);
    expect(afkService.isAfk(guildId)).toBe(false);
  });
});
