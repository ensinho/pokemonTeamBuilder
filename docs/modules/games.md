# Jogos — the day's four (`/games`, 2026-11-15)

Enzo: "facilitar achar eles, jogar eles com tranquilidade, aumentar o
engajamento e fazer com que joguem os outros e joguem mais nos outros dias…
todos fáceis e chamativos… e que sempre tenham a opção de compartilhar no
fórum, atualmente a tier list não tem."

The answer is one idea: **the day has four games**, each with something new
today, counted the same way everywhere, each able to post to the Diário do dia.

## The four, and what is new each day

| Game | What is new today | Where the rule lives |
|---|---|---|
| Champion Challenge | a new team at midnight in Brasília | `challengeDay.js` |
| PokéPuzzle | a new Pokémon at the trainer's midnight | `pokePuzzle.js` |
| Quiz | **the category of the day**: one category, the same ≤10 Pokémon for everyone | `utils/dailyQuiz.js` `dailyQuizFor(dayNumber)` |
| Tier list | **the theme of the day**: one of the themed templates | `utils/tierTemplates.js` `dailyTierTemplate(dayNumber)` |

`dayNumber` is `gamesToday.js` `localDayNumber(ms)` — the trainer's own
calendar day as a count, so everyone on the same date gets the same category
and theme. Both rotate with a stride coprime to the pool, so every category /
theme comes up before one repeats (tested). A category with fewer than six
names is never the day's.

## The record of the day

`utils/gamesToday.js` (pure, tested) + `hooks/useGamesToday.js` (`ptb:gamesToday`,
a trainer's key — wiped by `leaveSession`).

**The account has it too (2026-11-17).** The Champion and the PokéPuzzle were
re-marked from the server wherever the Home reads them, but the quiz and the
tier list lived on the device alone, so another browser said "Aberto hoje".
Now `markGameDone` also saves today's part of the record (`accountGamesRecord`)
as `gamesToday` in the preferences doc (through `setGamesToAccount`, which
`useAuthStore` registers — the hook never imports the store), the profile read
merges the account's copy in (`applyAccountGames` → `mergeGameRecords`: played
today in either copy is played; only today is kept), and the full profile sync
carries it. The quiz is also re-marked from `categoryGuesserRuns` as they
arrive at boot (`useCategoryGuesserStore`), and the tier list's boards follow
the account (tier_list.md).

- `DAILY_GAMES = ['challenge', 'pokepuzzle', 'quiz', 'tierList']` — the day's order.
- `markGameDone(game, note?)` where a game ends. `note` is a few figures or
  ids (`{ found, total }`, `{ theme }`) — never text a trainer typed — kept
  beside the day so yesterday's never reads as today's (`useGameNotes`).
- What counts as played:
  - **Champion / PokéPuzzle** — as before (a finished official battle; a
    finished daily puzzle).
  - **Quiz** — the day's category named in full, or closed with "Encerrar"
    (the run gets `ended: true`, what was not named is shown in grey).
  - **Tier list** — a list finished by the trainer's own last placement
    (never a board that loaded finished or was copied from a link), or any
    list exported, linked or posted.
- `nextGameFor({ preferred, from, done })` walks the four; all played →
  `{ kind: 'allDone' }`; only this screen's own game open → `null`.
- `GAME_NAV_KEYS` maps a game to the shell's page key (`quiz` →
  `generationQuiz`).

## Where the day shows

| Surface | What it shows | File |
|---|---|---|
| **Jogos** (`/games`) | the belt of four Poké Balls (caught once played, gold when all are), a headline that counts what is left, four cards, three always-open doors, "Hoje no Centro" | `views/GamesView.jsx`, `styles/games-hub.css` |
| Phone dock | the fourth tab is **Jogos** for anyone who plays, lit on the page and on each of the four games (`personaDockSlot` → `'games'`; `'challenge'` gives the Champion the tab back; a competitive-only trainer keeps Meta) | `AppLayout.jsx` `mobileTabs` |
| Desktop rail | "Hoje" leads the Jogos section, the day's pips at the row's end | `AppLayout.jsx`, `DayPips.jsx` |
| Mais sheet | "Jogos do dia" is a 2×2 of the four (Live dot while open, "Feito hoje" once played, a pip each); a section of four is two by two | `MobileMoreSheet.jsx` |
| "Próximo do dia" | the next game still open + the day's pips; all played → the Diário do dia | `NextGameCard.jsx` |
| Home's Rota do dia | `quiz` and `tier` cards after the puzzle (not for the competitive-only trainer); the doors skip them | `CozyHomeView.jsx`, `trainerProfile.js` `personaDayCards` |
| Quiz | a strip: play · close · post. On the generations tab it is the way in (and steps aside mid-run) | `QuizView.jsx`, `CategoryGuesserView.jsx` |
| Tier list | the day's theme first in the rail, marked "Hoje" | `TierListView.jsx` |

