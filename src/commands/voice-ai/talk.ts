import { Command, CommandContext } from '../../types/index.js';
import { isInVoiceChannel } from '../../utils/permissions.js';
import { embeds } from '../../utils/embeds.js';
import { voiceReceiverService } from '../../services/voice-ai/voice-receiver.service.js';
import { generateResponse } from '../../services/ai/gemini.service.js';
import { getHistory, addMessage } from '../../services/ai/conversation.service.js';
import { GuildMember, Message } from 'discord.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  name: 'talk',
  description: 'Tanya sesuatu ke AI dan dengarkan jawabannya lewat suara di Voice Channel',
  aliases: ['speak', 'bicara'],
  execute: async (ctx: CommandContext) => {
    let thinkingMsg: Message | null = null;
    try {
      const member = ctx.message?.member as GuildMember;
      const guildId = ctx.guildId!;

      if (!member || !isInVoiceChannel(member)) {
        await ctx.reply({ embeds: [embeds.error('Kamu harus berada di Voice Channel untuk menggunakan perintah `A!talk`!')] });
        return;
      }

      if (ctx.args.length === 0) {
        await ctx.reply({ embeds: [embeds.error('Masukkan pertanyaan atau topik obrolan. Contoh: `A!talk apa ibukota Indonesia?`')] });
        return;
      }

      const prompt = ctx.args.join(' ');
      const voiceChannel = member.voice.channel!;
      const textChannelId = ctx.message?.channel.id || ctx.channelId;

      const msg = await ctx.reply({ embeds: [embeds.info(`🧠 **Anoby AI sedang berpikir:** "${prompt}"...`)] });
      if (msg instanceof Message) {
        thinkingMsg = msg;
      }

      // Ensure bot is in voice channel
      if (!voiceReceiverService.isSessionActive(guildId)) {
        await voiceReceiverService.join(
          guildId,
          voiceChannel.id,
          textChannelId,
          voiceChannel.guild.voiceAdapterCreator
        );
      }

      // Get conversation history & generate response
      const history = await getHistory(ctx.authorId, textChannelId);
      const response = await generateResponse(prompt, history);

      // Save to conversation history
      await addMessage(ctx.authorId, textChannelId, 'user', prompt);
      await addMessage(ctx.authorId, textChannelId, 'ai', response);

      // Speak response in voice channel
      await voiceReceiverService.speakText(guildId, response);

      if (thinkingMsg) {
        await thinkingMsg.edit({
          embeds: [
            embeds.info(
              `🗣️ **Tanya:** "${prompt}"\n` +
              `🔊 **Anoby AI Berbicara:** "${response}"`
            )
          ]
        });
      }
    } catch (err: unknown) {
      logger.error({ err }, 'Error in talk command');
      if (thinkingMsg) {
        await thinkingMsg.delete().catch(() => {});
      }
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses jawaban suara.';
      await ctx.reply({ embeds: [embeds.error(msg)] });
    }
  }
};

export default command;
