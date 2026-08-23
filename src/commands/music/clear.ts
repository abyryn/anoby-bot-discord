import { Command, CommandContext } from '../../types/index.js';
import { QueueService } from '../../services/music/queue.service.js';
import { isInVoiceChannel } from '../../utils/permissions.js';
import { embeds } from '../../utils/embeds.js';

const command: Command = {
  name: 'clear',
  description: 'Clear the queue but keep the current track playing',
  execute: async (ctx: CommandContext) => {
    if (!ctx.message?.member || !isInVoiceChannel(ctx.message.member)) {
      await ctx.reply({ embeds: [embeds.error('You need to be in a voice channel.')] });
      return;
    }

    if (!ctx.guildId) return;

    QueueService.clear(ctx.guildId);
    await ctx.reply({ embeds: [embeds.success('Queue cleared.')] });
  }
};

export default command;
