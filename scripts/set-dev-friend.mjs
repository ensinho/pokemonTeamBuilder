#!/usr/bin/env node
/**
 * Grant or revoke the exclusive "Amigo do Dev" (`dev_friend`) pocket badge for
 * any user by email or UID. Updates Firebase Auth Custom Claims (`devFriend`),
 * bumps `artifacts/{appId}/authMeta/{uid}` for instant cross-device refresh,
 * and stamps `specialBadge` on `artifacts/{appId}/publicProfiles/{uid}` so the
 * pocket emblem renders everywhere (Profile, Modal, Forum, Chat, Challenge).
 *
 * Usage:
 *   node scripts/set-dev-friend.mjs --email friend@example.com --grant
 *   node scripts/set-dev-friend.mjs --email friend@example.com --revoke
 *   node scripts/set-dev-friend.mjs --uid <uid> --grant
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
    const args = { email: '', uid: '', grant: true, help: false };
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === '--help' || token === '-h') args.help = true;
        else if (token === '--email') args.email = String(argv[++i] || '').trim().toLowerCase();
        else if (token === '--uid') args.uid = String(argv[++i] || '').trim();
        else if (token === '--grant') args.grant = true;
        else if (token === '--revoke') args.grant = false;
    }
    return args;
}

function printUsage() {
    console.log([
        'Usage:',
        '  node scripts/set-dev-friend.mjs --email <email> [--grant | --revoke]',
        '  node scripts/set-dev-friend.mjs --uid <uid>     [--grant | --revoke]',
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
        devFriend: args.grant,
        roleVersion,
    };

    await auth.setCustomUserClaims(user.uid, nextClaims);

    await db.doc(`artifacts/${appId}/authMeta/${user.uid}`).set({
        roleVersion,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Admin crest takes precedence if the account is also an admin.
    const nextSpecialBadge = nextClaims.admin === true
        ? 'admin'
        : (args.grant ? 'dev_friend' : null);

    await db.doc(`artifacts/${appId}/publicProfiles/${user.uid}`).set({
        specialBadge: nextSpecialBadge,
    }, { merge: true });

    console.log(JSON.stringify({
        ok: true,
        projectId,
        appId,
        uid: user.uid,
        email: user.email || null,
        devFriend: args.grant,
        specialBadge: nextSpecialBadge,
        roleVersion,
    }, null, 2));
}

main().catch((err) => {
    console.error('Failed to update dev_friend badge:', err?.message || err);
    process.exit(1);
});
