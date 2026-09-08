# Plan — Friend list + async ("play-by-message") battles

> Status: **investigated, decisions locked, not implemented.**
> Written 2026-07-24. Every number in "Findings" was measured, not estimated.

## Decisions (locked by Enzo, 2026-07-24)

| Question | Decision | Consequence |
|---|---|---|
| Engine | **Embed `@pkmn/sim`** (§2 A) | Mechanical parity from day one; pin the version per battle |
| Where turns resolve | **Authoritative Vercel function** (§3 Model 2) | No cheating, no set-sniffing, clients load only 82 KB. Needs `firebase-admin` + a service-account secret. **Battles will not work on the GitHub Pages deploy** — Vercel only, like the existing admin email function |
| Format | **`gen9customgame`, singles** | Any saved team is playable; no bans, no Species Clause. Real formats can be added later as a dropdown |
| Level | **Fixed 50** | Matches `damageCalc.js`'s default; no new field on team members. The adapter injects `Level: 50` when packing |
| Delivery | **Phases 0–1 first** (public profiles + trainer sprites + friend list), shipped on their own | Real value early, low risk, and it unblocks battles. See §9 for the concrete task list |

Goal: a friend list, and turn-based battles between two friends where turns are
**atemporal** — I send a challenge, they accept, each player submits a choice
whenever they open the app, and the turn resolves once both have chosen. Full
mainline mechanics (speed order, crits, HP, status…), a rendered battle with
animated sprites, and trainer sprites for user avatars.

---

## 1. Findings (measured)

### 1.1 What the codebase already gives us

| Asset | Where | Reusable for battles? |
|---|---|---|
| Full competitive damage formula (16 rolls, abilities, items, weather, terrain, screens, hazards, crit, Tera, STAB) | `src/utils/damageCalc.js` (661 loc, tested) | Yes — but see §2 |
| Base stats for all 1213 index entries (incl. forms) | `public/data/pokemon-index.json` (460 KB) | **Yes, directly.** No API call needed to stat out a team |
| Team member shape already battle-complete: `moves`, `evs`, `ivs`, `nature`, `item`, `ability`, `teraType`, `isShiny` | `useActiveTeamStore.createTeamMember` | Yes — maps 1:1 to a Showdown set |
| Showdown-format text export | `src/utils/showdownExport.js` (tested) | **Yes — this is the bridge.** See §2.3 |
| Real-time chat over Firestore `onSnapshot` (topics + messages + likes + rules) | `useForumStore.js` + `firestore.rules` | Yes — the exact transport pattern for battles |
| A build script that already consumes Showdown's bulk data | `scripts/build-move-types.mjs` (source: `play.pokemonshowdown.com/data/moves.json`) | Yes — precedent for pulling Showdown data at build time |
| A Vercel serverless function with Firebase ID-token verification via `jose`/JWKS | `api/send-admin-reply.js` | Yes — precedent for an authoritative server endpoint |
| Type chart / colors / icons | `src/constants/types.js` | Yes (UI) |

### 1.2 What is missing entirely

- **No friend system, and no public user directory.** Users live only under
  `artifacts/{appId}/users/{uid}/**`, readable exclusively by the owner
  (`firestore.rules:22`). `UserProfileModal` fakes a profile by scraping forum
  messages — there is no profile record you can look up by name. A friend list
  therefore needs a **new public collection**, plus rules.
- **No move battle data.** `public/data/move-types.json` is only `{ moveId: type }`.
  No base power, accuracy, PP, priority, target, flags, or secondary effects.
- **No turn engine** of any kind.

### 1.3 Showdown resources — probed live

All endpoints return `200`, `cache-control: max-age=691200` (8 days):

| URL | Size | CORS |
|---|---|---|
| `/sprites/ani/charizard.gif` | 84 KB | no `allow-origin` → **`<img>` only, never `fetch`/canvas** |
| `/sprites/ani-back/charizard.gif` | 78 KB | idem |
| `/sprites/ani-shiny/…`, `/sprites/ani-back-shiny/…` | ~75 KB | idem |
| `/sprites/gen5/charizard.png` (static) | 1.1 KB | idem |
| `/sprites/trainers/red.png` | 0.7 KB | idem |
| `/data/moves.json` | 488 KB | `access-control-allow-origin: *` |
| `/data/pokedex.json` | 524 KB | `*` |

