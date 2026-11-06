# Plan: the social heart — forum, Champion Challenge and minigames (2026-11-06)

> Enzo, 2026-11-06: keep investing in the persona journeys, onboarding and
> engagement; the forum, social engagement, the Champion Challenge and the
> minigames should be **the heart of the site**. This file is the proposal.
> Nothing here is built yet. Read with
> [creative_direction.md](../modules/creative_direction.md) (the bar) and
> [mascot.md](../modules/mascot.md) (the ghost that now answers).

## Where we stand (inventory, 2026-11-06)

What exists is strong but **solitary**: every loop ends with the trainer
alone.

- **Forum.** It has:
  - topics, comments and the Hot/New/Top ranking;
  - heart likes;
  - shared teams, puzzles, Champion results and public battle invites;
  - Team of the Week.

  It has no reply, mention or like notification, no reactions, no inbox, and
  no report flow.
- **Champion Challenge.** It has:
  - daily lineups with Cynthia and Blue;
  - two boards (Time do dia and your own team), each with a podium;
  - a share code and its image;
  - badges and two journeys.

  It has no friends board, no weekly board, no XP for a win, and nobody can
  watch a run.
- **PokéPuzzle.** It has a daily puzzle and an archive; a win counts as the
  check-in; and it shares as emoji text, an image and a forum post. It has no
  stats beyond the trainer's own and no comparison with friends.
- **Quiz.** Two modes. No share, no ranking, no duel.
- **Friend battles.** An async PvP with push, email and chat. It gives no XP
  and has no ladder.
- **Analytics.** Nothing records a forum post, reply or like, or a
  challenge, puzzle or quiz being started, finished or shared. **We cannot
  measure the heart yet.**

Constraints:
- **Functions:** 9 of 12 Vercel functions are used. New work adds actions to
  existing endpoints (`challenge`, `daily-puzzle`, `battle-notify`, `og`).
- **Crons:** 2 of 2 are used. Anything scheduled rides the daily-puzzle cron
  (12:00 UTC) through `DAILY_TOPICS`.
- **Rules and privacy:** every new public field changes `firestore.rules` and
  the privacy page in the same commit.

## The idea in one line

