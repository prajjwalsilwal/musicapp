import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Track } from '../lib/api';
import { formatTotal, plural } from '../lib/format';
import { usePlayer } from '../player/PlayerProvider';
import { ChevronLeftIcon, PauseIcon, PlayIcon, ShuffleIcon } from './icons';

interface Props {
  art: ReactNode;
  kind: string;
  title: string;
  subtitle?: ReactNode;
  tracks: Track[];
  actions?: ReactNode;
}

/** Header shared by album, artist, playlist and Liked Songs pages. */
export function CollectionHeader({ art, kind, title, subtitle, tracks, actions }: Props) {
  const p = usePlayer();
  const navigate = useNavigate();
  const total = tracks.reduce((s, t) => s + t.duration, 0);
  // "This collection is what's playing" — compare by membership of the current track and same length.
  const isThis = !!p.current && p.queue?.original.length === tracks.length && tracks.some((t) => t.id === p.current!.id);

  return (
    <header className="collection">
      <button className="icon-btn back-btn" aria-label="Back" onClick={() => navigate(-1)}>
        <ChevronLeftIcon />
      </button>
      <div className="collection__art">{art}</div>
      <div className="collection__info">
        <span className="eyebrow">{kind}</span>
        <h1 className="collection__title">{title}</h1>
        {subtitle && <div className="collection__sub">{subtitle}</div>}
        <div className="muted small">
          {plural(tracks.length, 'song')}
          {total > 0 && ` · ${formatTotal(total)}`}
        </div>
      </div>
      <div className="collection__actions">
        {actions}
        <button
          className="icon-btn icon-btn--lg"
          aria-label="Shuffle play"
          disabled={!tracks.length}
          onClick={() => p.playTracks(tracks, Math.floor(Math.random() * tracks.length), { shuffle: true })}
        >
          <ShuffleIcon />
        </button>
        <button
          className="play-btn play-btn--lg"
          aria-label={isThis && p.playing ? 'Pause' : 'Play'}
          disabled={!tracks.length}
          onClick={() => (isThis ? p.toggle() : p.playTracks(tracks, 0, { shuffle: false }))}
        >
          {isThis && p.playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>
    </header>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
