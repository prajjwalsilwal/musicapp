import { NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { CarIcon, HomeIcon, LibraryIcon, SearchIcon } from './components/icons';
import { MiniPlayer } from './components/MiniPlayer';
import { NowPlaying } from './components/NowPlaying';
import { TrackActions } from './components/TrackActions';
import { useUi } from './components/ui';
import { CarMode } from './pages/CarMode';
import { AlbumPage, ArtistPage, LikedPage, PlaylistPage } from './pages/Collections';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { Search } from './pages/Search';
import { useEffect } from 'react';

const NAV = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/search', label: 'Search', Icon: SearchIcon },
  { to: '/library', label: 'Library', Icon: LibraryIcon },
  { to: '/car', label: 'Car', Icon: CarIcon },
];

function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="shell">
      <main className="shell__main">
        <Outlet />
      </main>
      <div className="shell__bottom">
        <MiniPlayer />
        <nav className="tabs" aria-label="Main">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className="tab">
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Toast() {
  const { toastMessage } = useUi();
  return (
    <div className="toast" role="status" aria-live="polite" data-show={!!toastMessage}>
      {toastMessage}
    </div>
  );
}

export function App() {
  return (
    <>
      <Routes>
        <Route path="/car" element={<CarMode />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="library" element={<Library />} />
          <Route path="liked" element={<LikedPage />} />
          <Route path="album/:key" element={<AlbumPage />} />
          <Route path="artist/:name" element={<ArtistPage />} />
          <Route path="playlist/:id" element={<PlaylistPage />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
      <NowPlaying />
      <TrackActions />
      <Toast />
    </>
  );
}
