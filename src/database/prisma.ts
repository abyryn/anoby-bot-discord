import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export const prisma = new PrismaClient();

prisma.$connect()
  .then(() => {
    logger.info('Database connected successfully');
  })
  .catch((error: Error) => {
    logger.error({ err: error }, 'Failed to connect to database');
  });
