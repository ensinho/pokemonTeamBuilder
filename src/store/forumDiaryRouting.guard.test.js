import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// 2026-11-09: PokéPuzzle and Champion Challenge results kept landing in the
// general chat from installed apps still on a pre-diary build. The current
// client may still fall back there, stamped `diaryFallback`; the rules let only
// stamped results in. Both halves are text a refactor could quietly undo.
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('day results go to the Diário do dia only', () => {
    it("postToDiary's fallback is stamped, so the rules can tell it from an old build", () => {
        const store = read('./useForumStore.js');
        const start = store.indexOf('postToDiary: async');
        const body = store.slice(start, store.indexOf('\n    },', start));
        expect(start).toBeGreaterThan(-1);
        expect(body).not.toMatch(/['"]general['"]/);
        expect(body).toMatch(/DIARY_FALLBACK_TOPIC[^\n]*diaryFallback: true/);
    });

    it('the rules refuse a shared result outside a diary', () => {
        const rules = read('../../firestore.rules');
        const messages = rules.slice(rules.indexOf('match /messages/{messageId}'));
        const create = messages.slice(0, messages.indexOf('allow update'));
        expect(create).toContain('dayResultsOnlyInDiary()');
        expect(messages).toMatch(/function dayResultsOnlyInDiary\(\)[\s\S]*topicId == 'general' && d\.get\('diaryFallback', false\) == true[\s\S]*sharedPuzzle[\s\S]*sharedChallenge/);
    });
});
