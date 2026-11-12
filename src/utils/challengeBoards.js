/**
 * The Champion's day as two boards (2026-11-12, Enzo: "0/2, 1/2 ou 2/2 na
 * home, considerando vitória ou derrota"). Each champion takes two official
 * battles a day — one with the Time do dia, one with the trainer's own team
 * (`api/_lib/challenge/runs.js` `officialRunId`, the `_free` suffix) — so the
 * Home tells the day by both, not by "a win somewhere".
 *
 * Pure: run statuses in, what the Home shows out. Views ask this, never
 * re-derive the outcome (CozyHomeView's hero and its "Seu dia" card agree).
 */

export const CHALLENGE_BOARDS = ['daily', 'free'];

/** A run's stored status as a slot reads it: an expired run is a loss. */
export const boardStatus = (status) => {
    if (status === 'won' || status === 'active') return status;
    if (status === 'lost' || status === 'expired') return 'lost';
    return 'pending';
};

/**
 * @param {{daily?: ?string, free?: ?string}} runs  stored run statuses (null: not played)
 * @returns {{
 *   slots: {id: 'daily'|'free', status: 'pending'|'active'|'won'|'lost'}[],
 *   done: number, won: number, lost: number, total: number,
 *   outcome: 'fresh'|'active'|'oneWon'|'oneLost'|'perfect'|'split'|'defeated',
 *   next: ?('daily'|'free'),
 *   mood: 'calm'|'live'|'gold'|'down',
 * }}
 * `next` is the board the one action opens: the battle in progress, else the
 * first one not played (the Time do dia first). Null once both are played.
 */
export function challengeBoardsOutcome(runs = {}) {
    const slots = CHALLENGE_BOARDS.map((id) => ({ id, status: boardStatus(runs?.[id]) }));
    const count = (status) => slots.filter((slot) => slot.status === status).length;
    const won = count('won');
    const lost = count('lost');
    const active = count('active');
    const done = won + lost;

    let outcome;
    if (active > 0) outcome = 'active';
    else if (done === 0) outcome = 'fresh';
    else if (done === 1) outcome = won ? 'oneWon' : 'oneLost';
    else if (won === 2) outcome = 'perfect';
    else if (lost === 2) outcome = 'defeated';
    else outcome = 'split';

    const next = slots.find((slot) => slot.status === 'active')?.id
        || slots.find((slot) => slot.status === 'pending')?.id
        || null;

    // The scene's register: gold only when both were earned (gold is for what
    // is earned), drained when both were lost, live while a battle runs.
    const mood = outcome === 'perfect' ? 'gold'
        : outcome === 'defeated' ? 'down'
            : outcome === 'active' ? 'live'
                : 'calm';

    return { slots, done, won, lost, total: CHALLENGE_BOARDS.length, outcome, next, mood };
}

/**
 * The address of one battle (2026-11-12): the champion always named, so a
 * link never lands on whoever the device faced last, and the board when the
 * Home knows which one it means. `view: 'ranking'` opens that board's ranking
 * instead. ChampionChallengeView reads `board` / `view` once, then drops them.
 */
export function challengeLink({ champion = 'cynthia', board = null, view = null } = {}) {
    const params = new URLSearchParams({ champion });
    if (CHALLENGE_BOARDS.includes(board)) params.set('board', board);
    if (view === 'ranking') params.set('view', 'ranking');
    return `/challenge?${params.toString()}`;
}

/**
 * The whole day across the champions (Cynthia and Blue, two boards each):
 * `champions` is `[{ id, boards }]` in the room's order. Each gets its
 * `challengeBoardsOutcome`; `focus` is the one the Home leads with — a battle
 * in progress, else the first with a board still to play, else the first.
 * `done`/`total` count every official battle of the day (0/4 … 4/4).
 */
export function challengeDayPlan(champions = []) {
    const days = champions.map((c) => ({ id: c.id, ...challengeBoardsOutcome(c.boards) }));
    const focus = days.find((d) => d.outcome === 'active')
        || days.find((d) => d.next)
        || days[0]
        || null;
    return {
        champions: days,
        focus: focus?.id || null,
        done: days.reduce((n, d) => n + d.done, 0),
        won: days.reduce((n, d) => n + d.won, 0),
        total: days.reduce((n, d) => n + d.total, 0),
    };
}

/**
 * Where a champion's one action goes: their next board; once both are played,
 * the ranking of the board won — or, with no win, the picker for a practice
 * rematch (the Time do dia, the fair one to study them with).
 */
export const championAction = (champion, day) => {
    if (day.next) return challengeLink({ champion, board: day.next });
    const won = day.slots.find((s) => s.status === 'won');
    return won
        ? challengeLink({ champion, board: won.id, view: 'ranking' })
        : challengeLink({ champion, board: 'daily' });
};
