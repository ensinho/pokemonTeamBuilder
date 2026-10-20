# Friend battles (PvP on the challenge's console)

> The system as built on 2026-10-20. The original design and its research are in
> [the architecture doc](../plans/ARCHITECTURE-friends-and-battles.md) and
> [the plan](../plans/friends-and-async-battles.md); the friend list, public
> profiles and public invites there are unchanged. This file is what changed:
> the flow, the server's state, the screen, the cache.

## The flow — fewest steps

```
challenger: Desafiar (ChallengeModal: friend · mode · team, last one chosen) ──▶ pending
            └─ the team document goes with the challenge (teams/{uid}, after the battle doc)
challenged: open it ──▶ lobby (team picker, last one chosen) ──LUTAR!──▶ begin ──▶ active
            └─ one request: writes my team, then POST {action: 'begin'} flips it live
               under PVP_FORMAT and publishes the opening; my lines come back in it
both:       VS card (DsVersus, their avatars) ──▶ the battle ──▶ result (REVANCHE · REVER)
```

- Before: challenge → accept → pick a team (select) → lock → wait for theirs → start → team preview → first move. Now: **challenge (one sheet) → LUTAR! → first move.**
- **Random mode** is unchanged underneath: accept → `/api/battle-random` deals both teams and flips it to active; the first probe publishes the opening.
- **Fallback, `teamSelect`:** a challenge sent without a team (an older client, or the team write failed) — `begin` puts the battle in `teamSelect` and tells the challenger; their LUTAR! (`submitTeam` → `begin`) starts it. Public invites go through it too (nobody sends a team with a forum invite).
- **Forfeit:** DESISTIR → `confirmAction` → `{action: 'forfeit'}`: `status: 'ended'`, the other trainer's win, `forfeitedBy`, both records.

## The server (`api/battle-turn.js`, `api/_lib/pvpState.js`)

`POST /api/battle-turn` `{battleId, choice?, action?}` — `choose` (default; no choice = refresh), `begin`, `forfeit`.

