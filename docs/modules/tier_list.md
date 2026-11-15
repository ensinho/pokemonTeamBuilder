# Tier list (`/tier-list`, 2026-11-15)

Enzo: "Charts, tipo o tierlistmaker, quero dentro do site, com alguns temas
padrão, de iniciais, favoritos de tipo e etc, tudo com visual do nosso site,
exportação em imagem clean com nosso tema e ícone mascote." Built as part of
the games-first pass (the Mais sheet's "Jogar", a persona pick, ⌘K through the
rail's items).

## Pieces

| File | Role |
|---|---|
| `src/utils/tierList.js` | **The rules, pure and tested** (`tierList.test.js`): `TIER_TEMPLATES`, `TIER_KEYS`, `TIER_BALLS`, `createBoard`, `placeItem` / `addToPool` / `removeItem` / `unrankAll` / `setCell` / `setTitle`, `normalizeBoard` / `normalizeStore` (storage is never trusted), `meetsCellRule`, `searchMons`, `monLabel`, and `tierExportLayout` — every position in the image. Node-safe. |
| `src/components/views/TierListView.jsx` | The page: the theme rail, the board (ranks or a chart), the pool, the actions. Lazy route chunk. |
| `src/components/tierList/drawTierList.js` | The PNG: draws what `tierExportLayout` places. Its own chunk, loaded on the first export. |
| `src/styles/tier-list.css` | The page's styles. |
| `src/components/NextGameCard.jsx` | "Próximo do dia" — the row under the actions: the Champion, or the PokéPuzzle when the Champion was played today, or "Tudo feito hoje · novos jogos em 5h12" once both were (`utils/gamesToday.js` `nextGameFor`, tested). |

## Two kinds of board

- **Tier** — five ranks, **each a Poké Ball** (S Master, A Ultra, B Great,
  C Poké, D Premier): the games' own ladder, not the tiermaker rainbow. The
  ball colours are canon (`TIER_BALLS`, `BALL_BASE`, `BALL_INK`), passed as
  custom properties and mixed into tokens; the rank tile takes the oklch
  "colour is light" recipe on dark themes. Templates: starters (27), box
  legendaries, pseudo-legendaries, Eeveelutions, mythicals, Pikaclones, a free
  list (search to add, up to `MAX_BOARD_ITEMS`).
- **Chart** — named cells, one Pokémon each: favourite of each type (18) and
  of each generation (9). An empty cell is the silhouette's "?"; a cell opens a
  bottom sheet of the Pokémon that meet its rule (`meetsCellRule`).

## Interaction

- **Tap, then tap** (the phone's way, and the keyboard's): a tap lifts a
  Pokémon (Volt ring, a 4px rise — the board's one transform), a tap on a rank
  puts it at the end, a tap on another Pokémon puts it before that one, a tap
  on the pool sends it back. Escape drops it. Every lane answers with a ring
  while something is lifted.
- **Drag**: a mouse drags after 8px; a finger after a 260ms hold, so a swipe
  over the pool still scrolls (a non-passive `touchmove` stops the scroll only
  once the drag began). The drop index comes from the item rects under the
  pointer; `placeItem` corrects for the gap a card leaves in its own row.
- **On a phone, tap then tap** (2026-11-15, third pass — Enzo: "clique no
  Pokémon → depois clique na seção, visualmente mesmo"): the board is compact
  on top (3rem rank tiles and cards), the pool a plain grid under it, the
  themes a row of chips. A tap lifts a Pokémon; every rank lights up with a
  Volt edge and a bar above the dock (`.tier-held`) says who is lifted, with
  "Reserva" for a ranked one and an X to put it down; a tap on a rank places
  it, a tap on a Pokémon in a rank places it before that one. A long press
  still drags. (Two earlier passes: a sticky tray over the ranks — it covered
  the rows it fed — and a sheet of five balls, a step Enzo found slower than
  tapping the rank itself.)

## The image

`renderTierListBlob` — the PokéPuzzle share's language: the brand violet with
poster rings, the mascot's mark (`logo-mark.webp`), "MINHA TIER LIST" and the
list's name in Unbounded, each rank's ball and letter, sprites cropped to their
middle 72px and stood on a platform in their first type, and
`pokemonbuilder.app/tier-list` + POKEMONBUILDER in the footer. 1080 wide, as
tall as the board. Sprites load with `crossOrigin` and fall back to their
origin when the mirror has no CORS. Shared through `navigator.share` on a
touch device that can share files, downloaded elsewhere. `track('tierlist_export',
{ template, placed })` (analytics.md's funnel).

## Storage and privacy

`ptb:tierList:v1` — `{ current, boards: { [templateId]: board } }`, written
250ms after the last change. A trainer's key (not in `DEVICE_KEYS`), so
`leaveSession` wipes it. Nothing reaches Firestore. The privacy page says the
tier lists never leave the device (2026-11-15).

## SEO

`/tier-list` is in `STATIC_PAGES` (`seo.tierList` in both languages) and the
sitemap.

## The shared link (`?r=`)

"Compartilhar link" puts the board in the URL: `/tier-list?r=t.starters.7-4....p6`
(`encodeTierList` / `decodeTierList` in `utils/tierList.js`, tested). The
resultShareCode.js rules hold: **ids only** — the list's own name never
leaves the device, the preview says the theme's — and a strict decode (a
known theme of the right kind, base Pokémon only, no repeats, a themed list
holding only its theme, a chart with exactly its cells). A chart's cells are
also checked against their rule with the index (`keepFittingCells`) on the
page and in `api/og.js`, so a forged link cannot put a Grass type in the
Electric cell.

- **The page** shows the list read-only (`SharedList`) with "Fazer a minha a
  partir desta" (copies it into that theme's board — after a confirm when one
  is already ranked — and drops `?r=`) and "Começar do zero". A bad code is a
  toast and the editor.
- **The preview**: `render-meta` titles it "Minha tier list: {theme}" through
  `resultShareMeta` (kind `tierlist`) and points og:image at
  `/api/og?tierlist=…`, which draws the ranks (each in its ball's colour, up
  to 13 artworks a row) or the chart's grid. `api/og.js` takes the codec
  through `_lib/ogImage.js` — its static imports are `node:` and `_lib/` only
  (`og.test.js`).
- Events: `tierlist_share`, `tierlist_remix`.

## Not built yet

Editable rank names; more chart themes (favourite per region's gym, per
evolution line); posting a list to the forum's Diário do dia.
