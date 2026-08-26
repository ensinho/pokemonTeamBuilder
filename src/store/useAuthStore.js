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
import { PATCH_NOTES_VERSION } from '../constants/theme';
import { useThemeStore } from './useThemeStore';
import { useToastStore } from './useToastStore';
import { useLanguageStore } from './useLanguageStore';
import { migrateLocalProgress, listLocalSuffixesForUid, ppLocalKey, pickBestState } from '../utils/pokePuzzleMigration';
import { resolveAvatar } from '../utils/avatar';

// Re-exported so components can keep importing it from the store they already use.
export { resolveAvatar };

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

// --- Auth snapshot (stale-while-revalidate boot) -------------------------
// Firebase already persists the session locally, but the initial splash used
// to block until onAuthStateChanged + the Firestore preferences read both
// finished — several seconds on bad latency. This snapshot lets us render the
// app immediately with the last-known identity and reconcile against the real
// auth/Firestore state in the background. It is a UX cache only: isAdmin is
// NEVER trusted from here (it's re-derived from the real token), and no
// privileged data loads without Firestore rules authorizing it server-side.
const SNAPSHOT_KEY = 'ptb:authSnapshot';
const SNAPSHOT_SCHEMA = 1; // bump to invalidate all snapshots on a shape change
const SNAPSHOT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// A snapshot is only usable if it matches the current schema AND the current
// app version AND is within the TTL. The version check means a deploy that
// bumps PATCH_NOTES_VERSION transparently invalidates every cached snapshot
// (the version-bump cleanup in AppLayout also wipes the key outright).
const readAuthSnapshot = () => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(SNAPSHOT_KEY);
        if (!raw) return null;
        const snap = JSON.parse(raw);
        if (!snap || snap.schema !== SNAPSHOT_SCHEMA) return null;
        if (snap.appVersion !== PATCH_NOTES_VERSION) return null;
        if (!snap.ts || (Date.now() - snap.ts) > SNAPSHOT_TTL_MS) return null;
        if (typeof snap.uid !== 'string' || !snap.uid) return null;
        return snap;
    } catch (_) {
        return null;
    }
};

const writeAuthSnapshot = ({ uid, email, isAnonymous }) => {
    if (typeof window === 'undefined' || !uid) return;
    try {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({
            schema: SNAPSHOT_SCHEMA,
            appVersion: PATCH_NOTES_VERSION,
            ts: Date.now(),
            uid,
            email: email || null,
            isAnonymous: !!isAnonymous,
        }));
    } catch (_) { /* ignore */ }
};

