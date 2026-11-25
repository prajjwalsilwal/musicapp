import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Artwork, Mosaic } from '../components/Artwork';
import { CloseIcon, HeartFilledIcon, HeartIcon, LibraryIcon } from '../components/icons';
import { SeekBar, Transport } from '../components/PlayerControls';
import { useLibrary } from '../lib/library';
import { usePlayer } from '../player/PlayerProvider';
import { hue } from '../lib/format';

/**
 * Glanceable, big-target layout for use while driving (phone in a mount).
 * Landscape: art left, controls right.
 */
export function CarMode() {
  const p = usePlayer();
  const lib = useLibrary();
  const navigate = useNavigate();
  const [picker, setPicker] = useState(false);
  const t = p.current;

  // Keep the screen on while in car mode, where supported.
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    const acquire = () => navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {});
    void acquire();
    const onVisible = () => document.visibilityState === 'visible' && acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, []);

  const collections = [
    { id: 'liked', name: 'Liked Songs', tracks: lib.liked },
    ...lib.playlists.map((pl) => ({
      id: pl.id,
      name: pl.name,
      tracks: pl.trackIds.map((id) => lib.byId.get(id)).filter((x) => !!x),
    })),
    { id: 'all', name: 'All music', tracks: lib.tracks },
  ];

  return (
    <div className="car" style={{ '--np-hue': hue(t?.album ?? '') } as React.CSSProperties}>
      <div className="car__top">
        <button className="car__icon" aria-label="Exit car mode" onClick={() => navigate('/')}>
          <CloseIcon />
        </button>
        <Clock />
        <span className="car__icon car__icon--spacer" aria-hidden="true" />
      </div>

      {picker ? (
        <div className="car__picker">
          {collections.map((c) => (
            <button
              key={c.id}
              className="car__tile"
              disabled={!c.tracks.length}
              onClick={() => {
                p.playTracks(c.tracks, 0, { shuffle: c.id === 'all' });
                setPicker(false);
              }}
            >
              <Mosaic tracks={c.tracks} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="car__main">
          <div className="car__art">
            <Artwork track={t} />
          </div>
          <div className="car__controls">
            <div className="car__titles">
              <h1>{t?.title ?? 'Nothing playing'}</h1>
              <p>{t ? `${t.artist} — ${t.album}` : 'Pick a playlist to start'}</p>
            </div>
            <SeekBar />
            <Transport size="xl" />
            <div className="car__row">
              <button className="car__wide" onClick={() => setPicker(true)}>
                <LibraryIcon /> Playlists
              </button>
              {t && (
                <button
                  className={`car__wide ${lib.isLiked(t.id) ? 'is-on' : ''}`}
                  onClick={() => lib.toggleLike(t.id).catch(() => {})}
                >
                  {lib.isLiked(t.id) ? <HeartFilledIcon /> : <HeartIcon />} {lib.isLiked(t.id) ? 'Liked' : 'Like'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {picker && (
        <button className="car__wide car__back" onClick={() => setPicker(false)}>
          Back to now playing
        </button>
      )}
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="car__clock">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>;
}
