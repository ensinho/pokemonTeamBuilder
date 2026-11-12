import { describe, expect, it } from 'vitest';
import { boardStatus, challengeBoardsOutcome, challengeDayPlan, challengeLink, championAction } from './challengeBoards';

describe('boardStatus', () => {
    it('reads an expired run as a loss and anything unknown as not played', () => {
        expect(boardStatus('expired')).toBe('lost');
        expect(boardStatus('lost')).toBe('lost');
        expect(boardStatus('won')).toBe('won');
        expect(boardStatus('active')).toBe('active');
        expect(boardStatus(null)).toBe('pending');
        expect(boardStatus('whatever')).toBe('pending');
    });
});

describe('challengeBoardsOutcome', () => {
    it('starts the day at 0/2 and points at the Time do dia', () => {
        const day = challengeBoardsOutcome({});
        expect(day.done).toBe(0);
        expect(day.total).toBe(2);
        expect(day.outcome).toBe('fresh');
        expect(day.next).toBe('daily');
        expect(day.mood).toBe('calm');
    });

    it('tells one win from one loss at 1/2, and points at the other board', () => {
        const won = challengeBoardsOutcome({ daily: 'won' });
        expect(won.done).toBe(1);
        expect(won.outcome).toBe('oneWon');
        expect(won.next).toBe('free');

        const lost = challengeBoardsOutcome({ free: 'expired' });
        expect(lost.outcome).toBe('oneLost');
        expect(lost.next).toBe('daily');
    });

    it('sends the action back to a battle in progress before an unplayed board', () => {
        const day = challengeBoardsOutcome({ daily: null, free: 'active' });
        expect(day.outcome).toBe('active');
        expect(day.next).toBe('free');
        expect(day.mood).toBe('live');
    });

    it('closes the day at 2/2 three ways', () => {
        expect(challengeBoardsOutcome({ daily: 'won', free: 'won' })).toMatchObject({ outcome: 'perfect', mood: 'gold', next: null, done: 2 });
        expect(challengeBoardsOutcome({ daily: 'lost', free: 'lost' })).toMatchObject({ outcome: 'defeated', mood: 'down', next: null });
        expect(challengeBoardsOutcome({ daily: 'won', free: 'lost' })).toMatchObject({ outcome: 'split', mood: 'calm', won: 1, lost: 1 });
    });
});

describe('challengeLink', () => {
    it('always names the champion, and the board only when it is a real one', () => {
        expect(challengeLink()).toBe('/challenge?champion=cynthia');
        expect(challengeLink({ champion: 'blue', board: 'free' })).toBe('/challenge?champion=blue&board=free');
        expect(challengeLink({ champion: 'blue', board: 'nope' })).toBe('/challenge?champion=blue');
        expect(challengeLink({ board: 'daily', view: 'ranking' })).toBe('/challenge?champion=cynthia&board=daily&view=ranking');
    });
});

describe('championAction', () => {
    it('opens the next board, or the ranking of the board won once the day is played', () => {
        expect(championAction('blue', challengeBoardsOutcome({ daily: 'won' }))).toBe('/challenge?champion=blue&board=free');
        expect(championAction('cynthia', challengeBoardsOutcome({ daily: 'lost', free: 'won' })))
            .toBe('/challenge?champion=cynthia&board=free&view=ranking');        expect(championAction('blue', challengeBoardsOutcome({ daily: 'lost', free: 'expired' })))
            .toBe('/challenge?champion=blue&board=daily');
    });
});

describe('challengeDayPlan', () => {
    it('counts the whole day across both champions', () => {
        const plan = challengeDayPlan([
            { id: 'cynthia', boards: { daily: 'won', free: 'lost' } },
            { id: 'blue', boards: { daily: 'won' } },
        ]);
        expect(plan.done).toBe(3);
        expect(plan.won).toBe(2);
        expect(plan.total).toBe(4);
        expect(plan.focus).toBe('blue');
    });

    it('leads with a battle in progress, else Cynthia', () => {
        expect(challengeDayPlan([{ id: 'cynthia', boards: {} }, { id: 'blue', boards: { free: 'active' } }]).focus).toBe('blue');
        expect(challengeDayPlan([{ id: 'cynthia', boards: {} }, { id: 'blue', boards: {} }]).focus).toBe('cynthia');
        expect(challengeDayPlan([
            { id: 'cynthia', boards: { daily: 'won', free: 'won' } },
            { id: 'blue', boards: { daily: 'won', free: 'won' } },
        ]).focus).toBe('cynthia');
        expect(challengeDayPlan([]).focus).toBe(null);
    });
});
