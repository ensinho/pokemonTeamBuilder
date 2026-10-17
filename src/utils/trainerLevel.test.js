import { describe, expect, it } from 'vitest';
import {
    CHECKIN_CYCLE_XP,
    XP_RULES,
    checkinCycleDay,
    checkinXp,
    checkinXpTotal,
    computeTrainerXp,
    levelForXp,
    xpForLevel,
} from './trainerLevel';

describe('xpForLevel', () => {
    it('makes level 1 free and every step cost 25 XP more than the last', () => {
        expect(xpForLevel(1)).toBe(0);
        expect(xpForLevel(2)).toBe(100);
        expect(xpForLevel(3)).toBe(225);
        expect(xpForLevel(10)).toBe(1800);
        expect(xpForLevel(20)).toBe(6175);
        for (let level = 2; level < 60; level += 1) {
            const step = xpForLevel(level + 1) - xpForLevel(level);
            const prev = xpForLevel(level) - xpForLevel(level - 1);
            expect(step - prev).toBe(25);
        }
    });

    it('is always a whole number', () => {
        for (let level = 1; level <= 99; level += 1) expect(Number.isInteger(xpForLevel(level))).toBe(true);
    });
});

describe('levelForXp', () => {
    it('places a total on its level, with the progress inside it', () => {
        expect(levelForXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0, xpForNext: 100, xpToNext: 100, percent: 0 });
        expect(levelForXp(99).level).toBe(1);
        expect(levelForXp(100)).toMatchObject({ level: 2, xpIntoLevel: 0, xpForNext: 125 });
        expect(levelForXp(1800 + 62)).toMatchObject({ level: 10, xpIntoLevel: 62 });
    });

    it('treats junk as zero', () => {
        expect(levelForXp(undefined).level).toBe(1);
        expect(levelForXp(-50).xp).toBe(0);
        expect(levelForXp(NaN).level).toBe(1);
    });
});

describe('check-in cycle', () => {
    it('loops through seven days', () => {
        expect([1, 7, 8, 14, 15].map(checkinCycleDay)).toEqual([1, 7, 1, 7, 1]);
        expect(checkinXp(7)).toBe(CHECKIN_CYCLE_XP[6]);
        expect(checkinXp(8)).toBe(CHECKIN_CYCLE_XP[0]);
    });

    it('sums the XP of every check-in made', () => {
        const cycle = CHECKIN_CYCLE_XP.reduce((a, b) => a + b, 0);
        expect(checkinXpTotal(0)).toBe(0);
        expect(checkinXpTotal(1)).toBe(CHECKIN_CYCLE_XP[0]);
        expect(checkinXpTotal(7)).toBe(cycle);
        expect(checkinXpTotal(9)).toBe(cycle + CHECKIN_CYCLE_XP[0] + CHECKIN_CYCLE_XP[1]);
        let running = 0;
        for (let n = 1; n <= 30; n += 1) {
            running += checkinXp(n);
            expect(checkinXpTotal(n)).toBe(running);
        }
    });
});

describe('computeTrainerXp', () => {
    const journeys = [
        { doneCount: 4, isComplete: true },
        { doneCount: 2, isComplete: false },
    ];

    it('adds every source with its weight', () => {
        const xp = computeTrainerXp(
            { journeys, activeDays: 3, pokepuzzleWins: 2, completedQuizzesCount: 1, teamsCount: 2, forumMessages: 4 },
            { badgeIds: ['badge_journey_first_steps', 'badge_teams_1'], journeyBadgeIds: ['badge_journey_first_steps'], checkinCount: 2 },
        );
        expect(xp).toBe(
            6 * XP_RULES.mission
            + 1 * XP_RULES.journey
            + 1 * XP_RULES.badge             // the journey badge is not paid twice
            + 3 * XP_RULES.activeDay
            + 2 * XP_RULES.puzzleWin
            + 1 * XP_RULES.quiz
            + 2 * XP_RULES.team.each
            + 4 * XP_RULES.forumMessage.each
            + CHECKIN_CYCLE_XP[0] + CHECKIN_CYCLE_XP[1],
        );
    });

    it('caps the habits that could be the whole level', () => {
        const a = computeTrainerXp({ teamsCount: XP_RULES.team.cap, forumMessages: XP_RULES.forumMessage.cap });
        const b = computeTrainerXp({ teamsCount: 500, forumMessages: 5000 });
        expect(b).toBe(a);
    });

    it('is zero for a trainer who has done nothing', () => {
        expect(computeTrainerXp()).toBe(0);
        expect(computeTrainerXp({})).toBe(0);
    });
});
