// Client-side loader for the baked Smogon set data (public/data/smogon.json),
// usable outside the React tree — namely the active-team store, which pre-fills
// a freshly added member with the most-used competitive set. Shares the one
// request useSmogonData makes (services/staticData.js).

import { loadStaticData } from '../services/staticData';

// The full `{ [id]: entry }` map; an empty map (never throws) when the dataset
// is unavailable, so adds still work offline.
export async function loadSmogonById() {
    try {
        const data = await loadStaticData('smogon.json');
        return data?.byId || {};
    } catch (_) {
        /* dataset optional — added members simply keep the blank default set */
        return {};
    }
}

// The single most-relevant recommended set for a species id (or null).
export async function topSmogonSet(id) {
    const byId = await loadSmogonById();
    return byId[id]?.sets?.[0] || null;
}
