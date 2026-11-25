import type { Track } from '../lib/api';
import { formatTime } from '../lib/format';
import { useLibrary } from '../lib/library';
import { usePlayer } from '../player/PlayerProvider';
import { Artwork } from './Artwork';
import { HeartFilledIcon, HeartIcon, MoreIcon } from './icons';
import { useUi, type TrackContext } from './ui';

interface Props {
  tracks: Track[];
  /** Show track numbers instead of cover art (album pages). */
  numbered?: boolean;
  playlistId?: string;
  showAlbum?: boolean;
}

export function TrackList({ tracks, numbered, playlistId, showAlbum }: Props) {
  const player = usePlayer();
  return (
    <ol className="track-list">
      {tracks.map((t, i) => (
        <TrackRow
          key={`${t.id}-${i}`}
          track={t}
          number={numbered ? (t.trackNo ?? i + 1) : undefined}
          active={player.current?.id === t.id}
          playing={player.playing}
          onPlay={() => player.playTracks(tracks, i)}
          ctx={playlistId ? { playlistId, index: i } : {}}
          showAlbum={showAlbum}
        />
      ))}
    </ol>
  );
}

interface RowProps {
  track: Track;
  number?: number;
  active: boolean;
  playing: boolean;
  onPlay: () => void;
  ctx: TrackContext;
  showAlbum?: boolean;
}

function TrackRow({ track, number, active, playing, onPlay, ctx, showAlbum }: RowProps) {
  const { isLiked, toggleLike } = useLibrary();
  const ui = useUi();
  const liked = isLiked(track.id);
  return (
    <li className={`track-row ${active ? 'is-active' : ''}`}>
      <button className="track-row__main" onClick={onPlay}>
        {number !== undefined ? (
          <span className="track-row__num">{active && playing ? <Bars /> : number}</span>
        ) : (
          <Artwork track={track} size={44} />
        )}
        <span className="track-row__text">
          <span className="track-row__title">{track.title}</span>
          <span className="track-row__sub">
            {track.artist}
            {showAlbum && track.album ? ` · ${track.album}` : ''}
          </span>
        </span>
      </button>
      <span className="track-row__dur">{formatTime(track.duration)}</span>
      <button
        className={`icon-btn ${liked ? 'is-on' : ''}`}
        aria-label={liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
        onClick={() => toggleLike(track.id).catch((e: Error) => ui.toast(e.message))}
      >
        {liked ? <HeartFilledIcon /> : <HeartIcon />}
      </button>
      <button className="icon-btn" aria-label="More options" onClick={() => ui.showTrackActions(track, ctx)}>
        <MoreIcon />
      </button>
    </li>
  );
}

export function Bars() {
  return (
    <span className="eq" aria-label="Playing">
      <i />
      <i />
      <i />
    </span>
  );
}
