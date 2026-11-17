import { describe, expect, it } from 'vitest';
import { messageRecipients, notifyPoke, parseMentions, pokeAllowed, pokeEntryId, snippetOf } from './socialNotify.js';

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

describe('pokes (the meadow, 2026-11-17)', () => {
    it('land once per pair per day', () => {
        expect(pokeAllowed(null, '2026-11-17')).toBe(true);
        expect(pokeAllowed({ day: '2026-11-16' }, '2026-11-17')).toBe(true);
        expect(pokeAllowed({ day: '2026-11-17' }, '2026-11-17')).toBe(false);
        expect(pokeEntryId('abc')).toBe('poke_abc');
    });

    it('never reach anyone who is not a friend, nor oneself', async () => {
        const docs = new Map([['artifacts/app/friendships/a_b', { members: ['a', 'b'] }]]);
        const writes = [];
        const db = {
            doc: (path) => ({
                get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
                set: async (data) => { writes.push([path, data]); docs.set(path, data); },
            }),
        };
        expect(await notifyPoke({ db, appId: 'app', callerUid: 'a', to: 'a', day: '2026-11-17' })).toEqual({ sent: 0 });
        expect(await notifyPoke({ db, appId: 'app', callerUid: 'a', to: 'c', day: '2026-11-17' })).toEqual({ sent: 0 });
        expect(await notifyPoke({ db, appId: 'app', callerUid: 'a', to: 'b', day: '2026-11-17' })).toEqual({ sent: 1 });
        expect(writes[0][0]).toBe('artifacts/app/users/b/inbox/poke_a');
        expect(writes[0][1]).toMatchObject({ kind: 'poke', fromUid: 'a', day: '2026-11-17', read: false });
        expect(await notifyPoke({ db, appId: 'app', callerUid: 'a', to: 'b', day: '2026-11-17' })).toEqual({ sent: 0, already: true });
    });
});
