import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMessageCreateEvent } from '../src/bot/events/messageCreate.js';
import { BotClient } from '../src/bot/client.js';
import { env } from '../src/config/env.js';
import { Message } from 'discord.js';

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Channel Restriction (BOT_CHANNEL_ID)', () => {
  let client: BotClient;
  let mockCommandExecute: ReturnType<typeof vi.fn>;
  let eventHandler: (message: Message) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();

    client = {
      commands: new Map(),
      aliases: new Map(),
      on: vi.fn((event: string, handler: (message: Message) => Promise<void>) => {
        if (event === 'messageCreate') {
          eventHandler = handler;
        }
      }),
    } as unknown as BotClient;

    mockCommandExecute = vi.fn().mockResolvedValue(undefined);
    client.commands.set('ping', {
      name: 'ping',
      description: 'Ping command',
      aliases: [],
      execute: mockCommandExecute,
    });

    setupMessageCreateEvent(client);
  });

  it('should allow command execution when BOT_CHANNEL_ID is not configured', async () => {
    (env as Record<string, unknown>).BOT_CHANNEL_ID = undefined;

    const mockMessage = {
      author: { bot: false, id: 'user-1' },
      guild: { id: 'guild-1' },
      channel: { id: 'channel-any' },
      content: 'A!ping',
      reply: vi.fn().mockResolvedValue({}),
    } as unknown as Message;

    await eventHandler(mockMessage);

    expect(mockCommandExecute).toHaveBeenCalledTimes(1);
    expect(mockMessage.reply).not.toHaveBeenCalled();
  });

  it('should allow command execution when sent in the allowed channel', async () => {
    (env as Record<string, unknown>).BOT_CHANNEL_ID = 'channel-allowed-1';

    const mockMessage = {
      author: { bot: false, id: 'user-1' },
      guild: { id: 'guild-1' },
      channel: { id: 'channel-allowed-1' },
      content: 'A!ping',
      reply: vi.fn().mockResolvedValue({}),
    } as unknown as Message;

    await eventHandler(mockMessage);

    expect(mockCommandExecute).toHaveBeenCalledTimes(1);
    expect(mockMessage.reply).not.toHaveBeenCalled();
  });

  it('should allow command execution in a thread belonging to the allowed channel', async () => {
    (env as Record<string, unknown>).BOT_CHANNEL_ID = 'channel-allowed-1';

    const mockMessage = {
      author: { bot: false, id: 'user-1' },
      guild: { id: 'guild-1' },
      channel: { id: 'thread-999', parentId: 'channel-allowed-1' },
      content: 'A!ping',
      reply: vi.fn().mockResolvedValue({}),
    } as unknown as Message;

    await eventHandler(mockMessage);

    expect(mockCommandExecute).toHaveBeenCalledTimes(1);
    expect(mockMessage.reply).not.toHaveBeenCalled();
  });

  it('should block command execution and send warning when sent in an unauthorized channel', async () => {
    (env as Record<string, unknown>).BOT_CHANNEL_ID = 'channel-allowed-1';

    const replyMock = vi.fn().mockResolvedValue({});
    const mockMessage = {
      author: { bot: false, id: 'user-1' },
      guild: { id: 'guild-1' },
      channel: { id: 'channel-other' },
      content: 'A!ping',
      reply: replyMock,
    } as unknown as Message;

    await eventHandler(mockMessage);

    expect(mockCommandExecute).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledTimes(1);
    const replyArg = replyMock.mock.calls[0][0];
    expect(replyArg.embeds[0].data.description).toContain('<#channel-allowed-1>');
  });

  it('should support multiple comma-separated channel IDs', async () => {
    (env as Record<string, unknown>).BOT_CHANNEL_ID = 'channel-allowed-1, channel-allowed-2';

    const replyMockCh2 = vi.fn().mockResolvedValue({});
    const mockMessageCh2 = {
      author: { bot: false, id: 'user-1' },
      guild: { id: 'guild-1' },
      channel: { id: 'channel-allowed-2' },
      content: 'A!ping',
      reply: replyMockCh2,
    } as unknown as Message;

    await eventHandler(mockMessageCh2);
    expect(mockCommandExecute).toHaveBeenCalledTimes(1);

    const replyMockBlocked = vi.fn().mockResolvedValue({});
    const mockMessageBlocked = {
      author: { bot: false, id: 'user-1' },
      guild: { id: 'guild-1' },
      channel: { id: 'channel-blocked' },
      content: 'A!ping',
      reply: replyMockBlocked,
    } as unknown as Message;

    await eventHandler(mockMessageBlocked);
    expect(mockCommandExecute).toHaveBeenCalledTimes(1); // Not called again
    expect(replyMockBlocked).toHaveBeenCalledTimes(1);
    const replyArg = replyMockBlocked.mock.calls[0][0];
    expect(replyArg.embeds[0].data.description).toContain('<#channel-allowed-1>');
    expect(replyArg.embeds[0].data.description).toContain('<#channel-allowed-2>');
  });
});
