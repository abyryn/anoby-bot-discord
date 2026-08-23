import { Command, CommandContext } from '../../types/index.js';
import { QueueService } from '../../services/music/queue.service.js';
import { embeds } from '../../utils/embeds.js';

const command: Command = {
  name: 'queue',
  description: 'Show the music queue',
  aliases: ['q'],
  execute: async (ctx: CommandContext) => {
    if (!ctx.guildId) return;

    const queue = QueueService.getQueue(ctx.guildId);
    if (!queue || queue.tracks.length === 0) {
      await ctx.reply({ embeds: [embeds.info('The queue is empty.')] });
      return;
    }

    const currentTrack = queue.tracks[queue.current];
    let desc = `**Now Playing:**\n[${currentTrack.title}](${currentTrack.url})\n\n**Upcoming:**\n`;

    const upcoming = queue.tracks.slice(queue.current + 1, queue.current + 11);
    if (upcoming.length === 0) {
      desc += '*No more tracks in queue.*';
    } else {
      desc += upcoming.map((t, i) => `${i + 1}. [${t.title}](${t.url})`).join('\n');
      if (queue.tracks.length - queue.current - 1 > 10) {
        desc += `\n*...and ${queue.tracks.length - queue.current - 11} more.*`;
      }
    }

    await ctx.reply({ embeds: [embeds.music('Music Queue', desc)] });
  }
};

export default command;
