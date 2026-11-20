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

const normKey = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const EMPTY = Object.freeze({
    list: [],
    ready: false,
    baseIdOf: () => null,
    entryById: () => null,
    entryByName: () => null,
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
                    const byName = new Map();
                    for (const entry of list) {
                        if (entry.apiName) byName.set(normKey(entry.apiName), entry);
                        if (entry.name) byName.set(normKey(entry.name), entry);
                    }
                    current = {
                        list,
                        ready: true,
                        baseIdOf: buildBaseIdLookup(list),
                        entryById: (id) => byId.get(Number(id)) || null,
                        entryByName: (name) => {
                            const key = normKey(name);
                            if (!key) return null;
                            if (byName.has(key)) return byName.get(key);
                            // Showdown uses "Garchomp-Mega-Z" → "garchompmegaz", while
                            // display names use "Mega Garchomp Z" → "megagarchompz".
                            const megaMatch = String(name || '').match(/^([a-z0-9\s.'’-]+)-mega(?:-([xyz]))?$/i);
                            if (megaMatch) {
                                const alt = normKey(`mega ${megaMatch[1]} ${megaMatch[2] || ''}`);
                                if (byName.has(alt)) return byName.get(alt);
                            }
                            return null;
                        },
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
