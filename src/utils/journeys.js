import { TEAM_SIZE, summarizeTeam } from './homeStatus';

/**
 * Journeys — the onboarding that keeps going (2026-10-17). Five levels, each a
 * short list of missions that teach one part of the app by having the trainer
 * do it: open the Pokédex, fill six slots, post on the forum. A finished
 * journey earns its badge (constants/badges.jsx, category `journey`).
 *
 * Pure on purpose: every mission is a predicate over one `facts` object
 * (built by useTrainerBadges from the stores), so what counts as done is
 * tested here and never re-derived in a view. Copy lives in translations.js
 * under `journeys.<journeyId>.*` and `journeys.missions.<missionId>.*`.
 *
 * A mission's `to` is where its "Go" button leads; `action` names a step the
 * shell performs instead of a route (open the partner picker, the sign-up
 * dialog). `progress` is for a mission with a count worth showing (3/6).
 */

/** The marks a page visit leaves (AppLayout records them per `currentPage`). */
export const PAGE_MARKS = {
    pokedex: 'pokedex',
    pokemonDetail: 'pokemonDetail',
    meta: 'meta',
    damageCalc: 'damageCalc',
    speedTiers: 'speedTiers',
    journeys: 'journeys',
    // The persona journeys' pages (2026-11-05).
    bestTeams: 'bestTeams',
    tournaments: 'tournaments',
    gyms: 'gyms',
    types: 'types',
    moves: 'moves',
};

/** Every mark the app can leave: page visits plus the actions it records. */
export const JOURNEY_MARKS = [
    ...Object.values(PAGE_MARKS),
    'memberEdited',     // saved a member in the team editor (item, moves, nature…)
    'showdownExport',   // exported a team to Showdown
    'shareLink',        // created a share link for a team
    'forumPost',        // posted a forum message (the server count lags a minute)
    'forumTeamShare',   // attached a team to a forum message
    'quizGuess',        // named a Pokémon right in the Quiz, either mode
    'challengePlayed',  // started a Champion Challenge run
    'threatsViewed',    // opened the builder's meta threats with a team on it
    'playthroughTeam',  // built in playthrough mode (no format), a run's team
    // The social chapter (2026-11-06, docs/plans/social-heart.md E)
    'weeklyEntry',      // entered a team in the Torneio da semana
    'teamRated',        // gave a verdict on someone's shared team
    'questionAsked',    // opened a question in Pergunte ao Professor
    'acceptedAnswer',   // an answer of yours was accepted (read by socialRecord)
    'badgeCaseShared',  // shared the Badge Case on the forum
    'adventureReply',   // answered someone's adventure
    'diaryShare',       // shared a result in the Diário do dia
    'diaryReact',       // reacted to something in the Diário do dia
    'beatFriend',       // above a friend on a Champion board (Sua liga)
    'quizDuelWon',      // beat the mark of a quiz duel
    'podium',           // a Champion podium (top 3) of the day
    'weeklyChampion',   // won a week's tournament (socialRecord)
    'seasonPodium',     // top 3 of a Champion week (socialRecord)
];

const has = (facts, mark) => Boolean(facts.marks?.[mark]);

/** Teams worth judging: saved ones, plus the one being built right now. */
const allTeams = (facts) => {
    const teams = [...(facts.savedTeams || [])];
    if (facts.currentTeam?.length) teams.push({ pokemons: facts.currentTeam });
    return teams;
};

const largestTeam = (facts) =>
    allTeams(facts).reduce((max, team) => Math.max(max, (team.pokemons || []).filter(Boolean).length), 0);

/**
 * A full team with no type that hits three or more of its members super
 * effectively — the "weak point" the Home's trainer card warns about.
 */
export const hasBalancedTeam = (facts) =>
    allTeams(facts).some((team) => {
        const summary = summarizeTeam(team, facts.typesById);
        return summary.size >= TEAM_SIZE && (!summary.weakness || summary.weakness.count < 3);
    });

