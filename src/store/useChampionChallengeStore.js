import { create } from 'zustand';

import { challengeApi } from '../services/challengeApi';
import { promptSignIn } from '../utils/navigation';
import { t } from '../utils/translate';
import { toast } from './useToastStore';

/**
 * The Champion Challenge screen's state. The server is the authority on every
 * fact here; this store only mirrors what `api/challenge.js` last said, plus
 * one optimistic field (`pending`).
 *
 * ## The turn, from the player's side
 *
 * A tap sets `pending` in the same frame — the screen swaps the buttons for
 * "Cynthia is thinking…" before the request leaves (the 2026-07-27 lesson: a
 * tap that shows nothing for half a second reads as a tap that failed). The
 * answer appends its lines and clears `pending`. A `staleTurn` (another tab
 * moved first) or a closed day is not an error to show: the store reloads the
 * real state and the screen redraws from it.
 *
 * Writes after an `await` go through `set((s) => …)`, never a copy of the state
 * taken before it (ux skill, smell 4).
 */

const KNOWN_ERRORS = new Set([
    'invalidTeam', 'invalidChoice', 'staleTurn', 'dayClosed', 'practiceLocked', 'signInRequired',
    'officialAlreadyPlayed', 'runEnded', 'notYourTurn', 'runNotFound', 'notOwner', 'offline', 'signedOut',
]);

export const challengeErrorText = (code) => t(`challenge.errors.${KNOWN_ERRORS.has(code) ? code : 'server'}`);

/** Errors that mean "what you see is out of date" — answered by reloading. */
const RELOAD_ERRORS = new Set(['staleTurn', 'dayClosed', 'runEnded', 'notYourTurn', 'officialAlreadyPlayed', 'practiceLocked']);

const safely = async (request) => {
    try {
        return await request();
    } catch (_) {
        return { ok: false, status: 0, payload: {}, error: 'offline' };
    }
};

const INITIAL = {
    status: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
    // `run: null` means "no run" only once the first answer arrived (the
    // 2026-09-21 lesson: an empty value before the first reply is "not asked yet").
    hasLoaded: false,
    loadError: null,
    dayKey: null,
    nextResetAt: null,
    day: null,
    official: null,
    stats: null,
    /** The day's ranking (server `publicRanks`): top of both boards, counts, your place. */
    ranks: null,
    run: null,
    events: [],
    // Line count before the action that produced `events`: an event's `at` is relative to it.
    eventsBase: 0,
    pending: null,
    isStarting: false,
    isForfeiting: false,
    teamErrors: null,
};

