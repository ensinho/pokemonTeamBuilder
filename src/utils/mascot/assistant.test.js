import { describe, it, expect } from 'vitest';
import { COSTUMES, battleMood, PERSONA_COSTUME, costumeHat, homeNote, patienceStage, teamVerdict, verdictImproved, VERDICT_RANK } from './assistant';
import { MOODS } from './catalog';
import { HATS } from './rig';
import { PERSONAS } from '../trainerProfile';

const analysis = (weak = {}, strengths = 0) => ({ weaknesses: weak, strengths: new Set(Array.from({ length: strengths }, (_, i) => `t${i}`)) });

describe('teamVerdict', () => {
    it('says nothing about an empty team', () => {
        expect(teamVerdict(analysis(), 0)).toBeNull();
    });

    it('worries about weaknesses before anything else, worst first', () => {
        const v = teamVerdict(analysis({ ice: 3, fairy: 4 }, 4), 6);
        expect(v).toMatchObject({ id: 'weak', mood: 'preocupado', types: ['fairy', 'ice'] });
        expect(teamVerdict(analysis({ ice: 3 }, 16), 6).id).toBe('hole');
    });

    it('never frowns beside a good grade: weaknesses on a solid team are a heads-up', () => {
        // 50 + 16×2 − 2×7.5 + 5 = 72, "solid" (the 2026-11-10 capture: "Muitas fraquezas…" next to "94 Excelente")
        expect(teamVerdict(analysis({ ground: 3, rock: 3 }, 16), 6)).toMatchObject({ id: 'hole', types: ['ground', 'rock'] });
    });

    it('does not judge one or two members: a lone Pokémon\'s weaknesses are not the team\'s', () => {
        expect(teamVerdict(analysis({ fire: 1, ice: 1, flying: 1, psychic: 1 }, 5), 1).id).toBe('start');
        expect(teamVerdict(analysis({ fire: 2, ice: 1 }, 7), 2).id).toBe('start');
        expect(teamVerdict(analysis({ fire: 2, ice: 2 }, 7), 3).id).toBe('weak');
    });

    it('follows the team as it grows, and tells a full team from a great one', () => {
        expect(teamVerdict(analysis({}, 4), 1).id).toBe('start');
        expect(teamVerdict(analysis({}, 9), 4).id).toBe('growing');
        expect(teamVerdict(analysis({}, 12), 6).id).toBe('complete');
        expect(teamVerdict(analysis({}, 14), 6).id).toBe('coverage');
        // analyzeTeam's strengths may arrive as an array (a saved analysis)
        expect(teamVerdict({ weaknesses: {}, strengths: Array.from({ length: 15 }, (_, i) => i) }, 6).id).toBe('coverage');
    });

    it('names only moods the catalog draws, and ranks every verdict', () => {
        const all = [teamVerdict(analysis({ a: 1, b: 1 }), 6), teamVerdict(analysis({ a: 1 }), 6), teamVerdict(analysis(), 1),
            teamVerdict(analysis(), 4), teamVerdict(analysis(), 6), teamVerdict(analysis({}, 18), 6)];
        for (const v of all) {
            expect(MOODS[v.mood]).toBeTruthy();
            expect(VERDICT_RANK).toContain(v.id);
        }
        expect(new Set(all.map((v) => v.id)).size).toBe(VERDICT_RANK.length);
    });

    it('cheers a step up only', () => {
        expect(verdictImproved('hole', 'complete')).toBe(true);
        expect(verdictImproved('complete', 'hole')).toBe(false);
        expect(verdictImproved('complete', 'complete')).toBe(false);
        expect(verdictImproved(null, 'complete')).toBe(false); // a team that loaded is not an act
    });
});

