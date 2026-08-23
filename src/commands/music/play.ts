import { Command, CommandContext } from '../../types/index.js';
import { SearchService } from '../../services/music/search.service.js';
import { PlayerService } from '../../services/music/player.service.js';
import { QueueService } from '../../services/music/queue.service.js';
import { isInVoiceChannel } from '../../utils/permissions.js';
import { embeds } from '../../utils/embeds.js';
import { createMusicActionRow, setupMusicComponentCollector } from '../../utils/musicButtons.js';
import { GuildMember, TextChannel, Message } from 'discord.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  name: 'play',
  description: 'Putar lagu dari YouTube, Spotify, atau SoundCloud',
  aliases: ['p'],
  execute: async (ctx: CommandContext) => {
    try {
      if (!ctx.message?.member || !isInVoiceChannel(ctx.message.member)) {
        await ctx.reply({ embeds: [embeds.error('Kamu harus berada di Voice Channel untuk memutar musik!')] });
        return;
      }

      if (ctx.args.length === 0) {
        await ctx.reply({ embeds: [embeds.error('Masukkan judul lagu atau link URL. Contoh: `A!play Mahalini Sial`')] });
        return;
      }

      const query = ctx.args.join(' ');
      const member = ctx.message.member as GuildMember;
      const voiceChannelId = member.voice.channelId!;
      const textChannelId = ctx.message.channel.id;
      const guildId = ctx.guildId!;

      const searchingMsg = await ctx.reply({ embeds: [embeds.info(`🔍 Mencari lagu: **${query}**...`)] }) as Message;

      const tracks = await SearchService.search(query, member.user.username);
      if (!tracks || tracks.length === 0) {
        await searchingMsg.edit({ embeds: [embeds.error(`Lagu tidak ditemukan untuk: **${query}**`)] });
        return;
      }

      let trackToPlay = tracks[0];

      if (!/^https?:\/\//.test(query) && tracks.length > 1) {
        const selectionEmbed = embeds.music(
          'Pilih Lagu (Ketik angka 1-5 di chat)', 
          tracks.map((t, i) => `**${i + 1}.** [${t.title}](${t.url}) - \`${t.author || 'Unknown'}\``).join('\n')
        );
        
        await searchingMsg.edit({ embeds: [selectionEmbed] });
        
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

      await searchingMsg.delete().catch(() => {});

      await PlayerService.play(guildId, voiceChannelId, textChannelId, trackToPlay);
      
      const queue = QueueService.getQueue(guildId);
      if (queue && queue.tracks.length <= 1) {
        const msg = await ctx.reply({ 
          embeds: [embeds.music('🎵 Sedang Memutar', `[${trackToPlay.title}](${trackToPlay.url})\n\n👤 Diminta oleh: <@${ctx.authorId}>`)],
          components: createMusicActionRow()
        }) as Message;
        setupMusicComponentCollector(msg, guildId);
      } else {
        await ctx.reply({ embeds: [embeds.music('✅ Ditambahkan ke Antrean', `[${trackToPlay.title}](${trackToPlay.url})\n\n👤 Diminta oleh: <@${ctx.authorId}>`)] });
      }
    } catch (err: unknown) {
      logger.error({ err }, 'Error in play command');
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat memutar musik.';
      await ctx.reply({ embeds: [embeds.error(message)] });
    }
  }
};

export default command;
