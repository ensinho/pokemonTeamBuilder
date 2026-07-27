import { describe, it, expect } from 'vitest';
import { pickAwaitingTarget, buildTurnEmail } from './battleNotify.js';

describe('pickAwaitingTarget', () => {
    it('picks the awaiting uid that is not the caller', () => {
        expect(pickAwaitingTarget(['a', 'b'], 'b')).toBe('a');
        expect(pickAwaitingTarget(['a', 'b'], 'a')).toBe('b');
    });

    it('returns null when only the caller is awaiting', () => {
        // e.g. a mid-turn forced switch where the caller is the only side left
        // to act — nobody else needs a nudge.
        expect(pickAwaitingTarget(['a'], 'a')).toBeNull();
    });

    it('returns null when nobody is awaiting (the battle just ended)', () => {
        expect(pickAwaitingTarget([], 'a')).toBeNull();
        expect(pickAwaitingTarget(undefined, 'a')).toBeNull();
    });
});

describe('buildTurnEmail', () => {
    it('builds an English email that names the opponent and links the battle', () => {
        const email = buildTurnEmail({ lang: 'en', callerName: 'Enzo', battleUrl: 'https://x/#/battles/1' });
        expect(email.subject).toBe('Enzo is waiting for your move!');
        expect(email.text).toContain('https://x/#/battles/1');
        expect(email.html).toContain('href="https://x/#/battles/1"');
    });

    it('builds a Portuguese email when the recipient prefers pt', () => {
        const email = buildTurnEmail({ lang: 'pt', callerName: 'Enzo', battleUrl: 'https://x' });
        expect(email.subject).toBe('Enzo está esperando sua jogada!');
        expect(email.text).toContain('É a sua vez');
    });

    it('falls back to a generic name in the right language when none is given', () => {
        expect(buildTurnEmail({ lang: 'en', callerName: '', battleUrl: 'https://x' }).subject)
            .toContain('your opponent');
        expect(buildTurnEmail({ lang: 'pt', callerName: '', battleUrl: 'https://x' }).subject)
            .toContain('seu oponente');
    });

    it('falls back to English for an unknown language code', () => {
        expect(buildTurnEmail({ lang: 'fr', callerName: 'Enzo', battleUrl: 'https://x' }).subject)
            .toBe('Enzo is waiting for your move!');
    });

    it('escapes a hostile display name in the HTML body, but leaves the plain-text body untouched', () => {
        const hostile = '<script>alert(1)</script>';
        const email = buildTurnEmail({ lang: 'en', callerName: hostile, battleUrl: 'https://x' });
        expect(email.html).not.toContain('<script>');
        expect(email.html).toContain('&lt;script&gt;');
        expect(email.text).toContain(hostile);
    });
});
