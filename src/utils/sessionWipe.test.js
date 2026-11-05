import { describe, it, expect } from 'vitest';
import { wipeUserStorage, isDeviceKey, LEFT_SESSION_KEY } from './sessionWipe';

const memoryStorage = (entries = {}) => {
    const map = new Map(Object.entries(entries));
    return {
        get length() { return map.size; },
        key: (i) => [...map.keys()][i] ?? null,
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k),
        keys: () => [...map.keys()].sort(),
    };
};

describe('wipeUserStorage', () => {
    it('erases the trainer and keeps the device', () => {
        const local = memoryStorage({
            theme: 'dark',
            language: 'pt',
            'ptb:analyticsConsent': 'granted',
            'ptb:pokemon-data:v4:abc:static:items.json': '{}',
            trainerStreak: '{"count":19}',
            'ptb:checkin': '{"count":5}',
            'ptb:rewards': '{}',
            'ptb:authSnapshot': '{}',
            greetingPokemon: '{"id":94}',
            'ptb:pokepuzzle:uid:ongoing': '{}',
            'generationQuizRun:1': '{}',
            ptbBuilderDraft: '{}',
        });
        const session = memoryStorage({ 'damage-calc-state': '{}', [LEFT_SESSION_KEY]: 'signOut' });

        wipeUserStorage({ local, session });

        expect(local.keys()).toEqual([
            'language', 'ptb:analyticsConsent', 'ptb:pokemon-data:v4:abc:static:items.json', 'theme',
        ]);
        expect(session.keys()).toEqual([LEFT_SESSION_KEY]);
    });

    it('survives missing or throwing storage', () => {
        const broken = { get length() { throw new Error('blocked'); } };
        expect(() => wipeUserStorage({ local: broken, session: null })).not.toThrow();
    });

    it('treats only the listed settings as the device\'s', () => {
        expect(isDeviceKey('theme')).toBe(true);
        expect(isDeviceKey('trainerStreak')).toBe(false);
        expect(isDeviceKey('ptb:journeyMarks')).toBe(false);
    });
});
