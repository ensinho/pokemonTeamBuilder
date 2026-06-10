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
                const credential = EmailAuthProvider.credential(email, password);
                const result = await linkWithCredential(current, credential);
                
                set({
                    isAnonymous: false,
                    userEmail: result.user.email || email,
                    isAdmin: Boolean(result.user.email && ADMIN_EMAILS.includes(result.user.email.trim().toLowerCase())),
                });
                
                useToastStore.getState().showToast(`Account created — synced as ${result.user.email || email}.`, 'success');
            } else {
                const result = await createUserWithEmailAndPassword(auth, email, password);
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
            const result = await signInWithEmailAndPassword(auth, email, password);
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
