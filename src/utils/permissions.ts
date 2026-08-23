import { GuildMember } from 'discord.js';
import { env } from '../config/env.js';

export function isOwner(userId: string): boolean {
  return userId === env.BOT_OWNER_ID;
}

export function isModerator(member: GuildMember): boolean {
  return member.permissions.has('ManageGuild');
}

export function isInVoiceChannel(member: GuildMember): boolean {
  return !!member.voice.channelId;
}
