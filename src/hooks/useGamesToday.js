import { useEffect, useState } from 'react';

import { DAILY_GAMES, gameNoteToday, gamesDoneToday, withGameDone } from '../utils/gamesToday';

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

/**
 * Mark `game` ('challenge' | 'pokepuzzle' | 'quiz' | 'tierList') as played
 * today. `note` is a few figures the Jogos page says back ("9 de 10").
 * Safe anywhere, a store included.
 */
export function markGameDone(game, note = null) {
    const before = readRecord();
    const next = withGameDone(before, game, Date.now(), note);
    if (before && JSON.stringify(before) === JSON.stringify(next)) return;
    try {
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch (_) { /* private mode: the cards simply stay generic */ }
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

const sameDone = (a, b) => DAILY_GAMES.every((game) => a[game] === b[game]);

/** Runs `read` now, on every write of the record, and when the tab comes back. */
function useRecord(read, same) {
    const [value, setValue] = useState(read);

    useEffect(() => {
        const refresh = () => {
            const next = read();
            setValue((prev) => (same(prev, next) ? prev : next));
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
        // `read` and `same` are module constants at every call site.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return value;
}

const readDone = () => gamesDoneToday(readRecord(), Date.now());

/** `{ challenge, pokepuzzle, quiz, tierList }` — true for each game played today. */
export function useGamesToday() {
    return useRecord(readDone, sameDone);
}

const readNotes = () => {
    const record = readRecord();
    const now = Date.now();
    return Object.fromEntries(DAILY_GAMES.map((game) => [game, gameNoteToday(record, game, now)]));
};
const sameNotes = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** What each game noted today (`{ quiz: { found, total }, … }`), null where nothing was. */
export function useGameNotes() {
    return useRecord(readNotes, sameNotes);
}
