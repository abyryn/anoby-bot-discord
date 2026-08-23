import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message } from 'discord.js';
import { QueueService } from '../services/music/queue.service.js';
import { PlayerService } from '../services/music/player.service.js';
import { getShoukaku } from '../services/music/lavalink.service.js';
import { embeds } from './embeds.js';

export function createMusicActionRow() {
  const previous = new ButtonBuilder().setCustomId('music_prev').setEmoji('⏮️').setStyle(ButtonStyle.Secondary);
  const playPause = new ButtonBuilder().setCustomId('music_playpause').setEmoji('⏯️').setStyle(ButtonStyle.Primary);
  const skip = new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary);
  const shuffle = new ButtonBuilder().setCustomId('music_shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary);
  const loop = new ButtonBuilder().setCustomId('music_loop').setEmoji('🔁').setStyle(ButtonStyle.Secondary);
  const stop = new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger);

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(previous, playPause, skip, shuffle, loop);
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(stop);

  return [row1, row2];
}

export function setupMusicComponentCollector(message: Message, guildId: string) {
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });

  collector.on('collect', async (i) => {
    const queue = QueueService.getQueue(guildId);
    if (!queue) {
      await i.reply({ content: 'Tidak ada antrean saat ini.', ephemeral: true });
      return;
    }

    const player = getShoukaku().players.get(guildId);
    if (!player) {
      await i.reply({ content: 'Player tidak ditemukan.', ephemeral: true });
      return;
    }

    try {
      switch (i.customId) {
        case 'music_prev':
          if (queue.current > 0) {
            queue.current -= 2;
            await player.stopTrack();
            await i.reply({ content: '⏮️ Memutar lagu sebelumnya.', ephemeral: true });
          } else {
            await i.reply({ content: 'Tidak ada lagu sebelumnya.', ephemeral: true });
          }
          break;
        case 'music_playpause':
          if (player.paused) {
            await PlayerService.resume(guildId);
            await i.reply({ content: '▶️ Dilanjutkan.', ephemeral: true });
          } else {
            await PlayerService.pause(guildId);
            await i.reply({ content: '⏸️ Dijeda.', ephemeral: true });
          }
          break;
        case 'music_skip':
          await player.stopTrack();
          await i.reply({ content: '⏭️ Dilewati.', ephemeral: true });
          break;
        case 'music_shuffle':
          QueueService.shuffle(guildId);
          await i.reply({ content: '🔀 Antrean diacak.', ephemeral: true });
          break;
        case 'music_loop':
          const nextLoop = queue.loop === 'off' ? 'queue' : queue.loop === 'queue' ? 'track' : 'off';
          QueueService.setLoop(guildId, nextLoop);
          await i.reply({ content: `🔁 Mode perulangan diubah ke: **${nextLoop}**`, ephemeral: true });
          break;
        case 'music_stop':
          await PlayerService.stop(guildId);
          await i.reply({ content: '⏹️ Dihentikan.', ephemeral: true });
          break;
      }
    } catch (err) {
      console.error(err);
      await i.reply({ content: 'Terjadi kesalahan.', ephemeral: true }).catch(() => {});
    }
  });

  collector.on('end', () => {
    // Disable buttons or just ignore
    message.edit({ components: [] }).catch(() => {});
  });
}
