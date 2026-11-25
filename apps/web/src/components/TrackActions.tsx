import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { albumPath, artistPath, useLibrary } from '../lib/library';
import { usePlayer } from '../player/PlayerProvider';
import { Artwork } from './Artwork';
import { AlbumIcon, ChevronLeftIcon, HeartFilledIcon, HeartIcon, PlusIcon, QueueIcon, TrashIcon, UserIcon } from './icons';
import { useUi } from './ui';

/** Bottom sheet with everything you can do to one track. */
export function TrackActions() {
  const ui = useUi();
  const lib = useLibrary();
  const player = usePlayer();
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!ui.sheet) return null;
  const { track, ctx } = ui.sheet;
  const liked = lib.isLiked(track.id);

  const close = () => {
    setPicking(false);
    setConfirmDelete(false);
    ui.closeSheet();
  };
  const run = (fn: () => unknown, message?: string) => async () => {
    try {
      await fn();
      if (message) ui.toast(message);
    } catch (e) {
      ui.toast((e as Error).message);
    }
    close();
  };
  const go = (path: string) => () => {
    close();
    ui.setNowPlayingOpen(false);
    navigate(path);
  };

  return (
    <div className="sheet-backdrop" onClick={close}>
      <div className="sheet" role="dialog" aria-label={`Options for ${track.title}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <Artwork track={track} size={48} />
          <div>
            <div className="sheet__title">{track.title}</div>
            <div className="muted">{track.artist}</div>
          </div>
        </div>

        {picking ? (
          <>
            <button className="sheet__item" onClick={() => setPicking(false)}>
              <ChevronLeftIcon /> Back
            </button>
            <button
              className="sheet__item"
              onClick={run(async () => {
                const name = prompt('Playlist name', 'New playlist')?.trim();
                if (name) await lib.createPlaylist(name, [track.id]);
              })}
            >
              <PlusIcon /> New playlist
            </button>
            {lib.playlists.map((p) => (
              <button key={p.id} className="sheet__item" onClick={run(() => lib.addToPlaylist(p.id, [track.id]), `Added to ${p.name}`)}>
                <span className="sheet__dot" /> {p.name}
              </button>
            ))}
          </>
        ) : (
          <>
            <button className="sheet__item" onClick={run(() => lib.toggleLike(track.id))}>
              {liked ? <HeartFilledIcon className="accent" /> : <HeartIcon />}
              {liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
            </button>
            {player.queue && (
              <button className="sheet__item" onClick={run(() => player.playNext([track]), 'Playing next')}>
                <QueueIcon /> Play next
              </button>
            )}
            <button className="sheet__item" onClick={run(() => player.addToQueue([track]), 'Added to queue')}>
              <QueueIcon /> Add to queue
            </button>
            <button className="sheet__item" onClick={() => setPicking(true)}>
              <PlusIcon /> Add to playlist
            </button>
            {ctx.playlistId !== undefined && ctx.index !== undefined && (
              <button
                className="sheet__item"
                onClick={run(() => lib.removeFromPlaylist(ctx.playlistId!, ctx.index!), 'Removed from playlist')}
              >
                <TrashIcon /> Remove from this playlist
              </button>
            )}
            <button className="sheet__item" onClick={go(albumPath(track))}>
              <AlbumIcon /> Go to album
            </button>
            <button className="sheet__item" onClick={go(artistPath(track.albumArtist))}>
              <UserIcon /> Go to artist
            </button>
            {confirmDelete ? (
              <button className="sheet__item danger" onClick={run(() => lib.deleteTrack(track.id), 'Deleted')}>
                <TrashIcon /> Tap again to delete the file for good
              </button>
            ) : (
              <button className="sheet__item" onClick={() => setConfirmDelete(true)}>
                <TrashIcon /> Delete from library
              </button>
            )}
          </>
        )}
        <button className="sheet__cancel" onClick={close}>
          Close
        </button>
      </div>
    </div>
  );
}
