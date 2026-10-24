/**
 * The best-teams page (`/best-teams`, 2026-10-24) from the baked tournament
 * teams: the teams that finished on top, the Pokémon those teams use most,
 * and the pairs that keep appearing together. It answers "best VGC teams"
 * and "best team with X" searches with real results; the page and the
 * prerender (api/render-meta.js) both read this, so they say the same thing.
 *
 * Node-safe and pure: the dataset comes in as an argument. Tournament ids are
 * base-species ids, so a Mega counts as its base.
 */

/**
 * "Champion" → 1, "Runner Up" → 2, "3rd" → 3, "Top 8" → 8; unknown last.
 * The number wins when there is one: "31st" must not read as "1st".
 */
export function placementRank(placement) {
    const text = String(placement || '').toLowerCase();
    const n = Number.parseInt(text.match(/\d+/)?.[0] ?? '', 10);
    if (Number.isFinite(n) && n > 0) return n;
    if (/champion|winner/.test(text)) return 1;
    if (/runner|finalist/.test(text)) return 2;
    return 999;
}

const idsOf = (team) => [...new Set((team?.pokemons || []).map((p) => Number(p?.id)).filter(Boolean))];

/** The name a species was entered as most often (Urshifu-Rapid-Strike, not Urshifu). */
const commonName = (names) => [...names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';

/**
 * @param {Array} teams  the dataset's `teams`, newest first
 * @returns {null | { format, total, events, top, pokemon, pairs }}
 */
export function bestTeamsSummary(teams, { topLimit = 8, pokemonLimit = 12, pairLimit = 8 } = {}) {
    const list = (Array.isArray(teams) ? teams : []).filter((team) => idsOf(team).length > 0);
    if (!list.length) return null;

    // The regulation most of the dataset is in: the page is about one meta.
    const formats = new Map();
    for (const team of list) formats.set(team.format || '', (formats.get(team.format || '') || 0) + 1);
    const format = [...formats.entries()].sort((a, b) => b[1] - a[1])[0][0] || null;
    const inFormat = format ? list.filter((team) => team.format === format) : list;

    const species = new Map();
    const pairs = new Map();
    for (const team of inFormat) {
        const ids = idsOf(team);
        for (const member of team.pokemons) {
            const id = Number(member?.id);
            if (!id) continue;
            const entry = species.get(id) || { id, count: 0, names: new Map() };
            if (member.name) entry.names.set(member.name, (entry.names.get(member.name) || 0) + 1);
            species.set(id, entry);
        }
        for (const id of ids) species.get(id).count += 1;
        for (let i = 0; i < ids.length; i += 1) {
            for (let j = i + 1; j < ids.length; j += 1) {
                const [a, b] = ids[i] < ids[j] ? [ids[i], ids[j]] : [ids[j], ids[i]];
                const key = `${a}-${b}`;
                pairs.set(key, { a, b, count: (pairs.get(key)?.count || 0) + 1 });
            }
        }
    }

    const nameOf = (id) => commonName(species.get(id)?.names || new Map()) || `#${id}`;
    const share = (count) => Math.max(1, Math.round((count / inFormat.length) * 100));

    return {
        format,
        total: inFormat.length,
        events: new Set(inFormat.map((team) => team.tournament).filter(Boolean)).size,
        // Best finish first; among equals the dataset's order (newest first).
        top: inFormat
            .map((team, index) => ({ team, index, rank: placementRank(team.placement) }))
            .sort((x, y) => x.rank - y.rank || x.index - y.index)
            .slice(0, topLimit)
            .map(({ team }) => team),
        pokemon: [...species.values()]
            .sort((x, y) => y.count - x.count || x.id - y.id)
            .slice(0, pokemonLimit)
            .map(({ id, count }) => ({ id, name: nameOf(id), count, share: share(count) })),
        pairs: [...pairs.values()]
            .sort((x, y) => y.count - x.count || x.a - y.a || x.b - y.b)
            .slice(0, pairLimit)
            .map(({ a, b, count }) => ({ a: { id: a, name: nameOf(a) }, b: { id: b, name: nameOf(b) }, count, share: share(count) })),
    };
}
