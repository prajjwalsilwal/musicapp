import { randomUUID } from 'node:crypto';
import { JsonFile } from './json-file.js';

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

export class Playlists {
  private items: Playlist[] = [];
  private store: JsonFile<Playlist[]>;

  constructor(file: string) {
    this.store = new JsonFile(file);
  }

  async load(): Promise<void> {
    this.items = await this.store.read([]);
  }

  private save(): Promise<void> {
    return this.store.write(this.items);
  }

  list(): Playlist[] {
    return [...this.items].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  get(id: string): Playlist | undefined {
    return this.items.find((p) => p.id === id);
  }

  async create(name: string, trackIds: string[] = []): Promise<Playlist> {
    const now = Date.now();
    const playlist: Playlist = { id: randomUUID(), name, trackIds, createdAt: now, updatedAt: now };
    this.items.push(playlist);
    await this.save();
    return playlist;
  }

  async update(id: string, patch: { name?: string; trackIds?: string[] }): Promise<Playlist | undefined> {
    const playlist = this.get(id);
    if (!playlist) return undefined;
    if (patch.name !== undefined) playlist.name = patch.name;
    if (patch.trackIds !== undefined) playlist.trackIds = patch.trackIds;
    playlist.updatedAt = Date.now();
    await this.save();
    return playlist;
  }

  async addTracks(id: string, trackIds: string[]): Promise<Playlist | undefined> {
    const playlist = this.get(id);
    return playlist && this.update(id, { trackIds: [...playlist.trackIds, ...trackIds] });
  }

  async removeAt(id: string, index: number): Promise<Playlist | undefined> {
    const playlist = this.get(id);
    if (!playlist || index < 0 || index >= playlist.trackIds.length) return undefined;
    return this.update(id, { trackIds: playlist.trackIds.filter((_, i) => i !== index) });
  }

  async remove(id: string): Promise<boolean> {
    const before = this.items.length;
    this.items = this.items.filter((p) => p.id !== id);
    if (this.items.length === before) return false;
    await this.save();
    return true;
  }

  /** Drops a deleted track from every playlist. */
  async purgeTrack(trackId: string): Promise<void> {
    let changed = false;
    for (const p of this.items) {
      if (p.trackIds.includes(trackId)) {
        p.trackIds = p.trackIds.filter((t) => t !== trackId);
        changed = true;
      }
    }
    if (changed) await this.save();
  }
}

/** Liked songs, newest first. */
export class Likes {
  private ids: string[] = [];
  private store: JsonFile<string[]>;

  constructor(file: string) {
    this.store = new JsonFile(file);
  }

  async load(): Promise<void> {
    this.ids = await this.store.read([]);
  }

  list(): string[] {
    return [...this.ids];
  }

  async add(id: string): Promise<void> {
    if (this.ids.includes(id)) return;
    this.ids.unshift(id);
    await this.store.write(this.ids);
  }

  async remove(id: string): Promise<void> {
    if (!this.ids.includes(id)) return;
    this.ids = this.ids.filter((x) => x !== id);
    await this.store.write(this.ids);
  }
}
