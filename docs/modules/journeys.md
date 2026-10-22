# Journeys — onboarding by doing (2026-10-17)

Five levels of missions that teach the app by having the trainer use it, each
rewarded with a badge. Modelled on a missions/medals screen (levels as an
accordion, badges grouped by how they are earned, a detail sheet with one
action). **No points** — the reward is the badge (Enzo's call). Since
2026-10-17 missions also count toward the Trainer Level, whose experience is
*computed*, never spent — see [rewards.md](./rewards.md).

## Pieces

| File | Role |
|---|---|
| `src/utils/journeys.js` | **The source of truth.** `JOURNEYS` (levels → missions, each a `done(facts)` predicate, a `to` route or an `action`), `evaluateJourneys`, `currentJourney`, `nextMission`, `PAGE_MARKS`, `JOURNEY_MARKS`. Pure, tested in `journeys.test.js`. |
| `src/hooks/useTrainerBadges.js` | Builds the `facts` from the stores, evaluates the journeys **once**, and puts them in `stats.journeys` — so a journey badge and its missions can never disagree. Returns `journeys` and `celebrateBadge`. |
| `src/constants/badges.jsx` | The five journey badges (`category: 'journey'`, hexagon emblems, `journeyBadge(journeyId)`), first in `BADGES_LIST`. |
| `src/store/useAuthStore.js` | `journeyMarks` + `markJourney(mark)`: things no collection records (a page opened, a Showdown export). localStorage `ptb:journeyMarks` + the preferences doc, merged as a union on hydration. |
| `src/store/useJourneyCoachStore.js` | The mission being guided (id only, sessionStorage). |
| `src/hooks/useJourneys.js` | `useJourneys()` and `useMissionLauncher()` — "Go": start the guide, then navigate or run the action (`partner` → `openPartnerPicker()`, `signUp` → `promptSignIn`). |
| `src/components/journeys/` | `JourneyList` (+ `MissionRow`, `JourneyTile`, `JourneyBar`), `BadgeGallery` (+ detail dialog), `JourneyCoach` (the floating guide, mounted once in AppLayout). |
| `src/components/views/JourneysView.jsx` | `/journeys` — Journeys / Badges / Rewards tabs (`?tab=`), each carrying its own figure as a `count-badge` (no separate stat boxes since 2026-10-22). Badges are equipped here (the badge dialog); the Profile shows only the earned ones and links back. |
| `src/components/views/CozyHomeView.jsx` | The Home's journey card, sized by `journeyEmphasis()`: **focus** (new trainer — level ≤ 2, < 6 missions done, < 7 days active) is the full card (welcome, level, open missions); **compact** (active trainer) is a small "Próximo passo" card with the one mission up next; **none** once all five are done. Desktop: top of the right rail. Phone: focus under the hero, compact under "Seu dia". Plus the Home's **Jornada** tab (replaced Meta). |

## The mascot (`src/components/Mascot.jsx`)

The favicon's Gengar (`public/logo-mark.webp`) is the voice of tips and big
moments: `<Mascot size>` alone, or `<MascotTip>` (mascot + speech bubble — a
fill, never a box; inside a card it takes the raised surface). Used by the
PageGuide trigger and popover, the mission guide (with a check when done), the
Home's welcome, the Journeys page lead and all-done state, and the badge modal
when a journey finishes. `cheer` plays one hop — only for something the
trainer just earned.

## Where marks come from

- Page visits: AppLayout's effect on `currentPage` → `PAGE_MARKS`.
- `memberEdited`, `showdownExport`, `shareLink` — `useActiveTeamStore`.
- `forumPost`, `forumTeamShare` — `useForumStore` (the server message count is cached for a minute; the mark makes a post count at once).
- `quizGuess` — both quiz stores' `updateActiveRunProgress` (a right answer, not an opened page — the category mode starts a run on load).
- `challengePlayed` — `ChampionChallengeView.handleStart` (not the store: importing `useAuthStore` there pulls Firebase into its tests).

## Invariants

- **A mission is a predicate over facts, never stored state.** Add a mission in `journeys.js`, its copy in `translations.js` (`journeys.missions.<id>.title/hint`), and a test.
- **The guide celebrates only what it watched.** The launcher starts it on an open mission only, so "done" inside `JourneyCoach` means "done while guided" — safe to fire the badge modal. Never diff the journeys elsewhere to fire toasts: data arriving after boot would read as fresh completions (the 2026-09-21 wound).
- **The guide costs nothing until used.** `JourneyCoach` renders (and mounts `useTrainerBadges`' listeners) only while a mission id is set; it hides on `/challenge` and `/battles/:id`.
- Levels are an order, not a lock: a veteran's earlier work counts the day it ships.
- A new mark goes in `JOURNEY_MARKS` (≤ 40 chars; only `true` survives a read).
