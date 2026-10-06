import { describe, it, expect } from 'vitest';
import { BADGES_LIST, getBadgeById, isBadgeUnlocked } from './badges';

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
