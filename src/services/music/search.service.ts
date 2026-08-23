import { getNode } from './lavalink.service.js';
import { SearchResult, Track } from '../../types/music.js';
import { Track as ShoukakuTrack } from 'shoukaku';

export const SearchService = {
  async search(query: string, requester: string): Promise<Track[]> {
    const node = getNode();
    const isUrl = /^https?:\/\//.test(query);
    const searchParam = isUrl ? query : `ytsearch:${query}`;
    
    const result = await node.rest.resolve(searchParam);
    if (!result || !result.data) return [];
    
    let tracksData: ShoukakuTrack[] = [];
    if (result.loadType === 'playlist') {
      tracksData = result.data.tracks || [];
    } else if (result.loadType === 'track') {
      tracksData = [result.data];
    } else if (result.loadType === 'search') {
      // In v4, search returns an array in data
      tracksData = Array.isArray(result.data) ? result.data.slice(0, 5) : [];
    }

    return tracksData.map((t: ShoukakuTrack) => ({
      title: t.info.title,
      url: t.info.uri || '',
      duration: t.info.length,
      requester,
      author: t.info.author,
      shoukakuTrack: t
    }));
  },

  async searchByUrl(url: string, requester: string): Promise<Track | null> {
    const tracks = await this.search(url, requester);
    return tracks.length > 0 ? tracks[0] : null;
  }
};
