import { describe, it, expect } from 'vitest';
import { groupThreadMessages, GROUP_WINDOW_MS } from './forumThread';

const at = (minutes) => new Date(Date.UTC(2026, 8, 24, 12, 0) + minutes * 60 * 1000).toISOString();
const msg = (id, createdBy, minutes, extra = {}) => ({ id, createdBy, createdAt: at(minutes), ...extra });
const flags = (list) => groupThreadMessages(list).map((entry) => entry.continues);

describe('groupThreadMessages', () => {
    it('starts every thread with a full turn', () => {
        expect(flags([msg('a', 'ash', 0)])).toEqual([false]);
    });

    it('folds quick posts by the same trainer into one turn', () => {
        expect(flags([msg('a', 'ash', 0), msg('b', 'ash', 1), msg('c', 'ash', 4)])).toEqual([false, true, true]);
    });

    it('breaks the turn when someone else speaks', () => {
        expect(flags([msg('a', 'ash', 0), msg('b', 'misty', 1), msg('c', 'ash', 2)])).toEqual([false, false, false]);
    });

    it('breaks the turn after a pause longer than the window', () => {
        const past = GROUP_WINDOW_MS / 60000 + 1;
        expect(flags([msg('a', 'ash', 0), msg('b', 'ash', past)])).toEqual([false, false]);
    });

    it('lets a reply start its own turn', () => {
        expect(flags([msg('a', 'ash', 0), msg('b', 'ash', 1, { replyTo: { messageId: 'x' } })])).toEqual([false, false]);
    });

    it('never groups messages with no author or no time', () => {
        expect(flags([msg('a', undefined, 0), msg('b', undefined, 1)])).toEqual([false, false]);
        expect(flags([{ id: 'a', createdBy: 'ash' }, { id: 'b', createdBy: 'ash' }])).toEqual([false, false]);
    });

    it('keeps the message objects as given', () => {
        const list = [msg('a', 'ash', 0), msg('b', 'ash', 1)];
        expect(groupThreadMessages(list).map((entry) => entry.message)).toEqual(list);
    });
});
