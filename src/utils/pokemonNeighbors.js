// Which Pokémon sits either side of the one on screen — the data behind the
// mobile detail screen's swipe carousel.
//
// The sequence that matters is the list the user was actually browsing: after
// filtering the Pokédex to Water/Gen III, "next" must be the next *result*, not
// the next national id. PokedexView hands that order to usePokedexStore when a
// card is opened; anything else (a deep link, a form reached from an evolution
// chain, arriving from Meta) falls back to national order.

const idOf = (entry) => Number(entry?.id);

/**
 * Pick the list to walk: the browsed sequence when it actually contains the
 * current Pokémon, otherwise the full index. A stale sequence (yesterday's
 * filters, or a form that was never in the list) must not decide what "next"
 * means — it would skip the user somewhere they never were.
 */
export function resolveBrowseList(sequence, currentId, fallback = []) {
    const id = Number(currentId);
    if (Array.isArray(sequence) && sequence.some((p) => idOf(p) === id)) return sequence;
    return Array.isArray(fallback) ? fallback : [];
}

/**
 * `{ prev, next }` for `currentId` — light index entries ({ id, name, types }),
 * or null at either end. Deliberately does **not** wrap around: a carousel that
 * loops from #1025 back to #1 makes "have I reached the end?" unanswerable, and
 * the swipe rubber-bands instead, which says the same thing without a surprise.
 */
export function getPokemonNeighbors(sequence, currentId, fallback = []) {
    const id = Number(currentId);
    if (!Number.isFinite(id)) return { prev: null, next: null };

    const list = resolveBrowseList(sequence, id, fallback);
    const index = list.findIndex((p) => idOf(p) === id);
    if (index === -1) return { prev: null, next: null };

    return {
        prev: list[index - 1] || null,
        next: list[index + 1] || null,
    };
}
