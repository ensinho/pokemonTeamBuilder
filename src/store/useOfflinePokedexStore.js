import { create } from 'zustand';
import {
    clearOfflinePokedex,
    downloadOfflinePokedex,
    isOfflinePokedexSupported,
    readOfflinePokedexState,
    writeOfflinePokedexState,
} from '../services/offlinePokedexDownload';
import { isBrowserOffline } from '../utils/firestoreWrite';

// The background download that puts the whole Pokédex on this device. On by
// default (the app is meant to be usable without a connection); the Profile
// switch turns it off and frees the space.
//
// status: 'idle' | 'downloading' | 'paused' | 'ready' | 'saver' | 'unsupported' | 'error'

// Progress arrives per file (~5000 of them); the store only needs to move
// often enough to read as live.
const PROGRESS_INTERVAL_MS = 400;

let controller = null;

const dataSaverOn = () => typeof navigator !== 'undefined' && navigator.connection?.saveData === true;

const initialState = readOfflinePokedexState();

export const useOfflinePokedexStore = create((set, get) => ({
    enabled: initialState.enabled !== false,
    // A pack finished on an earlier visit is on the device now — say so at once,
    // including offline, where no sync will run to find out. A newer deploy's
    // pack downloads beside it; this one keeps serving until then.
    status: initialState.enabled !== false && initialState.complete ? 'ready' : 'idle',
    done: 0,
    total: 0,
    error: null,

    // Safe to call any time: it no-ops unless there is something to do.
    sync: async () => {
        const { enabled, status } = get();
        if (!enabled || controller) return; // one run at a time — `controller` is set for its whole life
        if (!isOfflinePokedexSupported()) { set({ status: 'unsupported' }); return; }
        if (isBrowserOffline()) {
            if (get().status !== 'ready') set({ status: 'paused' });
            return;
        }
        if (dataSaverOn()) { set({ status: 'saver' }); return; }

        controller = new AbortController();
        const { signal } = controller;
        // An up-to-date pack resolves on the first check, so "downloading" is
        // only shown once there is actually something to fetch.
        const wasReady = status === 'ready';
        if (!wasReady) set({ status: 'downloading', error: null });

        let lastPush = 0;
        try {
            const result = await downloadOfflinePokedex({
                signal,
                onProgress: ({ done, total }) => {
                    const now = Date.now();
                    if (done === total || now - lastPush >= PROGRESS_INTERVAL_MS) {
                        lastPush = now;
                        set({ done, total });
                    }
                },
            });
            if (result.aborted) return;
            // Every data file landed: the Pokédex works offline. A sprite that
            // failed falls back to the pixel one and is retried next run.
            set(result.failedData === 0
                ? { status: 'ready', done: result.total, total: result.total }
                : { status: 'error', error: 'failed' });
        } catch (error) {
            if (signal.aborted) return;
            set({ status: 'error', error: error?.name === 'QuotaExceededError' ? 'quota' : 'failed' });
        } finally {
            if (controller?.signal === signal) controller = null;
        }
    },

    pause: () => {
        if (!controller) return;
        controller.abort();
        controller = null;
        // A pack already on the device keeps working while its update waits.
        set((state) => (state.status === 'ready' ? {} : { status: 'paused' }));
    },

    // Called from the Profile switch — a click, which is also the only moment
    // Firefox lets `storage.persist()` prompt.
    setEnabled: async (enabled) => {
        writeOfflinePokedexState({ enabled });
        set({ enabled });
        if (enabled) {
            navigator.storage?.persist?.().catch(() => {});
            await get().sync();
            return;
        }
        get().pause();
        set({ status: 'idle', done: 0, total: 0, error: null });
        await clearOfflinePokedex();
    },
}));
