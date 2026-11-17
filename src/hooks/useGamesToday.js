import { useEffect, useState } from 'react';

import { DAILY_GAMES, gameNoteToday, gamesDoneToday, mergeGameRecords, withGameDone } from '../utils/gamesToday';

/**
 * The day's games this trainer played (`utils/gamesToday.js` holds the rules).
 * The record is kept twice (2026-11-17 — Enzo played the quiz and the tier
 * list in one browser and another said "Aberto hoje"): on the device, a
 * trainer's key (`leaveSession` wipes it), for the first paint; and in the
 * account's preferences doc as `gamesToday`, so every browser signed in to
 * the account agrees. It is written where a game ends (`markGameDone`, which
 * pushes to the account) and where the Home already reads the day; the
 * account's copy is merged in when the profile is read (`applyAccountGames`,
 * called by useAuthStore). Every reader hears a write at once (one window
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

const writeRecord = (record) => {
    try {
        localStorage.setItem(KEY, JSON.stringify(record));
    } catch (_) { /* private mode: the account's copy still has it */ }
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
};

// Who carries a write to the account: the auth store registers itself
// (`setGamesToAccount`), so this module never imports it back.
let toAccount = null;
export const setGamesToAccount = (push) => { toAccount = push; };

/** Today's part of the record, as the account keeps it (yesterday is dropped). */
export const accountGamesRecord = () => mergeGameRecords(readRecord(), null, Date.now());

/**
 * Mark `game` ('challenge' | 'pokepuzzle' | 'quiz' | 'tierList') as played
 * today. `note` is a few figures the Jogos page says back ("9 de 10").
 * Safe anywhere, a store included; the account hears it too (skipped until
 * the profile has been read — that read's own sync carries it then).
 */
export function markGameDone(game, note = null) {
    const before = readRecord();
    const next = withGameDone(before, game, Date.now(), note);
    if (before && JSON.stringify(before) === JSON.stringify(next)) return;
    writeRecord(next);
    Promise.resolve(toAccount?.(accountGamesRecord())).catch(() => { /* offline: the next profile sync carries it */ });
}

/**
 * The account's copy, read with the profile: merged into this device's, so a
 * game played in another browser today reads as played here.
 */
export function applyAccountGames(remote) {
    const local = readRecord();
    const merged = mergeGameRecords(local, remote, Date.now());
    const kept = mergeGameRecords(local, null, Date.now());
    if (JSON.stringify(merged) === JSON.stringify(kept)) return;
    writeRecord({ ...(local || {}), ...merged, notes: { ...(local?.notes || {}), ...(merged.notes || {}) } });
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
