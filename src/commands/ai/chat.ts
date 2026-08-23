import { Command, CommandContext } from '../../types/index.js';
import aiCommand from './ai.js';

const command: Command = {
  name: 'chat',
  description: aiCommand.description,
  aliases: [],
  execute: async (ctx: CommandContext) => {
    return aiCommand.execute(ctx);
  }
};

export default command;
