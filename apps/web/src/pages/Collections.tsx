import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Artwork, Mosaic } from '../components/Artwork';
import { CollectionHeader, EmptyState } from '../components/Collection';
import { HeartFilledIcon, PencilIcon, TrashIcon } from '../components/icons';
import { TrackList } from '../components/TrackList';
import { useUi } from '../components/ui';
import type { Track } from '../lib/api';
import { albumPath, artistPath, useLibrary } from '../lib/library';
import { Shelf } from './Home';

export function AlbumPage() {
  const { key = '' } = useParams();
  const lib = useLibrary();
  const album = lib.albumsByKey.get(key);
  if (!album) return lib.ready ? <EmptyState title="Album not found" /> : null;
  return (
    <div className="page">
      <CollectionHeader
        art={<Artwork track={album.cover} />}
        kind="Album"
        title={album.name}
        subtitle={
          <>
            <Link to={artistPath(album.artist)}>{album.artist}</Link>
            {album.year ? ` · ${album.year}` : ''}
          </>
        }
        tracks={album.tracks}
      />
      <TrackList tracks={album.tracks} numbered />
    </div>
  );
}

export function ArtistPage() {
  const { name = '' } = useParams();
  const lib = useLibrary();
  const artist = lib.artistsByName.get(name);
  if (!artist) return lib.ready ? <EmptyState title="Artist not found" /> : null;
  return (
    <div className="page">
      <CollectionHeader art={<Artwork track={artist.cover} round />} kind="Artist" title={artist.name} tracks={artist.tracks} />
      {artist.albums.length > 0 && (
        <Shelf title="Albums">
          {artist.albums.map((a) => (
            <Link key={a.key} to={albumPath(a.cover)} className="card">
              <Artwork track={a.cover} />
              <span className="card__title">{a.name}</span>
              <span className="card__sub">{a.year ?? 'Album'}</span>
            </Link>
          ))}
        </Shelf>
      )}
      <h2 className="shelf__title">Songs</h2>
      <TrackList tracks={artist.tracks} showAlbum />
    </div>
  );
}

export function PlaylistPage() {
  const { id = '' } = useParams();
  const lib = useLibrary();
  const ui = useUi();
  const navigate = useNavigate();
  const playlist = lib.playlists.find((p) => p.id === id);
  const tracks = useMemo(
    () => (playlist?.trackIds ?? []).map((tid) => lib.byId.get(tid)).filter((t): t is Track => !!t),
    [playlist, lib.byId],
  );
  if (!playlist) return lib.ready ? <EmptyState title="Playlist not found" /> : null;

  const rename = async () => {
    const name = prompt('Rename playlist', playlist.name)?.trim();
    if (name && name !== playlist.name) await lib.renamePlaylist(id, name).catch((e: Error) => ui.toast(e.message));
  };
  const remove = async () => {
    if (!confirm(`Delete “${playlist.name}”? Songs stay in your library.`)) return;
    await lib.deletePlaylist(id).catch((e: Error) => ui.toast(e.message));
    navigate('/library', { replace: true });
  };

  return (
    <div className="page">
      <CollectionHeader
        art={<Mosaic tracks={tracks} />}
        kind="Playlist"
        title={playlist.name}
        tracks={tracks}
        actions={
          <>
            <button className="icon-btn icon-btn--lg" aria-label="Rename playlist" onClick={rename}>
              <PencilIcon />
            </button>
            <button className="icon-btn icon-btn--lg" aria-label="Delete playlist" onClick={remove}>
              <TrashIcon />
            </button>
          </>
        }
      />
      {tracks.length ? (
        // The playlist-aware rows keep each entry's index so a duplicate can be removed on its own.
        <TrackList tracks={tracks} playlistId={playlist.id} showAlbum />
      ) : (
        <p className="muted center">Add songs with the ••• menu on any track.</p>
      )}
    </div>
  );
}

export function LikedPage() {
  const lib = useLibrary();
  return (
    <div className="page">
      <CollectionHeader
        art={
          <div className="liked-art">
            <HeartFilledIcon />
          </div>
        }
        kind="Playlist"
        title="Liked Songs"
        tracks={lib.liked}
      />
      {lib.liked.length ? (
        <TrackList tracks={lib.liked} showAlbum />
      ) : (
        <p className="muted center">Songs you like will appear here. Tap ♡ on any track.</p>
      )}
    </div>
  );
}
