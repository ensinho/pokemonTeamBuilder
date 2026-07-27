/**
 * Pure helpers for async battles: the format constants and, more importantly,
 * the derivation of *what the viewer may do right now* from a battle document.
 *
 * That derivation lives here rather than in the view because it's the part that
 * silently goes wrong — offering "accept" to the challenger, or a "start" button
 * before both teams are in. The security rules enforce the same transitions
 * server-side; this keeps the UI from ever proposing one that would be rejected.
 */

import { buildShowdownExportText } from './showdownExport';

/** Locked decisions — see docs/plans/friends-and-async-battles.md §2. */
export const BATTLE_FORMAT = 'gen9customgame';
export const BATTLE_LEVEL = 50;

/**
 * Turn a saved team into the Showdown paste the battle engine will import.
 *
 * `buildShowdownExportText` is reused verbatim (it already emits `Level: 50`),
 * but two of its outputs are not battle-safe, both verified against
 * `@pkmn/sim`'s `Teams.import()`:
 *
 *  1. A member with no held item is exported as `Name @ Nothing`. The parser
 *     keeps that as an item literally called "Nothing", which doesn't exist in
 *     the dex — so the Pokémon would go into battle holding garbage. A real
 *     Showdown paste just omits the `@` part.
 *  2. A member with no moves parses to `moves: []`. In a battle that Pokémon can
 *     do nothing but Struggle, which is never what the user meant — so this
 *     reports it instead of silently shipping a dud.
 *
 * The export util itself is left alone on purpose: its output is also what the
 * "copy team" feature hands to users, and its tests pin the current format.
 *
 * @returns {{text: string, errors: Array<{name: string, reason: string}>}}
 */
export const buildBattleTeamText = (teamMembers = []) => {
    const members = (Array.isArray(teamMembers) ? teamMembers : []).filter(Boolean);
    const errors = [];

    if (members.length === 0) {
        return { text: '', errors: [{ name: '', reason: 'empty' }] };
    }

    members.forEach((member) => {
        const moves = (member.customization?.moves || []).filter(Boolean);
        if (moves.length === 0) {
            errors.push({ name: member.name || 'Unknown', reason: 'noMoves' });
        }
    });

    // Drop the placeholder item so the paste is valid Showdown.
    const text = buildShowdownExportText(members)
        .split('\n')
        .map((line) => line.replace(/ @ Nothing$/, ''))
        .join('\n');

    return { text, errors };
};

export const BATTLE_STATUSES = ['pending', 'teamSelect', 'active', 'ended', 'declined', 'cancelled'];

/** The other player's uid, or null if this battle doesn't involve `userId`. */
export const battleOpponentId = (battle, userId) => {
    if (!battle || !userId) return null;
    const players = Array.isArray(battle.players) ? battle.players : [];
    if (!players.includes(userId)) return null;
    return players.find((id) => id !== userId) || null;
};

/**
 * Everything a view needs to render one battle from the viewer's perspective.
 *
 * Returns null when the battle isn't the viewer's — callers can treat that as
 * "don't render", rather than leaking someone else's battle into the UI.
 */
export const describeBattle = (battle, userId) => {
    const opponentId = battleOpponentId(battle, userId);
    if (!opponentId) return null;

    const status = BATTLE_STATUSES.includes(battle.status) ? battle.status : 'pending';
    const isChallenger = battle.challenger === userId;
    const ready = battle.ready || {};
    const myReady = ready[userId] === true;
    const theirReady = ready[opponentId] === true;

    const isOpen = status === 'pending' || status === 'teamSelect';
    const isOver = status === 'ended' || status === 'declined' || status === 'cancelled';

    // Who the battle is waiting on, for the list's "your move" hint.
    let waitingOn = null;
    if (status === 'pending') {
        waitingOn = isChallenger ? 'them' : 'me';
    } else if (status === 'teamSelect') {
        if (!myReady) waitingOn = 'me';
        else if (!theirReady) waitingOn = 'them';
    } else if (status === 'active') {
        // Resolver-owned, updated only once a round actually resolves — see
        // api/battle-turn.js. Empty/absent before the opening bootstrap runs.
        const awaiting = Array.isArray(battle.awaitingChoiceFrom) ? battle.awaitingChoiceFrom : [];
        if (awaiting.includes(userId)) waitingOn = 'me';
        else if (awaiting.includes(opponentId)) waitingOn = 'them';
    }

    return {
        battleId: battle.id,
        status,
        opponentId,
        opponentName: battle.playerNames?.[opponentId] || null,
        opponentAvatar: battle.playerAvatars?.[opponentId] || null,
        isChallenger,
        myReady,
        theirReady,
        isOpen,
        isOver,
        waitingOn,

        // Actions, matching the transitions firestore.rules permits.
        canAccept: status === 'pending' && !isChallenger,
        canDecline: status === 'pending' && !isChallenger,
        canCancel: status === 'pending' && isChallenger,
        canSubmitTeam: status === 'teamSelect' && !myReady,
        // Either player may start it, but only once both teams are locked in.
        canStart: status === 'teamSelect' && myReady && theirReady,
        canDelete: isOver || status === 'pending',
    };
};

/**
 * Which translation keys describe the "needs attention" browser notification
 * for this battle, from the viewer's own `describeBattle` result — or `null`
 * when nothing currently needs a nudge.
 *
 * Returns keys/params rather than resolved strings so this stays pure and
 * testable without a `t()`; the caller (a hook, which does have one) resolves
 * them. Callers must only fire a notification on the *transition* into a
 * non-null result, not on every render — this alone doesn't debounce.
 */
export const battleAttentionNotice = (view) => {
    if (!view || view.waitingOn !== 'me') return null;
    const params = { name: view.opponentName || null };

    if (view.status === 'pending') {
        return { titleKey: 'battle.notifyChallengeTitle', bodyKey: 'battle.notifyChallengeBody', params };
    }
    if (view.status === 'teamSelect') {
        return { titleKey: 'battle.notifyTeamTitle', bodyKey: 'battle.notifyTeamBody', params };
    }
    if (view.status === 'active') {
        return { titleKey: 'battle.notifyTurnTitle', bodyKey: 'battle.notifyTurnBody', params };
    }
    return null;
};

/**
 * Sort key for the battle list: things needing the viewer's attention first,
 * then live battles, then everything finished — each group newest-first.
 */
export const battleSortRank = (described) => {
    if (!described) return 99;
    if (described.waitingOn === 'me') return 0;
    if (described.status === 'active') return 1;
    if (described.waitingOn === 'them') return 2;
    if (described.isOver) return 4;
    return 3;
};
