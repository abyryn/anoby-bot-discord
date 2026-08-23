import { Command, CommandContext } from '../../types/index.js';
import { QueueService } from '../../services/music/queue.service.js';
import { isInVoiceChannel } from '../../utils/permissions.js';
import { embeds } from '../../utils/embeds.js';

const command: Command = {
  name: 'shuffle',
  description: 'Shuffle the queue',
  execute: async (ctx: CommandContext) => {
    if (!ctx.message?.member || !isInVoiceChannel(ctx.message.member)) {
      await ctx.reply({ embeds: [embeds.error('You need to be in a voice channel.')] });
      return;
    }

    if (!ctx.guildId) return;

    QueueService.shuffle(ctx.guildId);
    await ctx.reply({ embeds: [embeds.success('Queue shuffled.')] });
  }
};

export default command;
