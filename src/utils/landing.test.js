import { describe, expect, it } from 'vitest';
import { analyzeTeam } from './teamAnalysis';
import { DEMO_POOL, DEMO_START, LANDING_SEEN_KEY, isReturningVisitor, markLandingSeen, shouldShowLanding, toggleDemoMember } from './landing';

const memoryStorage = (initial = {}) => {
    const data = { ...initial };
    return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
};

describe('shouldShowLanding', () => {
    it('shows the pitch to a first visit only', () => {
        expect(shouldShowLanding({})).toBe(true);
        expect(shouldShowLanding({ returning: true })).toBe(false);
        expect(shouldShowLanding({ hasTeams: true })).toBe(false);
        expect(shouldShowLanding({ isAnonymous: false })).toBe(false);
    });
});

describe('visit marks', () => {
    it('reads an earlier visit from any key it leaves behind', () => {
        expect(isReturningVisitor(memoryStorage())).toBe(false);
        expect(isReturningVisitor(memoryStorage({ 'ptb:authSnapshot': '{}' }))).toBe(true);
        expect(isReturningVisitor(memoryStorage({ ptbActiveTeamId: 'x' }))).toBe(true);
    });

    it('remembers that the landing was seen', () => {
        const storage = memoryStorage();
        markLandingSeen(storage);
        expect(storage.getItem(LANDING_SEEN_KEY)).toBe('1');
        expect(isReturningVisitor(storage)).toBe(true);
    });

    it('treats blocked storage as a first visit and never throws', () => {
        const blocked = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
        expect(isReturningVisitor(blocked)).toBe(false);
        expect(() => markLandingSeen(blocked)).not.toThrow();
    });
});

describe('the demo', () => {
    it('starts on a team with a visible shared weakness', () => {
        const team = DEMO_POOL.filter((p) => DEMO_START.includes(p.id));
        const { teamAnalysis } = analyzeTeam(team);
        expect(Object.keys(teamAnalysis.weaknesses)).toEqual(expect.arrayContaining(['rock', 'electric']));
    });

    it('toggles members in pool order and never empties the team', () => {
        expect(toggleDemoMember([6, 130], 445)).toEqual([6, 130, 445]);
        expect(toggleDemoMember([445, 6], 130)).toEqual([6, 130, 445]);
        expect(toggleDemoMember([6, 130], 6)).toEqual([130]);
        expect(toggleDemoMember([6], 6)).toEqual([6]);
    });
});
