import { describe, it, expect } from 'vitest';

import { orderCutoffs, parseStatsListing, parseUsageTable } from './smogonStats.mjs';

// Smogon publishes scraped text, not an API, so these fixtures are verbatim
// slices of the real pages — spacing, trailing pipes and all. If the site's
// output ever shifts, these are the tests that catch it before a build quietly
// produces an empty catalog.

const LISTING = `<html><head><title>Index of /stats/2026-06</title></head><body>
<h1>Index of /stats/2026-06</h1>
<pre><a href="../">../</a>
<a href="chaos/">chaos/</a>                            01-Jul-2026 05:12    -
<a href="leads/">leads/</a>                            01-Jul-2026 05:12    -
<a href="metagame/">metagame/</a>                      01-Jul-2026 05:12    -
<a href="moveset/">moveset/</a>                        01-Jul-2026 05:12    -
<a href="gen9ou-0.txt">gen9ou-0.txt</a>                  01-Jul-2026 05:12   1M
<a href="gen9ou-1500.txt">gen9ou-1500.txt</a>            01-Jul-2026 05:12   1M
<a href="gen9ou-1695.txt">gen9ou-1695.txt</a>            01-Jul-2026 05:12   1M
<a href="gen9ou-1825.txt">gen9ou-1825.txt</a>            01-Jul-2026 05:12   1M
<a href="gen9vgc2026regi-1630.txt">gen9vgc2026regi-1630.txt</a>  01-Jul-2026 05:12  90K
<a href="gen9vgc2026regi-0.txt">gen9vgc2026regi-0.txt</a>        01-Jul-2026 05:12  90K
</pre></body></html>`;

const TABLE = ` Total battles: 1163315
 Avg. weight/team: 0.276120
 + ---- + ------------------ + --------- + ------ + ------- + ------ + ------- +
 | Rank | Pokemon            | Usage %   | Raw    | %       | Real   | %       |
 + ---- + ------------------ + --------- + ------ + ------- + ------ + ------- +
 | 1    | Great Tusk         | 35.12345% | 412356 | 17.723% | 350112 | 16.884% |
 | 2    | Landorus-Therian   | 28.40100% | 331200 | 14.234% | 280455 | 13.522% |
 | 3    | Iron Valiant       |  9.00000% |  88123 |  3.787% |  70012 |  3.376% |
 + ---- + ------------------ + --------- + ------ + ------- + ------ + ------- +
`;

describe('parseStatsListing', () => {
    it('maps every published format to its ascending rating cutoffs', () => {
        const found = parseStatsListing(LISTING);
        expect(found.get('gen9ou')).toEqual([0, 1500, 1695, 1825]);
        expect(found.get('gen9vgc2026regi')).toEqual([0, 1630]);
    });

    it('ignores the sibling directories, so only real ladders come back', () => {
        const found = parseStatsListing(LISTING);
        expect([...found.keys()].sort()).toEqual(['gen9ou', 'gen9vgc2026regi']);
    });

    it('returns an empty map for an unreadable page rather than throwing', () => {
        expect(parseStatsListing('').size).toBe(0);
        expect(parseStatsListing(undefined).size).toBe(0);
    });
});

describe('parseUsageTable', () => {
    it('reads the battle count and every ranked row', () => {
        const { totalBattles, rows } = parseUsageTable(TABLE);
        expect(totalBattles).toBe(1163315);
        expect(rows).toHaveLength(3);
        expect(rows[0]).toEqual({ name: 'Great Tusk', usage: 35.12345, raw: 412356 });
        expect(rows[1].name).toBe('Landorus-Therian');
    });

    it('reads usage as a percentage, not the chaos JSON 0-1 fraction', () => {
        const { rows } = parseUsageTable(TABLE);
        expect(rows[2].usage).toBe(9);
    });

    it('skips the header and divider rows', () => {
        const { rows } = parseUsageTable(TABLE);
        expect(rows.some((r) => r.name === 'Pokemon')).toBe(false);
        expect(rows.every((r) => Number.isFinite(r.usage))).toBe(true);
    });

    it('honours the row cap', () => {
        expect(parseUsageTable(TABLE, 2).rows).toHaveLength(2);
    });

    it('comes back empty (not broken) when the page is not a table', () => {
        expect(parseUsageTable('404 Not Found')).toEqual({ totalBattles: 0, rows: [] });
    });
});

describe('orderCutoffs', () => {
    const preference = [1695, 1630, 1760, 1825, 1500, 0];

    it('leads with the preferred bands the month published', () => {
        expect(orderCutoffs([0, 1500, 1695, 1825], preference)).toEqual([1695, 1825, 1500, 0]);
    });

    it('appends unexpected bands from the top down, so none is lost', () => {
        expect(orderCutoffs([0, 1400, 1630], preference)).toEqual([1630, 0, 1400]);
    });

    it('falls back to the bare preference list when nothing is published', () => {
        expect(orderCutoffs([], preference)).toEqual(preference);
        expect(orderCutoffs(undefined, preference)).toEqual(preference);
    });
});
