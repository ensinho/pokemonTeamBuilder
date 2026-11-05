import { TYPE_MATCH_ALL, TYPE_MATCH_ANY } from './typeFilter';

// The Pokédex filters as query-string parameters
// (`?q=&gen=&game=&types=&match=&fav=`). The filters themselves live in
// usePokedexStore (the Builder and the detail screen read it); PokedexView
// mirrors them to the URL with these helpers so Back, a refresh and a shared
// link reopen the same list. Every value is a canonical string, so two filter
// sets compare with ===.

export const POKEDEX_FILTER_PARAMS = ['q', 'gen', 'game', 'types', 'match', 'fav'];

export const DEFAULT_POKEDEX_FILTERS = Object.freeze({
    q: '', gen: 'all', game: 'all', types: '', match: TYPE_MATCH_ANY, fav: '',
});

export const filtersFromStore = (state) => ({
    q: state.pokedexSearchInput || '',
    gen: state.pokedexSelectedGeneration || 'all',
    game: state.pokedexSelectedGame || 'all',
    types: Array.from(state.pokedexSelectedTypes || []).sort().join(','),
    match: state.pokedexTypeMatchMode === TYPE_MATCH_ALL ? TYPE_MATCH_ALL : TYPE_MATCH_ANY,
    fav: state.pokedexShowOnlyFavorites ? '1' : '',
});

/** `knownTypes` (optional) drops names that are not real types, so a
 *  hand-edited `?types=fire,banana` filters by Fire alone. */
export const filtersFromParams = (params, knownTypes = null) => ({
    q: params.get('q') || '',
    gen: params.get('gen') || 'all',
    game: params.get('game') || 'all',
    types: (params.get('types') || '')
        .split(',')
        .filter((type) => type && (!knownTypes || knownTypes.has(type)))
        .sort()
        .join(','),
    match: params.get('match') === TYPE_MATCH_ALL ? TYPE_MATCH_ALL : TYPE_MATCH_ANY,
    fav: params.get('fav') === '1' ? '1' : '',
});

export const hasPokedexFilterParams = (params) => POKEDEX_FILTER_PARAMS.some((key) => params.has(key));

/** Writes `filters` into `params` in place; a default value removes its param. */
export const writeFilterParams = (params, filters) => {
    for (const key of POKEDEX_FILTER_PARAMS) {
        if (filters[key] === DEFAULT_POKEDEX_FILTERS[key]) params.delete(key);
        else params.set(key, filters[key]);
    }
};

/** The store patch that turns `state` into `filters` — only the fields that
 *  differ, so an unchanged Set keeps its identity and nothing refetches. */
export const storePatchForFilters = (state, filters) => {
    const current = filtersFromStore(state);
    const patch = {};
    if (filters.q !== current.q) patch.pokedexSearchInput = filters.q;
    if (filters.gen !== current.gen) patch.pokedexSelectedGeneration = filters.gen;
    if (filters.game !== current.game) patch.pokedexSelectedGame = filters.game;
    if (filters.types !== current.types) patch.pokedexSelectedTypes = new Set(filters.types ? filters.types.split(',') : []);
    if (filters.match !== current.match) patch.pokedexTypeMatchMode = filters.match;
    if (filters.fav !== current.fav) patch.pokedexShowOnlyFavorites = filters.fav === '1';
    return patch;
};
