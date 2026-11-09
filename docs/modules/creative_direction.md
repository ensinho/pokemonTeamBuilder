# Creative direction — living scenes (2026-11-05)

> **Enzo, 2026-11-05, on the trainer-profile onboarding:** "ficou absurdamente
> incrível… essa criatividade foi insana e quero ela pro futuro
> definitivamente." This file is that decision, written down. **This level is
> the bar for every new screen, flow and component.** A design that only
> arranges boxes neatly has not met it yet.

It sits on top of the design system, not instead of it: tokens, the spacing
grid, no nested borders, one spark burst per screen, reduced motion and the
typeface (Space Grotesk + JetBrains Mono, Unbounded headings — never changed,
see the memory note) all still hold. `/design-system` says how things are
built; this file says what they should *feel* like.

## The principles

1. **The scene answers the user.** An illustration is not decoration; it
   reacts to what the user does. In the onboarding, each interest picked
   lights its Pokémon, the unpicked go grey, and the result is the persona
   alone on the gold burst. Ask of every new screen: *what can the picture
   say back?*
2. **Speak in the franchise's own devices.** The app's visual language is
   Pokémon's, used as UI:
   - an **evolution line** is progression (Gible → Gabite → Garchomp drew
     the competitive level);
   - a **silhouette** is "not chosen / not known yet" ("Quem é esse
     Pokémon?" — Mewtwo until minigames is picked);
   - a **type colour** is a category's tone (Dragon = competitive, Electric
     = the games, Psychic = minigames), always mixed into theme tokens;
   - **official artwork** is the protagonist, sprites are the detail;
   - **gold** is only for something earned (the burst, the streak flame,
     the trainer card's accent pixels).
3. **Translate a reference, never copy it.** Each reference is taken apart
   into its anatomy (panel, curve, icon tile, step pill, arrow, dots) and
   rebuilt in this app's material. The reference is a direction, not a spec.
4. **Motion lives inside the thing.** Not a tile that bounces: the icon
   does what it draws — the trend line redraws itself, the gauge's needle
   sweeps, the swords clash, the puzzle piece turns into place. One play per
   act, under 600 ms, nothing when reduced motion is asked for.
5. **Every trainer gets something only theirs.** The trainer card's banner
   is their uid drawn as pixels (no two alike), the bio is their persona,
   the team sheet takes the colour of their lead Pokémon's type.
6. **Calm data, loud moments** (Neon Sticker, 2026-10-26) still governs the
   volume: the middle of a flow is quiet, its peak is the one moment.

## What is built this way

| Piece | Where | The device |
|---|---|---|
| Trainer-profile onboarding | `components/onboarding/TrainerOnboarding.jsx`, `styles/onboarding.css` | Scene that answers; evolution line as a level; silhouette until picked; persona on the gold burst ([trainer_profile.md](./trainer_profile.md)) |
| "Para você" tiles | `CozyHomeView.jsx`, `styles/cozy-home.css` (`data-motion`) | One row of four doors; each icon animates its own SVG parts on hover |
| Trainer card | `components/trainerCard/TrainerCardDialog.jsx`, `styles/trainer-card.css`, `utils/trainerCardPattern.js` | Per-trainer pixel banner in the persona's type colour, partner standing in it, streak/level/wins as "bold figure + muted word", "Treinando desde" signed with one gold pixel |
| Badge Case | `components/home/BadgeCase.jsx`, `styles/badge-case.css` | The games' badge case on the Traveler's Home: leaders as silhouettes until their badge is tapped, a gem of their type lights, the full case turns gold |
| The mascot | `components/Mascot.jsx`, `utils/mascot/*`, `styles/mascot.css` ([mascot.md](./mascot.md)) | The icon's ghost as a rig that answers: moods by name, the games' evolution silhouette on a level up, a scene for every wait (peeking over a Poké Ball that rocks three times, a Shadow Ball charging before a battle, the Pokédex being read, a lens, a thought bubble), Pokémon Refresh petting with its ceiling, a type tone per trainer, shiny as an easter egg |
| Home · Today (2026-11-09) | `views/CozyHomeView.jsx`, `components/home/{HomeGreeting,DayHero,HomeParty}.jsx`, `styles/home-today.css` | The market's phone grammar in franchise devices (`.claude/skills/app-screens`): the partner as the trainer's face in a greeting by the hour; one hero tinted by the lead's type with its official artwork and a player bar; the party as six round slots (dashed "+" = absent) |
| Week strip + streak sheet | `components/rewards/{CheckinWeek,StreakSheet}.jsx`, `utils/dailyCheckin.js` (`checkinWeek`, `streakMonth`) | Days as Poké Balls — caught in the run, dashed when absent, a shield where one will cover; today inverted and its "+" is the check-in; the mascot's mood answers the streak's state |
| Splash, welcome, sign in | `AppLayout.jsx` (`.boot-screen`), `views/LandingView.jsx` (phones), `modals/AuthModal.jsx` | The icon's ghost huge and white on Volt, cropped by the corners; the party with a speech bubble and a sticker collage on the headline; the partner on its pad with the form rising over it |
| Team sheet (share image) | `modals/ShareSnippetModal.jsx` (`renderTeamSheetSync`), `utils/teamSheet.js` | The regional-champion poster: trainer's face + "Time de X", six raked cards (art + item, ability, nature, four type-signed move pills) on the lead's type colour, poster rings |

## Inspiration bank — the "community boards" kit (reference 5, 2026-11-05)

A dark UI kit of small cards (streaks, boards, quests, a podium, a trade
card, chat). What it does well, and where each pattern belongs here. ✅ =
used already, ☐ = proposed.

| Pattern | What makes it work | Where it fits here |
|---|---|---|
| **Figure + muted word** ("1,240 Followers · 48 Following", "350 XP") | The number carries, the label whispers; no boxes | ✅ trainer card stats · ☐ Profile hero, Journeys totals |
| **Ranked rows** — avatar, name, a small sub-line, the rank in accent on the right (#13) | The rank is the one coloured thing in the row | ✅ Champion Challenge ranking rows (place 4+) · ☐ forum "top trainers" |
| **Podium** — #2 · #1 · #3 with the centre raised and the winner's tile filled | Hierarchy without a table | ✅ Champion Challenge ranking top three (`.challenge-podium`) · ☐ Team of the Week |
| **Quest list** — round icon, title, sub, the reward as a pill on the right; a ready reward is an inverted pill ("Claim +100"), a pending one is coloured text ("+150 XP") | Ready vs not-yet is legible at a glance, and the ready one is the only button | ✅ Journeys missions (`.mission__reward`: gold pill when earned, primary text when pending — XP is automatic here, so nothing to "claim") · ☐ the daily check-in rewards |
| **Multi-select avatar tiles** with a check badge in the corner | Selection is a mark, not a recolour of the whole tile | ☐ onboarding interests (now a ring), favourites/teams compare picker |
| **Inverted chip for the selected value** in an amount row ($10 **$50** $100 Max) | The choice reads instantly on any theme | ✅ the builder's chosen Smogon tier (`.tier-chip.is-active`, `game-cover.css`) · ☐ EV presets when they exist |
| **Composer with entity chips** and a quiet quota ("2 free today") beside a round send button | The input shows what is attached and what is left | ☐ PokéPuzzle guess bar, forum composer with Pokémon chips |
| **Split progress bar** (green / red ends) | A ratio in one line, no axis | ☐ meta usage win-rate, matchup previews |
| **Action pills with a status dot** (Send ●, Swap ●) | State without a second control | ☐ filter pills with "active" dots |
| **Chat bubbles**, own message in accent, others neutral with a tiny avatar | Who said it is the colour | ☐ battle chat, thread quick replies |
| **The calm card** — one radius, one hairline, a title row with ×, nothing else | Every card is the same container; content does the talking | ✅ already the panel rule |
| **Footer meta line** with an icon ("109.1k holders, eight communities") | A page summarised in one muted sentence | ☐ forum and meta page footers |

## Inspiration bank — the market app kit (references 6–10, 2026-11-09)

Five phone-app shots (a mascot-led AI app, a podcast app before/after, a
mood-streak sheet, a cozy journal's sign-up/home/welcome). Their anatomy, what
each device became here, the recipes and the audit live in the
**`/app-screens` skill** (`.claude/skills/app-screens/SKILL.md`) — read it
before restructuring any phone screen. ✅ built on 2026-11-09: greeting,
week strip, hero of the day with a player bar, party row, rails, streak sheet,
label-on-active dock, brand splash, phone welcome, filled sign-in fields.
☐ proposed: Google sign-in (the skill's "Sign in" recipe lists what it needs),
the same greeting + hero grammar on Profile and the Pokédex's first screen.

## Checklist for the next screen

- What does the scene say back when the user acts?
- Which franchise device carries the meaning (evolution, silhouette, type,
  artwork, gold)?
- Is there one thing on it that is only this trainer's?
- Does motion happen *inside* the element, once, and stop for reduced motion?
- Is the peak the only loud moment?
