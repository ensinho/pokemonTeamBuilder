// Cached, client-side loader for the baked Smogon set data (public/data/smogon.json).
// Lets non-React code — namely the active-team store — pre-fill a freshly added
// member with the most-used competitive set, mirroring useSmogonData's URL scheme
// (daily cache-buster) but usable outside the React tree. Fetched at most once.

let cache = null;
let inflight = null;

const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const staticUrl = () =>
    `${import.meta.env.BASE_URL || '/'}data/smogon.json`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

// Resolve the full `{ [id]: entry }` map, caching the first successful load and
// falling back to an empty map (never throws) so adds still work offline.
export async function loadSmogonById() {
    if (cache) return cache;
    if (inflight) return inflight;
    inflight = (async () => {
        try {
            const res = await fetch(staticUrl());
            if (res.ok) {
                const data = await res.json();
                if (data?.byId) {
                    cache = data.byId;
                    return cache;
                }
            }
        } catch (_) {
            /* dataset optional — added members simply keep the blank default set */
        }
        cache = {};
        return cache;
    })();
    return inflight;
}

// The single most-relevant recommended set for a species id (or null).
export async function topSmogonSet(id) {
    const byId = await loadSmogonById();
    return byId[id]?.sets?.[0] || null;
}