export const JOURNEYS = [
    {
        id: 'first-steps',
        badgeId: 'badge_journey_first_steps',
        missions: [
            { id: 'partner', action: 'partner', to: '/', done: (f) => Boolean(f.greetingPokemonId) },
            { id: 'pokedex', to: '/pokedex', done: (f) => has(f, 'pokedex') },
            { id: 'pokemonDetail', to: '/pokedex', done: (f) => has(f, 'pokemonDetail') },
            { id: 'favorite', to: '/pokedex', done: (f) => (f.favoritesCount || 0) >= 1 },
        ],
    },
    {
        id: 'first-team',
        badgeId: 'badge_journey_first_team',
        missions: [
            { id: 'addPokemon', to: '/builder', done: (f) => largestTeam(f) >= 1 },
            {
                id: 'fullTeam',
                to: '/builder',
                done: (f) => largestTeam(f) >= TEAM_SIZE,
                progress: (f) => ({ current: Math.min(largestTeam(f), TEAM_SIZE), target: TEAM_SIZE }),
            },
            { id: 'customize', to: '/builder', done: (f) => has(f, 'memberEdited') },
            { id: 'saveTeam', to: '/builder', done: (f) => (f.teamsCount || 0) >= 1 },
        ],
    },
    {
        id: 'strategy',
        badgeId: 'badge_journey_strategy',
        missions: [
            { id: 'balanced', to: '/builder', done: hasBalancedTeam },
            { id: 'meta', to: '/meta', done: (f) => has(f, 'meta') },
            { id: 'damageCalc', to: '/damage-calculator', done: (f) => has(f, 'damageCalc') },
            { id: 'speedTiers', to: '/speed-tiers', done: (f) => has(f, 'speedTiers') },
            { id: 'showdown', to: '/builder', done: (f) => has(f, 'showdownExport') },
        ],
    },
    {
        id: 'community',
        badgeId: 'badge_journey_community',
        missions: [
            { id: 'account', action: 'signUp', to: '/profile', done: (f) => f.isAnonymous === false },
            { id: 'forumPost', to: '/feed', done: (f) => (f.forumMessages || 0) >= 1 || has(f, 'forumPost') },
            { id: 'shareTeam', to: '/builder', done: (f) => has(f, 'shareLink') || has(f, 'forumTeamShare') },
            { id: 'friend', to: '/friends', done: (f) => (f.friendsCount || 0) >= 1 },
        ],
    },
    {
        id: 'league',
        badgeId: 'badge_journey_league',
        missions: [
            { id: 'puzzle', to: '/pokepuzzle', done: (f) => (f.pokepuzzleWins || 0) >= 1 },
            { id: 'quiz', to: '/quiz', done: (f) => has(f, 'quizGuess') || (f.completedQuizzesCount || 0) >= 1 },
            { id: 'challenge', to: '/challenge', done: (f) => has(f, 'challengePlayed') },
            { id: 'battle', to: '/battles', done: (f) => (f.battlesCount || 0) >= 1 },
            { id: 'equipBadge', to: '/journeys?tab=badges', done: (f) => Boolean(f.selectedBadgeId) },
        ],
    },
    {
        // The two champions of the Champion Challenge (2026-11-05, Enzo): beat
        // each, win with the Time do dia, then both in one day. Read from the
        // trainer's own official runs (`facts.challenge`, utils/challengeRecord.js).
        id: 'champions',
        badgeId: 'badge_journey_champions',
        missions: [
            { id: 'beatCynthia', to: '/challenge?champion=cynthia', done: (f) => (f.challenge?.winsBy?.cynthia || 0) >= 1 },
            { id: 'beatBlue', to: '/challenge?champion=blue', done: (f) => (f.challenge?.winsBy?.blue || 0) >= 1 },
            { id: 'dailyTeamWin', to: '/challenge', done: (f) => (f.challenge?.dailyTeamWins || 0) >= 1 },
            { id: 'bothSameDay', to: '/challenge', done: (f) => (f.challenge?.bothPlayedDays || 0) >= 1 },
            { id: 'dailyDouble', to: '/challenge', done: (f) => (f.challenge?.bothDailyWonDays || 0) >= 1 },
        ],
    },
];

/** A team of six where every member has its four moves chosen. */
const hasFinishedSets = (facts) =>
    allTeams(facts).some((team) => {
        const members = (team.pokemons || []).filter(Boolean);
        return members.length >= TEAM_SIZE
            && members.every((p) => (p.customization?.moves || []).filter(Boolean).length >= 4);
    });

const challengeWins = (facts) => Object.values(facts.challenge?.winsBy || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);

/**
 * The persona journeys (2026-11-05): one per trainer profile, beside the six
 * levels rather than in their order — they never change "the current level",
 * the level count or the Home's journey card. Shown to the trainer whose
 * persona they are (all three for a Pokémon Master); anyone may finish one,
 * and its badge counts like any journey's. `persona` matches PERSONAS ids.
 */
