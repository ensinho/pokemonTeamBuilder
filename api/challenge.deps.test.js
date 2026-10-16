import { describe, it, expect, vi } from 'vitest';

// firebase-admin loads before the broken module; under a parallel suite that
// alone can pass the default 5 s.
vi.setConfig({ testTimeout: 60_000 });

/**
 * The challenge endpoint when its own dependencies won't load — the property
 * `battle-turn.deps.test.js` pins for the PvP endpoint: the static import graph
 * is unfailable, so `?ping` still answers and every other path returns JSON
 * naming the module, instead of an opaque FUNCTION_INVOCATION_FAILED. One
 * innocent top-level import of `@pkmn/sim` would undo it; this fails if so.
 */

vi.mock('./_lib/challenge/actions.js', () => {
    throw new Error('Cannot find module @pkmn/sim');
});

const { default: handler } = await import('./challenge.js');

const makeRes = () => ({
    statusCode: 200,
    body: null,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
});

describe('challenge with a dependency that will not load', () => {
    it('still answers ?ping, because that path loads nothing', async () => {
        const res = makeRes();
        await handler({ method: 'GET', url: '/api/challenge?ping=1', headers: {}, query: { ping: '1' } }, res);
        expect(res.statusCode).toBe(200);
        expect(res.body.ping).toBe(true);
    });

    it('reports the failing step on GET', async () => {
        const res = makeRes();
        await handler({ method: 'GET', headers: {}, query: {} }, res);
        expect(res.statusCode).toBe(503);
        expect(res.body.ok).toBe(false);
        expect(res.body.dependencies).toMatch(/Failed to load actions/);
        expect(res.body.credentials).toBeUndefined();
    });

    it('returns readable JSON on POST rather than dying', async () => {
        const res = makeRes();
        await handler({ method: 'POST', headers: { origin: 'https://pokemonbuilder.app' }, body: { action: 'ensureDay' }, query: {} }, res);
        expect(res.statusCode).toBe(503);
        expect(res.body.error).toMatch(/Failed to load actions/);
    });
});
