import { describe, expect, it } from 'vitest';
import { forumPreviewText } from './forumPreview';

const t = (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key);

describe('forumPreviewText', () => {
    it('reads the stored stand-ins back in the reader\'s language', () => {
        expect(forumPreviewText('Champion Challenge result', t)).toBe('forum.preview.challenge');
        expect(forumPreviewText('PokéPuzzle result', t)).toBe('forum.preview.puzzle');
        expect(forumPreviewText('Quiz result', t)).toBe('forum.preview.quiz');
        expect(forumPreviewText("The day's receipt", t)).toBe('forum.preview.receipt');
        expect(forumPreviewText('Battle invite', t)).toBe('forum.preview.invite');
        expect(forumPreviewText('Tier list', t)).toBe('forum.preview.tierList');
    });
    it('keeps a shared team\'s name', () => {
        expect(forumPreviewText('Shared team: Rain Dance', t)).toBe('forum.preview.team:{"name":"Rain Dance"}');
    });
    it('leaves a person\'s own words alone', () => {
        expect(forumPreviewText('  replacement for beedrill?  ', t)).toBe('replacement for beedrill?');
        expect(forumPreviewText('My tier list is better', t)).toBe('My tier list is better');
        expect(forumPreviewText('', t)).toBe('');
        expect(forumPreviewText(null, t)).toBe('');
    });
});
