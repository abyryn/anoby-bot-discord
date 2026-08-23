import { prisma } from '../../database/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export async function getHistory(userId: string, channelId: string): Promise<Array<{role: string, content: string}>> {
  try {
    const messages = await prisma.conversation.findMany({
      where: { userId, channelId },
      orderBy: { createdAt: 'desc' },
      take: env.MAX_AI_CONTEXT,
    });
    
    // Reverse to get chronological order for the AI
    return messages.reverse().map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  } catch (error) {
    logger.error({ err: error }, 'Error getting conversation history');
    return [];
  }
}

export async function addMessage(userId: string, channelId: string, role: string, content: string): Promise<void> {
  try {
    await prisma.conversation.create({
      data: {
        userId,
        channelId,
        role,
        content
      }
    });

    // Cleanup old messages if exceeding max context (rough cleanup)
    const count = await prisma.conversation.count({
      where: { userId, channelId }
    });

    if (count > env.MAX_AI_CONTEXT * 2) {
      const messages = await prisma.conversation.findMany({
        where: { userId, channelId },
        orderBy: { createdAt: 'desc' },
        skip: env.MAX_AI_CONTEXT,
      });

      if (messages.length > 0) {
        await prisma.conversation.deleteMany({
          where: {
            id: {
              in: messages.map(m => m.id)
            }
          }
        });
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Error adding message to conversation history');
  }
}

export async function clearHistory(userId: string, channelId: string): Promise<void> {
  try {
    await prisma.conversation.deleteMany({
      where: { userId, channelId }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error clearing conversation history');
  }
}
