import { describe, it, expect } from 'vitest';
import { BADGES_LIST, challengeBadgesEarned, getBadgeById, isBadgeUnlocked } from './badges';
import { EMPTY_CHALLENGE_RECORD } from '../utils/challengeRecord';

describe('BADGES_LIST', () => {
    it('has unique ids and keys', () => {
        const ids = BADGES_LIST.map((b) => b.id);
        const keys = BADGES_LIST.map((b) => b.key);
        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('fits the public profile rule for selectedBadgeId (string ≤ 50)', () => {
        for (const badge of BADGES_LIST) expect(badge.id.length).toBeLessThanOrEqual(50);
    });

    it('gives every badge both languages and an icon', () => {
        for (const badge of BADGES_LIST) {
            expect(badge.namePt && badge.nameEn && badge.reqPt && badge.reqEn).toBeTruthy();
            expect(typeof badge.Icon).toBe('function');
        }
    });

    it('reads empty stats as 0% and locked', () => {
        for (const badge of BADGES_LIST) {
            expect(badge.checkUnlocked({})).toBe(false);
            expect(badge.getProgress({}).percent).toBe(0);
        }
    });
});

describe('activity badges', () => {
    it.each([
        ['badge_days_3', 'activeDays', 3],
        ['badge_days_100', 'activeDays', 100],
        ['badge_teams_1', 'teamsCount', 1],
        ['badge_teams_15', 'teamsCount', 15],
        ['badge_forum_10', 'forumMessages', 10],
        ['badge_favorites_25', 'favoritesCount', 25],
    ])('%s unlocks at %s = %i', (id, stat, target) => {
        expect(isBadgeUnlocked(id, { [stat]: target - 1 })).toBe(false);
        expect(isBadgeUnlocked(id, { [stat]: target })).toBe(true);
    });

    it('clamps progress at the target', () => {
        const badge = getBadgeById('badge_forum_10');
        expect(badge.getProgress({ forumMessages: 4 })).toEqual({ current: 4, target: 10, percent: 40 });
        expect(badge.getProgress({ forumMessages: 99 })).toEqual({ current: 10, target: 10, percent: 100 });
    });

    it('counts the 30-day streak from the best streak', () => {
        expect(isBadgeUnlocked('badge_streak_30', { currentStreak: 2, bestStreak: 30 })).toBe(true);
        expect(isBadgeUnlocked('badge_streak_30', { currentStreak: 29, bestStreak: 29 })).toBe(false);
    });
});

describe('challenge badges', () => {
    const record = (over) => ({ ...EMPTY_CHALLENGE_RECORD, ...over });

    it.each([
        ['badge_challenge_double', { bothWonDays: 1 }],
        ['badge_challenge_daily_double', { bothDailyWonDays: 1 }],
        ['badge_challenge_daily_double_5', { bothDailyWonDays: 5 }],
        ['badge_challenge_sweep', { sweepDays: 1 }],
        ['badge_challenge_daily_10', { dailyTeamWins: 10 }],
        ['badge_challenge_rivals_5', { winsBy: { cynthia: 5, blue: 5 } }],
        ['badge_challenge_flawless', { flawlessWins: 1 }],
    ])('%s unlocks from the record', (id, over) => {
        expect(isBadgeUnlocked(id, { challenge: EMPTY_CHALLENGE_RECORD })).toBe(false);
        expect(isBadgeUnlocked(id, { challenge: record(over) })).toBe(true);
    });

    it('needs five wins over each champion, not five in all', () => {
        expect(isBadgeUnlocked('badge_challenge_rivals_5', { challenge: record({ winsBy: { cynthia: 9, blue: 4 } }) })).toBe(false);
        expect(getBadgeById('badge_challenge_rivals_5').getProgress({ challenge: record({ winsBy: { cynthia: 9, blue: 4 } }) }).current).toBe(4);
    });

    describe('challengeBadgesEarned', () => {
        it('lists what a battle unlocked, journey included', () => {
            const before = record({ winsBy: { cynthia: 1 }, dailyTeamWins: 1, bothPlayedDays: 0 });
            const after = record({ winsBy: { cynthia: 1, blue: 1 }, dailyTeamWins: 2, bothPlayedDays: 1, bothWonDays: 1, bothDailyWonDays: 1 });
            expect(challengeBadgesEarned(before, after)).toEqual([
                'badge_journey_champions', 'badge_challenge_double', 'badge_challenge_daily_double',
            ]);
        });

        it('lists nothing already held, or without a record from before', () => {
            const held = record({ bothWonDays: 1 });
            expect(challengeBadgesEarned(held, record({ bothWonDays: 2 }))).toEqual([]);
            expect(challengeBadgesEarned(null, held)).toEqual([]);
        });
    });
});
