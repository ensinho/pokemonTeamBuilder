import { describe, expect, it } from 'vitest';
import { messageRecipients, parseMentions, snippetOf } from './socialNotify.js';

describe('socialNotify', () => {
    it('finds mentions, unique, lower-cased, never e-mails', () => {
        expect(parseMentions('oi @Ana e @ana, falou @Bruno_99. mail a@b.com')).toEqual(['ana', 'bruno_99']);
        expect(parseMentions('sem menção')).toEqual([]);
        expect(parseMentions('@a')).toEqual([]);
    });

    it('gives each trainer one reason, never the author or the system', () => {
        expect(messageRecipients({ authorUid: 'me', replyToUid: 'ana', mentionUids: ['ana', 'bia'], topicAuthorUid: 'bia' }))
            .toEqual([{ uid: 'ana', kind: 'reply' }, { uid: 'bia', kind: 'mention' }]);
        expect(messageRecipients({ authorUid: 'me', replyToUid: 'me', topicAuthorUid: 'system' })).toEqual([]);
        expect(messageRecipients({ authorUid: 'me', topicAuthorUid: 'op' })).toEqual([{ uid: 'op', kind: 'comment' }]);
    });

    it('trims snippets', () => {
        expect(snippetOf('  a\n\nb  ')).toBe('a b');
        expect(snippetOf('x'.repeat(300))).toHaveLength(120);
    });
});
