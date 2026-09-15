// Pure helpers over the Smogon usage catalog (public/data/usage-index.json) and
// one format's baked file. Kept out of the views so the Meta pages stay thin and
// this logic is unit-tested — see metaFormats.test.js.
//
// Two ideas run through all of it:
//
//  · A format is either a VGC **regulation** (`kind: 'vgc'`) or a Smogon **tier**
//    (`kind: 'tier'`). The Meta pages browse everything; the Team Builder's
//    game/regulation picker only ever offers regulations, because a card grid of
//    forty ladders is not a regulation choice. Entries baked before `kind`
//    existed were all VGC, so a missing `kind` counts as a regulation.
//
//  · Rankings vary by rating cutoff, the per-Pokémon breakdown does not. The
//    build downloads every published cutoff's usage table (cheap) but only one
//    cutoff's full chaos dump (expensive), so `usageRows` re-ranks freely while
//    the detail page keeps saying which band its breakdown came from.

export const TIER_KIND = 'tier';

/** True for the VGC regulations the Team Builder offers as a ruleset. */
export const isRegulation = (format) => Boolean(format) && format.kind !== TIER_KIND;

/** Only the VGC regulations, in catalog order. */
export const regulationsOf = (formats = []) => formats.filter(isRegulation);

/**
 * Formats bucketed by their `group`, in first-seen (catalog) order — which is
 * the order the build writes them, newest and most-played first. Shape:
 * `[{ name, items }]`.
 */
export function groupFormats(formats = []) {
    const groups = [];
    for (const f of formats) {
        const name = f.group || '';
        let g = groups.find((x) => x.name === name);
        if (!g) { g = { name, items: [] }; groups.push(g); }
        g.items.push(f);
    }
    return groups;
}

/**
 * Formats matching a free-text query, against the label, the group and the raw
 * Smogon id — so "ou", "doubles", "national" and "gen9ou" all find their ladder.
 * An empty query returns everything (the picker's default state).
 */
export function searchFormats(formats = [], query = '') {
    const q = String(query).trim().toLowerCase();
    if (!q) return formats;
    return formats.filter((f) => `${f.label || ''} ${f.group || ''} ${f.id || ''}`.toLowerCase().includes(q));
}

/**
 * The cutoff to actually use: the requested one when the format published it,
 * otherwise the cutoff the detail was sampled at, otherwise the highest band
 * available. Accepts the requested value as a string (it arrives from the URL).
 */
export function resolveCutoff(requested, cutoffs = [], detailCutoff = null) {
    // `Number(null)` and `Number('')` are both 0 — a real band — so "nothing was
    // requested" has to be ruled out before coercing, or a URL with no ?cut
    // silently lands on the unrated ladder instead of the default one.
    const asked = requested === null || requested === undefined || requested === '' ? NaN : Number(requested);
    if (Number.isFinite(asked) && cutoffs.includes(asked)) return asked;
    if (Number.isFinite(detailCutoff) && cutoffs.includes(detailCutoff)) return detailCutoff;
    if (Number.isFinite(detailCutoff)) return detailCutoff;
    return cutoffs.length ? Math.max(...cutoffs) : null;
}

/** "1630" → "1630+", and the unrated band → "All ratings" / "Todos os ratings". */
export const cutoffLabel = (cutoff, pt = false) => {
    if (!Number.isFinite(Number(cutoff))) return '';
    return Number(cutoff) > 0 ? `${cutoff}+` : (pt ? 'Todos' : 'All');
};

/**
 * One format's ranking at a rating cutoff, as rows the Meta list renders:
 * `[{ id, name, usage, rawCount, winRate }]`, most-used first.
 *
 * The cutoff tables carry only name/usage/raw, so win rate (present on the
 * Limitless-mined formats) is merged back in from the detail set by species id.
 * When the requested cutoff has no table — an older baked file, or the band the
 * detail itself came from — the detail set is the ranking, which is exactly the
 * behaviour this page had before cutoffs existed.
 */
