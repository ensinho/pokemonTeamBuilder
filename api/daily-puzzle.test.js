import { describe, it, expect } from 'vitest';
import { DAILY_TOPICS, selectDailyTargets } from './daily-puzzle.js';

const sub = (path, data = {}) => ({ ref: { path }, data: () => data });

describe('selectDailyTargets', () => {
    const appId = 'pokemonTeamBuilder';

    it('takes every subscription under this app that has not opted out', () => {
        const docs = [
            sub('artifacts/pokemonTeamBuilder/users/u1/pushSubscriptions/s1', { lang: 'pt' }),
            sub('artifacts/pokemonTeamBuilder/users/u2/pushSubscriptions/s1', { topics: { dailyPuzzle: true } }),
        ];
        expect(selectDailyTargets(docs, { appId })).toHaveLength(2);
    });

    it('skips a device that turned the daily reminder off', () => {
        const docs = [
            sub('artifacts/pokemonTeamBuilder/users/u1/pushSubscriptions/s1', { topics: { dailyPuzzle: false } }),
        ];
        expect(selectDailyTargets(docs, { appId })).toHaveLength(0);
    });

    it('ignores subscriptions belonging to another appId namespace', () => {
        // `collectionGroup` matches by collection name anywhere in the database,
        // so a staging namespace would otherwise be notified by production.
        const docs = [sub('artifacts/somethingElse/users/u1/pushSubscriptions/s1', {})];
        expect(selectDailyTargets(docs, { appId })).toHaveLength(0);
    });

    it("keeps each daily topic's opt-out apart: no puzzle doesn't mean no Champion", () => {
        const docs = [
            sub('artifacts/pokemonTeamBuilder/users/u1/pushSubscriptions/s1', { topics: { dailyPuzzle: false } }),
            sub('artifacts/pokemonTeamBuilder/users/u2/pushSubscriptions/s1', { topics: { dailyChallenge: false } }),
            sub('artifacts/pokemonTeamBuilder/users/u3/pushSubscriptions/s1', {}),
        ];
        const ids = (topic) => selectDailyTargets(docs, { appId, topic }).map((d) => d.ref.path.split('/')[3]);
        expect(ids('dailyPuzzle')).toEqual(['u2', 'u3']);
        expect(ids('dailyChallenge')).toEqual(['u1', 'u3']);
        expect(DAILY_TOPICS.map((t) => t.url)).toEqual(['/pokepuzzle', '/challenge']);
    });

    it('caps a single run so the cron cannot run past its budget', () => {
        const docs = Array.from({ length: 5 }, (_, i) => (
            sub(`artifacts/pokemonTeamBuilder/users/u${i}/pushSubscriptions/s1`, {})
        ));
        expect(selectDailyTargets(docs, { appId, limit: 3 })).toHaveLength(3);
    });
});
