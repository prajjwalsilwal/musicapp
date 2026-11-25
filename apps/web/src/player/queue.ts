import { shuffled } from '../lib/format';

export type Repeat = 'off' | 'all' | 'one';

/**
 * Pure queue logic, kept apart from the audio element so it can be unit-tested.
 * `original` is the order the user picked; `items` is the play order (shuffled or not).
 */
export interface QueueState<T> {
  original: T[];
  items: T[];
  index: number;
  shuffle: boolean;
  repeat: Repeat;
}

type Rng = () => number;

export function startQueue<T>(
  tracks: T[],
  startIndex: number,
  opts: { shuffle?: boolean; repeat?: Repeat } = {},
  rng: Rng = Math.random,
): QueueState<T> {
  const index = Math.min(Math.max(startIndex, 0), tracks.length - 1);
  const base: QueueState<T> = {
    original: [...tracks],
    items: [...tracks],
    index,
    shuffle: false,
    repeat: opts.repeat ?? 'off',
  };
  return opts.shuffle ? setShuffle(base, true, rng) : base;
}

export function current<T>(q: QueueState<T> | null): T | null {
  return q ? (q.items[q.index] ?? null) : null;
}

/** Returns the next state, or null when playback should stop (end of queue, repeat off). */
export function advance<T>(q: QueueState<T>, auto: boolean): QueueState<T> | null {
  if (auto && q.repeat === 'one') return { ...q };
  if (q.index + 1 < q.items.length) return { ...q, index: q.index + 1 };
  return q.repeat === 'off' ? null : { ...q, index: 0 };
}

export function retreat<T>(q: QueueState<T>): QueueState<T> {
  if (q.index > 0) return { ...q, index: q.index - 1 };
  return q.repeat === 'all' ? { ...q, index: q.items.length - 1 } : { ...q, index: 0 };
}

export function jumpTo<T>(q: QueueState<T>, index: number): QueueState<T> {
  return index >= 0 && index < q.items.length ? { ...q, index } : q;
}

export function setShuffle<T>(q: QueueState<T>, on: boolean, rng: Rng = Math.random): QueueState<T> {
  const now = q.items[q.index];
  if (now === undefined) return { ...q, shuffle: on };
  if (on) {
    // Keep the playing track first, shuffle everything else after it.
    const rest = [...q.original];
    rest.splice(Math.max(rest.indexOf(now), 0), 1);
    return { ...q, shuffle: true, items: [now, ...shuffled(rest, rng)], index: 0 };
  }
  const index = q.original.indexOf(now);
  return { ...q, shuffle: false, items: [...q.original], index: Math.max(index, 0) };
}

export function cycleRepeat<T>(q: QueueState<T>): QueueState<T> {
  const next: Record<Repeat, Repeat> = { off: 'all', all: 'one', one: 'off' };
  return { ...q, repeat: next[q.repeat] };
}

/** "Play next" inserts right after the current track; "add to queue" appends. */
export function enqueue<T>(q: QueueState<T>, tracks: T[], position: 'next' | 'end'): QueueState<T> {
  if (position === 'end') {
    return { ...q, items: [...q.items, ...tracks], original: [...q.original, ...tracks] };
  }
  const items = [...q.items];
  items.splice(q.index + 1, 0, ...tracks);
  const original = [...q.original];
  const now = q.items[q.index];
  const at = now === undefined ? original.length : original.indexOf(now) + 1;
  original.splice(at, 0, ...tracks);
  return { ...q, items, original };
}

export function removeAt<T>(q: QueueState<T>, index: number): QueueState<T> {
  if (index === q.index || index < 0 || index >= q.items.length) return q;
  const removed = q.items[index]!;
  const items = q.items.filter((_, i) => i !== index);
  const oi = q.original.indexOf(removed);
  const original = oi === -1 ? q.original : q.original.filter((_, i) => i !== oi);
  return { ...q, items, original, index: index < q.index ? q.index - 1 : q.index };
}