**Distilling `moves.json` to only battle-relevant fields → 98 KB raw / 14 KB
gzipped** (697 non-`isNonstandard` moves). Measured. So a static
`public/data/battle-moves.json` is essentially free.

### 1.4 The big finding: we do not have to write the engine

Smogon/Showdown publish the **actual simulator** as MIT-licensed, browser-ready
npm packages (`@pkmn/*`). Measured bundle cost, minified + gzipped, via esbuild
`--platform=browser`:

| Package | Role | Cost (gz) |
|---|---|---|
| `@pkmn/sim` | the real Showdown engine — every move, ability, item, format | **1018 KB** |
| `@pkmn/client` + `@pkmn/view` + `@pkmn/img` + `@pkmn/data` | protocol → view state, sprite/icon URL resolution | ~~82 KB~~ — **see the correction below** |

> **Correction (found in phase 4).** That 82 KB was measured by importing the modules
> without a usable dex. `@pkmn/client` cannot maintain battle state without species data,
> which means shipping `@pkmn/dex` as well — and the honest figure for a *working*
> renderer is **805 KB gzipped**: seven times the app's Firebase chunk, and by far the
> largest thing it would ever load. `@pkmn/img` on its own, which is all that's needed
> for sprite URLs, is **42 KB gzipped**. Phase 4 therefore uses `@pkmn/img` and reads the
> battlefield out of the protocol directly (`src/utils/battleState.js`).

Zero Node builtins survive bundling (`require("fs"|"path"|"crypto"|…)` → 0 hits),
so it genuinely runs in the browser. 54 gen-9 formats are available out of the
box (`gen9ou`, `gen9vgc2024regg`, `gen9doublesou`, `gen9customgame`, …) — which
means **team legality validation comes free**.

Verified by actually running it (Node, `@pkmn/sim@0.10.11`): a Charizard/Garchomp
vs Blastoise/Pikachu battle produced correct team preview, switch-in, speed
order, type effectiveness, Blaze activation at low HP, Leftovers recovery, and a
faint — as standard Showdown protocol lines:

```
|move|p1a: Charizard|Flamethrower|p2a: Blastoise
|-resisted|p2a: Blastoise
|-damage|p2a: Blastoise|137/186
|move|p2a: Blastoise|Surf|p1a: Charizard
|-supereffective|p1a: Charizard
|-damage|p1a: Charizard|33/153
|-heal|p2a: Blastoise|148/186|[from] item: Leftovers
```

**And it is deterministic.** Same `seed` + same choice sequence → byte-identical
protocol output (verified by sha1 over two independent runs, timestamp lines
stripped; a different seed diverges). This is the property that makes an
atemporal, serverless battle possible: Firestore only has to store *the seed and
the list of choices*, and any client — or a server, later — can replay to the
exact same state.

`@pkmn/img` also resolves every sprite the request mentioned:
`Sprites.getPokemon('charizard', {gen:'ani', side:'p1', shiny:true})` →
`…/sprites/ani-back-shiny/charizard.gif` (+ width/height), and
`Sprites.getAvatar('cynthia')` → `…/sprites/trainers/cynthia.png`. Pokémon and
item **icons come as CSS spritesheet offsets** (one image for all icons) — ideal
for team bars.

---

## 2. Architectural decision: engine

### Option A — embed `@pkmn/sim` (recommended)

- Mechanical parity with Showdown from day one. Every ability, every edge case,
  every format's legality rules.
- 1 MB gz, but **lazy-loaded**: the app already code-splits routes and has a
  `manualChunks` config. It is paid only when a user opens a battle, and only by
  whoever resolves the turn (see §3).
- Risk: a large dependency we don't control; upgrades could shift behaviour.
  Mitigated by pinning the version and storing it on the battle doc
  (`engineVersion`) so in-flight battles keep replaying identically.

### Option B — write our own engine on top of `damageCalc.js`

