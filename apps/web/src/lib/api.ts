export interface Track {
  id: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  trackNo: number | null;
  discNo: number | null;
  year: number | null;
  genre: string | null;
  duration: number;
  hasArt: boolean;
  size: number;
  addedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface UploadResult {
  added: Track[];
  skipped: { name: string; reason: string }[];
}

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: body === undefined ? undefined : { 'content-type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const streamUrl = (id: string) => `${BASE}/api/tracks/${id}/stream`;
export const artUrl = (t: Pick<Track, 'id' | 'hasArt'>) => (t.hasArt ? `${BASE}/api/tracks/${t.id}/art` : null);

export const api = {
  tracks: () => request<Track[]>('/api/tracks'),
  deleteTrack: (id: string) => request<void>(`/api/tracks/${id}`, { method: 'DELETE' }),
  rescan: () => request<{ added: number; removed: number; total: number }>('/api/library/rescan', { method: 'POST' }),

  likes: () => request<string[]>('/api/likes'),
  like: (id: string) => request<void>(`/api/likes/${id}`, { method: 'PUT' }),
  unlike: (id: string) => request<void>(`/api/likes/${id}`, { method: 'DELETE' }),

  playlists: () => request<Playlist[]>('/api/playlists'),
  createPlaylist: (name: string, trackIds: string[] = []) =>
    request<Playlist>('/api/playlists', json('POST', { name, trackIds })),
  updatePlaylist: (id: string, patch: { name?: string; trackIds?: string[] }) =>
    request<Playlist>(`/api/playlists/${id}`, json('PATCH', patch)),
  deletePlaylist: (id: string) => request<void>(`/api/playlists/${id}`, { method: 'DELETE' }),
  addToPlaylist: (id: string, trackIds: string[]) =>
    request<Playlist>(`/api/playlists/${id}/tracks`, json('POST', { trackIds })),
  removeFromPlaylist: (id: string, index: number) =>
    request<Playlist>(`/api/playlists/${id}/tracks/${index}`, { method: 'DELETE' }),

  /** Uses XHR rather than fetch so the UI can show upload progress. */
  upload(files: File[], onProgress?: (fraction: number) => void): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      for (const f of files) form.append('files', f, f.name);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/api/upload`);
      xhr.responseType = 'json';
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
      xhr.onload = () =>
        xhr.status < 300 ? resolve(xhr.response as UploadResult) : reject(new Error(`Upload failed (${xhr.status})`));
      xhr.onerror = () => reject(new Error('Upload failed: network error'));
      xhr.send(form);
    });
  },
};
