import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { appId } from '../constants/firebase';
import { EMPTY_CHALLENGE_RECORD, summarizeChallengeRuns } from '../utils/challengeRecord';
import { db } from './firebase';

/**
 * The trainer's Champion Challenge record (utils/challengeRecord.js) for the
 * journeys and badges. One read of their own runs per session — the same
 * owner query account deletion makes (firestore.rules lets the owner read
 * `challengeRuns` by `uid`), shared by every component that asks, and asked
 * again only when a battle ends (`refreshChallengeRecord`, from the challenge
 * view). Not a listener: runs change a few times a day, and only on /challenge.
 *
 * Filtered on the client, not with `practice == false`: the earliest runs may
 * predate the field, and a uid-only query needs no composite index.
 */
const cache = { uid: null, record: EMPTY_CHALLENGE_RECORD, pending: null, loaded: false };
const listeners = new Set();

const publish = () => listeners.forEach((listener) => listener(cache.record));

const load = (uid) => {
    if (cache.uid === uid && (cache.loaded || cache.pending)) return cache.pending || Promise.resolve(cache.record);
    // Another trainer starts from nothing; the same one keeps their record while it re-reads.
    if (cache.uid !== uid) cache.record = EMPTY_CHALLENGE_RECORD;
    cache.uid = uid;
    cache.loaded = false;
    const pending = getDocs(query(collection(db, `artifacts/${appId}/challengeRuns`), where('uid', '==', uid)))
        .then((snap) => {
            // A newer read (another trainer, or a refresh) owns the cache now.
            if (cache.uid !== uid || cache.pending !== pending) return cache.record;
            cache.record = summarizeChallengeRuns(snap.docs.map((d) => d.data()));
            cache.loaded = true;
            return cache.record;
        })
        .catch((err) => {
            console.warn('Challenge record unavailable:', err?.code, err?.message || err);
            if (cache.uid === uid) cache.loaded = true;
            return cache.record;
        })
        .finally(() => {
            if (cache.pending === pending) cache.pending = null;
            publish();
        });
    cache.pending = pending;
    return pending;
};

/**
 * A battle just ended: read the runs again, and tell every reader. Resolves
 * `{ before, after }` — `before` is null unless this trainer's record had
 * already answered, so a caller diffing the two never mistakes a first read
 * for progress (the 2026-09-21 wound).
 */
export async function refreshChallengeRecord(uid) {
    if (!uid || !db) return { before: null, after: EMPTY_CHALLENGE_RECORD };
    const before = cache.uid === uid && cache.loaded ? cache.record : null;
    cache.loaded = false;
    cache.pending = null;
    const after = await load(uid);
    return { before, after };
}

/**
 * The record for `uid` — empty for a guest (a guest cannot play) and until
 * the read answers. A guest who signs in reads theirs.
 */
export function useChallengeRecord(uid, isAnonymous) {
    const enabled = Boolean(db && uid && isAnonymous === false);
    const [record, setRecord] = useState(() => (enabled && cache.uid === uid ? cache.record : EMPTY_CHALLENGE_RECORD));
    useEffect(() => {
        if (!enabled) {
            setRecord(EMPTY_CHALLENGE_RECORD);
            return undefined;
        }
        const listener = (next) => { if (cache.uid === uid) setRecord(next); };
        listeners.add(listener);
        if (cache.uid === uid && cache.loaded) setRecord(cache.record);
        else load(uid);
        return () => { listeners.delete(listener); };
    }, [enabled, uid]);
    return enabled ? record : EMPTY_CHALLENGE_RECORD;
}
