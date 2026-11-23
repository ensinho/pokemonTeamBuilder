import { describe, expect, it } from 'vitest';
import { inheritedVersionMoves, mergeInheritedMoves } from './inheritedMoves';

describe('mergeInheritedMoves', () => {
    it('adds a pre-evolution egg move the evolved form lacks (Aegislash ← Honedge)', () => {
        const merged = mergeInheritedMoves(
            [{ name: 'kings-shield' }, { name: 'shadow-sneak' }],
            [{ from: 'doublade', moves: [{ name: 'shadow-sneak' }] }, { from: 'honedge', moves: [{ name: 'destiny-bond' }] }],
        );
        expect(merged.map((m) => m.name)).toEqual(['kings-shield', 'shadow-sneak', 'destiny-bond']);
        expect(merged[2].inheritedFrom).toBe('honedge');
        expect(merged[1].inheritedFrom).toBeUndefined();
    });

    it('returns the own list untouched when there is nothing to add', () => {
        const own = [{ name: 'tackle' }];
        expect(mergeInheritedMoves(own, [])).toEqual(own);
    });
});

describe('inheritedVersionMoves', () => {
    const vg = (name, method) => ({ version_group: { name }, move_learn_method: { name: method }, level_learned_at: 0 });
    it('keeps only the version group shown and skips moves the Pokémon learns itself', () => {
        const own = [{ move: { name: 'kings-shield' }, version_group_details: [vg('sword-shield', 'level-up')] }];
        const prevo = [
            { move: { name: 'destiny-bond', url: 'u' }, version_group_details: [vg('sword-shield', 'egg')] },
            { move: { name: 'kings-shield' }, version_group_details: [vg('sword-shield', 'egg')] },
            { move: { name: 'old-move' }, version_group_details: [vg('x-y', 'egg')] },
        ];
        expect(inheritedVersionMoves(own, prevo, 'sword-shield')).toEqual([
            { name: 'destiny-bond', url: 'u', learnMethod: 'egg', level: 0 },
        ]);
    });
});
