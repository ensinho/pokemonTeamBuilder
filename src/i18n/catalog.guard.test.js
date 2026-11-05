import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRANSLATIONS } from '../constants/translations';

/**
 * Copy is one chunk per language (src/i18n/catalog.js, 2026-11-04): both
 * tables in the entry were ~90 KB gz on every first visit. Browser code reads
 * them through the catalog, or through translateCore.js, which the build
 * aliases to translateClient.js. Importing the aggregate, or one language
 * statically, puts the tables back in the boot path; this fails when it does.
 */
const ALLOWED = new Set([
    'src/constants/translations.js',
    'src/utils/translateCore.js',
]);

const sourceFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(entry.name) && !/\.test\.js$/.test(entry.name) ? [path] : [];
});

const STATIC_IMPORT = /^\s*import\s[^;]*from\s+['"][^'"]*constants\/translations(\/(en|pt))?(\.js)?['"]/m;

const keysOf = (node, prefix = '') => Object.entries(node).flatMap(([key, value]) => (
    value && typeof value === 'object' && !Array.isArray(value) ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`]
));

describe('translation tables', () => {
    it('are never imported statically by browser code', () => {
        const offenders = sourceFiles('src')
            .map((file) => relative(process.cwd(), file).replaceAll('\\', '/'))
            .filter((file) => !ALLOWED.has(file) && STATIC_IMPORT.test(readFileSync(file, 'utf8')));
        expect(offenders).toEqual([]);
    });

    // The browser loads only the visitor's language, so a key missing from
    // Portuguese can no longer fall back to English: it would show the raw key.
    it('give Portuguese every key English has', () => {
        const pt = new Set(keysOf(TRANSLATIONS.pt));
        expect(keysOf(TRANSLATIONS.en).filter((key) => !pt.has(key))).toEqual([]);
    });
});
