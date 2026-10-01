import { planPokedexDownload } from '../utils/offlinePokedex';

// Downloads the whole Pokédex to this device — public/data/pokedex/ plus the
// sprites the Pokédex shows by default — so it works offline for Pokémon the
// user never opened online. Runs in the page, in the background, resumable:
// anything already cached is skipped, so an interrupted download picks up where
// it stopped on the next run.
//
// Where things go, and why:
//  • data files → `offline-pokedex-<version>`. The data service reads them with
//    `caches.match`, so a new pack downloads beside the old one (which keeps
//    serving) and the old cache is dropped only once the new one is complete.
//  • sprites → `pokemon-sprites`, the cache the service worker's sprite route
//    already serves <img> requests from (vite.config.js). A second cache would
//    be invisible to that route.
//
// The manifest is precached (vite.config.js), so it always describes the pack
// this deploy shipped.

const DATA_CACHE_PREFIX = 'offline-pokedex-';
const SPRITE_CACHE = 'pokemon-sprites';
const STATE_KEY = 'ptbOfflinePokedex';
const CONCURRENCY = 2;
// A sprite host that answers 403/429 is rate limiting this device. The run
// backs off instead of pressing on: hammering it is what got every <img> on
// the page refused too. Whatever was left is picked up on the next run.
const THROTTLED = new Set([403, 429]);
const BACKOFF_MS = [2000, 8000, 30000];
const sleep = (ms, signal) => new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
});

const basePath = () => {
    const base = import.meta.env.BASE_URL || '/';
    return base.endsWith('/') ? base : `${base}/`;
};

/** The URL a pack file is stored and read under — no cache-buster, on purpose. */
export const pokedexDataUrl = (name) => `${basePath()}data/pokedex/${name}`;

/** Needs the Cache API and a controlling service worker (it serves the sprites). */
export const isOfflinePokedexSupported = () =>
    typeof window !== 'undefined'
    && 'caches' in window
    && Boolean(navigator.serviceWorker?.controller);

export function readOfflinePokedexState() {
    try {
        return JSON.parse(localStorage.getItem(STATE_KEY)) || {};
    } catch (_) {
        return {};
    }
}

export function writeOfflinePokedexState(patch) {
    const next = { ...readOfflinePokedexState(), ...patch };
    try {
        localStorage.setItem(STATE_KEY, JSON.stringify(next));
    } catch (_) {
        // Best effort — without it the next run re-checks the caches, which is correct, just slower.
    }
    return next;
}

const fetchManifest = async () => {
    const response = await fetch(pokedexDataUrl('manifest.json'));
    if (!response.ok) throw new Error(`Pokédex manifest: ${response.status}`);
    return response.json();
};

const dropOtherDataCaches = async (keep) => {
    const names = await caches.keys();
    await Promise.all(names
        .filter((name) => name.startsWith(DATA_CACHE_PREFIX) && name !== keep)
        .map((name) => caches.delete(name)));
};

/**
 * Download whatever of the current pack isn't cached yet.
 * Resolves `{ complete, failedData, failedSprites, total }`, or
 * `{ aborted: true }` when `signal` fires. Rejects on a storage-quota error —
 * retrying cannot fix that. A file that fails is retried once at the end of the
 * run; anything still missing is retried on the next run (`complete: false`).
 */
export async function downloadOfflinePokedex({ onProgress = () => {}, signal } = {}) {
    const manifest = await fetchManifest();
    const version = String(manifest.version || '');
    const tasks = planPokedexDownload(manifest, pokedexDataUrl);
    const state = readOfflinePokedexState();

    if (state.version === version && state.complete) {
        onProgress({ done: tasks.length, total: tasks.length });
        return { complete: true, failedData: 0, failedSprites: 0, total: tasks.length };
    }
    writeOfflinePokedexState({ version, complete: false });

    const dataCacheName = `${DATA_CACHE_PREFIX}${version}`;
    const [dataCache, spriteCache] = await Promise.all([caches.open(dataCacheName), caches.open(SPRITE_CACHE)]);

    let done = 0;
    let quotaError = null;
    let throttles = 0;
    let throttledOut = false;

    // One pass over `queue`; returns the tasks that failed.
    const runPass = async (queue, countProgress) => {
        const failures = [];
        let next = 0;
        const worker = async () => {
            while (next < queue.length && !signal?.aborted && !quotaError && !throttledOut) {
                const task = queue[next];
                next += 1;
                const cache = task.kind === 'data' ? dataCache : spriteCache;
                try {
                    if (!(await cache.match(task.url))) {
                        const response = await fetch(task.url, { mode: 'cors', signal });
                        // 404: the sprite repo lacks that file (some forms). Nothing to cache, nothing to retry.
                        if (response.ok) await cache.put(task.url, response);
                        else if (THROTTLED.has(response.status)) {
                            failures.push(task);
                            if (throttles >= BACKOFF_MS.length) { throttledOut = true; return; }
                            await sleep(BACKOFF_MS[throttles], signal);
                            throttles += 1;
                        } else if (response.status !== 404) failures.push(task);
                    }
                } catch (error) {
                    if (signal?.aborted) return;
                    if (error?.name === 'QuotaExceededError') {
                        quotaError = error;
                        return;
                    }
                    failures.push(task);
                }
                if (countProgress) {
                    done += 1;
                    onProgress({ done, total: tasks.length });
                }
            }
        };
        await Promise.all(Array.from({ length: CONCURRENCY }, worker));
        return failures;
    };

    let failures = await runPass(tasks, true);
    if (failures.length && !signal?.aborted && !quotaError && !throttledOut) failures = await runPass(failures, false);
    if (quotaError) throw quotaError;
    if (signal?.aborted) return { aborted: true };

    const failedData = failures.filter((task) => task.kind === 'data').length;
    // Stopped for rate limiting: the rest is still owed, not failed.
    const complete = failures.length === 0 && !throttledOut;
    writeOfflinePokedexState({ version, complete });
    // The old pack is only dropped once the new one's data is all here.
    if (failedData === 0) await dropOtherDataCaches(dataCacheName);
    return { complete, failedData, failedSprites: failures.length - failedData, total: tasks.length };
}

/** Free the space: every pack data cache, and the pack's sprites. */
export async function clearOfflinePokedex() {
    await dropOtherDataCaches(null);
    try {
        const manifest = await fetchManifest();
        const spriteCache = await caches.open(SPRITE_CACHE);
        await Promise.all(planPokedexDownload(manifest, pokedexDataUrl)
            .filter((task) => task.kind === 'sprite')
            .map((task) => spriteCache.delete(task.url)));
    } catch (_) {
        // No manifest to hand (offline, no worker): the data is gone, which is
        // most of the win; sprites expire through the worker's own limit.
    }
    writeOfflinePokedexState({ version: null, complete: false });
}