export function usageRows(data, cutoff = null) {
    if (!data) return [];
    const detail = data.byId || {};
    const band = cutoff == null ? null : data.cutoffs?.[String(cutoff)] || data.cutoffs?.[cutoff] || null;
    const source = band?.byId || detail;

    return Object.entries(source)
        .map(([id, e]) => {
            const d = detail[id];
            return {
                id: Number(id),
                name: e.name || d?.name || '',
                usage: e.usage ?? 0,
                rawCount: e.rawCount ?? e.teams ?? 0,
                winRate: Number.isFinite(d?.winRate) ? d.winRate : null,
                // The breakdown (items / moves / spreads) only exists for the
                // species the chaos download covered. The list dims the rest
                // rather than promising a detail page that has nothing on it.
                hasDetail: Boolean(d),
            };
        })
        .sort((a, b) => b.usage - a.usage || a.id - b.id);
}

/**
 * The strongest partnerships on the format's own ladder, from the `teammates`
 * counts in its detail set: `[{ ids, names, count, pct }]`, strongest first.
 *
 * This exists because the Meta page's "common pairs" panel was built from the
 * baked *tournament* teams, which are a VGC sample — fine beside a VGC
 * regulation, and plainly wrong beside Gen 8 Ubers. The ladder's own teammate
 * counts are the right data for a tier, and they are already in the file.
 *
 * `count` is the weighted co-occurrence Smogon reports. `pct` is that as a share
 * of the *more-used* partner's own sample — i.e. "this share of the teams that
 * ran the more common of the two also ran the other" — which keeps a niche mon's
 * near-total dependence on a popular partner from reading as a top-tier pairing.
 */
export function ladderPairs(data, limit = 6) {
    const byId = data?.byId;
    if (!byId) return [];

    const seen = new Map();
    for (const [rawId, entry] of Object.entries(byId)) {
        const id = Number(rawId);
        for (const tm of entry.teammates || []) {
            if (!tm.id || tm.id === id) continue;
            const key = id < tm.id ? `${id}-${tm.id}` : `${tm.id}-${id}`;
            // Both directions report the same pairing; keep the larger count so a
            // truncated teammate list on one side cannot understate the pair.
            const prev = seen.get(key);
            if (!prev || tm.count > prev.count) {
                seen.set(key, { ids: [id, tm.id].sort((a, b) => a - b), count: tm.count || 0 });
            }
        }
    }

    return [...seen.values()]
        .map((p) => {
            const n = Math.max(...p.ids.map((i) => byId[i]?.n || byId[i]?.rawCount || 0));
            return {
                ids: p.ids,
                names: p.ids.map((i) => byId[i]?.name || ''),
                count: p.count,
                pct: n > 0 ? Math.min(Math.round((p.count / n) * 100), 100) : 0,
            };
        })
        .sort((a, b) => b.pct - a.pct || b.count - a.count)
        .slice(0, limit);
}

/** Sort a row list built by `usageRows`. `usage` (default), `wr` or `name`. */
export function sortRows(rows = [], mode = 'usage') {
    const out = [...rows];
    if (mode === 'wr') {
        out.sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1) || b.usage - a.usage);
    } else if (mode === 'name') {
        out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    } else {
        out.sort((a, b) => b.usage - a.usage || a.id - b.id);
    }
    return out;
}

/**
 * Filter rows by search text and by type. `typesById` maps species id → its type
 * slugs; a row whose types are unknown is kept, because dropping a Pokémon the
 * index simply has not loaded yet reads as missing data, not as a filter.
 * `types` is OR-ed: picking Fire and Water shows everything that is either.
 */
export function filterRows(rows = [], { query = '', types = [], typesById = null } = {}) {
    const q = String(query).trim().toLowerCase();
    const wanted = types.length ? new Set(types) : null;
    return rows.filter((r) => {
        if (q && !String(r.name).replace(/-/g, ' ').toLowerCase().includes(q)) return false;
        if (!wanted) return true;
        const rowTypes = typesById?.get?.(r.id) || typesById?.[r.id];
        if (!rowTypes) return true;
        return rowTypes.some((t) => wanted.has(t));
    });
}
