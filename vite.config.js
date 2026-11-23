import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg','icons/icon-192.png','icons/icon-512.png'],
    manifest: {
      id:'/',name:'Audio Quick Tools',short_name:'Audio Tools',description:'Private on-device audio metadata editor and audio format converter.',
      start_url:'/',scope:'/',display:'standalone',background_color:'#edede9',theme_color:'#edede9',
      icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any maskable'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]
    },
    workbox: {
      globPatterns:['**/*.{js,css,html,svg,png,webp,woff2}'],
      globIgnores:['ffmpeg/**'],
      maximumFileSizeToCacheInBytes:35*1024*1024,
      navigateFallback:'/index.html',
      runtimeCaching:[{urlPattern:/\/ffmpeg\/ffmpeg-core\.(js|wasm)$/,handler:'CacheFirst',options:{cacheName:'ffmpeg-core-cache',expiration:{maxEntries:4,maxAgeSeconds:60*60*24*90}}},{urlPattern:/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,handler:'CacheFirst',options:{cacheName:'font-cache',expiration:{maxEntries:12,maxAgeSeconds:60*60*24*365}}}]
    }
  })],
  build:{target:'es2022'},
  base:'/'
});
