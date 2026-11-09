import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// 2026-11-09: PokéPuzzle and Champion Challenge results kept landing in the
// general chat — from a silent fallback in postToDiary and from installed apps
// still on a pre-diary build. Both halves of the fix are text a refactor could
// quietly undo, so this reads them.
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('day results go to the Diário do dia only', () => {
    it('postToDiary never falls back to another topic', () => {
        const store = read('./useForumStore.js');
        const start = store.indexOf('postToDiary: async');
        const body = store.slice(start, store.indexOf('\n    },', start));
        expect(start).toBeGreaterThan(-1);
        expect(body).not.toMatch(/['"]general['"]/);
    });

    it('the rules refuse a shared result outside a diary', () => {
        const rules = read('../../firestore.rules');
        const messages = rules.slice(rules.indexOf('match /messages/{messageId}'));
        const create = messages.slice(0, messages.indexOf('allow update'));
        expect(create).toContain('dayResultsOnlyInDiary()');
        expect(messages).toMatch(/function dayResultsOnlyInDiary\(\)[\s\S]*sharedPuzzle[\s\S]*sharedChallenge/);
    });
});
