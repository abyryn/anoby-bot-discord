import { Command, CommandContext } from '../../types/index.js';
import { EmbedBuilder } from 'discord.js';

const command: Command = {
  name: 'help',
  description: 'Shows help information',
  execute: async (ctx: CommandContext) => {
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('🤖 Anobystore BOT')
      .setDescription(
        `🎵 **MUSIC**\n` +
        `A!play <lagu>\n` +
        `A!pause\n` +
        `A!resume\n` +
        `A!skip\n` +
        `A!queue\n` +
        `A!nowplaying\n` +
        `A!stop\n\n` +
        `🤖 **AI**\n` +
        `A!ai <pertanyaan>\n` +
        `A!chat <pertanyaan>\n` +
        `A!ai-clear\n\n` +
        `🎮 **QUIZ**\n` +
        `A!quiz\n` +
        `A!quiz <kategori>\n` +
        `A!quiz leaderboard\n` +
        `A!quiz stop\n\n` +
        `⚙️ **SYSTEM**\n` +
        `A!help\n` +
        `A!ping\n` +
        `A!stats`
      );

    await ctx.reply({ embeds: [embed] });
  }
};

export default command;
