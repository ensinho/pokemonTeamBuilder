import { describe, expect, it } from 'vitest';

import { EMPTY_CHALLENGE_RECORD, fewestWinsOverAChampion, summarizeChallengeRuns } from './challengeRecord';

const run = (dayKey, championId, board, status, extra = {}) => ({
    dayKey, championId, board, status, practice: false, result: { remaining: 3 }, ...extra,
});

describe('summarizeChallengeRuns', () => {
    it('reads nothing as an empty record', () => {
        expect(summarizeChallengeRuns([])).toEqual(EMPTY_CHALLENGE_RECORD);
        expect(summarizeChallengeRuns()).toEqual(EMPTY_CHALLENGE_RECORD);
    });

    it('skips practice and unfinished runs', () => {
        const record = summarizeChallengeRuns([
            run('2026-11-01', 'cynthia', 'daily', 'won', { practice: true }),
            run('2026-11-01', 'blue', 'daily', 'active'),
        ]);
        expect(record.wins).toBe(0);
        expect(record.bothPlayedDays).toBe(0);
    });

    it('counts wins per champion and per board', () => {
        const record = summarizeChallengeRuns([
            run('2026-11-01', 'cynthia', 'daily', 'won'),
            run('2026-11-01', 'cynthia', 'free', 'won'),
            run('2026-11-02', 'blue', 'daily', 'lost'),
            run('2026-11-03', 'blue', 'free', 'won'),
        ]);
        expect(record.wins).toBe(3);
        expect(record.winsBy).toEqual({ cynthia: 2, blue: 1 });
        expect(record.dailyTeamWins).toBe(1);
        expect(record.ownTeamWins).toBe(2);
    });

    it('reads a run from before champions and boards as Cynthia, by its team source', () => {
        const record = summarizeChallengeRuns([
            { dayKey: '2026-10-01', status: 'won', practice: false, teamSource: 'daily' },
            { dayKey: '2026-10-02', status: 'won', practice: false, teamSource: 'saved' },
        ]);
        expect(record.winsBy).toEqual({ cynthia: 2 });
        expect(record.dailyTeamWins).toBe(1);
        expect(record.ownTeamWins).toBe(1);
    });

    it('counts a day both champions were faced, even lost', () => {
        const record = summarizeChallengeRuns([
            run('2026-11-01', 'cynthia', 'daily', 'lost'),
            run('2026-11-01', 'blue', 'free', 'expired'),
            run('2026-11-02', 'cynthia', 'daily', 'won'),
        ]);
        expect(record.bothPlayedDays).toBe(1);
        expect(record.bothWonDays).toBe(0);
    });

    it('tells beating both from beating both with the daily team', () => {
        const record = summarizeChallengeRuns([
            // Day 1: both beaten, Blue only with an own team.
            run('2026-11-01', 'cynthia', 'daily', 'won'),
            run('2026-11-01', 'blue', 'free', 'won'),
            // Day 2: both beaten with the daily team.
            run('2026-11-02', 'cynthia', 'daily', 'won'),
            run('2026-11-02', 'blue', 'daily', 'won'),
        ]);
        expect(record.bothWonDays).toBe(2);
        expect(record.bothDailyWonDays).toBe(1);
        expect(record.sweepDays).toBe(0);
    });

    it('needs all four officials won for a sweep', () => {
        const day = (status) => [
            run('2026-11-01', 'cynthia', 'daily', 'won'),
            run('2026-11-01', 'cynthia', 'free', 'won'),
            run('2026-11-01', 'blue', 'daily', 'won'),
            run('2026-11-01', 'blue', 'free', status),
        ];
        expect(summarizeChallengeRuns(day('won')).sweepDays).toBe(1);
        expect(summarizeChallengeRuns(day('lost')).sweepDays).toBe(0);
    });

    it('counts a win with all six standing as flawless', () => {
        const record = summarizeChallengeRuns([
            run('2026-11-01', 'cynthia', 'daily', 'won', { result: { remaining: 6 } }),
            run('2026-11-02', 'blue', 'daily', 'won', { result: { remaining: 5 } }),
            run('2026-11-03', 'blue', 'daily', 'lost', { result: { remaining: 6 } }),
        ]);
        expect(record.flawlessWins).toBe(1);
    });
});

describe('fewestWinsOverAChampion', () => {
    it('is the champion beaten least', () => {
        expect(fewestWinsOverAChampion({ winsBy: { cynthia: 7, blue: 2 } })).toBe(2);
        expect(fewestWinsOverAChampion({ winsBy: { cynthia: 7 } })).toBe(0);
        expect(fewestWinsOverAChampion(null)).toBe(0);
    });
});
