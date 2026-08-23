import { getNode } from './lavalink.service.js';
import { Track } from '../../types/music.js';
import { Track as ShoukakuTrack } from 'shoukaku';
import { logger } from '../../utils/logger.js';

export const SearchService = {
  async search(query: string, requester: string): Promise<Track[]> {
    const node = getNode();
    const isUrl = /^https?:\/\//.test(query);

    if (isUrl) {
      try {
        const result = await node.rest.resolve(query);
        if (!result || !result.data) return [];

        let tracksData: ShoukakuTrack[] = [];
        if (result.loadType === 'playlist') {
          tracksData = (result.data as { tracks: ShoukakuTrack[] }).tracks || [];
        } else if (result.loadType === 'track') {
          tracksData = [result.data as ShoukakuTrack];
        } else if (result.loadType === 'search') {
          tracksData = Array.isArray(result.data) ? result.data.slice(0, 5) : [];
        }

        return tracksData.map((t: ShoukakuTrack) => ({
          title: t.info.title,
          url: t.info.uri || query,
          duration: t.info.length,
          requester,
          author: t.info.author,
          shoukakuTrack: t,
        }));
      } catch (err) {
        logger.error({ err }, `Failed to resolve URL: ${query}`);
        return [];
      }
    }

    // Prioritize SoundCloud (scsearch:) for 100% reliable, unblocked audio streams on VPS
    // Followed by YouTube Music (ytmsearch:) and YouTube (ytsearch:)
    const searchPrefixes = ['scsearch:', 'ytmsearch:', 'ytsearch:'];

    for (const prefix of searchPrefixes) {
      try {
        const searchParam = `${prefix}${query}`;
        const result = await node.rest.resolve(searchParam);

        if (!result || !result.data) continue;

        let tracksData: ShoukakuTrack[] = [];
        if (result.loadType === 'search' && Array.isArray(result.data) && result.data.length > 0) {
          tracksData = result.data.slice(0, 5);
        } else if (result.loadType === 'track' && result.data) {
          tracksData = [result.data as ShoukakuTrack];
        } else if (result.loadType === 'playlist' && (result.data as { tracks: ShoukakuTrack[] }).tracks?.length > 0) {
          tracksData = (result.data as { tracks: ShoukakuTrack[] }).tracks.slice(0, 5);
        }

        if (tracksData.length > 0) {
          return tracksData.map((t: ShoukakuTrack) => ({
            title: t.info.title,
            url: t.info.uri || '',
            duration: t.info.length,
            requester,
            author: t.info.author,
            shoukakuTrack: t,
          }));
        }
      } catch (err) {
        logger.warn({ prefix, err }, `Search with prefix ${prefix} failed, trying next...`);
      }
    }

    return [];
  },

  async searchByUrl(url: string, requester: string): Promise<Track | null> {
    const tracks = await this.search(url, requester);
    return tracks.length > 0 ? tracks[0] : null;
  },
};
