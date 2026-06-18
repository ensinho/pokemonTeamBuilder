import { doc, getDoc } from 'firebase/firestore';
import { POKEAPI_BASE_URL } from '../constants/firebase';
import { db } from './firebase';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';

// Bump this version whenever the SHAPE of cached data changes (e.g. adding `types`
// to pokemon-index.json). It invalidates all stale entries from older versions so
// users never get a broken UI from a long-TTL cache of the old format.
const CACHE_VERSION = 'v2';
const CACHE_PREFIX = `ptb:pokemon-data:${CACHE_VERSION}:`;
const REFERENCE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const memoryCache = new Map();
const pendingRequests = new Map();

// One-time sweep of cache entries from previous CACHE_VERSIONs so they don't
// linger in users' storage after a format change.
const purgeStaleCacheVersions = () => {
    if (typeof window === 'undefined') return;
    for (const storageName of ['local', 'session']) {
        try {
            const storage = storageName === 'local' ? window.localStorage : window.sessionStorage;
            const stale = [];
            for (let i = 0; i < storage.length; i += 1) {
                const key = storage.key(i);
                if (!key || !key.startsWith('ptb:pokemon-data:')) continue;
                // Drop entries from previous CACHE_VERSIONs, and any previously-persisted
                // large index (now memory-only) that may still be hogging quota.
                if (!key.startsWith(CACHE_PREFIX) || key.endsWith(':static:pokemon-index.json')) {
                    stale.push(key);
                }
            }
            stale.forEach((key) => storage.removeItem(key));
        } catch (_) {
            // Storage unavailable (private mode / quota) — safe to skip.
        }
    }
};
purgeStaleCacheVersions();

const getBasePath = () => {
    const base = import.meta.env.BASE_URL || '/';
    return base.endsWith('/') ? base : `${base}/`;
};

const getStaticDataUrl = (path) => `${getBasePath()}data/${String(path).replace(/^\/+/, '')}`;

const getStorage = (storage) => {
    if (typeof window === 'undefined') return null;
    if (storage === 'none') return null; // memory-only: never touch Web Storage
    try {
        return storage === 'local' ? window.localStorage : window.sessionStorage;
    } catch (_) {
        return null;
    }
};

const readStored = (key, storageName) => {
    const storage = getStorage(storageName);
    if (!storage) return undefined;

    try {
        const raw = storage.getItem(CACHE_PREFIX + key);
        if (!raw) return undefined;
        const entry = JSON.parse(raw);
        if (!entry || entry.expiresAt <= Date.now()) {
            storage.removeItem(CACHE_PREFIX + key);
            return undefined;
        }
        return entry.value;
    } catch (_) {
        return undefined;
    }
};

const writeStored = (key, value, storageName, ttlMs) => {
    if (value == null) return;
    const storage = getStorage(storageName);
    if (!storage) return;

    try {
        storage.setItem(CACHE_PREFIX + key, JSON.stringify({
            value,
            expiresAt: Date.now() + ttlMs,
        }));
    } catch (_) {
        // Storage can be full or unavailable. Memory cache still covers this session.
    }
};

const fetchJsonCached = async (url, {
    cacheKey = url,
    ttlMs = SESSION_TTL_MS,
    storage = 'session',
    allow404 = false,
    fetchOptions = {},
} = {}) => {
    if (memoryCache.has(cacheKey)) {
        return memoryCache.get(cacheKey);
    }

    const stored = readStored(cacheKey, storage);
    if (stored !== undefined) {
        memoryCache.set(cacheKey, stored);
        return stored;
    }

    if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey);
    }

    const request = fetch(url, {
        cache: 'force-cache',
        ...fetchOptions,
    }).then(async (response) => {
        if (!response.ok) {
            if (response.status === 404 && allow404) {
                return null;
            }
            throw new Error(`Request failed with ${response.status}: ${url}`);
        }
        return response.json();
    }).then((data) => {
        if (data != null) {
            memoryCache.set(cacheKey, data);
            writeStored(cacheKey, data, storage, ttlMs);
        }
        return data;
    }).finally(() => {
        pendingRequests.delete(cacheKey);
    });

    pendingRequests.set(cacheKey, request);
    return request;
};