export const PERSONA_JOURNEYS = [
    {
        id: 'persona-strategist',
        persona: 'strategist',
        badgeId: 'badge_persona_strategist',
        missions: [
            { id: 'pBestTeams', to: '/best-teams', done: (f) => has(f, 'bestTeams') },
            { id: 'pTournaments', to: '/tournaments', done: (f) => has(f, 'tournaments') },
            { id: 'pThreats', to: '/builder', done: (f) => has(f, 'threatsViewed') },
            { id: 'pFinishedSets', to: '/builder', done: hasFinishedSets },
        ],
    },
    {
        id: 'persona-traveler',
        persona: 'traveler',
        badgeId: 'badge_persona_traveler',
        missions: [
            { id: 'pGyms', to: '/gyms', done: (f) => has(f, 'gyms') },
            { id: 'pTypes', to: '/types', done: (f) => has(f, 'types') },
            { id: 'pPlaythrough', to: '/builder', done: (f) => has(f, 'playthroughTeam') },
            { id: 'pMoves', to: '/moves', done: (f) => has(f, 'moves') },
        ],
    },
    {
        id: 'persona-challenger',
        persona: 'challenger',
        badgeId: 'badge_persona_challenger',
        missions: [
            {
                id: 'pPuzzles',
                to: '/pokepuzzle',
                done: (f) => (f.pokepuzzleWins || 0) >= 3,
                progress: (f) => ({ current: Math.min(f.pokepuzzleWins || 0, 3), target: 3 }),
            },
            {
                id: 'pStreak',
                to: '/',
                done: (f) => (f.bestStreak || 0) >= 3,
                progress: (f) => ({ current: Math.min(f.bestStreak || 0, 3), target: 3 }),
            },
            { id: 'pPerfectQuiz', to: '/quiz', done: (f) => (f.perfectQuizzesCount || 0) >= 1 },
            { id: 'pChampionWin', to: '/challenge', done: (f) => challengeWins(f) >= 1 },
        ],
    },
    // ── Chapter 2: the social one (2026-11-06, docs/plans/social-heart.md E).
    // The next stage of the evolution line: it opens once chapter 1 is done
    // (JourneyList), and walks each persona into the Centro Pokémon.
    {
        id: 'persona-strategist-2',
        persona: 'strategist',
        chapter: 2,
        badgeId: 'badge_persona_strategist_2',
        missions: [
            { id: 'p2WeeklyEntry', to: '/feed?cat=teams', done: (f) => has(f, 'weeklyEntry') },
            { id: 'p2QuestionAsked', to: '/feed?cat=questions', done: (f) => has(f, 'questionAsked') },
            { id: 'p2TeamRated', to: '/feed?cat=teams', done: (f) => has(f, 'teamRated') },
            { id: 'p2AcceptedAnswer', to: '/feed?cat=questions', done: (f) => has(f, 'acceptedAnswer') },
        ],
    },
    {
        id: 'persona-traveler-2',
        persona: 'traveler',
        chapter: 2,
        badgeId: 'badge_persona_traveler_2',
        missions: [
            { id: 'p2CaseShared', to: '/', done: (f) => has(f, 'badgeCaseShared') },
            { id: 'p2AdventureReply', to: '/feed?cat=adventures', done: (f) => has(f, 'adventureReply') },
            { id: 'p2DiaryReact', to: '/feed?cat=diary', done: (f) => has(f, 'diaryReact') },
            { id: 'p2CaseComplete', to: '/', done: (f) => Boolean(f.badgeCaseFull) },
        ],
    },
    {
        id: 'persona-challenger-2',
        persona: 'challenger',
        chapter: 2,
        badgeId: 'badge_persona_challenger_2',
        missions: [
            { id: 'p2DiaryShare', to: '/pokepuzzle', done: (f) => has(f, 'diaryShare') },
            { id: 'p2QuizDuelWon', to: '/quiz', done: (f) => has(f, 'quizDuelWon') },
            { id: 'p2BeatFriend', to: '/challenge', done: (f) => has(f, 'beatFriend') },
            { id: 'p2Podium', to: '/challenge', done: (f) => has(f, 'podium') },
        ],
    },
    {
        id: 'persona-master-2',
        persona: 'master',
        chapter: 2,
        badgeId: 'badge_persona_master_2',
        missions: [
            { id: 'p2mWeekly', to: '/feed?cat=teams', done: (f) => has(f, 'weeklyEntry') },
            { id: 'p2mCase', to: '/', done: (f) => has(f, 'badgeCaseShared') },
            { id: 'p2mFriend', to: '/challenge', done: (f) => has(f, 'beatFriend') },
            { id: 'p2mDiary', to: '/feed?cat=diary', done: (f) => has(f, 'diaryShare') },
        ],
    },
];

