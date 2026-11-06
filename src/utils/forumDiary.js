import { dayKeyAt } from './challengeDay.js';

/**
 * The Diário do dia (2026-11-06, docs/plans/social-heart.md B1): one forum
 * topic per challenge day (Brasília calendar, like the Champion Challenge),
 * where the day's results meet. Its id is the day, so every client agrees on
 * it without a server: the first trainer to share creates it (firestore.rules
 * `validDiaryTopic` accepts only this exact shape). Titles are drawn by the
 * client from `dayKey`, in the reader's language — the stored title is only a
 * neutral fallback.
 */

export const DIARY_CATEGORY = 'diary';
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const diaryTopicId = (dayKey) => `diary-${dayKey}`;

export const isDiaryTopic = (topic) => topic?.category === DIARY_CATEGORY && DAY_RE.test(topic?.dayKey || '');

export const todayDiaryKey = (now = Date.now()) => dayKeyAt(now);

/** The document the first sharer writes — exactly what the rules accept. */
export function diaryTopicDoc(dayKey, nowIso = new Date().toISOString()) {
    return {
        title: `Daily log ${dayKey}`,
        category: DIARY_CATEGORY,
        dayKey,
        createdAt: nowIso,
        createdBy: 'system',
        creatorName: 'Professor Oak',
        creatorAvatar: 94,
        creatorAvatarIsShiny: false,
        lastActivityAt: nowIso,
        messageCount: 0,
        lastMessageText: '',
    };
}

/** The day's date for a title, in the reader's language ("6 de novembro"). */
export function diaryDateLabel(dayKey, language = 'pt') {
    if (!DAY_RE.test(dayKey || '')) return '';
    const [y, m, d] = dayKey.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
        day: 'numeric', month: 'long', timeZone: 'UTC',
    });
}

/** Only today's diary is pinned; older ones read like any topic. */
export const isTodayDiary = (topic, now = Date.now()) => isDiaryTopic(topic) && topic.dayKey === todayDiaryKey(now);
