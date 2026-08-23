import { Command, CommandContext } from '../../types/index.js';
import { QueueService } from '../../services/music/queue.service.js';
import { getShoukaku } from '../../services/music/lavalink.service.js';
import { isInVoiceChannel } from '../../utils/permissions.js';
import { embeds } from '../../utils/embeds.js';

const command: Command = {
  name: 'skip',
  description: 'Skip to the next track',
  aliases: ['s'],
  execute: async (ctx: CommandContext) => {
    if (!ctx.message?.member || !isInVoiceChannel(ctx.message.member)) {
      await ctx.reply({ embeds: [embeds.error('You need to be in a voice channel.')] });
      return;
    }

    if (!ctx.guildId) return;

    const queue = QueueService.getQueue(ctx.guildId);
    if (!queue || queue.tracks.length === 0) {
      await ctx.reply({ embeds: [embeds.error('The queue is empty.')] });
      return;
    }

    const player = getShoukaku().players.get(ctx.guildId);
    if (player) {
      await player.stopTrack();
      await ctx.reply({ embeds: [embeds.success('Track skipped.')] });
    }
  }
};

export default command;
