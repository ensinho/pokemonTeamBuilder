import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { challengeDevApi } from './scripts/lib/challengeDevApi.mjs'

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
    // `npm run dev` only: /api/challenge served in-process over an in-memory
    // database, since /api/* otherwise exists only on Vercel.
    challengeDevApi(),
    VitePWA({
      registerType: 'prompt',
      // Use the existing site.webmanifest — only add the service worker
      manifest: false,
      workbox: {
        // Every precached byte is downloaded by every first-time visitor, in
        // the background, whether or not they ever open the route that uses it.
        // This was 8 MB to let a client-side @pkmn/sim chunk (6.5 MB) through;
        // the precache was 13.7 MB. Keep the ceiling low so a file that big
        // fails the build instead of quietly riding along (2026-10-06).
        maximumFileSizeToCacheInBytes: 1.5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,webp,svg,woff2}'],
        // Share-card / OG / install-icon art: fetched by crawlers, the canvas
        // share and the OS installer — never needed to render the app offline.
        globIgnores: [
          '**/LogoCuteGengarRounded.png',
          '**/og-image.png',
          '**/pokepuzzle-og.png',
          '**/challenge-og.png',
          '**/android-chrome-512x512.png',
          '**/logoLogin*.png',
        ],
        // Web Push lives in the *generated* worker rather than a second
        // registration of its own — a second service worker is what caused the
        // double update prompt (docs/wounds.md, 2026-09-14). The path is
        // resolved relative to `sw.js`, so it follows `base` on both deploys.
        importScripts: ['push-sw.js'],
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
          // Analytics loads after the page has (src/services/analytics.js); in the
          // shared firebase chunk it would ride the boot path for every visitor.
          if (/\/node_modules\/(@firebase\/(analytics|installations)|firebase\/analytics)/.test(normalizedId)) return 'firebase-analytics'
          if (normalizedId.includes('/firebase/') || normalizedId.includes('/@firebase/')) return 'firebase'
          // Anchored to node_modules: a bare '/react/' also matched subpaths like
          // zustand/esm/react/shallow.mjs, which pulled it into react-vendor while
          // the rest of zustand sat in vendor — a chunk cycle that left React
          // undefined at boot (blank app) the day useShallow was first imported.
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(normalizedId)) return 'react-vendor'
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
