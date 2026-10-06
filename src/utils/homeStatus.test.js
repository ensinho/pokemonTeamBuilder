import { describe, it, expect } from 'vitest';
import {
    TYPE_COUNT,
    dayPeriod,
    editedParts,
    findMetaAnswer,
    pickNextBadge,
    resolveMembers,
    summarizeTeam,
    trainerIdFromUid,
    typeMultiplier,
} from './homeStatus';

const mon = (id, types) => ({ id, types });

describe('trainerIdFromUid', () => {
    it('is five digits and stable per uid', () => {
        const id = trainerIdFromUid('abc123');
        expect(id).toMatch(/^\d{5}$/);
        expect(trainerIdFromUid('abc123')).toBe(id);
        expect(trainerIdFromUid('abc124')).not.toBe(id);
    });

    it('falls back to zeros without a uid', () => {
        expect(trainerIdFromUid(null)).toBe('00000');
    });
});

describe('dayPeriod', () => {
    it('splits the day into four periods', () => {
        expect(dayPeriod(7)).toBe('morning');
        expect(dayPeriod(17)).toBe('afternoon');
        expect(dayPeriod(20)).toBe('evening');
        expect(dayPeriod(2)).toBe('night');
    });
});

describe('summarizeTeam', () => {
    it('reads an empty team as a draft with nothing covered', () => {
        const s = summarizeTeam({ pokemons: [] });
        expect(s).toMatchObject({ size: 0, missing: 6, status: 'draft', coverage: 0, weakness: null });
    });

    it('marks a full team ready', () => {
        const team = { pokemons: [1, 2, 3, 4, 5, 6].map((id) => mon(id, ['water'])) };
        const s = summarizeTeam(team);
        expect(s.status).toBe('ready');
        expect(s.missing).toBe(0);
    });

    it('counts what is missing in between', () => {
        const s = summarizeTeam({ pokemons: [mon(1, ['grass']), mon(2, ['fire']), null, mon(3, ['water'])] });
        expect(s).toMatchObject({ size: 3, missing: 3, status: 'missing' });
    });

    it('names the type most of the team is weak to', () => {
        const s = summarizeTeam({ pokemons: [mon(1, ['dragon']), mon(2, ['dragon', 'flying']), mon(3, ['steel'])] });
        expect(s.weakness).toEqual({ type: 'ice', count: 2 });
    });

    it('counts offensive coverage out of the full chart', () => {
        const s = summarizeTeam({ pokemons: [mon(1, ['fire'])] });
        // Fire hits Grass, Ice, Bug and Steel.
        expect(s.coverage).toBe(4);
        expect(TYPE_COUNT).toBe(18);
    });

    it('fills missing types from the index', () => {
        const members = resolveMembers({ pokemons: [{ id: 6 }] }, new Map([[6, ['fire', 'flying']]]));
        expect(members[0].types).toEqual(['fire', 'flying']);
    });
});

describe('findMetaAnswer', () => {
    it('picks the member that hits the leader hardest', () => {
        // Kingambit (dark/steel): fighting 4x, fire and ground 2x.
        const team = [mon(1, ['water']), mon(2, ['fire']), mon(3, ['fighting'])];
        expect(findMetaAnswer(team, ['dark', 'steel']).id).toBe(3);
    });

    it('returns null when nobody hits it super effectively', () => {
        expect(findMetaAnswer([mon(1, ['normal'])], ['ghost'])).toBeNull();
        expect(findMetaAnswer([mon(1, ['fire'])], [])).toBeNull();
    });

    it('multiplies across both defending types', () => {
        expect(typeMultiplier('fighting', ['dark', 'steel'])).toBe(4);
        expect(typeMultiplier('normal', ['ghost'])).toBe(0);
    });
});

describe('pickNextBadge', () => {
    const badge = (id, percent, target, isUnlocked = false) => ({ id, isUnlocked, progress: { percent, target } });

    it('ignores unlocked badges and picks the highest percent', () => {
        const next = pickNextBadge([badge('a', 100, 1, true), badge('b', 40, 10), badge('c', 70, 10)]);
        expect(next.id).toBe('c');
    });

    it('breaks ties with the smaller target', () => {
        expect(pickNextBadge([badge('big', 50, 30), badge('small', 50, 2)]).id).toBe('small');
    });

    it('returns null when everything is unlocked', () => {
        expect(pickNextBadge([badge('a', 100, 1, true)])).toBeNull();
    });
});

describe('editedParts', () => {
    const now = new Date(2026, 9, 6, 0, 10);

    it('counts calendar days, keeping the time for today and yesterday', () => {
        expect(editedParts(new Date(2026, 9, 5, 23, 50).toISOString(), now)).toMatchObject({ kind: 'yesterday', time: '23:50' });
        expect(editedParts(new Date(2026, 9, 6, 0, 1).toISOString(), now)).toMatchObject({ kind: 'today', time: '00:01' });
    });

    it('moves from days to weeks to a date', () => {
        expect(editedParts(new Date(2026, 9, 3).toISOString(), now)).toMatchObject({ kind: 'days', n: 3 });
        expect(editedParts(new Date(2026, 8, 22).toISOString(), now)).toMatchObject({ kind: 'weeks', n: 2 });
        expect(editedParts(new Date(2026, 5, 1).toISOString(), now).kind).toBe('date');
    });

    it('returns null for a missing or broken timestamp', () => {
        expect(editedParts(null, now)).toBeNull();
        expect(editedParts('nope', now)).toBeNull();
    });
});
