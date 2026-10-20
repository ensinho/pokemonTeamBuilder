import { create } from 'zustand';
import {
    collection,
    doc,
    getDoc,
    runTransaction,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc,
    deleteDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { callAuthedApi } from '../services/apiClient';
import {
    appId, BATTLE_TURN_ENDPOINT, BATTLE_RANDOM_ENDPOINT, BATTLE_NOTIFY_ENDPOINT,
} from '../constants/firebase';
import { useAuthStore } from './useAuthStore';
import { toast } from './useToastStore';
import { t } from '../utils/translate';
import { navigateTo, promptSignIn } from '../utils/navigation';
import {
    BATTLE_FORMAT, BATTLE_LEVEL, RANDOM_BATTLE_FORMAT,
    battleOpponentId, buildBattleTeamText,
} from '../utils/battle';
import { readCachedLog, writeCachedLog } from '../utils/battleLogCache';
import { ensureSpeciesIndex } from '../services/speciesIndex';

/** The team picked last, so the next challenge or accept opens on it. */
const LAST_TEAM_KEY = 'ptb:battle:lastTeam';

export const readLastBattleTeam = () => {
    try {
        return localStorage.getItem(LAST_TEAM_KEY) || null;
    } catch (_) {
        return null;
    }
};

const rememberBattleTeam = (teamId) => {
    if (!teamId) return;
    try {
        localStorage.setItem(LAST_TEAM_KEY, teamId);
    } catch (_) { /* a convenience, best-effort */ }
};

const battlesPath = () => `artifacts/${appId}/battles`;

let battlesUnsub = null;
let chatUnsub = null;
let logUnsub = null;

/*
 * The open battle's log, by round. `prefix` is what this device already had
 * (battleLogCache) — rounds `0 … upTo-1`, joined; `rounds` holds every round
 * from `upTo` on as it arrives, from the listener or from a turn's own
 * response, in any order and any number of times. `myLog` is the gap-free run.
 */
let openLog = { battleId: null, uid: null, prefix: { lines: [], upTo: 0 }, rounds: new Map() };

const flattenOpenLog = () => {
    const lines = [...openLog.prefix.lines];
    let seq = openLog.prefix.upTo;
    while (openLog.rounds.has(seq)) {
        lines.push(...openLog.rounds.get(seq));
        seq += 1;
    }
    return { lines, upTo: seq };
};
let subscriberCount = 0;
let boundUserId = null;

const unbindBattles = () => {
    if (battlesUnsub) battlesUnsub();
    battlesUnsub = null;
    boundUserId = null;
};

/**
 * POST to one of the server-authoritative battle endpoints with the caller's
 * Firebase ID token — the shared client in `services/apiClient.js` (the
 * Champion Challenge uses it too).
 */
const callBattleApi = callAuthedApi;

/**
 * Ask the server to push the opponent about a change this client just wrote.
 *
 * Fire-and-forget on purpose: the battle transition is already committed, the
 * endpoint re-derives everything from the stored document, and a trainer whose
 * notification failed to send must never see an error about it. It is also a
 * no-op on GitHub Pages, which has no `/api/*` at all.
 */
const pingBattleNotify = (battleId) => {
    if (!battleId) return;
    callBattleApi(BATTLE_NOTIFY_ENDPOINT, { battleId }).catch(() => {});
};

export const useBattlesStore = create((set, get) => ({
    battles: [],
    isLoadingBattles: false,
    // True once the listener has delivered a snapshot for the current account.
    // `battles: []` means "none" only after that — before it, it means "not
    // asked yet", and treating the two the same is what made every pending
    // battle look brand new the moment the first snapshot landed (see
    // docs/wounds.md, 2026-09-21).
    hasLoadedBattles: false,
    // The battle currently open, plus its chat. Kept separate from `battles` so
    // the detail view keeps working while the list re-sorts under it.
    chatMessages: [],
    myTeam: null,          // my submitted (or randomly dealt) team for the open battle
    isLoadingTeam: false,
    isRollingTeams: false,
    // My own filtered protocol lines for the open battle, oldest round first.
    myLog: [],
    // True once there is a log to draw: from this device's cache at once, or
    // after the listener's first answer. Before it, `myLog: []` means "not
    // asked yet", not "nothing happened" (the 2026-09-21 lesson).
    hasLog: false,
    isResolvingTurn: false,
    isBeginning: false,

    /**
     * Listen to every battle this trainer is part of.
     *
     * Single-field `array-contains` query, sorted client-side — same reasoning as
     * useFriendsStore: no composite index to deploy. Reference-counted for the
     * same reason too (the shell may want a badge later).
     */
    initListeners: () => {
        if (!db) return;
        const { userId, isAnonymous } = useAuthStore.getState();
        if (!userId || isAnonymous) return;

        subscriberCount += 1;
        if (boundUserId === userId && battlesUnsub) return;
        if (battlesUnsub) unbindBattles();
        boundUserId = userId;

        set({ isLoadingBattles: true, hasLoadedBattles: false });

        battlesUnsub = onSnapshot(
            query(collection(db, battlesPath()), where('players', 'array-contains', userId)),
            (snapshot) => {
                const rows = snapshot.docs
                    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
                    .sort((a, b) => String(b.lastActivityAt || '').localeCompare(String(a.lastActivityAt || '')));
                set({ battles: rows, isLoadingBattles: false, hasLoadedBattles: true });
            },
            (error) => {
                console.error('Error loading battles:', error);
                set({ isLoadingBattles: false });
            },
        );
    },

    cleanupListeners: () => {
        subscriberCount = Math.max(0, subscriberCount - 1);
        if (subscriberCount > 0) return;
        unbindBattles();
        set({ battles: [], hasLoadedBattles: false });
    },

    /**
     * Challenge a friend. Returns the new battle id, or null.
     *
     * `mode: 'random'` skips team building entirely — once the challenge is
     * accepted, `/api/battle-random` deals both trainers six Pokémon from
     * Showdown's random-battle generator. The mode is fixed at creation because
     * it decides the format the battle is played under, and the resolver reads
     * that from the document on every replay.
     */
    challengeFriend: async (friend, { mode = 'standard', team = null } = {}) => {
        const authState = useAuthStore.getState();
        const { userId, isAnonymous } = authState;

        if (!db || !userId) return null;
        if (isAnonymous) {
            toast.warning(t('toast.signInRequired'), {
                description: t('toast.signInForBattles'),
                actions: [{ label: t('toast.signIn'), onClick: () => promptSignIn('signUp') }],
            });
            return null;
        }
        if (!friend?.userId || friend.userId === userId) return null;

        const myAvatar = authState.publicAvatar();
        const now = new Date().toISOString();
        const isRandom = mode === 'random';

        try {
            const battleRef = doc(collection(db, battlesPath()));
            await setDoc(battleRef, {
                players: [userId, friend.userId],
                challenger: userId,
                // Denormalized so the battle list renders without a profile read.
                playerNames: {
                    [userId]: authState.trainerDisplayName(),
                    [friend.userId]: friend.displayName || 'Trainer',
                },
                playerAvatars: {
                    [userId]: myAvatar,
                    [friend.userId]: {
                        trainerSprite: friend.trainerSprite || null,
                        pokemonId: friend.avatarPokemonId || null,
                        isShiny: Boolean(friend.avatarIsShiny),
                    },
                },
                status: 'pending',
                mode: isRandom ? 'random' : 'standard',
                format: isRandom ? RANDOM_BATTLE_FORMAT : BATTLE_FORMAT,
                // Random battles have a level per Pokémon, chosen by the
                // generator to balance the tiers, so there is no team-wide one.
                level: isRandom ? null : BATTLE_LEVEL,
                randomTeamsRolledAt: null,
                ready: {},
                // Resolver-owned from here down. The rules require these exact
                // empty values on create so a challenger can't stack the deck.
                seed: null,
                engineVersion: null,
                turn: 0,
                awaitingChoiceFrom: [],
                winner: null,
                endedAt: null,
                createdAt: now,
                lastActivityAt: now,
            });
            // The team travels with the challenge, so accepting can start the
            // battle at once (api/battle-turn.js `begin`). Written after the
            // battle exists — its rule reads the battle — and best-effort: if it
            // fails, accepting falls back to asking the challenger for a team.
            if (!isRandom && team?.members?.length) {
                await get().writeTeamDoc(battleRef.id, team.members, team.name).catch((err) => {
                    console.error('Failed to send the team with the challenge:', err);
                });
                rememberBattleTeam(team.id);
            }
            pingBattleNotify(battleRef.id);
            toast.success(t('toast.challengeSent'), {
                description: t('toast.challengeSentDesc'),
                actions: [{ label: t('toast.openBattle'), onClick: () => navigateTo(`/battles/${battleRef.id}`) }],
            });
            return battleRef.id;
        } catch (err) {
            console.error('Failed to send the challenge:', err);
            toast.error(t('toast.challengeError'));
            return null;
        }
    },

    /**
     * Post an open challenge to the forum. Nobody is invited: the battle is
     * created with a single player and the first trainer to claim it becomes
     * the second, which is what lets people battle without being friends.
     *
     * Returns the battle id so the caller can attach it to a forum message.
     */
    createPublicInvite: async ({ mode = 'standard' } = {}) => {
        const authState = useAuthStore.getState();
        const { userId, isAnonymous } = authState;

        if (!db || !userId) return null;
        if (isAnonymous) {
            toast.warning(t('toast.signInRequired'), {
                description: t('toast.signInForBattles'),
                actions: [{ label: t('toast.signIn'), onClick: () => promptSignIn('signUp') }],
            });
            return null;
        }

        const isRandom = mode === 'random';
        const now = new Date().toISOString();

        try {
            const battleRef = doc(collection(db, battlesPath()));
            await setDoc(battleRef, {
                // One player until it is claimed. The rules only permit the
                // second slot to be filled while this array still has one entry.
                players: [userId],
                challenger: userId,
                isPublicInvite: true,
                status: 'open',
                playerNames: { [userId]: authState.trainerDisplayName() },
                playerAvatars: { [userId]: authState.publicAvatar() },
                mode: isRandom ? 'random' : 'standard',
                format: isRandom ? RANDOM_BATTLE_FORMAT : BATTLE_FORMAT,
                level: isRandom ? null : BATTLE_LEVEL,
                randomTeamsRolledAt: null,
                ready: {},
                seed: null,
                engineVersion: null,
                turn: 0,
                awaitingChoiceFrom: [],
                winner: null,
                endedAt: null,
                claimedAt: null,
                createdAt: now,
                lastActivityAt: now,
            });
            return battleRef.id;
        } catch (err) {
            console.error('Failed to open the invite:', err);
            toast.error(t('toast.challengeError'));
            return null;
        }
    },

    /**
     * Take an open invite. Runs in a transaction so two people accepting at the
     * same moment cannot both end up in the battle — the loser is told it was
     * taken rather than silently overwriting the winner. The rules enforce the
     * same compare-and-set, so a hand-rolled write cannot get around it either.
     */
    claimPublicInvite: async (battleId) => {
        const authState = useAuthStore.getState();
        const { userId, isAnonymous } = authState;

        if (!db || !battleId || !userId) return false;
        if (isAnonymous) {
            toast.warning(t('toast.signInRequired'), {
                description: t('toast.signInForBattles'),
                actions: [{ label: t('toast.signIn'), onClick: () => promptSignIn('signUp') }],
            });
            return false;
        }

        const battleRef = doc(db, battlesPath(), battleId);
        const now = new Date().toISOString();
        let mode = 'standard';

        try {
            await runTransaction(db, async (tx) => {
                const snap = await tx.get(battleRef);
                if (!snap.exists()) throw new Error('missing');

                const battle = snap.data();
                const players = Array.isArray(battle.players) ? battle.players : [];
                if (!battle.isPublicInvite || battle.status !== 'open' || players.length !== 1) {
                    throw new Error('taken');
                }
                if (players[0] === userId) throw new Error('own');
                mode = battle.mode === 'random' ? 'random' : 'standard';

                tx.update(battleRef, {
                    players: [players[0], userId],
                    playerNames: { ...(battle.playerNames || {}), [userId]: authState.trainerDisplayName() },
                    playerAvatars: { ...(battle.playerAvatars || {}), [userId]: authState.publicAvatar() },
                    status: 'teamSelect',
                    claimedAt: now,
                    lastActivityAt: now,
                });
            });
        } catch (err) {
            if (err?.message === 'taken') {
                toast.info(t('toast.inviteTaken'), { description: t('toast.inviteTakenDesc') });
            } else if (err?.message === 'own') {
                toast.info(t('toast.inviteOwn'));
            } else {
                console.error('Failed to claim the invite:', err);
                toast.error(t('toast.challengeError'));
            }
            return false;
        }

        // A random battle has nothing to pick, so it goes straight to the field.
        if (mode === 'random') await get().rollRandomTeams(battleId);

        toast.success(t('toast.inviteClaimed'), {
            description: t('toast.inviteClaimedDesc'),
            actions: [{ label: t('toast.openBattle'), onClick: () => navigateTo(`/battles/${battleId}`) }],
        });
        return true;
    },

    /**
     * Accept a challenge and start it — one tap. A random battle rolls at once
     * (`/api/battle-random`); otherwise my team is written and `begin` starts
     * the battle with the challenger's, which came with the challenge, and
     * publishes the opening. A challenge sent without a team (an older
     * client) stops at `teamSelect`, waiting for the challenger's.
     *
     * @returns {Promise<{ok: boolean, started: boolean}>}
     */
    acceptChallenge: async (battleId, { mode = 'standard', team = null } = {}) => {
        if (mode === 'random') {
            const ok = await get().setStatus(battleId, 'teamSelect', null);
            if (!ok) return { ok: false, started: false };
            const rolled = await get().rollRandomTeams(battleId);
            return { ok: Boolean(rolled), started: Boolean(rolled) };
        }
        if (!team?.members?.length) return { ok: false, started: false };
        set({ isBeginning: true });
        try {
            const wrote = await get().writeTeamDoc(battleId, team.members, team.name).catch((err) => {
                console.error('Failed to submit the team:', err);
                return false;
            });
            if (!wrote) {
                toast.error(t('toast.teamSubmitError'));
                return { ok: false, started: false };
            }
            rememberBattleTeam(team.id);
            const begun = await get().beginBattle(battleId);
            return { ok: Boolean(begun), started: Boolean(begun?.begun) };
        } finally {
            set({ isBeginning: false });
        }
    },

    /**
     * Ask the server to start a battle whose teams are in (`action: 'begin'`).
     * The opening comes back in the response, so the field paints without
     * waiting for the listener. Not started yet means the other trainer still
     * owes a team — they are told.
     */
    beginBattle: async (battleId) => {
        try {
            const { ok, payload, error } = await callBattleApi(
                BATTLE_TURN_ENDPOINT,
                { battleId, action: 'begin' },
                { serverErrorMessage: 'Server error (500) starting the battle.' },
            );
            if (!ok) {
                toast.error(error === 'signedOut' ? t('toast.sessionExpired') : error);
                return null;
            }
            if (payload.deltas?.length) get().mergeLogDeltas(battleId, payload.deltas);
            if (!payload.begun) pingBattleNotify(battleId);
            return payload;
        } catch (err) {
            console.error('Failed to start the battle:', err);
            toast.error(t('toast.battleServerError'));
            return null;
        }
    },

    /** Give up a battle in progress: the opponent wins (`action: 'forfeit'`). */
    forfeitBattle: async (battleId) => {
        try {
            const { ok, error } = await callBattleApi(
                BATTLE_TURN_ENDPOINT,
                { battleId, action: 'forfeit' },
                { serverErrorMessage: 'Server error (500) ending the battle.' },
            );
            if (!ok) toast.error(error === 'signedOut' ? t('toast.sessionExpired') : error);
            return ok;
        } catch (err) {
            console.error('Failed to forfeit the battle:', err);
            toast.error(t('toast.battleServerError'));
            return false;
        }
    },
    declineChallenge: async (battleId) => get().setStatus(battleId, 'declined', null),
    cancelChallenge: async (battleId) => get().setStatus(battleId, 'cancelled', null),

    /** Status transitions the rules allow a client to make. */
    setStatus: async (battleId, status, successMessage) => {
        if (!db || !battleId) return false;
        try {
            await updateDoc(doc(db, battlesPath(), battleId), {
                status,
                lastActivityAt: new Date().toISOString(),
            });
            if (successMessage) toast.success(successMessage);
            return true;
        } catch (err) {
            console.error(`Failed to move battle to '${status}':`, err);
            toast.error(t('toast.battleUpdateError'));
            return false;
        }
    },

    /**
     * Submit my team for a battle.
     *
     * The team is stored as battle-safe Showdown import text (see
     * `buildBattleTeamText` — it refuses a moveless Pokémon and writes every
     * spread in EVs), which is exactly what the phase-3 resolver hands to
     * `Teams.import()`. It lives in `battles/{id}/teams/{uid}`, readable only by
     * its owner, so the opponent can't inspect the sets.
     *
     * Batched with my `ready` flag: a team without the flag would stall the
     * battle, and a flag without a team would let it start with nothing.
     */
    submitTeam: async (battleId, team, teamName, teamId = null) => {
        const { userId } = useAuthStore.getState();
        if (!db || !userId || !battleId) return false;

        const members = Array.isArray(team) ? team.filter(Boolean) : [];
        const built = await get().battleTeamDoc(members, teamName);
        if (!built) return false;

        set({ isBeginning: true });
        try {
            const batch = writeBatch(db);
            batch.set(doc(db, `${battlesPath()}/${battleId}/teams`, userId), built);
            batch.update(doc(db, battlesPath(), battleId), {
                [`ready.${userId}`]: true,
                lastActivityAt: new Date().toISOString(),
            });
            await batch.commit();
            rememberBattleTeam(teamId);
            // Both in → the server starts it; otherwise it tells the opponent.
            await get().beginBattle(battleId);
            return true;
        } catch (err) {
            console.error('Failed to submit the team:', err);
            toast.error(t('toast.teamSubmitError'));
            return false;
        } finally {
            set({ isBeginning: false });
        }
    },

    /**
     * A saved team → the `teams/{uid}` document: battle-safe Showdown text
     * (`buildBattleTeamText`) plus the sprite ids for the preview. Null, with
     * a toast that says what to fix, when the team cannot battle.
     */
    battleTeamDoc: async (members, teamName) => {
        const { entryById } = await ensureSpeciesIndex();
        const { text: showdownText, errors } = buildBattleTeamText(members, { entryById });
        if (errors.length > 0) {
            const first = errors[0];
            toast.warning(
                first.reason === 'empty' ? t('toast.teamEmpty') : t('toast.teamSubmitError'),
                {
                    description: first.reason === 'empty'
                        ? t('toast.teamEmptyDesc')
                        : t('toast.memberHasNoMoves', { name: first.name }),
                    actions: [{ label: t('toast.openBuilder'), onClick: () => navigateTo('/builder') }],
                },
            );
            return null;
        }
        return {
            showdownText,
            teamName: teamName || 'Team',
            // Sprite ids only — enough for the preview bar; it reveals nothing
            // the battle won't show anyway.
            sprites: members.slice(0, 6).map((member) => ({ id: member.id, name: member.name || '' })),
            submittedAt: new Date().toISOString(),
        };
    },

    /** Write my team for a battle (no ready flag — `begin` reads the document itself). */
    writeTeamDoc: async (battleId, members, teamName) => {
        const { userId } = useAuthStore.getState();
        if (!db || !userId || !battleId) return false;
        const built = await get().battleTeamDoc((members || []).filter(Boolean), teamName);
        if (!built) return false;
        const ref = doc(db, `${battlesPath()}/${battleId}/teams`, userId);
        try {
            await setDoc(ref, built);
        } catch (err) {
            // The rules allow a rewrite only in team select: a second try at
            // accepting (the first `begin` failed) finds its team already in.
            const existing = await getDoc(ref).catch(() => null);
            if (!existing?.exists()) throw err;
            set({ myTeam: existing.data() });
            return true;
        }
        set({ myTeam: built });
        return true;
    },

    /**
     * Ask the server to deal both trainers a random team.
     *
     * Safe to call from either player and from more than one tab: the endpoint
     * claims the roll in a transaction, so every call after the first returns
     * `alreadyRolled` without touching anything. That matters because this is
     * fired both by whoever accepts the challenge and by the detail view when it
     * finds an accepted random battle that hasn't been dealt yet — the recovery
     * path for a roll that failed halfway.
     */
    rollRandomTeams: async (battleId) => {
        if (!battleId) return null;

        set({ isRollingTeams: true });
        try {
            const { ok, payload, error } = await callBattleApi(
                BATTLE_RANDOM_ENDPOINT,
                { battleId },
                { serverErrorMessage: 'Server error (500) dealing the random teams.' },
            );
            if (!ok) {
                if (error === 'signedOut') {
                    toast.error(t('toast.sessionExpired'), {
                        description: t('toast.sessionExpiredDesc'),
                        actions: [{ label: t('toast.signIn'), onClick: () => promptSignIn('signIn') }],
                    });
                } else {
                    toast.error(error);
                }
                return null;
            }
            // The roll wrote this player's team; pull it in so the reveal doesn't
            // wait for a screen change.
            await get().loadMyTeam(battleId);
            return payload;
        } catch (err) {
            console.error('Failed to roll the random teams:', err);
            toast.error(t('toast.battleServerError'));
            return null;
        } finally {
            set({ isRollingTeams: false });
        }
    },

    deleteBattle: async (battleId) => {
        if (!db || !battleId) return false;
        try {
            await deleteDoc(doc(db, battlesPath(), battleId));
            return true;
        } catch (err) {
            console.error('Failed to delete the battle:', err);
            toast.error(t('toast.battleRemoveError'));
            return false;
        }
    },

    /** My own submitted team for a battle (the opponent's is unreadable). */
    loadMyTeam: async (battleId) => {
        const { userId } = useAuthStore.getState();
        if (!db || !userId || !battleId) {
            set({ myTeam: null });
            return null;
        }
        set({ isLoadingTeam: true });
        try {
            const snap = await getDoc(doc(db, `${battlesPath()}/${battleId}/teams`, userId));
            const team = snap.exists() ? snap.data() : null;
            set({ myTeam: team, isLoadingTeam: false });
            return team;
        } catch (err) {
            console.error('Failed to load your battle team:', err);
            set({ myTeam: null, isLoadingTeam: false });
            return null;
        }
    },

    clearOpenBattle: () => {
        if (chatUnsub) chatUnsub();
        if (logUnsub) logUnsub();
        chatUnsub = null;
        logUnsub = null;
        // The log is already on this device (saved as each round arrived), so
        // leaving loses nothing: the next visit paints from it.
        openLog = { battleId: null, uid: null, prefix: { lines: [], upTo: 0 }, rounds: new Map() };
        set({ chatMessages: [], myTeam: null, myLog: [], hasLog: false, isResolvingTurn: false });
    },

    /**
     * Live listener on MY side of the battle transcript, from where this
     * device's copy ends.
     *
     * `playerLogs/{uid}/rounds/*` is owner-read-only, so this can only ever see
     * this trainer's filtered view — the opponent's stream is unreachable by
     * construction, not by convention. Rounds never change once written, so
     * the ones cached here (`battleLogCache`) are not asked for again: the
     * query starts at `seq >= upTo`.
     */
    initLogListener: (battleId) => {
        const { userId } = useAuthStore.getState();
        if (!db || !battleId || !userId) return;
        if (logUnsub) logUnsub();

        const cached = readCachedLog(userId, battleId);
        openLog = { battleId, uid: userId, prefix: cached || { lines: [], upTo: 0 }, rounds: new Map() };
        set({ myLog: openLog.prefix.lines, hasLog: Boolean(cached) });

        logUnsub = onSnapshot(
            query(
                collection(db, `${battlesPath()}/${battleId}/playerLogs/${userId}/rounds`),
                where('seq', '>=', openLog.prefix.upTo),
                orderBy('seq', 'asc'),
            ),
            (snapshot) => {
                if (openLog.battleId !== battleId) return;
                snapshot.docs.forEach((docSnap) => {
                    const data = docSnap.data();
                    if (Number.isInteger(data.seq)) openLog.rounds.set(data.seq, data.lines || []);
                });
                get().publishOpenLog(true);
            },
            (error) => console.error('Error loading the battle log:', error),
        );
    },

    /** Rounds that came back with a turn's own response (`deltas: [{seq, lines}]`). */
    mergeLogDeltas: (battleId, deltas = []) => {
        if (openLog.battleId !== battleId) return;
        deltas.forEach((delta) => {
            if (Number.isInteger(delta?.seq) && Array.isArray(delta.lines) && delta.seq >= openLog.prefix.upTo) {
                openLog.rounds.set(delta.seq, delta.lines);
            }
        });
        get().publishOpenLog(false);
    },

    /** Recompute `myLog` from the rounds held, and save it on this device. */
    publishOpenLog: (fromListener) => {
        const { lines, upTo } = flattenOpenLog();
        const changed = lines.length !== get().myLog.length;
        if (changed || (fromListener && !get().hasLog)) {
            set({ myLog: lines, hasLog: get().hasLog || fromListener || lines.length > 0 });
        }
        if (changed && upTo > openLog.prefix.upTo) writeCachedLog(openLog.uid, openLog.battleId, { lines, upTo });
    },

    /**
     * Send a choice ("move 1", "switch 2", "team 123456") to the authoritative
     * resolver.
     *
     * The client never computes an outcome: it posts the choice and the server
     * replays the battle. Passing no choice is a safe refresh — useful to nudge a
     * turn that the opponent has already answered.
     *
     * `silent: true` is for those background nudges, and it changes two things:
     * `isResolvingTurn` is left alone, and a failure is swallowed rather than
     * toasted. Both matter. `isResolvingTurn` disables every move and switch
     * button in the view, so a poll that flips it makes the grid go dead for the
     * length of a round-trip every few seconds — the flicker reads as the app
     * fighting the user. And a nudge nobody asked for has no business raising an
     * error toast when the network blips; the real channel is the Firestore
     * listener, and it will deliver the round when it lands.
     */
    submitChoice: async (battleId, choice = null, { silent = false } = {}) => {
        if (!battleId) return null;

        if (!silent) set({ isResolvingTurn: true });
        try {
            const { ok, payload, error } = await callBattleApi(
                BATTLE_TURN_ENDPOINT,
                { battleId, choice },
                { serverErrorMessage: 'Server error (500) resolving turn.' },
            );
            if (!ok) {
                if (silent) return null;
                if (error === 'signedOut') {
                    toast.error(t('toast.sessionExpired'), {
                        description: t('toast.sessionExpiredDesc'),
                        actions: [{ label: t('toast.signIn'), onClick: () => promptSignIn('signIn') }],
                    });
                } else {
                    toast.error(error);
                }
                return null;
            }
            // The turn's own lines: they play now, not when the listener catches up.
            if (payload.deltas?.length) get().mergeLogDeltas(battleId, payload.deltas);
            return payload;
        } catch (err) {
            console.error('Failed to reach the battle resolver:', err);
            if (!silent) toast.error(t('toast.battleServerError'));
            return null;
        } finally {
            if (!silent) set({ isResolvingTurn: false });
        }
    },

    initChatListener: (battleId) => {
        if (!db || !battleId) return;
        if (chatUnsub) chatUnsub();
        chatUnsub = onSnapshot(
            query(collection(db, `${battlesPath()}/${battleId}/chat`), orderBy('createdAt', 'asc')),
            (snapshot) => set({ chatMessages: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) }),
            (error) => console.error('Error loading battle chat:', error),
        );
    },

    sendChatMessage: async (battleId, text) => {
        const authState = useAuthStore.getState();
        const cleaned = (text || '').trim();
        if (!db || !battleId || !cleaned || !authState.userId) return false;

        const avatar = authState.publicAvatar();
        try {
            await setDoc(doc(collection(db, `${battlesPath()}/${battleId}/chat`)), {
                text: cleaned.slice(0, 500),
                createdBy: authState.userId,
                creatorName: authState.trainerDisplayName(),
                creatorAvatar: avatar.pokemonId,
                creatorAvatarIsShiny: avatar.isShiny,
                creatorTrainerSprite: avatar.trainerSprite,
                createdAt: new Date().toISOString(),
            });
            return true;
        } catch (err) {
            console.error('Failed to send the battle message:', err);
            toast.error(t('toast.battleMessageError'));
            return false;
        }
    },

    /** Convenience for views: the battle doc from the live list. */
    getBattle: (battleId) => get().battles.find((battle) => battle.id === battleId) || null,

    opponentOf: (battle) => {
        const { userId } = useAuthStore.getState();
        return battleOpponentId(battle, userId);
    },
}));
