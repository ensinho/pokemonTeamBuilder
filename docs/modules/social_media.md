# Social media

How PokemonBuilder shows up on Instagram (`@pokemonbuilder_`, English, started
2026-11), what the evidence says to post, and how a reel is produced here.

Working files live outside the repo: the swipe file at
`~/.claude/instagram/swipe.md` (written by `/instagram-agent:ig-viral`) and the
rendered videos in `brag-output-*/` (git-ignored).

## The research (2026-11-11)

**Method.** 148 YouTube Shorts across 13 English Pokémon channels, about 12
recent Shorts each. Each video is ranked by its **outlier multiple**: its views
divided by that channel's own median over the same recent Shorts. Raw views
are not used. The hook is what was said in the first 3 seconds (auto-captions);
27 silent videos use the title instead.

**Channels.**

| Group | Channel | Subscribers | Median views |
| --- | --- | --- | --- |
| Direct | @bainVGC | 179 | 8,950 |
| Direct | @MaikiPKC | 88 | 71,500 (4 Shorts only) |
| Direct | @BraxVGC | 8,990 | 182,000 |
| Direct | @Obscvrityy | 7,030 | 2,550 |
| Direct | @Mr502 | 1,460 | 1,300 |
| Direct | @Kneeckoh | 16,700 | 15,500 |
| Adjacent | @buzzingaquizzes | 4,180 | 2,850 |
| Adjacent | @MonManPokemon | 13,600 | 1,950 |
| Adjacent | @Poke_Vio | 24,400 | 54,000 |
| Adjacent | @PokeGuruPlus | 30,500 | 14,500 |
| Outsized (format only) | @WolfeyVGC | 2.4M | 1.55M |
| Outsized (format only) | @MoxieBoosted | 249K | 158,500 |
| Outsized (format only) | @skrawvgc | 115K | 201,000 |

**What beat its own channel (11 videos above 3x).**

| Shape | Count | Channels | Example hook (theirs, for reference only) |
| --- | --- | --- | --- |
| Play-along game: the viewer answers before the video does | 7 | @MonManPokemon x3, @PokeGuruPlus x2, @Poke_Vio, @buzzingaquizzes | "who's that Pokemon I am the only non-electric..." (8.7x) |
| New Mega, instant verdict | 3 | @MoxieBoosted, @BraxVGC x2 | "Mega Golisopod has just had its ability revealed" (5.6x) |
| Open decision mid-battle | 1 | @Mr502 | "There's not much downside of committing grass tera early here, right?" (7.5x) |

**What sat in the bottom third.** Tournament results and event vlogs (0.1x to
0.3x on three channels), menu tutorials ("simply navigate to..."), gameplay
clips that start without a question.

**What did not matter.** Hook length (10 words in the top third, 9 in the
bottom). The exact sentence: @buzzingaquizzes uses one hook at 32x and at
0.5x, so the subject carries it.

**Limits.** This is YouTube Shorts, not Instagram; the Instagram check needs
Enzo's logged-in browser and has not been done. The median comes from the same
12 to 14 recent Shorts, and the newest ones are still collecting views. The
"new Mega" finding rests on 3 videos from 2 channels. Re-run the research
about once a month; formulas last a season.

## What we post

1. **Riddle, in first person** ("Who's that Pokémon?"). The strongest shape in
   the research and the closest to what the app already is (PokéPuzzle, Quiz).
2. **Pick and reveal** ("Pick a starter. I'll build the other five around it.").
3. **Team verdict** ("Is this team actually good? Six Pokémon, one grade."),
   which is the builder's own `rateTeam`.

Not worth making: tournament recaps, how-to-use-the-menu tutorials.

## The riddle format

- **Frame 1** already has the eyebrow `WHO'S THAT POKÉMON?`, the silhouette on
  its disc and the hook line. No intro, no logo sting.
- **Hook** is a contradiction said by the Pokémon, with a number in it.
- **Three clues, hardest first.** Every clue must be checkable against our own
  data (`src/constants/typeChart.js`, the baked dex). Never a usage claim we
  cannot back.
