import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw err;
  }
}

/** Writes atomically (temp file + rename) so a crash never leaves half a file. */
export async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, file);
}

/** Serialises writes to one file so concurrent requests can't interleave. */
export class JsonFile<T> {
  private queue: Promise<void> = Promise.resolve();

  constructor(readonly file: string) {}

  read(fallback: T): Promise<T> {
    return readJson(this.file, fallback);
  }

  write(value: T): Promise<void> {
    const next = this.queue.then(() => writeJson(this.file, value));
    this.queue = next.catch(() => {});
    return next;
  }
}
