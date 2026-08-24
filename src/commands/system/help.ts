import { Command, CommandContext } from '../../types/index.js';
import { EmbedBuilder } from 'discord.js';

const command: Command = {
  name: 'help',
  description: 'Shows help information',
  execute: async (ctx: CommandContext) => {
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('🤖 Anobystore Discord Bot')
      .setDescription(
        `🎵 **MUSIC**\n` +
        `\`A!play <lagu/url/spotify>\` — Putar musik dari YouTube / Spotify / SoundCloud\n` +
        `\`A!pause\` | \`A!resume\` | \`A!skip\` | \`A!stop\`\n` +
        `\`A!queue\` | \`A!nowplaying\` | \`A!volume\` | \`A!shuffle\` | \`A!loop\`\n\n` +
        `🎙️ **VOICE AI (Komunikasi Suara)**\n` +
        `\`A!voiceai start\` — Mulai obrolan suara dua arah lewat mic di Voice Channel\n` +
        `\`A!voiceai stop\` — Matikan Voice AI & keluar Voice Channel\n` +
        `\`A!voiceai voice <gadis|ardi>\` — Ganti suara AI (Wanita / Pria)\n` +
        `\`A!talk <pertanyaan>\` — Tanya AI dan dengarkan jawabannya lewat suara\n\n` +
        `🤖 **AI CHAT (Teks)**\n` +
        `\`A!ai <pertanyaan>\` — Chat teks dengan AnobyStore AI\n` +
        `\`A!chat <pertanyaan>\` — Alias untuk AI chat\n` +
        `\`A!ai-clear\` — Reset memori percakapan\n\n` +
        `🎮 **QUIZ**\n` +
        `\`A!quiz\` | \`A!quiz <kategori>\` — Mulai kuis trivia AI interaktif\n` +
        `\`A!quiz leaderboard\` — Lihat peringkat skor\n` +
        `\`A!quiz stop\` — Hentikan sesi kuis\n\n` +
        `⚙️ **SYSTEM**\n` +
        `\`A!help\` | \`A!ping\` | \`A!stats\``
      );

    await ctx.reply({ embeds: [embed] });
  }
};

export default command;
