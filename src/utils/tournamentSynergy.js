// Mines partner relationships from real tournament teams: which Pokémon tend to
// be built together. Powers the Team Builder's "tournament partners" suggestions.

/**
 * Build a co-occurrence model from tournament teams.
 * @param {Array} teams - [{ pokemons: [{ id }] }]
 * @returns {{ co: Map<number, Map<number, number>>, usage: Map<number, number> }}
 */
export function buildCoOccurrence(teams = []) {
    const co = new Map();
    const usage = new Map();

    for (const team of teams) {
        const ids = [...new Set((team.pokemons || []).map((p) => p.id).filter(Boolean))];
        for (const id of ids) usage.set(id, (usage.get(id) || 0) + 1);
        for (let i = 0; i < ids.length; i += 1) {
            for (let j = 0; j < ids.length; j += 1) {
                if (i === j) continue;
                const a = ids[i];
                const b = ids[j];
                if (!co.has(a)) co.set(a, new Map());
                const partners = co.get(a);
                partners.set(b, (partners.get(b) || 0) + 1);
            }
        }
    }

    return { co, usage };
}

/**
 * Suggest partner Pokémon for a team, biased toward the most recently added one.
 *
 * Scores every candidate by how often it appears alongside the current team
 * across tournament teams; the last-added Pokémon counts extra so suggestions
 * "follow" it. With an empty team, falls back to the most-used Pokémon overall.
 *
 * @returns {Array<{ id: number, score: number }>}
 */
export function suggestPartners(model, teamIds = [], lastId = null, limit = 12) {
    const { co, usage } = model || {};
    if (!co || !usage) return [];

    const team = new Set(teamIds.filter(Boolean));
    const scores = new Map();

    const accumulate = (anchorId, weight) => {
        const partners = co.get(anchorId);
        if (!partners) return;
        for (const [partner, count] of partners) {
            if (team.has(partner)) continue;
            scores.set(partner, (scores.get(partner) || 0) + count * weight);
        }
    };

    for (const id of team) accumulate(id, id === lastId ? 2.5 : 1);
    if (lastId && !team.has(lastId)) accumulate(lastId, 2.5);

    let ranked = [...scores.entries()]
        .sort((a, b) => b[1] - a[1] || (usage.get(b[0]) || 0) - (usage.get(a[0]) || 0));

    // No anchors yet (empty team) → seed with the meta's most-used Pokémon.
    if (ranked.length === 0) {
        ranked = [...usage.entries()]
            .filter(([id]) => !team.has(id))
            .sort((a, b) => b[1] - a[1]);
    }

    return ranked.slice(0, limit).map(([id, score]) => ({ id, score }));
}