- ~1 MB lighter, full control, no new dependency.
- Realistically **2–3 months** to reach a state that doesn't feel wrong, and it
  will *never* reach parity (Showdown's sim is ~100k loc of edge cases). Every
  "why did my Rocky Helmet not trigger" becomes our bug.
- Would need: `battle-moves.json` (§1.3), a seeded PRNG, a turn reducer, stat
  stages added to `calcDamage` (it has no `boosts` handling), accuracy/miss,
  multi-hit, drain/recoil, residuals, switch-in ability triggers, hazard
  application, PP, and a per-ability table. `damageCalc.js` covers maybe 25% of
  a turn.

**Recommendation: A.** Keep `damageCalc.js` exactly as-is for the Damage
Calculator view — do not merge the two. One is a "what if" tool, the other is a
battle authority.

### 2.3 The bridge already exists

`buildShowdownExportText()` already emits a team in Showdown's import format, and
`@pkmn/sim` exposes `Teams.import()` / `Teams.pack()`. So converting a saved PTB
team into a battle team is roughly:

```js
Teams.pack(Teams.import(buildShowdownExportText(team)))
```

which is the single highest-leverage line in this whole plan. It needs a
validation pass (levels — PTB teams have no explicit level; nickname/gender/
Tera edge cases) but the shape is already right.

---

## 3. Architectural decision: where turns resolve (trust model)

The app has no game server. Three viable models:

### Model 1 — client-authoritative + commit–reveal (no server)

1. Both players' choices are written as `sha256(choice + salt)` first (write-once
   via rules), then revealed once both commits exist. Neither can see the other's
   choice before committing, and neither can grind the RNG: the turn seed is
   `hash(saltA + saltB)`.
2. Both clients independently replay `seed + choiceLog` through the sim and write
   a `stateHash`. A mismatch flags the battle as desynced.

- Works on **both** deploy targets (GitHub Pages + Vercel). No new backend.
- Cost: **both clients need the opponent's full team in plaintext** to run the
  sim → exact EVs/items/moves are visible in devtools. Species are public at team
  preview anyway (as in real Showdown), but *sets* leaking is a real fidelity
  loss. Also each player downloads the 1 MB engine chunk.
- Cheating is possible-but-annoying and detectable, not impossible.

### Model 2 — authoritative Vercel function ✅ **CHOSEN**

`api/battle-turn.js` verifies the Firebase ID token (the `jose`/JWKS pattern from
`api/send-admin-reply.js` is already written), replays the log server-side, and
writes **per-side filtered protocol streams** — `@pkmn/sim` natively emits
separate `p1` / `p2` / `spectator` streams, which is exactly how Showdown prevents
set-sniffing.

- Real authority: no cheating, no set leaking.
- Clients then only load the **82 KB** view stack, not the 1 MB engine. *Better*
  perf than Model 1.
- Cost: needs `firebase-admin` + a service-account secret in Vercel env (new
  dep, new secret), and **battles won't work on the GitHub Pages deploy** — the
  `/api/*` function is Vercel-only (already true for admin email replies).

### Model 3 — hybrid

Ship Model 1 first (works everywhere, no secrets), then lift the same resolver
into Model 2 without touching the engine or the UI — only the transport changes.

**My recommendation: go straight to Model 2** for the live domain, because the
set-leak in Model 1 is exactly the thing that makes "meio Pokémon Showdown" feel
fake, and Model 2 is *cheaper* on the client. Keep Model 1 as the documented
fallback if you'd rather not add a service-account secret.

---

## 4. Firestore data model (proposed)

### 4.1 Public profiles — prerequisite for friends

**Implemented** (see §9 status).

```
artifacts/{appId}/publicProfiles/{uid}
  displayName
  displayNameLower  // mirror for prefix search; rules force it to match
  avatarPokemonId, avatarIsShiny     // existing greeting Pokémon
  trainerSprite     // e.g. "cynthia" (§5.2)
  battleRecord: { wins, losses }     // resolver-owned; rules reject client edits
  updatedAt
```

**No unique handle.** Firestore has no unique constraint, so a handle would need
a transactional `handles/{handle}` lock doc — real complexity, and a painful
migration if added later. Instead: search by display name (duplicates are fine,
the avatar disambiguates) plus an **invite link carrying the uid** for the
unambiguous case. Adds no new identity namespace to maintain.

Rules: world-readable, owner-writable, anonymous accounts rejected, and
`battleRecord` frozen against client writes (only the admin-SDK resolver may move
it). Mirrored from `useAuthStore.syncPublicProfile()` on every profile change and
once per boot.

**Privacy note:** this makes display names publicly listable. They are already
public via the forum, and no email ever lands here — but it is a genuine new
exposure, which is why anonymous accounts are excluded rather than auto-listed.

### 4.2 Friendships

