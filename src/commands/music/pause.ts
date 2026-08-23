import { Command, CommandContext } from '../../types/index.js';
import { PlayerService } from '../../services/music/player.service.js';
import { isInVoiceChannel } from '../../utils/permissions.js';
import { embeds } from '../../utils/embeds.js';

const command: Command = {
  name: 'pause',
  description: 'Pause the current track',
  execute: async (ctx: CommandContext) => {
    if (!ctx.message?.member || !isInVoiceChannel(ctx.message.member)) {
      await ctx.reply({ embeds: [embeds.error('You need to be in a voice channel.')] });
      return;
    }

    if (!ctx.guildId) return;

    await PlayerService.pause(ctx.guildId);
    await ctx.reply({ embeds: [embeds.success('Playback paused.')] });
  }
};

export default command;
