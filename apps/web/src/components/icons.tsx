import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

const filled = (children: ReactNode) =>
  function Icon({ size = '1em', ...props }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...props}>
        {children}
      </svg>
    );
  };

const stroked = (children: ReactNode) =>
  function Icon({ size = '1em', ...props }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {children}
      </svg>
    );
  };

const heartPath = 'M12 20.5 4.6 13.3A5 5 0 0 1 12 6.6a5 5 0 0 1 7.4 6.7Z';

export const PlayIcon = filled(<path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8Z" />);
export const PauseIcon = filled(
  <>
    <rect x="5.5" y="4" width="4.5" height="16" rx="1.2" />
    <rect x="14" y="4" width="4.5" height="16" rx="1.2" />
  </>,
);
export const NextIcon = filled(
  <>
    <path d="M4.5 5.6v12.8a.8.8 0 0 0 1.2.7L15.6 12.7a.8.8 0 0 0 0-1.4L5.7 4.9a.8.8 0 0 0-1.2.7Z" />
    <rect x="17" y="5" width="2.6" height="14" rx="1" />
  </>,
);
export const PrevIcon = filled(
  <>
    <path d="M19.5 5.6v12.8a.8.8 0 0 1-1.2.7L8.4 12.7a.8.8 0 0 1 0-1.4l9.9-6.4a.8.8 0 0 1 1.2.7Z" />
    <rect x="4.4" y="5" width="2.6" height="14" rx="1" />
  </>,
);
export const MoreIcon = filled(
  <>
    <circle cx="5" cy="12" r="1.9" />
    <circle cx="12" cy="12" r="1.9" />
    <circle cx="19" cy="12" r="1.9" />
  </>,
);
export const HeartFilledIcon = filled(<path d={heartPath} />);
export const HeartIcon = stroked(<path d={heartPath} />);
export const ShuffleIcon = stroked(<path d="M16 4h4v4M4 19 20 4M20 16v4h-4M14.5 14.5 20 20M4 5l5 5" />);
export const RepeatIcon = stroked(
  <path d="M17 2.5 20.5 6 17 9.5M3.5 11V10a4 4 0 0 1 4-4h13M7 21.5 3.5 18 7 14.5M20.5 13v1a4 4 0 0 1-4 4h-13" />,
);
export const RepeatOneIcon = stroked(
  <>
    <path d="M17 2.5 20.5 6 17 9.5M3.5 11V10a4 4 0 0 1 4-4h13M7 21.5 3.5 18 7 14.5M20.5 13v1a4 4 0 0 1-4 4h-13" />
    <path d="M11 10.5h1.2V15" />
  </>,
);
export const HomeIcon = stroked(<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1Z" />);
export const SearchIcon = stroked(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20.5 20.5-4.5-4.5" />
  </>,
);
export const LibraryIcon = stroked(<path d="M4.5 3.5v17M9.5 3.5v17M14 4.2l5.5 16" />);
export const CarIcon = stroked(
  <>
    <path d="M3 17v-4l2-5.2A2 2 0 0 1 6.9 6.5h10.2a2 2 0 0 1 1.9 1.3L21 13v4M3 13h18M9.5 17h5" />
    <circle cx="6.5" cy="17" r="2" />
    <circle cx="17.5" cy="17" r="2" />
  </>,
);
export const PlusIcon = stroked(<path d="M12 5v14M5 12h14" />);
export const UploadIcon = stroked(<path d="M12 15V3.5M7 8.5l5-5 5 5M4.5 15v4a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-4" />);
export const ChevronDownIcon = stroked(<path d="m6 9 6 6 6-6" />);
export const ChevronLeftIcon = stroked(<path d="m15 18-6-6 6-6" />);
export const QueueIcon = stroked(<path d="M3.5 6h14M3.5 11.5h14M3.5 17h8M16 15.5v5l4-2.5Z" />);
export const CloseIcon = stroked(<path d="M18 6 6 18M6 6l12 12" />);
export const MusicIcon = stroked(
  <>
    <path d="M9 18V5.5l11-2V16" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="16" r="2.5" />
  </>,
);
export const TrashIcon = stroked(<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13" />);
export const PencilIcon = stroked(<path d="M4 20h4L19 9l-4-4L4 16Z" />);
export const AlbumIcon = stroked(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.5" />
  </>,
);
export const UserIcon = stroked(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>,
);
