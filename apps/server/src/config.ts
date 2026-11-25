import path from 'node:path';

export interface Config {
  /** Where music files live. Uploads go into `<mediaDir>/uploads`. */
  mediaDir: string;
  /** Where the library index, playlists and likes are stored. */
  dataDir: string;
  /** Built web app to serve (apps/web/dist). Skipped when it doesn't exist. */
  webDir?: string;
  port: number;
  host: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const dataDir = path.resolve(env.DATA_DIR ?? 'data');
  return {
    dataDir,
    mediaDir: path.resolve(env.MEDIA_DIR ?? path.join(dataDir, 'media')),
    webDir: path.resolve(env.WEB_DIR ?? path.join(import.meta.dirname, '../../web/dist')),
    port: Number(env.PORT ?? 4000),
    host: env.HOST ?? '0.0.0.0',
  };
}
