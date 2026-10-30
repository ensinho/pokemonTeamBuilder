# Asset mirror (sprites on our own bucket)

**Why:** every sprite used to be hotlinked from `cdn.jsdelivr.net` (PokeAPI's
sprite repo) and `play.pokemonshowdown.com`. School and office filters block
both as "games", so the app loaded with no Pokémon in it. The mirror is our own
copy in Cloud Storage for Firebase, on a Google host those filters don't block.

## How it fits

- `src/utils/assetHost.js` is the only place that names a sprite host. Use
  `POKEAPI_SPRITES_BASE` / `SHOWDOWN_SPRITES_BASE` (or `getPokemon*SpriteUrl`),
  never a hardcoded `cdn.jsdelivr.net` / `play.pokemonshowdown.com` URL.
- `VITE_ASSET_MIRROR_URL` (build-time) switches it on, e.g.
  `https://storage.googleapis.com/<bucket>`. Empty = the origins, as before.
- Bucket layout mirrors the origins: `pokeapi/…` ↔ `…/PokeAPI/sprites@master/sprites/…`,
  `showdown/…` ↔ `play.pokemonshowdown.com/sprites/…`.
- `installAssetFallback()` (main.jsx): an `<img>` whose file is missing on the
  mirror retries once at its origin, before any component `onError` runs.
- Service worker caches the mirror as `mirrored-sprites` (vite.config.js).
- Server-side images (`api/_lib/ogImage.js`) still fetch the origin — servers
  aren't behind a school filter.

## Filling the bucket

`npm run assets:mirror` (`scripts/mirror-assets.mjs`) downloads every sprite
the baked data references (pokemon-index ids × front/shiny/artwork/showdown gif,
items.json, trainer-sprites.json + gym leaders) and uploads with
`Cache-Control: public, max-age=2592000`. Incremental — re-run after a data
refresh. `--setup` sets CORS + public read, `--only=pokemon,artwork,animated,items,trainers`,
`--dry-run`, `--force`.

Credentials: `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (as `api/`), or
Application Default Credentials. Bucket: `STORAGE_BUCKET` or `VITE_FIREBASE_STORAGE_BUCKET`.

The bucket must hold only public files — read access is bucket-wide (`allUsers`).
User uploads, if they ever exist, go in a different bucket.
