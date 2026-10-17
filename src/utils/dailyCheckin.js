import { CHECKIN_CYCLE_LENGTH, checkinCycleDay, checkinXp } from './trainerLevel';

/**
 * The daily check-in (2026-10-17, docs/modules/rewards.md): one tap a day that
 * pays XP on a seven-day cycle and keeps the streak alive. Playing the daily
 * PokéPuzzle checks in too, so a puzzle player's streak carries on as before.
 *
 * Two counters, two promises:
 * - `checkin.count` only grows. The cycle follows it, so a missed day pauses
 *   the calendar instead of resetting it.
 * - `streak.count` is consecutive days. A shield — one earned per seven days in
 *   a row, two at most — covers a single missed day, so one bad day does not
 *   erase a month.
 *
 * Days are the trainer's LOCAL calendar day (`YYYY-MM-DD`), like activeDays: a
 * check-in at 23:50 counts for the day they are living.
 */

export const MAX_SHIELDS = 2;
export const SHIELD_EVERY = 7;

export const localDayKey = (date = new Date()) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Whole days from `from` to `to` (both `YYYY-MM-DD`); null when either is missing. */
export const dayDiff = (from, to) => {
    if (!DAY_RE.test(from || '') || !DAY_RE.test(to || '')) return null;
    const [fy, fm, fd] = from.split('-').map(Number);
    const [ty, tm, td] = to.split('-').map(Number);
    // UTC on both sides: a daylight-saving change would make a local diff 23 or 25 hours.
    return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
};

export const normalizeCheckin = (raw) => ({
    count: Number.isFinite(raw?.count) && raw.count > 0 ? Math.floor(raw.count) : 0,
    lastDay: DAY_RE.test(raw?.lastDay || '') ? raw.lastDay : null,
});

export const normalizeStreak = (raw) => {
    const count = Number.isFinite(raw?.count) && raw.count > 0 ? Math.floor(raw.count) : 0;
    return {
        count,
        longest: Math.max(count, Number.isFinite(raw?.longest) ? Math.floor(raw.longest) : 0),
        lastVisit: DAY_RE.test(raw?.lastVisit || '') ? raw.lastVisit : null,
        shields: Math.min(MAX_SHIELDS, Math.max(0, Number.isFinite(raw?.shields) ? Math.floor(raw.shields) : 0)),
    };
};

/**
 * The streak as it stands today: still the stored count if the last day was
 * today or yesterday — or the day before, with a shield to cover the gap — and
 * 0 once it has lapsed. The stored record is only rewritten at the next check-in.
 */
export const liveStreak = (streakRaw, today = localDayKey()) => {
    const streak = normalizeStreak(streakRaw);
    const gap = dayDiff(streak.lastVisit, today);
    if (gap === null) return 0;
    if (gap <= 1) return streak.count;
    if (gap === 2 && streak.shields > 0) return streak.count;
    return 0;
};

/**
 * Check in for `today`. Returns `{ checkin, streak, result }`, or null when
 * today is already counted. `result` is what the card tells the trainer.
 */
export const applyCheckin = ({ checkin: checkinRaw, streak: streakRaw } = {}, today = localDayKey()) => {
    const checkin = normalizeCheckin(checkinRaw);
    const streak = normalizeStreak(streakRaw);
    if (checkin.lastDay === today) return null;

    const count = checkin.count + 1;
    const gap = dayDiff(streak.lastVisit, today);

    let streakCount;
    let shields = streak.shields;
    let usedShield = false;
    if (gap === 0) streakCount = Math.max(1, streak.count);           // the puzzle already counted today
    else if (gap === 1) streakCount = streak.count + 1;
    else if (gap === 2 && shields > 0) {
        streakCount = streak.count + 1;
        shields -= 1;
        usedShield = true;
    } else streakCount = 1;

    const advanced = gap !== 0;
    const earnedShield = advanced && streakCount % SHIELD_EVERY === 0 && shields < MAX_SHIELDS;
    if (earnedShield) shields += 1;

    const cycleDay = checkinCycleDay(count);
    return {
        checkin: { count, lastDay: today },
        streak: {
            count: streakCount,
            longest: Math.max(streak.longest, streakCount),
            lastVisit: today,
            shields,
        },
        result: {
            count,
            cycleDay,
            xp: checkinXp(count),
            streak: streakCount,
            usedShield,
            earnedShield,
            cycleComplete: cycleDay === CHECKIN_CYCLE_LENGTH,
        },
    };
};

/**
 * The seven-day strip the card draws: which cycle days are already claimed,
 * which one is today's (claimed or not), and what each pays.
 */
export const checkinCalendar = (checkinRaw, today = localDayKey()) => {
    const checkin = normalizeCheckin(checkinRaw);
    const doneToday = checkin.lastDay === today;
    // The day today's check-in occupies — the one just claimed, or the next one.
    const todayIndex = doneToday ? checkinCycleDay(checkin.count) : checkinCycleDay(checkin.count + 1);
    // A cycle that just completed on a previous day starts over: nothing claimed yet.
    const claimedInCycle = doneToday ? todayIndex : todayIndex - 1;
    const days = Array.from({ length: CHECKIN_CYCLE_LENGTH }, (_, i) => {
        const day = i + 1;
        return {
            day,
            xp: checkinXp(day),
            claimed: day <= claimedInCycle,
            isToday: day === todayIndex,
        };
    });
    return { doneToday, todayIndex, days, xpToday: checkinXp(doneToday ? checkin.count : checkin.count + 1) };
};
