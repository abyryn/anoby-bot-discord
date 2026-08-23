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
      if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY.trim() === '') {
        await ctx.reply({ embeds: [embeds.error('AI belum dikonfigurasi. Masukkan `GEMINI_API_KEY` di tab Environment Dokploy.')] });
        return;
      }

      if (ctx.args.length === 0) {
        await ctx.reply({ embeds: [embeds.error('Berikan pertanyaan untuk AI. Contoh: `A!ai jelaskan apa itu ECU motor`')] });
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

      // Split response if longer than 2000 characters for Discord limit
      if (response.length <= 2000) {
        await ctx.reply(response);
      } else {
        const chunks = response.match(/[\s\S]{1,1950}/g) || [response];
        for (const chunk of chunks) {
          await ctx.reply(chunk);
        }
      }
    } catch (error: unknown) {
      logger.error({ err: error }, 'Error in ai command');
      const msg = error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses permintaan AI.';
      await ctx.reply({ embeds: [embeds.error(`Gagal mendapatkan jawaban AI: ${msg}`)] });
    }
  }
};

export default command;