**One place a day where everyone meets.** The daily puzzle and the two
champions already give the whole site the same day. Make that day a shared
room (the forum's *Diário do dia*), let every result land there, let friends
answer each other, and let the persona journeys walk each trainer into it in
their own way.

The franchise device: the **Pokémon Center**. Every town has one, everyone
passes through it, the nurse knows your name. The forum becomes the Centro
Pokémon; the mascot is the one at the counter.

---

## A. Foundations: the things every other proposal needs

| # | Proposal | Why | Cost |
|---|---|---|---|
| A1 | **Measure first.** Add the missing analytics events: `forum_post`, `forum_reply`, `forum_like`, `challenge_start`, `challenge_finish` (with board and result), `challenge_share`, `puzzle_finish` (with guesses), `puzzle_share`, `quiz_finish`, `friend_request`, `battle_created`, `battle_finished`, `checkin`. Add them to the funnel table, inside the consent gate. | Without them none of this can be judged. Half a day of work. | Client only |
| A2 | **Battle-text reactions** instead of a bare heart: *É super efetivo!* · *Acerto crítico!* · *Não foi muito efetivo…* · *Ficou confuso!*. Each is drawn as the games' battle box, with a type-coloured edge. The heart stays as "like" and counts for Hot. | The franchise's own voice for "this was great / this was clever / meh / I don't get it". Every reaction is a reason to come back. | Rules: an own-reaction diff, the same pattern as likes |
| A3 | **Pokégear: an in-app inbox.** Replies to you, @mentions, reactions to your post, a friend passing you on a board, a friend request, your turn in a battle. The mascot plays the courier (a new pose: holding an envelope). A dot on the account avatar. A push topic `social`, off by default and offered with `ReminderOffer` after the first reply. | The single biggest gap: today nobody knows someone answered them. | `users/{uid}/inbox`, written by the server (a `notify` action on `battle-notify`); rules let the owner read it and mark it read |
| A4 | **@mentions.** The composer autocompletes from `publicProfiles` (prefix search already exists). A mention renders as a link to the trainer card and feeds A3. | Turns posts into conversations. | Client parse plus A3 |
| A5 | **Report a post.** Three reasons. The report goes to the admin dashboard (it already lists feedback). Three reports hide the post until an admin looks. | Safety before growth: more traffic needs it. | A `reports` collection that anyone can create and only admins read |

## B. The forum becomes the Centro Pokémon

| # | Proposal | Device |
|---|---|---|
| B1 | **Diário do dia.** One system topic per day, created by the daily-puzzle cron: "Dia 312 — Cynthia (Platina) e Blue (Charizard)", with the day's lineup silhouettes and the puzzle number. Every "share to forum" from the challenge or the puzzle **lands in that day's thread** (today they go to `general`). It is pinned at the top of Hot until the next day. | The day as a place. Results are compared where people already are. |
| B2 | **Torneio da semana.** A weekly theme from a rotation (pure util, Monday UTC): "Monotipo Fogo", "Só Gen 3", "Time de Ginásio", "Sem lendários". Trainers post a team in the event thread with one tap from the builder (the team sheet image). Reactions vote. On Sunday the top post's author earns the title **Campeão da semana** and a frame stamped with the week. Team of the Week becomes this event's winner when one exists. | The franchise's tournament with a theme, every week. Gives the Strategist a stage. |
| B3 | **Pergunte ao Professor.** A strategy Q&A category. The author can mark one answer as accepted; its author gets a gold "Resposta do Professor" mark on the comment and XP. The Professor Oak system account seeds a weekly question. | Turns knowledge into status, not only teams. |
| B4 | **Avalie meu time.** Posting a team asks for feedback: the builder's analysis (weaknesses, threats) is attached automatically, and repliers rate it in three steps: "Pronto para a Liga" / "Quase lá" / "Precisa de treino". The author sees the verdict as an evolution line: Gible → Gabite → Garchomp. | The persona device again: progress as an evolution line. |
| B5 | **Diário de viagem** (the Traveler): share the Badge Case as a card ("4 de 8 em Red/Blue — próximo: Koga") into an *Aventuras* category, where others reply with tips for that gym. The card links to the Gyms page for that leader. | The Traveler gets a social life too. |

## C. The Champion Challenge becomes social

| # | Proposal | Device |
|---|---|---|
| C1 | **Sua liga** (friends board). A third tab on the ranking with your friends' rows for the day. `state` reads the caller's friendships on the server and returns their rows from the top 50. Plus "**Ana passou você** no Time do dia" as an inbox entry (A3). | A rival is the oldest engagement device in Pokémon (Blue *is* one). |
| C2 | **Assistir à vitória.** The day's #1 (and any podium run) can be replayed. A run is a seed plus its choices, so a `replay` action on `challenge.js` returns the public battle log for a podium run once the day's board is closed for it (it is already the player's own log). It plays on the same DS console with a "REPLAY" tag. | Watching the best is how players learn. It also makes the podium worth reaching. |
| C3 | **Temporada semanal.** A weekly board (the sum of each day's best score, per champion), stored beside the daily doc in the same transaction. The weekly top 3 earn a **season frame** (gold, silver, bronze) stamped with the week. | A reason to play all seven days, not only today. |
| C4 | **XP for Champion runs.** A win gives 30 XP and the Time do dia win 50 (official runs only; practice gives nothing). Today the challenge gives XP only through badges. | The daily heart should feed the level. |
| C5 | **Desafie um amigo com este time.** On the result screen, "Use o Time do dia contra um amigo": opens `ChallengeModal` with the day's team preset on both sides (a mirror). | Bridges the single-player loop into PvP. |
| C6 | **A Campeã comenta.** In the Diário do dia (B1), Cynthia and Blue "post" one line after the day closes, from data already computed: the biggest swing of the day, the most-used lead, how many beat them ("Só 7 treinadores me venceram hoje. Ana foi a mais rápida."). | The champions as characters, not only opponents. |

## D. The minigames become social

| # | Proposal | Device |
|---|---|---|
| D1 | **Como foi o dia.** After the daily puzzle, a distribution like the games' Pokédex completion screen: "Você acertou em 3 — 41% dos treinadores precisaram de 4". The daily-puzzle endpoint gets a `submit` action that increments one public `puzzleDays/{day}` counter by guess count. It reveals nothing about the answer. | Every solver sees the others; the day has a crowd. |
| D2 | **Amigos hoje.** On the same screen, your friends' emoji grids for today. They come from D1's submit, which writes a friend-readable row (guess count and the colour grid, never letters). | The Wordle effect, inside the app instead of WhatsApp. |
| D3 | **Duelo de quiz por link.** A quiz round becomes a seed: "Bati 9/10 na geração 4 — tente o mesmo quiz". The link (resultShareCode style, no answers) opens **the same questions** for the friend, and the end screen shows both scores side by side. It is posted to the forum or sent anywhere. | Zero server work. The first multiplayer for the quiz. |
| D4 | **Quem é esse Pokémon? ao vivo.** Once a week, in the Diário do dia, a silhouette (the onboarding's device) that the forum answers in comments. Answers stay hidden (blurred) until you answer yourself; the first ten correct answers get a reaction from the mascot. | Turns the forum itself into a minigame. |

## E. New persona journeys: chapter 2, the social one

Each persona journey gets a **second chapter**, drawn as the next stage of an
evolution line (chapter 1 = Gible, chapter 2 = Gabite, a later chapter 3 =
Garchomp). Chapter 2 unlocks when chapter 1 is done, and each walks the
trainer into the heart.

| Persona | Chapter 2 | Missions |
|---|---|---|
| Estrategista | **Professor de estratégia** | Post a team in the Torneio da semana (B2) · get an accepted answer in Pergunte ao Professor (B3) · rate 3 teams (B4) · receive 10 reactions |
| Viajante | **Diário de viagem** | Share your Badge Case (B5) · answer someone's gym question · build a team for a friend's run · complete one case |
| Desafiante | **Rival** | Beat a friend on a Champion board (C1) · win a quiz duel (D3) · post 3 results in the Diário do dia (B1) · reach a podium once |
| Mestre Pokémon | **Lenda do Centro** | One mission from each of the three above |

A fourth interest for the onboarding is worth testing: "**Conversar e
compartilhar**" (the community). It would give a fifth persona, the
*Enfermeira Joy*-style **Anfitrião**: the Diário do dia first on Home,
replies and mentions first in the Pokégear, and a journey about welcoming new
trainers (answer a first post, react to 10 newcomers). Ship it only if A1
shows enough of the social trainers to justify it.

## F. The mascot as the social glue

- **Courier pose** for the Pokégear: an envelope in its paws, and it hops
  when a new entry arrives (once, quiet in the middle).
- **At the counter of the Diário do dia:** the day's header shows the mascot
  with the day's two champions as silhouettes behind it.
- **On result screens it compares,** never judges: "Você e a Ana empataram!"
  (`animado`), "Faltou um palpite para o top 10" (`determinado`).
- **The tone follows the trainer** (`personaTone`), so the ghost in your
  Pokégear is yours.

---

## Order of work (recommended)

1. **Phase 1, the first week (no new collections):**
   - A1, measure;
   - B1, Diário do dia (rides the cron);
   - A2, reactions;
   - C4, Champion XP;
   - D3, quiz duel by link;
   - C5, mirror challenge.

   Cheap, visible, and every later phase reads its numbers.
2. **Phase 2, the conversation:**
   - A3 Pokégear and A4 mentions (one action on `battle-notify`);
   - C1, Sua liga;
   - D1 and D2, the puzzle distribution and friends today;
   - A5, report;
   - E, the chapter 2 journeys for the parts already built.
3. **Phase 3, seasons:**
   - B2, Torneio da semana;
   - C3, the weekly season and its frames;
   - C2, replay of podium runs;
   - B3 and B4, Q&A and rate-my-team;
   - B5, D4, C6;
   - the Anfitrião persona if the numbers ask for it.

## What to watch (once A1 is in)

- Share of active days with at least one forum action (post, reply, reaction).
- Results shared per finished run (challenge and puzzle), and replies those
  shares get.
- D1/D7 return of trainers who received a reply (A3) against those who didn't.
- Friend requests per week, and battles started from C5.
- Persona chapter 2 completion, by persona.
