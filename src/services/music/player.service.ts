import { getShoukaku, getNode } from './lavalink.service.js';
import { QueueService } from './queue.service.js';
import { Track } from '../../types/music.js';
import { logger } from '../../utils/logger.js';
import { embeds } from '../../utils/embeds.js';
import { client } from '../../bot/client.js';
import { TextChannel } from 'discord.js';

export const PlayerService = {
  async play(guildId: string, voiceChannelId: string, textChannelId: string, track: Track) {
    const shoukaku = getShoukaku();
    let player = shoukaku.players.get(guildId);

    let queue = QueueService.getQueue(guildId);
    if (!queue) {
      queue = QueueService.createQueue(guildId, textChannelId);
    }
    QueueService.addTrack(guildId, track);

    if (!player) {
      const node = getNode();
      const guild = client.guilds.cache.get(guildId);
      const shardId = guild?.shardId ?? 0;

      try {
        player = await shoukaku.joinVoiceChannel({
          guildId,
          channelId: voiceChannelId,
          shardId,
          deaf: true
        });
      } catch (err) {
        logger.error({ err, guildId, voiceChannelId }, 'Failed to join voice channel');
        throw new Error('Bot gagal masuk ke Voice Channel. Pastikan bot memiliki izin "Connect" dan "Speak" di voice channel.');
      }

      player.on('start', async () => {
        const q = QueueService.getQueue(guildId);
        const current = QueueService.getCurrentTrack(guildId);
        if (q && current) {
          try {
            const channel = await client.channels.fetch(q.textChannelId) as TextChannel;
            if (channel) {
              await channel.send({ embeds: [embeds.music('Now Playing', `[${current.title}](${current.url})`)] });
            }
          } catch (error) {
            logger.error({ err: error }, 'Failed to send now playing message');
          }
        }
      });

      player.on('end', async (reason) => {
        if (reason.reason === 'replaced') return;
        
        const nextTrack = QueueService.nextTrack(guildId);
        if (nextTrack && player) {
          await player.playTrack({ track: { encoded: nextTrack.shoukakuTrack.encoded } });
        } else {
          QueueService.deleteQueue(guildId);
          await shoukaku.leaveVoiceChannel(guildId).catch(() => {});
        }
      });

      player.on('closed', () => {
        QueueService.deleteQueue(guildId);
        shoukaku.leaveVoiceChannel(guildId).catch(() => {});
      });

      player.on('exception', (err) => {
        logger.error({ err }, 'Player error event from Lavalink');
      });
      
      await player.setGlobalVolume(queue.volume);
      
      // Since it's the first track, current is 0
      queue.current = 0;
      await player.playTrack({ track: { encoded: track.shoukakuTrack.encoded } });
    } else {
      // If player already exists and is idle, play track
      if (!player.track && queue.tracks.length > 0) {
        queue.current = queue.tracks.length - 1;
        await player.playTrack({ track: { encoded: track.shoukakuTrack.encoded } });
      }
    }
  },

  async pause(guildId: string) {
    const player = getShoukaku().players.get(guildId);
    if (player) await player.setPaused(true);
  },

  async resume(guildId: string) {
    const player = getShoukaku().players.get(guildId);
    if (player) await player.setPaused(false);
  },

  async stop(guildId: string) {
    const shoukaku = getShoukaku();
    QueueService.deleteQueue(guildId);
    await shoukaku.leaveVoiceChannel(guildId).catch(() => {});
  },

  async setVolume(guildId: string, volume: number) {
    const player = getShoukaku().players.get(guildId);
    if (player) {
      QueueService.setVolume(guildId, volume);
      await player.setGlobalVolume(volume);
    }
  }
};
