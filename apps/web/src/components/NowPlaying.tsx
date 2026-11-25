import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { albumPath, artistPath, useLibrary } from '../lib/library';
import { usePlayer } from '../player/PlayerProvider';
import { Artwork } from './Artwork';
import { ChevronDownIcon, CloseIcon, HeartFilledIcon, HeartIcon, MoreIcon, QueueIcon } from './icons';
import { SeekBar, Transport } from './PlayerControls';
import { useUi } from './ui';
import { Bars } from './TrackList';
import { hue } from '../lib/format';

export function NowPlaying() {
  const ui = useUi();
  const p = usePlayer();
  const lib = useLibrary();
  const [showQueue, setShowQueue] = useState(false);
  const open = ui.nowPlayingOpen && !!p.current;

  useEffect(() => {
    if (!open) setShowQueue(false);
  }, [open]);

  if (!open || !p.current || !p.queue) return null;
  const t = p.current;
  const liked = lib.isLiked(t.id);
  const close = () => ui.setNowPlayingOpen(false);
  const h = hue(t.album);

  return (
    <div className="np" style={{ '--np-hue': h } as React.CSSProperties} role="dialog" aria-label="Now playing">
      <header className="np__bar">
        <button className="icon-btn" aria-label="Close" onClick={close}>
          <ChevronDownIcon />
        </button>
        <div className="np__context">
          <span className="muted small">Playing from</span>
          <Link to={albumPath(t)} onClick={close}>
            {t.album}
          </Link>
        </div>
        <button className="icon-btn" aria-label="More options" onClick={() => ui.showTrackActions(t)}>
          <MoreIcon />
        </button>
      </header>

      {showQueue ? (
        <QueuePanel onClose={() => setShowQueue(false)} />
      ) : (
        <div className="np__art">
          <Artwork track={t} />
        </div>
      )}

      <div className="np__meta">
        <div className="np__titles">
          <h2 className="np__title">{t.title}</h2>
          <Link className="np__artist" to={artistPath(t.albumArtist)} onClick={close}>
            {t.artist}
          </Link>
        </div>
        <button
          className={`icon-btn icon-btn--lg ${liked ? 'is-on' : ''}`}
          aria-label={liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
          onClick={() => lib.toggleLike(t.id).catch((e: Error) => ui.toast(e.message))}
        >
          {liked ? <HeartFilledIcon /> : <HeartIcon />}
        </button>
      </div>

      {p.error && <p className="np__error">{p.error}</p>}
      <SeekBar />
      <Transport size="xl" />

      <footer className="np__footer">
        <button className={`icon-btn ${showQueue ? 'is-on' : ''}`} aria-label="Queue" onClick={() => setShowQueue((s) => !s)}>
          <QueueIcon />
        </button>
      </footer>
    </div>
  );
}

function QueuePanel({ onClose }: { onClose: () => void }) {
  const p = usePlayer();
  if (!p.queue) return null;
  const { items, index } = p.queue;
  const upNext = items.slice(index + 1);
  return (
    <div className="queue">
      <div className="queue__head">
        <h3>Queue</h3>
        <button className="icon-btn" aria-label="Close queue" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <p className="muted small">Now playing</p>
      <QueueRow trackIndex={index} />
      <p className="muted small">{upNext.length ? `Next up · ${upNext.length}` : 'Nothing queued after this'}</p>
      <ol className="queue__list">
        {upNext.map((_, i) => (
          <QueueRow key={`${items[index + 1 + i]!.id}-${index + 1 + i}`} trackIndex={index + 1 + i} removable />
        ))}
      </ol>
    </div>
  );
}

function QueueRow({ trackIndex, removable }: { trackIndex: number; removable?: boolean }) {
  const p = usePlayer();
  const t = p.queue?.items[trackIndex];
  if (!t) return null;
  const isCurrent = trackIndex === p.queue?.index;
  return (
    <li className={`queue__row ${isCurrent ? 'is-active' : ''}`}>
      <button className="queue__main" onClick={() => p.jumpTo(trackIndex)}>
        <Artwork track={t} size={40} />
        <span className="track-row__text">
          <span className="track-row__title">{t.title}</span>
          <span className="track-row__sub">{t.artist}</span>
        </span>
        {isCurrent && p.playing && <Bars />}
      </button>
      {removable && (
        <button className="icon-btn" aria-label={`Remove ${t.title} from queue`} onClick={() => p.removeFromQueue(trackIndex)}>
          <CloseIcon />
        </button>
      )}
    </li>
  );
}
