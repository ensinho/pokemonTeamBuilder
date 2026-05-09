import { POKEAPI_BASE_URL } from '../constants/firebase';

const CACHE_PREFIX = 'ptb:pokemon-data:v1:';
const REFERENCE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const memoryCache = new Map();
const pendingRequests = new Map();

const getBasePath = () => {
    const base = import.meta.env.BASE_URL || '/';
    return base.endsWith('/') ? base : `${base}/`;
};

const getStaticDataUrl = (path) => `${getBasePath()}data/${String(path).replace(/^\/+/, '')}`;

const getStorage = (storage) => {
    if (typeof window === 'undefined') return null;
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
    };
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