const toPokeApiUrl = (pathOrUrl) => {
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const path = String(pathOrUrl).replace(/^\/+/, '');
    return `${POKEAPI_BASE_URL.replace(/\/+$/, '')}/${path}`;
};

const getNamedResourceName = (resource, fallbackUrl = '') => {
    if (typeof resource === 'string') return resource;
    if (resource?.name) return resource.name;
    return String(fallbackUrl).split('/').filter(Boolean).pop() || '';
};

const getIdFromResource = (resource) => {
    const value = typeof resource === 'string' ? resource : resource?.url || resource?.id || '';
    const tail = String(value).split('/').filter(Boolean).pop();
    return Number.parseInt(tail, 10);
};

const normalizeResourceList = (data, key) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.results)) return data.results;
    return [];
};

const fetchStaticJson = (path) => fetchJsonCached(getStaticDataUrl(path), {
    cacheKey: `static:${path}`,
    ttlMs: REFERENCE_TTL_MS,
    storage: 'local',
    allow404: true,
});

// Large static files (e.g. the 1025-entry pokemon-index, ~200KB) must NOT go into
// localStorage — they'd eat the ~5MB quota and break other features' setItem calls
// (this caused a PokePuzzle QuotaExceededError). They're already cached by the
// browser/PWA service worker over HTTP, so the in-memory cache is enough per session.
const fetchLargeStaticJson = (path) => fetchJsonCached(getStaticDataUrl(path), {
    cacheKey: `static:${path}`,
    storage: 'none',
    allow404: true,
});

const stripDiacritics = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const normalizePokemonQuizInput = (value = '') => stripDiacritics(String(value)
    .toLowerCase()
    .trim())
    .replace(/[♀]/g, ' female ')
    .replace(/[♂]/g, ' male ')
    .replace(/[^a-z0-9]+/g, '');

export const buildPokemonQuizNameAliases = (pokemonName = '') => {
    const normalizedName = normalizePokemonQuizInput(pokemonName);
    const aliases = new Set([normalizedName]);

    const canonicalName = String(pokemonName).toLowerCase();

    if (canonicalName === 'nidoran-f') {
        aliases.add(normalizePokemonQuizInput('nidoran female'));
        aliases.add(normalizePokemonQuizInput('female nidoran'));
    }

    if (canonicalName === 'nidoran-m') {
        aliases.add(normalizePokemonQuizInput('nidoran male'));
        aliases.add(normalizePokemonQuizInput('male nidoran'));
    }

    if (canonicalName === 'farfetchd') {
        aliases.add(normalizePokemonQuizInput("farfetch'd"));
    }

    if (canonicalName === 'sirfetchd') {
        aliases.add(normalizePokemonQuizInput("sirfetch'd"));
    }

    return Array.from(aliases).filter(Boolean);
};

const fetchPokeApiJson = (pathOrUrl, { cacheKey, ttlMs = REFERENCE_TTL_MS, storage = 'local' } = {}) => {
    const url = toPokeApiUrl(pathOrUrl);
    return fetchJsonCached(url, {
        cacheKey: cacheKey || `pokeapi:${url}`,
        ttlMs,
        storage,
    });
};

let staticManifestPromise;
const getStaticManifest = async () => {
    if (!staticManifestPromise) {
        staticManifestPromise = fetchStaticJson('cache-manifest.json').catch(() => null);
    }
    return staticManifestPromise;
};

export const getStaticPokemonDetail = async (pokemonId) => {
    const id = Number.parseInt(pokemonId, 10);
    if (!Number.isInteger(id)) return null;

    const manifest = await getStaticManifest();
    const availableDetails = manifest?.files?.pokemonDetails;
    const hasDetails = availableDetails === 'all'
        || (Array.isArray(availableDetails) && availableDetails.includes(id));

    if (!hasDetails) return null;
    return fetchStaticJson(`pokemon-details/${id}.json`);
};

