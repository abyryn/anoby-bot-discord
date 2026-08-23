import { GuildQueue, Track, LoopMode } from '../../types/music.js';

const queues = new Map<string, GuildQueue>();

export const QueueService = {
  getQueue(guildId: string): GuildQueue | undefined {
    return queues.get(guildId);
  },

  createQueue(guildId: string, textChannelId: string): GuildQueue {
    const queue: GuildQueue = {
      tracks: [],
      current: 0,
      loop: 'off',
      volume: 100,
      textChannelId
    };
    queues.set(guildId, queue);
    return queue;
  },

  addTrack(guildId: string, track: Track) {
    const queue = this.getQueue(guildId);
    if (queue) queue.tracks.push(track);
  },

  removeTrack(guildId: string, index: number) {
    const queue = this.getQueue(guildId);
    if (queue && index >= 0 && index < queue.tracks.length) {
      queue.tracks.splice(index, 1);
    }
  },

  skip(guildId: string) {
    const queue = this.getQueue(guildId);
    if (queue) queue.current++;
  },

  nextTrack(guildId: string): Track | null {
    const queue = this.getQueue(guildId);
    if (!queue) return null;

    if (queue.loop === 'track') {
      // Stay on current
    } else if (queue.loop === 'queue') {
      queue.current = (queue.current + 1) % queue.tracks.length;
    } else {
      queue.current++;
    }

    return this.getCurrentTrack(guildId);
  },

  shuffle(guildId: string) {
    const queue = this.getQueue(guildId);
    if (!queue || queue.tracks.length <= 1) return;
    
    const upcoming = queue.tracks.slice(queue.current + 1);
    for (let i = upcoming.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [upcoming[i], upcoming[j]] = [upcoming[j], upcoming[i]];
    }
    queue.tracks.splice(queue.current + 1, upcoming.length, ...upcoming);
  },

  clear(guildId: string) {
    const queue = this.getQueue(guildId);
    if (queue) {
      const current = queue.tracks[queue.current];
      queue.tracks = current ? [current] : [];
      queue.current = 0;
    }
  },

  deleteQueue(guildId: string) {
    queues.delete(guildId);
  },

  getCurrentTrack(guildId: string): Track | null {
    const queue = this.getQueue(guildId);
    if (!queue) return null;
    return queue.tracks[queue.current] || null;
  },

  setLoop(guildId: string, mode: LoopMode) {
    const queue = this.getQueue(guildId);
    if (queue) queue.loop = mode;
  },

  setVolume(guildId: string, volume: number) {
    const queue = this.getQueue(guildId);
    if (queue) queue.volume = volume;
  }
};
