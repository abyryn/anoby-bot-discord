import { Command, CommandContext } from '../../types/index.js';
import { isInVoiceChannel } from '../../utils/permissions.js';
import { embeds } from '../../utils/embeds.js';
import { voiceReceiverService } from '../../services/voice-ai/voice-receiver.service.js';
import { ttsService } from '../../services/voice-ai/tts.service.js';
import { GuildMember } from 'discord.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  name: 'voiceai',
  description: 'Komunikasi dua arah dengan AI secara langsung di Voice Channel',
  aliases: ['vai', 'ai-voice', 'suara'],
  execute: async (ctx: CommandContext) => {
    try {
      const subCommand = (ctx.args[0] || 'help').toLowerCase();
      const member = ctx.message?.member as GuildMember;
      const guildId = ctx.guildId!;

      if (subCommand === 'start' || subCommand === 'join' || subCommand === 'on') {
        if (!member || !isInVoiceChannel(member)) {
          await ctx.reply({ embeds: [embeds.error('Kamu harus berada di Voice Channel untuk mengaktifkan Voice AI!')] });
          return;
        }

        const voiceChannel = member.voice.channel!;
        const textChannelId = ctx.message?.channel.id || ctx.channelId;

        const session = await voiceReceiverService.join(
          guildId,
          voiceChannel.id,
          textChannelId,
          voiceChannel.guild.voiceAdapterCreator
        );

        const currentVoiceName = ttsService.getVoice().includes('Gadis') ? 'Gadis (Wanita)' : 'Ardi (Pria)';

        await ctx.reply({
          embeds: [
            embeds.info(
              `🎙️ **Voice AI Aktif di Channel: \`${voiceChannel.name}\`**\n\n` +
              `🗣️ **Cara Pakai:** Cukup bicara di mic, bot akan menyimak dan langsung membalas dengan suara!\n` +
              `🔊 **Suara AI Saat Ini:** \`${currentVoiceName}\`\n\n` +
              `💡 *Tips:* Ketik \`A!voiceai voice ardi\` untuk suara pria atau \`A!voiceai stop\` untuk mengakhiri.`
            )
          ]
        });

        // Greet user in voice channel
        setTimeout(() => {
          voiceReceiverService.speakText(guildId, 'Halo semuanya! Voice AI Anoby Store sudah aktif. Silakan berbicara di mic ya!').catch(() => {});
        }, 1000);

        return;
      }

      if (subCommand === 'stop' || subCommand === 'leave' || subCommand === 'off') {
        if (!voiceReceiverService.isSessionActive(guildId)) {
          await ctx.reply({ embeds: [embeds.error('Voice AI sedang tidak aktif di server ini.')] });
          return;
        }

        voiceReceiverService.leave(guildId);
        await ctx.reply({ embeds: [embeds.info('🛑 Voice AI telah dinonaktifkan dan bot telah keluar dari Voice Channel.')] });
        return;
      }

      if (subCommand === 'voice' || subCommand === 'suara') {
        const selectedVoice = (ctx.args[1] || '').toLowerCase();
        if (selectedVoice === 'ardi' || selectedVoice === 'pria' || selectedVoice === 'cowok') {
          ttsService.setVoice('ardi');
          await ctx.reply({ embeds: [embeds.info('🔊 Suara Voice AI berhasil diubah ke **Ardi (Pria)**.')] });
        } else if (selectedVoice === 'gadis' || selectedVoice === 'wanita' || selectedVoice === 'cewek') {
          ttsService.setVoice('gadis');
          await ctx.reply({ embeds: [embeds.info('🔊 Suara Voice AI berhasil diubah ke **Gadis (Wanita)**.')] });
        } else {
          await ctx.reply({
            embeds: [
              embeds.info(
                `🔊 **Pilihan Suara Voice AI:**\n` +
                `- \`A!voiceai voice gadis\` (Suara Wanita Indonesia)\n` +
                `- \`A!voiceai voice ardi\` (Suara Pria Indonesia)`
              )
            ]
          });
        }
        return;
      }

      if (subCommand === 'status') {
        const isActive = voiceReceiverService.isSessionActive(guildId);
        const voiceName = ttsService.getVoice().includes('Gadis') ? 'Gadis (Wanita)' : 'Ardi (Pria)';
        await ctx.reply({
          embeds: [
            embeds.info(
              `📊 **Status Voice AI:**\n` +
              `- Status: **${isActive ? '🟢 Aktif' : '🔴 Tidak Aktif'}**\n` +
              `- Suara: **${voiceName}**`
            )
          ]
        });
        return;
      }

      // Help menu for Voice AI
      await ctx.reply({
        embeds: [
          embeds.info(
            `🎙️ **Panduan Fitur Voice AI:**\n\n` +
            `• \`A!voiceai start\` — Mengaktifkan bot untuk mendengar mic & menjawab dengan suara di Voice Channel.\n` +
            `• \`A!voiceai stop\` — Mematikan Voice AI & bot keluar dari Voice Channel.\n` +
            `• \`A!voiceai voice <gadis|ardi>\` — Mengganti suara AI (Wanita / Pria).\n` +
            `• \`A!talk <pertanyaan>\` — Menanyakan sesuatu dan bot langsung menjawab lewat suara.\n` +
            `• \`A!voiceai status\` — Melihat status aktif Voice AI.`
          )
        ]
      });
    } catch (err: unknown) {
      logger.error({ err }, 'Error in voiceai command');
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses perintah Voice AI.';
      await ctx.reply({ embeds: [embeds.error(msg)] });
    }
  }
};

export default command;
