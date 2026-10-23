/**
 * How one Pokémon shows up in the baked tournament teams (public/data/
 * tournaments.json): how many teams carried it, the most recent of them, and
 * the partners it was built with most often. The Pokémon page shows it, and
 * api/render-meta.js writes the same facts into the page's HTML — "best team
 * with Garchomp" is what people search, and these are real answers to it.
 *
 * Node-safe and pure: the dataset arrives as an argument. Tournament ids are
 * already base-species ids, so a Mega and its base count as one Pokémon.
 */

const idsOf = (team) => [...new Set((team?.pokemons || []).map((p) => Number(p?.id)).filter(Boolean))];

/**
 * @param {Array} teams the dataset's `teams`, newest first (as baked)
 * @param {number} pokemonId
 * @returns {null | {
 *   count: number, total: number,
 *   teams: Array<object>,
 *   partners: Array<{ id: number, name: string, count: number }>,
 * }}
 */
export function tournamentPresence(teams, pokemonId, { teamLimit = 6, partnerLimit = 6 } = {}) {
    const id = Number(pokemonId);
    const list = Array.isArray(teams) ? teams : [];
    if (!id || !list.length) return null;

    const featuring = list.filter((team) => idsOf(team).includes(id));
    if (!featuring.length) return null;

    const partners = new Map();
    for (const team of featuring) {
        for (const member of team.pokemons || []) {
            const partnerId = Number(member?.id);
            if (!partnerId || partnerId === id) continue;
            const entry = partners.get(partnerId) || { id: partnerId, count: 0, names: new Map() };
            entry.count += 1;
            if (member.name) entry.names.set(member.name, (entry.names.get(member.name) || 0) + 1);
            partners.set(partnerId, entry);
        }
    }

    return {
        count: featuring.length,
        total: list.length,
        teams: featuring.slice(0, teamLimit),
        partners: [...partners.values()]
            .sort((a, b) => b.count - a.count || a.id - b.id)
            .slice(0, partnerLimit)
            // The name it was most often entered as (Urshifu-Rapid-Strike, not
            // Urshifu), so the chip says what was actually played.
            .map(({ id: partnerId, count, names }) => ({
                id: partnerId,
                count,
                name: [...names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || `#${partnerId}`,
            })),
    };
}

/** Share of teams, as a whole percentage (never 0 for a Pokémon that appears). */
export const presenceShare = (presence) => (presence?.total
    ? Math.max(1, Math.round((presence.count / presence.total) * 100))
    : 0);
