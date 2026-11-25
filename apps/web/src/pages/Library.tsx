import { Link, useSearchParams } from 'react-router-dom';
import { Artwork, Mosaic } from '../components/Artwork';
import { HeartFilledIcon, PlusIcon } from '../components/icons';
import { TrackList } from '../components/TrackList';
import { useUi } from '../components/ui';
import { UploadButton } from '../components/UploadButton';
import { plural } from '../lib/format';
import { albumPath, artistPath, useLibrary } from '../lib/library';
import { api } from '../lib/api';

const TABS = ['playlists', 'albums', 'artists', 'songs'] as const;
type Tab = (typeof TABS)[number];

export function Library() {
  const lib = useLibrary();
  const ui = useUi();
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'playlists';

  async function newPlaylist() {
    const name = prompt('Playlist name', 'New playlist')?.trim();
    if (!name) return;
    try {
      await lib.createPlaylist(name);
    } catch (e) {
      ui.toast((e as Error).message);
    }
  }

  async function rescan() {
    try {
      const r = await api.rescan();
      await lib.refresh();
      ui.toast(`Rescanned: ${r.added} new, ${r.removed} removed, ${r.total} total`);
    } catch (e) {
      ui.toast((e as Error).message);
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">Your Library</h1>
        <div className="row gap">
          <button className="icon-btn icon-btn--lg" aria-label="New playlist" onClick={newPlaylist}>
            <PlusIcon />
          </button>
        </div>
      </div>

      <div className="chips" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`chip ${tab === t ? 'is-on' : ''}`}
            onClick={() => setParams({ tab: t }, { replace: true })}
          >
            {t[0]!.toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'playlists' && (
        <ul className="rows">
          <li>
            <Link to="/liked" className="row-link">
              <div className="liked-art row-link__art">
                <HeartFilledIcon />
              </div>
              <span>
                <span className="row-link__title">Liked Songs</span>
                <span className="row-link__sub">Playlist · {plural(lib.liked.length, 'song')}</span>
              </span>
            </Link>
          </li>
          {lib.playlists.map((p) => (
            <li key={p.id}>
              <Link to={`/playlist/${p.id}`} className="row-link">
                <span className="row-link__art">
                  <Mosaic tracks={p.trackIds.map((id) => lib.byId.get(id)).filter((t) => !!t)} />
                </span>
                <span>
                  <span className="row-link__title">{p.name}</span>
                  <span className="row-link__sub">Playlist · {plural(p.trackIds.length, 'song')}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {tab === 'albums' && (
        <div className="grid">
          {lib.albums.map((a) => (
            <Link key={a.key} to={albumPath(a.cover)} className="card">
              <Artwork track={a.cover} />
              <span className="card__title">{a.name}</span>
              <span className="card__sub">{a.artist}</span>
            </Link>
          ))}
        </div>
      )}

      {tab === 'artists' && (
        <ul className="rows">
          {lib.artists.map((a) => (
            <li key={a.name}>
              <Link to={artistPath(a.name)} className="row-link">
                <Artwork track={a.cover} round className="row-link__art" />
                <span>
                  <span className="row-link__title">{a.name}</span>
                  <span className="row-link__sub">{plural(a.tracks.length, 'song')}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {tab === 'songs' && <TrackList tracks={lib.tracks} showAlbum />}

      <div className="library-tools">
        <UploadButton />
        <button className="pill-btn" onClick={rescan}>
          Rescan music folder
        </button>
      </div>
    </div>
  );
}
