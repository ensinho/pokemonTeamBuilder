# UX audit — battles, Mega Evolution, effects, forum on a phone (2026-10-20)

> Asked for by Enzo with the Mega Evolution, anime-effects and forum requests:
> "caso identifique falhas de UX ou inconsistências documente categorize e
> corrija". Each finding has a category, where it was, what was wrong, and what
> changed. All of them are fixed in this change unless the **Open** list says
> otherwise. Root causes are in [the wounds log](../wounds.md) (2026-10-20).

Categories: **Bug** (wrong behaviour) · **Feedback** (the screen doesn't say
what happened or what you can do) · **Layout** (things collide or get cut) ·
**Hierarchy** (the important thing isn't the loudest) · **Consistency** (the
same thing shown two ways) · **Touch** (targets and gestures on a phone).

## Battles — the Champion Challenge and friend battles

| # | Category | Where | Finding | Change |
|---|----------|-------|---------|--------|
| B1 | Bug | both, server | `move N mega` was rejected by the challenge (400), and nothing sent it in either battle: a Mega Stone did nothing | `CHOICE_PATTERN` takes ` mega`; the request's `canMegaEvo` reaches the menu (`canMega`); the choice is sent |
| B2 | Bug | Champion Challenge | Cynthia's AI never Mega Evolved | `legalOptions` adds ` mega` when the sim allows it; the AI learns the stone from `-mega` |
| B3 | Bug | both | A team saved as `Charizard-Mega-X` started the battle Mega Evolved: no Mega Evolution moment, no MEGA switch | `toStartingForme`: a battle-only forme starts as its base (new challenge runs; friend battles with no published line) |
| B4 | Bug | both | After a Mega Evolution, readers keyed by species lost the Pokémon: the sheet's HP, the balls, the rival's roster (a 7th slot), and a fainted Mega looked alive once the sim renamed it back | every reader follows `detailschange` both ways (`megaEvolution.test.js`) |
| B5 | Feedback | both | No way to know a Pokémon can Mega Evolve, or to choose not to | a **MEGA** switch beside the moves (touch) / beside the move's name (HUD), on by default, reset each turn, `M` on a keyboard |
| B6 | Feedback | both | A Mega Evolution would have passed as a sprite swap | its own moment: the line ("Charizard megaevoluiu para Mega Charizard X!"), a rising arpeggio, the white silhouette swelling into the new forme, the Mega flare |
| B7 | Consistency | both | The HP box would have read the forme id "Charizard-Mega-X" | the Pokémon's name plus a **MEGA** mark, as the games do |
| B8 | Layout | desktop HUD | The VOLTAR capsule covered the move's PP (pre-existing) | the name, MEGA and a back arrow share the first row; the figures get the whole second row |
| B9 | Feedback | both | A hit had particles but no impact frame; a super-effective hit and a win looked like any other moment | the anime flare (`DsFlare`): `hit` on a direct hit in the move's type colour, `crit` when it was critical or super effective, `mega`, `win`; behind the VS slam too |

## Forum — on a phone (≤ 1023px)

| # | Category | Finding | Change |
|---|----------|---------|--------|
| F1 | Hierarchy | Two titles stacked ("Forum feed", "Community forum"), each with a magnifier | the forum's title is for screen readers only; its figures lead the line beside search and Create |
| F2 | Hierarchy | Up to three coloured chips per row; the title was the quietest thing on it | pinned / trending / official are a tinted icon dot; the category is the row's one chip |
| F3 | Hierarchy | Three filled pills per row, "Share" spelled out | icon and count, no fill; the liked heart keeps the primary colour; Share is an icon at the row's end |
| F4 | Touch | The pills are 28px tall with no extra hit area | `touch-target` (the hit area grows on a coarse pointer, the layout doesn't) |
| F5 | Layout | The figures wrapped with a dangling "·" | on a phone: topics · active today (the trainer count goes) |

## Open (seen, not changed)

- **Mega sprites are Gen 5.** There are no Gen 4 Mega sprites, so a Mega's sprite falls back to Showdown's Gen 5 art beside Gen 4 sprites. A matching set would have to be drawn.
- **The sort + category row still scrolls sideways on a phone.** The cut-off chip is the cue. Splitting it into two rows costs a row on every visit; worth revisiting if more categories come.
- **The AI Mega Evolves at its first chance.** That is what a player does almost always; a held Mega would need the lookahead to value it.
- **The forum on a desktop is unchanged**: these were phone findings.

## How it was checked

- Tests: `src/utils/megaEvolution.test.js` (a real two-Mega log through every reader), `src/utils/battleFlare.test.js`, `api/_lib/ai/options.test.js`, the Mega cases in `api/challenge.test.js`, `api/battle-turn.test.js` and `api/_lib/challenge/validateTeam.test.js`.
- Browser (throwaway harness, deleted): a friend battle where both leads Mega Evolve, built by the real resolver, at 1440 and 390, dark and light. Frames were taken every 120 ms through the turn: the silhouette, the Mega flares, the `hit` flare on Close Combat, the `crit` flare on a super-effective Flare Blitz. Also the MEGA switch on and off on the touch menu, the HUD info box, the VS slam's flare, and the forum feed at 390 in dark and light. The container's proxy blocks Showdown's sprite host, so the Mega sprite there was a stand-in.
