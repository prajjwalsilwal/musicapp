import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Artwork, Mosaic } from '../components/Artwork';
import { EmptyState } from '../components/Collection';
import { HeartFilledIcon, ShuffleIcon } from '../components/icons';
import { UploadButton } from '../components/UploadButton';
import { greeting, shuffled } from '../lib/format';
import { albumPath, artistPath, useLibrary } from '../lib/library';
import { usePlayer } from '../player/PlayerProvider';

export function Home() {
  const lib = useLibrary();
  const player = usePlayer();

  const recentAlbums = useMemo(() => [...lib.albums].sort((a, b) => b.addedAt - a.addedAt).slice(0, 12), [lib.albums]);
  const artists = useMemo(() => shuffled(lib.artists).slice(0, 12), [lib.artists]);

  if (lib.ready && lib.error) {
    return (
      <EmptyState title="Can't reach the music server">
        <p className="muted">{lib.error}</p>
        <p className="muted">Start it with <code>pnpm dev</code> and make sure this device can reach it.</p>
        <button className="pill-btn" onClick={() => lib.refresh()}>
          Try again
        </button>
      </EmptyState>
    );
  }

  if (lib.ready && lib.tracks.length === 0) {
    return (
      <EmptyState title="Your library is empty">
        <p className="muted">
          Upload songs from your phone's Files app, or copy them into the server's music folder and rescan.
        </p>
        <UploadButton />
      </EmptyState>
    );
  }

  const shortcuts = [
    { to: '/liked', name: 'Liked Songs', art: <div className="liked-art"><HeartFilledIcon /></div> },
    ...lib.playlists.slice(0, 5).map((p) => ({
      to: `/playlist/${p.id}`,
      name: p.name,
      art: <Mosaic tracks={p.trackIds.map((id) => lib.byId.get(id)).filter((t) => !!t)} />,
    })),
  ];

  return (
    <div className="page">
      <h1 className="page__title">{greeting()}</h1>

      <div className="shortcuts">
        {shortcuts.map((s) => (
          <Link key={s.to} to={s.to} className="shortcut">
            <span className="shortcut__art">{s.art}</span>
            <span className="shortcut__name">{s.name}</span>
          </Link>
        ))}
      </div>

      <button
        className="pill-btn pill-btn--accent"
        disabled={!lib.tracks.length}
        onClick={() => player.playTracks(lib.tracks, Math.floor(Math.random() * lib.tracks.length), { shuffle: true })}
      >
        <ShuffleIcon /> Shuffle all music
      </button>

      <Shelf title="Recently added">
        {recentAlbums.map((a) => (
          <Link key={a.key} to={albumPath(a.cover)} className="card">
            <Artwork track={a.cover} />
            <span className="card__title">{a.name}</span>
            <span className="card__sub">{a.artist}</span>
          </Link>
        ))}
      </Shelf>

      <Shelf title="Your artists">
        {artists.map((a) => (
          <Link key={a.name} to={artistPath(a.name)} className="card card--round">
            <Artwork track={a.cover} round />
            <span className="card__title">{a.name}</span>
            <span className="card__sub">Artist</span>
          </Link>
        ))}
      </Shelf>
    </div>
  );
}

export function Shelf({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="shelf">
      <h2 className="shelf__title">{title}</h2>
      <div className="shelf__row">{children}</div>
    </section>
  );
}
