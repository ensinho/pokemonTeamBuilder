import { describe, it, expect } from 'vitest';
import {
    hotScore,
    rankTopics,
    trendingTopics,
    communityStats,
    filterTopics,
    topicLikes,
    topicReplies,
    isTopicLikedBy,
} from './forumRanking';

const NOW = Date.parse('2026-10-17T12:00:00Z');
const hoursAgo = (h) => new Date(NOW - h * 3600 * 1000).toISOString();

const topic = (id, { likes = 0, messages = 1, activity = 1, created = activity, ...rest } = {}) => ({
    id,
    title: id,
    createdBy: `u-${id}`,
    likedBy: Array.from({ length: likes }, (_, i) => `l${i}`),
    messageCount: messages,
    lastActivityAt: hoursAgo(activity),
    createdAt: hoursAgo(created),
    ...rest,
});

describe('counters', () => {
    it('reads replies as messages minus the opening post', () => {
        expect(topicReplies({ messageCount: 5 })).toBe(4);
        expect(topicReplies({ messageCount: 0 })).toBe(0);
        expect(topicReplies({})).toBe(0);
    });

    it('trusts likedBy over a drifted counter, and falls back to it', () => {
        expect(topicLikes({ likedBy: ['a', 'b'], likeCount: 9 })).toBe(2);
        expect(topicLikes({ likeCount: 3 })).toBe(3);
        expect(topicLikes({ likeCount: -1 })).toBe(0);
    });

    it('knows whether a user liked a topic', () => {
        expect(isTopicLikedBy({ likedBy: ['me'] }, 'me')).toBe(true);
        expect(isTopicLikedBy({ likedBy: ['me'] }, null)).toBe(false);
        expect(isTopicLikedBy({}, 'me')).toBe(false);
    });
});

describe('hotScore', () => {
    it('rewards engagement and decays with age', () => {
        const fresh = hotScore(topic('a', { likes: 2, activity: 1 }), NOW);
        const old = hotScore(topic('b', { likes: 2, activity: 48 }), NOW);
        const busier = hotScore(topic('c', { likes: 6, activity: 1 }), NOW);
        expect(fresh).toBeGreaterThan(old);
        expect(busier).toBeGreaterThan(fresh);
    });

    it('lets a revived thread climb back', () => {
        const revived = topic('r', { likes: 1, activity: 1, created: 400 });
        const stale = topic('s', { likes: 1, activity: 200, created: 200 });
        expect(hotScore(revived, NOW)).toBeGreaterThan(hotScore(stale, NOW));
    });
});

describe('rankTopics', () => {
    const topics = [
        topic('pinned', { createdBy: 'system', messages: 300, activity: 0.1 }),
        topic('old-popular', { likes: 10, messages: 20, activity: 240, created: 300 }),
        topic('fresh', { likes: 1, messages: 3, activity: 0.5, created: 2 }),
        topic('newest', { activity: 0.2, created: 0.2 }),
    ];

    it('Hot pins the megathreads and ranks the rest by score', () => {
        const { pinned, rows } = rankTopics(topics, 'hot', NOW);
        expect(pinned.map((t) => t.id)).toEqual(['pinned']);
        expect(rows.map((t) => t.id)).toEqual(['fresh', 'newest', 'old-popular']);
    });

    it('New orders by creation and pins nothing', () => {
        const { pinned, rows } = rankTopics(topics, 'new', NOW);
        expect(pinned).toEqual([]);
        expect(rows.map((t) => t.id)).toEqual(['pinned', 'newest', 'fresh', 'old-popular']);
    });

    it('Top orders by engagement, ignoring age', () => {
        const { rows } = rankTopics(topics, 'top', NOW);
        expect(rows[0].id).toBe('pinned');
        expect(rows[1].id).toBe('old-popular');
    });

    it('treats an unknown sort as Hot', () => {
        expect(rankTopics(topics, 'nope', NOW).pinned).toHaveLength(1);
    });
});

describe('trendingTopics', () => {
    it('keeps recent community topics with engagement, best first', () => {
        const list = trendingTopics([
            topic('pinned', { createdBy: 'system', likes: 50, activity: 1 }),
            topic('quiet', { activity: 1 }),
            topic('stale', { likes: 9, activity: 24 * 8 }),
            topic('warm', { likes: 1, activity: 5 }),
            topic('hot', { likes: 4, messages: 6, activity: 2 }),
        ], NOW);
        expect(list.map((t) => t.id)).toEqual(['hot', 'warm']);
    });

    it('caps the list', () => {
        const many = Array.from({ length: 9 }, (_, i) => topic(`t${i}`, { likes: 1, activity: i + 1 }));
        expect(trendingTopics(many, NOW, 3)).toHaveLength(3);
    });
});

describe('communityStats', () => {
    it('counts topics, distinct trainers, today and replies', () => {
        const stats = communityStats([
            topic('a', { createdBy: 'x', messages: 3, activity: 2 }),
            topic('b', { createdBy: 'x', messages: 1, activity: 30 }),
            topic('c', { createdBy: 'y', messages: 5, activity: 50 }),
            topic('d', { createdBy: 'system', messages: 10, activity: 1 }),
        ], NOW);
        expect(stats).toEqual({ topics: 4, trainers: 2, activeToday: 2, replies: 15 });
    });
});

describe('filterTopics', () => {
    const list = [
        { id: '1', category: 'strategy', title: 'Estratégia de Trick Room', creatorName: 'Ash' },
        { id: '2', category: 'teams', title: 'Meu time', creatorName: 'Misty', bodyPreview: 'Gyarados na frente' },
    ];

    it('filters by category', () => {
        expect(filterTopics(list, { category: 'teams' }).map((t) => t.id)).toEqual(['2']);
    });

    it('matches title, author and body, ignoring case and accents', () => {
        expect(filterTopics(list, { query: 'estrategia' }).map((t) => t.id)).toEqual(['1']);
        expect(filterTopics(list, { query: 'misty' }).map((t) => t.id)).toEqual(['2']);
        expect(filterTopics(list, { query: 'GYARADOS' }).map((t) => t.id)).toEqual(['2']);
    });
});
