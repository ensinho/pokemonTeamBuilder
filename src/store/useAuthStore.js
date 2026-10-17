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
    reauthenticateWithCredential,
    updatePassword,
    sendPasswordResetEmail,
    deleteUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { appId, ADMIN_EMAILS } from '../constants/firebase';
import { PATCH_NOTES_VERSION } from '../constants/theme';
import { useThemeStore } from './useThemeStore';
import { toast } from './useToastStore';
import { t } from '../utils/translate';
import { useLanguageStore } from './useLanguageStore';
import { migrateLocalProgress, listLocalSuffixesForUid, ppLocalKey, pickBestState } from '../utils/pokePuzzleMigration';
import { resolveAvatar } from '../utils/avatar';
import { promptSignIn, navigateTo } from '../utils/navigation';
import { deleteUserData } from '../services/accountDeletion';
import { disablePush } from '../services/pushNotifications';
import { applyCheckin, localDayKey as checkinDayKey, normalizeCheckin, normalizeStreak } from '../utils/dailyCheckin';
import { useRewardsStore } from './useRewardsStore';

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

// The streak: consecutive days checked in (utils/dailyCheckin.js — the
// check-in, or the daily PokéPuzzle, which checks in). `shields` cover one
// missed day each.
const getInitialStreak = () => {
    if (typeof window === 'undefined') return normalizeStreak(null);
    try {
        return normalizeStreak(JSON.parse(localStorage.getItem('trainerStreak') || 'null'));
    } catch (_) {
        return normalizeStreak(null);
    }
};

const writeStreak = (streak) => {
    try {
        localStorage.setItem('trainerStreak', JSON.stringify(streak));
    } catch (_) { /* ignore */ }
};

// The daily check-in's own counter (total check-ins, never reset): the
// seven-day reward cycle follows it.
const CHECKIN_KEY = 'ptb:checkin';

