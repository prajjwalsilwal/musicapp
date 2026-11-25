import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { artUrl, streamUrl, type Track } from '../lib/api';
import { useLibrary } from '../lib/library';
import * as Q from './queue';

type Queue = Q.QueueState<Track>;

export interface PlayerActions {
  playTracks: (tracks: Track[], startIndex?: number, opts?: { shuffle?: boolean }) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  jumpTo: (index: number) => void;
  playNext: (tracks: Track[]) => void;
  addToQueue: (tracks: Track[]) => void;
  removeFromQueue: (index: number) => void;
  setShuffle: (on: boolean) => void;
  cycleRepeat: () => void;
}

export interface PlayerState extends PlayerActions {
  queue: Queue | null;
  current: Track | null;
  playing: boolean;
  buffering: boolean;
  error: string | null;
}

export interface Progress {
  time: number;
  duration: number;
}

const PlayerContext = createContext<PlayerState | null>(null);
/** Separate context so the 4×/second time updates only re-render progress bars. */
const ProgressContext = createContext<Progress>({ time: 0, duration: 0 });

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer outside PlayerProvider');
  return ctx;
}

export const useProgress = () => useContext(ProgressContext);

const STORAGE_KEY = 'musicapp.player.v1';

interface Saved {
  items: string[];
  original: string[];
  index: number;
  shuffle: boolean;
  repeat: Q.Repeat;
  time: number;
}

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function save(q: Queue | null, time: number) {
  try {
    if (!q) return localStorage.removeItem(STORAGE_KEY);
    const saved: Saved = {
      items: q.items.map((t) => t.id),
      original: q.original.map((t) => t.id),
      index: q.index,
      shuffle: q.shuffle,
      repeat: q.repeat,
      time,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Private mode or storage full: resuming is a nicety, not a requirement.
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { ready, byId } = useLibrary();
  const [audio] = useState(() => {
    const a = new Audio();
    a.preload = 'auto';
    return a;
  });

  const queueRef = useRef<Queue | null>(null);
  const loadedId = useRef<string | null>(null);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>({ time: 0, duration: 0 });

  /**
   * Every action touches the <audio> element synchronously, inside the tap handler.
   * iOS only allows play() during a user gesture, so we can't defer it to an effect.
   */
  const { actions, restore, autoNext } = useMemo(() => {
    const commit = (q: Queue | null) => {
      queueRef.current = q;
      setQueue(q);
    };

    const load = (q: Queue | null, autoplay: boolean, startAt = 0) => {
      const track = Q.current(q);
      if (!track) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        loadedId.current = null;
        return;
      }
      if (loadedId.current !== track.id) {
        loadedId.current = track.id;
        audio.src = streamUrl(track.id);
        if (startAt > 0) {
          audio.addEventListener('loadedmetadata', () => (audio.currentTime = startAt), { once: true });
        }
      } else {
        audio.currentTime = startAt;
      }
      setError(null);
      if (autoplay) {
        audio.play().catch((err: DOMException) => {
          if (err.name !== 'AbortError') setError(err.message);
        });
      }
    };

    const update = (fn: (q: Queue) => Queue) => {
      const q = queueRef.current;
      if (q) commit(fn(q));
    };

    const next = (auto: boolean) => {
      const q = queueRef.current;
      if (!q) return;
      const wasPlaying = auto || !audio.paused;
      const n = Q.advance(q, auto);
      if (!n) {
        audio.pause();
        return;
      }
      commit(n);
      load(n, wasPlaying);
    };

    const actions: PlayerActions = {
      playTracks(tracks, startIndex = 0, opts) {
        if (!tracks.length) return;
        const prev = queueRef.current;
        const q = Q.startQueue(tracks, startIndex, {
          shuffle: opts?.shuffle ?? prev?.shuffle ?? false,
          repeat: prev?.repeat ?? 'off',
        });
        commit(q);
        load(q, true);
      },
      toggle() {
        const q = queueRef.current;
        if (!q) return;
        if (!loadedId.current) load(q, true);
        else if (audio.paused) void audio.play().catch((err: Error) => setError(err.message));
        else audio.pause();
      },
      next: () => next(false),
      prev() {
        const q = queueRef.current;
        if (!q) return;
        if (audio.currentTime > 3 || (q.index === 0 && q.repeat !== 'all')) {
          audio.currentTime = 0;
          return;
        }
        const p = Q.retreat(q);
        commit(p);
        load(p, !audio.paused);
      },
      seek(seconds) {
        if (Number.isFinite(seconds)) audio.currentTime = Math.max(0, seconds);
      },
      jumpTo(index) {
        const q = queueRef.current;
        if (!q) return;
        const j = Q.jumpTo(q, index);
        commit(j);
        load(j, true);
      },
      playNext: (tracks) => (queueRef.current ? update((q) => Q.enqueue(q, tracks, 'next')) : undefined),
      addToQueue(tracks) {
        if (queueRef.current) update((q) => Q.enqueue(q, tracks, 'end'));
        else {
          const q = Q.startQueue(tracks, 0);
          commit(q);
          load(q, false);
        }
      },
      removeFromQueue: (index) => update((q) => Q.removeAt(q, index)),
      setShuffle: (on) => update((q) => Q.setShuffle(q, on)),
      cycleRepeat: () => update(Q.cycleRepeat),
    };

    return {
      actions,
      /** Restores the last session's queue without autoplaying. */
      restore(q: Queue, time: number) {
        commit(q);
        load(q, false, time);
      },
      autoNext: () => next(true),
    };
  }, [audio]);

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Audio element events → React state.
  useEffect(() => {
    let lastSave = 0;
    const onTime = () => {
      setProgress({ time: audio.currentTime, duration: Number.isFinite(audio.duration) ? audio.duration : 0 });
      const now = Date.now();
      if (now - lastSave > 5000) {
        lastSave = now;
        save(queueRef.current, audio.currentTime);
      }
      if ('mediaSession' in navigator && Number.isFinite(audio.duration) && audio.duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            position: Math.min(audio.currentTime, audio.duration),
            playbackRate: audio.playbackRate,
          });
        } catch {
          // Some browsers reject position updates mid-seek.
        }
      }
    };
    const handlers: Record<string, () => void> = {
      play: () => setPlaying(true),
      playing: () => (setPlaying(true), setBuffering(false)),
      pause: () => (setPlaying(false), save(queueRef.current, audio.currentTime)),
      waiting: () => setBuffering(true),
      canplay: () => setBuffering(false),
      timeupdate: onTime,
      durationchange: onTime,
      emptied: onTime,
      ended: autoNext,
      error: () => {
        setBuffering(false);
        setPlaying(false);
        if (audio.error) setError(`Can't play this track (${audio.error.message || `code ${audio.error.code}`})`);
      },
    };
    for (const [ev, fn] of Object.entries(handlers)) audio.addEventListener(ev, fn);
    return () => {
      for (const [ev, fn] of Object.entries(handlers)) audio.removeEventListener(ev, fn);
    };
  }, [audio, autoNext]);

  // Lock screen, Control Center, AirPods, car Bluetooth (AVRCP) and steering-wheel buttons.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // Unsupported action on this browser.
      }
    };
    set('play', () => actionsRef.current.toggle());
    set('pause', () => actionsRef.current.toggle());
    set('previoustrack', () => actionsRef.current.prev());
    set('nexttrack', () => actionsRef.current.next());
    set('seekto', (d) => d.seekTime !== undefined && actionsRef.current.seek(d.seekTime));
    // Deliberately no seekforward/seekbackward: on iOS those replace the
    // prev/next track buttons on the lock screen and in the car with ±10s skips.
  }, []);

  const current = Q.current(queue);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!current) {
      navigator.mediaSession.metadata = null;
      return;
    }
    const art = artUrl(current);
    const artwork = art ? [{ src: new URL(art, location.href).href, sizes: '512x512' }] : [];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: current.album,
      artwork,
    });
    document.title = `${current.title} · ${current.artist}`;
  }, [current]);

  useEffect(() => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }, [playing]);

  useEffect(() => {
    // Skip the initial null so we don't wipe the saved session before it's restored.
    if (queue) save(queue, audio.currentTime);
  }, [queue, audio]);

  // Restore last session's queue once the library has loaded.
  const restored = useRef(false);
  useEffect(() => {
    if (!ready || restored.current || byId.size === 0) return;
    restored.current = true;
    const saved = loadSaved();
    if (!saved || queueRef.current) return;
    const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((t): t is Track => !!t);
    const items = pick(saved.items);
    const playingId = saved.items[saved.index];
    const index = items.findIndex((t) => t.id === playingId);
    if (!items.length || index < 0) return;
    const q: Queue = { items, original: pick(saved.original), index, shuffle: saved.shuffle, repeat: saved.repeat };
    restore(q, saved.time);
  }, [ready, byId, restore]);

  const state = useMemo<PlayerState>(
    () => ({ ...actions, queue, current, playing, buffering, error }),
    [actions, queue, current, playing, buffering, error],
  );

  return (
    <PlayerContext.Provider value={state}>
      <ProgressContext.Provider value={progress}>{children}</ProgressContext.Provider>
    </PlayerContext.Provider>
  );
}
