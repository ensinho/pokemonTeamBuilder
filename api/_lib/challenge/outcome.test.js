import { describe, it, expect } from 'vitest';

import { DIALOGUE_KEYS, dialogueEvents } from './dialogue.js';
import { effectiveStreak, emptyStats, nextStats, resultOf, scoreOf } from './outcome.js';

describe('score', () => {
    it('rewards a quick, clean win and gives a loss nothing', () => {
        expect(scoreOf({ won: true, remaining: 2, hpPct: 41, turns: 23 })).toBe(1000 + 300 + 41 - 115);
        expect(scoreOf({ won: false, remaining: 0, hpPct: 0, turns: 10 })).toBe(0);
        expect(resultOf({ turns: 10, remaining: { p1: 3, p2: 0 }, hpPct: { p1: 50, p2: 0 } }, 'won').score).toBe(1000 + 450 + 50 - 50);
    });
});

describe('streak', () => {
    const play = (stats, dayKey, status, practice) => nextStats(stats, { dayKey, status, practice });

    it('grows on consecutive wins and resets on a loss', () => {
        let s = emptyStats('u');
        s = play(s, '2026-10-12', 'won');
        s = play(s, '2026-10-13', 'won');
        expect(s.streak).toBe(2);
        s = play(s, '2026-10-14', 'lost');
        expect(s.streak).toBe(0);
        expect(s.bestStreak).toBe(2);
        expect([s.played, s.wins, s.losses]).toEqual([3, 2, 1]);
    });

    it('restarts at 1 after a gap, and an expired run breaks it', () => {
        let s = play(emptyStats('u'), '2026-10-10', 'won');
        s = play(s, '2026-10-12', 'won');
        expect(s.streak).toBe(1);
        s = play(s, '2026-10-13', 'expired');
        expect(s.streak).toBe(0);
    });

    it('ignores practice and never counts a day twice', () => {
        const s = play(emptyStats('u'), '2026-10-12', 'won');
        expect(play(s, '2026-10-12', 'lost', true)).toBe(s);
        expect(play(s, '2026-10-12', 'lost')).toBe(s);
    });

    it('reads as broken once a day passes without a win', () => {
        const s = play(emptyStats('u'), '2026-10-12', 'won');
        expect(effectiveStreak(s, '2026-10-12')).toBe(1);
        expect(effectiveStreak(s, '2026-10-13')).toBe(1);
        expect(effectiveStreak(s, '2026-10-14')).toBe(0);
        expect(effectiveStreak(null, '2026-10-14')).toBe(0);
    });

    it('keeps only the last 60 days of history', () => {
        let s = emptyStats('u');
        for (let d = 1; d <= 70; d += 1) s = play(s, `2026-0${d <= 31 ? 7 : d <= 62 ? 8 : 9}-${String(d <= 31 ? d : d <= 62 ? d - 31 : d - 62).padStart(2, '0')}`, 'won');
        expect(Object.keys(s.history).length).toBeLessThanOrEqual(60);
    });
});

describe('dialogue', () => {
    const ctx = { said: [], aceSpecies: 'Garchomp', championName: 'Cynthia' };
    const opening = ['|teamsize|p1|2', '|teamsize|p2|2', '|switch|p1a: Pelipper|Pelipper, L50|100/100', '|switch|p2a: Spiritomb|Spiritomb, L50|100/100', '|turn|1'];

    it('opens with the intro once', () => {
        const first = dialogueEvents([], opening, ctx);
        expect(first.events.map((e) => e.key)).toEqual([DIALOGUE_KEYS.intro]);
        expect(dialogueEvents(opening, ['|turn|2'], { ...ctx, said: first.said }).events).toEqual([]);
    });

    it('reacts to her first loss, the ace and the last Pokémon — each once, at the right line', () => {
        const turn = ['|move|p1a: Pelipper|Hurricane|p2a: Spiritomb', '|-supereffective|p2a: Spiritomb', '|faint|p2a: Spiritomb', '|switch|p2a: Garchomp|Garchomp, L50|100/100', '|turn|2'];
        const { events, said } = dialogueEvents(opening, turn, { ...ctx, said: [DIALOGUE_KEYS.intro] });
        expect(events).toEqual([
            { key: DIALOGUE_KEYS.superEffective, at: 1 },
            { key: DIALOGUE_KEYS.firstLoss, params: { species: 'Spiritomb' }, at: 2 },
            { key: DIALOGUE_KEYS.lastOne, at: 2 },
            { key: DIALOGUE_KEYS.ace, params: { species: 'Garchomp' }, at: 3 },
        ]);
        expect(dialogueEvents([...opening, ...turn], ['|faint|p2a: Garchomp', '|win|Enzo'], { ...ctx, said }).events.map((e) => e.key))
            .toEqual([DIALOGUE_KEYS.lose]);
    });

    it('notices the battle turning', () => {
        const { events } = dialogueEvents(opening, ['|turn|2'], { ...ctx, said: [DIALOGUE_KEYS.intro], winProb: { before: 0.7, after: 0.4 } });
        expect(events.map((e) => e.key)).toEqual([DIALOGUE_KEYS.turned]);
    });
});