- **Countdown, reveal, payoff.** The payoff shows what the hook promised.
- **Last line echoes the hook**; **one ask**: comment which clue gave it away.
- **Devices** follow `creative_direction.md`: silhouette for "not known yet",
  the evolution line as a clue, type colours as tones, official artwork as the
  protagonist of the reveal.
- **Safe zone** on 1080x1920: nothing above y=230 or below y=1440, text inside
  x 80..850 (Instagram's interface covers the rest).
- **Copy the formula, never the video**: no other creator's script, voice or
  edit.

## The reel standard (Enzo, 2026-11-11)

After the first reel ("o do Tyranitar ficou meio genérico, a música ainda"),
Enzo set the bar for every video from now on: the mascot is the fixed
character, the edit is dynamic and the music is not a stock bed. A reel that
misses one of these is not finished.

1. **The mascot hosts, always.** He is on screen from frame 1 to the last, in
   every video, drawn live from the app's own rig
   (`node scripts/social/mascot-bundle.mjs <composition>/assets/mascot.js` →
   `window.PBMascot`), never a screenshot or the static icon. See
   `mascot.md`.
2. **His personality is the commentary.** Every scene gives him a mood and a
   pose from `catalog.js` by name, plus a line of one to four words in his
   speech bubble. He reacts like a viewer who is one step ahead: thinks, gets
   suspicious, gets it, celebrates. A change of scene is a hop. He asks the
   closing question, so the Pokémon keeps the riddle's voice and the host
   keeps the ask.
3. **Each reel has its own score.** `scripts/social/chipscore.py` composes a
   four-voice chiptune from the reel's `score.json` (tempo, chords, layers per
   bar, an original lead). Never a stock "corporate" track, never a melody
   transcribed from the games. The arc is fixed: sparse hook, drums in on the
   clues, a held beat before the reveal, the drop on the reveal, a stab to end.
4. **The edit is cut to the bars.** Scene starts, word entrances (16th notes),
   the countdown (one number per beat) and the reveal all sit on the score's
   grid; the kick envelope (`cues.js`) breathes through the glow and the disc.
5. **Something changes every bar.** A new clue, a new prop on stage, a camera
   punch, a tint change. Each clue is shown, not only written: the HP bar
   draining, 13 types going out around the disc, a ghost taking the empty slot.
6. **The first frame is already the hook**: big number, silhouette, mascot,
   motion. No intro.
7. **Checked before it is called done**: `hyperframes check` passes, the key
   frames are looked at (text never under the mascot, nothing outside the safe
   zone), and the file is probed for size and duration.

What is still open: nobody has listened to the score before Enzo does; the
composer cannot hear it. If a score sounds wrong, change `score.json` and
re-render, the edit follows the bars.

## Reel 1: Tyranitar (2026-11-11)

Made before the standard: no mascot, a stock music bed. Kept as the baseline.

`brag-output-2026-11-11-riddle-tyranitar/` — `reel-riddle-tyranitar.mp4`
(30s, 1080x1920, music and SFX, no voiceover), `brag.jpg` (cover),
`share-copy.txt` (caption).

| Time | On screen |
| --- | --- |
| 0.0 | 7 weaknesses should make me bad. I'm not. |
| 3.0 | You get 3 clues. Guess before the last one. |
| 5.5 | Clue 1: One type hits me 4 times as hard. |
| 9.0 | Clue 2: I walk in. A sandstorm starts. |
| 12.5 | Clue 3: Larvitar → Lv 30 → Pupitar → Lv 55 → ?, 600 total base stats |
| 17.0 | 3 · 2 · 1 |
| 20.0 | I'm Tyranitar. Rock · Dark |
| 22.5 | Fighting ×4, Water, Grass, Ground, Bug, Steel, Fairy |
| 25.5 | 7 weaknesses. Still not bad. Comment the clue that gave me away. |

Hook scored 81.4 (STRONG) by the reel skill's `hookscore.py`.

