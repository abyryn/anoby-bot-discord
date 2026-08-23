import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

export interface SpotifyTrackInfo {
  title: string;
  artist: string;
  durationMs?: number;
}

export interface SpotifyPlaylistResult {
  name: string;
  type: 'track' | 'playlist' | 'album';
  tracks: SpotifyTrackInfo[];
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Get Spotify access token using client credentials if configured
 */
async function getSpotifyApiToken(): Promise<string | null> {
  const clientId = (process.env.SPOTIFY_CLIENT_ID || '').trim();
  const clientSecret = (process.env.SPOTIFY_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  try {
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (res.ok) {
      const data = await res.json() as { access_token: string; expires_in: number };
      cachedAccessToken = data.access_token;
      tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
      return cachedAccessToken;
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to get official Spotify API token');
  }

  return null;
}

export const SpotifyService = {
  isSpotifyUrl(url: string): boolean {
    return /(?:https?:\/\/open\.spotify\.com\/(track|playlist|album)\/|spotify:(track|playlist|album):)([a-zA-Z0-9]+)/.test(url);
  },

  parseUrl(url: string): { type: 'track' | 'playlist' | 'album'; id: string } | null {
    const match = url.match(/(?:https?:\/\/open\.spotify\.com\/(track|playlist|album)\/|spotify:(track|playlist|album):)([a-zA-Z0-9]+)/);
    if (!match) return null;
    const type = (match[1] || match[2]) as 'track' | 'playlist' | 'album';
    const id = match[3];
    return { type, id };
  },

  async getInfo(url: string): Promise<SpotifyPlaylistResult | null> {
    const parsed = this.parseUrl(url);
    if (!parsed) return null;

    const { type, id } = parsed;

    // 1. Try official Spotify API if credentials exist
    const token = await getSpotifyApiToken();
    if (token) {
      try {
        if (type === 'track') {
          const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json() as { name: string; artists: Array<{ name: string }>; duration_ms: number };
            return {
              name: data.name,
              type: 'track',
              tracks: [{
                title: data.name,
                artist: data.artists.map(a => a.name).join(', '),
                durationMs: data.duration_ms
              }]
            };
          }
        } else if (type === 'playlist') {
          const res = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json() as {
              name: string;
              tracks: {
                items: Array<{
                  track: {
                    name: string;
                    artists: Array<{ name: string }>;
                    duration_ms: number;
                  } | null;
                }>;
              };
            };
            const tracks: SpotifyTrackInfo[] = [];
            for (const item of data.tracks.items) {
              if (item.track) {
                tracks.push({
                  title: item.track.name,
                  artist: item.track.artists.map(a => a.name).join(', '),
                  durationMs: item.track.duration_ms
                });
              }
            }
            return {
              name: data.name,
              type: 'playlist',
              tracks
            };
          }
        } else if (type === 'album') {
          const res = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json() as {
              name: string;
              tracks: {
                items: Array<{
                  name: string;
                  artists: Array<{ name: string }>;
                  duration_ms: number;
                }>;
              };
            };
            const tracks = data.tracks.items.map(t => ({
              title: t.name,
              artist: t.artists.map(a => a.name).join(', '),
              durationMs: t.duration_ms
            }));
            return {
              name: data.name,
              type: 'album',
              tracks
            };
          }
        }
      } catch (apiErr) {
        logger.warn({ apiErr }, 'Official Spotify API request failed, falling back to public embed extraction');
      }
    }

    // 2. Fallback: Public Embed / oEmbed Scraping (No API key required)
    try {
      if (type === 'track') {
        const oEmbedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
        if (oEmbedRes.ok) {
          const oembed = await oEmbedRes.json() as { title: string; author_name: string };
          return {
            name: oembed.title,
            type: 'track',
            tracks: [{
              title: oembed.title,
              artist: oembed.author_name || 'Spotify Artist'
            }]
          };
        }
      }

      // For Playlists & Albums via Embed page
      const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
      const res = await fetch(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });

      if (!res.ok) return null;

      const html = await res.text();

      // Look for JSON in __NEXT_DATA__ or script tags
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nextDataMatch && nextDataMatch[1]) {
        try {
          const nextData = JSON.parse(nextDataMatch[1]);
          const entity = nextData?.props?.pageProps?.state?.data?.entity;
          if (entity) {
            const playlistName = entity.title || entity.name || 'Spotify Playlist';
            const trackList = entity.trackList || entity.tracksList || entity.tracks || [];
            
            const tracks: SpotifyTrackInfo[] = [];
            for (const t of trackList) {
              const title = t.title || t.name;
              const artist = t.subtitle || t.artists?.[0]?.name || entity.subtitle || 'Artist';
              if (title) {
                tracks.push({ title, artist, durationMs: t.duration });
              }
            }

            if (tracks.length > 0) {
              return { name: playlistName, type, tracks };
            }
          }
        } catch (parseErr) {
          logger.warn({ parseErr }, 'Failed to parse __NEXT_DATA__ from Spotify embed');
        }
      }

      // Extract title from <title> tag as fallback
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const pageTitle = titleMatch ? titleMatch[1].replace(' | Spotify', '').trim() : 'Spotify Playlist';

      // Regex fallback to find track items in HTML
      const trackMatches = [...html.matchAll(/"name":"([^"]+)","artists":\[{"name":"([^"]+)"/g)];
      if (trackMatches.length > 0) {
        const tracks: SpotifyTrackInfo[] = trackMatches.map(m => ({
          title: m[1],
          artist: m[2]
        }));
        return { name: pageTitle, type, tracks };
      }

      return {
        name: pageTitle,
        type,
        tracks: [{ title: pageTitle, artist: 'Spotify' }]
      };
    } catch (err) {
      logger.error({ err }, 'Error extracting Spotify metadata');
      return null;
    }
  }
};
