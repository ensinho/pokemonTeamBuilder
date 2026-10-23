import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The 2026-10-23 wound (docs/wounds.md): every hook fetched its public/data
 * file in its own effect, so one tab asked for mega-stones.json 36 times and
 * ~4 MB at once dropped the PWA's connection. Baked datasets load through
 * services/staticData.js (one request per file per session). This fails the
 * moment a source file builds a `data/…` URL and fetches it on its own again.
 *
 * pokemonDataCache.js is the other sanctioned loader: the per-Pokémon detail
 * files and the index, with its own in-memory + storage tiers.
 */
const ALLOWED = new Set([
    'src/services/staticData.js',
    'src/services/pokemonDataCache.js',
]);

const sourceFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(entry.name) && !/\.test\.js$/.test(entry.name) ? [path] : [];
});

// A `data/<file>` URL built for the app's own static folder — not a Firestore
// path (`artifacts/…/public/data/…`) and not a comment naming the file.
const STATIC_DATA_URL = /(BASE_URL|basePath|base)[^\n;]*\bdata\/|['"`]\/?data\/[\w-]+(\/[\w-]+)*\.json/;

describe('baked datasets load through services/staticData.js', () => {
    it('no other source file fetches a public/data file itself', () => {
        const root = process.cwd();
        const offenders = sourceFiles(join(root, 'src'))
            .map((file) => relative(root, file).replaceAll('\\', '/'))
            .filter((file) => !ALLOWED.has(file))
            .filter((file) => {
                const code = readFileSync(join(root, file), 'utf8');
                return /\bfetch\(/.test(code) && STATIC_DATA_URL.test(code);
            });
        expect(offenders, 'use loadStaticData / useStaticData instead of fetch').toEqual([]);
    });
});
