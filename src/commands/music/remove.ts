import { Command, CommandContext } from '../../types/index.js';
import { QueueService } from '../../services/music/queue.service.js';
import { isInVoiceChannel } from '../../utils/permissions.js';
import { embeds } from '../../utils/embeds.js';

const command: Command = {
  name: 'remove',
  description: 'Remove a track from the queue by position',
  aliases: ['rm'],
  execute: async (ctx: CommandContext) => {
    if (!ctx.message?.member || !isInVoiceChannel(ctx.message.member)) {
      await ctx.reply({ embeds: [embeds.error('You need to be in a voice channel.')] });
      return;
    }

    if (!ctx.guildId) return;

    if (ctx.args.length === 0) {
      await ctx.reply({ embeds: [embeds.error('Please provide the queue position to remove.')] });
      return;
    }

    const index = parseInt(ctx.args[0], 10);
    const queue = QueueService.getQueue(ctx.guildId);

    if (!queue || isNaN(index) || index <= 0 || index + queue.current >= queue.tracks.length) {
      await ctx.reply({ embeds: [embeds.error('Invalid position.')] });
      return;
    }

    const removeIndex = queue.current + index;
    const removedTrack = queue.tracks[removeIndex];
    
    QueueService.removeTrack(ctx.guildId, removeIndex);
    
    if (removedTrack) {
      await ctx.reply({ embeds: [embeds.success(`Removed **${removedTrack.title}** from the queue.`)] });
    }
  }
};

export default command;