export const useChampionChallengeStore = create((set, get) => ({
    ...INITIAL,

    load: async () => {
        if (!get().hasLoaded) set({ status: 'loading' });
        const res = await safely(() => challengeApi.state());
        if (!res.ok) {
            // Data already on screen stays; only a first load becomes an error screen.
            set((s) => ({ status: s.hasLoaded ? 'ready' : 'error', loadError: res.error }));
            if (get().hasLoaded) toast.error(challengeErrorText(res.error));
            return false;
        }
        const { dayKey, nextResetAt, day, official, run, stats, ranks = null } = res.payload;
        set({ status: 'ready', hasLoaded: true, loadError: null, dayKey, nextResetAt, day, official, stats, run, ranks, pending: null });
        return true;
    },

    /**
     * Open the official run or a practice rematch.
     * @param {{practice?: boolean, team: {source: 'daily'} | {source: 'saved', teamId, name, showdownText}, trainerName?: string}} input
     */
    start: async ({ practice = false, team, trainerName }) => {
        if (get().isStarting) return false;
        set({ isStarting: true, teamErrors: null });
        try {
            const res = await safely(() => challengeApi.start({ practice, team, trainerName }));
            if (!res.ok) {
                if (res.error === 'invalidTeam') {
                    set({ teamErrors: res.payload?.errors || [] });
                } else if (res.error === 'signInRequired') {
                    promptSignIn('signIn');
                } else if (RELOAD_ERRORS.has(res.error)) {
                    await get().load();
                } else {
                    toast.error(challengeErrorText(res.error));
                }
                return false;
            }
            const p = res.payload;
            set({
                run: {
                    runId: p.runId,
                    practice: Boolean(p.practice),
                    status: p.status,
                    turn: p.turn,
                    teamSource: team.source,
                    teamName: team.name || null,
                    result: null,
                    winChanceCurve: null,
                    lines: p.lines || [],
                },
                events: p.events || [],
                eventsBase: 0,
                pending: null,
            });
            return true;
        } finally {
            set({ isStarting: false });
        }
    },

    /** One player choice (`move 2`, `switch 4`). `label` is what "you chose" shows. */
    choose: async (choice, label) => {
        const { run, pending } = get();
        if (!run || run.status !== 'active' || pending) return false;
        set({ pending: { choice, label, turn: run.turn } });

        const res = await safely(() => challengeApi.choose({ runId: run.runId, turn: run.turn, choice }));
        if (!res.ok) {
            set({ pending: null });
            if (RELOAD_ERRORS.has(res.error)) {
                await get().load();
                if (res.error === 'dayClosed') toast.info(challengeErrorText('dayClosed'));
            } else if (res.error === 'invalidChoice') {
                toast.error(challengeErrorText('invalidChoice'), { description: res.payload?.simError });
            } else {
                toast.error(challengeErrorText(res.error), {
                    actions: [{ label: t('challenge.battle.retry'), onClick: () => get().choose(choice, label) }],
                });
            }
            return false;
        }

        const p = res.payload;
        set((s) => {
            if (!s.run || s.run.runId !== run.runId) return { pending: null };
            const ended = p.status !== 'active';
            const next = {
                pending: null,
                events: p.events || [],
                eventsBase: s.run.lines.length,
                run: {
                    ...s.run,
                    turn: p.turn,
                    status: p.status,
                    lines: [...s.run.lines, ...(p.lines || [])],
                    result: p.result || s.run.result,
                    winChanceCurve: p.result?.winChanceCurve ?? s.run.winChanceCurve,
                    winChanceMarks: p.result?.winChanceMarks ?? s.run.winChanceMarks,
                },
            };
            if (p.ranks) next.ranks = p.ranks;
            if (ended && !s.run.practice) {
                next.official = { runId: s.run.runId, status: p.status, result: p.result };
                next.stats = {
                    ...s.stats,
                    played: (s.stats?.played || 0) + 1,
                    wins: (s.stats?.wins || 0) + (p.status === 'won' ? 1 : 0),
                    streak: p.result?.streak ?? 0,
                    bestStreak: p.result?.bestStreak ?? s.stats?.bestStreak ?? 0,
                };
            }
            return next;
        });
        return true;
    },

    forfeit: async () => {
        const { run } = get();
        if (!run || run.status !== 'active') return false;
        set({ isForfeiting: true });
        try {
            const res = await safely(() => challengeApi.forfeit({ runId: run.runId }));
            if (!res.ok) {
                if (RELOAD_ERRORS.has(res.error)) await get().load();
                else toast.error(challengeErrorText(res.error));
                return false;
            }
            const { result, ranks } = res.payload;
            set((s) => ({
                ...(ranks ? { ranks } : {}),
                run: s.run?.runId === run.runId
                    ? { ...s.run, status: 'lost', result, winChanceCurve: result?.winChanceCurve ?? null, winChanceMarks: result?.winChanceMarks ?? null }
                    : s.run,
                ...(run.practice ? {} : {
                    official: { runId: run.runId, status: 'lost', result },
                    stats: { ...s.stats, played: (s.stats?.played || 0) + 1, streak: 0 },
                }),
            }));
            return true;
        } finally {
            set({ isForfeiting: false });
        }
    },

    clearTeamErrors: () => set({ teamErrors: null }),

    /** A different account: nothing of the previous one may remain on screen. */
    reset: () => set(INITIAL),
}));
