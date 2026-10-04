import { Command, CommandContext } from '../../types/index.js';
import { EmbedBuilder } from 'discord.js';
import { embeds } from '../../utils/embeds.js';
import { afkService } from '../../services/music/afk.service.js';
import { PlayerService, clearIdleTimer, startIdleTimer } from '../../services/music/player.service.js';
import { getShoukaku } from '../../services/music/lavalink.service.js';
import { QueueService } from '../../services/music/queue.service.js';

const command: Command = {
  name: 'afk',
  description: 'Aktifkan / nonaktifkan mode AFK 24/7 di Voice Channel',
  aliases: ['247', '24-7', 'stay', '24/7'],
  execute: async (ctx: CommandContext) => {
    if (!ctx.guildId || !ctx.message?.guild) {
      await ctx.reply({ embeds: [embeds.error('Command ini hanya dapat digunakan di server Discord.')] });
      return;
    }

    const guildId = ctx.guildId;
    const subCommand = ctx.args[0]?.toLowerCase();

    // 1. Check Status
    if (subCommand === 'status') {
      const isAfk = afkService.isAfk(guildId);
      const afkData = afkService.getAfkData(guildId);
      const channelDisplay = afkData?.voiceChannelId ? `<#${afkData.voiceChannelId}>` : 'Belum diatur';

      const statusEmbed = new EmbedBuilder()
        .setColor(isAfk ? 0x00ff00 : 0x7289da)
        .setTitle('📻 Status AFK 24/7 Voice Channel')
        .setDescription(
          `• **Status:** ${isAfk ? '🟢 **Aktif (24/7)**' : '🔴 **Nonaktif**'}\n` +
          `• **Voice Channel:** ${channelDisplay}\n\n` +
          `💡 *Ketik \`A!afk\` untuk mengaktifkan atau menonaktifkan mode standby 24/7.*`
        );

      await ctx.reply({ embeds: [statusEmbed] });
      return;
    }

    const currentAfk = afkService.isAfk(guildId);
    let shouldEnable: boolean;

    if (['on', 'enable', 'aktif', 'start'].includes(subCommand)) {
      shouldEnable = true;
    } else if (['off', 'disable', 'nonaktif', 'stop'].includes(subCommand)) {
      shouldEnable = false;
    } else {
      // Toggle mode
      shouldEnable = !currentAfk;
    }

    // 2. Disable AFK
    if (!shouldEnable) {
      if (!currentAfk) {
        await ctx.reply({
          embeds: [embeds.info('Mode AFK 24/7 saat ini sudah dalam keadaan **nonaktif**.')]
        });
        return;
      }

      await afkService.disableAfk(guildId);

      // If no music is currently playing, start the idle countdown
      try {
        const shoukaku = getShoukaku();
        const player = shoukaku.players.get(guildId);
        const queue = QueueService.getQueue(guildId);

        if (!player?.track || !queue || queue.tracks.length === 0) {
          startIdleTimer(guildId);
        }
      } catch (_) {}

      const offEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🔴 Mode AFK 24/7 Dinonaktifkan')
        .setDescription(
          'Mode AFK 24/7 telah dimatikan.\n\n' +
          '• Bot akan otomatis keluar dari voice channel jika tidak ada musik yang diputar.\n' +
          '• Gunakan `A!afk` kembali jika ingin mengaktifkan mode standby 24/7.'
        );

      await ctx.reply({ embeds: [offEmbed] });
      return;
    }

    // 3. Enable AFK
    const memberVoice = ctx.message.member?.voice;
    const botVoiceId = ctx.message.guild.members.me?.voice.channelId;

    const targetVoiceChannelId = memberVoice?.channelId || botVoiceId;

    if (!targetVoiceChannelId) {
      await ctx.reply({
        embeds: [embeds.error('Kamu harus bergabung ke **Voice Channel** terlebih dahulu untuk mengaktifkan mode AFK 24/7!')]
      });
      return;
    }

    // Check permissions in target voice channel
    const targetChannel = ctx.message.guild.channels.cache.get(targetVoiceChannelId);
    const botMember = ctx.message.guild.members.me;

    if (targetChannel && botMember) {
      const perms = targetChannel.permissionsFor(botMember);
      if (!perms?.has('ViewChannel') || !perms?.has('Connect')) {
        await ctx.reply({
          embeds: [embeds.error(`Bot tidak memiliki izin untuk melihat atau bergabung ke <#${targetVoiceChannelId}>.`)]
        });
        return;
      }
    }

    // Connect bot to voice channel
    try {
      await PlayerService.joinVoice(guildId, targetVoiceChannelId, ctx.channelId);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Gagal terhubung ke Voice Channel.';
      await ctx.reply({ embeds: [embeds.error(errMsg)] });
      return;
    }

    // Clear any existing idle timer
    clearIdleTimer(guildId);

    // Save AFK state to cache and database
    await afkService.setAfk(guildId, targetVoiceChannelId, ctx.channelId, true);

    const onEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🟢 Mode AFK 24/7 Diaktifkan')
      .setDescription(
        `Bot sekarang akan tetap standby **24/7** di voice channel <#${targetVoiceChannelId}>!\n\n` +
        `• Bot tidak akan disconnect otomatis meskipun antrean lagu kosong atau tidak ada aktivitas.\n` +
        `• Bot akan otomatis terhubung kembali jika server restart.\n` +
        `• Ketik \`A!afk\` atau \`A!afk off\` kapan saja untuk menonaktifkan.`
      );

    await ctx.reply({ embeds: [onEmbed] });
  }
};

export default command;
