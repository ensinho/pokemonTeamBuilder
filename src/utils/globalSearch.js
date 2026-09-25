/**
 * The global search's matching and ranking (CommandPalette). Pure, so the rules
 * that decide what "charizard" or "25" returns are tested rather than eyeballed.
 *
 * Everything local: the Pokémon index, the move/ability/item lists and the
 * app's own destinations are already in memory, so a keystroke is a scan of a
 * few thousand pre-normalised strings, never a request.
 */

/** Lowercase, no diacritics, anything that is not a letter or digit becomes one
 *  space — so `mr-mime`, `Mr. Mime` and `mr mime` are the same string, and
 *  `Pokédex` matches `pokedex`. */
export function normalizeSearchText(text) {
    return String(text ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/**
 * How well a (normalised) name answers a (normalised) query; 0 is no match.
 * The order is what a person expects from a search box: the exact name, then
 * names that start with what was typed — fewer extra words first, so a form
 * (`charizard mega x`) ranks under its species while `charmander`, `charmeleon`
 * and `charizard` tie and keep dex order — then a word that starts with it
 * (`mega`), then every typed word starting some word (`mr mi`), then a plain
 * substring, then the same ignoring spaces (`mrmime`).
 */
export function scoreMatch(name, query) {
    if (!name || !query) return 0;
    if (name === query) return 100;
    const words = name.split(' ');
    if (name.startsWith(query)) {
        const extraWords = Math.max(0, words.length - query.split(' ').length);
        return 90 - Math.min(4, extraWords) * 5;
    }
    if (words.some((word) => word.startsWith(query))) return 60;
    const queryWords = query.split(' ');
    if (queryWords.length > 1 && queryWords.every((q) => words.some((word) => word.startsWith(q)))) return 55;
    if (name.includes(query)) return 40;
    if (name.replace(/ /g, '').includes(query.replace(/ /g, ''))) return 30;
    return 0;
}

/** Wraps a list for searching: each entry's name is normalised once, when the
 *  list arrives, not on every keystroke. `aliases` are extra names that may
 *  match (a destination's route, so "damage" finds "Calculadora de Dano"). */
export function prepareEntries(items, getName, getAliases) {
    return (items || []).map((item) => ({
        item,
        names: [getName(item), ...(getAliases ? getAliases(item) : [])]
            .map(normalizeSearchText)
            .filter(Boolean),
    }));
}

/** A Pokémon answers its dex number too: `25` and `#025` both find Pikachu. */
export function scoreDexNumber(id, query) {
    if (!/^\d+$/.test(query)) return 0;
    const typed = query.replace(/^0+(?=\d)/, '');
    const dex = String(id);
    if (dex === typed) return 100;
    return dex.startsWith(typed) ? 50 : 0;
}

/**
 * Searches every group and returns the ones with results, strongest first: a
 * group whose best hit is an exact name outranks one that only has a prefix
 * ("meta" puts the Meta page above Metang), and ties keep the given order.
 * `boost` tilts that order toward what this app is for — in a Pokémon app,
 * "char" should lead with Charmander, not the move Charm.
 * Each group: { key, entries (from prepareEntries), limit, boost?, extraScore?, tiebreak? }.
 * `extraScore(item, query)` adds another way to match (the dex number);
 * `tiebreak(a, b)` orders equal scores (dex order for Pokémon).
 */
export function searchGroups(query, groups) {
    const q = normalizeSearchText(query);
    if (!q) return [];
    return groups
        .map((group) => {
            const scored = [];
            for (const entry of group.entries || []) {
                let score = 0;
                for (const name of entry.names) score = Math.max(score, scoreMatch(name, q));
                if (group.extraScore) score = Math.max(score, group.extraScore(entry.item, q));
                if (score > 0) scored.push({ item: entry.item, score });
            }
            scored.sort((a, b) => (b.score - a.score) || (group.tiebreak ? group.tiebreak(a.item, b.item) : 0));
            return {
                key: group.key,
                best: scored.length ? scored[0].score + (group.boost || 0) : 0,
                results: scored.slice(0, group.limit ?? 5).map((r) => r.item),
            };
        })
        .filter((group) => group.results.length > 0)
        .map((group, index) => ({ group, index }))
        .sort((a, b) => (b.group.best - a.group.best) || (a.index - b.index))
        .map(({ group }) => group);
}
