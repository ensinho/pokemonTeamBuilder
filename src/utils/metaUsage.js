// Derivations over the baked tournament teams for the Meta / Usage explorer.
// Everything here is pure so it can be memoized in the view and unit-tested.

// Distinct species per team, preserving a name for display.
function teamSpecies(team) {
    const seen = new Map();
    for (const p of team.pokemons || []) {
        if (!seen.has(p.id)) seen.set(p.id, p.name);
    }
    return seen;
}

/**
 * Rank species by how many teams they appear on (usage). Returns
 * [{ id, name, count, pct }] sorted most-used first. `pct` is the share of
 * teams that ran the species (0–100).
 */
export function rankUsage(teams = []) {
    const counts = new Map();
    const names = new Map();
    for (const team of teams) {
        for (const [id, name] of teamSpecies(team)) {
            counts.set(id, (counts.get(id) || 0) + 1);
            if (!names.has(id)) names.set(id, name);
        }
    }
    const total = teams.length || 1;
    return [...counts.entries()]
        .map(([id, count]) => ({ id, name: names.get(id), count, pct: Math.round((count / total) * 100) }))
        .sort((a, b) => b.count - a.count || a.id - b.id);
}

// All size-combinations of a sorted array (n is tiny — ≤6 — so this is cheap).
function combinations(arr, size) {
    if (size > arr.length) return [];
    const out = [];
    const pick = (start, combo) => {
        if (combo.length === size) { out.push(combo.slice()); return; }
        for (let i = start; i < arr.length; i++) {
            combo.push(arr[i]);
            pick(i + 1, combo);
            combo.pop();
        }
    };
    pick(0, []);
    return out;
}

/**
 * Most common N-Pokémon cores — combinations of species that appear together on
 * the same team most often (more overlap = stronger meta pairing). Returns
 * [{ ids, names, count, pct }] sorted by frequency.
 */
export function commonCores(teams = [], size = 2, limit = 8) {
    const counts = new Map();   // "id-id-…" → count
    const names = new Map();    // id → name
    for (const team of teams) {
        const species = teamSpecies(team);
        for (const [id, name] of species) if (!names.has(id)) names.set(id, name);
        const ids = [...species.keys()].sort((a, b) => a - b);
        for (const combo of combinations(ids, size)) {
            const key = combo.join('-');
            counts.set(key, (counts.get(key) || 0) + 1);
        }
    }
    const total = teams.length || 1;
    return [...counts.entries()]
        .map(([key, count]) => {
            const ids = key.split('-').map(Number);
            return { ids, names: ids.map((id) => names.get(id)), count, pct: Math.round((count / total) * 100) };
        })
        .filter((c) => c.count > 1)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}
