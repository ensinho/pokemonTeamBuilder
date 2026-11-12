import { describe, expect, it } from 'vitest';
import { dayRoute, routeOrder } from './dayRoute';

describe('routeOrder', () => {
    it('puts the Champion after the battles and the persona first card', () => {
        expect(routeOrder(['battles', 'meta', 'puzzle', 'badge'])).toEqual(['battles', 'meta', 'champion', 'puzzle', 'badge']);
    });

    it('puts the Champion second when the order does not open with battles', () => {
        expect(routeOrder(['puzzle', 'badge'])).toEqual(['puzzle', 'champion', 'badge']);
    });

    it('leaves the Champion out when she is the hero', () => {
        expect(routeOrder(['battles', 'puzzle'], { withChampion: false })).toEqual(['battles', 'puzzle']);
    });

    it('never lists the Champion twice', () => {
        expect(routeOrder(['champion', 'puzzle']).filter((id) => id === 'champion')).toHaveLength(1);
    });
});

describe('dayRoute', () => {
    const order = ['battles', 'meta', 'champion', 'puzzle', 'badge'];

    it('makes the first open card the one to do now', () => {
        expect(dayRoute(order, { meta: 'open', champion: 'open', puzzle: 'open', badge: 'ambient' }))
            .toEqual({ done: [], now: 'meta', next: ['champion', 'puzzle', 'badge'] });
    });

    it('lets a battle that waits on the trainer jump ahead', () => {
        const route = dayRoute(['puzzle', 'battles'], { puzzle: 'open', battles: 'live' });
        expect(route.now).toBe('battles');
        expect(route.next).toEqual(['puzzle']);
    });

    it('turns finished cards into stamps, in order', () => {
        expect(dayRoute(order, { meta: 'open', champion: 'done', puzzle: 'done', badge: 'ambient' }))
            .toEqual({ done: ['champion', 'puzzle'], now: 'meta', next: ['badge'] });
    });

    it('falls back to a standing goal when everything else is done', () => {
        expect(dayRoute(order, { champion: 'done', puzzle: 'done', badge: 'ambient' }))
            .toEqual({ done: ['champion', 'puzzle'], now: 'badge', next: [] });
    });

    it('skips cards with nothing to say', () => {
        expect(dayRoute(order, { puzzle: 'open' })).toEqual({ done: [], now: 'puzzle', next: [] });
    });

    it('has no card to do when everything is done', () => {
        expect(dayRoute(['puzzle'], { puzzle: 'done' })).toEqual({ done: ['puzzle'], now: null, next: [] });
    });
});
