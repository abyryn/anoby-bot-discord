import { env } from '../../config/env.js';

const cooldowns = new Map<string, number>();

export function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamp = cooldowns.get(userId);
  
  if (timestamp) {
    const expirationTime = timestamp + env.AI_COOLDOWN * 1000;
    if (now < expirationTime) {
      return true;
    }
  }
  
  cooldowns.set(userId, now);
  return false;
}

export function getRemainingCooldown(userId: string): number {
  const now = Date.now();
  const timestamp = cooldowns.get(userId);
  
  if (!timestamp) return 0;
  
  const expirationTime = timestamp + env.AI_COOLDOWN * 1000;
  const remaining = expirationTime - now;
  
  return remaining > 0 ? remaining : 0;
}
