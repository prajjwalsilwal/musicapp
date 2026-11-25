import { useState } from 'react';
import { formatTime } from '../lib/format';
import { usePlayer, useProgress } from '../player/PlayerProvider';
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, RepeatIcon, RepeatOneIcon, ShuffleIcon } from './icons';

/** Draggable seek bar. While dragging, shows the drag position instead of the live one. */
export function SeekBar({ showTimes = true }: { showTimes?: boolean }) {
  const { seek } = usePlayer();
  const { time, duration } = useProgress();
  const [drag, setDrag] = useState<number | null>(null);
  const value = drag ?? time;
  const pct = duration ? (value / duration) * 100 : 0;
  return (
    <div className="seek">
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={value}
        aria-label="Seek"
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerUp={() => drag !== null && (seek(drag), setDrag(null))}
        onKeyUp={() => drag !== null && (seek(drag), setDrag(null))}
        onTouchEnd={() => drag !== null && (seek(drag), setDrag(null))}
      />
      {showTimes && (
        <div className="seek__times">
          <span>{formatTime(value)}</span>
          <span>-{formatTime(Math.max(duration - value, 0))}</span>
        </div>
      )}
    </div>
  );
}

export function Transport({ size = 'md' }: { size?: 'md' | 'xl' }) {
  const p = usePlayer();
  const RepeatGlyph = p.queue?.repeat === 'one' ? RepeatOneIcon : RepeatIcon;
  return (
    <div className={`transport transport--${size}`}>
      <button
        className={`icon-btn ${p.queue?.shuffle ? 'is-on' : ''}`}
        aria-label="Shuffle"
        aria-pressed={!!p.queue?.shuffle}
        onClick={() => p.setShuffle(!p.queue?.shuffle)}
      >
        <ShuffleIcon />
      </button>
      <button className="icon-btn transport__skip" aria-label="Previous" onClick={p.prev}>
        <PrevIcon />
      </button>
      <button className="play-btn" aria-label={p.playing ? 'Pause' : 'Play'} onClick={p.toggle}>
        {p.playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button className="icon-btn transport__skip" aria-label="Next" onClick={p.next}>
        <NextIcon />
      </button>
      <button
        className={`icon-btn ${p.queue?.repeat !== 'off' && p.queue ? 'is-on' : ''}`}
        aria-label={`Repeat: ${p.queue?.repeat ?? 'off'}`}
        onClick={p.cycleRepeat}
      >
        <RepeatGlyph />
      </button>
    </div>
  );
}
