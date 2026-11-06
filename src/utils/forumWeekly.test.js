import { describe, expect, it } from 'vitest';
import { isoWeekOf, previousWeekKey, themeFor, weeklyStandings, weeklyTopicDoc, isWeeklyTopic, WEEKLY_THEMES } from './forumWeekly';

describe('forum weekly tournament', () => {
    it('agrees with the server on ISO weeks', () => {
        expect(isoWeekOf('2026-10-14')).toBe('2026-W42');
        expect(isoWeekOf('2027-01-01')).toBe('2026-W53');
        expect(previousWeekKey('2026-W45')).toBe('2026-W44');
        expect(previousWeekKey('2027-W01')).toBe('2026-W53');
    });
    it('rotates the theme by week, the same for everyone', () => {
        expect(WEEKLY_THEMES).toContain(themeFor('2026-W45'));
        expect(themeFor('2026-W45')).not.toBe(themeFor('2026-W46'));
        expect(isWeeklyTopic(weeklyTopicDoc('2026-W45'))).toBe(true);
    });
    it('ranks entries by votes, earlier first on a tie', () => {
        const s = weeklyStandings([
            { id: 'a', createdBy: 'ana', sharedTeam: {}, likedBy: ['x'], reactions: { y: 'super' }, createdAt: '2' },
            { id: 'b', createdBy: 'bia', sharedTeam: {}, likedBy: ['x', 'y'], createdAt: '1' },
            { id: 'c', createdBy: 'cid', text: 'no team' },
        ]);
        expect(s.map((e) => e.message.id)).toEqual(['b', 'a']);
    });
});
