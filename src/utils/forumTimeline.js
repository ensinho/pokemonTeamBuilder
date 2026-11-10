import { isPinnedTopic, topicLastActivity } from './forumRanking.js';
// The forum read as a timeline (2026-11-10, Enzo: "sem organização
// cronológica fácil"). The default feed is the newest post first, cut into
// the days a person thinks in; the explorer's "Atividade recente" is the same
// topics by when they last moved. Pure — the feed, the drawer and the tests
// share it.

export const TIMELINE_GROUPS = ['today', 'yesterday', 'week', 'month', 'older'];

const timeOf = (iso) => {
    const ms = iso ? Date.parse(iso) : NaN;
    return Number.isFinite(ms) ? ms : 0;
};

// Midnight `daysBack` days before `now`, on the reader's own calendar — built
// from date parts, so a daylight-saving day is still one day.
const dayStart = (now, daysBack = 0) => {
    const d = new Date(now);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysBack).getTime();
};

/** Which stretch of the timeline a moment falls in. A clock ahead of ours is today. */
export function timelineGroupOf(iso, now = Date.now()) {
    const ms = timeOf(iso);
    if (ms >= dayStart(now)) return 'today';
    if (ms >= dayStart(now, 1)) return 'yesterday';
    if (ms >= dayStart(now, 7)) return 'week';
    if (ms >= dayStart(now, 30)) return 'month';
    return 'older';
}

/**
 * Cuts an already ordered list into the timeline's stretches, keeping the
 * order inside each. Empty stretches are left out.
 *
 * @returns {{ id: string, topics: object[] }[]}
 */
export function groupByDay(topics, now = Date.now(), dateOf = (t) => t.createdAt || t.lastActivityAt) {
    const buckets = new Map(TIMELINE_GROUPS.map((id) => [id, []]));
    for (const topic of topics || []) buckets.get(timelineGroupOf(dateOf(topic), now)).push(topic);
    return TIMELINE_GROUPS.filter((id) => buckets.get(id).length > 0).map((id) => ({ id, topics: buckets.get(id) }));
}

/** The community's topics by when they last moved — where the talk is now. */
export function latestActivity(topics, { limit = 5, now = Date.now() } = {}) {
    return (topics || [])
        .filter((t) => !isPinnedTopic(t, now))
        .sort((a, b) => topicLastActivity(b) - topicLastActivity(a))
        .slice(0, limit);
}

/** The topics a trainer opened, newest first. */
export function topicsBy(topics, userId, { limit = 3 } = {}) {
    if (!userId) return [];
    return (topics || [])
        .filter((t) => t.createdBy === userId)
        .sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt))
        .slice(0, limit);
}