```
artifacts/{appId}/friendRequests/{requestId}   // from, to, status, createdAt
artifacts/{appId}/friendships/{pairId}         // pairId = sorted uids joined "_"
                                               // members: [uidA, uidB]
```
`pairId` being deterministic makes "are we friends?" a single `getDoc`, and rules
can check `request.auth.uid in resource.data.members` — no queries needed for the
permission check. Listing my friends = one `where('members','array-contains',uid)`
query (needs a composite index → `firestore.indexes.json`).

### 4.3 Battles

```
artifacts/{appId}/battles/{battleId}
  players: [uidA, uidB]              // array-contains for "my battles"
  challenger                         // who sent it
  playerNames, playerAvatars         // denormalized for the list
  status        // 'pending' | 'teamSelect' | 'active' | 'ended' | 'declined' | 'cancelled'
  format        // 'gen9customgame' | 'gen9ou' | …
  level         // 50
  ready: { uidA: bool, uidB: bool }  // team submitted
  engineVersion // pinned @pkmn/sim version — replay safety
  seed          // [n,n,n,n] — resolver-owned
  turn
  awaitingChoiceFrom: [uid, …]       // resolver-owned
  winner, endedAt
  createdAt, lastActivityAt          // sorts the battle list, like forum topics

  /teams/{uid}            OWNER-READ ONLY. { packed, teamName, sprites[], submittedAt }
  /choices/{turn}_{uid}   the only client write once a battle is active
  /log/{seq}              protocol lines (per side in Model 2)
  /chat/{msgId}           trainer talk — reuse the forum message shape
```

> **Correction to an earlier draft of this plan** (found while implementing phase 2):
> the teams **cannot** live as a `teams: { uidA, uidB }` map on the battle doc.
> Firestore rules grant read access per *document*, never per field — so a player who
> can read the battle doc can read their opponent's exact sets, which is precisely the
> leak Model 2 exists to prevent. Hence `battles/{id}/teams/{uid}` as a subcollection
> whose rule is `allow read: if isOwner(uid)`. The admin SDK bypasses rules, so the
> resolver still reads both.

Append-only log + fixed seed = **replays and spectating are free**, and the
renderer never needs the engine, just the log.

---

## 5. Sprites & performance

### 5.1 Battle sprites

Hotlink Showdown's `ani/` gifs via `<img>` (never `fetch` — no CORS header).
~80 KB per Pokémon per side; a full 6v6 where everything switches in is ~1 MB,
but only what actually appears is fetched, and their `max-age` is 8 days.

Add a PWA runtime-caching rule for `play.pokemonshowdown.com/sprites/`
(CacheFirst, ~300 entries, 30 days) — **and while there, fix a stale rule:**
`vite.config.js:27` still caches `raw.githubusercontent.com`, but
`pokemonSprites.js:3` has since moved to `cdn.jsdelivr.net`, so the sprite cache
rule currently matches nothing.

Self-hosting the gifs is *not* recommended: the full `ani/` set is tens of MB, it
would bloat the repo and the Pages deploy, and it's third-party art. Optional
middle ground later: a small `public/sprites/ani/` subset for the ~50 most-used
meta Pokémon, if hotlinking ever proves flaky.

Offer a **"static sprites" toggle** (`gen5/`, ~1 KB each) for slow connections.

### 5.2 Trainer sprites for users

`/sprites/trainers/*.png` are ~700 bytes each. Add a `trainerSprite` field to the
profile and a picker modal (same pattern as `GreetingPokemonSelectorModal`).
Needs a static list of valid trainer ids — build it once into
`public/data/trainer-sprites.json` (there's no directory listing endpoint;
`@pkmn/img` ships the name list, or scrape it once at build time). Low effort,
high perceived value, and independent of the battle work — **shippable first.**

---

## 6. Phased roadmap

Each phase is independently shippable and independently reviewable.

