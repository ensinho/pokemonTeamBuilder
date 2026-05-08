const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

const adminEmailAppPassword = defineSecret('ADMIN_EMAIL_APP_PASSWORD');
const adminEmails = defineString('ADMIN_EMAILS', { default: 'enzopo625@gmail.com' });
const emailFrom = defineString('ADMIN_EMAIL_FROM', { default: 'pokemonteambuilderadmin@gmail.com' });
const emailFromName = defineString('ADMIN_EMAIL_FROM_NAME', { default: 'Pokemon Team Builder' });
const allowedOrigins = defineString('EMAIL_ALLOWED_ORIGINS', {
  default: 'https://ensinho.github.io,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173',
});
const smtpHost = defineString('SMTP_HOST', { default: 'smtp.gmail.com' });
const smtpPort = defineString('SMTP_PORT', { default: '465' });
const smtpSecure = defineString('SMTP_SECURE', { default: 'true' });

const MAX_TEXT_LENGTH = 12000;
const MAX_HTML_LENGTH = 80000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const splitList = (value) => String(value || '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

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

const setCorsHeaders = (req, res) => {
  const origin = req.get('origin') || '';
  const origins = splitList(allowedOrigins.value());
  const allowAll = origins.includes('*');
  const normalizedOrigin = origin.toLowerCase();
  const originAllowed = !origin || allowAll || origins.includes(normalizedOrigin);

  if (origin && originAllowed) {
    res.set('Access-Control-Allow-Origin', origin);
  } else if (!origin && origins[0]) {
    res.set('Access-Control-Allow-Origin', origins[0]);
  }

  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Max-Age', '3600');

  return originAllowed;
};

const getBearerToken = (req) => {
  const authHeader = req.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
};

const assertAdmin = async (req) => {
  const token = getBearerToken(req);
  if (!token) {
    const error = new Error('Missing Firebase ID token.');
    error.status = 401;
    throw error;
  }

  const decodedToken = await admin.auth().verifyIdToken(token, true);
  const email = String(decodedToken.email || '').trim().toLowerCase();
  const allowedAdminEmails = splitList(adminEmails.value());

  if (!email || !allowedAdminEmails.includes(email)) {
    const error = new Error('Admin access required.');
    error.status = 403;
    throw error;
  }

  return decodedToken;
};

const validatePayload = (payload) => {
  const to = String(payload.to || '').trim().toLowerCase();
  const subject = String(payload.subject || '').trim().slice(0, 160);
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

const createTransport = () => nodemailer.createTransport({
  host: smtpHost.value(),
  port: Number(smtpPort.value()) || 465,
  secure: String(smtpSecure.value()).toLowerCase() !== 'false',
  auth: {
    user: emailFrom.value(),
    pass: adminEmailAppPassword.value(),
  },
});

exports.sendAdminReply = onRequest(
  {
    region: 'us-central1',
    secrets: [adminEmailAppPassword],
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (req, res) => {
    const originAllowed = setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
      res.status(originAllowed ? 204 : 403).send('');
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
      await assertAdmin(req);

      const payload = parseRequestBody(req.body);
      const validation = validatePayload(payload);
      if (validation.error) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const transporter = createTransport();
      const info = await transporter.sendMail({
        from: `"${emailFromName.value()}" <${emailFrom.value()}>`,
        replyTo: emailFrom.value(),
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
);