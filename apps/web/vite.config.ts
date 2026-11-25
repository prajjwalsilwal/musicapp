import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const API = process.env.API_URL ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Musicapp',
        short_name: 'Musicapp',
        description: 'Your music library and playlists.',
        start_url: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0d0d10',
        theme_color: '#0d0d10',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\/tracks\/[^/]+\/art$/,
            handler: 'CacheFirst',
            options: { cacheName: 'artwork', expiration: { maxEntries: 2000 } },
          },
        ],
      },
    }),
  ],
  server: {
    host: true, // reachable from your phone on the same Wi-Fi
    proxy: { '/api': API },
  },
  preview: {
    host: true,
    proxy: { '/api': API },
  },
});
