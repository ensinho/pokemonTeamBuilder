/**
 * The challenge day: it turns at midnight in Brasília, for everyone (decision
 * 2026-10-14). The server decides the day — the client never sends a date — so
 * nobody in an earlier time zone meets the team first and the daily ranking is
 * one contest, not twenty-four.
 *
 * Computed through `Intl` with the IANA zone rather than a fixed −03:00, so it
 * stays right if daylight saving ever comes back. Zero imports.
 *
 * Mirrored by `src/utils/challengeDay.js` for the countdown (`src/` never imports
 * from `api/`); a test compares the two over hundreds of dates.
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

const keyOfUtcDate = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const parseKey = (dayKey) => {
    const [y, m, d] = String(dayKey).split('-').map(Number);
    return { y, m, d };
};

/** `'YYYY-MM-DD'` of the challenge day containing `ms`. */
export const dayKeyAt = (ms) => {
    const { year, month, day } = wallClock(ms);
    return `${year}-${pad(month)}-${pad(day)}`;
};

/** Offset of the zone from UTC at `ms`, in ms (Brasília today: −3 h). */
const zoneOffsetAt = (ms) => {
    const w = wallClock(ms);
    const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
    return asUtc - (ms - (ms % 1000));
};

/** The instant the challenge day after the one containing `ms` begins. */
export const nextResetAt = (ms) => {
    const { y, m, d } = parseKey(dayKeyAt(ms));
    const midnightAsUtc = Date.UTC(y, m - 1, d + 1);
    // Two passes settle the offset even across a DST change at midnight.
    let guess = midnightAsUtc - zoneOffsetAt(midnightAsUtc);
    guess = midnightAsUtc - zoneOffsetAt(guess);
    return guess;
};

/** 0 = Sunday … 6 = Saturday. */
export const weekdayOf = (dayKey) => {
    const { y, m, d } = parseKey(dayKey);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

export const shiftDayKey = (dayKey, days) => {
    const { y, m, d } = parseKey(dayKey);
    return keyOfUtcDate(new Date(Date.UTC(y, m - 1, d + days)));
};

export const previousDayKey = (dayKey) => shiftDayKey(dayKey, -1);

/** Whole days from `fromKey` to `toKey` (negative when `toKey` is earlier). */
export const daysBetween = (fromKey, toKey) => {
    const a = parseKey(fromKey);
    const b = parseKey(toKey);
    return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
};

/** ISO week, e.g. `'2026-W42'` — the coarse date anonymous training rows carry. */
export const isoWeekOf = (dayKey) => {
    const { y, m, d } = parseKey(dayKey);
    const date = new Date(Date.UTC(y, m - 1, d));
    const weekday = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - weekday);
    const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
    const week = Math.ceil(((date - yearStart) / 86_400_000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${pad(week)}`;
};

export const isDayKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
