# Handoff — Friends & async battles

**Date:** 2026-07-24 · **Branch:** `main` · **Commit:** `b3d9653` (pushed)
**Scope delivered:** Phases 0 + 1 + 2 + 3 + 4 of [friends-and-async-battles.md](./friends-and-async-battles.md) — public
profiles, trainer sprites, avatar choice, the full friend list, the battle skeleton, the
authoritative turn resolver, and the battlefield renderer with animated sprites.
**Everything but phase 5 (replays, notifications) is built.**

> **[How it works](./ARCHITECTURE-friends-and-battles.md)** — the system explained: data
> flow, the turn loop, the security model, and the invariants that must not break.
> **[The plan](./friends-and-async-battles.md)** — the decisions and the measured research
> behind them, phase by phase.
> This file is the "where things stand / what to do next" summary.

---

## 1. Status at a glance

| | |
|---|---|
| **Phase 0** — public profiles + trainer sprites | ✅ code complete |
| **Phase 1** — friend list | ✅ code complete |
| **Phase 2** — battle skeleton (no engine) | ✅ code complete |
| **Phase 3** — engine (`@pkmn/sim` in a Vercel function) | ✅ live; two bootstrap bugs fixed after first real battle |
| **Phase 4** — battlefield renderer | ✅ code complete |
| **Phase 5** — polish (replays, notifications, W/L) | 🟡 started — "your turn" email done (§7); replays/spectating/timeout/W/L UI **next** |
| `npm test` | ✅ 164/164 (78 pre-existing + 86 new) |
| `vite build` | ✅ clean |
| `npm run lint` | ⚠️ 57 errors / 19 warnings — **all pre-existing**, see §5 |
| **Firestore rules deployed** | ✅ deployed through phase 3 |
| Verified in a browser | ⚠️ challenge + chat confirmed live; **the turn loop and renderer have never been driven** |

---

## 2. Locked decisions

Made with Enzo on 2026-07-24. Re-litigating these without a reason wastes work.

| Question | Decision | Why it matters |
|---|---|---|
| Battle engine | **Embed `@pkmn/sim`** (the real Showdown simulator, MIT) | Writing our own was measured at 2–3 months and would never reach parity. `damageCalc.js` covers ~25% of a turn |
| Where turns resolve | **Authoritative Vercel serverless function** | No cheating, no set-sniffing, and the client loads 82 KB instead of 1 MB. Costs a service-account secret; **battles won't work on the GitHub Pages deploy** |
| Format | **`gen9customgame`, singles** | Any saved team is playable, no bans |
| Level | **Fixed 50** | Matches `damageCalc.js`'s default; no new field on team members |
| Identity | **No unique handle.** Search by display name + invite link carrying the uid | Firestore has no unique constraint; a handle would need a transactional lock doc and a painful migration later |
| Avatar | **User picks** pokemon vs trainer sprite; the *resolved* avatar is what gets denormalized | Readers never need to know the preference, and the rules needed no extra field |

---

## 3. What shipped

### 3.1 New files