### The Jogos page

- **The belt** is the week strip's device: a dashed ring is absent, a caught
  ball is played, in the game's own tone (`utils/navHue.js`); four caught turn
  gold — earned.
- **A card's art is "not known yet"**: a silhouette until the trainer plays,
  then what they got — the puzzle's Pokémon, the category they named, their
  own top three of the list, the Champion's ace once she is beaten. The
  puzzle's silhouette is a drawn Pokémon, never the answer.
- **One primary**: the next game still open in the day's order. The others
  are secondary, a played one ghost.
- It stores nothing and adds no read of its own: the device's record, the
  Champion's and the puzzle's summaries (`useChallengeSummary`,
  `useDailyPuzzle`), the tier list's own storage.
- Class names are `.daygame*` and `.belt-ball*` — `.game-card` and `.day-ball`
  already exist (`game-cover.css`, `rewards.css`) and took the first build's
  cards over (`docs/wounds.md`, 2026-11-15).

## The day's receipt (2026-11-17)

Once any game is played, the Jogos page offers the mascot's **receipt of the
day** ("O recibo até agora"; at four of four "O recibo do dia", stamped in
gold): one row per game from what each noted, the count of full days, and
"Postar no Diário" — `sharedReceipt` (`gameShare.js`, ids and figures,
`ReceiptShareCard` in the thread). The full day is counted the moment the
fourth game is marked (`useRoundStore` listens to `ptb:games-today`). The
rules are mascot.md's "O plantão".

## The forum

`utils/gameShare.js` (pure, tested): two attachments on a forum message, both
through `useForumStore.postToDiary`.

- `sharedTierList: { v: 1, code }` — the link code of `/tier-list?r=`: a known
  theme and dex ids. **The list's own name never travels.**
- `sharedQuiz` — a category run `{ v: 1, mode: 'category', list, found, total,
  daily }` or a generations run `{ v: 1, mode: 'generations', duel }`. **No
  Pokémon is named.**
- Each is written through `clean*` and read back through `read*` (strict:
  what a reader refuses is not shown). A chart's cells are checked against
  their rules with the index, as on the page.
- **No rules change**: a message may already carry extra fields, and
  `dayResultsOnlyInDiary` only speaks of the puzzle and the Champion.
- Cards (`TierListShareCard`, `QuizShareCard`, own chunks through
  `forum/GameShares.jsx`): the list's ranks on their ball colours with "Fazer
  a minha" (→ `/tier-list?r=`); the quiz's mark as pips with "Jogar esta"
  (→ `/quiz?tab=categories&list=`) or "Tentar bater" (→ `/quiz?duel=`).
- `hooks/useDiaryShare.js` + `DiaryShareButton.jsx`: one behaviour for
  "Postar no Diário" — post, say so with a way to see it, rest as "Ver no
  Diário" until what would be posted changes.
- `DiaryBanner` counts and offers the four.

## URL parameters

| URL | Does |
|---|---|
| `/quiz?tab=categories&daily=1` | starts or resumes the day's category |
| `/quiz?tab=categories&list=<id>` | starts or resumes that category (the day's, if it is the day's) |
| `/tier-list?daily=1` | opens the theme of the day |
| `/tier-list?t=<theme>` | opens a named theme |

Each parameter is read once and leaves the URL.

## Events

`tierlist_complete`, `tierlist_forum`, `quiz_forum`, `quiz_daily_start`,
`quiz_daily_end` (analytics.md).

## Not built yet

- The landing's "Jogue hoje" still shows three games (it is prerendered:
  `prerenderHome.mjs`, `seoSnapshot.js`).
- A count of how many played the day's quiz / ranked the day's theme (the
  Diário's tally is the only crowd figure for them).
- ~~A streak of full days~~ — built 2026-11-17 as a *count* of full days, never a
  streak (`roundReceipt.js` `withFullDay`, shown on the day's receipt; a gap takes
  nothing away). See mascot.md, "O plantão".
- The daily push still knows only the Champion and the puzzle (the mascot's
  receipt now names all four).