| # | Phase | Scope | Depends on |
|---|---|---|---|
| 0 ✅ | **Trainer sprites + public profiles** | `publicProfiles` collection + rules, `trainerSprite` picker, `trainer-sprites.json`. No battle code. | — |
| 1 ✅ | **Friend list** | Requests / accept / decline / remove, friend search by handle, friends view + sidebar entry, `useFriendsStore`, rules + index. | 0 |
| 2 ✅ | **Battle skeleton, no engine** | `battles` collection, challenge → accept flow, team selection from saved teams, battle list, battle chat. Turns are *not* resolved yet. | 1 |
| 3 ✅ | **Engine integration** | `api/battle-turn.js`: `jose` token verify (copy `send-admin-reply.js`) + `firebase-admin` + `@pkmn/sim` replaying `seed + choiceLog`, writing per-side filtered protocol streams. `src/utils/battle/` adapters (PTB team → packed team via §2.3, protocol → view model) with Vitest coverage + a deterministic full-battle fixture. Engine never ships to the client. | 2 |
| 4 ✅ | **Renderer** | `@pkmn/client` + `@pkmn/img`, animated sprites, HP bars, team bar with icon spritesheet, battle log, move/switch chooser. Themed per `docs/modules/styles_and_aesthetics.md`. | 3 |
| 5 | **Polish** | Replays, spectating, push/email "your turn" notification, W/L record, timeouts for abandoned battles, move animations. | 4 |

Realistic sizing: phases 0–2 are ordinary app work. Phase 3 is the risky one
(engine adapters, trust model, replay correctness). Phase 4 is the biggest UI
surface in the app so far — it should be a new view directory, not another
section of `AppLayout.jsx` (which is already 1530 loc and flagged in
`docs/wounds.md`).

---

## 7. Risks / things that will bite

1. **`AppLayout.jsx` is 1530 loc and owns every route and modal.** Battles must
   land as `src/components/views/battle/*` with their own sub-router, or this
   feature alone will add another 800 lines to a file the wounds log already
   calls out.
2. **`npm run lint` is broken** (missing `globals` dep — `docs/wounds.md`). Fix
   before starting, or the zero-warning gate silently protects nothing.
3. ~~**Firestore rules for battles are genuinely hard.**~~ **Largely defused by
   choosing Model 2.** With a server-authoritative resolver, players get
   `read`-only on the battle doc and the log, and the *only* client write is
   `choices/{turn}_{uid}` — where the rule is just "it's my uid, it's the current
   turn, and the doc doesn't exist yet". The admin SDK bypasses rules for
   everything else. Still write the rules before the UI, but this is now one
   simple rule instead of the hardest in the project.
4. **Anonymous users.** Auth starts anonymous and upgrades via email link.
   Friends/battles must require an upgraded account, or the friend list fills
   with ghosts.
5. **`CACHE_VERSION` bump** in `pokemonDataCache.js` if any cached file's shape
   changes (per `CLAUDE.md`).
