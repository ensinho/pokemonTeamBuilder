/**
 * A Pokémon's most used build in a format, from one entry of a baked usage
 * file (public/data/usage/<format>.json, scripts/build-usage-stats.mjs): the
 * item, ability, spread, Tera and four moves players actually run, each with
 * its share. "Best Garchomp build" is one of the most searched questions; the
 * Pokémon page shows this and api/render-meta.js writes the same into the
 * HTML (2026-10-24). Node-safe and pure.
 */
import { formatUsageSpread } from './metaFormat.js';

const share = (count, n) => Math.max(1, Math.round((count / n) * 100));

/**
 * @param {object} entry  `byId[id]` of a usage file: { n, usage, items, abilities, moves, spreads, tera? }
 * @returns {null | { usage, item, ability, tera, spread, moves }}
 */
export function mostUsedBuild(entry, { moveLimit = 4 } = {}) {
    const n = Number(entry?.n) || 0;
    if (!n) return null;
    const top = (list) => (Array.isArray(list) && list[0]?.count
        ? { name: list[0].name, slug: list[0].slug || null, share: share(list[0].count, n) }
        : null);
    const spread = Array.isArray(entry.spreads) && entry.spreads[0]?.count
        ? { nature: entry.spreads[0].nature || null, evs: formatUsageSpread(entry.spreads[0].evs), share: share(entry.spreads[0].count, n) }
        : null;
    return {
        usage: Number(entry.usage) || 0,
        item: top(entry.items),
        ability: top(entry.abilities),
        tera: top(entry.tera),
        spread,
        moves: (Array.isArray(entry.moves) ? entry.moves : [])
            .filter((m) => m?.count)
            .slice(0, moveLimit)
            .map((m) => ({ name: m.name, share: share(m.count, n) })),
    };
}
