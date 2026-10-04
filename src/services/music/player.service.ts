import { getShoukaku, getNode } from './lavalink.service.js';
import { QueueService } from './queue.service.js';
import { Track } from '../../types/music.js';
import { logger } from '../../utils/logger.js';
import { embeds } from '../../utils/embeds.js';
import { client } from '../../bot/client.js';
import { TextChannel } from 'discord.js';
import { SearchService } from './search.service.js';
import { afkService } from './afk.service.js';
import { Player } from 'shoukaku';

// Map to hold idle disconnect timers per guild
const idleTimers = new Map<string, NodeJS.Timeout>();

export function clearIdleTimer(guildId: string) {
  const timer = idleTimers.get(guildId);
  if (timer) {
    clearTimeout(timer);
    idleTimers.delete(guildId);
  }
}

export function startIdleTimer(guildId: string) {
  clearIdleTimer(guildId);

  // If 24/7 AFK mode is enabled, NEVER disconnect due to inactivity
  if (afkService.isAfk(guildId)) {
    logger.info({ guildId }, '[AFK] AFK 24/7 is enabled, skipping idle disconnect timer');
    return;
  }

  // Stay in voice channel for 2 minutes (120s) before leaving
  const timer = setTimeout(async () => {
    try {
      if (afkService.isAfk(guildId)) return;

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
  /**
   * Set up all required event listeners on a Shoukaku Player instance
   */
  setupPlayerEvents(player: Player, guildId: string) {
    // Avoid double attaching if listeners already exist
    if (player.listenerCount('start') > 0) return;

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

      const nextTrack = QueueService.nextTrack(guildId);
      if (nextTrack && player) {
        try {
          await player.playTrack({ track: { encoded: nextTrack.shoukakuTrack.encoded } });
        } catch (playErr) {
          logger.error({ err: playErr }, 'Failed to play next track');
          if (!afkService.isAfk(guildId)) {
            startIdleTimer(guildId);
          }
        }
      } else {
        if (!afkService.isAfk(guildId)) {
          startIdleTimer(guildId);
        } else {
          logger.info({ guildId }, '[AFK] Queue ended but AFK 24/7 is enabled: staying in voice channel');
        }
      }
    });

    player.on('closed', (data) => {
      logger.warn({ guildId, data }, 'Voice connection closed by Discord');
      if (data.code === 4014) {
        clearIdleTimer(guildId);
        QueueService.deleteQueue(guildId);
        
        if (!afkService.isAfk(guildId)) {
          getShoukaku().leaveVoiceChannel(guildId).catch(() => {});
        } else {
          logger.info({ guildId }, '[AFK] Connection closed by Discord, attempting auto-reconnect in 5s...');
          setTimeout(async () => {
            try {
              if (afkService.isAfk(guildId)) {
                const afkData = afkService.getAfkData(guildId);
                if (afkData?.voiceChannelId) {
                  await PlayerService.joinVoice(guildId, afkData.voiceChannelId, afkData.textChannelId);
                  logger.info({ guildId }, '[AFK] Successfully reconnected after closed event');
                }
              }
            } catch (reconnectErr) {
              logger.warn({ guildId, reconnectErr }, '[AFK] Failed to auto-reconnect voice player');
            }
          }, 5000);
        }
      }
    });

    player.on('exception', async (err) => {
      logger.error({ err, guildId }, 'Player exception event from Lavalink');
      const q = QueueService.getQueue(guildId);
      const current = QueueService.getCurrentTrack(guildId);

      if (q && current && player) {
        try {
          const channel = await client.channels.fetch(q.textChannelId) as TextChannel;
          // If YouTube stream failed, try auto-fallback to SoundCloud stream
          if (current.url.includes('youtube.com') || current.url.includes('youtu.be')) {
            if (channel) {
              await channel.send({ embeds: [embeds.info(`⚠️ Stream YouTube dibatasi penyedia. Mencoba beralih ke sumber audio cadangan untuk: **${current.title}**...`)] });
            }

            const fallbackTracks = await SearchService.search(current.title, current.requester);
            const fallbackTrack = fallbackTracks.find(t => !t.url.includes('youtube.com') && !t.url.includes('youtu.be')) || fallbackTracks[0];

            if (fallbackTrack && fallbackTrack.shoukakuTrack.encoded !== current.shoukakuTrack.encoded) {
              current.shoukakuTrack = fallbackTrack.shoukakuTrack;
              current.url = fallbackTrack.url;
              await player.playTrack({ track: { encoded: fallbackTrack.shoukakuTrack.encoded } });
              return;
            }
          }

          if (channel) {
            const errMsg = err.exception?.message || 'Stream audio dibatasi oleh penyedia.';
            await channel.send({ embeds: [embeds.error(`Kesalahan saat memutar audio: ${errMsg}`)] });
          }
        } catch (fallbackErr) {
          logger.error({ err: fallbackErr }, 'Failed during exception fallback');
        }
      }
    });
  },

  /**
   * Connect to voice channel and ensure player is set up with all listeners
   */
  async joinVoice(guildId: string, voiceChannelId: string, textChannelId?: string): Promise<Player> {
    const shoukaku = getShoukaku();
    let player = shoukaku.players.get(guildId);

    if (player) {
      this.setupPlayerEvents(player, guildId);
      return player;
    }

    // Ensure node is available
    getNode();

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

    this.setupPlayerEvents(player, guildId);
    return player;
  },

  async play(guildId: string, voiceChannelId: string, textChannelId: string, track: Track) {
    return this.playMultiple(guildId, voiceChannelId, textChannelId, [track]);
  },

  async playMultiple(guildId: string, voiceChannelId: string, textChannelId: string, tracks: Track[]) {
    if (tracks.length === 0) return;

    clearIdleTimer(guildId);

    let queue = QueueService.getQueue(guildId);
    if (!queue) {
      queue = QueueService.createQueue(guildId, textChannelId);
    }

    for (const t of tracks) {
      QueueService.addTrack(guildId, t);
    }

    const firstTrack = tracks[0];
    const player = await this.joinVoice(guildId, voiceChannelId, textChannelId);

    await player.setGlobalVolume(queue.volume);

    // If player is idle (not playing any track), start playback immediately
    if (!player.track) {
      clearIdleTimer(guildId);
      queue.current = queue.tracks.length - tracks.length;
      await player.playTrack({ track: { encoded: firstTrack.shoukakuTrack.encoded } });
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

    const player = shoukaku.players.get(guildId);
    if (player) {
      await player.stopTrack();
    }

    // Only leave voice channel if AFK 24/7 is NOT enabled
    if (!afkService.isAfk(guildId)) {
      await shoukaku.leaveVoiceChannel(guildId).catch(() => {});
    }
  },

  async setVolume(guildId: string, volume: number) {
    const player = getShoukaku().players.get(guildId);
    if (player) {
      QueueService.setVolume(guildId, volume);
      await player.setGlobalVolume(volume);
    }
  }
};
