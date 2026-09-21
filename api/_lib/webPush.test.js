import { describe, it, expect } from 'vitest';
import { buildPushPayload, shouldSendTo, battleUrl } from './webPush.js';

describe('buildPushPayload', () => {
    it('writes the turn nudge in the language the device asked for', () => {
        const pt = buildPushPayload({ kind: 'battleTurn', lang: 'pt', params: { name: 'Enzo' }, url: '/battles/1' });
        expect(pt.title).toBe('Sua vez!');
        expect(pt.body).toContain('Enzo');
        expect(pt.url).toBe('/battles/1');

        const en = buildPushPayload({ kind: 'battleTurn', lang: 'en', params: { name: 'Enzo' } });
        expect(en.title).toBe('Your turn!');
    });

    it('never interpolates a missing opponent name', () => {
        const payload = buildPushPayload({ kind: 'battleChallenge', lang: 'pt', params: { name: null } });
        expect(payload.body).not.toContain('null');
        expect(payload.body).toContain('seu oponente');
    });

    it('carries the grouping fields the service worker collapses on', () => {
        const payload = buildPushPayload({ kind: 'battleTurn', lang: 'pt', params: { name: 'Ash' } });
        expect(payload.group).toBe('ptb-battles');
        expect(payload.groupTitle).toContain('{{count}}');
        expect(payload.groupUrl).toBe('/battles');
    });

    it('groups the daily puzzle apart from battles', () => {
        const payload = buildPushPayload({ kind: 'dailyPuzzle', lang: 'en', url: '/pokepuzzle' });
        expect(payload.group).toBe('ptb-daily');
        expect(payload.url).toBe('/pokepuzzle');
    });

    it('returns null for a kind it has no copy for', () => {
        expect(buildPushPayload({ kind: 'nonsense', lang: 'en' })).toBeNull();
    });
});

describe('shouldSendTo', () => {
    const sub = { endpoint: 'https://push/1', keys: { p256dh: 'p', auth: 'a' } };

    it('sends to a complete subscription', () => {
        expect(shouldSendTo(sub, 'battles')).toBe(true);
    });

    it('skips a subscription missing its encryption keys', () => {
        expect(shouldSendTo({ endpoint: 'https://push/1', keys: {} }, null)).toBe(false);
        expect(shouldSendTo({}, null)).toBe(false);
    });

    it('honours an explicit opt-out of one topic only', () => {
        const optedOut = { ...sub, topics: { battles: true, dailyPuzzle: false } };
        expect(shouldSendTo(optedOut, 'dailyPuzzle')).toBe(false);
        expect(shouldSendTo(optedOut, 'battles')).toBe(true);
    });

    it('still sends to an older subscription that predates topics', () => {
        // Absent means "never asked", not "said no" — otherwise every existing
        // device goes silent after a deploy.
        expect(shouldSendTo(sub, 'dailyPuzzle')).toBe(true);
    });
});

describe('battleUrl', () => {
    it('points at a real path, not the retired hash route', () => {
        expect(battleUrl('abc')).toBe('/battles/abc');
    });
});
