import { create } from 'zustand';
import { track } from '../services/analytics';

import { challengeApi } from '../services/challengeApi';
import { DEFAULT_CHAMPION, isChampion } from '../utils/challengeChampions';
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

/** The board a run counts on: its team decides (ranking.js `boardOf`). */
const boardOfRun = (run) => (run?.teamSource === 'saved' ? 'free' : 'daily');

const safely = async (request) => {
    try {
        return await request();
    } catch (_) {
        return { ok: false, status: 0, payload: {}, error: 'offline' };
    }
};

/** The champion picked last on this device: the screen opens on them. */
const CHAMPION_KEY = 'ptb:challenge:champion';
const savedChampion = () => {
    try {
        const id = localStorage.getItem(CHAMPION_KEY);
        return isChampion(id) ? id : DEFAULT_CHAMPION;
    } catch (_) {
        return DEFAULT_CHAMPION;
    }
};

/** Everything that belongs to one champion's day — cleared when the player picks another. */
const CHAMPION_STATE = {
    day: null,
    official: null,
    /** One official per board (server `officials`): `{daily, free}`, each `{runId, status, result}` or null. */
    officials: null,
    stats: null,
    /** The day's ranking (server `publicRanks`): top of both boards, counts, your place. */
    ranks: null,
    run: null,
    events: [],
    // Line count before the action that produced `events`: an event's `at` is relative to it.
    eventsBase: 0,
    pending: null,
    teamErrors: null,
};

const INITIAL = {
    status: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
    // `run: null` means "no run" only once the first answer arrived (the
    // 2026-09-21 lesson: an empty value before the first reply is "not asked yet").
    hasLoaded: false,
    loadError: null,
    dayKey: null,
    nextResetAt: null,
    ...CHAMPION_STATE,
    /** Who the screen is about. */
    championId: DEFAULT_CHAMPION,
    /** Today, per champion: `[{id, name, played, won}]` — the selector and the "next champion" card. */
    champions: null,
    /**
     * Every champion's ranking (server `ranksByChampion`): the ranking panel
     * shows either one without leaving the room. Kept when the room changes
     * champion (the next answer replaces it), so the panel never goes blank.
     */
    ranksByChampion: null,
    isStarting: false,
    isForfeiting: false,
};

/** The rankings with one champion's replaced (a finish, or an older server's answer). */
const withChampionRanks = (all, championId, ranks) => (ranks ? { ...(all || {}), [championId]: ranks } : (all || null));

/**
 * Stats after an official finish, from the answer's `stats` (`choose`,
 * `forfeit`). A server from before there were two officials a day sends only
 * the result's streak: then the day is counted here, as it always was.
 */
const statsFrom = (payload, previous) => {
    if (payload?.stats) return { ...previous, ...payload.stats };
    const won = payload?.status === 'won';
    return {
        ...previous,
        played: (previous?.played || 0) + 1,
        wins: (previous?.wins || 0) + (won ? 1 : 0),
        streak: payload?.result?.streak ?? 0,
        bestStreak: payload?.result?.bestStreak ?? previous?.bestStreak ?? 0,
    };
};

/** Today's summary of one champion after an official finishes on screen. */
const withChampionResult = (champions, championId, status) => champions?.map((c) => (c.id === championId
    ? { ...c, played: true, won: c.won || status === 'won' }
    : c));

export const useChampionChallengeStore = create((set, get) => ({
    ...INITIAL,
    championId: savedChampion(),

    load: async () => {
        if (!get().hasLoaded) set({ status: 'loading' });
        const { championId } = get();
        const res = await safely(() => challengeApi.state({ championId }));
        // The player picked another champion while this one was loading.
        if (get().championId !== championId) return false;
        if (!res.ok) {
            // Data already on screen stays; only a first load becomes an error screen.
            set((s) => ({ status: s.hasLoaded ? 'ready' : 'error', loadError: res.error }));
            if (get().hasLoaded) toast.error(challengeErrorText(res.error));
            return false;
        }
        const {
            dayKey, nextResetAt, day, official, officials = null, run, stats, ranks = null, champions = null, ranksByChampion = null,
        } = res.payload;
        set((s) => ({
            status: 'ready', hasLoaded: true, loadError: null, dayKey, nextResetAt, day, official, officials, stats, run, ranks, champions, pending: null,
            // A server from before sends only this champion's.
            ranksByChampion: ranksByChampion || withChampionRanks(s.ranksByChampion, championId, ranks),
        }));
        return true;
    },

    /**
     * Face another champion: their team, ranking and record. What the screen
     * knew of the previous one goes at once; resolves with whether their day
     * arrived (true at once for the champion already on screen).
     */
    selectChampion: async (championId) => {
        if (!isChampion(championId) || get().pending || get().isStarting) return false;
        if (championId === get().championId) return true;
        try { localStorage.setItem(CHAMPION_KEY, championId); } catch (_) { /* private mode: this visit only */ }
        set({ ...CHAMPION_STATE, championId });
        return get().load();
    },

    /**
     * Open the official run or a practice rematch.
     * @param {{practice?: boolean, team: {source: 'daily'} | {source: 'saved', teamId, name, showdownText}, trainerName?: string}} input
     */
    start: async ({ practice = false, team, trainerName }) => {
        if (get().isStarting) return false;
        set({ isStarting: true, teamErrors: null });
        try {
            const res = await safely(() => challengeApi.start({ championId: get().championId, practice, team, trainerName }));
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
            if (p.ranks) {
                next.ranks = p.ranks;
                next.ranksByChampion = withChampionRanks(s.ranksByChampion, s.championId, p.ranks);
            }
            if (ended) track('challenge_finish', { champion: s.championId, board: boardOfRun(s.run), result: p.status, practice: Boolean(s.run.practice) });
            if (ended && !s.run.practice) {
                const official = { runId: s.run.runId, status: p.status, result: p.result };
                next.official = official;
                next.officials = { ...s.officials, [boardOfRun(s.run)]: official };
                next.stats = statsFrom(p, s.stats);
                next.champions = withChampionResult(s.champions, s.championId, p.status);
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
                ...(ranks ? { ranks, ranksByChampion: withChampionRanks(s.ranksByChampion, s.championId, ranks) } : {}),
                run: s.run?.runId === run.runId
                    ? { ...s.run, status: 'lost', result, winChanceCurve: result?.winChanceCurve ?? null, winChanceMarks: result?.winChanceMarks ?? null }
                    : s.run,
                ...(run.practice ? {} : {
                    official: { runId: run.runId, status: 'lost', result },
                    officials: { ...s.officials, [boardOfRun(run)]: { runId: run.runId, status: 'lost', result } },
                    stats: statsFrom({ status: 'lost', ...res.payload }, s.stats),
                    champions: withChampionResult(s.champions, s.championId, 'lost'),
                }),
            }));
            return true;
        } finally {
            set({ isForfeiting: false });
        }
    },

    clearTeamErrors: () => set({ teamErrors: null }),

    /** A different account: nothing of the previous one may remain on screen (the champion picked stays). */
    reset: () => set((s) => ({ ...INITIAL, championId: s.championId })),
}));
