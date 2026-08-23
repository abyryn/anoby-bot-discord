import { Message } from 'discord.js';
import { BotClient } from '../client.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { CommandContext } from '../../types/index.js';
import { embeds } from '../../utils/embeds.js';

export function setupMessageCreateEvent(client: BotClient) {
  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = env.BOT_PREFIX;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName) || '');

    if (!command) return;

    const ctx: CommandContext = {
      message,
      args,
      reply: async (content) => message.reply(content),
      authorId: message.author.id,
      channelId: message.channel.id,
      guildId: message.guild.id,
    };

    try {
      logger.info(`[INFO] User ${message.author.id} executed ${prefix}${commandName}`);
      await command.execute(ctx);
    } catch (error) {
      const errorId = `ERR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      logger.error({ err: error, errorId }, `Execution of command ${commandName} failed`);
      
      try {
        await ctx.reply({
          embeds: [embeds.error(`Terjadi kesalahan saat menjalankan command.\n\nError ID:\n\`${errorId}\``)]
        });
      } catch (e) {
        logger.error({ err: e }, 'Failed to send error message');
      }
    }
  });
}