export const loadPokemonReferenceData = async () => {
    const [staticGenerations, staticItems, staticNatures] = await Promise.all([
        fetchStaticJson('generations.json'),
        fetchStaticJson('items.json'),
        fetchStaticJson('natures.json'),
    ]);

    const [generations, items, natures] = await Promise.all([
        staticGenerations
            ? Promise.resolve(normalizeResourceList(staticGenerations, 'generations').map((entry) => typeof entry === 'string' ? entry : entry.name).filter(Boolean))
            : fetchPokeApiJson('/generation', { cacheKey: 'reference:generation' }).then((data) => normalizeResourceList(data, 'generations').map((entry) => entry.name).filter(Boolean)),
        staticItems
            ? Promise.resolve(normalizeResourceList(staticItems, 'items'))
            : fetchPokeApiJson('/item?limit=2000', { cacheKey: 'reference:items' }).then((data) => normalizeResourceList(data, 'items')),
        staticNatures
            ? Promise.resolve(normalizeResourceList(staticNatures, 'natures'))
            : fetchPokeApiJson('/nature', { cacheKey: 'reference:natures' }).then((data) => normalizeResourceList(data, 'natures')),
    ]);

    return { generations, items, natures };
};

export const loadPokemonIndex = async () => {
    const staticPokemonIndex = await fetchLargeStaticJson('pokemon-index.json');
    return normalizeResourceList(staticPokemonIndex, 'pokemons')
        .map((entry) => {
            const id = Number.parseInt(entry.id, 10);
            return {
                id,
                name: entry.name,
                url: entry.url,
                types: Array.isArray(entry.types) ? entry.types : [],
                generation: entry.generation || null,
                // Sprites are derivable from the id — no need to store them in the index.
                sprite: getPokemonArtworkSpriteUrl(id),
                shinySprite: getPokemonArtworkSpriteUrl(id, { shiny: true }),
                animatedSprite: getPokemonFrontSpriteUrl(id),
                animatedShinySprite: getPokemonFrontSpriteUrl(id, { shiny: true }),
            };
        })
        .filter((entry) => Number.isInteger(entry.id) && entry.id > 0 && entry.name);
};

let staticMoveMapPromise;
const getStaticMoveMap = async () => {
    if (!staticMoveMapPromise) {
        staticMoveMapPromise = fetchStaticJson('moves.json').then((data) => {
            const moves = normalizeResourceList(data, 'moves');
            if (!moves.length) return null;
            return new Map(moves.map((move) => [move.name, move]));
        }).catch(() => null);
    }
    return staticMoveMapPromise;
};

export const getMoveDetails = async (moveUrl, moveName) => {
    const name = getNamedResourceName(moveName, moveUrl);
    if (!name) return null;

    const staticMoves = await getStaticMoveMap();
    const staticMove = staticMoves?.get(name);
    if (staticMove?.type) return staticMove;

    const data = await fetchPokeApiJson(moveUrl || `/move/${name}`, {
        cacheKey: `move:${name}`,
        ttlMs: REFERENCE_TTL_MS,
        storage: 'local',
    });

    return {
        name: data.name,
        type: data.type?.name,
        power: data.power,
        accuracy: data.accuracy,
        pp: data.pp,
        damage_class: data.damage_class?.name,
        machines: data.machines || [],
    };
};

export const getMachineDetails = async (machineUrl) => {
    return fetchPokeApiJson(machineUrl, {
        cacheKey: `machine:${getIdFromResource(machineUrl) || machineUrl}`,
        ttlMs: REFERENCE_TTL_MS,
        storage: 'local',
    });
};

export const getAbilityDescription = async (ability) => {
    const name = getNamedResourceName(ability, ability?.url);
    if (!name) return 'No description available.';

    const data = await fetchPokeApiJson(ability?.url || `/ability/${name}`, {
        cacheKey: `ability:${name}`,
        ttlMs: REFERENCE_TTL_MS,
        storage: 'local',
    });
    const effectEntry = data.effect_entries?.find((entry) => entry.language?.name === 'en');
    return effectEntry?.short_effect || 'No description available.';
};

