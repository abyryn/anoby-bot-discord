import { BotClient } from '../client.js';
import { logger } from '../../utils/logger.js';

export function setupReadyEvent(client: BotClient) {
  client.once('ready', () => {
    logger.info(`[INFO] Discord connected`);
    logger.info(`[INFO] Logged in as ${client.user?.tag}`);
    logger.info(`[INFO] Loaded ${client.commands.size} commands`);
  });
}
