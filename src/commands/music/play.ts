import { Command, CommandContext } from '../../types/index.js';
import { SearchService } from '../../services/music/search.service.js';
import { PlayerService } from '../../services/music/player.service.js';
import { QueueService } from '../../services/music/queue.service.js';
import { isInVoiceChannel } from '../../utils/permissions.js';
import { embeds } from '../../utils/embeds.js';
import { createMusicActionRow, setupMusicComponentCollector } from '../../utils/musicButtons.js';
import { GuildMember, TextChannel, Message } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { SpotifyService } from '../../services/music/spotify.service.js';

const command: Command = {
  name: 'play',
  description: 'Putar lagu dari YouTube, Spotify (Track/Playlist/Album), atau SoundCloud',
  aliases: ['p'],
  execute: async (ctx: CommandContext) => {
    let searchingMsg: Message | null = null;
    try {
      if (!ctx.message?.member || !isInVoiceChannel(ctx.message.member)) {
        await ctx.reply({ embeds: [embeds.error('Kamu harus berada di Voice Channel untuk memutar musik!')] });
        return;
      }

      if (ctx.args.length === 0) {
        await ctx.reply({ embeds: [embeds.error('Masukkan judul lagu atau link URL (Spotify/YouTube/SoundCloud). Contoh: `A!play Mahalini Sial` atau `A!play https://open.spotify.com/playlist/...`')] });
        return;
      }

      const query = ctx.args.join(' ');
      const member = ctx.message.member as GuildMember;
      const voiceChannelId = member.voice.channelId!;
      const textChannelId = ctx.message.channel.id;
      const guildId = ctx.guildId!;

      const isSpotify = SpotifyService.isSpotifyUrl(query);
      const isUrl = /^https?:\/\//.test(query) || isSpotify;

      const searchPrompt = isSpotify 
        ? `🟢 Mengambil metadata Spotify: **${query}**...` 
        : `🔍 Mencari lagu: **${query}**...`;

      const msg = await ctx.reply({ embeds: [embeds.info(searchPrompt)] });
      if (msg instanceof Message) {
        searchingMsg = msg;
      }

      const tracks = await SearchService.search(query, member.user.username);
      if (!tracks || tracks.length === 0) {
        if (searchingMsg) {
          await searchingMsg.edit({ embeds: [embeds.error(`Lagu / Playlist tidak ditemukan untuk: **${query}**`)] });
        } else {
          await ctx.reply({ embeds: [embeds.error(`Lagu / Playlist tidak ditemukan untuk: **${query}**`)] });
        }
        return;
      }

      // If it's a playlist (multiple tracks from URL/Spotify)
      if (isUrl && tracks.length > 1) {
        if (searchingMsg) {
          await searchingMsg.delete().catch(() => {});
        }

        await PlayerService.playMultiple(guildId, voiceChannelId, textChannelId, tracks);

        const firstTrack = tracks[0];
        const playMsg = await ctx.reply({ 
          embeds: [embeds.music(
            '📂 Playlist Dimuat', 
            `Berhasil memuat **${tracks.length} lagu** ke antrean!\n\n🎵 **Sedang Memutar:** [${firstTrack.title}](${firstTrack.url})\n👤 **Diminta oleh:** <@${ctx.authorId}>`
          )],
          components: createMusicActionRow()
        }) as Message;
        setupMusicComponentCollector(playMsg, guildId);
        return;
      }

      let trackToPlay = tracks[0];

      // If it's a regular keyword search with multiple results, show 1-5 selection
      if (!isUrl && tracks.length > 1) {
        const selectionEmbed = embeds.music(
          'Pilih Lagu (Ketik angka 1-5 di chat)', 
          tracks.map((t, i) => `**${i + 1}.** [${t.title}](${t.url}) - \`${t.author || 'Unknown'}\``).join('\n')
        );
        
        if (searchingMsg) {
          await searchingMsg.edit({ embeds: [selectionEmbed] });
        }
        
        try {
          const filter = (m: Message) => m.author.id === ctx.authorId && /^[1-5]$/.test(m.content.trim());
          const collected = await (ctx.message.channel as TextChannel).awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
          const choice = parseInt(collected.first()!.content.trim(), 10);
          trackToPlay = tracks[choice - 1];
        } catch (e) {
          // Timeout, default to first track
          trackToPlay = tracks[0];
        }
      }

      if (searchingMsg) {
        await searchingMsg.delete().catch(() => {});
      }

      await PlayerService.play(guildId, voiceChannelId, textChannelId, trackToPlay);
      
      const queue = QueueService.getQueue(guildId);
      if (queue && queue.tracks.length <= 1) {
        const playMsg = await ctx.reply({ 
          embeds: [embeds.music('🎵 Sedang Memutar', `[${trackToPlay.title}](${trackToPlay.url})\n\n👤 Diminta oleh: <@${ctx.authorId}>`)],
          components: createMusicActionRow()
        }) as Message;
        setupMusicComponentCollector(playMsg, guildId);
      } else {
        await ctx.reply({ embeds: [embeds.music('✅ Ditambahkan ke Antrean', `[${trackToPlay.title}](${trackToPlay.url})\n\n👤 Diminta oleh: <@${ctx.authorId}>`)] });
      }
    } catch (err: unknown) {
      logger.error({ err }, 'Error in play command');
      if (searchingMsg) {
        await searchingMsg.delete().catch(() => {});
      }
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat memutar musik.';
      await ctx.reply({ embeds: [embeds.error(message)] });
    }
  }
};

export default command;
