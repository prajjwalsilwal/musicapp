import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Playlist, type Track, type UploadResult } from './api';

export interface Album {
  key: string;
  name: string;
  artist: string;
  year: number | null;
  tracks: Track[];
  cover: Track;
  addedAt: number;
}

export interface Artist {
  name: string;
  tracks: Track[];
  albums: Album[];
  cover: Track;
}

export const albumKey = (t: Pick<Track, 'albumArtist' | 'album'>) => `${t.albumArtist}\u0000${t.album}`;
export const albumPath = (t: Pick<Track, 'albumArtist' | 'album'>) => `/album/${encodeURIComponent(albumKey(t))}`;
export const artistPath = (name: string) => `/artist/${encodeURIComponent(name)}`;

interface LibraryApi {
  ready: boolean;
  error: string | null;
  tracks: Track[];
  byId: Map<string, Track>;
  albums: Album[];
  albumsByKey: Map<string, Album>;
  artists: Artist[];
  artistsByName: Map<string, Artist>;
  playlists: Playlist[];
  liked: Track[];
  isLiked: (id: string) => boolean;
  refresh: () => Promise<void>;
  toggleLike: (id: string) => Promise<void>;
  createPlaylist: (name: string, trackIds?: string[]) => Promise<Playlist>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (id: string, trackIds: string[]) => Promise<void>;
  removeFromPlaylist: (id: string, index: number) => Promise<void>;
  upload: (files: File[], onProgress?: (f: number) => void) => Promise<UploadResult>;
  deleteTrack: (id: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryApi | null>(null);

export function useLibrary(): LibraryApi {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary outside LibraryProvider');
  return ctx;
}

function groupAlbums(tracks: Track[]): Album[] {
  const map = new Map<string, Album>();
  for (const t of tracks) {
    const key = albumKey(t);
    let album = map.get(key);
    if (!album) {
      album = { key, name: t.album, artist: t.albumArtist, year: t.year, tracks: [], cover: t, addedAt: t.addedAt };
      map.set(key, album);
    }
    album.tracks.push(t);
    if (!album.cover.hasArt && t.hasArt) album.cover = t;
    album.year ??= t.year;
    album.addedAt = Math.max(album.addedAt, t.addedAt);
  }
  return [...map.values()];
}

function groupArtists(tracks: Track[], albums: Album[]): Artist[] {
  const map = new Map<string, Artist>();
  for (const t of tracks) {
    let artist = map.get(t.albumArtist);
    if (!artist) {
      artist = { name: t.albumArtist, tracks: [], albums: [], cover: t };
      map.set(t.albumArtist, artist);
    }
    artist.tracks.push(t);
    if (!artist.cover.hasArt && t.hasArt) artist.cover = t;
  }
  for (const album of albums) map.get(album.artist)?.albums.push(album);
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [t, p, l] = await Promise.all([api.tracks(), api.playlists(), api.likes()]);
      setTracks(t);
      setPlaylists(p);
      setLikedIds(l);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const derived = useMemo(() => {
    const byId = new Map(tracks.map((t) => [t.id, t]));
    const albums = groupAlbums(tracks);
    const artists = groupArtists(tracks, albums);
    return {
      byId,
      albums,
      albumsByKey: new Map(albums.map((a) => [a.key, a])),
      artists,
      artistsByName: new Map(artists.map((a) => [a.name, a])),
    };
  }, [tracks]);

  const likedSet = useMemo(() => new Set(likedIds), [likedIds]);
  const liked = useMemo(
    () => likedIds.map((id) => derived.byId.get(id)).filter((t): t is Track => !!t),
    [likedIds, derived.byId],
  );

  const replacePlaylist = (p: Playlist) => setPlaylists((ps) => [p, ...ps.filter((x) => x.id !== p.id)]);

  const value = useMemo<LibraryApi>(
    () => ({
      ready,
      error,
      tracks,
      ...derived,
      playlists,
      liked,
      isLiked: (id) => likedSet.has(id),
      refresh,
      async toggleLike(id) {
        const was = likedSet.has(id);
        // Optimistic: flip now, roll back if the server says no.
        setLikedIds((ids) => (was ? ids.filter((x) => x !== id) : [id, ...ids]));
        try {
          await (was ? api.unlike(id) : api.like(id));
        } catch (err) {
          setLikedIds((ids) => (was ? [id, ...ids] : ids.filter((x) => x !== id)));
          throw err;
        }
      },
      async createPlaylist(name, trackIds) {
        const p = await api.createPlaylist(name, trackIds);
        replacePlaylist(p);
        return p;
      },
      async renamePlaylist(id, name) {
        replacePlaylist(await api.updatePlaylist(id, { name }));
      },
      async deletePlaylist(id) {
        await api.deletePlaylist(id);
        setPlaylists((ps) => ps.filter((p) => p.id !== id));
      },
      async addToPlaylist(id, trackIds) {
        replacePlaylist(await api.addToPlaylist(id, trackIds));
      },
      async removeFromPlaylist(id, index) {
        replacePlaylist(await api.removeFromPlaylist(id, index));
      },
      async upload(files, onProgress) {
        const result = await api.upload(files, onProgress);
        await refresh();
        return result;
      },
      async deleteTrack(id) {
        await api.deleteTrack(id);
        await refresh();
      },
    }),
    [ready, error, tracks, derived, playlists, liked, likedSet, refresh],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
