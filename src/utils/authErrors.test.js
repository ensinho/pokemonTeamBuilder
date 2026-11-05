import { describe, it, expect } from 'vitest';
import { authErrorField, prettifyAuthError } from './authErrors';

const t = (key) => key;

describe('prettifyAuthError', () => {
    it('never shows Firebase\'s own English message', () => {
        const err = { code: 'auth/something-new', message: 'Firebase: Error (auth/something-new).' };
        expect(prettifyAuthError(err, t)).toBe('modals.authErrorDefault');
        expect(prettifyAuthError(new Error('boom'), t)).toBe('modals.authErrorDefault');
        expect(prettifyAuthError(null, t)).toBe('modals.authErrorDefault');
    });

    it('maps the codes the dialogs meet', () => {
        expect(prettifyAuthError({ code: 'auth/user-disabled' }, t)).toBe('modals.authErrorUserDisabled');
        expect(prettifyAuthError({ code: 'auth/missing-password' }, t)).toBe('modals.authErrorMissingPassword');
        expect(prettifyAuthError({ code: 'auth/internal-error' }, t)).toBe('modals.authErrorDefault');
        expect(prettifyAuthError({ code: 'auth/quota-exceeded' }, t)).toBe('modals.authErrorTooManyRequests');
        expect(prettifyAuthError({ code: 'auth/network-request-failed' }, t)).toBe('modals.authErrorNetwork');
    });
});

describe('authErrorField', () => {
    it('points an error at the field it is about', () => {
        expect(authErrorField({ code: 'auth/invalid-email' })).toBe('email');
        expect(authErrorField({ code: 'auth/email-already-in-use' })).toBe('email');
        expect(authErrorField({ code: 'auth/wrong-password' })).toBe('password');
        expect(authErrorField({ code: 'auth/missing-password' })).toBe('password');
        // "Email or password is incorrect" names neither on purpose.
        expect(authErrorField({ code: 'auth/invalid-credential' })).toBeNull();
        expect(authErrorField(null)).toBeNull();
    });
});