- **`battles/{id}/secret/state`** — seed, format, both teams, the replay `history` and the `pending` round. No rule matches `secret/*`, so no client reads or writes it (the pending move used to be readable by the opponent in `choices/`: wounds 2026-10-20). Created on first contact; a battle from before it is **migrated** from `teams/` + `choices/`.
- **A choice is one transaction** over the battle and the state: record it (once per side per round, only for a side the sim asked — `sidesOwingChoice`), decide whether the round is complete, and **claim** it (`claimedAt`) if this request completed it. Only the claimant replays and publishes; a claim older than 20 s (a dead function) can be taken over. Reads per choice: **2** (it was 4 + every choice ever made).
- **Publish is a transaction guarded by `logSeq`**: per-player deltas (`playerLogs/{uid}/rounds/{seq}`), the battle's new position, and `history` + a fresh `pending` in the state. The caller gets its own delta back: `deltas: [{seq, lines}]`.
- **Bootstrap** (no `logSeq` yet): replay the opening; if both sides are asked for Team Preview (an older battle's format), answer `default` for both in the same publish.
- **Format:** `begin` sets `PVP_FORMAT` (`gen9anythinggoes@@@!Team Preview,Sleep Clause Mod,Terastal Clause`, the challenge's) — HP in percent for the opponent, no Team Preview, no Tera. Running battles keep theirs (`secret/state.format`).
- **No rules change** was needed: the client writes only the battle doc and its own team doc (create is allowed in any status); everything else is the admin SDK.

## The client

```
src/components/views/battle/
  BattleDetailView  the stage machine: lobby → versus → battle → result (+ replay)
  PvpLobby          every pre-battle state as one console panel (DsTeamPicker for teams)
  PvpResult         outcome, figures, REVANCHE / REVER / Compartilhar / BATALHAS
  PvpChat           the battle chat as a BW menu: a rail on a wide desktop, over the
                    field (single) or the bottom screen (dual) otherwise
  BattleListView    the list; each card a mini VS (you, them) with the outcome
src/components/modals/ChallengeModal  friend · mode (.segmented) · team (last used)
src/utils/pvpView.js        asViewer, opponentRoster, simNameOf, flattenRounds (tested)
src/utils/battleLogCache.js the device's copy of a battle's log (tested)
src/styles/battle-pvp.css   chat, lobby team row, bar chips (game-screen exception)
```

- **The viewer is always p1 on screen.** The challenger is p1; `asViewer(lines, 'p2')` rewrites the side fields (`p2a:` ↔ `p1a:`, `[of] …`, `|player|`, `|teamsize|`, the request's `side.id` and idents) so every reader under `challenge/ds/` and `utils/` works unchanged for the trainer who accepted. Never thread a side through those readers instead.
- **`DsBattleStage` with `rival`** — `{foeSimName, foeSprite, foeRoster, pendingText, labels, forfeitCopy}`: the opponent's name as `|win|` writes it, their trainer sprite on the far platform (`acetrainer` when their avatar is a Pokémon), their team as the log reveals it (`opponentRoster`), "Aguardando X…", TIME RIVAL. `music="rival"`.
- **Waiting** is optimistic (the 2026-07-27 lesson): a tap sets `awaiting {round, logLength}`; it clears when the round or the log moves. The probe on open says "you already answered" for a reload.
- **The VS card** plays once per battle per device (`ptb:battle:vs:{id}`): when it starts on this screen, or the first time it is opened after starting. The stage mounts **after** it — the playback decides at mount whether it plays from the first line (`playIntro`, only while the battle is young) or resumes.
- **REVER** remounts the stage with `playIntro` on the cached log: a replay with no request.
- **Rematch** opens `ChallengeModal` on the same friend (only when you are friends — a public-invite opponent may not be).

## The cache (`battleLogCache`, `useBattlesStore`)

- `ptb:battle-log:v1:{uid}:{battleId}` → `{lines, upTo, savedAt}`, the gap-free prefix of rounds `0 … upTo-1`. Newest 8 battles; a full storage drops the rest and retries once; every access in try/catch.
- `initLogListener` paints `myLog` from it at once (`hasLog: true`) and listens with `where('seq', '>=', upTo)`; `mergeLogDeltas` adds a response's rounds. Both go through one map by `seq`, so a round from either source, in any order, any number of times, lands once — a round ahead of a gap waits.
- Leaving the battle loses nothing: the cache is written as each round arrives.

## Sound

`utils/battleMusic.js`: two original chiptune loops (WebAudio, no files) — `champion` for Cynthia, `rival` for friends — through the effects' context and master gain (one mute for both) plus its own switch (`ptb:battle:music`). Lookahead scheduler (25 ms tick, 120 ms ahead), nothing scheduled while the tab is hidden, faster while your active Pokémon is at ≤ 25% HP (`setPinch`). Stops at the battle's `end` moment, before the result's jingle. The bar's switches live in `useBattleSound`.

## Invariants

1. **Nothing hidden until a round resolves is readable by a client** — pending choices, teams, the seed's future: `secret/state`, owner-only `teams/` and `playerLogs/`.
2. **Who owes a choice comes from `awaitingChoiceFrom`**, never assumed (one side after a faint).
3. **A round is resolved by the request that completes it, once** — the claim, then the `logSeq`-guarded publish.
4. **The format is part of the replay** — set at `begin`, read from the battle's record.
5. **The VS card can't hold a battle hostage** — `DsVersusLazy` skips it if its chunk fails or takes > 1.8 s.

## Verify

```
npx vitest run api/battle-turn.test.js api/_lib/pvpState.test.js src/utils/pvpView.test.js src/store/useBattlesStore.test.js src/utils/battleMusic.test.js
```

The browser pass for this work used a throwaway harness (fixture from a real resolver run, stores primed, `submitChoice` delivering the next round) because the container had no Firebase config and its proxy blocked Showdown's sprite host — the shapes were checked with stand-in sprites. A real two-account battle on a deploy is still the test that matters: accept → VS on both screens → a faint (one-sided prompt) → a winner, and Firestore's usage tab before/after.