export const JOURNEYS_BY_ID = Object.fromEntries([...JOURNEYS, ...PERSONA_JOURNEYS].map((journey) => [journey.id, journey]));

/**
 * Every journey with its missions resolved against `facts`: `done` per
 * mission, `doneCount`/`total`/`percent`/`isComplete` per journey, and the
 * 1-based `level` the UI shows ("Level 2").
 */
const evaluate = (list, facts) =>
    list.map((journey, index) => {
        const missions = journey.missions.map((mission) => ({
            id: mission.id,
            to: mission.to,
            action: mission.action || null,
            done: Boolean(mission.done(facts)),
            progress: mission.progress ? mission.progress(facts) : null,
        }));
        const doneCount = missions.filter((m) => m.done).length;
        return {
            id: journey.id,
            badgeId: journey.badgeId,
            persona: journey.persona || null,
            chapter: journey.chapter || 1,
            level: index + 1,
            missions,
            doneCount,
            total: missions.length,
            percent: Math.round((doneCount / missions.length) * 100),
            isComplete: doneCount === missions.length,
        };
    });

export const evaluateJourneys = (facts = {}) => evaluate(JOURNEYS, facts);

/** The persona journeys, resolved like the levels (their `level` is unused). */
export const evaluatePersonaJourneys = (facts = {}) => evaluate(PERSONA_JOURNEYS, facts);

/** Which persona journeys a trainer is shown: theirs, or all three for the Master. */
export const personaJourneyFilter = (personaId) => (journey) => {
    if (!personaId) return false;
    if (journey.chapter === 2) return journey.persona === personaId;
    return personaId === 'master' || journey.persona === personaId;
};

/** A chapter 2 opens when its chapter 1 is done (the Master's, when any one is). */
export const isChapterOpen = (journey, journeys = []) => {
    if (journey.chapter !== 2) return true;
    const firsts = journeys.filter((j) => j.chapter !== 2);
    return journey.persona === 'master'
        ? firsts.some((j) => j.isComplete)
        : firsts.some((j) => j.persona === journey.persona && j.isComplete);
};

/**
 * The journey the trainer is on: the first one not finished. Levels are an
 * order, not a lock — a veteran who already posted on the forum sees that
 * mission done the day journeys appear — so "current" is simply the lowest
 * level with something left. Null once all five are complete.
 */
export const currentJourney = (journeys = []) => journeys.find((j) => !j.isComplete) || null;

/** The next mission left in a journey, in the journey's own order. */
export const nextMission = (journey) => journey?.missions.find((m) => !m.done) || null;

/** Find one evaluated mission by id, with the journey it belongs to. */
export const findMission = (journeys = [], missionId) => {
    for (const journey of journeys) {
        const mission = journey.missions.find((m) => m.id === missionId);
        if (mission) return { journey, mission };
    }
    return null;
};

/** Totals across every journey, for the page header. */
export const journeyTotals = (journeys = []) => ({
    journeysDone: journeys.filter((j) => j.isComplete).length,
    journeysTotal: journeys.length,
    missionsDone: journeys.reduce((sum, j) => sum + j.doneCount, 0),
    missionsTotal: journeys.reduce((sum, j) => sum + j.total, 0),
});

/**
 * How loud the Home should be about the journey (2026-10-17, Enzo): a new
 * trainer — still on the first two levels, with only a handful of missions
 * done and less than a week of visits — gets it front and centre, because it
 * is their way in. Anyone past that is an active trainer, who gets a small
 * "next step" card instead of a banner. `none` once every level is done.
 */
export const NEW_TRAINER_MAX_MISSIONS = 6;
export const NEW_TRAINER_MAX_DAYS = 7;

export const journeyEmphasis = (journeys = [], { activeDays = 0 } = {}) => {
    const current = currentJourney(journeys);
    if (!current) return 'none';
    const { missionsDone } = journeyTotals(journeys);
    const isNew = current.level <= 2
        && missionsDone < NEW_TRAINER_MAX_MISSIONS
        && activeDays < NEW_TRAINER_MAX_DAYS;
    return isNew ? 'focus' : 'compact';
};
