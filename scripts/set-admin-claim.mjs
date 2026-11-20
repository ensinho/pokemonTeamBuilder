#!/usr/bin/env node
/**
 * Provision or revoke the Firebase Auth `admin` Custom Claim for a user and
 * bump `artifacts/{appId}/authMeta/{uid}` so every active session across all
 * devices immediately refreshes its ID token.
 *
 * Usage:
 *   node scripts/set-admin-claim.mjs --email user@example.com --grant
 *   node scripts/set-admin-claim.mjs --email user@example.com --revoke
 *   node scripts/set-admin-claim.mjs --uid <uid> --revoke --revoke-tokens
 *
 * Requires the same Firebase Admin credentials used by `api/_lib/serverAuth.js`:
 *   - FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)
 *   - Optional: VITE_APP_ID / APP_ID (defaults to `pokemonTeamBuilder`)
 */

import fs from 'node:fs';
import path from 'node:path';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminFirestore, getAppId, getFirebaseProjectId } from '../api/_lib/serverAuth.js';

function loadLocalEnv() {
    const candidates = ['.env.local', '.env', 'functions/.env.local', 'functions/.env'];
    for (const file of candidates) {
        const fullPath = path.resolve(process.cwd(), file);
        if (!fs.existsSync(fullPath)) continue;
        const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith('#')) continue;
            const eqIndex = line.indexOf('=');
            if (eqIndex <= 0) continue;
            const key = line.slice(0, eqIndex).trim();
            let value = line.slice(eqIndex + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
                value = value.slice(1, -1);
            }
            if (!(key in process.env)) {
                process.env[key] = value;
            }
        }
    }
}

function parseArgs(argv) {
    const args = { email: '', uid: '', grant: true, revokeTokens: false, help: false };
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === '--help' || token === '-h') args.help = true;
        else if (token === '--email') args.email = String(argv[++i] || '').trim().toLowerCase();
        else if (token === '--uid') args.uid = String(argv[++i] || '').trim();
        else if (token === '--grant') args.grant = true;
        else if (token === '--revoke') args.grant = false;
        else if (token === '--revoke-tokens') args.revokeTokens = true;
    }
    return args;
}

function printUsage() {
    console.log([
        'Usage:',
        '  node scripts/set-admin-claim.mjs --email <email> [--grant | --revoke] [--revoke-tokens]',
        '  node scripts/set-admin-claim.mjs --uid <uid>     [--grant | --revoke] [--revoke-tokens]',
    ].join('\n'));
}

async function main() {
    loadLocalEnv();
    const args = parseArgs(process.argv.slice(2));
    if (args.help || (!args.email && !args.uid)) {
        printUsage();
        process.exit(args.help ? 0 : 1);
    }

    const auth = getAdminAuth();
    const db = getAdminFirestore();
    const appId = getAppId();
    const projectId = getFirebaseProjectId();

    const user = args.uid
        ? await auth.getUser(args.uid)
        : await auth.getUserByEmail(args.email);

    const existingClaims = user.customClaims && typeof user.customClaims === 'object'
        ? { ...user.customClaims }
        : {};
    const roleVersion = Date.now();
    const nextClaims = {
        ...existingClaims,
        admin: args.grant,
        roleVersion,
    };

    await auth.setCustomUserClaims(user.uid, nextClaims);

    if (!args.grant && args.revokeTokens) {
        await auth.revokeRefreshTokens(user.uid);
    }

    await db.doc(`artifacts/${appId}/authMeta/${user.uid}`).set({
        roleVersion,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    const nextSpecialBadge = args.grant
        ? 'admin'
        : (nextClaims.devFriend === true ? 'dev_friend' : null);
    await db.doc(`artifacts/${appId}/publicProfiles/${user.uid}`).set({
        specialBadge: nextSpecialBadge,
    }, { merge: true });

    console.log(JSON.stringify({
        ok: true,
        projectId,
        appId,
        uid: user.uid,
        email: user.email || null,
        emailVerified: Boolean(user.emailVerified),
        admin: args.grant,
        specialBadge: nextSpecialBadge,
        roleVersion,
        refreshTokensRevoked: Boolean(!args.grant && args.revokeTokens),
    }, null, 2));

    if (args.grant && !user.emailVerified) {
        console.warn('Warning: this account does not have emailVerified=true yet; Firestore rules require email_verified == true.');
    }
}

main().catch((err) => {
    console.error('Failed to update admin claim:', err?.message || err);
    process.exit(1);
});
