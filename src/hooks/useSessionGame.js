import { useReducer, useRef, useCallback, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
    getPokemonApiData,
    getPokemonSpeciesData,
} from '../services/pokemonDataCache';
import { getPokemonArtworkSpriteUrl } from '../utils/pokemonSprites';

// ============================================================
//  useSessionGame — owns the ENTIRE PokePuzzle game lifecycle for ONE
//  loaded session. The component drives it imperatively:
//
//    const game = useSessionGame({ userId, allowedPool, language, ... });
//    game.loadSession('daily:2026-6-18')   // ← explicit, no effect chains
//    game.addGuess(name); game.setStatus('WON'); game.unlockTip('types');
//
//  Why imperative loading? The previous effect-driven model derived a
//  sessionKey and reloaded via a useEffect whose deps overlapped the SAVE
//  effect's deps. Switching dates produced render orderings where a stale
//  save wrote the OLD guesses under the NEW key — so the board showed a
//  new target with old letters that "wouldn't update". Here, load is a
//  command and save is gated on the loaded session's OWN key, so the two
//  can never fight.
// ============================================================

const DEFAULT_TIPS = { description: false, types: false, silhouette: false };

// localStorage key scheme — MUST match pokePuzzleMigration.ppLocalKey().
const ppKey = (userId, suffix) => `ptb:pokepuzzle:${userId || 'anon'}:${suffix}`;

const safeLocalSet = (key, value) => {
    try { localStorage.setItem(key, value); } catch (e) {
        console.warn(`PokePuzzle: could not persist "${key}"`, e);
    }
};

const normalizeName = (name) => (name || '')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

const hideName = (text, name) => {
    if (!text || !name) return '';
    const escaped = name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    let out = text.replace(new RegExp(`\\b${escaped}(s)?\\b`, 'gi'), '______');
    const norm = normalizeName(name);
    if (norm.length > 2) out = out.replace(new RegExp(`\\b${norm}(s)?\\b`, 'gi'), '______');
    return out;
};

// Parse a sessionKey ('daily:YYYY-M-D' | 'ongoing') into its parts.
const parseKey = (key) => {
    if (key === 'ongoing') return { mode: 'ongoing', date: null };
    return { mode: 'daily', date: key.slice('daily:'.length) };
};

// sessionKey → Firestore docId.
const firestoreDocId = (key) => key === 'ongoing' ? 'ongoing' : `daily_${parseKey(key).date}`;
// sessionKey → localStorage suffix.
const localSuffix = (key) => key === 'ongoing' ? 'ongoing' : `daily:${parseKey(key).date}`;

export const __test = { parseKey, firestoreDocId, localSuffix };

export const emptySession = () => ({
    status: 'IDLE',          // IDLE | LOADING | READY
    key: null,               // the sessionKey these fields belong to
    target: null,
    guesses: [],
    gameStatus: 'IN_PROGRESS',
    unlockedTips: { ...DEFAULT_TIPS },
    details: null,           // { types, description, image, id }
    detailsLoading: false,
});

export function reducer(state, action) {
    switch (action.type) {
        case 'LOAD_START':
            return { ...emptySession(), status: 'LOADING', key: action.key };
        case 'LOAD_READY':
            // Ignore a ready that doesn't match the session we're loading.
            if (state.key !== action.key) return state;
            return {
                ...state,
                status: 'READY',
                target: action.target,
                guesses: action.guesses || [],
                gameStatus: action.gameStatus || 'IN_PROGRESS',
                unlockedTips: action.unlockedTips || { ...DEFAULT_TIPS },
                details: null,
                detailsLoading: false,
            };
        case 'DETAILS_LOADING':
            if (state.key !== action.key) return state;
            return { ...state, detailsLoading: true };
        case 'DETAILS_LOADED':
            if (state.key !== action.key) return state;
            return { ...state, detailsLoading: false, details: action.details };
        case 'ADD_GUESS':
            if (state.status !== 'READY') return state;
            return { ...state, guesses: [...state.guesses, action.name] };
        case 'SET_STATUS':
            if (state.status !== 'READY') return state;
            return { ...state, gameStatus: action.gameStatus };
        case 'UNLOCK_TIP':
            if (state.status !== 'READY') return state;
            return { ...state, unlockedTips: { ...state.unlockedTips, [action.tip]: true } };
        default:
            return state;
    }
}

