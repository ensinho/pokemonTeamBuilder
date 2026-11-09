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

/** Two copies of the check-in counter: it only grows, so the larger count and the later day. */
export const mergeCheckins = (aRaw, bRaw) => {
    const a = normalizeCheckin(aRaw);
    const b = normalizeCheckin(bRaw);
    return {
        count: Math.max(a.count, b.count),
        lastDay: [a.lastDay, b.lastDay].filter(Boolean).sort().pop() || null,
    };
};

/**
 * Two copies of the streak (this device's and the account's). The copy that
 * saw the later day is live — unless it was counted from a stale base: a
 * device that had not heard of the other's days started a new run of 1 while
 * the account's run was still alive (2026-11-08, a 23-day streak shown as 1).
 * When the newer run begins no later than the day after the older one ended
 * (two days, with a shield), they are one run, and the counts join.
 */
export const mergeStreaks = (aRaw, bRaw) => {
    const a = normalizeStreak(aRaw);
    const b = normalizeStreak(bRaw);
    const [older, newer] = (b.lastVisit || '') > (a.lastVisit || '') ? [a, b] : [b, a];
    const gap = dayDiff(older.lastVisit, newer.lastVisit);

    let count = newer.count;
    let shields = newer.shields;
    if (gap === 0) {
        // The same day seen twice: the higher count was counted from more history.
        const best = a.count >= b.count ? a : b;
        count = best.count;
        shields = best.shields;
    } else if (gap !== null && older.count > 0 && newer.count > 0) {
        // Days between the older run's last day and the newer run's first.
        const between = gap - newer.count + 1;
        if (between <= 1 || (between === 2 && older.shields > 0)) {
            count = Math.max(newer.count, older.count + Math.min(newer.count, gap));
        }
    }
    return {
        count,
        longest: Math.max(a.longest, b.longest, count),
        lastVisit: newer.lastVisit,
        shields,
    };
};

/**
 * Settle a check-in made on this device against the account's copy: merge the
 * state the check-in was counted from (`base`) with the account's, then count
 * `day` on top — or keep the merge when the account already counted that day.
 * Run before every write, so a device that missed days elsewhere (a PWA left
 * open, a second phone, a check-in tapped before the profile loaded) adds a
 * day to the account's streak instead of overwriting it with its own.
 */
export const settleCheckin = ({ base = {}, day } = {}, remote = {}) => {
    const merged = {
        checkin: mergeCheckins(base.checkin, remote?.checkin),
        streak: mergeStreaks(base.streak, remote?.streak),
    };
    const next = DAY_RE.test(day || '') ? applyCheckin(merged, day) : null;
    return next ? { checkin: next.checkin, streak: next.streak } : merged;
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

// ── The calendar the Home draws (2026-11-09, .claude/skills/app-screens) ────

/** `key` moved by `n` whole days (negative goes back). */
export const shiftDay = (key, n) => {
    if (!DAY_RE.test(key || '')) return null;
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + n));
    const pad = (v) => String(v).padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

/** 0 = Sunday … 6 = Saturday, for a `YYYY-MM-DD` key (calendar, not clock). */
export const weekdayOf = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

/**
 * What one day of the calendar says, as the streak counts it.
 *
 * The check-in stores a count and a last day, not a diary, so the history is
 * derived: the run is the last `liveStreak` days up to the streak's last
 * visit. A shield that will cover yesterday shows there as `shielded`. Days
 * outside the run are `past` (absent, drawn dashed) — never "missed", since
 * nothing says the trainer was even here yet.
 *
 * States: `caught` (in the run) · `shielded` · `past` · `today` (open — the
 * check-in) · `today-done` · `ahead`.
 */
const dayState = (key, { today, doneToday, runFrom, runTo, shieldDay }) => {
    const diff = dayDiff(key, today);
    if (diff === 0) return doneToday ? 'today-done' : 'today';
    if (diff < 0) return 'ahead';
    if (key === shieldDay) return 'shielded';
    if (runFrom && dayDiff(runFrom, key) >= 0 && dayDiff(key, runTo) >= 0) return 'caught';
    return 'past';
};

const calendarContext = ({ checkin: checkinRaw, streak: streakRaw } = {}, today) => {
    const checkin = normalizeCheckin(checkinRaw);
    const streak = normalizeStreak(streakRaw);
    const live = liveStreak(streak, today);
    const gap = dayDiff(streak.lastVisit, today);
    const runTo = live > 0 ? streak.lastVisit : null;
    return {
        today,
        live,
        doneToday: checkin.lastDay === today,
        runTo,
        runFrom: runTo ? shiftDay(runTo, -(live - 1)) : null,
        // A shield covers one missed day: the one between the last visit and today.
        shieldDay: live > 0 && gap === 2 ? shiftDay(streak.lastVisit, 1) : null,
    };
};

/**
 * This week, day by day, for the Home's strip: `weekStartsOn` 1 = Monday
 * (en), 0 = Sunday (pt-BR calendars). Each day: `{ key, date, weekday, state }`.
 */
export const checkinWeek = (records = {}, today = localDayKey(), { weekStartsOn = 1 } = {}) => {
    const context = calendarContext(records, today);
    const back = (weekdayOf(today) - weekStartsOn + 7) % 7;
    const start = shiftDay(today, -back);
    const days = Array.from({ length: 7 }, (_, i) => {
        const key = shiftDay(start, i);
        return { key, date: Number(key.slice(8)), weekday: weekdayOf(key), state: dayState(key, context) };
    });
    return { days, streak: context.live, doneToday: context.doneToday };
};

/**
 * The month `today` falls in, for the streak sheet: `leading` blank cells so
 * the first day lands on its weekday column, then every day with its state.
 */
export const streakMonth = (records = {}, today = localDayKey(), { weekStartsOn = 1 } = {}) => {
    const context = calendarContext(records, today);
    const first = `${today.slice(0, 8)}01`;
    const [y, m] = today.split('-').map(Number);
    const length = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const days = Array.from({ length }, (_, i) => {
        const key = shiftDay(first, i);
        return { key, date: i + 1, weekday: weekdayOf(key), state: dayState(key, context) };
    });
    return {
        year: y,
        month: m,
        leading: (weekdayOf(first) - weekStartsOn + 7) % 7,
        days,
        streak: context.live,
        doneToday: context.doneToday,
    };
};

/** pt-BR calendars start on Sunday; the en-GB the app speaks, on Monday. */
export const weekStartFor = (language) => (language === 'pt' ? 0 : 1);