## Reel 2: Shedinja (2026-11-11)

`brag-output-2026-11-11-riddle-shedinja/` — `reel-riddle-shedinja.mp4` (28s,
140 BPM, 16 bars), the first reel made to the standard above. Hook "I have
1 HP. 13 types can't touch me." (80.8). Clues: only 5 types can hurt it, it
takes the empty party slot when its sibling evolves, it is the shell left
behind. The scene-by-scene table with the host's moods is the folder's
`brag-plan.md`.

## Stories (2026-11-11)

Stories are for the people who already follow: depth, not reach. The kit in
`brag-output-2026-11-11-stories-kit/` has five interactive formats that are not
riddles, three frames each (open, ask, close), the mascot hosting every frame
under the same standard as the reels. `STORIES-GUIDE.md` there lists each
frame's text and the sticker to add.

| Set | Sticker | The ask |
| --- | --- | --- |
| This or that | Poll | "Your last slot. Who gets it?" |
| Spot the weakness | Quiz | "One type wrecks 4 of these 6. Which?" (answer computed from `typeChart.js`) |
| Ask the ghost | Question box | "Tell me your lead. I'll name its worst matchup." |
| Hot take | Emoji slider | "How wrong am I?" |
| Build with me | Poll, six days | "Slot 1. Who leads?" |

Rules: the sticker is added in Instagram (a video cannot carry one), so every
ask frame leaves an empty lit panel for it; text stays between y=250 and
y=1600; one idea per frame; any fact in a quiz is computed from our data, not
remembered; a close frame that promises "tomorrow" is posted only when the
follow-up will happen; they act first, then we reply. New sets are a
`stories.json` edit (`composition/build.mjs` writes the composition and the
score).

## X / Twitter cards (2026-11-11)

16:9 cards (1200x675) in the "Blind Spot Quiz" look: dot-grid dark card, a
mono pill on top, a bold two-line question, A/B/C/D options, the subject on the
right, the mascot with a short line, the wordmark and "reply ..." in the
footer. Four proposals in `brag-output-2026-11-11-x-posts/posts/` (PNG + the
text, alt text and the next-day answer in `posts.txt`):

| Card | Ask | Ties to |
| --- | --- | --- |
| Champion Challenge | "Two Champions. One room. Who first?" A Cynthia / B Blue | `/challenge` |
| PokéPuzzle practice board | three coloured guesses, "What's guess 4?" (answer Lucario) | `/pokepuzzle` |
| Blind Spot Quiz #2 | six Eeveelutions, which type hits hardest (answer Bug, 3 of 6) | the analyzer; also answers #1 (Fairy, 5 of 6) |
| Rate my team | "Six pseudo-legendaries scored 88. Can your six beat it?" | `rateTeam`, `/builder`, `/t/:id` |

Rules: quiz answers and scores are computed with `analyzeTeam` / `rateTeam`
(bundle `src/utils/teamAnalysis.js` with esbuild to run it in Node), never
remembered; a puzzle board's colours are computed from the answer; the answer
is a reply the next day, never in the post; a series keeps its number (Blind
Spot Quiz #1, #2...). The cards are still frames of a Hyperframes composition
(`composition/index.html`, `hyperframes snapshot --at`).

## Producing the next one

1. `/instagram-agent:ig-reel` for the hook (scored) and the timed script.
2. Copy the Shedinja composition folder. Change: the artwork ids in
   `assets/art/`, the clue lines and their stage props, the `HOST` table (mood,
   pose, line per scene), the tints and `score.json` (new key, new lead).
3. Rebuild the mascot bundle and the score, then check and render: the
   folder's `composition/RENDER-NOTES.md` has the commands (this machine has
   no system ffmpeg; Hyperframes needs `HYPERFRAMES_FFMPEG_PATH` /
   `HYPERFRAMES_FFPROBE_PATH`).
4. Enzo posts it. Nothing here posts, follows, likes or messages.
5. After a week, record the reel's own numbers and compare them with the
   account's median, the same way the research ranks everyone else.
