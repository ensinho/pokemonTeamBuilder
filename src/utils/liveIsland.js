/**
 * The island (2026-11-17, "Fantasminha de plantão"): a Live Activity of
 * what is alive right now — the ai-app-widgets grammar (a black pill, the
 * moment's own figure, a spring to the full card) with the mascot's face as
 * the readout. Pure: what is going on in, the one thing to show out.
 *
 * mascot.md once declined "a floating always-on companion" because the
 * JourneyCoach holds that corner; the island is the exception Enzo approved
 * on 2026-11-17, on three conditions kept here:
 * - it exists only while something is live — nothing live, no island;
 * - one thing at a time, by who waits on the trainer: a friend's battle,
 *   then a game left half-way, then the round's receipt;
 * - never beside the JourneyCoach, and never on the page that already shows
 *   the thing (the quiz on /quiz, the battle on /battles).
 *
 * A trainer can put an item away ("Agora não"); it comes back only when it
 * changes (its `sig`), never on its own.
 *
 * Inside the games it is always there (Enzo, 2026-11-17: "ela pode aparecer
 * toda vez que eu tiver dentro dos jogos"): on the pages of the day's games
 * the island is the day itself — the four as pips, what is left, the next
 * one a tap away — unless a friend's battle waits, which still comes first.
 * The Champion's console keeps the whole screen (its touch controls sit
 * where the island would).
 */

/** The pages of the day's games, where the island shows the day. */
export const GAME_PATHS = ['/games', '/quiz', '/pokepuzzle', '/tier-list'];
export const isGamesPath = (path = '') => GAME_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

/** Where each of the day's games opens (the Jogos page's own doors). */
export const GAME_DOORS = {
    challenge: '/challenge',
    pokepuzzle: '/pokepuzzle',
    quiz: '/quiz?tab=categories&daily=1',
    tierList: '/tier-list?daily=1',
};
/** Each game's tone key (utils/navHue.js). */
export const GAME_NAV = { challenge: 'challenge', pokepuzzle: 'pokepuzzle', quiz: 'generationQuiz', tierList: 'tierList' };

/** The day's title in the island's card: what is left, or the full day. */
export const dayTitle = (t, tally) => (tally.complete ? t('island.day.complete')
    : tally.played === 0 ? t('island.day.fresh')
        : tally.total - tally.played === 1 ? t('island.day.leftOne')
            : t('island.day.left', { n: tally.total - tally.played }));

/** The daily game a page is, or null (`/games` is all four). */
export const gameOfPath = (path = '') => ({ '/quiz': 'quiz', '/pokepuzzle': 'pokepuzzle', '/tier-list': 'tierList' }[path] || null);

export const ISLAND_ORDER = ['battle', 'quiz', 'puzzle', 'receipt'];

// Pages that own the whole screen: the Champion's console, a battle in progress.
const QUIET_PATHS = ['/challenge', '/battles/'];
const OWN_PAGE = {
    battle: (path) => path.startsWith('/battles'),
    quiz: (path) => path.startsWith('/quiz') || path.startsWith('/guesser'),
    puzzle: (path) => path.startsWith('/pokepuzzle'),
    // On Home the mascot's note of the day already says it.
    receipt: (path) => path === '/',
};

/**
 * @param {object} live
 * @param {{ id: string, name: string|null, count: number }|null} live.battle  the first battle waiting on the trainer
 * @param {{ found: number, total: number, list: string }|null} live.quiz     today's category, started and not closed
 * @param {{ attempts: number, max: number, n: number }|null} live.puzzle     today's PokéPuzzle, started and not over
 * @param {{ news: number }|null} live.receipt                                the round's receipt, waiting
 * @param {{ played: number, total: number }|null} live.day                 the day's tally (shown inside the games)
 * @param {string} live.path        the current path
 * @param {boolean} live.coach      the JourneyCoach is on screen
 * @param {object} live.dismissed   kind → the sig the trainer put away
 * @returns {{ kind: string, sig: string } & object | null}
 */
export function pickLive({ battle = null, quiz = null, puzzle = null, receipt = null, day = null, path = '/', coach = false, dismissed = {} } = {}) {
    if (coach || QUIET_PATHS.some((p) => path.startsWith(p))) return null;
    if (isGamesPath(path)) {
        if (battle?.id && dismissed.battle !== `${battle.id}:${battle.count || 1}`) return { kind: 'battle', ...battle, sig: `${battle.id}:${battle.count || 1}` };
        if (!day) return null;
        const sig = `day:${day.played}`;
        return dismissed.day === sig ? null : { kind: 'day', ...day, receipt: Boolean(receipt), sig };
    }
    const items = {
        battle: battle && battle.id ? { ...battle, sig: `${battle.id}:${battle.count || 1}` } : null,
        quiz: quiz && quiz.total > 0 && quiz.found > 0 && quiz.found < quiz.total ? { ...quiz, sig: `${quiz.list}:${quiz.found}` } : null,
        puzzle: puzzle && puzzle.attempts > 0 && puzzle.attempts < puzzle.max ? { ...puzzle, sig: `${puzzle.n}:${puzzle.attempts}` } : null,
        receipt: receipt && receipt.news > 0 ? { ...receipt, sig: `receipt:${receipt.day || ''}` } : null,
    };
    for (const kind of ISLAND_ORDER) {
        const item = items[kind];
        if (!item || OWN_PAGE[kind](path) || dismissed[kind] === item.sig) continue;
        return { kind, ...item };
    }
    return null;
}

/** His face for each kind: the state, read at a glance. */
export const ISLAND_MOODS = { battle: 'determinado', quiz: 'pensando', puzzle: 'curioso', receipt: 'feliz', day: 'feliz' };

/** His face for the day: set to start, glad along the way, proud at four of four. */
export const dayMood = (day) => (day?.played >= day?.total ? 'orgulhoso' : day?.played > 0 ? 'feliz' : 'determinado');
