import { describe, expect, it } from 'vitest';
import { recapStart, seasonRecap, shouldOpenRecap, weekRange } from './weeklyRecap';

const entry = (uid, score, days = 3, profile = { avatarPokemonId: 25 }) => ({
    uid, name: uid.toUpperCase(), score, days: Object.fromEntries(Array.from({ length: days }, (_, i) => [`2026-11-0${i + 3}`, 1])), profile, at: 'x',
});

const doc = {
    weekKey: '2026-W45',
    entries: [entry('a', 1948), entry('b', 1903), entry('c', 1775), entry('d', 1744, 5, null), entry('e', 1611)],
};

describe('seasonRecap', () => {
    it('is null for a week nobody won', () => {
        expect(seasonRecap(null, 'a')).toBeNull();
        expect(seasonRecap({ weekKey: '2026-W45', entries: [] }, 'a')).toBeNull();
    });

    it('splits the podium from the rest, in the live board row shape', () => {
        const recap = seasonRecap(doc, 'b');
        expect(recap.weekKey).toBe('2026-W45');
        expect(recap.podium.map((r) => r.place)).toEqual([1, 2, 3]);
        expect(recap.rest.map((r) => r.name)).toEqual(['D', 'E']);
        expect(recap.podium[1]).toMatchObject({ name: 'B', score: 1903, days: 3, me: true, place: 2 });
    });

    it('sends a uid only with a public profile', () => {
        const recap = seasonRecap(doc, null);
        expect(recap.podium[0].uid).toBe('a');
        expect(recap.rest[0].uid).toBeNull();
    });

    it('says how the trainer finished', () => {
        expect(seasonRecap(doc, 'a').outcome).toBe('champion');
        expect(seasonRecap(doc, 'c').outcome).toBe('podium');
        expect(seasonRecap(doc, 'e')).toMatchObject({ outcome: 'ranked', mine: { place: 5, score: 1611, days: 3 } });
        expect(seasonRecap(doc, 'zzz')).toMatchObject({ outcome: 'absent', mine: null });
        expect(seasonRecap(doc, null).outcome).toBe('absent');
    });

    it('caps the rows but still finds the trainer below the cap', () => {
        const recap = seasonRecap(doc, 'e', 4);
        expect(recap.rest).toHaveLength(1);
        expect(recap.mine.place).toBe(5);
    });
});

describe('recapStart', () => {
    const ids = ['cynthia', 'blue'];
    it('opens where the trainer did best', () => {
        const recaps = { cynthia: { outcome: 'ranked', mine: { place: 6 } }, blue: { outcome: 'podium', mine: { place: 2 } } };
        expect(recapStart(recaps, 'cynthia', ids)).toBe('blue');
    });
    it('prefers the room champion on a tie', () => {
        const recaps = { cynthia: { outcome: 'absent', mine: null }, blue: { outcome: 'absent', mine: null } };
        expect(recapStart(recaps, 'blue', ids)).toBe('blue');
    });
    it('skips champions with no season', () => {
        expect(recapStart({ cynthia: null, blue: { outcome: 'absent' } }, 'cynthia', ids)).toBe('blue');
        expect(recapStart({ cynthia: null, blue: null }, 'cynthia', ids)).toBeNull();
    });
});

describe('shouldOpenRecap', () => {
    const recaps = { cynthia: { outcome: 'absent' }, blue: null };
    it('opens once per week, only with something to show', () => {
        expect(shouldOpenRecap({ weekKey: '2026-W45', seenWeekKey: null, recaps })).toBe(true);
        expect(shouldOpenRecap({ weekKey: '2026-W45', seenWeekKey: '2026-W45', recaps })).toBe(false);
        expect(shouldOpenRecap({ weekKey: '2026-W45', seenWeekKey: '2026-W44', recaps: { cynthia: null } })).toBe(false);
        expect(shouldOpenRecap({ weekKey: null, seenWeekKey: null, recaps })).toBe(false);
    });
});

describe('weekRange', () => {
    it('gives Monday to Sunday of an ISO week', () => {
        expect(weekRange('2026-W45')).toEqual({ start: '2026-11-02', end: '2026-11-08' });
        expect(weekRange('2026-W01')).toEqual({ start: '2025-12-29', end: '2026-01-04' });
    });
    it('is null for anything else', () => {
        expect(weekRange('nope')).toBeNull();
    });
});
