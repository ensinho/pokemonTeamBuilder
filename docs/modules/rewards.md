# Rewards — Trainer Level, daily check-in, cosmetics (2026-10-17)

What the journeys started, this keeps going: everything a trainer does earns
experience, a daily check-in pays on a seven-day cycle, and levels, check-ins
and badges unlock **cosmetics** — avatar frames, titles under the name, and
app themes. Enzo's calls: **no currency** (nothing to earn and spend, nothing to
balance), **reward themes yes**, **seasonal items not for now**. Cosmetic only:
no item ever gates a feature.

## Pieces

| File | Role |
|---|---|
| `src/utils/trainerLevel.js` | **XP and levels, pure.** `XP_RULES` (missions, journeys, badges, active days, puzzle wins, quizzes, teams ≤ 20, forum posts ≤ 100), `CHECKIN_CYCLE_XP` (10·10·15·15·20·20·50), `computeTrainerXp(stats, { badgeIds, journeyBadgeIds, checkinCount })`, `xpForLevel` (each step costs 25 more: L10 = 1800, L20 = 6175), `levelForXp`. |
| `src/utils/dailyCheckin.js` | **The check-in, pure.** `applyCheckin({ checkin, streak }, today)` → next state + result (XP, cycle day, shield used/earned); `liveStreak`, `checkinCalendar`, local `YYYY-MM-DD` days, `dayDiff` in UTC so DST never makes a day 23 h. |
| `src/constants/cosmetics.js` | **The catalogue.** `COSMETICS` — id, kind (`frame` / `title` / `theme`), unlock (`level`, `badge`, `journeys`, `checkins`), frame ring colours (canon type / Poké Ball colours). Names in `translations.js` → `rewards.items.<id>.name`. |
| `src/utils/rewards.js` | **Rewards logic, pure.** `isRewardEarned`, `newlyEarnedRewards`, `levelTrack`, `nextLevelReward`, `unlockLabel`, `frameProps(frameId)` (the `data-frame` attribute + ring colours), `validEquip`, and the recorded copy: `normalizeRewards` / `mergeRewards`. |
| `src/store/useRewardsStore.js` | **The record.** `xp`, `level`, `unlocked` (id → day), `equipped` + `equippedAt`, `seen`. localStorage `ptb:rewards` + the preferences doc's `rewards`. `syncProgress` (records, never celebrates), `addXp` (the check-in), `equip`, `markSeen`, `isThemeUnlocked`. |
| `src/store/useAuthStore.js` | `checkin` (`ptb:checkin`, doc `checkin`), the streak (now with `shields`), `checkIn()`. `bumpPokePuzzleStreak` *is* a check-in. Hydration merges both, then `useRewardsStore.hydrate(data.rewards)`. |
| `src/hooks/useTrainerBadges.js` | Computes XP from the stats it already builds and hands it to `syncProgress`. |
| `src/store/useTrainerCosmeticsStore.js` + `src/hooks/useTrainerCosmetics.js` | **Other trainers' frames.** Reads `publicProfiles` (`frameId`, `titleId`, `trainerLevel`), once per trainer per session, batched into `in` queries of 30. Your own come live from useRewardsStore. |
| `src/components/rewards/` | `CheckinCard` (Home rail / under the hero on phones, and the head of the tab), `RewardsPanel` (`/journeys?tab=rewards`: collection + level track), `FramedAvatar`, `TrainerTitle`. |
| `src/styles/rewards.css` | The card, the collection, the track. The frame itself is global (`index.css`, `[data-frame]`). |

## Where it shows

- **Frame** on every avatar container, through `<FramedAvatar as uid stampedFrameId>`:
  forum rows, posts and comments, the profile card, friends, battles (list,
  header, chat), the Home's community posts, the ChallengeModal; your own in
  the account menu (`frameProps` directly) and the Profile hero.
- **Title** under the name: Profile hero, account menu, the profile card (with the level).
- **Themes**: the Profile's theme picker shows reward themes locked (dashed,
  "Unlocks at level N", tap → Rewards tab); the account menu lists only the
  unlocked ones; `chooseTheme` refuses a locked one; the header toggle falls
  back to `dark`/`light` when the paired theme is locked. Four reward themes,
  paired dark ↔ light: `ember` ↔ `viridian`, `aurum` ↔ `blossom`.
- Forum posts also stamp `creatorFrameId` / `creatorTitleId` — the fallback
  while the author's public profile is loading, or for a guest who has none.

## Invariants

- **Recorded, not derived on render** (Enzo: "deixar tudo salvo"). Views read
  useRewardsStore; only useTrainerBadges computes, and only to record.
- **Nothing is ever taken back.** XP is the highest ever seen; unlocks are a
  union (earliest day wins); the streak copy with the later day is live.
- **Data never celebrates.** syncProgress records quietly — boot catch-up looks
  exactly like progress (the 2026-09-21 wound). New unlocks get a "New" tag in
  the collection (`seen`) and a count on the tab. Only the check-in tap gets
  the shiny burst and the result line.
- **The equip chosen last wins** (`equippedAt`). "The account copy wins" lost an
  equip made a moment before leaving the page (found in the browser pass).
- **A frame is a round box-shadow** — two rings outside the container, each
  with a dark seam inside it and a lit top (a copy one px up, mixed toward
  white: a bevel with no gradient), 0.3125rem in all (2026-10-18), which `[data-frame]` makes a circle (a rounded-square container
  drew a square ring). Rings sit outside the box, so a container flush with an
  `overflow: hidden` edge cuts them: give that scroller room (the forum thread
  reaches `--space-2` left and pads it back). Premium frames add a hairline halo and a wider glow of their inner colour.
- **New catalogue frame/title → `firestore.rules`.** `publicProfiles` accepts
  only catalogue ids (`rewards.test.js` fails when they drift). Until the rules
  are deployed, `syncPublicProfile` retries without the reward fields on
  `permission-denied`, and others see your frame only through stamped posts.
- A new user-scoped field lives in the preferences doc, so account deletion
  already covers it; the patch-notes localStorage sweep preserves
  `ptb:checkin` / `ptb:rewards` (AppLayout `preservedKeys`).
