import { describe, it, expect, beforeEach, vi } from 'vitest';

const fb = vi.hoisted(() => ({ auth: { currentUser: null } }));
vi.mock('./firebase', () => fb);

const { callAuthedApi } = await import('./apiClient');

const respond = (status, body) => ({ ok: status < 400, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });

beforeEach(() => {
    globalThis.fetch = vi.fn();
});

describe('callAuthedApi', () => {
    it('says signedOut without a user, and reads a non-JSON failure', async () => {
        fb.auth.currentUser = null;
        expect(await callAuthedApi('/api/x', {})).toMatchObject({ ok: false, error: 'signedOut' });

        fb.auth.currentUser = { isAnonymous: false, getIdToken: vi.fn(async () => 'token') };
        fetch.mockResolvedValueOnce(respond(500, '<html>FUNCTION_INVOCATION_FAILED</html>'));
        expect(await callAuthedApi('/api/x', {}, { serverErrorMessage: 'internal' })).toMatchObject({ ok: false, status: 500, error: 'internal' });
    });

    it('waits for Firebase to restore a saved session before calling it signed out', async () => {
        // A return visit: the app is "ready" from its snapshot, Firebase not yet.
        fb.auth.currentUser = null;
        fb.auth.authStateReady = vi.fn(async () => {
            fb.auth.currentUser = { isAnonymous: false, getIdToken: vi.fn(async () => 'restored') };
        });
        fetch.mockResolvedValueOnce(respond(200, { ok: true }));

        const res = await callAuthedApi('/api/challenge', { action: 'state' });
        expect(res.ok).toBe(true);
        expect(fb.auth.authStateReady).toHaveBeenCalledOnce();
        expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer restored');
        delete fb.auth.authStateReady;
    });

    it('retries once with a fresh token when a just-registered user is refused as a guest', async () => {
        const getIdToken = vi.fn(async (force) => (force ? 'fresh' : 'stale'));
        fb.auth.currentUser = { isAnonymous: false, getIdToken };
        fetch
            .mockResolvedValueOnce(respond(403, { error: 'signInRequired' }))
            .mockResolvedValueOnce(respond(200, { ok: true }));

        const res = await callAuthedApi('/api/challenge', { action: 'start' });
        expect(res.ok).toBe(true);
        expect(getIdToken).toHaveBeenNthCalledWith(2, true);
        expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh');
    });

    it('never retries twice, and never for a real guest', async () => {
        fb.auth.currentUser = { isAnonymous: false, getIdToken: vi.fn(async () => 't') };
        fetch.mockResolvedValue(respond(403, { error: 'signInRequired' }));
        expect((await callAuthedApi('/api/challenge', {})).error).toBe('signInRequired');
        expect(fetch).toHaveBeenCalledTimes(2);

        fetch.mockClear();
        fb.auth.currentUser = { isAnonymous: true, getIdToken: vi.fn(async () => 't') };
        expect((await callAuthedApi('/api/challenge', {})).error).toBe('signInRequired');
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('lets a network failure reject, as fetch does', async () => {
        fb.auth.currentUser = { isAnonymous: false, getIdToken: vi.fn(async () => 't') };
        fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        await expect(callAuthedApi('/api/x', {})).rejects.toThrow('Failed to fetch');
    });
});
