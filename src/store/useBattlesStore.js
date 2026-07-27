import { create } from 'zustand';
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc,
    deleteDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { appId, BATTLE_TURN_ENDPOINT } from '../constants/firebase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';
import { BATTLE_FORMAT, BATTLE_LEVEL, battleOpponentId, buildBattleTeamText } from '../utils/battle';

const battlesPath = () => `artifacts/${appId}/battles`;

let battlesUnsub = null;
let chatUnsub = null;
let logUnsub = null;
let subscriberCount = 0;
let boundUserId = null;

const unbindBattles = () => {
    if (battlesUnsub) battlesUnsub();
    battlesUnsub = null;
    boundUserId = null;
};

export const useBattlesStore = create((set, get) => ({
    battles: [],
    isLoadingBattles: false,
    // The battle currently open, plus its chat. Kept separate from `battles` so
    // the detail view keeps working while the list re-sorts under it.
    chatMessages: [],
    myTeam: null,          // my submitted team for the open battle
    isLoadingTeam: false,
    // My own filtered protocol lines for the open battle, oldest round first.
    // The opponent's view is a separate field on each log doc that the rules let
    // us read but which we deliberately ignore — see the note in submitChoice.
    myLog: [],
    isResolvingTurn: false,

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

        set({ isLoadingBattles: true });

        battlesUnsub = onSnapshot(
            query(collection(db, battlesPath()), where('players', 'array-contains', userId)),
            (snapshot) => {
                const rows = snapshot.docs
                    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
                    .sort((a, b) => String(b.lastActivityAt || '').localeCompare(String(a.lastActivityAt || '')));
                set({ battles: rows, isLoadingBattles: false });
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
        set({ battles: [] });
    },

    /** Challenge a friend. Returns the new battle id, or null. */
    challengeFriend: async (friend) => {
        const authState = useAuthStore.getState();
        const showToast = useToastStore.getState().showToast;
        const { userId, isAnonymous } = authState;

        if (!db || !userId) return null;
        if (isAnonymous) {
            showToast('Create an account to battle.', 'warning');
            return null;
        }
        if (!friend?.userId || friend.userId === userId) return null;

        const myAvatar = authState.publicAvatar();
        const now = new Date().toISOString();

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
                format: BATTLE_FORMAT,
                level: BATTLE_LEVEL,
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
            showToast('Challenge sent!', 'success');
            return battleRef.id;
        } catch (err) {
            console.error('Failed to send the challenge:', err);
            showToast('Could not send the challenge.', 'error');
            return null;
        }
    },

    acceptChallenge: async (battleId) => get().setStatus(battleId, 'teamSelect', 'Challenge accepted — pick your team!'),
    declineChallenge: async (battleId) => get().setStatus(battleId, 'declined', null),
    cancelChallenge: async (battleId) => get().setStatus(battleId, 'cancelled', null),

    /** Status transitions the rules allow a client to make. */
    setStatus: async (battleId, status, successMessage) => {
        const showToast = useToastStore.getState().showToast;
        if (!db || !battleId) return false;
        try {
            await updateDoc(doc(db, battlesPath(), battleId), {
                status,
                lastActivityAt: new Date().toISOString(),
            });
            if (successMessage) showToast(successMessage, 'success');
            return true;
        } catch (err) {
            console.error(`Failed to move battle to '${status}':`, err);
            showToast('Could not update the battle.', 'error');
            return false;
        }
    },

    /**
     * Submit my team for a battle.
     *
     * The team is stored as battle-safe Showdown import text (see
     * `buildBattleTeamText` — it strips the `@ Nothing` placeholder and refuses a
     * moveless Pokémon), which is exactly what the phase-3 resolver hands to
     * `Teams.import()`. It lives in `battles/{id}/teams/{uid}`, readable only by
     * its owner, so the opponent can't inspect the sets.
     *
     * Batched with my `ready` flag: a team without the flag would stall the
     * battle, and a flag without a team would let it start with nothing.
     */
    submitTeam: async (battleId, team, teamName) => {
        const { userId } = useAuthStore.getState();
        const showToast = useToastStore.getState().showToast;
        if (!db || !userId || !battleId) return false;

        const members = Array.isArray(team) ? team.filter(Boolean) : [];
        const { text: showdownText, errors } = buildBattleTeamText(members);

        if (errors.length > 0) {
            const first = errors[0];
            showToast(
                first.reason === 'empty'
                    ? 'Pick a team with at least one Pokémon.'
                    : `${first.name} has no moves — a Pokémon needs at least one to battle.`,
                'warning',
            );
            return false;
        }

        try {
            const batch = writeBatch(db);
            batch.set(doc(db, `${battlesPath()}/${battleId}/teams`, userId), {
                showdownText,
                teamName: teamName || 'Team',
                // Sprite ids only — enough for the preview bar, and it reveals
                // nothing the opponent won't see at team preview anyway.
                sprites: members.slice(0, 6).map((member) => ({
                    id: member.id,
                    name: member.name || '',
                })),
                submittedAt: new Date().toISOString(),
            });
            batch.update(doc(db, battlesPath(), battleId), {
                [`ready.${userId}`]: true,
                lastActivityAt: new Date().toISOString(),
            });
            await batch.commit();

            showToast('Team locked in!', 'success');
            return true;
        } catch (err) {
            console.error('Failed to submit the team:', err);
            showToast('Could not submit your team.', 'error');
            return false;
        }
    },

    /** Both teams are in — flip it to active. */
    startBattle: async (battleId) => get().setStatus(battleId, 'active', null),

    deleteBattle: async (battleId) => {
        const showToast = useToastStore.getState().showToast;
        if (!db || !battleId) return false;
        try {
            await deleteDoc(doc(db, battlesPath(), battleId));
            return true;
        } catch (err) {
            console.error('Failed to delete the battle:', err);
            showToast('Could not remove the battle.', 'error');
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
        set({ chatMessages: [], myTeam: null, myLog: [], isResolvingTurn: false });
    },

    /**
     * Live listener on MY side of the battle transcript.
     *
     * `playerLogs/{uid}/rounds/*` is owner-read-only, so this can only ever see
     * this trainer's filtered view — the opponent's stream is unreachable by
     * construction, not by convention.
     */
    initLogListener: (battleId) => {
        const { userId } = useAuthStore.getState();
        if (!db || !battleId || !userId) return;
        if (logUnsub) logUnsub();

        logUnsub = onSnapshot(
            query(
                collection(db, `${battlesPath()}/${battleId}/playerLogs/${userId}/rounds`),
                orderBy('round', 'asc'),
            ),
            (snapshot) => {
                // Flatten the per-round documents into one ordered line list.
                const lines = snapshot.docs.flatMap((docSnap) => docSnap.data().lines || []);
                set({ myLog: lines });
            },
            (error) => console.error('Error loading the battle log:', error),
        );
    },

    /**
     * Send a choice ("move 1", "switch 2", "team 123456") to the authoritative
     * resolver.
     *
     * The client never computes an outcome: it posts the choice and the server
     * replays the battle. Passing no choice is a safe refresh — useful to nudge a
     * turn that the opponent has already answered.
     */
    submitChoice: async (battleId, choice = null) => {
        const showToast = useToastStore.getState().showToast;
        if (!battleId) return null;

        const token = await auth?.currentUser?.getIdToken?.();
        if (!token) {
            showToast('Sign in again to keep battling.', 'error');
            return null;
        }

        set({ isResolvingTurn: true });
        try {
            const response = await fetch(BATTLE_TURN_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ battleId, choice }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                // 503 means the deploy has no service-account configured — worth
                // saying plainly rather than as a generic failure.
                showToast(payload.error || 'Could not resolve the turn.', 'error');
                return null;
            }
            return payload;
        } catch (err) {
            console.error('Failed to reach the battle resolver:', err);
            showToast('Could not reach the battle server.', 'error');
            return null;
        } finally {
            set({ isResolvingTurn: false });
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
        const showToast = useToastStore.getState().showToast;
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
            showToast('Could not send the message.', 'error');
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