6. **Cost.** Async battles mean many small writes and long-lived `onSnapshot`
   listeners. A 30-turn 2-player battle ≈ 100+ document writes. Still far inside
   Firestore's free tier at this scale, but the listener must be torn down on
   unmount (the forum store's `cleanup*Listener` pattern).
7. **Showdown hotlinking** is done by many third-party tools and their sprites
   send long cache headers, but it is still someone else's bandwidth and not a
   contract. The static-sprite fallback and the optional local subset are the
   insurance.

---

## 8. Deferred — revisit after phase 4

- Real formats (`gen9ou`, VGC) as a challenge-time dropdown, with the sim's own
  team validator rejecting illegal teams. Cheap to add once §2.3's adapter exists.
- Doubles / VGC rendering (2 actives per side, spread targeting).
- Per-Pokémon level as a `customization.level` field (touches the saved-team shape
  and the Showdown export — not worth it while everything is level 50).
- A local `public/sprites/ani/` subset for the top meta Pokémon, if hotlinking
  proves flaky.
- Move animations (§5 of the request) — pure polish, after the log renders.

---

## 9. Phase 0–1 — concrete task list (what ships first)

Two independently reviewable slices. No battle code, no `@pkmn/sim`, no
serverless work. Everything here is ordinary app work in patterns the project
already uses.

### Phase 0 — public profiles + trainer sprites

Status: **code complete on branch `feat/friends-phase-0`, not deployed.**

1. ✅ `scripts/build-trainer-sprites.mjs` → `public/data/trainer-sprites.json`
   (292 trainers, 30 KB). Parses Showdown's own `BattleAvatarNumbers` roster —
   the only reliable enumeration, since `/sprites/trainers/` has no directory
   index. Wired into `prebuild`, build-safe (`process.exitCode = 0`). All 292
   URLs were checked once at authoring time: 292/292 returned 200.
2. ✅ `publicProfiles/{uid}` + rules per §4.1.
3. ✅ `useAuthStore.syncPublicProfile()`, plus `trainerSprite` state, hydration,
   `setTrainerSprite`, and a `trainerDisplayName()` fallback helper.
4. ✅ `TrainerSpriteSelectorModal` + `src/styles/trainer-selector-modal.css` +
   `useTrainerSprites` hook; picker entry and preview card in `ProfileView`,
   wired through `AppLayout`. Retro gen variants hidden behind a toggle (64 of
   the 292 are near-duplicate old art).
5. ✅ Trainer sprite shown everywhere the greeting Pokémon appears: sidebar/topbar,
   forum author rows, home feed timeline, `UserProfileModal`, profile hero.
   Extracted `src/components/AvatarSprite.jsx` — the three call sites were each
   hand-rolling the same markup with a **hardcoded jsDelivr URL**, which
   `CLAUDE.md` rule 6 says must come from `pokemonSprites.js`. Their containers
   and all 12 existing CSS rules were left untouched; only the inner image
   changed, plus one `img.avatar-sprite--trainer` modifier per view (trainer
   sprites are square, so they must not get the Pokémon crop-and-offset).
6. ✅ Translations (en + pt).
7. ✅ **The user picks which avatar is the main one** (`avatarPreference`), rather
   than the trainer sprite always winning. The choice lives in the private
   profile; everything that denormalizes an avatar (forum messages, the public
   directory) stores the **resolved** value, so no reader has to know the
   preference and the rules needed no new field. Resolution is one pure function,
   `src/utils/avatar.js` `resolveAvatar()`, with 8 Vitest cases — it lives in
   `utils/` rather than the store precisely so it's testable without Firebase.

**Verified:** `vite build` clean, `npm test` 78/78, new files add zero lint
problems, the built service worker ships both sprite cache rules, dev server
transforms the new modal with no errors.
**Not verified:** the security rules (no emulator available — no `firebase-tools`,
no Java on this machine) and the visual result in a real browser.

### Phase 1 — friend list

Status: **code complete on branch `feat/friends-phase-0`, not deployed.**

1. ✅ `friendRequests` + `friendships` collections per §4.2 + rules. **No
   composite index needed** — every query is single-field (`members`
   array-contains, `to`, `from`, `displayNameLower` prefix), with sorting and
   status filtering done client-side. `firestore.indexes.json` stays empty.
2. ✅ `src/store/useFriendsStore.js` — three `onSnapshot` listeners, **reference
   counted** so the app shell (sidebar badge) and `FriendsView` can both hold
   them without the first unmount tearing them out from under the other. Session
   cache for public profiles, batched 30-at-a-time via `documentId() in`.
   `src/hooks/useFriends.js` binds the lifecycle to the account.
3. ✅ Prefix search over `displayNameLower`, plus an
   `#/friends?tab=find&add=<uid>` invite link with a copy button.
4. ✅ `FriendsView.jsx` (3 tabs: friends / requests / find) + `/friends` route +
   sidebar entry. Badge support added to `ShellNavButton` — a count when
   expanded, a dot on the icon when the rail is collapsed.
5. ✅ Send / accept / decline / cancel / remove, all surfacing failures through
   `useToastStore`.
6. ✅ `FriendActionButton` (add / pending / accept / friends), injected into
   `UserProfileModal` from both the forum and the home feed. The modal now also
   renders the trainer sprite.

**The one non-obvious constraint:** the rules only allow creating a friendship
while a **pending** request exists, so `acceptRequest` must write the friendship
*before* clearing the request. It uses a `writeBatch` — rules evaluate each write
against the pre-batch state, so both pass, and atomicity means you can never end
up with a friendship plus a stale request. It also deletes the mirror request, so
two trainers who requested each other simultaneously don't leave one dangling
forever. Getting this order wrong deadlocks the accept flow.

**Also deliberate:** a declined request is kept as a `declined` doc rather than
deleted. The doc id is deterministic (`{from}_{to}`), so keeping it stops the same
trainer from instantly re-asking; either party can delete it to unblock. The
trade-off is that `sendRequest` can fail on a leftover doc, which is why its
error toast says "you may already have one pending" instead of something generic.

**Verified:** `vite build` clean (FriendsView is its own 6.8 KB chunk), `npm test`
86/86, lint unchanged at 57 errors / **19** warnings (down from 21 — two
`exhaustive-deps` fixed in passing), every new module transforms in the dev server.
**Not verified:** the security rules and the visual result in a browser.

### Phase 2 — battle skeleton (no engine)

Status: **code complete on `main` (uncommitted), not deployed.**

1. ✅ `battles` collection + subcollections (`teams`, `chat`, `log`, `choices`) + rules.
   Clients own only the pre-battle lifecycle; seed / turn / log / winner have **no
   client-writable path at all**, so the phase-3 resolver is the only thing that can
   decide an outcome.
2. ✅ Challenge → accept / decline / withdraw, launched from a **Battle** button on
   each friend row (`FriendsView`).
3. ✅ Team selection from saved teams, stored per player as battle-safe Showdown text.
4. ✅ `/battles` list + `/battles/:battleId` detail, under
   `src/components/views/battle/` with their own chunks (2.5 KB + 6.6 KB gz).
   Sidebar badge counts battles waiting on this trainer.
5. ✅ Per-battle trainer chat.
6. ✅ Turn resolution is **not** implemented — an `active` battle says so plainly
   rather than pretending. That's phase 3.

**Two schema corrections found by implementing it** (both already applied above):

- **Teams can't be a map on the battle doc.** Rules grant read per *document*, so a
  player who can read the battle could read the opponent's exact sets — the very leak
  Model 2 exists to close. They live in `battles/{id}/teams/{uid}` with
  `allow read: if isOwner(uid)`.
- **The app's Showdown export isn't battle-safe.** Verified against
  `@pkmn/sim`'s `Teams.import()`: an item-less Pokémon exports as `Name @ Nothing`,
  which parses into an item literally called "Nothing" that doesn't exist in the dex;
  and a moveless Pokémon parses to `moves: []` (it could only Struggle). Both are
  handled by `buildBattleTeamText()` in `src/utils/battle.js` — it strips the
  placeholder and refuses to submit a moveless team, with a toast naming the offender.

**Derived state is pure and tested.** `describeBattle(battle, userId)` in
`src/utils/battle.js` decides what the viewer may do (accept / decline / withdraw /
submit / start / delete). It deliberately mirrors the transitions `firestore.rules`
allows, so the UI can never offer a button the server would reject — 18 Vitest cases
cover it, including "never offer a pre-battle action once the battle is active".

**Verified:** `vite build` clean, `npm test` 104/104, lint unchanged (57/19), every new
module transforms in the dev server.
**Not verified:** the rules (no emulator) and the visual result in a browser.

### Phase 3 — the authoritative engine

Status: **code complete on `main` (uncommitted). Never run against real Firestore —
that needs the service account (§ handoff).**

1. ✅ `api/lib/battleResolver.js` — stateless replay from `seed + choices`, returning each
   side's filtered protocol view. 20 Vitest cases.
2. ✅ `api/lib/serverAuth.js` — `jose`/JWKS token verification, admin-SDK Firestore, CORS.
3. ✅ `api/battle-turn.js` — records a choice write-once, resolves only when both players
   have answered the round, writes per-player logs, advances the round, and on a win
   increments both `battleRecord`s.
4. ✅ `src/utils/battleProtocol.js` — reads my prompt (moves / switches / team preview)
   and renders a readable transcript. 13 tests.
5. ✅ Client: live listener on my own log, `submitChoice`, and a playable turn UI (move
   and switch buttons, transcript).
6. ✅ `@pkmn/sim` pinned to an exact version (`0.10.11`, no caret) and stamped on the
   battle doc as `engineVersion` — a minor bump could change turn outcomes and break the
   replay of an in-flight battle.

**The engine never reaches the browser.** It lives in `api/`, which Vite doesn't compile;
verified by grepping the built bundle for `BattleStream` / `@pkmn/sim` (no hits). The
client's battle chunk is 3.5 KB gzipped.

**A schema flaw caught while building it:** the first version wrote one log document per
round containing `p1`, `p2` and `omniscient`. Both players can read that document, and
Firestore grants read access **per document, never per field** — so each would have read
the other's filtered stream, undoing the entire reason turn resolution is server-side.
It is now `battles/{id}/playerLogs/{uid}/rounds/{n}`, owner-read-only. Same trap as the
`teams` map, second time: when in doubt, one document per reader.

**A bug the tests caught:** `readBattleState` matched ties with `startsWith('|tie')`, and
every battle opens with `|tier|[Gen 9] Custom Game` — so every battle was flagged finished
before turn 1. Matching is exact now, with a regression test.

**Verified without the service account** by driving the resolver directly: team preview
(`default`) → moves → termination with a winner that maps back to a uid; byte-identical
output for the same seed and divergent for another; and no cross-side set leaking (p1 on
Choice Specs, p2 on Light Ball — neither stream contains the other's item).

### Phase 4 — the battlefield renderer

Status: **code complete on `main` (uncommitted).**

1. ✅ `src/utils/battleState.js` — protocol → battlefield snapshot (actives, HP,
   status, faints, roster, turn, weather, outcome), from the viewer's own filtered
   stream. Pure, 16 Vitest cases.
2. ✅ `src/utils/battleSprites.js` — animated sprites via `@pkmn/img`.
3. ✅ `src/components/views/battle/Battlefield.jsx` — opponent above, viewer below,
   animated gifs (back sprite for your own side), HP bars that shift green → amber →
   red, status badges, and a team strip per side.
4. ✅ Two-column layout: battlefield + choices on the left, chat sticky on the right.
5. ✅ Chat auto-scrolls to the newest message (`block: 'nearest'`, so the page itself
   doesn't jump and yank the battle out of view).
6. ✅ "Animated sprites" toggle, remembered in localStorage — each gif is ~80 KB.

**Why not `@pkmn/client`.** It is the right library in the abstract, but making it work
means `@pkmn/dex` too: **805 KB gzipped**, versus 42 KB for `@pkmn/img` alone. A
battlefield only needs to know who is out, at what HP, with what status — and the
protocol states every one of those outright (`|switch|p1a: Charizard|Charizard, L50,
M|153/153` carries species, level, gender and HP in one line). So the state is read
directly instead. Deliberately *not* modelled: stat boosts, hazards, screens, volatiles.
Adding them means extending `battleState.js` or accepting the 805 KB — that's the trade,
recorded so nobody has to rediscover it.

**Why `@pkmn/img` and not a hand-rolled URL.** Showdown's sprite file names are not a
mechanical slug: `Ho-Oh` → `hooh` (hyphen dropped), `Urshifu-Rapid-Strike` →
`urshifu-rapidstrike` (form hyphens collapsed), while `Landorus-Therian` keeps its hyphen.
Two broken images in a four-name spot check, across 1000+ species and forms.

**A perf trap caught by measuring the build.** `vite.config.js`'s `manualChunks` routed
every `node_modules` import into `vendor`, which is loaded at boot — so `@pkmn/img` pushed
`vendor` from 34 KB to 74 KB gz for *every visitor*, battler or not. `@pkmn/*` now gets its
own chunk, verified absent from `index.html`'s preloads and from the entry's static
imports: 41 KB paid only on opening a battle.

### Pre-flight — done

- ✅ `npm i -D globals` — `npm run lint` actually runs now. It immediately
  surfaced **83 pre-existing problems** (now 57 errors + 21 warnings across 23
  files: 46 `no-unused-vars`, 15 `exhaustive-deps`, 11 `no-empty`, 6
  `react-refresh`). The `--max-warnings 0` gate therefore still fails on `main` —
  paying that down is its own task. Also merged `globals.es2021` into the eslint
  config: `globals.browser` omits `Intl`, which was producing false `no-undef`.
- ✅ **A real bug the broken gate was hiding:** `POKEBALL_PLACEHOLDER_URL` was
  used in three `onError` handlers in `PokemonUsageView.jsx` but never imported —
  a failed sprite threw `ReferenceError` instead of falling back to the pokéball.
- ✅ **`npm test` was already red on `main`:** `damageCalc.test.js` asserts that
  Aura Break reverses Dark/Fairy Aura, but `aura-break` appeared nowhere in
  `damageCalc.js`. Implemented (the 4/3 boost becomes a 3/4 drop when either side
  has it, since it's a field effect). 78/78 green now.
- ✅ PWA sprite cache was dead: `vite.config.js` matched only
  `raw.githubusercontent.com` while `pokemonSprites.js` had moved to jsDelivr.
  Both hosts now match, plus a new `play.pokemonshowdown.com/sprites/` rule for
  the trainer (and later battle) sprites.
- ✅ `firestore.rules` confirmed deployed by Enzo (2026-07-24); `docs/wounds.md`
  corrected — it still claimed deployment was pending.

### Still needs Enzo

- **Deploy the updated rules** before this reaches production. `publicProfiles`
  is a new world-readable path whose rules currently exist only locally.
- Decide whether to pay down the 78 pre-existing lint problems, or accept
  `npm run lint` staying red for now.
