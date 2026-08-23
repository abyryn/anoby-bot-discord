import { Command, CommandContext } from '../../types/index.js';
import { QueueService } from '../../services/music/queue.service.js';
import { LoopMode } from '../../types/music.js';
import { isInVoiceChannel } from '../../utils/permissions.js';
import { embeds } from '../../utils/embeds.js';

const command: Command = {
  name: 'loop',
  description: 'Toggle or set loop mode (off, track, queue)',
  execute: async (ctx: CommandContext) => {
    if (!ctx.message?.member || !isInVoiceChannel(ctx.message.member)) {
      await ctx.reply({ embeds: [embeds.error('You need to be in a voice channel.')] });
      return;
    }

    if (!ctx.guildId) return;

    const queue = QueueService.getQueue(ctx.guildId);
    if (!queue) {
      await ctx.reply({ embeds: [embeds.error('The queue is empty.')] });
      return;
    }

    const validModes: LoopMode[] = ['off', 'track', 'queue'];
    let newMode = ctx.args[0]?.toLowerCase() as LoopMode;

    if (!validModes.includes(newMode)) {
      if (queue.loop === 'off') newMode = 'track';
      else if (queue.loop === 'track') newMode = 'queue';
      else newMode = 'off';
    }

    QueueService.setLoop(ctx.guildId, newMode);
    await ctx.reply({ embeds: [embeds.success(`Loop mode set to: **${newMode}**`)] });
  }
};

export default command;
