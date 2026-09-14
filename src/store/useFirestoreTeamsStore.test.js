import { describe, it, expect, vi, beforeEach } from 'vitest';

// A store test rather than a pure-util one, for the same reason
// api/battle-turn.test.js exists: the bug this guards against was never in any
// calculation. Three components hold these listeners, and the defect was that
// the first of them to unmount unsubscribed for all of them — visible only in
// the handshake between the hook's lifecycle and the store's subscriptions.

// One fake subscription per onSnapshot call: the callback, and whether it is
// still attached. Unsubscribing here really stops delivery, the way Firestore
// does — a teardown that only counts calls would let a detached listener go on
// updating the store and hide the very bug these tests exist for.
const subscriptions = [];

vi.mock('../services/firebase', () => ({ db: {} }));
vi.mock('./useAuthStore', () => ({
    useAuthStore: { getState: () => ({ userId: 'trainer-1' }) },
}));
vi.mock('./useToastStore', () => ({
    toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));
vi.mock('firebase/firestore', () => ({
    collection: () => ({}),
    doc: () => ({}),
    query: () => ({}),
    orderBy: () => ({}),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    onSnapshot: (_ref, onNext) => {
        const subscription = { onNext, live: true };
        subscriptions.push(subscription);
        return () => { subscription.live = false; };
    },
}));

let store;

beforeEach(async () => {
    subscriptions.length = 0;
    // The reference count lives in the store's closure, so each test needs a
    // fresh module instance.
    vi.resetModules();
    ({ useFirestoreTeamsStore: store } = await import('./useFirestoreTeamsStore'));
});

// Attach order: [0] saved teams, [1] favourite Pokémon.
const pushFavorites = (ids) => {
    const favorites = subscriptions[1];
    if (!favorites?.live) return;   // detached listeners deliver nothing
    favorites.onNext({ exists: () => true, data: () => ({ ids }) });
};

const attachedCount = () => subscriptions.length;
const liveCount = () => subscriptions.filter((s) => s.live).length;

describe('useFirestoreTeamsStore listeners', () => {
    it('attaches one pair of listeners however many consumers ask', () => {
        store.getState().initFirestoreListeners();
        store.getState().initFirestoreListeners();
        store.getState().initFirestoreListeners();

        expect(attachedCount()).toBe(2); // teams + favorites, attached once
    });

    it('keeps listening while another consumer still holds them', () => {
        store.getState().initFirestoreListeners();  // the app shell
        store.getState().initFirestoreListeners();  // the home dashboard

        store.getState().cleanupListeners();        // leaving the home page

        expect(liveCount()).toBe(2);
    });

    it('unsubscribes only once the last consumer releases them', () => {
        store.getState().initFirestoreListeners();
        store.getState().initFirestoreListeners();

        store.getState().cleanupListeners();
        store.getState().cleanupListeners();

        expect(liveCount()).toBe(0);
    });

    it('still delivers favourites after one of two consumers unmounts', () => {
        // The reported bug, end to end: star a Pokémon in the Pokédex after
        // having visited the home page, and nothing came back.
        store.getState().initFirestoreListeners();
        store.getState().initFirestoreListeners();
        store.getState().cleanupListeners();

        pushFavorites([7, 25]);

        expect(store.getState().favoritePokemons).toEqual(new Set([7, 25]));
    });

    it('normalises favourite ids to numbers', () => {
        store.getState().initFirestoreListeners();

        pushFavorites(['6', 25]);

        expect(store.getState().favoritePokemons.has(6)).toBe(true);
    });

    it('does not over-release when a consumer cleans up without ever attaching', () => {
        store.getState().cleanupListeners();   // mounted while signed out
        store.getState().initFirestoreListeners();
        store.getState().initFirestoreListeners();
        store.getState().cleanupListeners();

        expect(liveCount()).toBe(2);
    });
});
