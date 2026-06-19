import { create } from 'zustand';
import { auth, db } from '../services/firebase';
import {
    signInAnonymously,
    onAuthStateChanged,
    signInWithCustomToken,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    EmailAuthProvider,
    linkWithCredential,
    signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { appId, ADMIN_EMAILS } from '../constants/firebase';
import { useThemeStore } from './useThemeStore';
import { useToastStore } from './useToastStore';
import { useLanguageStore } from './useLanguageStore';
import { migrateLocalProgress, listLocalSuffixesForUid, ppLocalKey, pickBestState } from '../utils/pokePuzzleMigration';

// Move PokePuzzle progress from an anonymous uid onto the just-authenticated
// account. localStorage is the reliable source (the game mirrors every save
// there); we also push the merged result into the account's Firestore so
// history/board reflect it immediately without needing another guess.
const migratePokePuzzleProgress = async (fromUid, toUid) => {
    if (!fromUid || !toUid || fromUid === toUid) return;

    // 1. localStorage merge (always available, even offline).
    const suffixes = listLocalSuffixesForUid(fromUid);
    migrateLocalProgress(fromUid, toUid);

    // 2. Best-effort Firestore sync of the merged states.
    if (!db) return;
    for (const suffix of suffixes) {
        if (suffix === 'daily:summary') continue;
        const merged = (() => {
            try { return JSON.parse(localStorage.getItem(ppLocalKey(toUid, suffix))); } catch { return null; }
        })();
        if (!merged) continue;

        // suffix -> firestore docId: 'ongoing' stays; 'daily:DATE' -> 'daily_DATE'
        const docId = suffix === 'ongoing' ? 'ongoing' : suffix.replace(/^daily:/, 'daily_');
        try {
            const ref = doc(db, `artifacts/pokemonTeamBuilder/users/${toUid}/pokepuzzle`, docId);
            // Merge against any existing account doc with the same keep-best rule.
            const snap = await getDoc(ref);
            const best = snap.exists() ? pickBestState(snap.data(), merged) : merged;
            await setDoc(ref, best);
        } catch (e) {
            console.error('PokePuzzle Firestore migration failed for', docId, e);
        }
    }
};

const getInitialStreak = () => {
    if (typeof window === 'undefined') return { count: 0, longest: 0, lastVisit: null };
    try {
        const raw = localStorage.getItem('trainerStreak');
        if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return { count: 0, longest: 0, lastVisit: null };
};

const getInitialGreeting = () => {
    if (typeof window === 'undefined') return { id: null, isShiny: false };
    const saved = localStorage.getItem('greetingPokemon');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Number.isInteger(parsed?.id)) {
                return { id: parsed.id, isShiny: Boolean(parsed.isShiny) };
            }
        } catch (_) { /* ignore */ }
        const legacyId = parseInt(saved, 10);
        if (Number.isInteger(legacyId)) {
            return { id: legacyId, isShiny: false };
        }
    }
    return { id: null, isShiny: false };
};

