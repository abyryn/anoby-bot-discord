import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';
import { client } from '../../bot/client.js';
import { PlayerService } from './player.service.js';
import { getShoukaku } from './lavalink.service.js';

export interface AfkData {
  guildId: string;
  voiceChannelId: string;
  textChannelId?: string;
  isEnabled: boolean;
}

export class AfkService {
  private static instance: AfkService;
  private cache = new Map<string, AfkData>();
  private initialized = false;

  private constructor() {}

  public static getInstance(): AfkService {
    if (!AfkService.instance) {
      AfkService.instance = new AfkService();
    }
    return AfkService.instance;
  }

  /**
   * Load active AFK configs from database into memory cache
   */
  public async init(): Promise<void> {
    try {
      const records = await prisma.afkConfig.findMany({
        where: { isEnabled: true },
      });

      for (const rec of records) {
        this.cache.set(rec.guildId, {
          guildId: rec.guildId,
          voiceChannelId: rec.voiceChannelId,
          textChannelId: rec.textChannelId || undefined,
          isEnabled: rec.isEnabled,
        });
      }

      this.initialized = true;
      logger.info(`[AFK] Loaded ${this.cache.size} active AFK 24/7 configs from database`);
    } catch (error) {
      logger.warn({ err: error }, '[AFK] Could not load configs from database. Running in in-memory mode.');
      this.initialized = true;
    }
  }

  /**
   * Check if AFK 24/7 mode is active for a guild
   */
  public isAfk(guildId: string): boolean {
    const data = this.cache.get(guildId);
    return !!data && data.isEnabled;
  }

  /**
   * Get AFK data for a guild
   */
  public getAfkData(guildId: string): AfkData | undefined {
    return this.cache.get(guildId);
  }

  /**
   * Get configured voice channel ID for a guild
   */
  public getAfkChannel(guildId: string): string | undefined {
    return this.cache.get(guildId)?.voiceChannelId;
  }

  /**
   * Enable AFK 24/7 mode for a guild
   */
  public async setAfk(
    guildId: string,
    voiceChannelId: string,
    textChannelId?: string,
    isEnabled = true
  ): Promise<AfkData> {
    const data: AfkData = {
      guildId,
      voiceChannelId,
      textChannelId,
      isEnabled,
    };

    this.cache.set(guildId, data);

    try {
      await prisma.afkConfig.upsert({
        where: { guildId },
        update: {
          voiceChannelId,
          textChannelId: textChannelId || null,
          isEnabled,
        },
        create: {
          guildId,
          voiceChannelId,
          textChannelId: textChannelId || null,
          isEnabled,
        },
      });
      logger.info({ guildId, voiceChannelId, isEnabled }, '[AFK] Saved AFK config to database');
    } catch (err) {
      logger.warn({ err, guildId }, '[AFK] Failed to save AFK config to database, cached in-memory only');
    }

    return data;
  }

  /**
   * Disable AFK 24/7 mode for a guild
   */
  public async disableAfk(guildId: string): Promise<void> {
    const existing = this.cache.get(guildId);
    if (existing) {
      existing.isEnabled = false;
    } else {
      this.cache.set(guildId, {
        guildId,
        voiceChannelId: '',
        isEnabled: false,
      });
    }

    try {
      await prisma.afkConfig.update({
        where: { guildId },
        data: { isEnabled: false },
      }).catch(() => {});
      logger.info({ guildId }, '[AFK] Disabled AFK config in database');
    } catch (err) {
      logger.warn({ err, guildId }, '[AFK] Failed to update AFK config in database');
    }
  }

  /**
   * Update the voice channel ID if the bot was moved
   */
  public async updateAfkChannel(guildId: string, voiceChannelId: string): Promise<void> {
    const existing = this.cache.get(guildId);
    if (existing && existing.isEnabled) {
      existing.voiceChannelId = voiceChannelId;
      try {
        await prisma.afkConfig.update({
          where: { guildId },
          data: { voiceChannelId },
        }).catch(() => {});
      } catch (err) {
        logger.warn({ err, guildId }, '[AFK] Failed to update voice channel in database');
      }
    }
  }

  /**
   * Attempt to reconnect all active AFK voice channels
   */
  public async reconnectAll(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const shoukaku = getShoukaku();
      if (!shoukaku) return;

      for (const [guildId, afkData] of this.cache.entries()) {
        if (!afkData.isEnabled || !afkData.voiceChannelId) continue;

        const guild = client.guilds.cache.get(guildId);
        if (!guild) continue;

        const channel = guild.channels.cache.get(afkData.voiceChannelId);
        if (!channel) {
          logger.warn({ guildId, channelId: afkData.voiceChannelId }, '[AFK] Configured voice channel no longer exists');
          continue;
        }

        const existingPlayer = shoukaku.players.get(guildId);
        if (!existingPlayer) {
          logger.info({ guildId, channelId: afkData.voiceChannelId }, '[AFK] Reconnecting bot to voice channel...');
          try {
            await PlayerService.joinVoice(guildId, afkData.voiceChannelId, afkData.textChannelId);
            logger.info({ guildId, channelName: channel.name }, '[AFK] Successfully connected to AFK voice channel');
          } catch (connErr) {
            logger.error({ err: connErr, guildId }, '[AFK] Failed to reconnect to voice channel');
          }
        }
      }
    } catch (error) {
      logger.error({ err: error }, '[AFK] Error during reconnectAll');
    }
  }
}

export const afkService = AfkService.getInstance();
