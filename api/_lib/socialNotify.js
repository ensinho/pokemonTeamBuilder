// The Pokégear (2026-11-06, docs/plans/social-heart.md A3/A4): the in-app
// inbox at `users/{uid}/inbox`, written only here (admin SDK; the rules let
// the owner read it and mark it read, never write it).
//
// The client sends ids, never recipients: everything about who is told what
// is re-derived from the stored documents, so the worst a caller can do is
// ask for a notification its own post already justifies.

import { sendPushToUser } from './webPush.js';

const MAX_MENTIONS = 5;
const SNIPPET = 120;

/** `@name` tokens in a text, lower-cased and unique (names may hold letters, digits, _ . -). */
export function parseMentions(text = '') {
    const found = new Set();
    for (const match of String(text).matchAll(/(^|[^\w@])@([\p{L}\p{N}_.-]{2,40})/gu)) {
        found.add(match[2].toLowerCase().replace(/[.-]+$/, ''));
        if (found.size >= MAX_MENTIONS) break;
    }
    return [...found];
}

/** What every entry says about who acted. */
export const actorOf = (doc) => ({
    fromUid: doc.createdBy,
    fromName: String(doc.creatorName || 'Trainer').slice(0, 40),
    fromAvatar: Number.isInteger(doc.creatorAvatar) ? doc.creatorAvatar : null,
    fromSprite: typeof doc.creatorTrainerSprite === 'string' ? doc.creatorTrainerSprite : null,
});

export const snippetOf = (text) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, SNIPPET);

/**
 * Recipients of a new forum message, by reason, never the author: the trainer
 * it replies to, the trainers it mentions, and the topic's author (a comment
 * on your post). One reason per trainer — a reply beats a mention beats a
 * comment.
 */
export function messageRecipients({ authorUid, replyToUid = null, mentionUids = [], topicAuthorUid = null }) {
    const byUid = new Map();
    const add = (uid, kind) => {
        if (!uid || uid === authorUid || uid === 'system' || byUid.has(uid)) return;
        byUid.set(uid, kind);
    };
    add(replyToUid, 'reply');
    mentionUids.forEach((uid) => add(uid, 'mention'));
    add(topicAuthorUid, 'comment');
    return [...byUid.entries()].map(([uid, kind]) => ({ uid, kind }));
}

const inboxPath = (appId, uid) => `artifacts/${appId}/users/${uid}/inbox`;
const topicsPath = (appId) => `artifacts/${appId}/public/data/forumTopics`;

/** A new message (reply / mention / comment on your post). */
export async function notifyForumMessage({ db, appId, callerUid, topicId, messageId }) {
    const topicRef = db.doc(`${topicsPath(appId)}/${topicId}`);
    const msgRef = db.doc(`${topicsPath(appId)}/${topicId}/messages/${messageId}`);
    const [topicSnap, msgSnap] = await Promise.all([topicRef.get(), msgRef.get()]);
    if (!topicSnap.exists || !msgSnap.exists) return { sent: 0 };
    const msg = msgSnap.data();
    if (msg.createdBy !== callerUid) return { sent: 0 };
    const topic = topicSnap.data();

    let replyToUid = null;
    if (msg.replyTo?.messageId) {
        const parent = await db.doc(`${topicsPath(appId)}/${topicId}/messages/${msg.replyTo.messageId}`).get();
        replyToUid = parent.exists ? parent.data().createdBy : null;
    }
    const names = parseMentions(msg.text);
    const mentionUids = [];
    if (names.length) {
        const profiles = await db.collection(`artifacts/${appId}/publicProfiles`).where('displayNameLower', 'in', names).limit(MAX_MENTIONS).get();
        profiles.forEach((p) => mentionUids.push(p.id));
    }
    // A comment on your own post: only the post's opening thread, and one
    // entry per post that keeps counting instead of one per comment.
    const recipients = messageRecipients({ authorUid: callerUid, replyToUid, mentionUids, topicAuthorUid: topic.createdBy });
    const actor = actorOf(msg);
    const now = new Date().toISOString();
    const base = { ...actor, topicId, messageId, topicTitle: String(topic.title || '').slice(0, 80), snippet: snippetOf(msg.text), createdAt: now, read: false };

    await Promise.all(recipients.map(async ({ uid, kind }) => {
        const col = db.collection(inboxPath(appId, uid));
        if (kind === 'comment') {
            const ref = col.doc(`comment_${topicId}`);
            const prev = await ref.get();
            await ref.set({ ...base, kind, count: (prev.exists && !prev.data().read ? (prev.data().count || 1) : 0) + 1 });
        } else {
            await col.add({ ...base, kind });
            await sendPushToUser({
                db, appId, uid, topic: 'social',
                kind: kind === 'reply' ? 'socialReply' : 'socialMention',
                params: { name: actor.fromName },
                url: `/feed?topic=${encodeURIComponent(topicId)}&c=${encodeURIComponent(messageId)}`,
            });
        }
    }));
    return { sent: recipients.length };
}

/** A reaction on a post or comment: one entry per target that keeps counting. */
export async function notifyReaction({ db, appId, callerUid, topicId, messageId = null }) {
    const ref = messageId
        ? db.doc(`${topicsPath(appId)}/${topicId}/messages/${messageId}`)
        : db.doc(`${topicsPath(appId)}/${topicId}`);
    const snap = await ref.get();
    if (!snap.exists) return { sent: 0 };
    const data = snap.data();
    const kind = data.reactions?.[callerUid];
    if (!kind || !data.createdBy || data.createdBy === callerUid || data.createdBy === 'system') return { sent: 0 };
    const profile = await db.doc(`artifacts/${appId}/publicProfiles/${callerUid}`).get();
    const p = profile.exists ? profile.data() : {};
    await db.doc(`${inboxPath(appId, data.createdBy)}/react_${topicId}_${messageId || 'post'}`).set({
        kind: 'reaction',
        reaction: kind,
        count: Object.keys(data.reactions || {}).length,
        fromUid: callerUid,
        fromName: String(p.displayName || 'Trainer').slice(0, 40),
        fromAvatar: Number.isInteger(p.avatarPokemonId) ? p.avatarPokemonId : null,
        fromSprite: typeof p.trainerSprite === 'string' ? p.trainerSprite : null,
        topicId,
        messageId,
        snippet: snippetOf(data.text || data.bodyPreview || data.title),
        createdAt: new Date().toISOString(),
        read: false,
    });
    return { sent: 1 };
}

/** A friend request the caller just sent. */
export async function notifyFriendRequest({ db, appId, callerUid, to }) {
    const req = await db.doc(`artifacts/${appId}/friendRequests/${callerUid}_${to}`).get();
    if (!req.exists || req.data().status !== 'pending') return { sent: 0 };
    const profile = await db.doc(`artifacts/${appId}/publicProfiles/${callerUid}`).get();
    const p = profile.exists ? profile.data() : {};
    await db.doc(`${inboxPath(appId, to)}/friend_${callerUid}`).set({
        kind: 'friend',
        fromUid: callerUid,
        fromName: String(p.displayName || 'Trainer').slice(0, 40),
        fromAvatar: Number.isInteger(p.avatarPokemonId) ? p.avatarPokemonId : null,
        fromSprite: typeof p.trainerSprite === 'string' ? p.trainerSprite : null,
        createdAt: new Date().toISOString(),
        read: false,
    });
    return { sent: 1 };
}
