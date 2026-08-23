import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';

export class LeaderboardService {
  async updateScore(discordId: string, username: string, points: number, correct: boolean): Promise<void> {
    try {
      let user = await prisma.user.findUnique({ where: { discordId } });
      if (!user) {
        user = await prisma.user.create({ data: { discordId, username } });
      } else if (user.username !== username) {
        user = await prisma.user.update({ where: { id: user.id }, data: { username } });
      }

      const score = await prisma.quizScore.findFirst({ where: { userId: user.id } });
      
      if (score) {
        await prisma.quizScore.update({
          where: { id: score.id },
          data: {
            points: { increment: points },
            correctAnswers: { increment: correct ? 1 : 0 },
            totalAnswers: { increment: 1 },
          },
        });
      } else {
        await prisma.quizScore.create({
          data: {
            userId: user.id,
            points,
            correctAnswers: correct ? 1 : 0,
            totalAnswers: 1,
          },
        });
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to update leaderboard score');
    }
  }

  async getLeaderboard(limit: number = 10): Promise<Array<{ username: string; totalPoints: number; correctAnswers: number; totalAnswers: number }>> {
    try {
      const scores = await prisma.quizScore.findMany({
        take: limit,
        orderBy: { points: 'desc' },
        include: { user: true },
      });

      return scores.map((s) => ({
        username: s.user.username,
        totalPoints: s.points,
        correctAnswers: s.correctAnswers,
        totalAnswers: s.totalAnswers,
      }));
    } catch (error) {
      logger.error({ err: error }, 'Failed to get leaderboard');
      return [];
    }
  }
}

export const leaderboardService = new LeaderboardService();
