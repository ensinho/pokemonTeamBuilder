# Living moments (2026-11-22)

> **Enzo, 2026-11-22**, on the proposal of eight moments: "A. pode ser esses 4 ·
> B. toda vitória do dia · D. tá tudo joia, pode seguir". The first four are
> built: the level up, the full day, the sign-out and the Champion Challenge's
> way in and way out. The other four (badge case, trainer card, friend battle
> result, first team saved) wait for a second batch — the badge may grow past
> the restrained version ("C. pode").

Scenes that answer something the trainer just did, in the franchise's own
devices, on the brand intro's night ([brand_intro.md](./brand_intro.md)).

## The four

| Moment | Device | Where | Fires |
|---|---|---|---|
| Level up | The evolution screen: the numeral's silhouette swaps old ↔ new faster and faster, the flash, the new level lands in gold | `components/moments/LevelUpScene.jsx`, `utils/livingMoments.js` (`LEVEL_UP`, `evolutionSwaps`, `swapKeyframes`) | `useAuthStore.checkIn()` when the XP crosses a level — the check-in card and the daily PokéPuzzle both go through it |
| Full day | The fourth capture: the last ball flies onto the belt, wobbles three times, clicks, the four light up in gold — then the real day receipt opens and presses its gold stamp | `components/moments/FullDayScene.jsx` (`FULL_DAY`, `wobbleFrames`) | `markGameDone` when `completesDay(before, after)` — once a day per device (`ptb:fullDayShown`) |
| Sign-out / account deleted | The brand intro in reverse: the night closes through the ghost, the mascot waves and vanishes; after the reload the splash opens on the same night at rest and leaves through the ghost into Home | `SessionTransition.jsx` (`<BrandIntro variant="session">`), `AppLayout` (`arrival`, read from `LEFT_SESSION_KEY`) | `leaveSession` |
| Champion Challenge | Power on (CRT line + iris on the spawn), Hall of Fame on every official win of the day, blackout on a loss, power off on the way back to the room, the next game rising | `views/challenge/ds/DsMoments.jsx`, `utils/championMoments.js` — see [daily_challenge.md](./daily_challenge.md) | A battle played on this screen (`finaleFor(run, startedRunId)`) |

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
