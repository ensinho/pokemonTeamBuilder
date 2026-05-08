import { createRemoteJWKSet, jwtVerify } from 'jose';
import nodemailer from 'nodemailer';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT_LENGTH = 12000;
const MAX_HTML_LENGTH = 80000;
const FIREBASE_CERTS = createRemoteJWKSet(
    new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

const splitList = (value) => String(value || '')
    .split(',')
    .map(entry => entry.trim().toLowerCase())
    .filter(Boolean);

const cleanHeaderValue = (value, fallback = '') => String(value || fallback)
    .replace(/[\r\n]+/g, ' ')
    .trim();

const getFirebaseProjectId = () => process.env.FIREBASE_PROJECT_ID
    || process.env.VITE_FIREBASE_PROJECT_ID
    || 'pokemonbuilder-8f80d';

const getAllowedOrigins = () => splitList(process.env.EMAIL_ALLOWED_ORIGINS || '')
    .concat(['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000']);

const setCorsHeaders = (req, res) => {
    const origin = req.headers.origin || '';
    const allowedOrigins = getAllowedOrigins();
    const normalizedOrigin = origin.toLowerCase();
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}`.toLowerCase() : '';
    const isAllowed = !origin
        || allowedOrigins.includes('*')
        || allowedOrigins.includes(normalizedOrigin)
        || (vercelUrl && normalizedOrigin === vercelUrl);

    if (origin && isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '3600');

    return isAllowed;
};

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

const getBearerToken = (req) => {
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : '';
};

const verifyAdminToken = async (req) => {
    const token = getBearerToken(req);
    if (!token) {
        const error = new Error('Missing Firebase ID token.');
        error.status = 401;
        throw error;
    }

    const projectId = getFirebaseProjectId();
    const { payload } = await jwtVerify(token, FIREBASE_CERTS, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
    });

    const email = String(payload.email || '').trim().toLowerCase();
    const allowedAdminEmails = splitList(process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || 'enzopo625@gmail.com');
    if (!email || !allowedAdminEmails.includes(email)) {
        const error = new Error('Admin access required.');
        error.status = 403;
        throw error;
    }

    return payload;
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
    const password = process.env.ADMIN_EMAIL_APP_PASSWORD;

    if (!password) {
        const error = new Error('Email password is not configured.');
        error.status = 500;
        throw error;
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
        await verifyAdminToken(req);

        const payload = parseRequestBody(req.body);
        const validation = validatePayload(payload);
        if (validation.error) {
            res.status(400).json({ error: validation.error });
            return;
        }

        const emailFrom = process.env.ADMIN_EMAIL_FROM || 'pokemonteambuilderadmin@gmail.com';
        const emailFromName = cleanHeaderValue(process.env.ADMIN_EMAIL_FROM_NAME, 'Pokemon Team Builder');
        const transporter = createTransport();
        const info = await transporter.sendMail({
            from: `"${emailFromName}" <${emailFrom}>`,
            replyTo: emailFrom,
            to: validation.to,
            subject: validation.subject,
            text: validation.text,
            html: validation.html,
        });

        res.status(200).json({ ok: true, messageId: info.messageId || null });
    } catch (err) {
        console.error('Failed to send admin reply email:', err);
        res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not send email.' });
    }
}