import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { Command } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { Shoukaku } from 'shoukaku';

export class BotClient extends Client {
  public commands: Collection<string, Command> = new Collection();
  public aliases: Collection<string, string> = new Collection();
  public shoukaku!: Shoukaku;
  
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });
  }

  public async start() {
    try {
      await this.login(env.DISCORD_TOKEN);
      logger.info('Bot client initialized');
    } catch (error) {
      logger.error({ err: error }, 'Failed to start bot client');
      process.exit(1);
    }
  }
}

export const client = new BotClient();
