// Feed ranking for the forum: the Reddit vocabulary (Hot / New / Top, pinned
// megathreads, a "trending" list) computed from the topic documents the feed
// already streams. Pure — the feed, the rail and the tests share it.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// A topic only trends while it is being talked about.
export const TRENDING_WINDOW_MS = 7 * DAY_MS;
export const TRENDING_LIMIT = 5;

export const FEED_SORTS = ['hot', 'new', 'top'];
export const DEFAULT_FEED_SORT = 'hot';
export const FORUM_CATEGORY_IDS = ['all', 'general', 'teams', 'strategy', 'announcements'];

const timeOf = (iso) => {
    const ms = iso ? Date.parse(iso) : NaN;
    return Number.isFinite(ms) ? ms : 0;
};

/** Seeded by the app (Professor Oak): the community's standing megathreads. */
export const isPinnedTopic = (topic) => topic?.createdBy === 'system';

/** The opening post is message one, so it is not a reply. */
export const topicReplies = (topic) => Math.max(0, (Number(topic?.messageCount) || 0) - 1);

/** The likedBy array is the truth when present; the counter can drift. */
export const topicLikes = (topic) => {
    if (Array.isArray(topic?.likedBy)) return topic.likedBy.length;
    return Math.max(0, Number(topic?.likeCount) || 0);
};

export const isTopicLikedBy = (topic, userId) =>
    !!userId && Array.isArray(topic?.likedBy) && topic.likedBy.includes(userId);

/** A like is a deliberate vote; a reply is half of one (it is also chatter). */
export const topicEngagement = (topic) => topicLikes(topic) * 2 + topicReplies(topic);

export const topicLastActivity = (topic) => timeOf(topic?.lastActivityAt || topic?.createdAt);

/**
 * Hot: engagement decayed by age, Hacker News style — (e + 1) / (h + 2)^1.5.
 * Age runs from the last activity rather than creation: in a community this
 * size a revived thread *is* the news, and a dead one should sink even if it
 * once did well.
 */
export function hotScore(topic, now = Date.now()) {
    const ageHours = Math.max(0, now - topicLastActivity(topic)) / HOUR_MS;
    return (topicEngagement(topic) + 1) / Math.pow(ageHours + 2, 1.5);
}

const byNewest = (a, b) => timeOf(b.createdAt) - timeOf(a.createdAt);
const byActivity = (a, b) => topicLastActivity(b) - topicLastActivity(a);

/**
 * Category + free-text filter. The query matches the title, the author and
 * the preview text, case- and accent-insensitively ("estrategia" finds
 * "Estratégia").
 */
export function filterTopics(topics, { category = 'all', query = '' } = {}) {
    const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const q = fold(query).trim();
    return (topics || []).filter((t) => {
        if (category !== 'all' && t.category !== category) return false;
        if (!q) return true;
        return [t.title, t.creatorName, t.bodyPreview, t.lastMessageText].some((f) => fold(f).includes(q));
    });
}

/**
 * Orders topics for the feed and splits off the pinned megathreads.
 * Pinned rows head the Hot feed only (as on Reddit); in New and Top they are
 * ordinary rows, so a sort never hides anything.
 *
 * @returns {{ pinned: object[], rows: object[] }}
 */
export function rankTopics(topics, sort = DEFAULT_FEED_SORT, now = Date.now()) {
    const list = [...(topics || [])];
    if (sort === 'new') return { pinned: [], rows: list.sort(byNewest) };
    if (sort === 'top') {
        return {
            pinned: [],
            rows: list.sort((a, b) => topicEngagement(b) - topicEngagement(a) || byActivity(a, b)),
        };
    }
    const pinned = list.filter(isPinnedTopic).sort(byActivity);
    const rows = list
        .filter((t) => !isPinnedTopic(t))
        .map((t) => ({ t, s: hotScore(t, now) }))
        .sort((a, b) => b.s - a.s || byActivity(a.t, b.t))
        .map(({ t }) => t);
    return { pinned, rows };
}

/**
 * "Em alta agora": community topics with activity in the last week and at
 * least one like or reply, best Hot score first. Megathreads are left out —
 * they are always busy, which is exactly why they are pinned instead.
 */
export function trendingTopics(topics, now = Date.now(), limit = TRENDING_LIMIT) {
    return (topics || [])
        .filter((t) => !isPinnedTopic(t)
            && topicEngagement(t) > 0
            && now - topicLastActivity(t) <= TRENDING_WINDOW_MS)
        .map((t) => ({ t, s: hotScore(t, now) }))
        .sort((a, b) => b.s - a.s || byActivity(a.t, b.t))
        .slice(0, limit)
        .map(({ t }) => t);
}

/** The figures on the community card (Reddit's "weekly visitors" line). */
export function communityStats(topics, now = Date.now()) {
    const list = topics || [];
    const trainers = new Set();
    let activeToday = 0;
    let replies = 0;
    for (const t of list) {
        if (t.createdBy && !isPinnedTopic(t)) trainers.add(t.createdBy);
        if (now - topicLastActivity(t) <= DAY_MS) activeToday += 1;
        replies += topicReplies(t);
    }
    return { topics: list.length, trainers: trainers.size, activeToday, replies };
}
