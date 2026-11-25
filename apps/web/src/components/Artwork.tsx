import { useState } from 'react';
import { artUrl, type Track } from '../lib/api';
import { hue } from '../lib/format';
import { MusicIcon } from './icons';

interface Props {
  track: Pick<Track, 'id' | 'hasArt' | 'album' | 'title'> | null | undefined;
  size?: number | string;
  round?: boolean;
  className?: string;
}

/** Cover art, or a colour placeholder derived from the album name. */
export function Artwork({ track, size, round, className = '' }: Props) {
  const [failed, setFailed] = useState(false);
  const src = track && !failed ? artUrl(track) : null;
  const style = size !== undefined ? { width: size, height: size } : undefined;
  const cls = `artwork ${round ? 'artwork--round' : ''} ${className}`;

  if (src) {
    return <img className={cls} style={style} src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />;
  }
  const h = hue(track?.album || track?.title || '');
  return (
    <div
      className={`${cls} artwork--placeholder`}
      style={{ ...style, background: `linear-gradient(135deg, hsl(${h} 55% 38%), hsl(${(h + 40) % 360} 60% 22%))` }}
      aria-hidden="true"
    >
      <MusicIcon size="38%" />
    </div>
  );
}

/** 2×2 mosaic of the first four distinct covers, like a playlist thumbnail. */
export function Mosaic({ tracks, size }: { tracks: Track[]; size?: number | string }) {
  const covers: Track[] = [];
  const seen = new Set<string>();
  for (const t of tracks) {
    const key = t.hasArt ? `${t.albumArtist}/${t.album}` : t.id;
    if (seen.has(key)) continue;
    seen.add(key);
    covers.push(t);
    if (covers.length === 4) break;
  }
  if (covers.length < 4) return <Artwork track={covers[0]} size={size} />;
  return (
    <div className="artwork mosaic" style={size !== undefined ? { width: size, height: size } : undefined}>
      {covers.map((t) => (
        <Artwork key={t.id} track={t} />
      ))}
    </div>
  );
}
