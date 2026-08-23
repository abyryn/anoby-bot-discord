import { Command, CommandContext } from '../../types/index.js';
import { embeds } from '../../utils/embeds.js';
import { quizService } from '../../services/quiz/quiz.service.js';
import { isModerator } from '../../utils/permissions.js';

const command: Command = {
  name: 'quizstop',
  description: 'Stops the active quiz in this channel.',
  execute: async (ctx: CommandContext) => {
    if (ctx.message && ctx.message.member && !isModerator(ctx.message.member)) {
      await ctx.reply({ embeds: [embeds.error('Hanya moderator yang dapat menghentikan kuis.')] });
      return;
    }

    if (!quizService.isActive(ctx.channelId)) {
      await ctx.reply({ embeds: [embeds.error('Tidak ada kuis yang sedang aktif di channel ini.')] });
      return;
    }

    quizService.endQuiz(ctx.channelId);
    await ctx.reply({ embeds: [embeds.success('Kuis telah dihentikan.')] });
  },
};

export default command;
