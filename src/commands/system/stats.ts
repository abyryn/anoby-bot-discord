import { Command, CommandContext } from '../../types/index.js';
import { embeds } from '../../utils/embeds.js';
import { client } from '../../bot/client.js';

const command: Command = {
  name: 'stats',
  description: 'Shows bot statistics',
  execute: async (ctx: CommandContext) => {
    const guildCount = client.guilds.cache.size;
    const userCount = client.users.cache.size;
    const channelCount = client.channels.cache.size;
    
    const uptime = process.uptime();
    const d = Math.floor(uptime / (3600 * 24));
    const h = Math.floor((uptime % (3600 * 24)) / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    
    const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const nodeVersion = process.version;

    await ctx.reply({
      embeds: [
        {
          ...embeds.info(
            `🤖 **anobystore BOT**\n\n` +
            `**Servers:** ${guildCount}\n` +
            `**Users:** ${userCount}\n` +
            `**Channels:** ${channelCount}\n` +
            `**Uptime:** ${d}d ${h}h ${m}m\n` +
            `**Memory:** ${memory} MB\n` +
            `**Node:** ${nodeVersion}`
          ),
          footer: { text: 'by @abiriann.ab' }
        }
      ]
    });
  }
};

export default command;
