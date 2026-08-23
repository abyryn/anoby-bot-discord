import { getShoukaku, getNode } from './lavalink.service.js';
import { QueueService } from './queue.service.js';
import { Track } from '../../types/music.js';
import { logger } from '../../utils/logger.js';
import { embeds } from '../../utils/embeds.js';
import { client } from '../../bot/client.js';
import { TextChannel } from 'discord.js';

// Map to hold idle disconnect timers per guild
const idleTimers = new Map<string, NodeJS.Timeout>();

function clearIdleTimer(guildId: string) {
  const timer = idleTimers.get(guildId);
  if (timer) {
    clearTimeout(timer);
    idleTimers.delete(guildId);
  }
}

function startIdleTimer(guildId: string) {
  clearIdleTimer(guildId);
  // Stay in voice channel for 2 minutes (120s) before leaving
  const timer = setTimeout(async () => {
    try {
      const shoukaku = getShoukaku();
      const q = QueueService.getQueue(guildId);
      if (q) {
        try {
          const channel = await client.channels.fetch(q.textChannelId) as TextChannel;
          if (channel) {
            await channel.send({ embeds: [embeds.info('Antrean musik selesai. Bot keluar dari Voice Channel karena tidak ada aktivitas.')] });
          }
        } catch (_) {}
      }
      QueueService.deleteQueue(guildId);
      await shoukaku.leaveVoiceChannel(guildId).catch(() => {});
      logger.info({ guildId }, 'Bot left voice channel due to inactivity');
    } catch (err) {
      logger.error({ err, guildId }, 'Error during idle disconnect');
    } finally {
      idleTimers.delete(guildId);
    }
  }, 120000);

  idleTimers.set(guildId, timer);
}

export const PlayerService = {
  async play(guildId: string, voiceChannelId: string, textChannelId: string, track: Track) {
    clearIdleTimer(guildId);

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
        throw new Error('Bot gagal masuk ke Voice Channel. Pastikan bot memiliki izin "Connect" dan "Speak" di voice channel tersebut.');
      }

      player.on('start', async () => {
        clearIdleTimer(guildId);
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
        
        logger.info({ guildId, reason: reason.reason }, 'Track ended event received');

        if (reason.reason === 'loadFailed') {
          const q = QueueService.getQueue(guildId);
          if (q) {
            try {
              const current = QueueService.getCurrentTrack(guildId);
              const channel = await client.channels.fetch(q.textChannelId) as TextChannel;
              if (channel && current) {
                await channel.send({ embeds: [embeds.error(`Gagal memuat audio untuk: **${current.title}**. Sumber audio dibatasi oleh penyedia.`)] });
              }
            } catch (_) {}
          }
        }

        const nextTrack = QueueService.nextTrack(guildId);
        if (nextTrack && player) {
          try {
            await player.playTrack({ track: { encoded: nextTrack.shoukakuTrack.encoded } });
          } catch (playErr) {
            logger.error({ err: playErr }, 'Failed to play next track');
            startIdleTimer(guildId);
          }
        } else {
          startIdleTimer(guildId);
        }
      });

      player.on('closed', (data) => {
        logger.warn({ guildId, data }, 'Voice connection closed by Discord');
        // Only cleanup if voice server actually terminated (e.g. 4014 = bot kicked)
        if (data.code === 4014) {
          clearIdleTimer(guildId);
          QueueService.deleteQueue(guildId);
          shoukaku.leaveVoiceChannel(guildId).catch(() => {});
        }
      });

      player.on('exception', async (err) => {
        logger.error({ err, guildId }, 'Player exception event from Lavalink');
        const q = QueueService.getQueue(guildId);
        if (q) {
          try {
            const channel = await client.channels.fetch(q.textChannelId) as TextChannel;
            if (channel) {
              const errMsg = err.exception?.message || 'Stream tidak dapat dimuat atau dibatasi.';
              await channel.send({ embeds: [embeds.error(`Kesalahan saat memutar audio: ${errMsg}`)] });
            }
          } catch (_) {}
        }
      });
      
      await player.setGlobalVolume(queue.volume);
      
      // Since it's the first track, current is 0
      queue.current = 0;
      await player.playTrack({ track: { encoded: track.shoukakuTrack.encoded } });
    } else {
      // If player already exists and was idle, start playback
      if (!player.track && queue.tracks.length > 0) {
        clearIdleTimer(guildId);
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
    clearIdleTimer(guildId);
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
