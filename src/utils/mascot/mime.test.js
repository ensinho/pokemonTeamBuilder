import { describe, it, expect } from 'vitest';
import { MIME_GESTURES, generationNumber, mimeFor, pickMime } from './mime';
import { MOODS, POSES } from './catalog';
import { TONES } from './constants';

describe('the mime', () => {
    it('names only moods and poses the rig has, one gesture per type', () => {
        expect(Object.keys(MIME_GESTURES).sort()).toEqual([...TONES].sort());
        for (const [type, g] of Object.entries(MIME_GESTURES)) {
            expect(MOODS[g.mood], `${type} mood`).toBeTruthy();
            if (g.pose) expect(POSES[g.pose], `${type} pose`).toBeTruthy();
        }
    });

    it('takes the colour of the first type, and the figures', () => {
        expect(mimeFor({ types: ['fire', 'flying'], generation: 'generation-i' }, { height: 1.7 })).toMatchObject({
            type: 'fire', tone: 'fire', pose: 'segurandoChama', height: 1.7, gen: 1,
        });
        expect(mimeFor({}, null)).toMatchObject({ type: 'normal', height: null, gen: null });
    });

    it('reads a generation', () => {
        expect(generationNumber('generation-iv')).toBe(4);
        expect(generationNumber('generation-ix')).toBe(9);
        expect(generationNumber('nope')).toBe(null);
    });

    it('picks the same missing one for the same run and step', () => {
        const list = ['a', 'b', 'c', 'd'];
        expect(pickMime(list, 'run:3')).toBe(pickMime(list, 'run:3'));
        expect(list).toContain(pickMime(list, 'run:4'));
        expect(pickMime([], 'x')).toBe(null);
    });
});
