/**
 * Trainer Level (2026-10-17) — the long track of the rewards system
 * (docs/modules/rewards.md). Experience is *computed* from what the trainer has
 * done — missions, journeys, badges, days, check-ins, wins — never earned and
 * spent, so there is no currency to balance and nothing to lose. The store
 * keeps the highest total it has seen (useRewardsStore), so a level never goes
 * down when a team is deleted or a listener has not answered yet.
 *
 * Pure: every number here is tested in trainerLevel.test.js.
 */

/** What each thing the trainer did is worth. Caps keep one habit from being the whole level. */
export const XP_RULES = {
    mission: 40,          // per journey mission done
    journey: 120,         // per journey finished
    badge: 80,            // per badge unlocked, journey badges excluded (the journey already paid)
    activeDay: 10,        // per distinct day the app was opened
    puzzleWin: 15,        // per PokéPuzzle won
    quiz: 20,             // per quiz completed
    team: { each: 15, cap: 20 },
    forumMessage: { each: 5, cap: 100 },
};

/**
 * The daily check-in's seven-day cycle, in XP. The cycle advances with every
 * check-in, not with every calendar day, so a missed day pauses it instead of
 * sending the trainer back to day one.
 */
export const CHECKIN_CYCLE_XP = [10, 10, 15, 15, 20, 20, 50];
export const CHECKIN_CYCLE_LENGTH = CHECKIN_CYCLE_XP.length;
const CHECKIN_CYCLE_TOTAL = CHECKIN_CYCLE_XP.reduce((sum, xp) => sum + xp, 0);

/** 1-based day of the cycle that check-in number `n` (1-based) lands on. */
export const checkinCycleDay = (n) => ((Math.max(1, n) - 1) % CHECKIN_CYCLE_LENGTH) + 1;

/** XP the `n`-th check-in pays. */
export const checkinXp = (n) => CHECKIN_CYCLE_XP[checkinCycleDay(n) - 1];

/** XP all `count` check-ins paid, together. */
export const checkinXpTotal = (count = 0) => {
    const n = Math.max(0, Math.floor(count));
    const full = Math.floor(n / CHECKIN_CYCLE_LENGTH);
    const rest = n % CHECKIN_CYCLE_LENGTH;
    return full * CHECKIN_CYCLE_TOTAL + CHECKIN_CYCLE_XP.slice(0, rest).reduce((sum, xp) => sum + xp, 0);
};

const capped = (value, rule) => Math.min(Math.max(0, value || 0), rule.cap) * rule.each;

/**
 * The trainer's total experience from their stats (useTrainerBadges' `stats`,
 * journeys included), the ids of the badges they hold and their check-ins.
 */
export const computeTrainerXp = (stats = {}, { badgeIds = [], journeyBadgeIds = [], checkinCount = 0 } = {}) => {
    const journeys = stats.journeys || [];
    const missions = journeys.reduce((sum, journey) => sum + (journey.doneCount || 0), 0);
    const journeysDone = journeys.filter((journey) => journey.isComplete).length;
    const journeyBadges = new Set(journeyBadgeIds);
    const badges = badgeIds.filter((id) => !journeyBadges.has(id)).length;

    return missions * XP_RULES.mission
        + journeysDone * XP_RULES.journey
        + badges * XP_RULES.badge
        + (stats.activeDays || 0) * XP_RULES.activeDay
        + (stats.pokepuzzleWins || 0) * XP_RULES.puzzleWin
        + (stats.completedQuizzesCount || 0) * XP_RULES.quiz
        + capped(stats.teamsCount, XP_RULES.team)
        + capped(stats.forumMessages, XP_RULES.forumMessage)
        + checkinXpTotal(checkinCount);
};

/**
 * Total XP needed to reach `level` (level 1 is free). Each step asks 25 XP
 * more than the one before it — 100, 125, 150… — so level 10 is 1800 XP and
 * level 20 is 6175. Always a whole number: (L-1)(L-2) is even.
 */
export const xpForLevel = (level) => {
    const l = Math.max(1, Math.floor(level));
    return 100 * (l - 1) + 12.5 * (l - 1) * (l - 2);
};

export const MAX_LEVEL = 99;

/** Where `xp` puts the trainer: level, progress inside it, and what the next one costs. */
export const levelForXp = (xp = 0) => {
    const total = Math.max(0, Math.floor(xp || 0));
    let level = 1;
    while (level < MAX_LEVEL && xpForLevel(level + 1) <= total) level += 1;
    const floor = xpForLevel(level);
    const ceiling = level < MAX_LEVEL ? xpForLevel(level + 1) : floor;
    const span = ceiling - floor;
    return {
        level,
        xp: total,
        xpIntoLevel: total - floor,
        xpForNext: span,
        xpToNext: Math.max(0, ceiling - total),
        percent: span > 0 ? Math.min(100, Math.round(((total - floor) / span) * 100)) : 100,
    };
};