const clearAuthSnapshot = () => {
    if (typeof window === 'undefined') return;
    try { localStorage.removeItem(SNAPSHOT_KEY); } catch (_) { /* ignore */ }
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

    // Read once at store creation. If present, the app boots as "ready" with
    // the last-known identity instead of waiting on the network round-trips;
    // onAuthStateChanged then reconciles the real state in the background.
    const bootSnapshot = readAuthSnapshot();

    // Advance a streak by one "day played". Pure date-diff: same day → no-op,
    // exactly +1 day → increment, any gap → reset to 1. `lastVisit` holds the
    // last day a PokePuzzle was played (field name kept for storage compat).
    const advanceStreak = (currentStreak) => {
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

        if (currentStreak.lastVisit === todayStr) return currentStreak; // already counted today

        let nextCount;
        if (!currentStreak.lastVisit) {
            nextCount = 1;
        } else {
            const last = new Date(currentStreak.lastVisit + 'T00:00:00');
            const diffDays = Math.round((today.setHours(0, 0, 0, 0) - last.getTime()) / 86400000);
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
        userId: bootSnapshot?.uid ?? null,
        userEmail: bootSnapshot?.email ?? null,
        isAnonymous: bootSnapshot ? bootSnapshot.isAnonymous : true,
        // Optimistically ready when we trust a fresh snapshot — this is what
        // dismisses the splash without waiting for auth/Firestore.
        isAuthReady: bootSnapshot ? true : false,
        // Never seeded from cache — a privileged flag must come from the token.
        isAdmin: false,
        displayName: '',
        // Showdown trainer-sprite id available as an avatar (see
        // src/hooks/useTrainerSprites.js).
        trainerSprite: null,
        // Which of the two the user wants as their main avatar: 'pokemon' (the
        // partner Pokémon, the historical default) or 'trainer'.
        avatarPreference: 'pokemon',
        greetingPokemonId: getInitialGreeting().id,
        greetingPokemonIsShiny: getInitialGreeting().isShiny,
        streak: getInitialStreak(),
        selectedBadgeId: typeof window !== 'undefined' ? localStorage.getItem('selectedBadgeId') || null : null,
        newlyUnlockedBadge: null,
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

                            // 1.2 Interface scale. Only applied when the profile
                            // actually carries one, so signing in on a device the
                            // user already tuned doesn't silently reset it.
                            if (data.uiScale !== undefined && data.uiScale !== null) {
                                useThemeStore.getState().setUiScale(data.uiScale);
                            }
                            
                            // 2. Display Name
                            if (typeof data.displayName === 'string') {
                                set({ displayName: data.displayName });
                            }

                            // 2.1 Trainer sprite + which avatar the user picked
                            if (typeof data.trainerSprite === 'string' || data.trainerSprite === null) {
                                set({ trainerSprite: data.trainerSprite || null });
                            }
                            if (data.avatarPreference === 'trainer' || data.avatarPreference === 'pokemon') {
                                set({ avatarPreference: data.avatarPreference });
                            }

                            // 2.2 Selected Badge
                            if (typeof data.selectedBadgeId === 'string' || data.selectedBadgeId === null) {
                                const bId = data.selectedBadgeId || null;
                                set({ selectedBadgeId: bId });
                                try {
                                    if (bId) localStorage.setItem('selectedBadgeId', bId);
                                    else localStorage.removeItem('selectedBadgeId');
                                } catch (_) { /* ignore */ }
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
                            // The streak now tracks consecutive daily PokePuzzles
                            // PLAYED, not app visits — it is bumped from the game
                            // (bumpPokePuzzleStreak), never on app open. Just load it.
                            set({ streak: mergedStreak });
                        } else {
                            set({ streak: getInitialStreak() });
                        }
                    } catch (e) {
                        set({ streak: getInitialStreak() });
                    } finally {
                        profileHydratedFromFirestore = true;

                        // Push preferences state to Firestore to ensure sync
                        await get().syncPreferencesToFirestore();

                        // Keep the public directory entry current (no-op for
                        // anonymous accounts). Not awaited — boot must not wait
                        // on a social nicety.
                        get().syncPublicProfile();

                        // Set isAuthReady: true now that hydration is complete!
                        set({ isAuthReady: true });

                        // Refresh the boot snapshot with the reconciled identity
                        // so the next cold start can skip the network wait.
                        writeAuthSnapshot({
                            uid: user.uid,
                            email: user.email,
                            isAnonymous: user.isAnonymous,
                        });
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
            const { userId, displayName, trainerSprite, avatarPreference, greetingPokemonId, greetingPokemonIsShiny, streak, selectedBadgeId, userEmail, isAnonymous } = get();
            if (!userId) return;

            const homeWallpaperId = useThemeStore.getState().homeWallpaperId;
            const theme = useThemeStore.getState().theme;
            const uiScale = useThemeStore.getState().uiScale;
            const language = useLanguageStore.getState().language;

            const updates = {
                theme,
                uiScale,
                language,
                displayName,
                trainerSprite: trainerSprite || null,
                avatarPreference: avatarPreference || 'pokemon',
                greetingPokemonId,
                greetingPokemon: greetingPokemonId ? { id: greetingPokemonId, isShiny: greetingPokemonIsShiny } : null,
                greetingPokemonIsShiny,
                homeWallpaperId: homeWallpaperId || null,
                streak,
                selectedBadgeId: selectedBadgeId || null,
                email: userEmail || null,
                isAnonymous,
                updatedAt: Date.now()
            };

            await get().savePreferences(updates);
        },

        // Advance the trainer streak because a daily PokePuzzle was played
        // TODAY. Idempotent per day (advanceStreak no-ops if already counted).
        // Persists to localStorage + the user's Firestore profile so it stays
        // in sync across devices.
        bumpPokePuzzleStreak: () => {
            const current = get().streak || getInitialStreak();
            const next = advanceStreak(current);
            if (next === current) return;          // already counted today
            set({ streak: next });
            get().syncPreferencesToFirestore().catch(e =>
                console.error('Failed to sync PokePuzzle streak:', e));
        },


        // The name other trainers see. Mirrors the fallback chain the forum has
        // always used, so a user without an explicit display name still shows up
        // as something recognisable instead of a raw uid.
        trainerDisplayName: () => {
            const { displayName, userEmail } = get();
            return displayName || (userEmail ? userEmail.split('@')[0] : '') || 'Trainer';
        },

        // This trainer's resolved avatar — see `resolveAvatar` above.
        publicAvatar: () => resolveAvatar(get()),

        /**
         * Mirror the public-facing slice of the profile into
         * `artifacts/{appId}/publicProfiles/{uid}` — the directory other trainers
         * search to add friends.
         *
         * Best-effort and never awaited by the boot path: a failure here must not
         * block sign-in. Anonymous accounts are skipped on purpose (the rules
         * reject them too) so the directory doesn't fill with throwaway ghosts.
         *
         * Uses `merge: true` deliberately: `battleRecord` is owned by the battle
         * resolver, and the rules only accept a write that leaves it untouched.
         */
        syncPublicProfile: async () => {
            const { userId, isAnonymous, selectedBadgeId } = get();
            if (!db || !userId || isAnonymous || !profileHydratedFromFirestore) return;

            const name = get().trainerDisplayName();
            const avatar = get().publicAvatar();
            try {
                const profileRef = doc(db, `artifacts/${appId}/publicProfiles`, userId);
                await setDoc(profileRef, {
                    displayName: name,
                    displayNameLower: name.toLowerCase(),
                    // Resolved avatar: the directory shows what the user chose,
                    // and never needs to know the preference itself.
                    avatarPokemonId: avatar.pokemonId,
                    avatarIsShiny: avatar.isShiny,
                    trainerSprite: avatar.trainerSprite,
                    selectedBadgeId: selectedBadgeId || null,
                    updatedAt: new Date().toISOString(),
                }, { merge: true });
            } catch (e) {
                // Non-critical: the private profile is already saved, and the
                // directory entry re-syncs on the next profile change.
                console.error('Failed to sync public profile:', e);
            }
        },

        setSelectedBadgeId: (badgeId) => {
            const next = badgeId || null;
            set({ selectedBadgeId: next });
            try {
                if (next) localStorage.setItem('selectedBadgeId', next);
                else localStorage.removeItem('selectedBadgeId');
            } catch (_) { /* ignore */ }
            get().savePreferences({ selectedBadgeId: next });
            get().syncPublicProfile();
        },

        setNewlyUnlockedBadge: (badge) => set({ newlyUnlockedBadge: badge }),
        clearNewlyUnlockedBadge: () => set({ newlyUnlockedBadge: null }),

        setDisplayName: (name) => {
            set({ displayName: name });
            get().savePreferences({ displayName: name });
            get().syncPublicProfile();
        },

        setTrainerSprite: (spriteId) => {
            const next = spriteId || null;
            // Picking a sprite implies wanting to use it; clearing it falls back
            // to the partner Pokémon. Saves the user a second click.
            const nextPreference = next ? 'trainer' : 'pokemon';
            set({ trainerSprite: next, avatarPreference: nextPreference });
            get().savePreferences({ trainerSprite: next, avatarPreference: nextPreference });
            get().syncPublicProfile();
        },

        setAvatarPreference: (preference) => {
            const next = preference === 'trainer' ? 'trainer' : 'pokemon';
            set({ avatarPreference: next });
            get().savePreferences({ avatarPreference: next });
            get().syncPublicProfile();
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
            get().syncPublicProfile();
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
                // Drop the cached identity immediately so a reload mid-sign-out
                // can't briefly boot as the logged-in user. onAuthStateChanged
                // will then write a fresh anonymous snapshot.
                clearAuthSnapshot();
                await signOut(auth);
                useToastStore.getState().showToast('Signed out.', 'info');
            } catch (e) {
                useToastStore.getState().showToast('Could not sign out. Try again.', 'error');
            }
        }
    };
});
