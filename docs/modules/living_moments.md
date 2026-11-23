# Living moments (2026-11-22)

> **Enzo, 2026-11-22**, on the proposal of eight moments: "A. pode ser esses 4 ·
> B. toda vitória do dia · C. pode · D. tá tudo joia, pode seguir", then "pode
> ir pra segunda leva". All eight are built: the level up, the full day, the
> sign-out and the Champion Challenge's way in and way out (first batch); the
> badge case, the trainer card, the friend battle's verdict and the first team
> saved (second batch — the badge grew past its restrained version, "C. pode").

Scenes that answer something the trainer just did, in the franchise's own
devices, on the brand intro's night ([brand_intro.md](./brand_intro.md)).

## The four

| Moment | Device | Where | Fires |
|---|---|---|---|
| Level up | The evolution screen: the numeral's silhouette swaps old ↔ new faster and faster, the flash, the new level lands in gold | `components/moments/LevelUpScene.jsx`, `utils/livingMoments.js` (`LEVEL_UP`, `evolutionSwaps`, `swapKeyframes`) | `useAuthStore.checkIn()` when the XP crosses a level — the check-in card and the daily PokéPuzzle both go through it |
| Full day | The fourth capture: the last ball flies onto the belt, wobbles three times, clicks, the four light up in gold — then the real day receipt opens and presses its gold stamp | `components/moments/FullDayScene.jsx` (`FULL_DAY`, `wobbleFrames`) | `markGameDone` when `completesDay(before, after)` — once a day per device (`ptb:fullDayShown`) |
| Sign-out / account deleted | The brand intro in reverse: the night closes through the ghost, the mascot waves and vanishes; after the reload the splash opens on the same night at rest and leaves through the ghost into Home | `SessionTransition.jsx` (`<BrandIntro variant="session">`), `AppLayout` (`arrival`, read from `LEFT_SESSION_KEY`) | `leaveSession` |
| Champion Challenge | Power on (CRT line + iris on the spawn), Hall of Fame on every official win of the day, blackout on a loss, power off on the way back to the room, the next game rising | `views/challenge/ds/DsMoments.jsx`, `utils/championMoments.js` — see [daily_challenge.md](./daily_challenge.md) | A battle played on this screen (`finaleFor(run, startedRunId)`) |
| Badge unlocked | The badge case: the badge turns twice coming down into its socket, seats with a squash, the socket lights gold with one ring, the spark burst opens behind it, one shine. The shiny sparkle stays Equip's | `modals/BadgeUnlockModal.jsx` (`BADGE_CASE`, `badgeSpinFrames`, `seatFrames`) | When the dialog opens (after the moment that earned it) |
| Account created / signed in | The trainer card comes out printed: out of a slot, the banner (`trainerPixels`, the trainer card's) lighting cell by cell in an order drawn from the same seed (`printDelays`), the name typing itself, the gold pixel of "training since" last | `components/moments/TrainerCardPrint.jsx` in the Primeira Jornada's `done` step (`CARD_PRINT`) | Reaching `done` |
| Friend battle verdict | The VS card again at the end: the loser's band loses its colour and its portrait falls, the winner's band takes the screen, "VITÓRIA" only on your own win | `ds/DsVersus.jsx` (`verdict`), `battle-versus.css`, `BattleDetailView` (`pvpVerdict`) | A battle that played to its end on this screen — never a replay, a later visit or a tie |
| First team saved | Into Bill's PC: each Pokémon turns to red light and shrinks into its ball, the balls arc into the box, the lid closes, the box counts one | `components/moments/TeamSavedScene.jsx` (`TEAM_SAVED`, `arcFrames`) | `saveTeamNow` for the account's first team only (not editing, no saved team) |

## How they play

- **`useMomentStore`** is a queue: `playMoment(kind, payload)` from wherever the
  act happened (a store is fine), one of each kind at a time. **`<MomentLayer>`**
  (mounted once in AppLayout) plays them in order; the scenes are their own lazy
  chunk. A place playing its own scene holds the queue with
  `holdMoments(ms)` — the Champion's Hall of Fame does, so a full day earned by
  that battle waits for it.
- **Web Animations from sampled keyframes**, like the brand intro: transform,
  opacity, colour steps. Every element's resting CSS is the scene's END, the
  animations play it from the start (`fill: backwards`), so reduced motion —
  no animations, a fade — shows the finished scene with the same words and
  buttons.
- **A tap finishes what is running; a second tap (or Escape, or the button)
  closes.**
- **Gold only for what was earned:** the new level, the full day, the Hall.

## Rules

- Only the trainer's own act: never data that arrives (a profile read, another
  device's record), never a result opened later.
- One scene at a time; a scene never opens over another place's scene.
- A new moment is a pure timeline in `src/utils/` with tests, a component in
  `components/moments/` (or in its place's folder when it draws inside it, like
  the DS screen), and a row in the table above.