describe('homeNote', () => {
    const day = { hour: 14, checkedIn: true, streak: 5, shields: 0, puzzle: 'done', challenge: 'done', battlesWaiting: 0 };

    it('puts a waiting friend first', () => {
        expect(homeNote({ ...day, battlesWaiting: 1, puzzle: 'open' })).toMatchObject({ id: 'battleOne', to: '/battles' });
        expect(homeNote({ ...day, battlesWaiting: 3 })).toMatchObject({ id: 'battles', n: 3 });
    });

    it('mentions the streak only in the evening, only when there is one, and never as a threat when a shield covers it', () => {
        expect(homeNote({ ...day, checkedIn: false, hour: 10 })).toBeNull();
        expect(homeNote({ ...day, checkedIn: false, hour: 20, streak: 1 })).toBeNull();
        expect(homeNote({ ...day, checkedIn: false, hour: 20 })).toMatchObject({ id: 'streak', n: 5 });
        expect(homeNote({ ...day, checkedIn: false, hour: 20, shields: 1 })).toMatchObject({ id: 'streakShield', mood: 'aliviado' });
    });

    it('points at the day\'s open door, the puzzle before the Champion', () => {
        expect(homeNote({ ...day, puzzle: 'open', challenge: 'open' })).toMatchObject({ id: 'puzzle', to: '/pokepuzzle' });
        expect(homeNote({ ...day, challenge: 'open' })).toMatchObject({ id: 'challenge', to: '/challenge' });
    });

    it('rests when the day is done — asleep at night — and a guest, who has no Champion, still gets there', () => {
        expect(homeNote(day)).toMatchObject({ id: 'rest' });
        expect(homeNote({ ...day, challenge: 'none', hour: 23 })).toMatchObject({ id: 'restNight', mood: 'sonolento' });
        expect(homeNote(day).to).toBeUndefined();
    });

    it('is silent while it does not know, and for a brand-new trainer', () => {
        expect(homeNote({ ...day, puzzle: null })).toBeNull();
        expect(homeNote({ ...day, challenge: null })).toBeNull();
        expect(homeNote({ ...day, isNew: true, battlesWaiting: 2 })).toBeNull();
        expect(homeNote()).toBeNull();
    });

    it('names only moods the catalog draws', () => {
        const notes = [
            homeNote({ ...day, battlesWaiting: 1 }), homeNote({ ...day, checkedIn: false, hour: 20 }),
            homeNote({ ...day, checkedIn: false, hour: 20, shields: 1 }), homeNote({ ...day, puzzle: 'open' }),
            homeNote({ ...day, challenge: 'open' }), homeNote(day), homeNote({ ...day, hour: 2 }),
        ];
        for (const n of notes) expect(MOODS[n.mood]).toBeTruthy();
    });
});

describe('patienceStage', () => {
    it('stays quiet, then keeps company, then admits it is long', () => {
        expect([0, 3999, 4000, 9999, 10000, 60000].map(patienceStage)).toEqual([0, 0, 1, 1, 2, 2]);
    });
});

describe('costumes', () => {
    it('are all hats the rig draws, one per persona', () => {
        for (const c of COSTUMES) expect(HATS[c]).toBeTypeOf('function');
        for (const id of Object.keys(PERSONAS)) expect(COSTUMES).toContain(PERSONA_COSTUME[id]);
    });

    it('resolve a choice to a hat', () => {
        expect(costumeHat('persona', 'traveler')).toBe('explorer');
        expect(costumeHat('persona', null)).toBeNull();
        expect(costumeHat('glasses')).toBe('glasses');
        expect(costumeHat('none')).toBeNull();
        expect(costumeHat('crown')).toBeNull(); // gold is earned, never worn by choice
    });
});

describe('battleMood', () => {
    const moments = [
        { type: 'intro' }, { type: 'dialogue' }, { type: 'end' }, { type: 'move', side: 'p1' }, { type: 'switch', side: 'p2' },
        ...['p1', 'p2'].flatMap((side) => [
            { type: 'mega', side }, { type: 'tera', side }, { type: 'zpower', side }, { type: 'faint', side },
            { type: 'status', side }, { type: 'cure', side }, { type: 'cant', side },
            { type: 'stat', side, amount: 2 }, { type: 'stat', side, amount: -1 },
            { type: 'hp', side, heal: true }, { type: 'hp', side, heal: false },
            ...['supereffective', 'crit', 'resisted', 'immune', 'miss', 'fail'].map((kind) => ({ type: 'effect', kind, side })),
        ]),
    ];

    it('names a real mood for every moment and every idle state', () => {
        for (const event of moments) expect(MOODS, JSON.stringify(event)).toHaveProperty(battleMood(event));
        for (const facts of [{}, { yourTurn: true }, { yourTurn: true, hpPct: 10 }, { waiting: true }, { ended: true }, { ended: true, won: true }]) {
            expect(MOODS).toHaveProperty(battleMood(null, facts));
        }
    });

    it('roots for the trainer', () => {
        // The effect line names who was hit.
        expect(battleMood({ type: 'effect', kind: 'supereffective', side: 'p2' })).toBe('empolgado');
        expect(battleMood({ type: 'effect', kind: 'supereffective', side: 'p1' })).toBe('assustado');
        expect(battleMood({ type: 'stat', side: 'p1', amount: 2 })).toBe('confiante');
        expect(battleMood({ type: 'stat', side: 'p2', amount: -1 })).toBe('confiante');
        expect(battleMood({ type: 'stat', side: 'p2', amount: 2 })).toBe('preocupado');
        expect(battleMood({ type: 'faint', side: 'p2' })).toBe('animado');
        expect(battleMood({ type: 'faint', side: 'p1' })).toBe('triste');
    });

    it('reads the trainer\'s side, not always p1', () => {
        expect(battleMood({ type: 'faint', side: 'p2' }, { mySide: 'p2' })).toBe('triste');
    });

    it('worries on a turn at low HP, and ends on the result', () => {
        expect(battleMood(null, { yourTurn: true, hpPct: 80 })).toBe('determinado');
        expect(battleMood(null, { yourTurn: true, hpPct: 20 })).toBe('preocupado');
        expect(battleMood({ type: 'end' }, { won: true })).toBe('radiante');
        expect(battleMood(null, { ended: true, won: false })).toBe('triste');
    });
});
