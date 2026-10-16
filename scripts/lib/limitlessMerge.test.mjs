import { describe, it, expect } from 'vitest';

import { hasLadderDetail, mergeTournamentIntoLadder } from './limitlessMerge.mjs';

const ladder = {
    month: '2026-09',
    detailCutoff: 1630,
    cutoffs: { 0: { totalBattles: 10, byId: {} } },
    byId: {
        727: { name: 'Incineroar', usage: 40.1, items: [{ name: 'Sitrus Berry' }] },
        983: { name: 'Kingambit', usage: 22, winRate: 61, tour: { usage: 9 } }, // stale merge
    },
};
const reg = {
    teamsAnalyzed: 2000,
    tournaments: 40,
    from: '2026-10-01',
    to: '2026-10-14',
    byId: {
        727: { name: 'Incineroar', usage: 31.2, teams: 624, winRate: 51.4, topCut: 30 },
        812: { name: 'Rillaboom', usage: 35, teams: 700, winRate: 52 },
    },
};

describe('mergeTournamentIntoLadder', () => {
    const out = mergeTournamentIntoLadder(ladder, reg, { generatedAt: 'now' });

    it('keeps the ladder as the file’s detail and rating bands', () => {
        expect(out.cutoffs).toBe(ladder.cutoffs);
        expect(out.byId[727].items).toEqual([{ name: 'Sitrus Berry' }]);
        expect(out.byId[727].usage).toBe(40.1);
    });

    it('adds the win rate and a tournament summary to species both sources cover', () => {
        expect(out.byId[727].winRate).toBe(51.4);
        expect(out.byId[727].tour).toEqual({ usage: 31.2, teams: 624, winRate: 51.4, topCut: 30 });
    });

    it('clears tournament fields left over from an earlier merge', () => {
        expect(out.byId[983].winRate).toBeUndefined();
        expect(out.byId[983].tour).toBeUndefined();
    });

    it('ranks every tournament species, including ones the ladder detail misses', () => {
        expect(out.tournament).toMatchObject({ source: 'limitless', teamsAnalyzed: 2000, tournaments: 40, from: '2026-10-01', to: '2026-10-14' });
        expect(out.tournament.byId[812]).toEqual({ name: 'Rillaboom', usage: 35, rawCount: 700, winRate: 52 });
        expect(out.byId[812]).toBeUndefined();
    });
});

describe('hasLadderDetail', () => {
    it('recognises a Smogon file and rejects a Limitless-only one', () => {
        expect(hasLadderDetail(ladder)).toBe(true);
        expect(hasLadderDetail({ byId: {}, source: 'limitless tournament standings' })).toBe(false);
        expect(hasLadderDetail(null)).toBe(false);
    });
});
