# The social heart — forum, Champion Challenge, minigames (2026-11-06)

Built from [plans/social-heart.md](../plans/social-heart.md) (all three phases).
The idea: **one place a day where everyone meets** — the forum as the Centro
Pokémon, the day's results landing in it, friends answering each other, and
the persona journeys' chapter 2 walking each trainer in.

## Pieces

| Feature | Where | Notes |
|---|---|---|
| **Diário do dia** | `utils/forumDiary.js`, `forum/DiaryBanner.jsx` | One topic per challenge day (`diary-YYYY-MM-DD`, Brasília). Created by the first signed-in trainer who opens the forum or shares, or by the daily cron (`api/_lib/championNotes.js`). Rules: `validDiaryTopic` accepts only that exact system doc. Today's is pinned first. Puzzle and Champion shares land there (`useForumStore.postToDiary`). Sundays: **Quem é esse Pokémon?** — a silhouette from the day (`silhouetteOfDay`), right answers hidden until you name it. |
| **Champion notes** | `api/_lib/championNotes.js`, `forum/ChampionNote.jsx` | The daily cron writes yesterday's numbers (played, wins, fastest) as `note-{champion}` messages in yesterday's diary; the client words them. |
| **Battle-text reactions** | `utils/forumReactions.js`, `forum/ReactionBar.jsx` | `reactions: { uid: kind }` on topics and messages; rules `touchesOnlyOwnReaction`. Count with likes for Hot. |
| **Report** | `useForumStore.reportPost`, `public/data/reports` | Three reports hide a comment (`isHiddenByReports`) until an admin looks. |
| **Pokégear** | `store/useInboxStore.js`, `pokegear/*`, `api/_lib/socialNotify.js` | `users/{uid}/inbox`, written by the server through `api/battle-notify.js` kinds `forumMessage`, `reaction`, `friendRequest` (ids only; recipients re-derived) and by the challenge (`passed`). Push topic `social` is **opt-in** (`OPT_IN_TOPICS` in webPush). |
| **@mentions** | `utils/forumMentions.js`, `CommentComposer` | Suggestions from the thread and friends, no network. A name with a space cannot be mentioned. |
| **Sua liga** | `api/_lib/challenge/ranking.js` `friendBoards`, `passedFriends` | `state` returns `friends` per board; a win that passes a friend writes their inbox. |
| **Weekly season** | `ranking.js` `nextWeekRanks` / `publicWeekRanks` | `challengeRanks/week-YYYY-Www[_blue]`: each day's best summed. "Semana" tab. |
| **Como venceu** | `actions.js` `report` | A podium run's win-chance curve only. |
| **Champion XP** | `utils/trainerLevel.js` | 30 per official win, +20 with the Time do dia. |
| **Puzzle day** | `api/_lib/puzzleDay.js`, `pokepuzzle/PuzzleDayPanel.jsx` | `daily-puzzle` POST counts a result once; `puzzleDays/{day}` counters + `players/{uid}` colour grids (never letters). |
| **Quiz duel** | `resultShareCode.js` `encodeQuizDuel`, `QuizDuelBanner.jsx` | `?duel=` carries generations and the mark. |
| **Torneio da semana** | `utils/forumWeekly.js`, `forum/WeeklyBanner.jsx` | `weekly-YYYY-Www` topic, theme rotation; votes = likes + reactions. |
| **Pergunte ao Professor** | `CommentList` QaContext, `acceptAnswer` | Category `questions`; `acceptedMessageId` / `acceptedAuthorId` on the topic. |
| **Avalie meu time** | `utils/teamRating.js`, `RatingVerdict.jsx` | `rating` on replies; the verdict as Gible → Gabite → Garchomp. |
| **Badge Case share** | `home/BadgeCase.jsx`, `forum/BadgeCaseCard.jsx` | A topic in `adventures` with `sharedBadgeCase`. |
| **Chapter 2 journeys** | `utils/journeys.js` (`chapter: 2`), `isChapterOpen` | Open after chapter 1 (the Master's after any one); locked ones are silhouettes. |
| **Community badges** | `constants/badges.jsx` `markBadge`, `services/socialRecord.js` | Weekly Champion, Season Podium, Professor's Pick — from marks recorded once a session; unlock `title_weekly`, `title_professor`, `frame_season`. |

## Invariants

- **Ids, never recipients**: every notice the client asks for is re-derived on the server from stored docs.
- **No letters leave the puzzle**: rows are c/p/a only, on the server and in the forum.
- **Opt-in for social push**, opt-out for the daily ones.
- **Still 9 endpoints of 12, still 2 crons**: everything rides `battle-notify`, `daily-puzzle` and `challenge`.
- New `users/{uid}` collection `inbox` is in `USER_COLLECTIONS`.
