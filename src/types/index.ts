import { Message, ChatInputCommandInteraction } from 'discord.js';

export interface CommandContext {
  message?: Message;
  interaction?: ChatInputCommandInteraction;
  args: string[];
  reply: (content: any) => Promise<any>;
  authorId: string;
  channelId: string;
  guildId: string | null;
}

export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  execute: (ctx: CommandContext) => Promise<void>;
}

export interface BotConfig {
  prefix: string;
}
