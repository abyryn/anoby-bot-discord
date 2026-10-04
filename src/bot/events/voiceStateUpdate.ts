import { VoiceState } from 'discord.js';
import { BotClient } from '../client.js';
import { afkService } from '../../services/music/afk.service.js';
import { PlayerService } from '../../services/music/player.service.js';
import { logger } from '../../utils/logger.js';

export function setupVoiceStateUpdateEvent(client: BotClient) {
  client.on('voiceStateUpdate', async (oldState: VoiceState, newState: VoiceState) => {
    // Only monitor the bot's own voice state transitions
    if (newState.id !== client.user?.id) return;

    const guildId = newState.guild.id;

    // 1. Bot was moved to another voice channel
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      if (afkService.isAfk(guildId)) {
        logger.info(
          { guildId, oldChannel: oldState.channelId, newChannel: newState.channelId },
          '[AFK] Bot moved to a new voice channel, updating target channel'
        );
        await afkService.updateAfkChannel(guildId, newState.channelId);
      }
      return;
    }

    // 2. Bot was disconnected from voice channel
    if (oldState.channelId && !newState.channelId) {
      if (afkService.isAfk(guildId)) {
        logger.warn(
          { guildId, channelId: oldState.channelId },
          '[AFK] Bot was disconnected from voice channel while AFK 24/7 is active. Reconnecting in 5s...'
        );

        setTimeout(async () => {
          try {
            if (afkService.isAfk(guildId)) {
              const afkData = afkService.getAfkData(guildId);
              if (afkData?.voiceChannelId) {
                const guild = client.guilds.cache.get(guildId);
                const channel = guild?.channels.cache.get(afkData.voiceChannelId);

                if (channel) {
                  await PlayerService.joinVoice(guildId, afkData.voiceChannelId, afkData.textChannelId);
                  logger.info({ guildId, channelId: afkData.voiceChannelId }, '[AFK] Successfully reconnected to voice channel');
                } else {
                  logger.warn({ guildId }, '[AFK] Target voice channel no longer exists, disabling AFK');
                  await afkService.disableAfk(guildId);
                }
              }
            }
          } catch (err) {
            logger.error({ guildId, err }, '[AFK] Error during voice auto-reconnect');
          }
        }, 5000);
      }
    }
  });
}
