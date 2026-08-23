import { client } from './bot/client.js';
import { loadCommands } from './bot/handlers/commandHandler.js';
import { setupReadyEvent } from './bot/events/ready.js';
import { setupMessageCreateEvent } from './bot/events/messageCreate.js';
import { logger } from './utils/logger.js';
import { initLavalink, getShoukaku } from './services/music/lavalink.service.js';
import { prisma } from './database/prisma.js';

async function bootstrap() {
  try {
    setupReadyEvent(client);
    setupMessageCreateEvent(client);
    
    await loadCommands(client);
    await client.start();
    initLavalink();

    const gracefulShutdown = async (signal: string) => {
      logger.info(`[INFO] Received ${signal}. Starting graceful shutdown...`);
      try {
        const shoukaku = getShoukaku();
        if (shoukaku) {
          logger.info('[INFO] Destroying Shoukaku...');
          for (const name of shoukaku.nodes.keys()) {
            shoukaku.removeNode(name);
          }
        }
      } catch (err) {
        logger.error({ err }, 'Error destroying Shoukaku');
      }

      try {
        logger.info('[INFO] Disconnecting Prisma...');
        await prisma.$disconnect();
      } catch (err) {
        logger.error({ err }, 'Error disconnecting Prisma');
      }

      try {
        logger.info('[INFO] Destroying Discord client...');
        client.destroy();
      } catch (err) {
        logger.error({ err }, 'Error destroying Discord client');
      }
      
      logger.info('[INFO] Shutdown complete. Exiting.');
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    logger.error({ err: error }, 'Failed to start application');
    process.exit(1);
  }
}

bootstrap();
