import { describe, it, expect } from 'vitest';
import { CHAMPION_MOMENTS, finaleFor, hallDate, hallEntryAt, hallTeam, irisOrigin } from './championMoments';
import { CHAMPION_ROOM } from './arenaMap';

const request = (mons) => `|request|${JSON.stringify({ side: { pokemon: mons.map((species, i) => ({ details: `${species}, L50`, condition: i === 0 ? '0 fnt' : '120/150', active: i === 0 })) } })}`;

describe('the finale a run gets', () => {
    const run = (extra) => ({ runId: 'r1', status: 'won', practice: false, ...extra });

    it('enters an official win played on this screen into the Hall of Fame', () => {
        expect(finaleFor(run(), 'r1')).toBe('hall');
    });

    it('closes an official loss (or a forfeit) to black', () => {
        expect(finaleFor(run({ status: 'lost' }), 'r1')).toBe('blackout');
        expect(finaleFor(run({ status: 'forfeit' }), 'r1')).toBe('blackout');
    });

    it('plays nothing for a result opened later, a practice run or no run', () => {
        expect(finaleFor(run(), 'other')).toBeNull();
        expect(finaleFor(run(), null)).toBeNull();
        expect(finaleFor(run({ practice: true }), 'r1')).toBeNull();
        expect(finaleFor(null, 'r1')).toBeNull();
        expect(finaleFor(run({ status: 'active' }), 'r1')).toBeNull();
    });
});

describe('the power-on iris', () => {
    it('opens on the trainer\'s spawn tile', () => {
        // the room's S sits at column 7, row 10 of a 16 × 12 map
        expect(irisOrigin(CHAMPION_ROOM)).toEqual({ x: '46.9%', y: '87.5%' });
    });

    it('falls back to the bottom middle of a map without a spawn', () => {
        expect(irisOrigin({ width: 10, height: 10, rows: Array(10).fill('..........') })).toEqual({ x: '55%', y: '95%' });
    });
});

describe('the Hall of Fame', () => {
    it('shows the trainer\'s own six, fainted ones included, in order', () => {
        const lines = ['|start', request(['Garchomp', 'Rotom-Wash', 'Gengar', 'Kingambit', 'Dragonite', 'Pelipper', 'Extra'])];
        expect(hallTeam(lines)).toEqual(['Garchomp', 'Rotom-Wash', 'Gengar', 'Kingambit', 'Dragonite', 'Pelipper']);
        expect(hallTeam([])).toEqual([]);
    });

    it('dates the plaque with the challenge day', () => {
        expect(hallDate('2026-11-22')).toBe('22/11/2026');
        expect(hallDate('')).toBe('');
        expect(hallDate('nope')).toBe('');
    });

    it('lets every Pokémon in before the plaque, and the plaque before the hand-over', () => {
        expect(hallEntryAt(5)).toBeLessThan(CHAMPION_MOMENTS.hallTitle);
        expect(CHAMPION_MOMENTS.hallTitle).toBeLessThan(CHAMPION_MOMENTS.hall);
        expect(CHAMPION_MOMENTS.hall).toBeLessThanOrEqual(4000);
    });
});
