import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Track } from '../lib/api';

export interface TrackContext {
  /** Set when the track is shown inside a playlist, so "Remove from playlist" can be offered. */
  playlistId?: string;
  index?: number;
}

interface UiApi {
  nowPlayingOpen: boolean;
  setNowPlayingOpen: (open: boolean) => void;
  sheet: { track: Track; ctx: TrackContext } | null;
  showTrackActions: (track: Track, ctx?: TrackContext) => void;
  closeSheet: () => void;
  toast: (message: string) => void;
  toastMessage: string | null;
}

const UiContext = createContext<UiApi | null>(null);

export function useUi(): UiApi {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi outside UiProvider');
  return ctx;
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [sheet, setSheet] = useState<UiApi['sheet']>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToastMessage(null), 2600);
  }, []);

  const value = useMemo<UiApi>(
    () => ({
      nowPlayingOpen,
      setNowPlayingOpen,
      sheet,
      showTrackActions: (track, ctx = {}) => setSheet({ track, ctx }),
      closeSheet: () => setSheet(null),
      toast,
      toastMessage,
    }),
    [nowPlayingOpen, sheet, toast, toastMessage],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}
