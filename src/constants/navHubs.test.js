import { describe, expect, it } from 'vitest';
import { hubForPath, hubMembers } from './navHubs';

describe('navHubs', () => {
    it('finds the hub of a list page only', () => {
        expect(hubForPath('/moves')).toBe('library');
        expect(hubForPath('/items')).toBe('library');
        expect(hubForPath('/tournaments')).toBe('meta');
        expect(hubForPath('/moves/tackle')).toBeNull();
        expect(hubForPath('/meta/pikachu')).toBeNull();
        expect(hubForPath('/builder')).toBeNull();
    });

    it('lists member page keys in switcher order', () => {
        expect(hubMembers('library')).toEqual(['moves', 'abilities', 'items']);
        expect(hubMembers('meta')).toEqual(['meta', 'bestTeams', 'tournaments']);
    });
});