export const useAuthStore = create((set, get) => {
    let authUnsubscribe = null;
    let syncNudgeTimer = null;
    let profileHydratedFromFirestore = false;
    let streakBumped = false;

    // Helper to calculate streak daily increment
    const bumpStreak = (currentStreak) => {
        if (streakBumped) return currentStreak;
        streakBumped = true;

        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

        if (currentStreak.lastVisit === todayStr) return currentStreak; // already counted today

        let nextCount;
        if (!currentStreak.lastVisit) {
            nextCount = 1;
        } else {
            const last = new Date(currentStreak.lastVisit + 'T00:00:00');
            const diffDays = Math.round((today.setHours(0,0,0,0) - last.getTime()) / 86400000);
            nextCount = diffDays === 1 ? (currentStreak.count || 0) + 1 : 1;
        }

        const next = {
            count: nextCount,
            longest: Math.max(currentStreak.longest || 0, nextCount),
            lastVisit: todayStr,
        };

        try {
            localStorage.setItem('trainerStreak', JSON.stringify(next));
        } catch (_) { /* ignore */ }

        return next;
    };

    // Helper to trigger sync nudge prompt timer
    const startSyncNudgeTimer = () => {
        if (syncNudgeTimer) clearTimeout(syncNudgeTimer);
        if (localStorage.getItem('syncPromptDismissed') === '1') return;

        syncNudgeTimer = setTimeout(() => {
            const state = get();
            if (state.isAnonymous && state.isAuthReady) {
                set({ showSyncPrompt: true });
            }
        }, 30000);
    };

    return {
        userId: null,
        userEmail: null,
        isAnonymous: true,
        isAuthReady: false,
        isAdmin: false,
        displayName: '',
        greetingPokemonId: getInitialGreeting().id,
        greetingPokemonIsShiny: getInitialGreeting().isShiny,
        streak: getInitialStreak(),
        showSyncPrompt: false,
        // Bumped after PokePuzzle progress is migrated onto a freshly
        // authenticated account, so PokePuzzleView reloads from the new
        // namespace (its load already ran against the empty one).
        pokePuzzleMigrationTick: 0,

        initAuth: () => {
            if (authUnsubscribe) return;

            authUnsubscribe = onAuthStateChanged(auth, async (user) => {
                profileHydratedFromFirestore = false;
                if (user) {
                    const normalizedEmail = (user.email || '').trim().toLowerCase();
                    const isAdminUser = Boolean(normalizedEmail && ADMIN_EMAILS.includes(normalizedEmail));

                    set({
                        userId: user.uid,
                        isAnonymous: !!user.isAnonymous,
                        userEmail: user.email || null,
                        isAdmin: isAdminUser,
                        // DO NOT set isAuthReady: true yet. We will set it in the finally block after firestore hydration.
                    });

                    // Start sync nudge nudge if anonymous
                    if (user.isAnonymous) {
                        startSyncNudgeTimer();
                    } else {
                        set({ showSyncPrompt: false });
                    }

                    // Hydrate preferences from Firestore
                    try {
                        const prefRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, 'preferences');
                        const snap = await getDoc(prefRef);
                        if (snap.exists()) {
                            const data = snap.data();
                            
                            // 1. Theme sync
                            if (data.theme) {
                                useThemeStore.getState().changeTheme(data.theme);
                            }

                            // 1.1 Language sync
                            if (data.language) {
                                useLanguageStore.getState().setLanguage(data.language);
                            }
                            
                            // 2. Display Name
                            if (typeof data.displayName === 'string') {
                                set({ displayName: data.displayName });
                            }

                            // 3. Greeting Pokemon
                            let nextGreeting = { id: null, isShiny: false };
                            if (Number.isInteger(data.greetingPokemon?.id)) {
                                nextGreeting = {
                                    id: data.greetingPokemon.id,
                                    isShiny: Boolean(data.greetingPokemon.isShiny),
                                };
                            } else if (Number.isInteger(data.greetingPokemonId)) {
                                nextGreeting = {
                                    id: data.greetingPokemonId,
                                    isShiny: Boolean(data.greetingPokemonIsShiny),
                                };
                            }
                            if (nextGreeting.id) {
                                set({
                                    greetingPokemonId: nextGreeting.id,
                                    greetingPokemonIsShiny: nextGreeting.isShiny,
                                });
                                try {
                                    localStorage.setItem('greetingPokemon', JSON.stringify(nextGreeting));
                                } catch (_) { /* ignore */ }
                            }

                            // 4. Wallpaper
                            if (data.homeWallpaperId) {
                                useThemeStore.getState().setHomeWallpaperPreference(data.homeWallpaperId);
                            }

                            // 5. Streak merging
                            let mergedStreak = getInitialStreak();
                            if (data.streak && typeof data.streak === 'object') {
                                const remote = data.streak;
                                mergedStreak = {
                                    count: Math.max(mergedStreak.count || 0, remote.count || 0),
                                    longest: Math.max(mergedStreak.longest || 0, remote.longest || 0, mergedStreak.count || 0, remote.count || 0),
                                    lastVisit: remote.lastVisit || mergedStreak.lastVisit || null,
                                };
                            }
                            // Calculate daily streak bump
                            const finalStreak = bumpStreak(mergedStreak);
                            set({ streak: finalStreak });
                        } else {
                            // No snap, fallback bump streak with local settings
                            const finalStreak = bumpStreak(getInitialStreak());
                            set({ streak: finalStreak });
                        }
                    } catch (e) {
                        // Non-fatal, just bump streak locally
                        const finalStreak = bumpStreak(getInitialStreak());
                        set({ streak: finalStreak });
                    } finally {
                        profileHydratedFromFirestore = true;
                        
                        // Push preferences state to Firestore to ensure sync
                        await get().syncPreferencesToFirestore();
                        
                        // Set isAuthReady: true now that hydration is complete!
                        set({ isAuthReady: true });
                    }
                } else {
                    // Sign in anonymously if no user
                    try {
                        const token = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;
                        if (token) {
                            await signInWithCustomToken(auth, token);
                        } else {
                            await signInAnonymously(auth);
                        }
                    } catch (error) {
                        useToastStore.getState().showToast('Authentication failed. Please refresh.', 'error');
                        set({ isAuthReady: true });
                    }
                }
            });
        },

        cleanupAuth: () => {
            if (authUnsubscribe) {
                authUnsubscribe();
                authUnsubscribe = null;
            }
            if (syncNudgeTimer) {
                clearTimeout(syncNudgeTimer);
                syncNudgeTimer = null;
            }
        },

        savePreferences: async (updates) => {
            const { userId } = get();
            if (!userId || !profileHydratedFromFirestore) return;

            try {
                const prefRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'preferences');
                await setDoc(prefRef, {
                    ...updates,
                    updatedAt: Date.now()
                }, { merge: true });
            } catch (e) {
                // Ignore silent failures
            }
        },

        syncPreferencesToFirestore: async () => {
            const { userId, displayName, greetingPokemonId, greetingPokemonIsShiny, streak, userEmail, isAnonymous } = get();
            if (!userId) return;

            const homeWallpaperId = useThemeStore.getState().homeWallpaperId;
            const theme = useThemeStore.getState().theme;
            const language = useLanguageStore.getState().language;

            const updates = {
                theme,
                language,
                displayName,
                greetingPokemonId,
                greetingPokemon: greetingPokemonId ? { id: greetingPokemonId, isShiny: greetingPokemonIsShiny } : null,
                greetingPokemonIsShiny,
                homeWallpaperId: homeWallpaperId || null,
                streak,
                email: userEmail || null,
                isAnonymous,
                updatedAt: Date.now()
            };

            await get().savePreferences(updates);
        },


        setDisplayName: (name) => {
            set({ displayName: name });
            get().savePreferences({ displayName: name });
        },

        setGreetingPokemon: (selection) => {
            const nextId = typeof selection === 'object' && selection !== null
                ? selection.pokemonId ?? selection.id ?? null
                : selection;
            const nextIsShiny = typeof selection === 'object' && selection !== null
                ? Boolean(selection.isShiny)
                : false;

            set({
                greetingPokemonId: nextId || null,
                greetingPokemonIsShiny: Boolean(nextId) && nextIsShiny,
            });

            if (nextId) {
                try {
                    localStorage.setItem('greetingPokemon', JSON.stringify({ id: nextId, isShiny: nextIsShiny }));
                } catch (_) { /* ignore */ }
            } else {
                try {
                    localStorage.removeItem('greetingPokemon');
                } catch (_) { /* ignore */ }
            }

            get().savePreferences({
                greetingPokemonId: nextId || null,
                greetingPokemon: nextId ? { id: nextId, isShiny: nextIsShiny } : null,
                greetingPokemonIsShiny: Boolean(nextId) && nextIsShiny,
            });
        },

        handleDismissSyncPrompt: () => {
            set({ showSyncPrompt: false });
            try {
                localStorage.setItem('syncPromptDismissed', '1');
            } catch (_) { /* ignore */ }
        },

        handleResetSyncPrompt: () => {
            try {
                localStorage.removeItem('syncPromptDismissed');
            } catch (_) { /* ignore */ }
            set({ showSyncPrompt: false });
            useToastStore.getState().showToast('Reminders re-enabled.', 'info');
            startSyncNudgeTimer();
        },

        handleSignUp: async (email, password) => {
            const current = auth.currentUser;
            if (current && current.isAnonymous) {
                // linkWithCredential upgrades the anonymous account IN PLACE —
                // the uid is unchanged, so PokePuzzle progress is already under
                // the right namespace. No migration needed.
                const credential = EmailAuthProvider.credential(email, password);
                const result = await linkWithCredential(current, credential);

                set({
                    isAnonymous: false,
                    userEmail: result.user.email || email,
                    isAdmin: Boolean(result.user.email && ADMIN_EMAILS.includes(result.user.email.trim().toLowerCase())),
                });

                useToastStore.getState().showToast(`Account created — synced as ${result.user.email || email}.`, 'success');
            } else {
                // No anonymous session to link → a brand-new uid. Migrate any
                // progress saved under the previous anonymous uid (if present).
                const prevAnonUid = current && current.isAnonymous ? current.uid : null;
                const result = await createUserWithEmailAndPassword(auth, email, password);

                if (prevAnonUid && result.user?.uid && prevAnonUid !== result.user.uid) {
                    try {
                        await migratePokePuzzleProgress(prevAnonUid, result.user.uid);
                        set({ pokePuzzleMigrationTick: get().pokePuzzleMigrationTick + 1 });
                    } catch (e) {
                        console.error('PokePuzzle migration on sign-up failed:', e);
                    }
                }
                set({
                    isAnonymous: false,
                    userEmail: result.user.email || email,
                    isAdmin: Boolean(result.user.email && ADMIN_EMAILS.includes(result.user.email.trim().toLowerCase())),
                });
                useToastStore.getState().showToast(`Welcome, ${result.user.email || email}!`, 'success');
            }
            set({ showSyncPrompt: false });
        },

        handleSignIn: async (email, password) => {
            // Capture the anonymous uid BEFORE the sign-in switches identities,
            // so we can migrate its PokePuzzle progress onto the account.
            const prevUser = auth.currentUser;
            const prevAnonUid = prevUser && prevUser.isAnonymous ? prevUser.uid : null;

            const result = await signInWithEmailAndPassword(auth, email, password);

            if (prevAnonUid && result.user?.uid && prevAnonUid !== result.user.uid) {
                try {
                    await migratePokePuzzleProgress(prevAnonUid, result.user.uid);
                    set({ pokePuzzleMigrationTick: get().pokePuzzleMigrationTick + 1 });
                } catch (e) {
                    console.error('PokePuzzle migration on sign-in failed:', e);
                }
            }

            set({
                isAnonymous: false,
                userEmail: result.user.email || email,
                isAdmin: Boolean(result.user.email && ADMIN_EMAILS.includes(result.user.email.trim().toLowerCase())),
            });
            useToastStore.getState().showToast(`Signed in as ${result.user.email || email}.`, 'success');
            set({ showSyncPrompt: false });
        },

        handleSignOut: async () => {
            try {
                await signOut(auth);
                useToastStore.getState().showToast('Signed out.', 'info');
            } catch (e) {
                useToastStore.getState().showToast('Could not sign out. Try again.', 'error');
            }
        }
    };
});
