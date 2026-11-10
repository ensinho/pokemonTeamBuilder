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
 * necessarily in the app right now. That is NOT a throttle on its own — a
 * round is resolved by whoever moves second, so `awaitingUids` is usually both
 * players and the *other* one is picked every single round, even when they are
 * sitting in the battle screen. Until 2026-11-10 that meant one email per round
 * per player and a Gmail "Daily user sending limit exceeded" (550 5.4.5), which
 * also silenced the admin replies sharing the mailbox. The email is therefore
 * gated by `decideEmailSlot` below; the push is not (it is free, and the client
 * already drops it for a visible tab).
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

// One email per recipient per battle every EMAIL_COOLDOWN_MS: a trainer who is
// away gets told once and a link that stays valid, not one per round. And a
// hard ceiling for the whole mailbox per UTC day, under Gmail's 500 (a Workspace
// account allows 2000) so the admin-reply endpoint keeps working.
export const EMAIL_COOLDOWN_MS = 3 * 60 * 60 * 1000;
export const EMAIL_DAILY_CAP = 300;

/**
 * Pure: may this recipient be emailed right now?
 *
 * @param {{lastAt?: string|null, sentToday?: number, now?: number}} input
 * @returns {{ok: boolean, reason?: 'cooldown'|'daily-cap'}}
 */
export const decideEmailSlot = ({ lastAt, sentToday = 0, now = Date.now() }) => {
    if (sentToday >= EMAIL_DAILY_CAP) return { ok: false, reason: 'daily-cap' };
    const last = lastAt ? Date.parse(lastAt) : NaN;
    if (Number.isFinite(last) && now - last < EMAIL_COOLDOWN_MS) return { ok: false, reason: 'cooldown' };
    return { ok: true };
};

/**
 * Claim the right to send one email, atomically, before sending it. The claim
 * is recorded even if the send then fails — retrying into a mailbox that has
 * just said "limit exceeded" only digs deeper. Server-only documents: nothing
 * under `battles/{id}/secret` or `mailQuota` is reachable by a client rule.
 */
export const claimEmailSlot = async ({ db, appId, battleId, uid, now = Date.now() }) => {
    const day = new Date(now).toISOString().slice(0, 10);
    const base = `artifacts/${appId}`;
    const mailRef = db.doc(`${base}/battles/${battleId}/secret/mail`);
    const quotaRef = db.doc(`${base}/mailQuota/${day}`);
    return db.runTransaction(async (tx) => {
        const [mailSnap, quotaSnap] = await Promise.all([tx.get(mailRef), tx.get(quotaRef)]);
        const lastAt = mailSnap.exists ? mailSnap.data()?.lastEmailAt?.[uid] : null;
        const sentToday = quotaSnap.exists ? Number(quotaSnap.data()?.count) || 0 : 0;
        const verdict = decideEmailSlot({ lastAt, sentToday, now });
        if (!verdict.ok) return verdict;
        tx.set(mailRef, { lastEmailAt: { [uid]: new Date(now).toISOString() } }, { merge: true });
        tx.set(quotaRef, { count: sentToday + 1, day }, { merge: true });
        return verdict;
    });
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

        const slot = await claimEmailSlot({ db, appId: getAppId(), battleId, uid: targetUid });
        if (!slot.ok) {
            if (slot.reason === 'daily-cap') console.warn('Skipped a "your turn" email: the daily mail cap is reached.');
            return;
        }

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
