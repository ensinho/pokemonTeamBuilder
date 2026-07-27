import nodemailer from 'nodemailer';

/**
 * Shared, best-effort mail transport for server-triggered notifications (turn
 * nudges, and later phase-5 items). `api/send-admin-reply.js` predates this and
 * keeps its own copy of the same transport config plus an admin-only gate — that
 * one is for a human composing a reply; this one is for the resolver itself,
 * with no admin check, since the recipient is just a battler.
 *
 * Reuses the same env vars as the admin-reply endpoint (`ADMIN_EMAIL_FROM`,
 * `ADMIN_EMAIL_APP_PASSWORD`, `SMTP_*`) so a deploy that already sends admin
 * replies needs no new secret for this.
 */
const createTransport = () => {
    const password = process.env.ADMIN_EMAIL_APP_PASSWORD?.trim();
    if (!password) return null;

    const emailFrom = process.env.ADMIN_EMAIL_FROM || 'pokemonteambuilderadmin@gmail.com';
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false',
        auth: { user: emailFrom, pass: password },
    });
};

/**
 * Never throws — a misconfigured or failing mailer must not break whatever
 * triggered the notification (a resolved battle turn, here).
 *
 * @returns {Promise<boolean>} whether the email was actually sent.
 */
export const sendNotificationEmail = async ({ to, subject, text, html }) => {
    if (!to) return false;

    const transporter = createTransport();
    if (!transporter) {
        console.warn('Skipped a notification email: ADMIN_EMAIL_APP_PASSWORD is not configured.');
        return false;
    }

    const emailFrom = process.env.ADMIN_EMAIL_FROM || 'pokemonteambuilderadmin@gmail.com';
    const emailFromName = process.env.ADMIN_EMAIL_FROM_NAME || 'Pokemon Team Builder';

    try {
        await transporter.sendMail({
            from: `"${emailFromName}" <${emailFrom}>`,
            to,
            subject,
            text,
            html,
        });
        return true;
    } catch (err) {
        console.error('Failed to send a notification email:', err);
        return false;
    }
};
