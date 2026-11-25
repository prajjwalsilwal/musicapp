import { createWriteStream, existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { Likes, Playlists } from './collections.js';
import type { Config } from './config.js';
import { isAudioFile, Library, type Track } from './library.js';

const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024; // 1 GB per file

type IdParams = { Params: { id: string } };

const nameSchema = { type: 'string', minLength: 1, maxLength: 200 } as const;
const idsSchema = { type: 'array', items: { type: 'string' }, maxItems: 10000 } as const;

export interface App {
  app: FastifyInstance;
  library: Library;
}

export async function buildApp(config: Config, opts: { logger?: boolean } = {}): Promise<App> {
  await fs.mkdir(config.mediaDir, { recursive: true });

  const library = new Library(config.mediaDir, path.join(config.dataDir, 'library.json'));
  const playlists = new Playlists(path.join(config.dataDir, 'playlists.json'));
  const likes = new Likes(path.join(config.dataDir, 'likes.json'));
  await Promise.all([library.load(), playlists.load(), likes.load()]);

  const app = Fastify({ logger: opts.logger ?? false });
  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 200 } });
  // Gives reply.sendFile(), which handles HTTP Range requests. iOS Safari won't play audio without them.
  await app.register(fastifyStatic, { root: config.mediaDir, serve: false });

  const notFound = { error: 'Not found' };

  app.get('/api/health', async () => ({ ok: true, tracks: library.list().length }));

  // ---- Tracks ---------------------------------------------------------------

  app.get('/api/tracks', async () => library.list());

  app.get<IdParams>('/api/tracks/:id', async (req, reply) => {
    return library.get(req.params.id) ?? reply.code(404).send(notFound);
  });

  app.get<IdParams>('/api/tracks/:id/stream', async (req, reply) => {
    const track = library.get(req.params.id);
    if (!track) return reply.code(404).send(notFound);
    return reply.header('Cache-Control', 'private, max-age=86400').sendFile(track.path);
  });

  app.get<IdParams>('/api/tracks/:id/art', async (req, reply) => {
    const pic = await library.picture(req.params.id);
    if (!pic) return reply.code(404).send(notFound);
    return reply
      .type(pic.format.includes('/') ? pic.format : `image/${pic.format}`)
      .header('Cache-Control', 'public, max-age=604800')
      .send(Buffer.from(pic.data));
  });

  app.delete<IdParams>('/api/tracks/:id', async (req, reply) => {
    const id = req.params.id;
    if (!(await library.deleteTrack(id))) return reply.code(404).send(notFound);
    await Promise.all([likes.remove(id), playlists.purgeTrack(id)]);
    return reply.code(204).send();
  });

  app.post('/api/library/rescan', async () => library.scan());

  app.post('/api/upload', async (req) => {
    const uploadDir = path.join(config.mediaDir, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    const added: Track[] = [];
    const skipped: { name: string; reason: string }[] = [];
    for await (const part of req.files()) {
      if (!isAudioFile(part.filename)) {
        part.file.resume();
        skipped.push({ name: part.filename, reason: 'Not an audio file' });
        continue;
      }
      const dest = await uniquePath(uploadDir, safeFileName(part.filename));
      await pipeline(part.file, createWriteStream(dest));
      if (part.file.truncated) {
        await fs.rm(dest, { force: true });
        skipped.push({ name: part.filename, reason: 'File too large' });
        continue;
      }
      added.push(await library.addFile(dest));
    }
    return { added, skipped };
  });

  // ---- Likes ----------------------------------------------------------------

  app.get('/api/likes', async () => likes.list());

  app.put<IdParams>('/api/likes/:id', async (req, reply) => {
    if (!library.get(req.params.id)) return reply.code(404).send(notFound);
    await likes.add(req.params.id);
    return reply.code(204).send();
  });

  app.delete<IdParams>('/api/likes/:id', async (req, reply) => {
    await likes.remove(req.params.id);
    return reply.code(204).send();
  });

  // ---- Playlists ------------------------------------------------------------

  app.get('/api/playlists', async () => playlists.list());

  app.post<{ Body: { name: string; trackIds?: string[] } }>(
    '/api/playlists',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: { name: nameSchema, trackIds: idsSchema },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => reply.code(201).send(await playlists.create(req.body.name.trim(), req.body.trackIds)),
  );

  app.get<IdParams>('/api/playlists/:id', async (req, reply) => {
    return playlists.get(req.params.id) ?? reply.code(404).send(notFound);
  });

  app.patch<IdParams & { Body: { name?: string; trackIds?: string[] } }>(
    '/api/playlists/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: { name: nameSchema, trackIds: idsSchema },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const updated = await playlists.update(req.params.id, { ...req.body, name: req.body.name?.trim() });
      return updated ?? reply.code(404).send(notFound);
    },
  );

  app.delete<IdParams>('/api/playlists/:id', async (req, reply) => {
    if (!(await playlists.remove(req.params.id))) return reply.code(404).send(notFound);
    return reply.code(204).send();
  });

  app.post<IdParams & { Body: { trackIds: string[] } }>(
    '/api/playlists/:id/tracks',
    {
      schema: {
        body: {
          type: 'object',
          required: ['trackIds'],
          properties: { trackIds: idsSchema },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const updated = await playlists.addTracks(req.params.id, req.body.trackIds);
      return updated ?? reply.code(404).send(notFound);
    },
  );

  app.delete<{ Params: { id: string; index: string } }>('/api/playlists/:id/tracks/:index', async (req, reply) => {
    const updated = await playlists.removeAt(req.params.id, Number(req.params.index));
    return updated ?? reply.code(404).send(notFound);
  });

  // ---- Web app (production) -------------------------------------------------

  const webDir = config.webDir;
  const hasWeb = webDir !== undefined && existsSync(path.join(webDir, 'index.html'));
  if (hasWeb) {
    await app.register(fastifyStatic, { root: webDir, prefix: '/', decorateReply: false });
  }

  app.setNotFoundHandler((req, reply) => {
    // Client-side routes (/album/..., /car) fall back to the app shell.
    if (hasWeb && req.method === 'GET' && !req.url.startsWith('/api/')) {
      return reply.header('Cache-Control', 'no-cache').sendFile('index.html', webDir);
    }
    return reply.code(404).send(notFound);
  });

  return { app, library };
}

export function safeFileName(name: string): string {
  const base = path.basename(name).normalize('NFC');
  const ext = path.extname(base).toLowerCase();
  const stem = base
    .slice(0, base.length - ext.length)
    .replace(/[^\p{L}\p{N} ._()&'[\]-]+/gu, '_')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 150);
  return `${stem || 'track'}${ext}`;
}

async function uniquePath(dir: string, fileName: string): Promise<string> {
  const ext = path.extname(fileName);
  const stem = fileName.slice(0, fileName.length - ext.length);
  for (let i = 0; ; i++) {
    const candidate = path.join(dir, i === 0 ? fileName : `${stem} (${i})${ext}`);
    if (!existsSync(candidate)) return candidate;
  }
}
