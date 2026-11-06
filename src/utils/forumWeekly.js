import { dayKeyAt } from './challengeDay.js';

/**
 * The Torneio da semana (2026-11-06, docs/plans/social-heart.md B2): one
 * forum topic per ISO week, a theme from a rotation every client agrees on
 * without a server. Trainers enter a team there; reactions and likes vote;
 * the week's top team earns the "Campeão da semana" badge (and its title).
 * The first trainer to need the week's topic creates it (firestore.rules
 * `validWeeklyTopic`), and the daily cron opens it too.
 */

export const WEEKLY_THEMES = ['kanto', 'monoFire', 'noLegends', 'gymLeader', 'unevolved', 'monoWater', 'starter', 'slow'];

/** ISO week of a `YYYY-MM-DD` day: `2026-W45`. */
export function isoWeekOf(dayKey) {
    const [y, m, d] = dayKey.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const weekday = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - weekday);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((date - yearStart) / 86_400_000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export const currentWeekKey = (now = Date.now()) => isoWeekOf(dayKeyAt(now));

/** The week before `weekKey`. */
export function previousWeekKey(weekKey) {
    const [y, w] = weekKey.split('-W').map(Number);
    // Monday of that ISO week, minus seven days.
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (w - 1) * 7 - 7);
    return isoWeekOf(monday.toISOString().slice(0, 10));
}

/** The week's theme: the same for everyone, a different one each week. */
export function themeFor(weekKey) {
    const n = Number(weekKey.split('-W')[1]) || 0;
    const y = Number(weekKey.slice(0, 4)) || 0;
    return WEEKLY_THEMES[(n + y) % WEEKLY_THEMES.length];
}

export const weeklyTopicId = (weekKey) => `weekly-${weekKey}`;

export const isWeeklyTopic = (topic) => /^\d{4}-W\d{2}$/.test(topic?.weekKey || '') && WEEKLY_THEMES.includes(topic?.theme);

export const isCurrentWeekly = (topic, now = Date.now()) => isWeeklyTopic(topic) && topic.weekKey === currentWeekKey(now);

/** The document the first trainer writes — exactly what the rules accept. */
export function weeklyTopicDoc(weekKey, nowIso = new Date().toISOString()) {
    return {
        title: `Weekly tournament ${weekKey}`,
        category: 'teams',
        weekKey,
        theme: themeFor(weekKey),
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

/** An entry's votes: likes plus battle-text reactions. */
export const entryScore = (message) => (Array.isArray(message?.likedBy) ? message.likedBy.length : 0)
    + Object.keys(message?.reactions || {}).length;

/** The entries (messages with a team), best first. */
export const weeklyStandings = (messages = []) => messages
    .filter((m) => m?.sharedTeam && m.createdBy && m.createdBy !== 'system')
    .map((m) => ({ message: m, score: entryScore(m) }))
    .sort((a, b) => b.score - a.score || String(a.message.createdAt).localeCompare(String(b.message.createdAt)));
