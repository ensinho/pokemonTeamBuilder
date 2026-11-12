/**
 * The PokéPuzzle's standings (2026-11-12): where the trainer stands today, a
 * week's league among friends, and their own record. Pure — PuzzleDayPanel
 * fetches and draws; this decides.
 *
 * Nothing new is stored. The day's counters and each player's row
 * (`puzzleDays/{day}` and `/players/{uid}`: won, guesses, a colour grid —
 * never letters) are what api/daily-puzzle.js already writes; the league is
 * those rows of the week's days, added up here. The record is the trainer's
 * own saved days.
 */

export const MAX_GUESSES = 8; // PokePuzzleView MAX_ATTEMPTS
const BUCKET_ORDER = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'miss'];

/** The share of the day's trainers who did worse than `mineKey` (0–100), or null with nobody to compare. */
export function betterThanShare(bars = [], mineKey) {
    const at = BUCKET_ORDER.indexOf(mineKey);
    const total = bars.reduce((sum, bar) => sum + (Number(bar.count) || 0), 0);
    if (at < 0 || total < 2) return null;
    const worse = bars.reduce((sum, bar) => (BUCKET_ORDER.indexOf(bar.key) > at ? sum + (Number(bar.count) || 0) : sum), 0);
    return Math.round((worse / (total - 1)) * 100);
}

/** What one day is worth in the league: 8 points for the first guess down to 1 for the eighth, 0 for a miss. */
export const dayPoints = (player) => (player?.won && player.guesses >= 1 && player.guesses <= MAX_GUESSES
    ? MAX_GUESSES + 1 - player.guesses
    : 0);

const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));

/** A day's players, best first: winners by fewest guesses, then those who missed. */
export function rankDay(players = []) {
    return [...players]
        .sort((a, b) => dayPoints(b) - dayPoints(a) || byName(a, b))
        .map((player, index, list) => ({
            ...player,
            // Equal results share a place.
            place: index > 0 && dayPoints(list[index - 1]) === dayPoints(player) ? null : index + 1,
        }))
        .map((player, index, list) => {
            if (player.place !== null) return player;
            let back = index - 1;
            while (list[back].place === null) back -= 1;
            return { ...player, place: list[back].place };
        });
}

const pad2 = (n) => String(n).padStart(2, '0');
const keyOf = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** The league's week: Monday up to `today` (padded day keys), and the days left until it ends on Sunday. */
export function leagueWeek(today = new Date()) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const sinceMonday = (day.getDay() + 6) % 7;
    const days = [];
    for (let back = sinceMonday; back >= 0; back -= 1) {
        const d = new Date(day);
        d.setDate(day.getDate() - back);
        days.push(keyOf(d));
    }
    return { days, daysLeft: 6 - sinceMonday };
}

/** The week's table: every player seen in `daysPlayers` (one list per day), points added up, best first. */
export function rankWeek(daysPlayers = []) {
    const table = new Map();
    daysPlayers.forEach((players) => (players || []).forEach((player) => {
        if (!player?.uid) return;
        const row = table.get(player.uid) || { uid: player.uid, name: player.name, avatar: player.avatar ?? null, sprite: player.sprite ?? null, points: 0, played: 0 };
        row.points += dayPoints(player);
        row.played += 1;
        if (player.name) row.name = player.name;
        table.set(player.uid, row);
    }));
    return [...table.values()]
        .sort((a, b) => b.points - a.points || b.played - a.played || byName(a, b))
        .map((row, index) => ({ ...row, place: index + 1 }));
}

/** Who is right above `uid` in a table and by how many points, or null at the top / not in it. */
export function gapAbove(table = [], uid) {
    const at = table.findIndex((row) => row.uid === uid);
    if (at <= 0) return null;
    const above = table[at - 1];
    return { name: above.name, points: above.points - table[at].points + 1 };
}

/**
 * The trainer's own record from their saved days.
 * @param {Array<{ won: boolean, guesses: number, hints?: number } | null>} days  oldest first, one per calendar day (null = not played)
 */
export function puzzleRecord(days = []) {
    let played = 0; let wins = 0; let guessSum = 0; let run = 0; let best = 0; let firstTry = 0; let clean = 0;
    days.forEach((day) => {
        if (!day || !(day.guesses > 0)) { run = 0; return; }
        played += 1;
        if (!day.won) { run = 0; return; }
        wins += 1;
        guessSum += day.guesses;
        run += 1;
        best = Math.max(best, run);
        if (day.guesses === 1) firstTry += 1;
        if (!day.hints) clean += 1;
    });
    return {
        played,
        wins,
        winRate: played ? Math.round((wins / played) * 100) : 0,
        average: wins ? Math.round((guessSum / wins) * 10) / 10 : null,
        // The run that reaches the last day given (today, when today is in the list).
        streak: run,
        bestStreak: best,
        firstTry,
        cleanWins: clean,
    };
}

/** The medals a record has earned and how far the others are. */
export function puzzleMedals(record) {
    const r = record || {};
    return [
        { id: 'firstTry', have: r.firstTry || 0, need: 1 },
        { id: 'clean', have: r.cleanWins || 0, need: 10 },
        { id: 'week', have: r.bestStreak || 0, need: 7 },
        { id: 'month', have: r.wins || 0, need: 30 },
    ].map((medal) => ({ ...medal, earned: medal.have >= medal.need }));
}
