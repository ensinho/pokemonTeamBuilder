import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

// localStorage key scheme — MUST match useSessionGame / pokePuzzleMigration.
const ppKey = (userId, suffix) => `ptb:pokepuzzle:${userId || 'anon'}:${suffix}`;

// Firestore daily doc ids look like `daily_2026-6-18`; map back to the date.
const dateFromDocId = (id) => id.startsWith('daily_') ? id.slice('daily_'.length) : null;

// ============================================================
//  usePokePuzzleHistory — a reactive, per-account view of every daily
//  PokePuzzle the user has touched.
//
//  • Logged in: a real-time onSnapshot listener over
//    artifacts/.../users/{uid}/pokepuzzle. History reflects the account
//    live and stays in sync across devices/consoles — saving a game on
//    one device updates the drawer on another.
//  • Anonymous / offline: falls back to reading localStorage for the
//    requested dates (same data the game persists locally).
//
//  Returns a Map<dateString, savedState> where savedState is
//  { guesses, gameStatus, targetId, unlockedTips, updatedAt }.
// ============================================================
export function usePokePuzzleHistory({ userId, dates, revision }) {
    const [historyByDate, setHistoryByDate] = useState(() => new Map());

    // Real-time Firestore listener for logged-in users.
    useEffect(() => {
        if (!db || !userId) {
            setHistoryByDate(new Map());
            return;
        }

        const colRef = collection(db, `artifacts/pokemonTeamBuilder/users/${userId}/pokepuzzle`);
        const unsub = onSnapshot(
            colRef,
            (snap) => {
                const next = new Map();
                snap.forEach((docSnap) => {
                    const date = dateFromDocId(docSnap.id);
                    if (date) next.set(date, docSnap.data());
                });
                setHistoryByDate(next);
            },
            (err) => console.error('PokePuzzle history listener failed:', err)
        );
        return () => unsub();
    }, [userId]);

    // Anonymous fallback: read localStorage for the requested dates. Re-runs
    // whenever the date list or user changes (the game writes localStorage on
    // every save, and PokePuzzleView re-renders on session changes).
    const anon = !db || !userId;
    const datesKey = (dates || []).join(',');
    useEffect(() => {
        if (!anon) return;
        const next = new Map();
        (dates || []).forEach((date) => {
            const raw = localStorage.getItem(ppKey(userId, `daily:${date}`));
            if (raw) {
                try { next.set(date, JSON.parse(raw)); } catch { /* corrupt */ }
            }
        });
        setHistoryByDate(next);
        // datesKey captures the dates array contents; revision re-reads after
        // the local game saves (anonymous has no Firestore push to react to).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anon, userId, datesKey, revision]);

    return historyByDate;
}
