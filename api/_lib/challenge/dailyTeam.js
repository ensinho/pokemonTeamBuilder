import { Dex, Teams } from '@pkmn/sim';

import { generateRandomTeam } from '../randomTeams.js';
import { LEVEL } from './constants.js';
import { hashSeed } from './seed.js';

/**
 * The Time do dia: a rental team, the same for every player on the same day
 * (decision 2026-10-14), rolled by Showdown's own random-battle generator and
 * levelled to 50 like everything else in the challenge. It is the player's
 * team, so it is shown open — moves, item, ability — and it is the "fair"
 * board of the future daily ranking, since nobody can bring a stronger one.
 */

const cache = new Map();

/** @returns {{showdownText: string, members: Array<{species, dexNum, item, ability, moves: string[]}>}} */
export const dailyTeamFor = (dayKey) => {
    if (cache.has(dayKey)) return cache.get(dayKey);
    const { showdownText } = generateRandomTeam({ seed: hashSeed('daily-team', dayKey) });
    const sets = Teams.import(showdownText);
    for (const set of sets) set.level = LEVEL;
    const result = {
        showdownText: Teams.export(sets).trim(),
        // Display names: the random-battle generator exports ids ("hypervoice"),
        // and this is what the team picker shows.
        members: sets.map((set) => ({
            species: Dex.species.get(set.species).name || set.species,
            dexNum: Dex.species.get(set.species).num,
            item: set.item ? Dex.items.get(set.item).name || set.item : '',
            ability: set.ability ? Dex.abilities.get(set.ability).name || set.ability : '',
            moves: set.moves.map((move) => Dex.moves.get(move).name || move),
        })),
    };
    if (cache.size > 16) cache.clear();
    cache.set(dayKey, result);
    return result;
};
