import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Unique id for this build, used to cache-bust static /data/*.json files on every
// deploy (see src/services/pokemonDataCache.js). Overridable via VITE_BUILD_ID
// (e.g. a git SHA in CI); falls back to Vercel's commit SHA, then to the build
// timestamp, which is unique per `vite build` invocation.
const buildId = process.env.VITE_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || (process.env.VERCEL ? '/' : '/pokemonTeamBuilder/'),
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // Use the existing site.webmanifest — only add the service worker
      manifest: false,
      workbox: {
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Pokémon sprites. `raw.githubusercontent.com` is the legacy host —
            // src/utils/pokemonSprites.js now serves everything from jsDelivr, so
            // both are matched (the old one only for links already in the wild).
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net\/gh\/PokeAPI\/sprites|raw\.githubusercontent\.com)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pokemon-sprites',
              expiration: {
                maxEntries: 600,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            // Showdown trainer sprites (and, later, the animated battle sprites).
            // Hotlinked via <img> only — the host sends no CORS header.
            urlPattern: /^https:\/\/play\.pokemonshowdown\.com\/sprites\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'showdown-sprites',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/')
          if (!normalizedId.includes('/node_modules/')) return undefined
          if (normalizedId.includes('/firebase/') || normalizedId.includes('/@firebase/')) return 'firebase'
          if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/') || normalizedId.includes('/scheduler/')) return 'react-vendor'
          // Battle sprites (@pkmn/img) are only ever needed by the battle route.
          // Left in `vendor` they rode along in the eager boot bundle, costing
          // every visitor ~40 KB gz for a feature most never open. Their own chunk
          // means Rollup loads them with the lazy battle view instead.
          if (normalizedId.includes('/@pkmn/')) return 'pkmn'
          return 'vendor'
        },
      },
    },
  },
})
