import { Command, CommandContext } from '../../types/index.js';
import { embeds } from '../../utils/embeds.js';
import { client } from '../../bot/client.js';

const command: Command = {
  name: 'ping',
  description: 'Shows bot latency',
  execute: async (ctx: CommandContext) => {
    const apiLatency = client.ws.ping;
    
    const sent = await ctx.reply({
      embeds: [embeds.info('Pinging...')]
    });
    
    // In discord.js v14 context reply does not directly give the message back unless we fetch it 
    // or if we use ctx.message to calculate round trip if it's a message command.
    // Assuming ctx.message exists for message commands
    const latency = ctx.message ? Date.now() - ctx.message.createdTimestamp : 'Unknown';

    await ctx.reply({
      embeds: [embeds.info(`🏓 Pong!\n**Latency:** ${latency}ms\n**API Latency:** ${apiLatency}ms`)]
    });
  }
};

export default command;
