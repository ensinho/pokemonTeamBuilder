import { getAdminAuth, getAppId } from './serverAuth.js';
import { sendNotificationEmail } from './mailer.js';
import { battleUrl, sendPushToUser } from './webPush.js';

/**
 * "It's your turn" email — the highest-value phase-5 item per
 * docs/plans/friends-and-async-battles.md §6. It needs no cron job and no
 * queue: it rides the same `api/battle-turn.js` request that just changed
 * whose turn it is, the moment `publishLog` computes a fresh `awaitingUids`.
 *
 * Split the same way the resolver itself is: pure pieces that are cheap to
 * test (who to notify, what the email says) plus a thin I/O wrapper that
 * looks up the address and sends it.
 *
 * Since 2026-09-21 the same call also fires a **Web Push** (`./webPush.js`),
 * which is the only one of the two that arrives while the app is closed — an
 * email is a nudge, a push is the notification the screenshot in the bug report
 * was asking for. Both are best-effort and neither can fail the turn.
 */

/**
 * Who, if anyone, should be nudged for this round transition.
 *
 * Never the caller: they just posted this very request, so they're
 * necessarily in the app right now and don't need telling. This one check is
 * the entire throttle — it's why a back-and-forth played live, both tabs
 * open, never spams either side, while an opponent who left hours ago always
 * gets exactly one email per round that becomes theirs.
 */
export const pickAwaitingTarget = (awaitingUids, callerUid) => (
    (awaitingUids || []).find((id) => id && id !== callerUid) || null
);

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

const TEMPLATES = {
    en: {
        subject: (name) => `${name} is waiting for your move!`,
        line: (name) => `It's your turn in your battle against ${name}.`,
        cta: 'Open the battle',
        fallbackName: 'your opponent',
    },
    pt: {
        subject: (name) => `${name} está esperando sua jogada!`,
        line: (name) => `É a sua vez na sua batalha contra ${name}.`,
        cta: 'Abrir a batalha',
        fallbackName: 'seu oponente',
    },
};

/** Subject/text/html for the nudge. Pure — no network, no Firebase. */
export const buildTurnEmail = ({ lang, callerName, battleUrl }) => {
    const template = TEMPLATES[lang] || TEMPLATES.en;
    const name = callerName || template.fallbackName;
    return {
        subject: template.subject(name),
        text: `${template.line(name)}\n\n${template.cta}: ${battleUrl}`,
        html: `<p>${escapeHtml(template.line(name))}</p>`
            + `<p><a href="${escapeHtml(battleUrl)}">${escapeHtml(template.cta)}</a></p>`,
    };
};

const APP_URL = process.env.PUBLIC_APP_URL || 'https://pokemonbuilder.app';

/**
 * Best-effort — never throws. A failed lookup or a misconfigured mailer must
 * not break the battle turn it rides along with; the resolver already
 * committed before this runs.
 */
export const notifyAwaitingPlayer = async ({ db, battleId, awaitingUids, callerUid, callerName }) => {
    try {
        const targetUid = pickAwaitingTarget(awaitingUids, callerUid);
        if (!targetUid) return;

        const [user, prefsSnap] = await Promise.all([
            getAdminAuth().getUser(targetUid).catch(() => null),
            db.doc(`artifacts/${getAppId()}/users/${targetUid}/profile/preferences`).get().catch(() => null),
        ]);
        // Push first, and independently of the email: a trainer with no
        // address on file (or with email delivery misconfigured) is exactly the
        // one who most needs the notification on their phone.
        await sendPushToUser({
            db,
            appId: getAppId(),
            uid: targetUid,
            kind: 'battleTurn',
            params: { name: callerName || null },
            url: battleUrl(battleId),
            topic: 'battles',
        });

        if (!user?.email) return;

        const lang = prefsSnap?.data()?.language === 'pt' ? 'pt' : 'en';
        const email = buildTurnEmail({
            lang,
            callerName,
            // Real path, not `#/battles/...`: the router stopped being a
            // HashRouter on 2026-07-01 and the legacy rewrite only survives as
            // a shim for links already in the wild.
            battleUrl: `${APP_URL}${battleUrl(battleId)}`,
        });

        await sendNotificationEmail({ to: user.email, ...email });
    } catch (err) {
        console.error('Could not send the "your turn" notification:', err);
    }
};

/**
 * Who, if anyone, should be pushed about a battle that just changed *outside*
 * the turn resolver — a challenge sent, a team locked in. Those transitions are
 * written straight from the browser (`useBattlesStore`), so unlike a turn there
 * is no server request they can ride; `api/battle-notify.js` is that request,
 * and this is the whole of its decision.
 *
 * Pure, and deliberately strict: the caller may only ever cause a push to the
 * *other* player, and only for a state the stored document actually confirms.
 * A client cannot talk this endpoint into notifying anyone else, or into
 * notifying at all when nothing is owed.
 *
 * @returns {{uid: string, kind: string}|null}
 */
export const pickBattlePushTarget = (battle, callerUid) => {
    if (!battle || !callerUid) return null;
    const players = Array.isArray(battle.players) ? battle.players : [];
    if (!players.includes(callerUid)) return null;

    const opponent = players.find((id) => id && id !== callerUid);
    if (!opponent) return null;

    if (battle.status === 'pending') {
        // Only the challenger's own "I just sent this" call counts — the invite
        // is theirs, and the other side has nothing to announce yet.
        return battle.challenger === callerUid ? { uid: opponent, kind: 'battleChallenge' } : null;
    }

    if (battle.status === 'teamSelect') {
        // A random battle deals both teams server-side, so nobody owes one.
        const isRandom = battle.mode === 'random';
        const ready = battle.ready || {};
        if (isRandom || ready[opponent] === true) return null;
        return { uid: opponent, kind: 'battleTeam' };
    }

    // `active` is the resolver's to announce (notifyAwaitingPlayer, above);
    // anything finished needs no nudge at all.
    return null;
};

/**
 * Push the other player about a challenge or a pending team. Best-effort, like
 * everything else here — and push-only: an email for "someone challenged you"
 * would be noise next to the one that already says it's your turn.
 */
export const notifyBattleEvent = async ({ db, battle, battleId, callerUid }) => {
    const target = pickBattlePushTarget(battle, callerUid);
    if (!target) return { sent: 0, removed: 0, failed: 0 };

    const callerName = battle.playerNames?.[callerUid] || null;
    return sendPushToUser({
        db,
        appId: getAppId(),
        uid: target.uid,
        kind: target.kind,
        params: { name: callerName },
        url: battleUrl(battleId),
        topic: 'battles',
    });
};
