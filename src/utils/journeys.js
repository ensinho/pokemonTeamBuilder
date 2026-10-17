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
];

export const JOURNEYS_BY_ID = Object.fromEntries(JOURNEYS.map((journey) => [journey.id, journey]));

/**
 * Every journey with its missions resolved against `facts`: `done` per
 * mission, `doneCount`/`total`/`percent`/`isComplete` per journey, and the
 * 1-based `level` the UI shows ("Level 2").
 */
export const evaluateJourneys = (facts = {}) =>
    JOURNEYS.map((journey, index) => {
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
            level: index + 1,
            missions,
            doneCount,
            total: missions.length,
            percent: Math.round((doneCount / missions.length) * 100),
            isComplete: doneCount === missions.length,
        };
    });

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