export const getEvolutionChainData = (evolutionChainUrl) => fetchPokeApiJson(evolutionChainUrl, {
    cacheKey: `evolution-chain:${getIdFromResource(evolutionChainUrl) || evolutionChainUrl}`,
    ttlMs: REFERENCE_TTL_MS,
    storage: 'local',
});

export const getPokemonApiData = (pokemonIdOrUrl) => fetchPokeApiJson(
    /^https?:\/\//i.test(String(pokemonIdOrUrl)) ? pokemonIdOrUrl : `/pokemon/${pokemonIdOrUrl}`,
    {
        cacheKey: `pokemon:${getIdFromResource(pokemonIdOrUrl) || pokemonIdOrUrl}`,
        ttlMs: SESSION_TTL_MS,
        storage: 'session',
    }
);

export const getPokemonSpeciesData = (pokemonIdOrUrl) => fetchPokeApiJson(
    /^https?:\/\//i.test(String(pokemonIdOrUrl)) ? pokemonIdOrUrl : `/pokemon-species/${pokemonIdOrUrl}`,
    {
        cacheKey: `pokemon-species:${getIdFromResource(pokemonIdOrUrl) || pokemonIdOrUrl}`,
        ttlMs: REFERENCE_TTL_MS,
        storage: 'local',
    }
);

export const getPokemonEncountersData = (pokemonId) => fetchPokeApiJson(
    `/pokemon/${pokemonId}/encounters`,
    {
        cacheKey: `pokemon-encounters:${pokemonId}`,
        ttlMs: REFERENCE_TTL_MS,
        storage: 'local',
    }
);

// Normalize a raw PokéAPI `/pokemon` response into the "fat" shape the Team Builder
// and editor modal expect (abilities[].name, moves[].name, types[], stats[]).
const normalizePokemonApiData = (apiData) => ({
    id: apiData.id,
    name: apiData.name,
    types: apiData.types?.map((t) => t.type?.name).filter(Boolean) || [],
    abilities: apiData.abilities?.map((a) => ({
        name: a.ability?.name,
        url: a.ability?.url,
        is_hidden: a.is_hidden,
    })).filter((a) => a.name) || [],
    moves: apiData.moves?.map((m) => ({ name: m.move?.name, url: m.move?.url })).filter((m) => m.name) || [],
    stats: apiData.stats?.map((s) => ({ name: s.stat?.name, base_stat: s.base_stat })).filter((s) => s.name) || [],
    sprite: apiData.sprites?.other?.['official-artwork']?.front_default || apiData.sprites?.front_default || null,
});

/**
 * Resolve a Pokémon's full detail (abilities, moves, stats, types) by id.
 *
 * The Pokédex/Team Builder lists now carry only lightweight index data
 * (id/name/types/sprite). When an action needs the full record — e.g. adding a
 * Pokémon to a team — call this to lazily fetch it through the same cascade the
 * detail panel uses: in-memory/static detail → live PokéAPI. Result is cached.
 *
 * @param {number|string} pokemonId
 * @returns {Promise<object|null>} a fat pokémon object, or null if unresolvable
 */
export const resolvePokemonDetail = async (pokemonId) => {
    const id = Number.parseInt(pokemonId, 10);
    if (!Number.isInteger(id) || id <= 0) return null;

    // 1) Firestore mirror (already-baked fat doc) — same source the detail panel prefers.
    if (db) {
        try {
            const snap = await getDoc(doc(db, 'artifacts/pokemonTeamBuilder/pokemons', String(id)));
            if (snap.exists()) {
                const data = snap.data();
                if (data?.abilities?.length) return data;
            }
        } catch (_) {
            // Permission/network issue — fall through to static/PokéAPI.
        }
    }

    // 2) Pre-baked static detail file (if generated).
    const staticDetail = await getStaticPokemonDetail(id);
    if (staticDetail?.abilities?.length) return staticDetail;

    // 3) Live PokéAPI, normalized to the fat shape.
    const apiData = await getPokemonApiData(id);
    if (apiData) return normalizePokemonApiData(apiData);

    return null;
};