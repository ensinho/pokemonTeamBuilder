import { describe, it, expect } from 'vitest';

import {
    CLAIM_STALE_MS, asksTeamPreview, emptyPending, historyFromChoices, recordChoice, roundLines,
    sidesOf, sidesOwingChoice, simNames,
} from './pvpState.js';

const both = { p1: true, p2: true };
const NOW = Date.parse('2026-10-20T12:00:00Z');

describe('recordChoice', () => {
    it('records the first answer and waits for the second', () => {
        const out = recordChoice({ pending: emptyPending(3), round: 3, owing: both, side: 'p1', choice: 'move 1', now: NOW });
        expect(out).toMatchObject({ recorded: true, complete: false, claimed: false, changed: true });
        expect(out.pending).toMatchObject({ round: 3, p1: 'move 1', p2: null });
    });

    it('lets the request that completes the round claim it', () => {
        const first = recordChoice({ pending: emptyPending(3), round: 3, owing: both, side: 'p1', choice: 'move 1', now: NOW });
        const second = recordChoice({ pending: first.pending, round: 3, owing: both, side: 'p2', choice: 'switch 2', now: NOW });
        expect(second).toMatchObject({ complete: true, claimed: true });
        expect(second.pending.claimedAt).toBe(new Date(NOW).toISOString());
    });

    it('never overwrites an answer already given', () => {
        const first = recordChoice({ pending: emptyPending(1), round: 1, owing: both, side: 'p1', choice: 'move 1', now: NOW });
        const again = recordChoice({ pending: first.pending, round: 1, owing: both, side: 'p1', choice: 'move 4', now: NOW });
        expect(again.recorded).toBe(false);
        expect(again.pending.p1).toBe('move 1');
    });

    it('completes a one-sided round with one answer', () => {
        const out = recordChoice({ pending: emptyPending(5), round: 5, owing: { p1: false, p2: true }, side: 'p2', choice: 'switch 3', now: NOW });
        expect(out).toMatchObject({ complete: true, claimed: true });
    });

    it('does not claim a round another request is resolving', () => {
        const pending = { round: 2, p1: 'move 1', p2: 'move 2', claimedAt: new Date(NOW - 1000).toISOString() };
        const out = recordChoice({ pending, round: 2, owing: both, side: 'p1', choice: null, now: NOW });
        expect(out).toMatchObject({ complete: true, claimed: false, changed: false });
    });

    it('takes over a claim left by a request that died', () => {
        const pending = { round: 2, p1: 'move 1', p2: 'move 2', claimedAt: new Date(NOW - CLAIM_STALE_MS - 1).toISOString() };
        expect(recordChoice({ pending, round: 2, owing: both, side: 'p1', choice: null, now: NOW }).claimed).toBe(true);
    });

    it('starts a fresh round when the stored one is behind', () => {
        const out = recordChoice({ pending: { round: 1, p1: 'move 1', p2: 'move 1', claimedAt: null }, round: 2, owing: both, side: 'p2', choice: null, now: NOW });
        expect(out.pending).toEqual(emptyPending(2));
        expect(out.changed).toBe(true);
    });
});

describe('roundLines', () => {
    it('writes the answers in p1, p2 order, only for the sides asked', () => {
        const pending = { round: 0, p1: 'move 2', p2: 'move 1' };
        expect(roundLines(pending, both)).toEqual(['>p1 move 2', '>p2 move 1']);
        expect(roundLines(pending, { p1: false, p2: true })).toEqual(['>p2 move 1']);
    });
});

describe('historyFromChoices', () => {
    it('rebuilds the history and the round being answered from legacy documents', () => {
        const sides = { p1: 'a', p2: 'b' };
        const byId = new Map([
            ['0_a', { choice: 'default' }], ['0_b', { choice: 'default' }],
            ['1_b', { choice: 'switch 2' }],
            ['2_a', { choice: 'move 3' }],
        ]);
        expect(historyFromChoices(byId, sides, 2)).toEqual({
            history: ['>p1 default', '>p2 default', '>p2 switch 2'],
            pending: { round: 2, p1: 'move 3', p2: null, claimedAt: null },
        });
    });
});

describe('the small readers', () => {
    it('maps the challenger to p1', () => {
        expect(sidesOf({ challenger: 'b', players: ['a', 'b'] })).toEqual({ p1: 'b', p2: 'a' });
    });

    it('reads who owes a choice from awaitingChoiceFrom, both when unknown', () => {
        const sides = { p1: 'a', p2: 'b' };
        expect(sidesOwingChoice({ awaitingChoiceFrom: ['b'] }, sides)).toEqual({ p1: false, p2: true });
        expect(sidesOwingChoice({}, sides)).toEqual(both);
    });

    it('spots team preview in a side\'s latest request', () => {
        expect(asksTeamPreview(['|request|{"teamPreview":true}'])).toBe(true);
        expect(asksTeamPreview(['|request|{"teamPreview":true}', '|request|{"active":[]}'])).toBe(false);
        expect(asksTeamPreview([])).toBe(false);
    });

    it('keeps two trainers with one name apart', () => {
        const battle = { playerNames: { a: 'Red', b: 'Red' } };
        expect(simNames(battle, { p1: 'a', p2: 'b' })).toEqual({ p1: 'Red', p2: 'Red (2)' });
    });
});
