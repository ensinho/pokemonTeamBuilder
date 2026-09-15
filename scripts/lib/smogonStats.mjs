// Pure parsers for Smogon's monthly stats pages, split out of
// build-usage-stats.mjs so they can be unit-tested without the network.
//
// Everything Smogon publishes is scraped text — a directory listing and a
// fixed-width ASCII table — so these two functions are where the whole usage
// pipeline is most likely to break silently when the site's output shifts.
// `smogonStats.test.mjs` pins both against real fixtures.

/**
 * The stats directory listing → Map(formatId → ascending rating cutoffs).
 *
 * The month index is a plain Apache listing whose leaf files are all named
 * `<formatId>-<cutoff>.txt` (the sibling `chaos/`, `moveset/`, `metagame/` and
 * `leads/` directories repeat the same ids). Reading it tells us exactly which
 * ladders ran and at which bands, so the format catalog can name ladders
 * speculatively and let the absent ones fall away.
 */
export function parseStatsListing(html = '') {
    const found = new Map();
    for (const m of String(html).matchAll(/href="([a-z0-9]+)-(\d+)\.txt"/g)) {
        const [, id, cutoff] = m;
        if (!found.has(id)) found.set(id, new Set());
        found.get(id).add(Number(cutoff));
    }
    return new Map([...found].map(([id, set]) => [id, [...set].sort((a, b) => a - b)]));
}

/**
 * One rating band's plain usage table → { totalBattles, rows }.
 *
 * The file is a fixed-width ASCII table:
 *
 *   Total battles: 1234567
 *   + ---- + ---------- + -------- + ------ + ------ + ----- + ------ +
 *   | Rank | Pokemon    | Usage %  | Raw    | %      | Real  | %      |
 *   + ---- + ---------- + -------- + ------ + ------ + ----- + ------ +
 *   | 1    | Great Tusk | 35.123%  | 123456 | 12.34% | 98765 | 11.11% |
 *
 * `usage` comes back as a percentage (the chaos JSON's equivalent is a 0–1
 * fraction — do not mix them up). Divider and header rows are skipped by
 * requiring a positive integer in the Rank cell, which is also what makes a
 * species literally named like a number impossible to confuse for one.
 *
 * `limit` caps the rows kept; past a couple of hundred a tier's usage numbers
 * are rounding noise.
 */
export function parseUsageTable(text = '', limit = Infinity) {
    const body = String(text);
    const totalBattles = Number(body.match(/Total battles:\s*(\d+)/)?.[1] || 0);
    const rows = [];
    for (const line of body.split('\n')) {
        if (!line.trimStart().startsWith('|')) continue;
        // Splitting on the pipes leaves cells[0] as the text before the first one.
        const cells = line.split('|').map((c) => c.trim());
        const rank = Number(cells[1]);
        if (!Number.isInteger(rank) || rank <= 0) continue;
        const name = cells[2];
        const usage = Number.parseFloat(cells[3]);
        if (!name || !Number.isFinite(usage)) continue;
        rows.push({ name, usage, raw: Number.parseInt(cells[4], 10) || 0 });
        if (rows.length >= limit) break;
    }
    return { totalBattles, rows };
}

/**
 * The order to try rating cutoffs in for one format: the preferred bands the
 * month actually published, in preference order, then any other published band
 * from the top down. With nothing published (the listing was unreadable) the
 * bare preference list is returned so the caller can fall back to probing.
 */
export function orderCutoffs(published, preference = []) {
    if (!published || !published.length) return [...preference];
    return [
        ...preference.filter((c) => published.includes(c)),
        ...published.filter((c) => !preference.includes(c)).sort((a, b) => b - a),
    ];
}
