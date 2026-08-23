import { Command, CommandContext } from '../../types/index.js';
import { QueueService } from '../../services/music/queue.service.js';
import { getShoukaku } from '../../services/music/lavalink.service.js';
import { embeds } from '../../utils/embeds.js';
import { createMusicActionRow, setupMusicComponentCollector } from '../../utils/musicButtons.js';
import { Message } from 'discord.js';

const command: Command = {
  name: 'nowplaying',
  description: 'Show the current track',
  aliases: ['np'],
  execute: async (ctx: CommandContext) => {
    if (!ctx.guildId) return;

    const queue = QueueService.getQueue(ctx.guildId);
    if (!queue || queue.tracks.length === 0) {
      await ctx.reply({ embeds: [embeds.info('Nothing is playing right now.')] });
      return;
    }

    const currentTrack = queue.tracks[queue.current];
    const player = getShoukaku().players.get(ctx.guildId);

    const position = player ? player.position : 0;
    const duration = currentTrack.duration;

    const formatTime = (ms: number) => {
      const totalSeconds = Math.floor(ms / 1000);
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const desc = `[${currentTrack.title}](${currentTrack.url})\n\n` +
      `**Duration:** ${formatTime(position)} / ${formatTime(duration)}\n` +
      `**Requester:** ${currentTrack.requester}\n` +
      `**Volume:** ${queue.volume}%`;

    const msg = await ctx.reply({ 
      embeds: [embeds.music('Now Playing', desc)],
      components: createMusicActionRow()
    }) as Message;
    
    setupMusicComponentCollector(msg, ctx.guildId);
  }
};

export default command;