const getInitialCheckin = () => {
    if (typeof window === 'undefined') return normalizeCheckin(null);
    try {
        return normalizeCheckin(JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null'));
    } catch (_) {
        return normalizeCheckin(null);
    }
};

const writeCheckin = (checkin) => {
    try {
        localStorage.setItem(CHECKIN_KEY, JSON.stringify(checkin));
    } catch (_) { /* ignore */ }
};

/** Two copies of the streak: the one that saw the later day is live (its shields with it). */
const mergeStreaks = (localRaw, remoteRaw) => {
    const local = normalizeStreak(localRaw);
    const remote = normalizeStreak(remoteRaw);
    const latest = (remote.lastVisit || '') > (local.lastVisit || '') ? remote : local;
    return {
        count: latest.count,
        longest: Math.max(local.longest, remote.longest),
        lastVisit: latest.lastVisit,
        shields: latest.shields,
    };
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

// Distinct days the app was opened, for the "days active" badges. Unlike the
// streak, a gap never resets it. `lastDay` is the user's LOCAL calendar day,
// so a late-night visit counts for the day the user is actually living.
const ACTIVE_DAYS_KEY = 'trainerActiveDays';

const localDayKey = (date = new Date()) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const getInitialActiveDays = () => {
    if (typeof window === 'undefined') return { count: 0, lastDay: null };
    try {
        const raw = localStorage.getItem(ACTIVE_DAYS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                count: Number.isFinite(parsed?.count) ? parsed.count : 0,
                lastDay: typeof parsed?.lastDay === 'string' ? parsed.lastDay : null,
            };
        }
    } catch (_) { /* ignore */ }
    return { count: 0, lastDay: null };
};

const writeActiveDays = (activeDays) => {
    try {
        localStorage.setItem(ACTIVE_DAYS_KEY, JSON.stringify(activeDays));
    } catch (_) { /* ignore */ }
};

// Journey marks (utils/journeys.js): the things a trainer has done that no
// collection records — a page visited, a team exported, a quiz started. A map
// of `mark: true`, kept like activeDays: in localStorage for an instant first
// paint and in the preferences doc so it follows the account. Only `true`
// survives a read, so a hand-edited value can't smuggle anything else in.
const JOURNEY_MARKS_KEY = 'ptb:journeyMarks';

const cleanJourneyMarks = (raw) => Object.fromEntries(
    Object.entries(raw && typeof raw === 'object' ? raw : {})
        .filter(([key, value]) => value === true && key.length <= 40)
);

const getInitialJourneyMarks = () => {
    if (typeof window === 'undefined') return {};
    try {
        return cleanJourneyMarks(JSON.parse(localStorage.getItem(JOURNEY_MARKS_KEY) || '{}'));
    } catch (_) {
        return {};
    }
};

const writeJourneyMarks = (marks) => {
    try {
        localStorage.setItem(JOURNEY_MARKS_KEY, JSON.stringify(marks));
    } catch (_) { /* a convenience: the account copy still has them */ }
};

export const useAuthStore = create((set, get) => {
    let authUnsubscribe = null;
    let syncNudgeTimer = null;
    let detachActiveDayListener = null;
    let profileHydratedFromFirestore = false;

    // Read once at store creation. If present, the app boots as "ready" with
    // the last-known identity instead of waiting on the network round-trips;
    // onAuthStateChanged then reconciles the real state in the background.
    const bootSnapshot = readAuthSnapshot();

    // The sync nudge used to be a modal on a 30 s timer: it interrupted every
    // guest mid-task, whatever they were doing, before they had anything worth
    // syncing. It now rides on the first team save (nudgeSyncAfterSave), as a
    // toast — the moment losing the account starts to cost something
    // (2026-10-06). This only clears a timer a previous build may have set.
    const startSyncNudgeTimer = () => {
        if (syncNudgeTimer) clearTimeout(syncNudgeTimer);
        syncNudgeTimer = null;
    };

    return {
        userId: bootSnapshot?.uid ?? null,
        userEmail: bootSnapshot?.email ?? null,
        isAnonymous: bootSnapshot ? bootSnapshot.isAnonymous : true,
        // Optimistically ready when we trust a fresh snapshot — this is what
        // dismisses the splash without waiting for auth/Firestore.
        isAuthReady: bootSnapshot ? true : false,
        // Unlike isAuthReady, NEVER seeded from the snapshot: true only once
        // onAuthStateChanged has actually answered. The mobile splash waits on
        // this so the app can't paint with the cached identity and then
        // re-render into the reconciled one.
        isAuthReconciled: false,
        // True once Firebase has answered "no saved session": a first visit.
        // There is no identity to get wrong, so the splash need not wait for
        // the anonymous sign-up + Firestore round-trips (~3 s on 4G, measured
        // 2026-10-06) — the app paints the signed-out defaults while they run.
        // Splash-only: anything that reads Firestore still waits on
        // isAuthReady, which this does not touch.
        isNewVisitor: false,
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
        activeDays: getInitialActiveDays(),
        checkin: getInitialCheckin(),
        journeyMarks: getInitialJourneyMarks(),
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

                            // 1.3 Tera Type visibility — same rule.
                            if (typeof data.showTeraType === 'boolean') {
                                useThemeStore.getState().setShowTeraType(data.showTeraType);
                            }

                            // 1.4 Global search shortcut — same rule.
                            if (typeof data.searchShortcut === 'string') {
                                useThemeStore.getState().setSearchShortcut(data.searchShortcut);
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

                            // 5. Streak merging. The streak counts consecutive
                            // check-ins (checkIn — the daily PokéPuzzle checks in
                            // too), never a bare app open. The copy that saw the
                            // later day is the live one.
                            const mergedStreak = mergeStreaks(get().streak, data.streak);
                            writeStreak(mergedStreak);
                            set({ streak: mergedStreak });

                            // 5.0 Check-ins only grow: the larger count, the later day.
                            const localCheckin = normalizeCheckin(get().checkin);
                            const remoteCheckin = normalizeCheckin(data.checkin);
                            const mergedCheckin = {
                                count: Math.max(localCheckin.count, remoteCheckin.count),
                                lastDay: [localCheckin.lastDay, remoteCheckin.lastDay].filter(Boolean).sort().pop() || null,
                            };
                            writeCheckin(mergedCheckin);
                            set({ checkin: mergedCheckin });

                            // 5.1 Days active: the larger count wins, and it is
                            // never below the longest streak — every streak day
                            // was a day active, so a veteran doesn't start at 0.
                            const localDays = get().activeDays || getInitialActiveDays();
                            const remoteDays = data.activeDays && typeof data.activeDays === 'object' ? data.activeDays : {};
                            const remoteLastDay = typeof remoteDays.lastDay === 'string' ? remoteDays.lastDay : null;
                            const mergedDays = {
                                count: Math.max(localDays.count || 0, remoteDays.count || 0, mergedStreak.longest || 0),
                                lastDay: [localDays.lastDay, remoteLastDay].filter(Boolean).sort().pop() || null,
                            };
                            writeActiveDays(mergedDays);
                            set({ activeDays: mergedDays });

                            // 5.2 Journey marks: a mark is never taken back, so
                            // the union of both copies is the truth.
                            const mergedMarks = { ...cleanJourneyMarks(data.journeyMarks), ...get().journeyMarks };
                            writeJourneyMarks(mergedMarks);
                            set({ journeyMarks: mergedMarks });

                            // 5.3 Rewards (useRewardsStore): XP never drops,
                            // unlocks are a union, the account's equip wins.
                            useRewardsStore.getState().hydrate(data.rewards);
                        } else {
                            set({ streak: getInitialStreak() });
                        }
                    } catch (e) {
                        set({ streak: getInitialStreak() });
                    } finally {
                        profileHydratedFromFirestore = true;

                        // Count today, then keep counting while the app stays
                        // open across midnight (an installed PWA rarely reloads).
                        get().bumpActiveDay();
                        if (!detachActiveDayListener && typeof document !== 'undefined') {
                            const onVisible = () => {
                                if (document.visibilityState === 'visible') get().bumpActiveDay();
                            };
                            document.addEventListener('visibilitychange', onVisible);
                            detachActiveDayListener = () => document.removeEventListener('visibilitychange', onVisible);
                        }

                        // Push preferences state to Firestore to ensure sync
                        await get().syncPreferencesToFirestore();

                        // Keep the public directory entry current (no-op for
                        // anonymous accounts). Not awaited — boot must not wait
                        // on a social nicety.
                        get().syncPublicProfile();

                        // Set isAuthReady: true now that hydration is complete!
                        set({ isAuthReady: true, isAuthReconciled: true });

                        // Refresh the boot snapshot with the reconciled identity
                        // so the next cold start can skip the network wait.
                        writeAuthSnapshot({
                            uid: user.uid,
                            email: user.email,
                            isAnonymous: user.isAnonymous,
                        });
                    }
                } else {
                    // Sign in anonymously if no user. Before the first sign-in
                    // of this browser there is nothing to hydrate, so let the
                    // shell paint now (see isNewVisitor).
                    if (!get().userId) set({ isNewVisitor: true });
                    try {
                        const token = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;
                        if (token) {
                            await signInWithCustomToken(auth, token);
                        } else {
                            await signInAnonymously(auth);
                        }
                    } catch (error) {
                        toast.error(t('toast.authFailed'), {
                            description: t('toast.authFailedDesc'),
                            actions: [{ label: t('toast.retry'), onClick: () => window.location.reload() }],
                        });
                        // Sign-in failed outright: there is nothing left to
                        // reconcile, so release the splash rather than holding
                        // it until the ceiling.
                        set({ isAuthReady: true, isAuthReconciled: true });
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
            if (detachActiveDayListener) {
                detachActiveDayListener();
                detachActiveDayListener = null;
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
            const { userId, displayName, trainerSprite, avatarPreference, greetingPokemonId, greetingPokemonIsShiny, streak, activeDays, checkin, journeyMarks, selectedBadgeId, userEmail, isAnonymous } = get();
            if (!userId) return;

            const homeWallpaperId = useThemeStore.getState().homeWallpaperId;
            const theme = useThemeStore.getState().theme;
            const uiScale = useThemeStore.getState().uiScale;
            const showTeraType = useThemeStore.getState().showTeraType;
            const searchShortcut = useThemeStore.getState().searchShortcut;
            const language = useLanguageStore.getState().language;

            const updates = {
                theme,
                uiScale,
                showTeraType,
                searchShortcut,
                language,
                displayName,
                trainerSprite: trainerSprite || null,
                avatarPreference: avatarPreference || 'pokemon',
                greetingPokemonId,
                greetingPokemon: greetingPokemonId ? { id: greetingPokemonId, isShiny: greetingPokemonIsShiny } : null,
                greetingPokemonIsShiny,
                homeWallpaperId: homeWallpaperId || null,
                streak,
                activeDays,
                checkin,
                journeyMarks,
                rewards: useRewardsStore.getState().snapshot(),
                selectedBadgeId: selectedBadgeId || null,
                email: userEmail || null,
                isAnonymous,
                updatedAt: Date.now()
            };

            await get().savePreferences(updates);
        },

        // Record a journey mark (utils/journeys.js JOURNEY_MARKS). Idempotent:
        // a mark already set costs nothing, so callers need not check first.
        markJourney: (mark) => {
            const current = get().journeyMarks || {};
            if (!mark || current[mark]) return;
            const next = { ...current, [mark]: true };
            writeJourneyMarks(next);
            set({ journeyMarks: next });
            get().savePreferences({ journeyMarks: next });
        },

        // Count today as a day active. Idempotent per local day.
        bumpActiveDay: () => {
            const current = get().activeDays || getInitialActiveDays();
            const today = localDayKey();
            if (current.lastDay === today) return;
            const next = { count: (current.count || 0) + 1, lastDay: today };
            writeActiveDays(next);
            set({ activeDays: next });
            get().savePreferences({ activeDays: next });
        },

        /**
         * The daily check-in (utils/dailyCheckin.js): one per local day. Pays
         * the cycle's XP into useRewardsStore and advances the streak, spending
         * a shield on a single missed day. Returns what happened, for the card
         * to show — null when today was already counted. Optimistic: the state
         * changes in this frame and the account copy is written behind it.
         */
        checkIn: () => {
            const next = applyCheckin({ checkin: get().checkin, streak: get().streak }, checkinDayKey());
            if (!next) return null;
            writeCheckin(next.checkin);
            writeStreak(next.streak);
            set({ checkin: next.checkin, streak: next.streak });
            get().savePreferences({ checkin: next.checkin, streak: next.streak });
            get().bumpActiveDay();
            const reward = useRewardsStore.getState().addXp(next.result.xp, { checkins: next.checkin.count });
            return { ...next.result, ...reward };
        },

        // A daily PokéPuzzle was played today: that counts as today's
        // check-in, so a puzzle player's streak carries on exactly as before.
        bumpPokePuzzleStreak: () => {
            get().checkIn();
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
            const rewards = useRewardsStore.getState();
            const profileRef = doc(db, `artifacts/${appId}/publicProfiles`, userId);
            const base = {
                displayName: name,
                displayNameLower: name.toLowerCase(),
                // Resolved avatar: the directory shows what the user chose,
                // and never needs to know the preference itself.
                avatarPokemonId: avatar.pokemonId,
                avatarIsShiny: avatar.isShiny,
                trainerSprite: avatar.trainerSprite,
                selectedBadgeId: selectedBadgeId || null,
                updatedAt: new Date().toISOString(),
            };
            try {
                try {
                    // What the profile card shows of the rewards (2026-10-17).
                    await setDoc(profileRef, {
                        ...base,
                        frameId: rewards.equipped.frame || null,
                        titleId: rewards.equipped.title || null,
                        trainerLevel: rewards.level || 1,
                    }, { merge: true });
                } catch (e) {
                    // Rules from before the rewards (`hasOnly`) refuse the new
                    // fields: keep the directory entry current without them
                    // until firestore.rules is deployed.
                    if (e?.code !== 'permission-denied') throw e;
                    await setDoc(profileRef, base, { merge: true });
                }
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

        // Called right after a guest's team save lands. Once per device (the
        // same flag the old modal's "don't remind me" set), so saving ten teams
        // doesn't mean ten nudges; "Ativar lembretes" in Profile clears it.
        nudgeSyncAfterSave: () => {
            if (!get().isAnonymous) return;
            try {
                if (localStorage.getItem('syncPromptDismissed') === '1') return;
                localStorage.setItem('syncPromptDismissed', '1');
            } catch (_) { return; }
            toast.info(t('modals.syncPromptTitle'), {
                description: t('modals.syncPromptDesc'),
                actions: [{ label: t('modals.syncPromptRegister'), onClick: () => promptSignIn('signUp') }],
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
            toast.info(t('toast.remindersOn'));
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

                toast.success(t('toast.accountCreated'), {
                    description: t('toast.accountCreatedDesc', { email: result.user.email || email }),
                });
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
                toast.success(t('toast.welcomeBack', { email: result.user.email || email }));
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
            toast.success(t('toast.signedIn', { email: result.user.email || email }));
            set({ showSyncPrompt: false });
        },

        // Proves the person at the keyboard knows the password before anything
        // sensitive — and refreshes the sign-in, which Firebase demands anyway
        // (auth/requires-recent-login) for a password change or a deletion.
        reauthenticate: async (currentPassword) => {
            const user = auth.currentUser;
            if (!user || user.isAnonymous || !user.email) throw Object.assign(new Error('No account'), { code: 'auth/no-current-user' });
            await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
            return user;
        },

        // Step 2 of the password flow; step 1 was `reauthenticate`, which is
        // what makes Firebase accept this (auth/requires-recent-login otherwise).
        setNewPassword: async (newPassword) => {
            const user = auth.currentUser;
            if (!user || user.isAnonymous) throw Object.assign(new Error('No account'), { code: 'auth/no-current-user' });
            await updatePassword(user, newPassword);
        },

        sendPasswordReset: async (email) => {
            await sendPasswordResetEmail(auth, email);
        },

        // The full-screen hand-off between sessions (SessionTransition in
        // AppLayout): leaving an account is a change of place, so it reads as
        // one — a moment on the Poké Ball, then Home — instead of the profile
        // silently re-rendering as a guest's.
        sessionTransition: null,

        // Data first, auth record last: once the user is gone the rules no longer
        // let anyone delete what they owned. Reauthenticating up front means the
        // final deleteUser can't fail on a stale sign-in after the data is gone.
        // `onStage` lets the dialog show each step as it happens.
        deleteAccount: async (currentPassword, onStage = () => {}) => {
            onStage('verify');
            const user = await get().reauthenticate(currentPassword);
            onStage('data');
            await disablePush({ userId: user.uid });
            await deleteUserData(user.uid);
            onStage('account');
            clearAuthSnapshot();
            await deleteUser(user);
            try {
                localStorage.removeItem('ptbActiveTeamId');
            } catch (_) { /* ignore */ }
            onStage('done');
            await get().leaveSession('deleted');
            toast.info(t('toast.accountDeleted'));
        },

        // Shows the transition, holds it long enough to be read, lands on Home.
        leaveSession: async (kind, work) => {
            set({ sessionTransition: { kind } });
            const minimum = new Promise((resolve) => setTimeout(resolve, 900));
            try {
                await Promise.all([work?.(), minimum]);
                navigateTo('/');
            } finally {
                // One more beat so Home has painted under the cover before it lifts.
                setTimeout(() => set({ sessionTransition: null }), 250);
            }
        },

        handleSignOut: async () => {
            try {
                // Drop the cached identity immediately so a reload mid-sign-out
                // can't briefly boot as the logged-in user. onAuthStateChanged
                // will then write a fresh anonymous snapshot.
                clearAuthSnapshot();
                await get().leaveSession('signOut', () => signOut(auth));
                toast.info(t('toast.signedOut'));
            } catch (e) {
                toast.error(t('toast.signOutError'), {
                    actions: [{ label: t('toast.retry'), onClick: () => get().handleSignOut() }],
                });
            }
        }
    };
});

/** Record a journey mark from outside React (stores, handlers). */
export const markJourney = (mark) => useAuthStore.getState().markJourney(mark);
