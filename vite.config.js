import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { challengeDevApi } from './scripts/lib/challengeDevApi.mjs'
import { prerenderHome } from './scripts/lib/prerenderHome.mjs'
import { fontPreload } from './scripts/lib/fontPreload.mjs'
import { i18nPreload } from './scripts/lib/i18nPreload.mjs'
import { readdirSync } from 'node:fs'

// The game covers (src/assets/gameLogos): ~650 KB of WebP that only the gyms,
// game covers and patch notes show. Out of the precache, into the runtime
// cache below (2026-11-12) — read from the folder so a new cover follows.
const gameCoverGlobs = readdirSync(new URL('./src/assets/gameLogos', import.meta.url))
  .filter((file) => file.endsWith('.webp'))
  .map((file) => `**/assets/${file.replace(/\.webp$/, '')}-*.webp`)

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
  resolve: {
    // The browser gets translateClient.js wherever code imports translateCore:
    // same API, but it reads only the language the visitor loaded instead of
    // pulling both tables (~90 KB gz) into the entry chunk. Node (api/, the
    // build's prerender) and Vitest keep translateCore with every language.
    alias: process.env.VITEST ? [] : [
      { find: /^(.*\/)translateCore(\.js)?$/, replacement: '$1translateClient.js' },
    ],
  },
  plugins: [
    react(),
    // `npm run dev` only: /api/challenge served in-process over an in-memory
    // database, since /api/* otherwise exists only on Vercel.
    challengeDevApi(),
    // `/` is served as the static index.html on Vercel, never through
    // api/render-meta.js — so the build writes the English home into it.
    // The fonts are served from this site (src/styles/fonts.css); the heading
    // and body faces are preloaded so the landing's H1 paints without waiting.
    // Before prerenderHome: both are `post` transforms and run in this order,
    // and prerenderHome keeps the html it receives as render-meta's shell.
    fontPreload(),
    // The visitor's translation chunk starts downloading with the page
    // (src/i18n/catalog.js). Also before prerenderHome, so the shell has it.
    i18nPreload(),
    prerenderHome(),
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
          '**/logo-mascot-256.png',
          // The patch notes' donation cover, one per language — fetched when
          // that dialog opens; precaching both cost every visit ~92 KB.
          '**/support-cover-*.webp',
          '**/og-image.png',
          '**/pokepuzzle-og.png',
          '**/challenge-og.png',
          '**/android-chrome-512x512.png',
          // The Primeira Jornada's tour (FirstJourney): fetched when the flow opens, once.
          '**/onboarding/tour-*.webp',
          // api/render-meta.js's template (scripts/lib/prerenderHome.mjs).
          '**/shell.html',
          // Faces almost no visit uses (src/styles/fonts.css): mono italic,
          // the latin-ext ranges, the Challenge's DotGothic16. Hashed and
          // cached by the browser when a page does need them.
          '**/*-latin-ext-*.woff2',
          '**/*-italic-*.woff2',
          '**/dotgothic16-*.woff2',
          // Legacy: the raster wordmark the build before 2026-10-30 asks for.
          // Kept in public/ for clients still on that build (they update only
          // when they accept the prompt); the current build uses the SVG.
          '**/logo-wordmark*.webp',
          ...gameCoverGlobs,
        ],
        // Web Push lives in the *generated* worker rather than a second
        // registration of its own — a second service worker is what caused the
        // double update prompt (docs/wounds.md, 2026-09-14). The path is
        // resolved relative to `sw.js`, so it follows `base` on both deploys.
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          {
            // The app's own images left out of the precache (game covers,
            // support covers…): cached the first time a screen shows one.
            // Hashed names under /assets/ never change content, so CacheFirst
            // is safe there; the support covers keep their names and are
            // refreshed by expiry.
            urlPattern: /\/(assets\/[^/]+|support-cover-[a-z]+)\.(?:webp|png|jpe?g|svg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
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
            // Our own copy of both sprite hosts (VITE_ASSET_MIRROR_URL, see
            // src/utils/assetHost.js) — the Cloud Storage bucket. Objects are
            // public with CORS, so responses aren't opaque.
            urlPattern: /^https:\/\/(storage|firebasestorage)\.googleapis\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mirrored-sprites',
              expiration: {
                maxEntries: 900,
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
          // The QR code only the PokéPuzzle share image draws
          // (components/pokepuzzle/drawPuzzleShare.js). In `vendor` it rode the
          // boot path for every visitor, ~25 KB raw (2026-11-12).
          if (/\/node_modules\/(qrcode|dijkstrajs)\//.test(normalizedId)) return 'qrcode'
          return 'vendor'
        },
      },
    },
  },
  test: {
    // Tests see the origin sprite hosts whatever the local .env says — the
    // mirror (src/utils/assetHost.js) is a deploy setting, not test input.
    env: { VITE_ASSET_MIRROR_URL: '' },
  },
})
