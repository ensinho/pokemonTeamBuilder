import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { meadowRoster, meadowSpots, normalizePokes, pokedToday, readPublicMascot, withPoke } from './meadow';
import { TONES } from './mascot/constants';
import { COSTUMES } from './mascot/assistant';

const friends = [
    { userId: 'a', displayName: 'Ana', mascot: { tone: 'fire', hat: 'cap' } },
    { userId: 'b', displayName: 'Bia', mascot: { tone: 'nope', hat: 'crown' } },
    { userId: 'c', displayName: 'Caio' },
];

describe('meadowRoster', () => {
    it("wakes a friend for each of the day's games the Centre saw", () => {
        const events = [
            { uid: 'a', kind: 'champion', dayKey: '2026-11-17' },
            { uid: 'a', kind: 'puzzle', dayKey: '2026-11-17' },
            { uid: 'b', kind: 'post', attachment: 'quiz', dayKey: '2026-11-17' },
            { uid: 'c', kind: 'puzzle', dayKey: '2026-11-16' },
            { uid: 'c', kind: 'topic', at: '2026-11-17T10:00:00Z' },
        ];
        const { ghosts } = meadowRoster({ friends, events, todayKeys: ['2026-11-17'] });
        expect(ghosts.map((g) => [g.uid, g.played, g.awake])).toEqual([['a', 2, true], ['b', 1, true], ['c', 0, false]]);
        expect(ghosts[0].games).toEqual({ challenge: true, pokepuzzle: true, quiz: false, tierList: false });
    });

    it("reads a day's receipt as all four", () => {
        const { ghosts } = meadowRoster({ friends: [friends[2]], events: [{ uid: 'c', kind: 'post', attachment: 'receipt', dayKey: '2026-11-17' }], todayKeys: ['2026-11-17'] });
        expect(ghosts[0].played).toBe(4);
    });

    it('keeps only a real tone and costume, and caps the field', () => {
        expect(readPublicMascot({ tone: 'fire', hat: 'cap' })).toEqual({ tone: 'fire', hat: 'cap' });
        expect(readPublicMascot({ tone: 'nope', hat: 'crown' })).toEqual({ tone: null, hat: null });
        expect(readPublicMascot(null)).toEqual({ tone: null, hat: null });
        const { ghosts, more } = meadowRoster({ friends, events: [], todayKeys: [], max: 2 });
        expect(ghosts).toHaveLength(2);
        expect(more).toBe(1);
    });
});

describe('pokes', () => {
    it('are one per friend per day', () => {
        let p = normalizePokes(null, '2026-11-17');
        p = withPoke(p, 'a');
        p = withPoke(p, 'a');
        expect(p.uids).toEqual(['a']);
        expect(pokedToday(p, 'a')).toBe(true);
        expect(normalizePokes(p, '2026-11-18').uids).toEqual([]);
    });
});

it('spreads the ghosts across the field', () => {
    expect(meadowSpots(1)).toEqual([0.5]);
    expect(meadowSpots(3)).toEqual([0.1, 0.5, 0.9]);
});

it('lists every tone and costume in the public profile rule', () => {
    // firestore.rules accepts only catalogue values for `mascot`; one missing
    // there would make every profile sync fall back a step.
    const rules = readFileSync(fileURLToPath(new URL('../../firestore.rules', import.meta.url)), 'utf8');
    for (const value of [...TONES, 'shiny', ...COSTUMES]) expect(rules, value).toContain(`'${value}'`);
});
