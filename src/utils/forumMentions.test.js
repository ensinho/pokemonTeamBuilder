import { describe, expect, it } from 'vitest';
import { activeMention, insertMention, mentionSuggestions, splitMentions } from './forumMentions';

describe('forum mentions', () => {
    it('finds the partial before the caret, not e-mails', () => {
        expect(activeMention('oi @an')).toEqual({ query: 'an', start: 3 });
        expect(activeMention('mail a@b')).toBeNull();
        expect(activeMention('@')).toEqual({ query: '', start: 0 });
    });
    it('suggests mentionable names by prefix', () => {
        expect(mentionSuggestions(['Ana', 'ana', 'Andre Silva', 'Bia', 'Anabel'], 'an')).toEqual(['Ana', 'Anabel']);
    });
    it('inserts and splits', () => {
        const m = activeMention('oi @an');
        expect(insertMention('oi @an', m, 'Ana')).toEqual({ text: 'oi @Ana ', caret: 8 });
        expect(splitMentions('oi @Ana, tudo?')).toEqual([{ text: 'oi ' }, { mention: 'Ana' }, { text: ', tudo?' }]);
    });
});
