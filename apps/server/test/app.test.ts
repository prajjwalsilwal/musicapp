import { mkdtempSync, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp, safeFileName, type App } from '../src/app.js';

/** A tiny valid 16-bit mono PCM WAV file. */
function wav(seconds = 0.5, sampleRate = 8000): Buffer {
  const samples = Math.round(seconds * sampleRate);
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) data.writeInt16LE(Math.round(Math.sin(i / 10) * 8000), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function multipartBody(files: { name: string; data: Buffer }[]) {
  const boundary = '----musicapp-test';
  const parts = files.map((f) =>
    Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${f.name}"\r\n` +
          'Content-Type: application/octet-stream\r\n\r\n',
      ),
      f.data,
      Buffer.from('\r\n'),
    ]),
  );
  return {
    payload: Buffer.concat([...parts, Buffer.from(`--${boundary}--\r\n`)]),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  };
}

let dir: string;
let ctx: App;

beforeEach(async () => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'musicapp-'));
  const mediaDir = path.join(dir, 'media');
  await fs.mkdir(path.join(mediaDir, 'Some Artist'), { recursive: true });
  await fs.writeFile(path.join(mediaDir, 'Some Artist', 'First Song.wav'), wav());
  await fs.writeFile(path.join(mediaDir, 'notes.txt'), 'not audio');
  ctx = await buildApp({ mediaDir, dataDir: dir, port: 0, host: '127.0.0.1' });
  await ctx.library.scan();
});

afterEach(async () => {
  await ctx.app.close();
  await fs.rm(dir, { recursive: true, force: true });
});

describe('library', () => {
  it('indexes audio files and ignores others', async () => {
    const res = await ctx.app.inject('/api/tracks');
    const tracks = res.json();
    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({ title: 'First Song', path: 'Some Artist/First Song.wav', artist: 'Unknown Artist' });
    expect(tracks[0].duration).toBeCloseTo(0.5, 1);
  });

  it('streams with HTTP range support', async () => {
    const [track] = (await ctx.app.inject('/api/tracks')).json();
    const full = await ctx.app.inject(`/api/tracks/${track.id}/stream`);
    expect(full.statusCode).toBe(200);
    expect(full.headers['accept-ranges']).toBe('bytes');

    const partial = await ctx.app.inject({ url: `/api/tracks/${track.id}/stream`, headers: { range: 'bytes=0-99' } });
    expect(partial.statusCode).toBe(206);
    expect(partial.headers['content-length']).toBe('100');
    expect(partial.headers['content-range']).toMatch(/^bytes 0-99\//);
  });

  it('uploads audio and skips other files', async () => {
    const body = multipartBody([
      { name: 'New Tune.wav', data: wav(0.25) },
      { name: '../../evil.wav', data: wav(0.25) },
      { name: 'cover.jpg', data: Buffer.from('jpg') },
    ]);
    const res = await ctx.app.inject({ method: 'POST', url: '/api/upload', ...body });
    expect(res.statusCode).toBe(200);
    const { added, skipped } = res.json();
    expect(added.map((t: { path: string }) => t.path)).toEqual(['uploads/New Tune.wav', 'uploads/evil.wav']);
    expect(skipped).toEqual([{ name: 'cover.jpg', reason: 'Not an audio file' }]);
    expect((await ctx.app.inject('/api/tracks')).json()).toHaveLength(3);
  });

  it('deletes a track and removes it from likes and playlists', async () => {
    const [track] = (await ctx.app.inject('/api/tracks')).json();
    await ctx.app.inject({ method: 'PUT', url: `/api/likes/${track.id}` });
    const pl = (await ctx.app.inject({ method: 'POST', url: '/api/playlists', payload: { name: 'Mix', trackIds: [track.id] } })).json();

    expect((await ctx.app.inject({ method: 'DELETE', url: `/api/tracks/${track.id}` })).statusCode).toBe(204);
    expect((await ctx.app.inject('/api/tracks')).json()).toEqual([]);
    expect((await ctx.app.inject('/api/likes')).json()).toEqual([]);
    expect((await ctx.app.inject(`/api/playlists/${pl.id}`)).json().trackIds).toEqual([]);
  });
});

describe('playlists and likes', () => {
  it('supports create, add, remove, rename and delete', async () => {
    const [track] = (await ctx.app.inject('/api/tracks')).json();
    const created = await ctx.app.inject({ method: 'POST', url: '/api/playlists', payload: { name: '  Road Trip ' } });
    expect(created.statusCode).toBe(201);
    const { id } = created.json();

    let pl = (await ctx.app.inject({ method: 'POST', url: `/api/playlists/${id}/tracks`, payload: { trackIds: [track.id, track.id] } })).json();
    expect(pl).toMatchObject({ name: 'Road Trip', trackIds: [track.id, track.id] });

    pl = (await ctx.app.inject({ method: 'DELETE', url: `/api/playlists/${id}/tracks/0` })).json();
    expect(pl.trackIds).toEqual([track.id]);

    pl = (await ctx.app.inject({ method: 'PATCH', url: `/api/playlists/${id}`, payload: { name: 'Night Drive' } })).json();
    expect(pl.name).toBe('Night Drive');

    expect((await ctx.app.inject({ method: 'POST', url: '/api/playlists', payload: { name: '' } })).statusCode).toBe(400);
    expect((await ctx.app.inject({ method: 'DELETE', url: `/api/playlists/${id}` })).statusCode).toBe(204);
    expect((await ctx.app.inject('/api/playlists')).json()).toEqual([]);
  });

  it('likes and unlikes, persisting to disk', async () => {
    const [track] = (await ctx.app.inject('/api/tracks')).json();
    expect((await ctx.app.inject({ method: 'PUT', url: `/api/likes/${track.id}` })).statusCode).toBe(204);
    expect((await ctx.app.inject({ method: 'PUT', url: '/api/likes/nope' })).statusCode).toBe(404);
    expect(JSON.parse(await fs.readFile(path.join(dir, 'likes.json'), 'utf8'))).toEqual([track.id]);
    await ctx.app.inject({ method: 'DELETE', url: `/api/likes/${track.id}` });
    expect((await ctx.app.inject('/api/likes')).json()).toEqual([]);
  });
});

describe('safeFileName', () => {
  it('strips paths and unsafe characters', () => {
    expect(safeFileName('../../etc/passwd.mp3')).toBe('passwd.mp3');
    expect(safeFileName('Beyoncé – Halo?.MP3')).toBe('Beyoncé _ Halo_.mp3');
    expect(safeFileName('.hidden.mp3')).toBe('hidden.mp3');
  });
});
