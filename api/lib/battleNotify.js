import { getAdminAuth, getAppId } from './serverAuth.js';
import { sendNotificationEmail } from './mailer.js';

/**
 * "It's your turn" email — the highest-value phase-5 item per
 * docs/plans/friends-and-async-battles.md §6. It needs no cron job and no
 * queue: it rides the same `api/battle-turn.js` request that just changed
 * whose turn it is, the moment `publishLog` computes a fresh `awaitingUids`.
 *
 * Split the same way the resolver itself is: pure pieces that are cheap to
 * test (who to notify, what the email says) plus a thin I/O wrapper that
 * looks up the address and sends it.
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
        if (!user?.email) return;

        const lang = prefsSnap?.data()?.language === 'pt' ? 'pt' : 'en';
        const email = buildTurnEmail({
            lang,
            callerName,
            battleUrl: `${APP_URL}/#/battles/${battleId}`,
        });

        await sendNotificationEmail({ to: user.email, ...email });
    } catch (err) {
        console.error('Could not send the "your turn" notification:', err);
    }
};
