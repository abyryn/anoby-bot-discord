import { Command, CommandContext } from '../../types/index.js';
import { SearchService } from '../../services/music/search.service.js';
import { PlayerService } from '../../services/music/player.service.js';
import { QueueService } from '../../services/music/queue.service.js';
import { isInVoiceChannel } from '../../utils/permissions.js';
import { embeds } from '../../utils/embeds.js';
import { createMusicActionRow, setupMusicComponentCollector } from '../../utils/musicButtons.js';
import { GuildMember, TextChannel, Message } from 'discord.js';

const command: Command = {
  name: 'play',
  description: 'Play a song from YouTube, Spotify, or Soundcloud',
  aliases: ['p'],
  execute: async (ctx: CommandContext) => {
    if (!ctx.message?.member || !isInVoiceChannel(ctx.message.member)) {
      await ctx.reply({ embeds: [embeds.error('You need to be in a voice channel to play music!')] });
      return;
    }

    if (ctx.args.length === 0) {
      await ctx.reply({ embeds: [embeds.error('Please provide a search query or URL.')] });
      return;
    }

    const query = ctx.args.join(' ');
    const member = ctx.message.member as GuildMember;
    const voiceChannelId = member.voice.channelId!;
    const textChannelId = ctx.message.channel.id;
    const guildId = ctx.guildId!;

    const tracks = await SearchService.search(query, member.user.username);
    if (!tracks || tracks.length === 0) {
      await ctx.reply({ embeds: [embeds.error('No results found.')] });
      return;
    }

    let trackToPlay = tracks[0];

    if (!/^https?:\/\//.test(query) && tracks.length > 1) {
      const selectionEmbed = embeds.music('Select a Track', tracks.map((t, i) => `${i + 1}. [${t.title}](${t.url})`).join('\n'));
      const selectionMsg = await ctx.reply({ embeds: [selectionEmbed] }) as Message;
      
      try {
        const filter = (m: Message) => m.author.id === ctx.authorId && /^[1-5]$/.test(m.content);
        const collected = await (ctx.message.channel as TextChannel).awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        const choice = parseInt(collected.first()!.content, 10);
        trackToPlay = tracks[choice - 1];
        await selectionMsg.delete().catch(() => {});
      } catch (e) {
        await ctx.reply({ embeds: [embeds.error('Selection timed out.')] });
        return;
      }
    }

    await PlayerService.play(guildId, voiceChannelId, textChannelId, trackToPlay);
    
    const queue = QueueService.getQueue(guildId);
    if (queue && queue.tracks.length === 1) {
      // It will start playing now, let player.on('start') handle the message or we just send here
      const msg = await ctx.reply({ 
        embeds: [embeds.music('Now Playing', `[${trackToPlay.title}](${trackToPlay.url})`)],
        components: createMusicActionRow()
      }) as Message;
      setupMusicComponentCollector(msg, guildId);
    } else {
      await ctx.reply({ embeds: [embeds.music('Added to Queue', `[${trackToPlay.title}](${trackToPlay.url})`)] });
    }
  }
};

export default command;
