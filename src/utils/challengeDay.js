/**
 * The Champion Challenge's day on the client — a mirror of
 * `api/_lib/challenge/day.js` (`src/` never imports from `api/`), for the Home
 * card and its countdown. The day turns at midnight in Brasília for everyone;
 * the server stays the authority, this only says which documents to read.
 * `challengeDay.test.js` compares the two over hundreds of dates.
 */

export const CHALLENGE_TIME_ZONE = 'America/Sao_Paulo';

const partsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CHALLENGE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
});

const wallClock = (ms) => {
    const out = {};
    for (const { type, value } of partsFormatter.formatToParts(new Date(ms))) out[type] = Number(value);
    return out;
};

const pad = (n) => String(n).padStart(2, '0');

const parseKey = (dayKey) => {
    const [y, m, d] = String(dayKey).split('-').map(Number);
    return { y, m, d };
};

/** `'YYYY-MM-DD'` of the challenge day containing `ms`. */
export const dayKeyAt = (ms) => {
    const { year, month, day } = wallClock(ms);
    return `${year}-${pad(month)}-${pad(day)}`;
};

const zoneOffsetAt = (ms) => {
    const w = wallClock(ms);
    const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
    return asUtc - (ms - (ms % 1000));
};

/** The instant the next challenge day begins. */
export const nextResetAt = (ms) => {
    const { y, m, d } = parseKey(dayKeyAt(ms));
    const midnightAsUtc = Date.UTC(y, m - 1, d + 1);
    let guess = midnightAsUtc - zoneOffsetAt(midnightAsUtc);
    guess = midnightAsUtc - zoneOffsetAt(guess);
    return guess;
};

export const previousDayKey = (dayKey) => {
    const { y, m, d } = parseKey(dayKey);
    const date = new Date(Date.UTC(y, m - 1, d - 1));
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

/** The streak as it stands today: alive if the last win was today or yesterday. */
export const effectiveStreak = (stats, todayKey) => {
    if (!stats?.lastWonDay) return 0;
    if (stats.lastWonDay === todayKey || stats.lastWonDay === previousDayKey(todayKey)) return stats.streak || 0;
    return 0;
};

/**
 * The Home card's state for today, from what it could read: the public day
 * document (null before anyone opened the day), the account's run status (null
 * when there is no run, or for a guest) and whether the visitor is a guest.
 * @returns {'guest'|'new'|'ready'|'active'|'won'|'lost'}
 */
export const challengeSummaryState = ({ hasDay, runStatus, isGuest }) => {
    if (isGuest) return 'guest';
    if (runStatus === 'active') return 'active';
    if (runStatus === 'won') return 'won';
    if (runStatus === 'lost' || runStatus === 'expired') return 'lost';
    return hasDay ? 'ready' : 'new';
};
