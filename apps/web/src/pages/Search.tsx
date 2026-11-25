import { useDeferredValue, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Artwork } from '../components/Artwork';
import { SearchIcon } from '../components/icons';
import { TrackList } from '../components/TrackList';
import { hue } from '../lib/format';
import { albumPath, artistPath, useLibrary } from '../lib/library';
import { Shelf } from './Home';

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function Search() {
  const lib = useLibrary();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const deferred = useDeferredValue(q);

  const results = useMemo(() => {
    const terms = norm(deferred).split(/\s+/).filter(Boolean);
    if (!terms.length) return null;
    const match = (text: string) => {
      const n = norm(text);
      return terms.every((t) => n.includes(t));
    };
    return {
      tracks: lib.tracks.filter((t) => match(`${t.title} ${t.artist} ${t.album}`)).slice(0, 50),
      albums: lib.albums.filter((a) => match(`${a.name} ${a.artist}`)).slice(0, 20),
      artists: lib.artists.filter((a) => match(a.name)).slice(0, 20),
    };
  }, [deferred, lib.tracks, lib.albums, lib.artists]);

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of lib.tracks) if (t.genre) counts.set(t.genre, (counts.get(t.genre) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16).map(([g]) => g);
  }, [lib.tracks]);

  return (
    <div className="page">
      <h1 className="page__title">Search</h1>
      <label className="search-box">
        <SearchIcon />
        <input
          type="search"
          placeholder="Songs, albums, artists"
          value={q}
          autoFocus
          enterKeyHint="search"
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
        />
      </label>

      {!results ? (
        genres.length > 0 && (
          <>
            <h2 className="shelf__title">Browse by genre</h2>
            <div className="genres">
              {genres.map((g) => (
                <button
                  key={g}
                  className="genre"
                  style={{ background: `hsl(${hue(g)} 50% 32%)` }}
                  onClick={() => setParams({ q: g })}
                >
                  {g}
                </button>
              ))}
            </div>
          </>
        )
      ) : results.tracks.length + results.albums.length + results.artists.length === 0 ? (
        <p className="muted center">No results for “{q}”</p>
      ) : (
        <>
          {results.artists.length > 0 && (
            <Shelf title="Artists">
              {results.artists.map((a) => (
                <Link key={a.name} to={artistPath(a.name)} className="card card--round">
                  <Artwork track={a.cover} round />
                  <span className="card__title">{a.name}</span>
                </Link>
              ))}
            </Shelf>
          )}
          {results.albums.length > 0 && (
            <Shelf title="Albums">
              {results.albums.map((a) => (
                <Link key={a.key} to={albumPath(a.cover)} className="card">
                  <Artwork track={a.cover} />
                  <span className="card__title">{a.name}</span>
                  <span className="card__sub">{a.artist}</span>
                </Link>
              ))}
            </Shelf>
          )}
          {results.tracks.length > 0 && (
            <section>
              <h2 className="shelf__title">Songs</h2>
              <TrackList tracks={results.tracks} showAlbum />
            </section>
          )}
        </>
      )}
    </div>
  );
}
