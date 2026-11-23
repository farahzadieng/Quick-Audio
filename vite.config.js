import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const base =
  process.env.GITHUB_PAGES === 'true' ? process.env.GITHUB_PAGES_BASE || '/Quick-Audio/' : '/';
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  // FFmpeg creates its own worker; Vite's dependency prebundle breaks its worker URL in dev.
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        id: base,
        name: 'Quick Audio Tools',
        short_name: 'Quick Audio',
        description: 'Private on-device audio metadata editor and audio format converter.',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#edede9',
        theme_color: '#edede9',
        icons: [
          {
            src: `${base}icons/icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: `${base}icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        globIgnores: ['ffmpeg/**'],
        maximumFileSizeToCacheInBytes: 35 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            urlPattern: /\/ffmpeg\/ffmpeg-core\.(js|wasm)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ffmpeg-core-cache',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  build: { target: 'es2022' },
  base,
});
