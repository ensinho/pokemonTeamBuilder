import { useCallback, useEffect, useRef, useState } from 'react';

// Matches the toast store's minimum lifetime for a toast with an action
// (ACTION_MIN_DURATION), plus a beat, so Undo stays live as long as it shows.
const DEFAULT_COMMIT_MS = 6500;
// After a commit the source list catches up a moment later (a Firestore
// listener, a localStorage re-read); keep the row hidden until it has.
const UNHIDE_AFTER_COMMIT_MS = 1500;

/**
 * Reversible delete for lists the user owns (game history, saved runs):
 * `schedule(key, commit)` hides the row at once and runs `commit` only when
 * the undo window has passed; `undo(key)` cancels it. Use with an undo toast —
 * undo beats a confirm dialog for anything that can be put back
 * (design-system "a reversible destructive action").
 *
 * Pending deletes are committed, not dropped, when the component unmounts:
 * leaving the page is not an undo.
 */
export function useDeferredDelete(commitMs = DEFAULT_COMMIT_MS) {
    const [hidden, setHidden] = useState(() => new Set());
    const pending = useRef(new Map());

    const unhide = useCallback((key) => {
        setHidden((current) => {
            if (!current.has(key)) return current;
            const next = new Set(current);
            next.delete(key);
            return next;
        });
    }, []);

    const schedule = useCallback((key, commit) => {
        const previous = pending.current.get(key);
        if (previous) clearTimeout(previous.timer);
        setHidden((current) => new Set(current).add(key));
        const timer = setTimeout(() => {
            pending.current.delete(key);
            Promise.resolve()
                .then(commit)
                .catch((err) => console.error('Deferred delete failed:', err))
                .finally(() => setTimeout(() => unhide(key), UNHIDE_AFTER_COMMIT_MS));
        }, commitMs);
        pending.current.set(key, { timer, commit });
    }, [commitMs, unhide]);

    const undo = useCallback((key) => {
        const entry = pending.current.get(key);
        if (!entry) return false;
        clearTimeout(entry.timer);
        pending.current.delete(key);
        unhide(key);
        return true;
    }, [unhide]);

    useEffect(() => {
        const map = pending.current;
        return () => {
            map.forEach(({ timer, commit }) => {
                clearTimeout(timer);
                Promise.resolve().then(commit).catch((err) => console.error('Deferred delete failed:', err));
            });
            map.clear();
        };
    }, []);

    return { hidden, schedule, undo };
}
