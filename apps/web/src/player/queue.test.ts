import { describe, expect, it } from 'vitest';
import { advance, cycleRepeat, enqueue, removeAt, retreat, setShuffle, startQueue } from './queue';

const t = (id: string) => ({ id });
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).join('');
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe('queue', () => {
  const tracks = ['a', 'b', 'c', 'd'].map(t);

  it('advances and stops at the end when repeat is off', () => {
    let q = startQueue(tracks, 2);
    q = advance(q, true)!;
    expect(q.index).toBe(3);
    expect(advance(q, true)).toBeNull();
  });

  it('wraps with repeat all and replays with repeat one', () => {
    let q = startQueue(tracks, 3, { repeat: 'all' });
    expect(advance(q, true)!.index).toBe(0);
    q = { ...q, repeat: 'one' };
    expect(advance(q, true)!.index).toBe(3); // auto: same track again
    expect(advance(q, false)!.index).toBe(0); // manual skip still moves on
  });

  it('goes back, wrapping only with repeat all', () => {
    expect(retreat(startQueue(tracks, 0)).index).toBe(0);
    expect(retreat(startQueue(tracks, 0, { repeat: 'all' })).index).toBe(3);
  });

  it('shuffles with the current track first and restores order', () => {
    const q = startQueue(tracks, 2);
    const s = setShuffle(q, true, seq(0, 0, 0));
    expect(s.items[0]!.id).toBe('c');
    expect(s.index).toBe(0);
    expect(ids(s.items).split('').sort().join('')).toBe('abcd');
    const back = setShuffle({ ...s, index: 2 }, false);
    expect(ids(back.items)).toBe('abcd');
    expect(back.items[back.index]).toBe(s.items[2]);
  });

  it('cycles repeat modes', () => {
    const q = startQueue(tracks, 0);
    expect([cycleRepeat(q).repeat, cycleRepeat(cycleRepeat(q)).repeat]).toEqual(['all', 'one']);
  });

  it('plays next and appends', () => {
    const q = startQueue(tracks, 1);
    expect(ids(enqueue(q, [t('x')], 'next').items)).toBe('abxcd');
    expect(ids(enqueue(q, [t('x')], 'end').items)).toBe('abcdx');
  });

  it('removes items and keeps the current track', () => {
    const q = startQueue(tracks, 2);
    const r = removeAt(q, 0);
    expect(ids(r.items)).toBe('bcd');
    expect(r.items[r.index]!.id).toBe('c');
    expect(removeAt(q, 2)).toBe(q); // can't remove what's playing
  });
});
