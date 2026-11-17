import { describe, it, expect } from 'vitest';
import { cleanStrip, pickStrip, readStrip, stripEvent } from './battleStrip';

const events = [
    { type: 'switch', side: 'p1', species: 'Garchomp' },
    { type: 'switch', side: 'p2', species: 'Spiritomb' },
    { type: 'move', side: 'p1', species: 'Garchomp', move: 'Earthquake' },
    { type: 'effect', side: 'p2', species: 'Spiritomb', kind: 'supereffective' },
    { type: 'faint', side: 'p2', species: 'Spiritomb' },
    { type: 'end', winner: 'Trainer' },
];

describe('pickStrip', () => {
    it('plays a battle back in three panels: her opening, the turn, the end', () => {
        const panels = pickStrip(events, { won: true });
        expect(panels).toHaveLength(3);
        expect(panels[0]).toMatchObject({ mood: 'desafiador', events: [{ type: 'switch', side: 'p2', species: 'Spiritomb' }] });
        expect(panels[1].mood).toBe('empolgado');
        expect(panels[1].events.map((e) => e.type)).toEqual(['move', 'effect']);
        expect(panels[2]).toMatchObject({ mood: 'radiante', events: [{ type: 'end', won: true }] });
    });

    it("prefers the trainer's own gimmick for the turn", () => {
        const withMega = [...events.slice(0, 2), { type: 'mega', side: 'p1', species: 'Garchomp', mega: 'Garchomp-Mega' }, ...events.slice(2)];
        expect(pickStrip(withMega, { won: true })[1]).toMatchObject({ mood: 'brilhando', events: [{ type: 'mega' }] });
    });

    it('is empty for no battle', () => {
        expect(pickStrip([], {})).toEqual([]);
    });
});

describe('the strip on the forum', () => {
    it('travels clean and reads back the same', () => {
        const strip = cleanStrip(pickStrip(events, { won: false }));
        expect(readStrip(strip)).toEqual(strip);
        expect(strip[2].events[0].won).toBe(false);
    });

    it('refuses what is not a strip', () => {
        expect(readStrip([{ mood: 'feliz', events: [{ type: 'move', move: '<script>' }] }])).toBe(null);
        expect(readStrip([{ mood: 'Feliz!', events: [{ type: 'end' }] }])).toBe(null);
        expect(readStrip([{ mood: 'feliz', events: [{ type: 'effect', kind: 'oops' }] }])).toBe(null);
        expect(readStrip('nope')).toBe(null);
    });

    it('names the end the way eventText reads it', () => {
        expect(stripEvent({ type: 'end', won: false }, 'Cynthia')).toEqual({ type: 'end', winner: 'Cynthia' });
        expect(stripEvent({ type: 'end', won: true }, 'Cynthia').winner).not.toBe('Cynthia');
    });
});
