import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Unique id for this build, used to cache-bust static /data/*.json files on every
// deploy (see src/services/pokemonDataCache.js). Overridable via VITE_BUILD_ID
// (e.g. a git SHA in CI); falls back to Vercel's commit SHA, then to the build
// timestamp, which is unique per `vite build` invocation.
const buildId = process.env.VITE_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())

// The per-format usage files the Team Builder itself reads — the default format
// (competitive presets) and the regulations its game picker offers — so they are
// precached with the rest of the builder's data. The other ladder tiers (~8 MB)
// only feed the Meta pages and are cached as they are visited.
const builderUsageFiles = () => {
  try {
    const index = JSON.parse(readFileSync(new URL('./public/data/usage-index.json', import.meta.url), 'utf8'))
    const formats = Array.isArray(index.formats) ? index.formats : []
    return [...new Set(formats
      .filter((f) => f.id === index.default || f.kind !== 'tier')
      .map((f) => f.file && `data/${f.file}`)
      .filter(Boolean))]
  } catch {
    return []
  }
}

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
        // `data/*.json` is what lets the app build a team with no network: the
        // Pokémon index, items/natures, Smogon sets and offline-builder.json (every
        // Pokémon's moves/abilities/stats). Only top-level files — see
        // builderUsageFiles for the one subfolder the builder needs.
        // The offline Pokédex pack itself (data/pokedex/*) is NOT precached — the
        // page downloads it in the background (src/services/offlinePokedexDownload.js).
        // Only its manifest is, so each deploy knows which pack it shipped.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}', 'data/*.json', 'data/pokedex/manifest.json', ...builderUsageFiles()],
        // The data loaders cache-bust with `?v=<build>` / `?d=<day>`. Precache
        // entries are revisioned by content already, so those params must not
        // stop a request from matching its precached file.
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/, /^d$/],
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
            // jsDelivr's path is `sprites@master/`, not `sprites/`: the pattern
            // used to require the slash, so no jsDelivr sprite was ever cached.
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net\/gh\/PokeAPI\/sprites[@/]|raw\.githubusercontent\.com\/)/,
            handler: 'CacheFirst',
            options: {
              // The offline Pokédex download writes ~3,900 sprites straight into
              // this cache. The limit sits above that so serving them (which
              // starts tracking them) can't evict them, and there is no max age:
              // sprite files never change, and an age check would reject every
              // downloaded sprite a month after its download.
              cacheName: 'pokemon-sprites',
              expiration: {
                maxEntries: 6000,
              },
              plugins: [
                {
                  // Offline, a sprite that was never downloaded (HD artwork, the
                  // generation-history strip) falls back to the pixel sprite of
                  // the same Pokémon, which the Pokédex download always has.
                  // Serialized into sw.js, so it must stay self-contained.
                  handlerDidError: async ({ request }) => {
                    const match = request.url.match(/\/sprites\/pokemon\/(?:.*?\/)?(shiny\/)?(\d+)\.(?:png|gif)$/)
                    if (!match) return undefined
                    const pixel = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${match[1] || ''}${match[2]}.png`
                    if (pixel === request.url) return undefined
                    return (await caches.match(pixel)) || undefined
                  },
                },
              ],
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
            // Ladder usage files outside the precache (Meta pages). `ignoreSearch`
            // because the loaders append a daily `?d=` cache-buster.
            urlPattern: ({ url }) => url.pathname.includes('/data/usage/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'usage-data',
              matchOptions: { ignoreSearch: true },
              expiration: { maxEntries: 80 },
            },
          },
          {
            // PokéAPI records (Pokédex detail, move/ability pages). The data
            // loader already keeps most in Web Storage; this also covers the
            // session-scoped ones, so anything viewed once opens offline.
            urlPattern: /^https:\/\/pokeapi\.co\/api\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pokeapi',
              expiration: {
                maxEntries: 2000,
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
