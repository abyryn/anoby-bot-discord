import { Command, CommandContext } from '../../types/index.js';
import { PlayerService } from '../../services/music/player.service.js';
import { isInVoiceChannel } from '../../utils/permissions.js';
import { embeds } from '../../utils/embeds.js';

const command: Command = {
  name: 'stop',
  description: 'Stop playback, clear queue, and disconnect',
  execute: async (ctx: CommandContext) => {
    if (!ctx.message?.member || !isInVoiceChannel(ctx.message.member)) {
      await ctx.reply({ embeds: [embeds.error('You need to be in a voice channel.')] });
      return;
    }

    if (!ctx.guildId) return;

    await PlayerService.stop(ctx.guildId);
    await ctx.reply({ embeds: [embeds.success('Stopped playback and left the voice channel.')] });
  }
};

export default command;
