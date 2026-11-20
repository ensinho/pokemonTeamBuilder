import nodemailer from 'nodemailer';
import { HttpError, setCorsHeaders, verifyCaller } from './_lib/serverAuth.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT_LENGTH = 12000;
const MAX_HTML_LENGTH = 80000;

const cleanHeaderValue = (value, fallback = '') => String(value || fallback)
    .replace(/[\r\n]+/g, ' ')
    .trim();

const parseRequestBody = (body) => {
    if (!body) return {};
    if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        } catch (_) {
            return {};
        }
    }
    return body;
};

const verifyAdminCaller = async (req) => {
    const caller = await verifyCaller(req);
    if (!caller.isAdmin) {
        throw new HttpError(403, 'Admin access required.');
    }
    return caller;
};

const validatePayload = (payload) => {
    const to = String(payload.to || '').trim().toLowerCase();
    const subject = cleanHeaderValue(payload.subject, '').slice(0, 160);
    const text = String(payload.text || '').trim();
    const html = String(payload.html || '').trim();

    if (!EMAIL_REGEX.test(to)) {
        return { error: 'Recipient email is invalid.' };
    }
    if (!subject) {
        return { error: 'Subject is required.' };
    }
    if (!text || text.length > MAX_TEXT_LENGTH) {
        return { error: 'Plain text body is required or too large.' };
    }
    if (!html || html.length > MAX_HTML_LENGTH) {
        return { error: 'HTML body is required or too large.' };
    }

    return { to, subject, text, html };
};

const createTransport = () => {
    const emailFrom = process.env.ADMIN_EMAIL_FROM || 'pokemonteambuilderadmin@gmail.com';
    const password = process.env.ADMIN_EMAIL_APP_PASSWORD?.trim();

    if (!password) {
        throw new HttpError(500, 'Email password is not configured.');
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false',
        auth: {
            user: emailFrom,
            pass: password,
        },
    });
};

export default async function handler(req, res) {
    const originAllowed = setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        res.status(originAllowed ? 204 : 403).end();
        return;
    }

    if (!originAllowed) {
        res.status(403).json({ error: 'Origin is not allowed.' });
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed.' });
        return;
    }

    try {
        await verifyAdminCaller(req);

        const payload = parseRequestBody(req.body);
        const validation = validatePayload(payload);
        if (validation.error) {
            res.status(400).json({ error: validation.error });
            return;
        }

        const emailFrom = process.env.ADMIN_EMAIL_FROM || 'pokemonteambuilderadmin@gmail.com';
        const emailFromName = cleanHeaderValue(process.env.ADMIN_EMAIL_FROM_NAME, 'PokemonBuilder');
        const transporter = createTransport();
        const info = await transporter.sendMail({
            from: `"${emailFromName}" <${emailFrom}>`,
            replyTo: emailFrom,
            to: validation.to,
            subject: validation.subject,
            text: validation.text,
            html: validation.html,
        });

        res.status(200).json({ ok: true, messageId: info.messageId || null, suggestionUpdated: false });
    } catch (err) {
        console.error('Failed to send admin reply email:', err);
        res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not send email.' });
    }
}
