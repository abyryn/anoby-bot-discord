import { Command, CommandContext } from '../../types/index.js';
import { env } from '../../config/env.js';
import { embeds } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { isRateLimited } from '../../services/ai/rate-limiter.service.js';
import { getHistory, addMessage } from '../../services/ai/conversation.service.js';
import { generateResponse } from '../../services/ai/gemini.service.js';

const command: Command = {
  name: 'ai',
  description: 'Chat dengan AnobyStore AI',
  aliases: ['ask', 'tanya'],
  execute: async (ctx: CommandContext) => {
    try {
      if (!env.GEMINI_API_KEY) {
        await ctx.reply({ embeds: [embeds.error('AI belum dikonfigurasi (GEMINI_API_KEY tidak ada).')] });
        return;
      }

      if (ctx.args.length === 0) {
        await ctx.reply({ embeds: [embeds.error('Berikan pertanyaan untuk AI.')] });
        return;
      }

      const prompt = ctx.args.join(' ');

      if (prompt.length > 2000) {
        await ctx.reply({ embeds: [embeds.error('Pertanyaan terlalu panjang. Maksimal 2000 karakter.')] });
        return;
      }

      if (isRateLimited(ctx.authorId)) {
        await ctx.reply({ embeds: [embeds.info('⏳ Tunggu beberapa detik sebelum bertanya lagi.')] });
        return;
      }

      const history = await getHistory(ctx.authorId, ctx.channelId);
      
      const response = await generateResponse(prompt, history);
      
      await addMessage(ctx.authorId, ctx.channelId, 'user', prompt);
      await addMessage(ctx.authorId, ctx.channelId, 'ai', response);

      // Reply directly with the content or an embed, PRD usually prefers replies
      await ctx.reply(response);
    } catch (error) {
      logger.error({ err: error }, 'Error in ai command');
      await ctx.reply({ embeds: [embeds.error('Terjadi kesalahan saat memproses permintaan AI.')] });
    }
  }
};

export default command;
