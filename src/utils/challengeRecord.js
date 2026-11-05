import { CHAMPION_IDS, DEFAULT_CHAMPION } from './challengeChampions';

/**
 * The trainer's Champion Challenge record, as the journeys and badges read it
 * (`facts.challenge`). Built from their own official runs
 * (`challengeRuns`, owner-readable, written only by the server — so a fact
 * here cannot be faked from the client), which makes every count retroactive:
 * a win from before these badges existed counts the day they ship.
 *
 * A day has up to four officials: each champion × each board (`daily` — the
 * Time do dia, everyone's same team — and `free`, your own team). Practice
 * runs never count.
 */

export const TEAM_SIZE = 6;

/** Runs written before the second champion / the second board carry neither field. */
const championOf = (run) => (CHAMPION_IDS.includes(run.championId) ? run.championId : DEFAULT_CHAMPION);
const boardOf = (run) => (run.board === 'free' || run.board === 'daily'
    ? run.board
    : (run.teamSource === 'saved' ? 'free' : 'daily'));

export const EMPTY_CHALLENGE_RECORD = Object.freeze({
    wins: 0,
    winsBy: Object.freeze({}),
    dailyTeamWins: 0,
    ownTeamWins: 0,
    flawlessWins: 0,
    bothPlayedDays: 0,
    bothWonDays: 0,
    bothDailyWonDays: 0,
    sweepDays: 0,
});

/**
 * @param {Array<object>} runs  run documents (any order; practice and active ones are skipped)
 * @returns {typeof EMPTY_CHALLENGE_RECORD}
 *   wins            official wins, any champion, any board
 *   winsBy          { cynthia: n, blue: n }
 *   dailyTeamWins   wins with the Time do dia
 *   ownTeamWins     wins with a team of your own
 *   flawlessWins    wins with all six still standing
 *   bothPlayedDays  days on which every champion was faced (a finished official each)
 *   bothWonDays     days on which every champion was beaten (either board)
 *   bothDailyWonDays days on which every champion was beaten with the Time do dia
 *   sweepDays       days on which all four officials were won
 */
export function summarizeChallengeRuns(runs = []) {
    const days = new Map();
    const winsBy = {};
    let wins = 0;
    let dailyTeamWins = 0;
    let ownTeamWins = 0;
    let flawlessWins = 0;

    for (const run of runs) {
        if (!run || run.practice || !run.dayKey) continue;
        if (run.status !== 'won' && run.status !== 'lost' && run.status !== 'expired') continue;
        const champion = championOf(run);
        const board = boardOf(run);
        const won = run.status === 'won';

        const day = days.get(run.dayKey) || { played: new Set(), won: new Set(), wonDaily: new Set(), winCount: 0 };
        day.played.add(champion);
        if (won) {
            day.won.add(champion);
            day.winCount += 1;
            if (board === 'daily') day.wonDaily.add(champion);
        }
        days.set(run.dayKey, day);

        if (!won) continue;
        wins += 1;
        winsBy[champion] = (winsBy[champion] || 0) + 1;
        if (board === 'daily') dailyTeamWins += 1;
        else ownTeamWins += 1;
        if ((run.result?.remaining ?? 0) >= TEAM_SIZE) flawlessWins += 1;
    }

    const all = CHAMPION_IDS.length;
    let bothPlayedDays = 0;
    let bothWonDays = 0;
    let bothDailyWonDays = 0;
    let sweepDays = 0;
    for (const day of days.values()) {
        if (day.played.size >= all) bothPlayedDays += 1;
        if (day.won.size >= all) bothWonDays += 1;
        if (day.wonDaily.size >= all) bothDailyWonDays += 1;
        if (day.winCount >= all * 2) sweepDays += 1;
    }

    return { wins, winsBy, dailyTeamWins, ownTeamWins, flawlessWins, bothPlayedDays, bothWonDays, bothDailyWonDays, sweepDays };
}

/** The champion beaten fewest times — "beat each one N times" reads this. */
export const fewestWinsOverAChampion = (record) =>
    Math.min(...CHAMPION_IDS.map((id) => record?.winsBy?.[id] || 0));
