import { Command, CommandContext } from '../../types/index.js';
import { PlayerService } from '../../services/music/player.service.js';
import { isInVoiceChannel } from '../../utils/permissions.js';
import { embeds } from '../../utils/embeds.js';

const command: Command = {
  name: 'volume',
  description: 'Set the player volume',
  aliases: ['vol'],
  execute: async (ctx: CommandContext) => {
    if (!ctx.message?.member || !isInVoiceChannel(ctx.message.member)) {
      await ctx.reply({ embeds: [embeds.error('You need to be in a voice channel.')] });
      return;
    }

    if (!ctx.guildId) return;

    if (ctx.args.length === 0) {
      await ctx.reply({ embeds: [embeds.error('Please provide a volume level between 0 and 100.')] });
      return;
    }

    const volume = parseInt(ctx.args[0], 10);
    if (isNaN(volume) || volume < 0 || volume > 100) {
      await ctx.reply({ embeds: [embeds.error('Volume must be a number between 0 and 100.')] });
      return;
    }

    await PlayerService.setVolume(ctx.guildId, volume);
    await ctx.reply({ embeds: [embeds.success(`Volume set to ${volume}%.`)] });
  }
};

export default command;
