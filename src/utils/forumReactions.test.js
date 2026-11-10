import { describe, expect, it } from 'vitest';
import { REACTION_KINDS, myReaction, nextReaction, summarizeReactions } from './forumReactions';
import { MOODS } from './mascot/catalog';
import { TONES } from './mascot/constants';

describe('forum reactions', () => {
    const reactions = { a: 'super', b: 'super', c: 'crit', me: 'crit', x: 'bogus' };
    it('counts kinds, most first, and ignores unknown ones', () => {
        const s = summarizeReactions(reactions, 'me');
        expect(s.map((k) => [k.id, k.count, k.mine])).toEqual([['super', 2, false], ['crit', 2, true]]);
    });
    it('knows mine and toggles', () => {
        expect(myReaction(reactions, 'me')).toBe('crit');
        expect(myReaction(reactions, 'x')).toBeNull();
        expect(nextReaction('crit', 'crit')).toBeNull();
        expect(nextReaction('crit', 'super')).toBe('super');
    });

    it('gives every line a face the mascot draws, in a tone the rig knows', () => {
        for (const kind of REACTION_KINDS) {
            expect(MOODS[kind.mood]).toBeTruthy();
            expect(TONES).toContain(kind.tone);
        }
    });
});
