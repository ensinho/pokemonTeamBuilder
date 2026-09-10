import { describe, it, expect } from 'vitest';
import { getRevealState } from './progressiveReveal';

describe('getRevealState', () => {
    it('renders everything when disabled', () => {
        expect(getRevealState(300, 12, false)).toEqual({ limit: 300, remaining: 0, hasMore: false });
    });

    it('limits to the revealed count and reports what is left', () => {
        expect(getRevealState(300, 12)).toEqual({ limit: 12, remaining: 288, hasMore: true });
    });

    it('never reports more than the list holds (a search shrank it)', () => {
        expect(getRevealState(5, 36)).toEqual({ limit: 5, remaining: 0, hasMore: false });
    });

    it('hides the button when the page exactly fits', () => {
        expect(getRevealState(12, 12)).toEqual({ limit: 12, remaining: 0, hasMore: false });
    });

    it('treats empty and malformed input as an empty list', () => {
        expect(getRevealState(0, 12)).toEqual({ limit: 0, remaining: 0, hasMore: false });
        expect(getRevealState(undefined, undefined)).toEqual({ limit: 0, remaining: 0, hasMore: false });
        expect(getRevealState(10, -4)).toEqual({ limit: 0, remaining: 10, hasMore: true });
    });
});
