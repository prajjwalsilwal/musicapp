# Musicapp

A personal music streaming app for **your own music library**: library, search, albums, artists, playlists,
Liked Songs, a shuffle/repeat queue and a full-screen player. It installs to an iPhone Home Screen, plays through
car Bluetooth with lock-screen and steering-wheel controls, and has a big-button **Car mode** for use while
driving.

```
apps/web        React + Vite PWA (the app you open on the phone)
apps/server     Node/Fastify API: indexes your music, streams it, stores playlists and likes
docs/           Plans for later phases
```

**Scope:** phase 1 is the music app on iPhone. A dedicated car display that shows music *and* car stats
is phase 2. See [docs/phase-2-car-display.md](docs/phase-2-car-display.md).

Music comes from files you own (MP3, AAC/M4A, ALAC, FLAC, WAV…). The app does not pull audio from Spotify or
YouTube Music: their terms forbid it and their streams are DRM-protected.

## Run it

Requires Node 22+ and pnpm.

```bash
pnpm install
```

```bash
pnpm dev          # web on :5173 (proxies to the API), API on :4000
```

Add music by tapping **Library → Upload music**, or copy files into `apps/server/data/media/` (subfolders are
fine) and tap **Rescan music folder**. Tags and embedded cover art are read automatically.

### Production (one process)

```bash
pnpm build && pnpm start      # serves the app and the API together on :4000
```

| Variable    | Default                  | Purpose                                  |
| ----------- | ------------------------ | ---------------------------------------- |
| `PORT`      | `4000`                   | HTTP port                                |
| `HOST`      | `0.0.0.0`                | Bind address                             |
| `DATA_DIR`  | `./data`                 | Library index, playlists, likes          |
| `MEDIA_DIR` | `$DATA_DIR/media`        | Your music files                         |
| `WEB_DIR`   | `../web/dist`            | Built web app to serve                   |

## Using it on your iPhone

1. Run the server on a computer that stays on.
2. On the iPhone, open `http://<computer-ip>:4000` in **Safari** (same Wi-Fi), tap **Share → Add to Home Screen**.
3. Play something, lock the phone: controls appear on the lock screen, and car Bluetooth / steering-wheel
   next/previous buttons work through the same Media Session controls.

**Away from home:** install [Tailscale](https://tailscale.com) on the server and the iPhone, then run
`tailscale serve 4000` on the server. You get a private `https://` address that works over cellular. HTTPS
also lets the app's service worker install, so the app shell and artwork are cached.

**Offline:** songs currently stream from the server, so in the car the phone needs a connection to it.
Offline downloads are on the roadmap below.

## In the car (2012 Honda Pilot)

The app plays like any other audio app. Many 2012 Pilots use Bluetooth (HandsFreeLink) for phone calls only
and can't stream music. If **Bluetooth Audio** isn't a source on your stereo, use the AUX/USB input or a
Bluetooth-to-AUX receiver. Tap the **Car** tab for large controls when the phone is in a mount.

## Development

```bash
pnpm test         # server API tests + queue logic tests
```

```bash
pnpm typecheck
```

Key implementation notes:

- **iOS playback:** `play()` is called synchronously inside the tap handler (`apps/web/src/player/PlayerProvider.tsx`),
  because iOS blocks playback started anywhere else. The server streams with HTTP Range support, which iOS
  requires for audio.
- **Lock screen and car buttons:** the app deliberately registers no `seekforward`/`seekbackward` handlers.
  On iOS those replace the previous/next track buttons with ±10 s skips.
- **Queue logic** is pure and unit-tested in `apps/web/src/player/queue.ts`.
- **Storage** is JSON files under `DATA_DIR`, written atomically. That's fine for one person's library of
  tens of thousands of tracks. Move to SQLite if it outgrows that.

## Roadmap

- Offline downloads (cache tracks on the phone for drives without signal)
- Lyrics (`.lrc` files next to tracks), crossfade, gapless playback
- Smart playlists (most played, recently added), play counts
- Licensed sources: Apple Music via MusicKit JS works in iOS Safari (needs an Apple Developer account);
  Spotify's Web Playback SDK does not support iOS Safari
- Phase 2: dedicated car display with music plus car stats ([plan](docs/phase-2-car-display.md))
