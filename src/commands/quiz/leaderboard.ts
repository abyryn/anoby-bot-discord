import { Command, CommandContext } from '../../types/index.js';
import { embeds } from '../../utils/embeds.js';
import { leaderboardService } from '../../services/quiz/leaderboard.service.js';
import { EmbedBuilder } from 'discord.js';

const command: Command = {
  name: 'leaderboard',
  description: 'Shows the quiz leaderboard.',
  execute: async (ctx: CommandContext) => {
    const top = await leaderboardService.getLeaderboard(10);
    
    if (top.length === 0) {
      await ctx.reply({ embeds: [embeds.info('Belum ada data leaderboard.')] });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('🏆 QUIZ LEADERBOARD 🏆')
      .setDescription(
        top.map((u, i) => `**${i + 1}. ${u.username}** - ${u.totalPoints} pts (${u.correctAnswers}/${u.totalAnswers} benar)`).join('\n')
      );

    await ctx.reply({ embeds: [embed] });
  },
};

export default command;
