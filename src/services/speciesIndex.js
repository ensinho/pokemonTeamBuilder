import { loadPokemonIndex } from './pokemonDataCache';
import { buildBaseIdLookup } from '../utils/teamUniqueness';

/**
 * The Pokémon index, shaped for the two questions team code keeps asking:
 * "which species is this id?" (Species Clause) and "what is this id called?"
 * (Showdown export). One load, shared by every store that writes a team.
 *
 * `loadPokemonIndex` is already memory-cached by the data service, so this costs
 * no extra request once the builder or the Pokédex has booted.
 */

const EMPTY = Object.freeze({
    list: [],
    ready: false,
    baseIdOf: () => null,
    entryById: () => null,
});

let current = EMPTY;
let pending = null;

/** The index if it has loaded, otherwise an empty stand-in. Never blocks. */
export const getSpeciesIndex = () => current;

/** Resolves once the index is available. Falls back to the stand-in offline. */
export const ensureSpeciesIndex = async () => {
    if (current.ready) return current;
    if (!pending) {
        pending = (async () => {
            try {
                const list = await loadPokemonIndex();
                if (Array.isArray(list) && list.length > 0) {
                    const byId = new Map(list.map((entry) => [entry.id, entry]));
                    current = {
                        list,
                        ready: true,
                        baseIdOf: buildBaseIdLookup(list),
                        entryById: (id) => byId.get(Number(id)) || null,
                    };
                }
            } catch (_) {
                // Offline or unreachable: callers degrade to comparing raw ids.
            } finally {
                pending = null;
            }
            return current;
        })();
    }
    return pending;
};
