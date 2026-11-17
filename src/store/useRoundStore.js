import { create } from 'zustand';
import { ROUND_KEY, normalizeRound, receiptReady, withBaseline, withFullDay } from '../utils/mascot/roundReceipt';
import { dayTally, gamesDoneToday } from '../utils/gamesToday';
import { localDayKey } from '../utils/dailyCheckin';

/**
 * The mascot's round (2026-11-17, "Fantasminha de plantão"): the device's
 * record of what he saw last (`utils/mascot/roundReceipt.js` holds the
 * rules), and which receipt is open. A trainer's key (`ptb:mascot:round`),
 * so `leaveSession` wipes it with the rest of the trainer.
 *
 * `open` is 'morning' (the round's receipt) or 'day' (the day's, at four of
 * four); AppLayout draws the dialog. `facts` are what the opener already
 * holds (the Champion's and the PokéPuzzle's results), so the dialog adds no
 * read of its own.
 */

const GAMES_KEY = 'ptb:gamesToday';

const read = () => {
    try {
        return normalizeRound(JSON.parse(localStorage.getItem(ROUND_KEY) || 'null'));
    } catch {
        return normalizeRound(null);
    }
};
const write = (round) => {
    try {
        localStorage.setItem(ROUND_KEY, JSON.stringify(round));
    } catch { /* private mode: the receipt simply comes back tomorrow */ }
};

export const useRoundStore = create((set, get) => ({
    round: typeof window === 'undefined' ? normalizeRound(null) : read(),
    open: null,
    facts: null,

    /** Re-read the record (another tab, a day that turned while away). */
    refresh: () => set({ round: read() }),
    update: (change) => {
        const next = normalizeRound(change(get().round));
        write(next);
        set({ round: next });
    },
    openReceipt: (mode, facts = null) => set({ open: mode, facts }),
    closeReceipt: () => set({ open: null, facts: null }),
}));

/** True when the round's receipt waits today (for the note, the island). */
export const selectReceiptReady = (s) => receiptReady(s.round, localDayKey());

/**
 * Keeps the record current while the app runs (mounted once, in AppLayout):
 * a baseline the first time this trainer is seen, a full day counted the
 * moment the fourth game is played, and a re-read when the tab comes back.
 */
export function startRoundKeeper() {
    const store = useRoundStore.getState();
    const stamp = () => {
        store.refresh();
        useRoundStore.getState().update((round) => withBaseline(round, { dayKey: localDayKey(), at: Date.now() }));
        countFullDay();
    };
    const countFullDay = () => {
        let record = null;
        try { record = JSON.parse(localStorage.getItem(GAMES_KEY) || 'null'); } catch { /* none */ }
        if (dayTally(gamesDoneToday(record, Date.now())).complete) {
            useRoundStore.getState().update((round) => withFullDay(round, localDayKey()));
        }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') stamp(); };
    stamp();
    window.addEventListener('ptb:games-today', countFullDay);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
        window.removeEventListener('ptb:games-today', countFullDay);
        document.removeEventListener('visibilitychange', onVisible);
    };
}
