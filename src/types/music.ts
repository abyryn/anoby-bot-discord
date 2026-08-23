import { Track as ShoukakuTrack } from 'shoukaku';

export interface Track {
  title: string;
  url: string;
  duration: number;
  requester: string;
  thumbnail?: string;
  author?: string;
  shoukakuTrack: ShoukakuTrack;
}

export type LoopMode = 'off' | 'track' | 'queue';

export interface GuildQueue {
  tracks: Track[];
  current: number;
  loop: LoopMode;
  volume: number;
  textChannelId: string;
}

export interface SearchResult {
  title: string;
  url: string;
  author: string;
  duration: number;
}

export interface PlayerState {
  playing: boolean;
  paused: boolean;
  volume: number;
}