export function useSessionGame({ userId, allowedPool, language, getDailyIndex, onReady }) {
    const [session, dispatch] = useReducer(reducer, undefined, emptySession);

    // Monotonic token: every load bumps it; async resolves bail if it changed.
    const tokenRef = useRef(0);
    // The key that is currently authoritative for saving. Set SYNCHRONOUSLY at
    // load start so the save effect can never persist under a stale key.
    const loadedKeyRef = useRef(null);

    // Latest values for use inside the imperative loader without re-binding it.
    const ctx = useRef({ userId, allowedPool, getDailyIndex, onReady });
    ctx.current = { userId, allowedPool, getDailyIndex, onReady };

    // --- READ a persisted game: Firestore (if logged in) → localStorage. ---
    const readSaved = useCallback(async (key) => {
        const { userId } = ctx.current;
        if (db && userId) {
            try {
                const ref = doc(db, `artifacts/pokemonTeamBuilder/users/${userId}/pokepuzzle`, firestoreDocId(key));
                const snap = await getDoc(ref);
                if (snap.exists()) return snap.data();
            } catch (e) { console.error('PokePuzzle Firestore read failed:', e); }
        }
        const raw = localStorage.getItem(ppKey(userId, localSuffix(key)));
        if (raw) { try { return JSON.parse(raw); } catch { /* corrupt */ } }
        return null;
    }, []);

    // --- LOAD a session by key. Imperative, idempotent, race-safe. ---
    const loadSession = useCallback(async (key) => {
        const { allowedPool, getDailyIndex, onReady } = ctx.current;
        if (!allowedPool || allowedPool.length === 0) return;

        const token = ++tokenRef.current;
        loadedKeyRef.current = key;          // authoritative immediately
        dispatch({ type: 'LOAD_START', key });

        const { mode } = parseKey(key);
        const state = await readSaved(key);
        if (token !== tokenRef.current) return;   // a newer load superseded us

        let target;
        if (mode === 'daily') {
            target = allowedPool[getDailyIndex(parseKey(key).date, allowedPool)];
        } else {
            const saved = state && allowedPool.find(p => p.id === state.targetId);
            target = saved || allowedPool[Math.floor(Math.random() * allowedPool.length)];
        }
        if (!target) return;

        dispatch({
            type: 'LOAD_READY',
            key,
            target,
            // Only restore guesses/status when the saved target matches the
            // resolved target — guards against a stale/mismatched save record.
            guesses: state && state.targetId === target.id ? state.guesses : [],
            gameStatus: state && state.targetId === target.id ? state.gameStatus : 'IN_PROGRESS',
            unlockedTips: state && state.targetId === target.id ? state.unlockedTips : undefined,
        });
        if (onReady) onReady(target, key);
    }, [readSaved]);

    // --- Start a fresh random ongoing game (Play Again). ---
    const startRandomOngoing = useCallback(() => {
        const { allowedPool } = ctx.current;
        if (!allowedPool || allowedPool.length === 0) return;
        const token = ++tokenRef.current;
        loadedKeyRef.current = 'ongoing';
        const target = allowedPool[Math.floor(Math.random() * allowedPool.length)];
        if (token !== tokenRef.current) return;
        dispatch({ type: 'LOAD_READY', key: 'ongoing', target, guesses: [], gameStatus: 'IN_PROGRESS' });
        const { onReady } = ctx.current;
        if (onReady) onReady(target, 'ongoing');
    }, []);

    // --- SAVE: whenever the READY session's progress changes. Gated on the
    //     session's OWN key (the one it was loaded under) so a switch-in-flight
    //     can never write the wrong game. ---
    useEffect(() => {
        if (session.status !== 'READY' || !session.target) return;
        if (session.key !== loadedKeyRef.current) return;

        const payload = {
            guesses: session.guesses,
            gameStatus: session.gameStatus,
            targetId: session.target.id,
            unlockedTips: session.unlockedTips,
            updatedAt: new Date().toISOString(),
        };
        const suffix = localSuffix(session.key);
        safeLocalSet(ppKey(userId, suffix), JSON.stringify(payload));

        // Broadcast summary to HomeView only for today's daily.
        const { date } = parseKey(session.key);
        const now = new Date();
        const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        if (date === today) {
            safeLocalSet(ppKey(userId, 'daily:summary'), JSON.stringify({
                solved: session.gameStatus === 'WON',
                attempts: session.guesses.length,
                date,
            }));
        }

        if (db && userId) {
            const ref = doc(db, `artifacts/pokemonTeamBuilder/users/${userId}/pokepuzzle`, firestoreDocId(session.key));
            setDoc(ref, payload).catch(e => console.error('PokePuzzle save failed:', e));
        }
    }, [session, userId]);

    // --- Fetch target details (pokedex entry / types / artwork). Token-guarded
    //     to the load that produced the target. ---
    useEffect(() => {
        const target = session.target;
        const key = session.key;
        if (!target || session.status !== 'READY') return;

        const token = tokenRef.current;
        let cancelled = false;
        dispatch({ type: 'DETAILS_LOADING', key });

        (async () => {
            try {
                const [apiData, speciesData] = await Promise.all([
                    getPokemonApiData(target.id),
                    getPokemonSpeciesData(target.id),
                ]);
                if (cancelled || token !== tokenRef.current) return;
                if (apiData && speciesData) {
                    const types = apiData.types.map(t => t.type.name);
                    const entry = speciesData.flavor_text_entries?.find(e => e.language?.name === language)
                        || speciesData.flavor_text_entries?.find(e => e.language?.name === 'en');
                    const cleaned = (entry?.flavor_text || '').replace(/[\n\f\r]/g, ' ');
                    dispatch({
                        type: 'DETAILS_LOADED',
                        key,
                        details: {
                            types,
                            description: hideName(cleaned, target.name),
                            image: getPokemonArtworkSpriteUrl(target.id),
                            id: target.id,
                        },
                    });
                }
            } catch (err) {
                if (!cancelled && token === tokenRef.current) console.error('PokePuzzle details fetch failed:', err);
            }
        })();

        return () => { cancelled = true; };
    }, [session.target, session.key, session.status, language]);

    // Public progress mutators.
    const addGuess = useCallback((name) => dispatch({ type: 'ADD_GUESS', name }), []);
    const setStatus = useCallback((gameStatus) => dispatch({ type: 'SET_STATUS', gameStatus }), []);
    const unlockTip = useCallback((tip) => dispatch({ type: 'UNLOCK_TIP', tip }), []);

    return { session, loadSession, startRandomOngoing, addGuess, setStatus, unlockTip };
}
