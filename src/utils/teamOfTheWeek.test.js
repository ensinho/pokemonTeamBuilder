import { describe, expect, it } from 'vitest';
import { teamOfTheWeek, weekIndex } from './teamOfTheWeek';

const NOW = Date.parse('2026-10-23T12:00:00Z'); // a Friday
const daysAgo = (n) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();
const roster = [{ id: 445, name: 'garchomp' }, { id: 727, name: 'incineroar' }];

const topic = (id, { likes = 0, replies = 0, age = 1, team = true, system = false } = {}) => ({
    id,
    createdAt: daysAgo(age),
    createdBy: system ? 'system' : `u-${id}`,
    likedBy: Array.from({ length: likes }, (_, i) => `l${i}`),
    messageCount: replies + 1,
    sharedTeam: team ? { name: `Team ${id}`, pokemons: roster } : null,
});

const TOURNAMENT = [
    { id: 't1', pokemons: roster, featured: true },
    { id: 't2', pokemons: roster },
    { id: 't3', pokemons: roster, featured: true },
];

describe('teamOfTheWeek', () => {
    it('picks the shared team the community engaged with most this week', () => {
        const pick = teamOfTheWeek([topic('a', { likes: 1 }), topic('b', { likes: 2 }), topic('c', { likes: 1, replies: 3 })], TOURNAMENT, NOW);
        expect(pick.kind).toBe('community');
        expect(pick.topic.id).toBe('c'); // 1×2 + 3 beats 2×2
        expect(pick.team.name).toBe('Team c');
    });

    it('ignores posts without a team, without a like, older than a week, or pinned', () => {
        const topics = [
            topic('none', { likes: 9, team: false }),
            topic('unliked', { likes: 0 }),
            topic('old', { likes: 9, age: 8 }),
            topic('oak', { likes: 9, system: true }),
        ];
        expect(teamOfTheWeek(topics, TOURNAMENT, NOW).kind).toBe('tournament');
    });

    it('falls back to a featured tournament team that holds all week', () => {
        const monday = Date.parse('2026-10-19T00:00:00Z');
        const sunday = Date.parse('2026-10-25T23:59:00Z');
        const first = teamOfTheWeek([], TOURNAMENT, monday);
        expect(first.kind).toBe('tournament');
        expect(first.team.featured).toBe(true);
        expect(teamOfTheWeek([], TOURNAMENT, sunday).team.id).toBe(first.team.id);
        // Next Monday, the other featured team.
        const next = teamOfTheWeek([], TOURNAMENT, Date.parse('2026-10-26T00:00:00Z'));
        expect(next.team.id).not.toBe(first.team.id);
        expect(next.team.featured).toBe(true);
    });

    it('answers null when there is nothing to show', () => {
        expect(teamOfTheWeek([], [], NOW)).toBeNull();
        expect(teamOfTheWeek(undefined, undefined, NOW)).toBeNull();
    });
});

describe('weekIndex', () => {
    it('turns over on Monday, UTC', () => {
        expect(weekIndex(Date.parse('2026-10-25T23:59:59Z'))).toBe(weekIndex(Date.parse('2026-10-19T00:00:00Z')));
        expect(weekIndex(Date.parse('2026-10-26T00:00:00Z'))).toBe(weekIndex(Date.parse('2026-10-19T00:00:00Z')) + 1);
    });
});
