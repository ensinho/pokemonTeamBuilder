import { describe, expect, it } from 'vitest';

import { CATEGORY_LISTS } from '../data/categoryListsData.js';
import { DAILY_QUIZ_SIZE, dailyQuizFor, dailyQuizPool, quizListById } from './dailyQuiz.js';

const DAY = 20772; // 2026-11-15

describe('dailyQuiz', () => {
    it('gives everyone the same category and the same names on a day', () => {
        const a = dailyQuizFor(DAY);
        const b = dailyQuizFor(DAY);
        expect(a.listId).toBe(b.listId);
        expect(a.names).toEqual(b.names);
    });

    it('asks for at most ten, all from the category, none twice', () => {
        for (let day = DAY; day < DAY + 200; day += 1) {
            const quiz = dailyQuizFor(day);
            expect(quiz.names.length).toBeGreaterThanOrEqual(6);
            expect(quiz.names.length).toBeLessThanOrEqual(DAILY_QUIZ_SIZE);
            expect(new Set(quiz.names).size).toBe(quiz.names.length);
            for (const name of quiz.names) expect(quiz.list.pokemonNames).toContain(name);
        }
    });

    it('changes category every day and visits every eligible one before repeating', () => {
        const pool = dailyQuizPool();
        const seen = new Set();
        let previous = null;
        for (let day = DAY; day < DAY + pool.length; day += 1) {
            const { listId } = dailyQuizFor(day);
            expect(listId).not.toBe(previous);
            previous = listId;
            seen.add(listId);
        }
        expect(seen.size).toBe(pool.length);
    });

    it('leaves out categories too short to be a game', () => {
        const pool = dailyQuizPool();
        expect(pool.length).toBeGreaterThan(40);
        expect(pool.every((list) => list.pokemonNames.length >= 6)).toBe(true);
        expect(pool.length).toBeLessThan(CATEGORY_LISTS.length);
    });

    it('draws a different ten from a long category on another day it comes up', () => {
        const pool = dailyQuizPool();
        const first = dailyQuizFor(DAY);
        const again = dailyQuizFor(DAY + pool.length);
        expect(again.listId).toBe(first.listId);
        if (first.list.pokemonNames.length > DAILY_QUIZ_SIZE + 4) expect(again.names).not.toEqual(first.names);
    });

    it('survives an empty table and a bad day', () => {
        expect(dailyQuizFor(DAY, [])).toBeNull();
        expect(dailyQuizFor(NaN).listId).toBe(dailyQuizFor(0).listId);
        expect(dailyQuizFor(-5).listId).toBe(dailyQuizFor(5).listId);
    });

    it('finds a shared category by id', () => {
        expect(quizListById(CATEGORY_LISTS[3].id)).toBe(CATEGORY_LISTS[3]);
        expect(quizListById('nope')).toBeNull();
    });
});
