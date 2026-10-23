// The forum's "team of the week" (FeedView, 2026-10-23): the shared team the
// community liked most in the last seven days; when nobody posted one, a
// featured tournament team that changes every Monday. A forum this size is
// often quiet, and an empty week used to look like an empty forum — now the
// top of the feed always has a team worth opening, and says how to take its
// place. Pure: the feed passes its topics and the baked tournament teams.

import { isPinnedTopic, topicEngagement, topicLikes } from './forumRanking';

const DAY_MS = 24 * 60 * 60 * 1000;
export const TEAM_OF_THE_WEEK_WINDOW_MS = 7 * DAY_MS;

const timeOf = (iso) => {
    const ms = iso ? Date.parse(iso) : NaN;
    return Number.isFinite(ms) ? ms : 0;
};

const rosterOf = (team) => (Array.isArray(team?.pokemons) ? team.pokemons.filter(Boolean).slice(0, 6) : []);

/**
 * Weeks since the epoch, turning over on Monday 00:00 UTC (1 Jan 1970 was a
 * Thursday, hence the three days). Everyone sees the same pick all week.
 */
export const weekIndex = (now = Date.now()) => Math.floor((now / DAY_MS + 3) / 7);

/**
 * @returns {null
 *   | { kind: 'community', topic: object, team: object }
 *   | { kind: 'tournament', team: object }}
 */
export function teamOfTheWeek(topics = [], tournamentTeams = [], now = Date.now()) {
    const since = now - TEAM_OF_THE_WEEK_WINDOW_MS;
    const candidates = (Array.isArray(topics) ? topics : []).filter((topic) => (
        !isPinnedTopic(topic)
        && rosterOf(topic.sharedTeam).length > 0
        && timeOf(topic.createdAt) >= since
        && topicLikes(topic) > 0
    ));
    if (candidates.length) {
        const [topic] = candidates.sort((a, b) => (
            topicEngagement(b) - topicEngagement(a) || timeOf(b.createdAt) - timeOf(a.createdAt)
        ));
        return { kind: 'community', topic, team: { ...topic.sharedTeam, pokemons: rosterOf(topic.sharedTeam) } };
    }

    const teams = (Array.isArray(tournamentTeams) ? tournamentTeams : []).filter((team) => rosterOf(team).length > 0);
    if (!teams.length) return null;
    const featured = teams.filter((team) => team.featured);
    const pool = featured.length ? featured : teams;
    return { kind: 'tournament', team: pool[weekIndex(now) % pool.length] };
}
