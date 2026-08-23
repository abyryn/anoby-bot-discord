import { Command, CommandContext } from '../../types/index.js';
import { embeds } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { clearHistory } from '../../services/ai/conversation.service.js';

const command: Command = {
  name: 'ai-clear',
  description: 'Menghapus riwayat percakapan AI',
  execute: async (ctx: CommandContext) => {
    try {
      await clearHistory(ctx.authorId, ctx.channelId);
      await ctx.reply({ embeds: [embeds.success('Riwayat percakapan AI telah dihapus.')] });
    } catch (error) {
      logger.error({ err: error }, 'Error in ai-clear command');
      await ctx.reply({ embeds: [embeds.error('Terjadi kesalahan saat menghapus riwayat.')] });
    }
  }
};

export default command;
