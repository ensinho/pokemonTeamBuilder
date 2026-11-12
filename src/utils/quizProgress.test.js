import { describe, expect, it } from 'vitest';
import { formatClock, modeOfRun, nextStarGoal, runIdFor, sprintSecondsLeft, starsFor } from './quizProgress';

describe('quizProgress', () => {
    it('keeps the classic run under the bare signature and a mode run beside it', () => {
        expect(runIdFor('generation-i')).toBe('generation-i');
        expect(runIdFor('generation-i', 'classic')).toBe('generation-i');
        expect(runIdFor('generation-i', 'sprint')).toBe('generation-i~sprint');
        expect(runIdFor('all', 'flawless')).toBe('all~flawless');
        expect(runIdFor('all', 'nonsense')).toBe('all');
    });

    it('reads a run saved before modes existed as classic', () => {
        expect(modeOfRun({ id: 'generation-i' })).toBe('classic');
        expect(modeOfRun({ mode: 'sprint' })).toBe('sprint');
        expect(modeOfRun({ mode: 'other' })).toBe('classic');
        expect(modeOfRun(null)).toBe('classic');
    });

    it('gives a star at half, at four fifths and at the whole region', () => {
        expect(starsFor(0, 151)).toBe(0);
        expect(starsFor(75, 151)).toBe(0);
        expect(starsFor(76, 151)).toBe(1);
        expect(starsFor(120, 151)).toBe(1);
        expect(starsFor(121, 151)).toBe(2);
        expect(starsFor(150, 151)).toBe(2);
        expect(starsFor(151, 151)).toBe(3);
        expect(starsFor(10, 0)).toBe(0);
    });

    it('names the next star and how far it is', () => {
        expect(nextStarGoal(41, 151)).toEqual({ star: 1, missing: 35 });
        expect(nextStarGoal(76, 151)).toEqual({ star: 2, missing: 45 });
        expect(nextStarGoal(121, 151)).toEqual({ star: 3, missing: 30 });
        expect(nextStarGoal(151, 151)).toBeNull();
        expect(nextStarGoal(0, 0)).toBeNull();
    });

    it('counts a sprint down and never below zero', () => {
        expect(sprintSecondsLeft(60_000, 0)).toBe(60);
        expect(sprintSecondsLeft(60_000, 59_100)).toBe(1);
        expect(sprintSecondsLeft(60_000, 61_000)).toBe(0);
        expect(formatClock(65)).toBe('1:05');
        expect(formatClock(9)).toBe('0:09');
    });
});
