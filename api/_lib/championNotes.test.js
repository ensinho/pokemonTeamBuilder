import { describe, expect, it } from 'vitest';
import { championNoteOf, diaryDoc } from './championNotes.js';

describe('champion notes', () => {
    it('says nothing about a day nobody played', () => {
        expect(championNoteOf(null, 'cynthia')).toBeNull();
    });
    it('counts the day and names the quickest win', () => {
        const note = championNoteOf({
            played: { daily: 10, free: 2 }, wins: { daily: 3, free: 1 },
            boards: { daily: [{ name: 'Ana', turns: 14, score: 1500 }, { name: 'Bia', turns: 11, score: 1300 }], free: [] },
        }, 'blue');
        expect(note).toEqual({ champion: 'blue', played: 12, wins: 4, fastest: { name: 'Bia', turns: 11 } });
    });
    it('writes the exact diary shape the rules accept from clients', () => {
        expect(Object.keys(diaryDoc('2026-11-06', 'x')).sort()).toEqual(['category', 'createdAt', 'createdBy', 'creatorAvatar', 'creatorAvatarIsShiny', 'creatorName', 'dayKey', 'lastActivityAt', 'lastMessageText', 'messageCount', 'title'].sort());
    });
});
