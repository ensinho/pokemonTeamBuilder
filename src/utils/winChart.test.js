import { describe, it, expect } from 'vitest';

import { biggestSwing, chartGeometry, nearestIndex, percent, swingCause, toPoints } from './winChart';

const LOG = [
    '|switch|p1a: Pelipper|Pelipper, L50, M|160/160',
    '|switch|p2a: Spiritomb|Spiritomb, L58, F|100/100',
    '|turn|1',
    '|move|p1a: Pelipper|Hurricane|p2a: Spiritomb',
    '|-damage|p2a: Spiritomb|70/100',
    '|move|p2a: Spiritomb|Shadow Ball|p1a: Pelipper',
    '|-damage|p1a: Pelipper|120/160',
    '|turn|2',
    '|switch|p2a: Garchomp|Garchomp, L62, F|100/100',
    '|move|p1a: Pelipper|Hurricane|p2a: Garchomp',
    '|-damage|p2a: Garchomp|85/100',
    '|turn|3',
    '|move|p2a: Garchomp|Stone Edge|p1a: Pelipper',
    '|-damage|p1a: Pelipper|0 fnt',
    '|faint|p1a: Pelipper',
];

describe('the win-chance chart', () => {
    it('pairs the curve with its marks, and ignores marks that do not match', () => {
        const points = toPoints([0.5, 0.62, 0.3], [{ turn: 1, line: 3 }, { turn: 2, line: 8 }, { turn: 3, line: 15 }]);
        expect(points[1]).toEqual({ i: 1, p: 0.62, turn: 2, line: 8 });
        expect(toPoints([0.5, 1.2], [{ turn: 1, line: 3 }])).toEqual([
            { i: 0, p: 0.5, turn: null, line: null },
            { i: 1, p: 1, turn: null, line: null }, // clamped, and no half-matched marks
        ]);
    });

    it('finds the biggest swing in either direction, and none in a quiet battle', () => {
        expect(biggestSwing(toPoints([0.5, 0.62, 0.3, 0.35]))).toEqual({ index: 2, delta: expect.closeTo(-0.32, 5) });
        expect(biggestSwing(toPoints([0.5, 0.52, 0.49]))).toBe(null);
        expect(biggestSwing(toPoints([0.5]))).toBe(null);
    });

    it('names the knockout that caused a swing, with the move and the turn', () => {
        expect(swingCause(LOG, 11, 15, 2)).toEqual({
            kind: 'faint', target: 'Pelipper', targetSide: 'p1', by: 'Garchomp', move: 'Stone Edge', turn: 3,
        });
    });

    it('falls back to the move that took the most HP when nobody fainted', () => {
        // Turn 1: Hurricane took 30% of Spiritomb, Shadow Ball 25% of Pelipper.
        expect(swingCause(LOG, 2, 8, 1)).toEqual({ kind: 'move', by: 'Pelipper', move: 'Hurricane', turn: 1 });
        // HP before the slice counts: Garchomp came in at 100%, Hurricane took 15%.
        expect(swingCause(LOG, 8, 11, 2)).toEqual({ kind: 'move', by: 'Pelipper', move: 'Hurricane', turn: 2 });
        expect(swingCause(LOG, 0, 2)).toBe(null);
    });

    it('lays the curve out with 100% on top and closes the area on the 50% line', () => {
        const points = toPoints([0.5, 1, 0]);
        const g = chartGeometry(points, { width: 100, height: 50, left: 10 });
        expect(g.x(0)).toBe(10);
        expect(g.x(2)).toBe(100);
        expect(g.y(1)).toBe(0);
        expect(g.y(0)).toBe(50);
        expect(g.midY).toBe(25);
        expect(g.line).toBe('M10,25L55,0L100,50');
        expect(g.area).toBe('M10,25L55,0L100,50L100,25L10,25Z');
        expect(nearestIndex(points, 60, g)).toBe(1);
        expect(percent(0.625)).toBe(63);
    });
});
