import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { appId } from '../constants/firebase';

/**
 * The live state of one public battle invite posted in the forum.
 *
 * A pointer, not a snapshot: the forum message only stores the battle id, so
 * the card reads the document itself and everyone watching the thread sees the
 * moment somebody claims it. Invites are rare (a handful per thread), so one
 * listener each is cheaper than any bookkeeping that would avoid them.
 *
 * Returns `{ battle, status }` where status is 'loading' | 'ready' | 'gone'.
 * 'gone' covers both a deleted invite and one the rules will not show us.
 */
export function useBattleInvite(battleId) {
    const [battle, setBattle] = useState(null);
    const [status, setStatus] = useState(battleId ? 'loading' : 'gone');

    useEffect(() => {
        if (!db || !battleId) {
            setBattle(null);
            setStatus('gone');
            return undefined;
        }

        setStatus('loading');
        const ref = doc(db, `artifacts/${appId}/battles`, battleId);
        const unsub = onSnapshot(
            ref,
            (snap) => {
                if (!snap.exists()) {
                    setBattle(null);
                    setStatus('gone');
                    return;
                }
                setBattle({ id: snap.id, ...snap.data() });
                setStatus('ready');
            },
            () => {
                // Permission denied is a legitimate outcome here: a claimed
                // invite between two other people stays readable, but a deleted
                // one, or a document a future rule change hides, must not break
                // the thread around it.
                setBattle(null);
                setStatus('gone');
            },
        );
        return unsub;
    }, [battleId]);

    return { battle, status };
}
