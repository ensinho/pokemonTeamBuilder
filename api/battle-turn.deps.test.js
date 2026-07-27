import { describe, it, expect, vi } from 'vitest';

/**
 * The endpoint's behaviour when its own dependencies won't load.
 *
 * This is the case that cost the most to diagnose in production: the function
 * died during the platform's init phase, so the caller got
 * `FUNCTION_INVOCATION_FAILED` — no body, no stack — and every request looked
 * the same whether the credentials were wrong, the engine was missing, or the
 * process never started. The fix was to make this file's static import graph
 * unfailable and load everything heavy inside the handler, where a failure is
 * catchable. These tests pin that property, because it is invisible in normal
 * operation and easy to undo by adding one innocent-looking top-level import.
 *
 * Lives in its own file so the broken-module registry can't leak into the
 * end-to-end suite next door.
 */

vi.mock('./lib/battleResolver.js', () => {
    throw new Error('Cannot find module @pkmn/sim');
});

const { default: handler } = await import('./battle-turn.js');

const makeRes = () => ({
    statusCode: 200,
    body: null,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
});

describe('battle-turn with a dependency that will not load', () => {
    it('still answers ?ping, because that path loads nothing', async () => {
        const res = makeRes();
        await handler({ method: 'GET', url: '/api/battle-turn?ping=1', headers: {}, query: { ping: '1' } }, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.pong).toBe(true);
    });

    it('reports which step failed instead of crashing the process', async () => {
        const res = makeRes();
        await handler({ method: 'GET', headers: {}, query: {} }, res);

        expect(res.statusCode).toBe(503);
        expect(res.body.ok).toBe(false);
        // Whatever the underlying loader said, the point is that the failing
        // step is named and reported rather than taking the process with it.
        // (Vitest substitutes its own text for a mock factory's error, so the
        // original message isn't assertable here — the POST case below covers
        // that the message is passed through.)
        expect(res.body.dependencies).toEqual(expect.any(String));
        expect(res.body.dependencies).not.toMatch(/^ok/);
        expect(res.body.credentials).toBeUndefined();
    });

    it('returns a readable JSON error on POST rather than dying', async () => {
        const res = makeRes();
        await handler(
            { method: 'POST', headers: { origin: 'https://pokemonbuilder.app' }, body: { battleId: 'b1', choice: 'move 1' }, query: {} },
            res,
        );

        expect(res.statusCode).toBe(503);
        expect(res.body.error).toMatch(/Could not load the battle engine/);
    });
});
