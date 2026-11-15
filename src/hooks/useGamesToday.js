import { useEffect, useState } from 'react';

import { gamesDoneToday, withGameDone } from '../utils/gamesToday';

/**
 * The day's games this trainer played (`utils/gamesToday.js` holds the rules).
 * The record lives on the device — a trainer's key, so `leaveSession` wipes
 * it — and is written where a game ends (`markGameDone`) and where the Home
 * already reads the day. Every reader hears a write at once (one window
 * event; `storage` for another tab) and re-reads when the tab comes back, so
 * a day that turned while it was away reads as new.
 */
const KEY = 'ptb:gamesToday';
const EVENT = 'ptb:games-today';

const readRecord = () => {
    try {
        return JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch (_) {
        return null;
    }
};

/** Mark `game` ('challenge' | 'pokepuzzle') as played today. Safe anywhere, a store included. */
export function markGameDone(game) {
    const before = readRecord();
    const next = withGameDone(before, game, Date.now());
    if (before && before[game] === next[game]) return;
    try {
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch (_) { /* private mode: the cards simply stay generic */ }
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

/** `{ challenge, pokepuzzle }` — true for each game played today. */
export function useGamesToday() {
    const [done, setDone] = useState(() => gamesDoneToday(readRecord(), Date.now()));

    useEffect(() => {
        const refresh = () => {
            const next = gamesDoneToday(readRecord(), Date.now());
            setDone((prev) => (prev.challenge === next.challenge && prev.pokepuzzle === next.pokepuzzle ? prev : next));
        };
        const onStorage = (event) => { if (event.key === KEY) refresh(); };
        const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
        window.addEventListener(EVENT, refresh);
        window.addEventListener('storage', onStorage);
        document.addEventListener('visibilitychange', onVisible);
        refresh();
        return () => {
            window.removeEventListener(EVENT, refresh);
            window.removeEventListener('storage', onStorage);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    return done;
}
