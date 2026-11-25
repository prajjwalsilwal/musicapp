import { createHash } from 'node:crypto';
import { promises as fs, type Stats } from 'node:fs';
import path from 'node:path';
import { parseFile } from 'music-metadata';
import { JsonFile } from './json-file.js';

export interface Track {
  id: string;
  /** Path relative to the media directory, always with forward slashes. */
  path: string;
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  trackNo: number | null;
  discNo: number | null;
  year: number | null;
  genre: string | null;
  /** Seconds. */
  duration: number;
  hasArt: boolean;
  size: number;
  mtimeMs: number;
  addedAt: number;
}

export const UNKNOWN_ARTIST = 'Unknown Artist';
export const UNKNOWN_ALBUM = 'Unknown Album';

export const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.m4a', '.aac', '.mp4', '.alac', '.flac', '.wav', '.aif', '.aiff', '.ogg', '.oga', '.opus', '.webm',
]);

export function isAudioFile(name: string): boolean {
  return AUDIO_EXTENSIONS.has(path.extname(name).toLowerCase());
}

export function trackId(relPath: string): string {
  return createHash('sha1').update(relPath).digest('hex').slice(0, 16);
}

async function walk(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile() && isAudioFile(entry.name)) out.push(full);
  }
  return out;
}

async function readTrack(abs: string, rel: string, stat: Stats, addedAt?: number): Promise<Track> {
  const base: Track = {
    id: trackId(rel),
    path: rel,
    title: path.basename(rel, path.extname(rel)),
    artist: UNKNOWN_ARTIST,
    album: UNKNOWN_ALBUM,
    albumArtist: UNKNOWN_ARTIST,
    trackNo: null,
    discNo: null,
    year: null,
    genre: null,
    duration: 0,
    hasArt: false,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    addedAt: addedAt ?? Date.now(),
  };
  try {
    const { common, format } = await parseFile(abs);
    const artist = common.artist?.trim() || common.artists?.[0]?.trim() || UNKNOWN_ARTIST;
    return {
      ...base,
      title: common.title?.trim() || base.title,
      artist,
      album: common.album?.trim() || UNKNOWN_ALBUM,
      albumArtist: common.albumartist?.trim() || artist,
      trackNo: common.track.no ?? null,
      discNo: common.disk.no ?? null,
      year: common.year ?? null,
      genre: common.genre?.[0] ?? null,
      duration: format.duration ?? 0,
      hasArt: (common.picture?.length ?? 0) > 0,
    };
  } catch {
    // Unreadable tags: still list the file, named after itself.
    return base;
  }
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

export function compareTracks(a: Track, b: Track): number {
  return (
    collator.compare(a.albumArtist, b.albumArtist) ||
    collator.compare(a.album, b.album) ||
    (a.discNo ?? 0) - (b.discNo ?? 0) ||
    (a.trackNo ?? 0) - (b.trackNo ?? 0) ||
    collator.compare(a.title, b.title)
  );
}

export class Library {
  private tracks = new Map<string, Track>();
  private index: JsonFile<Track[]>;

  constructor(readonly mediaDir: string, indexFile: string) {
    this.index = new JsonFile(indexFile);
  }

  async load(): Promise<void> {
    const saved = await this.index.read([]);
    this.tracks = new Map(saved.map((t) => [t.id, t]));
  }

  private save(): Promise<void> {
    return this.index.write([...this.tracks.values()]);
  }

  /** Re-reads the media folder. Files whose size and mtime haven't changed are not re-parsed. */
  async scan(): Promise<{ added: number; removed: number; total: number }> {
    await fs.mkdir(this.mediaDir, { recursive: true });
    const seen = new Set<string>();
    let added = 0;
    for (const abs of await walk(this.mediaDir)) {
      const rel = this.relPath(abs);
      const id = trackId(rel);
      seen.add(id);
      const stat = await fs.stat(abs);
      const existing = this.tracks.get(id);
      if (existing && existing.size === stat.size && existing.mtimeMs === stat.mtimeMs) continue;
      if (!existing) added++;
      this.tracks.set(id, await readTrack(abs, rel, stat, existing?.addedAt));
    }
    let removed = 0;
    for (const id of [...this.tracks.keys()]) {
      if (!seen.has(id)) {
        this.tracks.delete(id);
        removed++;
      }
    }
    await this.save();
    return { added, removed, total: this.tracks.size };
  }

  /** Indexes one file that was just written into the media folder. */
  async addFile(abs: string): Promise<Track> {
    const rel = this.relPath(abs);
    const track = await readTrack(abs, rel, await fs.stat(abs), this.tracks.get(trackId(rel))?.addedAt);
    this.tracks.set(track.id, track);
    await this.save();
    return track;
  }

  async deleteTrack(id: string): Promise<boolean> {
    const track = this.tracks.get(id);
    if (!track) return false;
    await fs.rm(this.absPath(track), { force: true });
    this.tracks.delete(id);
    await this.save();
    return true;
  }

  list(): Track[] {
    return [...this.tracks.values()].sort(compareTracks);
  }

  get(id: string): Track | undefined {
    return this.tracks.get(id);
  }

  absPath(track: Track): string {
    return path.join(this.mediaDir, ...track.path.split('/'));
  }

  async picture(id: string): Promise<{ data: Uint8Array; format: string } | null> {
    const track = this.tracks.get(id);
    if (!track?.hasArt) return null;
    try {
      const { common } = await parseFile(this.absPath(track));
      const pictures = common.picture ?? [];
      const pic = pictures.find((p) => p.type === 'Cover (front)') ?? pictures[0];
      return pic ? { data: pic.data, format: pic.format } : null;
    } catch {
      return null;
    }
  }

  private relPath(abs: string): string {
    return path.relative(this.mediaDir, abs).split(path.sep).join('/');
  }
}
