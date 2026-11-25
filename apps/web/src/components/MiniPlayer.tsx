import { usePlayer, useProgress } from '../player/PlayerProvider';
import { Artwork } from './Artwork';
import { NextIcon, PauseIcon, PlayIcon } from './icons';
import { useUi } from './ui';

export function MiniPlayer() {
  const p = usePlayer();
  const ui = useUi();
  if (!p.current) return null;
  return (
    <div className="mini">
      <button className="mini__main" onClick={() => ui.setNowPlayingOpen(true)} aria-label="Open now playing">
        <Artwork track={p.current} size={42} />
        <span className="mini__text">
          <span className="mini__title">{p.current.title}</span>
          <span className="mini__sub">{p.error ?? p.current.artist}</span>
        </span>
      </button>
      <button className="icon-btn mini__btn" aria-label={p.playing ? 'Pause' : 'Play'} onClick={p.toggle}>
        {p.playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button className="icon-btn mini__btn" aria-label="Next" onClick={p.next}>
        <NextIcon />
      </button>
      <MiniProgress />
    </div>
  );
}

function MiniProgress() {
  const { time, duration } = useProgress();
  return (
    <div className="mini__progress">
      <div style={{ width: `${duration ? (time / duration) * 100 : 0}%` }} />
    </div>
  );
}
