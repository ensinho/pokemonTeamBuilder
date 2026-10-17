import { describe, it, expect } from 'vitest';
import { buildCommentTree, displayAncestors } from './forumTree';

let clock = Date.parse('2026-10-17T10:00:00Z');
const c = (id, parent = null, likes = 0) => ({
    id,
    createdAt: new Date((clock += 60000)).toISOString(),
    replyTo: parent ? { messageId: parent } : null,
    likedBy: Array.from({ length: likes }, (_, i) => `u${i}`),
});

const ids = (nodes) => nodes.map((n) => n.comment.id);

describe('buildCommentTree', () => {
    it('nests replies under the comment they answer', () => {
        const list = [c('a'), c('b'), c('a1', 'a'), c('a1x', 'a1'), c('a2', 'a')];
        const { roots } = buildCommentTree(list);
        expect(ids(roots)).toEqual(['a', 'b']);
        expect(ids(roots[0].children)).toEqual(['a1', 'a2']);
        expect(ids(roots[0].children[0].children)).toEqual(['a1x']);
        expect(roots[0].descendants).toBe(3);
        expect(roots[0].children[0].showQuote).toBe(false);
    });

    it('makes a reply to an unloaded comment a root that shows its quote', () => {
        const { roots } = buildCommentTree([c('x', 'gone'), c('y')]);
        expect(ids(roots)).toEqual(['x', 'y']);
        expect(roots[0].showQuote).toBe(true);
        expect(roots[1].showQuote).toBe(false);
    });

    it('sorts top-level comments by Top, New or Old', () => {
        const list = [c('first', null, 1), c('second', null, 5), c('third', null, 1)];
        expect(ids(buildCommentTree(list, { sort: 'top' }).roots)).toEqual(['second', 'first', 'third']);
        expect(ids(buildCommentTree(list, { sort: 'new' }).roots)).toEqual(['third', 'second', 'first']);
        expect(ids(buildCommentTree(list, { sort: 'old' }).roots)).toEqual(['first', 'second', 'third']);
    });

    it('keeps replies in conversation order unless sorting by Top', () => {
        const list = [c('p'), c('r1', 'p', 0), c('r2', 'p', 3)];
        expect(ids(buildCommentTree(list, { sort: 'new' }).roots[0].children)).toEqual(['r1', 'r2']);
        expect(ids(buildCommentTree(list, { sort: 'top' }).roots[0].children)).toEqual(['r2', 'r1']);
    });

    it('stops indenting at the depth cap and flattens the rest with quotes', () => {
        const list = [c('d0'), c('d1', 'd0'), c('d2', 'd1'), c('d3', 'd2'), c('d3b', 'd2')];
        const { roots, parentOf } = buildCommentTree(list, { maxDepth: 1 });
        const d1 = roots[0].children[0];
        expect(d1.depth).toBe(1);
        expect(ids(d1.children)).toEqual(['d2', 'd3', 'd3b']);
        expect(d1.children.every((n) => n.children.length === 0)).toBe(true);
        expect(d1.children[0].showQuote).toBe(false);
        expect(d1.children[1].showQuote).toBe(true);
        expect(displayAncestors(parentOf, 'd3')).toEqual(['d1', 'd0']);
        expect(roots[0].descendants).toBe(4);
    });

    it('keeps a flat list for a chat room', () => {
        const list = [c('m1'), c('m2', 'm1'), c('m3')];
        const { roots } = buildCommentTree(list, { nest: false });
        expect(ids(roots)).toEqual(['m1', 'm2', 'm3']);
        expect(roots[1].showQuote).toBe(true);
        expect(roots.every((n) => n.children.length === 0)).toBe(true);
    });

    it('survives a self-reply and empty input', () => {
        const self = { ...c('s'), replyTo: { messageId: 's' } };
        expect(ids(buildCommentTree([self]).roots)).toEqual(['s']);
        expect(buildCommentTree(null).roots).toEqual([]);
    });
});
