import { describe, expect, it } from 'vitest';
import { diaryDateLabel, diaryTopicDoc, diaryTopicId, isDiaryTopic, isTodayDiary, todayDiaryKey } from './forumDiary';

describe('forum diary', () => {
    it('names the topic after the day', () => {
        expect(diaryTopicId('2026-11-06')).toBe('diary-2026-11-06');
        const doc = diaryTopicDoc('2026-11-06', '2026-11-06T03:00:00.000Z');
        expect(doc).toMatchObject({ category: 'diary', dayKey: '2026-11-06', createdBy: 'system', messageCount: 0 });
        expect(isDiaryTopic(doc)).toBe(true);
        expect(isDiaryTopic({ category: 'general' })).toBe(false);
    });

    it('pins only today, by the Brasília day', () => {
        const now = Date.UTC(2026, 10, 6, 15);
        expect(todayDiaryKey(now)).toBe('2026-11-06');
        expect(isTodayDiary({ category: 'diary', dayKey: '2026-11-06' }, now)).toBe(true);
        expect(isTodayDiary({ category: 'diary', dayKey: '2026-11-05' }, now)).toBe(false);
        // 01:00 UTC on the 7th is still the 6th in Brasília.
        expect(todayDiaryKey(Date.UTC(2026, 10, 7, 1))).toBe('2026-11-06');
    });

    it('writes the date in the reader’s language', () => {
        expect(diaryDateLabel('2026-11-06', 'pt')).toBe('6 de novembro');
        expect(diaryDateLabel('2026-11-06', 'en')).toBe('November 6');
        expect(diaryDateLabel('bad')).toBe('');
    });
});

describe('Quem é esse Pokémon?', () => {
    it('runs on Sundays with a stable, guessable Pokémon', async () => {
        const { isSilhouetteDay, silhouetteOfDay, namesAnswer } = await import('./forumDiary');
        expect(isSilhouetteDay('2026-11-08')).toBe(true);
        expect(isSilhouetteDay('2026-11-06')).toBe(false);
        const id = silhouetteOfDay('2026-11-08');
        expect(id).toBe(silhouetteOfDay('2026-11-08'));
        expect(id).toBeGreaterThanOrEqual(1);
        expect(id).toBeLessThanOrEqual(493);
        expect(namesAnswer('É o Mr. Mime!', 'mr-mime')).toBe(true);
        expect(namesAnswer('Pikachu?', 'raichu')).toBe(false);
    });
});
