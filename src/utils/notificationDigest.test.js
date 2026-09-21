import { describe, it, expect } from 'vitest';
import { digestAttention, digestUrl } from './notificationDigest';

const notice = (name) => ({ titleKey: 'battle.notifyTurnTitle', bodyKey: 'battle.notifyTurnBody', params: { name } });

describe('digestAttention', () => {
    it('says nothing when nothing is new', () => {
        expect(digestAttention([])).toBeNull();
        expect(digestAttention(undefined)).toBeNull();
    });

    it('keeps a single battle specific, so the alert names the opponent', () => {
        const digest = digestAttention([{ battleId: 'b1', notice: notice('Enzo') }]);
        expect(digest).toEqual({ kind: 'single', battleId: 'b1', notice: notice('Enzo') });
        expect(digestUrl(digest)).toBe('/battles/b1');
    });

    it('collapses a burst into one grouped alert', () => {
        // The bug this exists for: opening the app after a day away fired one
        // OS banner per waiting battle.
        const digest = digestAttention([
            { battleId: 'b1', notice: notice('Enzo') },
            { battleId: 'b2', notice: notice('Ash') },
            { battleId: 'b3', notice: notice('Gary') },
        ]);
        expect(digest).toEqual({ kind: 'group', count: 3 });
        expect(digestUrl(digest)).toBe('/battles');
    });
});
