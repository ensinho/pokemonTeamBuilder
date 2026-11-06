import { describe, expect, it } from 'vitest';
import { describeInboxEntry } from './inboxEntry';

describe('describeInboxEntry', () => {
    it('leads a reply to the comment', () => {
        expect(describeInboxEntry({ kind: 'reply', fromName: 'Ana', topicId: 't1', messageId: 'm1' }))
            .toEqual({ key: 'pokegear.reply', params: { name: 'Ana' }, to: '/feed?topic=t1&c=m1' });
    });
    it('counts comments and reactions as one entry', () => {
        expect(describeInboxEntry({ kind: 'comment', fromName: 'Ana', topicId: 't1', count: 3 }).params.others).toBe(2);
        expect(describeInboxEntry({ kind: 'reaction', fromName: 'Ana', topicId: 't1', count: 1, reaction: 'crit' }).key).toBe('pokegear.reaction');
    });
    it('sends friends and boards to their pages', () => {
        expect(describeInboxEntry({ kind: 'friend', fromName: 'Bia' }).to).toBe('/friends?tab=requests');
        expect(describeInboxEntry({ kind: 'passed', fromName: 'Bia', champion: 'blue' }).to).toBe('/challenge?champion=blue');
    });
});
