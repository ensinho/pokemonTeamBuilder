/**
 * A gym leader's roster as a team the builder can open (`importTeam`).
 *
 * "Use team" used to add the leader's Pokémon one by one to whatever was in the
 * builder and stay on the Gyms page: nothing visible happened, a builder that
 * already held a team got a mix of the two (or a "team is full" toast), and the
 * moves, items, abilities and levels the page had just shown were dropped.
 *
 * Members go out in the *stored* shape (a `customization` object), not as
 * Showdown sets: a gym names a form by its display name ("Hisuian Sneasel"),
 * which is not a species Showdown knows, so nothing here may become a
 * `showdownName`. The id is the index entry's own, so a form keeps its types.
 *
 * Pure: `resolve` is the page's name → index entry lookup.
 */

import { toSlug } from './teamImport';

/** The Pokémon a leader actually brings: the fixed ones, then `poolPick` of the random pool. */
export const gymRoster = (leader) => {
    const team = Array.isArray(leader?.team) ? leader.team : [];
    const roster = leader?.poolPick
        ? [...team.filter((mon) => !mon.pool), ...team.filter((mon) => mon.pool).slice(0, leader.poolPick)]
        : team;
    return roster.slice(0, 6);
};

/**
 * @param {object}   leader          a leader from gym-leaders.json
 * @param {Function} resolve         name → Pokémon index entry, or null
 * @param {{ gameLabel?: string }} [options]
 * @returns {{ name: string, pokemons: Array }} `pokemons` is empty when nothing resolved
 */
export const gymTeamForImport = (leader, resolve, { gameLabel = '' } = {}) => {
    const pokemons = [];
    for (const mon of gymRoster(leader)) {
        const entry = resolve?.(mon?.name);
        if (!entry?.id) continue;
        const moves = (Array.isArray(mon.moves) ? mon.moves : [])
            .map((move) => toSlug(typeof move === 'string' ? move : move?.name))
            .filter(Boolean);
        const level = Number(mon.level);
        const customization = { moves: [...new Set(moves)].slice(0, 4) };
        if (mon.item) customization.item = toSlug(mon.item);
        if (mon.ability) customization.ability = toSlug(mon.ability);
        if (Number.isInteger(level) && level > 0 && level <= 100) customization.level = level;
        pokemons.push({ id: entry.id, name: entry.name, types: entry.types, customization });
    }
    const leaderName = String(leader?.name || '').trim();
    return {
        name: [leaderName, gameLabel].filter(Boolean).join(' · '),
        pokemons,
    };
};
