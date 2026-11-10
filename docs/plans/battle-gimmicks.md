# Plan: battle gimmicks — Tera, Z-Moves, Dynamax

> 2026-11-09. Asked for by a trainer in the forum ("tera i think would be easy
> to do, but maybe you could do z moves or dynamax too"). What the engine
> allows, measured against `@pkmn/sim` 0.10.11 in `node_modules`.
>
> **Status (same day): phases 1 and 2 built**, with Enzo's answers below —
> how it works is in `docs/modules/daily_challenge.md` (**Tera and Z-Moves**).
> Phase 3 (Dynamax) is out.

Both battle types (PvP `api/battle-turn.js`, the Champion Challenge
`api/challenge.js`) run **Gen 9** formats with no validator, and today only
Mega Evolution is a player choice (`move N mega`, the console's MEGA switch).

## What the simulator allows

| Gimmick | In a Gen 9 battle? | Why (sim source) | Cost |
|---|---|---|---|
| **Terastallization** | Yes — switched off on purpose | `canTerastallize` returns the `teraType` when `dex.gen === 9`, the Pokémon holds no Z-Crystal and cannot Mega Evolve. Both formats add `Terastal Clause` only because "the battle screen has no Tera button" (`pvpState.js`, `challenge/constants.js`). | Small–medium |
| **Z-Moves** | Yes, with a Z-Crystal held | `canZMove` has no generation check: it needs `item.zMove` (and `itemUser` for signature crystals). No validator runs, so a held Z-Crystal works. The crystals are already in `public/data/battle-items.json`. | Medium |
| **Dynamax** | **No** | `side.dynamaxUsed = battle.gen !== 8` — every side starts "already used" outside Gen 8. It needs a Gen 8 format, i.e. a separate mode without Gen 9 Pokémon and moves. | Large, separate mode |

Once per side per battle, each: the sim already enforces it (`side.zMoveUsed`,
clearing every ally's `canMegaEvo` / `canTerastallize` once one is used), and one Pokémon can only use one of the three
(a Mega Stone or a Z-Crystal blocks Tera) — the menu only needs to show what
the request offers.

## Phase 1 — Tera (the trainer's "easy" one; it is)

Server:
- Drop `Terastal Clause` from `PVP_FORMAT` and `challenge/constants.js` `FORMAT`.
  Running battles keep the format they started with (it is part of the replay);
  the Challenge also stamps `ENGINE_VERSION`, so bump it.
- Accept `move [1-4] terastallize` in `CHOICE_PATTERN` (and the PvP choice check).
- Teams already carry it: the builder saves `teraType` and
  `buildShowdownExportText` writes `Tera Type:` by default (`includeTeraType = true`)
  — confirm `src/utils/battle.js` keeps it, and that `validateTeam.js` accepts it.
- Cynthia's AI (`api/_lib/ai/options.js`) lists `mega` today; give it a
  `terastallize` option scored by the defensive/offensive swing, then
  `npm run ai:arena`. Her own sets need a Tera Type each (`dailyTeam.js`).

Client:
- A TERA switch beside MEGA in `useBattleCommands` / `DsBwCommands`, from the
  request's `canTerastallize` (show the type icon of the tera type).
- Protocol: `|-terastallize|p1a: X|Fire` — `battleProtocol.js` must change the
  active types (sprite overlay, the Pokétch's type chips, effectiveness hints),
  `challengeText.js` gets the line, `battleFlare.js` an impact moment
  (crystal shatter, drawn with `DsFlare` — no route CSS).
- Copy in `en.js`/`pt.js`; `/methodology` if the AI section quotes the options.

## Phase 2 — Z-Moves

- `move N zmove` in the choice grammar; the request's `canZMove` is an array
  per move slot (null where the move has no Z version) — the menu shows the Z
  name/power on those slots while the Z switch is on.
- The builder's item picker already lists Z-Crystals; mark them (like Mega Stones).
- Protocol: `|-zpower|`, `|-zbroken|` (Z through Protect), the move name
  changes — text lines and a flare.
- Decide whether Cynthia may hold one (a Z-Crystal in her rotation sets).

## Phase 3 — Dynamax (only if wanted as its own mode)

Needs a Gen 8 format for that battle (`gen8anythinggoes`): Pokémon and moves
that do not exist in Gen 8 must be refused, Max Moves need their own menu and
the 3-turn size change its own scene. Worth it only as a "Galar rules"
variant, not mixed into today's battles.

## Decisions (Enzo, 2026-11-09)

1. Tera wherever it fits — "ter tera onde couber": PvP (standard and random) and the Challenge, for the player.
2. The champion does not Terastallize — "melhor não" (nor use Z-Moves).
3. Z-Moves in the same battles as Tera — yes.
4. Dynamax — left out.

Not done from the phases above: Cynthia's sets carry no Tera Type (she never
uses it), and the builder's item picker does not mark Z-Crystals the way it
marks Mega Stones.