| File | Role |
|---|---|
| [`scripts/build-trainer-sprites.mjs`](../../scripts/build-trainer-sprites.mjs) | Builds the trainer roster from Showdown's `BattleAvatarNumbers`. Wired into `prebuild`, build-safe |
| [`public/data/trainer-sprites.json`](../../public/data/trainer-sprites.json) | 292 trainers, 30 KB (generated — don't hand-edit) |
| [`src/hooks/useTrainerSprites.js`](../../src/hooks/useTrainerSprites.js) | Loads the roster; exports `trainerSpriteUrl(id)` |
| [`src/utils/avatar.js`](../../src/utils/avatar.js) + `.test.js` | `resolveAvatar()` — pure, 8 tests |
| [`src/components/AvatarSprite.jsx`](../../src/components/AvatarSprite.jsx) | The image inside an avatar frame (pokemon or trainer) |
| [`src/components/FriendActionButton.jsx`](../../src/components/FriendActionButton.jsx) | add / pending / accept / friends, for any trainer |
| [`src/components/modals/TrainerSpriteSelectorModal.jsx`](../../src/components/modals/TrainerSpriteSelectorModal.jsx) | Trainer picker (retro variants behind a toggle) |
| [`src/store/useFriendsStore.js`](../../src/store/useFriendsStore.js) | Friendships + requests + directory search |
| [`src/hooks/useFriends.js`](../../src/hooks/useFriends.js) | Binds those listeners to the account lifetime |
| [`src/components/views/FriendsView.jsx`](../../src/components/views/FriendsView.jsx) | `/friends` — 3 tabs: friends / requests / find |
| [`src/utils/battle.js`](../../src/utils/battle.js) + `.test.js` | Format constants, `describeBattle()`, `buildBattleTeamText()` — 18 tests |
| [`src/store/useBattlesStore.js`](../../src/store/useBattlesStore.js) | Battle lifecycle, team submission, battle chat |
| [`src/hooks/useBattles.js`](../../src/hooks/useBattles.js) | Battles described + ordered from the viewer's perspective |
| [`src/components/views/battle/`](../../src/components/views/battle/) | `BattleListView` + `BattleDetailView` |
| [`api/lib/battleResolver.js`](../../api/lib/battleResolver.js) + `.test.js` | The engine: stateless replay from seed + choices — 20 tests |
| [`api/lib/serverAuth.js`](../../api/lib/serverAuth.js) | Token verify + admin Firestore + admin Auth + CORS |
| [`api/battle-turn.js`](../../api/battle-turn.js) | The authoritative endpoint |
| [`api/lib/battleNotify.js`](../../api/lib/battleNotify.js) + `.test.js` | "Your turn" email: who to notify (pure), what it says (pure, en/pt) — 8 tests |
| [`api/lib/mailer.js`](../../api/lib/mailer.js) | Best-effort SMTP send, reusing the admin-reply endpoint's env vars |
| [`src/utils/battleProtocol.js`](../../src/utils/battleProtocol.js) + `.test.js` | Reads my prompt + renders the transcript — 13 tests |
| [`src/utils/battleState.js`](../../src/utils/battleState.js) + `.test.js` | Protocol → battlefield snapshot — 16 tests |
| [`src/utils/battleSprites.js`](../../src/utils/battleSprites.js) | Animated sprites via `@pkmn/img` |
| [`src/components/views/battle/Battlefield.jsx`](../../src/components/views/battle/Battlefield.jsx) | Actives, HP bars, status, team strips |
| `src/styles/{trainer-selector-modal,friends-view,battle-view}.css` | Their styles |

### 3.2 Firestore schema added

All under `artifacts/{appId}/`:

```
publicProfiles/{uid}
  displayName, displayNameLower      // lower mirror backs prefix search
  avatarPokemonId, avatarIsShiny, trainerSprite   // RESOLVED avatar
  battleRecord: { wins, losses }     // resolver-owned; rules reject client edits
  updatedAt

friendRequests/{fromUid}_{toUid}     // deterministic id ⇒ no duplicates
  from, to, status, createdAt, respondedAt

friendships/{sortedUidA}_{sortedUidB}
  members: [uidA, uidB]              // canonically sorted; rules enforce it
  createdAt

battles/{battleId}
  players, challenger, playerNames, playerAvatars
  status        // pending | teamSelect | active | ended | declined | cancelled
  format, level, ready: { uid: bool }
  seed, engineVersion, turn, awaitingChoiceFrom, winner   // RESOLVER-ONLY
  createdAt, lastActivityAt
  /teams/{uid}    OWNER-READ ONLY — { showdownText, teamName, sprites[] }
  /chat/{msgId}   both players
  /log/{seq}      resolver writes, players read
  /choices/{turn}_{uid}   write-once by its owner
```

**No composite indexes needed.** Every query is single-field (`members` array-contains,
`to`, `from`, `displayNameLower` prefix), with sorting and status filtering done
client-side. `firestore.indexes.json` stays empty — nothing to deploy there.

### 3.3 Bugs fixed along the way

Unblocking the lint gate (`npm i -D globals`) exposed real problems:

1. **`POKEBALL_PLACEHOLDER_URL` was used but never imported** in
   [`PokemonUsageView.jsx`](../../src/components/views/PokemonUsageView.jsx) (3 `onError`
   handlers) — a failed sprite threw `ReferenceError` instead of falling back.
2. **`npm test` was already red on `main`:** `damageCalc.test.js` asserted that Aura Break
   reverses Dark/Fairy Aura, but `aura-break` appeared nowhere in
   [`damageCalc.js`](../../src/utils/damageCalc.js). Implemented (4/3 boost → 3/4 drop).
3. **The PWA sprite cache was dead:** `vite.config.js` matched only
   `raw.githubusercontent.com` while `pokemonSprites.js` had moved to jsDelivr. Both hosts
   now match, plus a new `play.pokemonshowdown.com/sprites/` rule.
4. **eslint config gap:** `globals.browser` omits `Intl`, producing false `no-undef`.

---

## 4. ⛔ Blocked on Enzo

Rules are deployed and a battle exists on production, so what's left is the secret and a
real playthrough.

1. **Set three env vars in Vercel** (Settings → Environment Variables). Firebase Console
   → Project settings → Service accounts → *Generate new private key* yields a JSON with
   these fields:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`  ← the whole PEM; `\n` escapes are handled
   **Never commit it, never paste it into a chat** — it is a full-admin credential for the
   project. Without these the endpoint answers `503` with a plain message rather than
   failing obscurely.
2. **Play one battle through, against a second account.** Nothing has driven a full turn
   loop through the UI. The engine is covered by tests; the Firestore I/O, the HTTP layer
   and the renderer are not. See §7 for exactly what to watch.
3. **Battles are Vercel-only.** The GitHub Pages deploy has no `/api/*`, so `submitChoice`
   fails there — the same limitation the admin email reply already has.

## 5. Known gaps & accepted debt

- **Rules are untested.** No `firebase-tools` and no Java on the dev machine, so the
  emulator couldn't run. They were written carefully (notably: optional fields read via
  `.get(key, default)`, because reading an absent key off `request.resource.data` raises an
  error and denies the write) but **nothing verified them**. Worth adding
  `@firebase/rules-unit-testing` before the battle rules land, which will be harder.
- **`npm run lint` still fails** on 57 pre-existing errors / 19 warnings across 23 files
  (46 `no-unused-vars`, 15 `exhaustive-deps`, 11 `no-empty`, 6 `react-refresh`). This work
  added **zero** — the session-start baseline was 62/21. Cleaning it is its own task.
- **Store toasts are hardcoded English**, contradicting `CLAUDE.md`'s i18n rule — but
  matching every existing store (`useForumStore`, `useActiveTeamStore`). Fix all stores at
  once or not at all.
- **Historical forum messages** predate `creatorTrainerSprite`, so they keep showing the
  author's Pokémon. Intentional: no migration, graceful degradation.
- **A declined request blocks re-asking** until someone deletes the doc (see §6).
- **`buildShowdownExportText` emits invalid Showdown for an item-less Pokémon.** It
  writes `Name @ Nothing`; `Teams.import()` keeps that as an item literally called
  "Nothing" which doesn't exist in the dex. This is *also* wrong for the user-facing
  "copy team" feature — anyone pasting into real Showdown gets a bogus item. Battles
  work around it in `buildBattleTeamText()`, and the util was left alone because its
  output is pinned by `showdownExport.test.js:69` (`expect(text).toContain('Pikachu @
  Nothing')`) and shipped to users. **Recommended separate fix:** omit the `@ …` part
  when there's no item, and update that assertion.
- **`AppLayout.jsx` is ~1560 loc.** Battles must land as `src/components/views/battle/*`
  with their own sub-router, or this feature alone adds another 800 lines to a file the
  wounds log already flags.

---

## 6. Traps — read before touching this code

### Accepting a friend request is order-sensitive

The rules only allow creating a friendship **while a `pending` request exists**. So
`acceptRequest` writes the friendship *first*, then clears the request — in a single
`writeBatch`. Rules evaluate each write in a batch against the **pre-batch** state, so both
pass; atomicity means you can never end up with a friendship plus a stale request.

**Inverting that order deadlocks the whole accept flow.** The batch also deletes the mirror
request, so two trainers who requested each other simultaneously don't leave one dangling
forever.

### A declined request is kept, not deleted

The doc id is deterministic (`{from}_{to}`), so keeping a `declined` doc stops the same
trainer from instantly re-asking. Either party can delete it to unblock. Consequence:
`sendRequest` can fail on a leftover doc — which is why its error toast says *"you may
already have one pending"* rather than something generic.

### Listeners are reference-counted

The app shell (sidebar badge) and `FriendsView` both hold the same three listeners. Without
ref-counting, the first unmount tore them out from under the other. `initListeners`
increments and binds once per account; `cleanupListeners` decrements and only detaches at
zero.

### Trainer sprites are square; Pokémon sprites are not

Trainer sprites are 80×80 with no padding. Pokémon front sprites are 96×96 with heavy
transparent padding — which is why every avatar container crops them wider than the frame
and nudges them down. That's why `AvatarSprite` tags the trainer variant with
`avatar-sprite--trainer` and each container neutralises its own framing. Don't "simplify"
one without the other.

### The transcript must be stored per player, never as one document

The resolver's first version wrote one log doc per round holding `p1`, `p2` and
`omniscient` fields. Both players can read that document — and **Firestore grants read
access per document, never per field** — so each would have read the other's filtered
stream, undoing the entire reason turn resolution is server-side. It is now
`battles/{id}/playerLogs/{uid}/rounds/{n}`, owner-read-only, exactly like `/teams`.

The omniscient stream is deliberately **not stored at all**: nobody may read it while a
battle is live, and a public replay can be regenerated from the seed and choices whenever
it's wanted.

This is the same trap that bit the `teams` map (§ schema) — when in doubt, one document
per reader.

### A turn-based battle needs its opening position published

The first real battle stalled on *"no action needed right now"*: at round 0 neither
player had chosen, so the endpoint returned early without writing any log — and with no
log there's no `|request|`, so no move buttons, so nobody can choose, so the battle can
never start. A pure request/response resolver deadlocks on its own first turn.

`battle-turn.js` now detects `logSeq === 0` and publishes the opening replay with
`advanceTurn: false`, handing both players their team-preview prompt without resolving
anything.

### The log is stored as deltas, not as full snapshots

`replayBattle` always returns the transcript from turn zero — that's what stateless
replay means. The first version wrote that whole thing every round, so each document
repeated all its predecessors; the client concatenates rounds in order, so the transcript
would show every earlier line again and read cost would grow quadratically.

`logLines: {p1, p2}` on the battle doc now tracks how many lines each side already has,
and only the slice past that offset is written. This depends on a longer replay extending
a shorter one line-for-line — asserted directly in `battleResolver.test.js` ("replay logs
extend, they do not rewrite"), including that concatenating the deltas reproduces the full
log. Don't change the write path without keeping those tests green.

### `|tie` is a prefix of `|tier|`

`readBattleState` matched ties with `line.startsWith('|tie')`. Every battle opens with
`|tier|[Gen 9] Custom Game`, so **every battle was marked finished before turn 1** — the
symptom was `awaiting: {p1:false, p2:false}` at team preview. Matching is now exact.
There's a regression test; don't loosen it.

### `manualChunks` puts every dependency in the eager boot bundle

`vite.config.js` routes anything from `node_modules` into `vendor`, and `vendor` loads at
boot. Adding `@pkmn/img` for the battlefield silently pushed `vendor` from 34 KB to 74 KB
gz — **for every visitor**, including the ones who never open a battle. It now has its own
`pkmn` chunk, and the check that matters is that `dist/index.html` does not preload it and
the entry chunk does not statically import it (only Vite's lazy-preload manifest mentions
it). Any future battle-only dependency needs the same treatment.

### A working `@pkmn/client` costs 805 KB, not 82 KB

An earlier note in the plan promised 82 KB for the client renderer stack. That was measured
by importing the modules without a usable dex — `@pkmn/client` can't track battle state
without species data, so `@pkmn/dex` comes too, and the real figure is **805 KB gzipped**.
Phase 4 uses `@pkmn/img` (42 KB) and reads the battlefield out of the protocol instead.
If someone later wants boosts, hazards or screens rendered, the choice is to extend
`src/utils/battleState.js` or to accept that 805 KB — don't assume it's cheap.

### Showdown sprites are `<img>`-only

`play.pokemonshowdown.com/sprites/` sends **no** `access-control-allow-origin`. They work in
an `<img src>` and are service-worker cached, but `fetch()` or drawing them to a canvas will
fail. Only `/data/*.json` sends `*`.

### The "your turn" email must never target the caller

`api/lib/battleNotify.js`'s `pickAwaitingTarget` is the *entire* anti-spam mechanism: it
picks whichever uid in a fresh `awaitingUids` is not the one who just POSTed this request.
Drop that check and a live back-and-forth (both players actually in the app) would email
both sides after every single turn — the caller doesn't need telling they can now act, they
just made the request that made it so. There's no separate rate limit or "already notified
this round" flag; the exclusion *is* the throttle.

---

## 7. Next steps

### Immediate — verify the turn loop, then Phase 5

Phase 4 is built but **nothing has driven a full battle through the UI yet**. Deploy and:

1. Open the existing battle. It has no `logSeq`, so the bootstrap fires on first visit and
   team preview should appear.
2. Confirm order → moves → a winner, watching that the transcript doesn't repeat lines
   (the delta fix) and that both HP bars track.
3. Watch the sprites load. If a species shows nothing, `@pkmn/img` resolved a name
   Showdown doesn't have a gif for — the `onError` hides it rather than showing a broken
   image, so check the network tab.

### Then — Phase 5: polish

- ✅ **Done — "your turn" email.** `api/lib/battleNotify.js` + `api/lib/mailer.js`, wired
  into `api/battle-turn.js`. Fires on the opening bootstrap and on every later resolution,
  emailing whichever side of the fresh `awaitingUids` isn't the caller (never both — the
  caller is in the app right now by construction). Language comes from the recipient's own
  `users/{uid}/profile/preferences.language`; the address from Admin Auth, not Firestore
  (`publicProfiles` never stores one). Reuses `send-admin-reply.js`'s env vars — **no new
  secret needed** if admin replies already work. Pure logic (`pickAwaitingTarget`,
  `buildTurnEmail`) is unit-tested; the actual send is not (never run against a real inbox —
  needs a live two-account battle, see §11 of the architecture doc).
- ⬜ Public replays (regenerate from seed + choices), spectating, timeouts for abandoned
  battles, and the W/L record surfaced on profiles (the resolver already increments it).

### Done — Phase 3: the authoritative engine

`api/lib/battleResolver.js` replays a battle statelessly from `seed + choices` and returns
each side's filtered protocol view. `api/battle-turn.js` verifies the caller, records their
choice write-once, and resolves only once both players have answered the round — then writes
per-player logs, advances the round, and on a win increments both `battleRecord`s.

Verified without the service account, by driving the resolver directly: team preview
(`default`) → moves → a battle that terminates with a winner mapping back to a uid;
determinism (byte-identical for the same seed, divergent for a different one); and the
property the whole design exists for — with p1 on Choice Specs and p2 on Light Ball,
neither side's stream ever contains the other's item.

### Done — Phase 2: battle skeleton

Challenge → accept / decline / withdraw, team selection, the `/battles` list and detail
views, and per-battle chat. See the plan for detail.

## 8. Reference numbers (measured, don't re-investigate)

| Thing | Value |
|---|---|
| `@pkmn/sim` browser bundle | **1018 KB gzipped** (server-side only in Model 2) |
| `@pkmn/img` alone (what phase 4 actually uses) | **42 KB gzipped**, lazy |
| `@pkmn/client` + `@pkmn/dex` (a *working* client renderer) | **805 KB gzipped** — rejected, see §6 |
| Showdown sim determinism | Same `seed` + same choices ⇒ **byte-identical** protocol output (sha1-verified) |
| Gen-9 formats available out of the box | 54, incl. `gen9ou`, `gen9vgc2024regg`, `gen9customgame` |
| Distilled battle move data | 98 KB raw / **14 KB gzipped** (697 moves) — if ever needed |
| Animated battle sprite (`ani/`) | ~80 KB each, `cache-control: max-age=691200` (8 days) |
| Trainer sprite | 80×80, ~700 bytes, 292 available |
| `pokemon-index.json` | Already carries `baseStats` for all 1213 entries |

---

## 9. Commands

```bash
npm run dev              # localhost:5173/pokemonTeamBuilder/
npm test                 # 164/164 expected
npx vite build           # must stay clean
npm run lint             # fails on pre-existing debt — compare counts, don't expect 0
npm run data:trainers    # regenerate the trainer roster
```
