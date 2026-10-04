import { BotClient } from '../client.js';
import { logger } from '../../utils/logger.js';
import { afkService } from '../../services/music/afk.service.js';

export function setupReadyEvent(client: BotClient) {
  client.once('ready', async () => {
    logger.info(`[INFO] Discord connected`);
    logger.info(`[INFO] Logged in as ${client.user?.tag}`);
    logger.info(`[INFO] Loaded ${client.commands.size} commands`);

    try {
      await afkService.init();
      await afkService.reconnectAll();
    } catch (err) {
      logger.error({ err }, '[AFK] Error initializing AFK service on client ready');
    }
  });
}
