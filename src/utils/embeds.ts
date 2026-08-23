import { EmbedBuilder } from 'discord.js';

export const embeds = {
  success: (description: string) =>
    new EmbedBuilder().setColor(0x00ff00).setDescription(`✅ ${description}`),

  error: (description: string) =>
    new EmbedBuilder().setColor(0xff0000).setDescription(`❌ ${description}`),

  info: (description: string) =>
    new EmbedBuilder().setColor(0x0099ff).setDescription(`ℹ️ ${description}`),

  music: (title: string, description: string) =>
    new EmbedBuilder().setColor(0xffaa00).setTitle(`🎵 ${title}`).setDescription(description),

  quiz: (title: string, description: string) =>
    new EmbedBuilder().setColor(0x9900ff).setTitle(`🎮 ${title}`).setDescription(description),
};
