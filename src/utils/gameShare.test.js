import { describe, expect, it } from 'vitest';

import { createBoard, placeItem, setCell } from './tierList.js';
import {
    buildCategoryQuizShare, buildGenerationQuizShare, buildTierListShare, cleanQuizShare, cleanTierListShare,
    readQuizShare, readTierListShare,
} from './gameShare.js';

describe('tier list share', () => {
    it('is nothing until something is ranked', () => {
        expect(buildTierListShare(createBoard('starters'))).toBeNull();
    });

    it('carries the link code and reads back as the same list', () => {
        const board = placeItem(placeItem(createBoard('starters'), 7, 'S'), 4, 'A');
        const share = buildTierListShare(board);
        expect(share).toEqual({ v: 1, code: expect.stringMatching(/^t\.starters\./) });
        const read = readTierListShare(share);
        expect(read.tiers.S).toEqual([7]);
        expect(read.tiers.A).toEqual([4]);
        expect(read.count).toBe(2);
    });

    it('never carries the list’s own name', () => {
        const board = { ...placeItem(createBoard('starters'), 7, 'S'), title: 'meu segredo' };
        expect(JSON.stringify(buildTierListShare(board))).not.toContain('segredo');
    });

    it('carries a chart too', () => {
        const share = buildTierListShare(setCell(createBoard('types'), 'fire', 6));
        expect(readTierListShare(share).cells.fire).toBe(6);
    });

    it('refuses a payload someone made up', () => {
        expect(readTierListShare(null)).toBeNull();
        expect(readTierListShare({ v: 2, code: 't.starters.7....' })).toBeNull();
        expect(readTierListShare({ v: 1, code: 't.starters.zz....' })).toBeNull(); // not a starter
        expect(readTierListShare({ v: 1, code: '<script>' })).toBeNull();
        expect(readTierListShare({ v: 1, code: 42 })).toBeNull();
        expect(cleanTierListShare({ v: 1, code: 't.starters.7....', extra: 'x' })).toEqual({ v: 1, code: 't.starters.7....' });
    });
});

describe('quiz share', () => {
    it('carries a category run as an id and two figures', () => {
        const share = buildCategoryQuizShare({ listId: 'fire-starters-final', found: 8, total: 9, daily: true });
        expect(share).toEqual({ v: 1, mode: 'category', list: 'fire-starters-final', found: 8, total: 9, daily: true });
        expect(readQuizShare(share)).toEqual({ mode: 'category', listId: 'fire-starters-final', found: 8, total: 9, daily: true });
    });

    it('clamps what was found to the total', () => {
        expect(buildCategoryQuizShare({ listId: 'bats', found: 99, total: 8 }).found).toBe(8);
        expect(buildCategoryQuizShare({ listId: 'bats', found: -3, total: 8 }).found).toBe(0);
    });

    it('refuses a category run it cannot trust', () => {
        expect(buildCategoryQuizShare({ listId: 'Bad Id!', found: 1, total: 2 })).toBeNull();
        expect(buildCategoryQuizShare({ listId: 'bats', found: 1, total: 0 })).toBeNull();
        expect(buildCategoryQuizShare({ listId: 'bats', found: 1, total: 500 })).toBeNull();
        expect(readQuizShare({ v: 1, mode: 'category', list: 'bats', found: 9, total: 8 })).toBeNull();
        expect(readQuizShare({ v: 1, mode: 'category', list: 'bats', found: 1.5, total: 8 })).toBeNull();
        expect(readQuizShare({ v: 1, mode: 'category', list: '<b>', found: 1, total: 8 })).toBeNull();
        expect(readQuizShare({ v: 3, mode: 'category', list: 'bats', found: 1, total: 8 })).toBeNull();
        expect(readQuizShare(undefined)).toBeNull();
    });

    it('carries a generations run as its duel code', () => {
        const share = buildGenerationQuizShare({ generations: ['generation-i'], found: 120, total: 151 });
        expect(share).toEqual({ v: 1, mode: 'generations', duel: '1.120.151' });
        expect(readQuizShare(share)).toMatchObject({ mode: 'generations', generations: ['generation-i'], found: 120, total: 151 });
        expect(buildGenerationQuizShare({ generations: [], found: 1, total: 2 })).toBeNull();
        expect(readQuizShare({ v: 1, mode: 'generations', duel: 'nope' })).toBeNull();
    });

    it('writes only the checked fields', () => {
        const dirty = { v: 1, mode: 'category', list: 'bats', found: 3, total: 8, daily: 'yes', text: 'hello' };
        expect(cleanQuizShare(dirty)).toEqual({ v: 1, mode: 'category', list: 'bats', found: 3, total: 8, daily: false });
        expect(cleanQuizShare({ v: 1, mode: 'generations', duel: '1.5.151', x: 1 })).toEqual({ v: 1, mode: 'generations', duel: '1.5.151' });
        expect(cleanQuizShare({})).toBeNull();
    });
});
