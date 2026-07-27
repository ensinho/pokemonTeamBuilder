import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';

/**
 * Guards the dependency tree against the failure that took battles down for a
 * day, which no amount of application testing could have caught.
 *
 * `firebase-admin` pulls in `jwks-rsa`, which is CommonJS but declares
 * `jose@^6` — and jose 6 is ESM-only. Its `require('jose')` is therefore only
 * legal on a runtime that implements `require(esm)`. Local Node has done so
 * since 22.12, so everything worked here; Vercel's function loader patches
 * `Module._load` for bytecode caching and does **not**, so it threw
 * `ERR_REQUIRE_ESM` while loading the module, exited 1, and returned
 * `FUNCTION_INVOCATION_FAILED` with no stack for every request. `package.json`
 * pins `jwks-rsa`'s jose to v5, which ships a CJS build.
 *
 * The `--no-experimental-require-module` flag turns this Node back into one
 * without `require(esm)` — i.e. reproduces the production loader — so this test
 * fails on exactly the tree that failed in production. Assert on the real
 * import, not on version numbers: a future jwks-rsa or firebase-admin that
 * fixes this properly should make the pin removable without the test objecting.
 */

const [major, minor] = process.versions.node.split('.').map(Number);
const canSimulate = major > 22 || (major === 22 && minor >= 12);

const requiresCleanlyWithoutRequireEsm = (specifier) => {
    execFileSync(
        process.execPath,
        ['--no-experimental-require-module', '-e', `require(${JSON.stringify(specifier)})`],
        { cwd: process.cwd(), stdio: 'pipe' },
    );
};

describe.runIf(canSimulate)('CommonJS dependencies on a runtime without require(esm)', () => {
    // The exact path that failed: firebase-admin/auth -> utils/jwt -> jwks-rsa -> jose.
    for (const specifier of ['jwks-rsa', 'firebase-admin/auth', 'firebase-admin/firestore']) {
        it(`loads ${specifier}`, () => {
            expect(() => requiresCleanlyWithoutRequireEsm(specifier)).not.toThrow();
        });
    }
});

describe('jose', () => {
    it('is a single deduped copy, so jwks-rsa and our own code agree', async () => {
        const { execFileSync: run } = await import('node:child_process');
        const out = run('npm', ['ls', 'jose', '--json'], { cwd: process.cwd(), stdio: 'pipe' }).toString();

        const versions = [];
        const walk = (deps) => {
            for (const [name, node] of Object.entries(deps || {})) {
                if (name === 'jose' && node.version && !node.deduped) versions.push(node.version);
                walk(node.dependencies);
            }
        };
        walk(JSON.parse(out).dependencies);

        // Every entry that isn't marked "deduped" must be the same resolved copy.
        expect(new Set(versions).size).toBe(1);
        expect(versions[0]).toMatch(/^5\./);
    });
});
