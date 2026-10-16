import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useChampionChallengeStore } from '../store/useChampionChallengeStore';
import { describeLogLines, readMyRequest } from '../utils/battleProtocol';
import { readBattleField } from '../utils/battleState';
import { championRoster, myRoster } from '../utils/challengeView';

const EMPTY = [];

/**
 * The challenge store, plus what the screen derives from the run's log —
 * derived here, in render, never copied into the store. Each derivation reruns
 * only when the lines change (a new array per action).
 */
export function useChampionChallenge() {
    const state = useChampionChallengeStore(useShallow((s) => ({
        status: s.status,
        hasLoaded: s.hasLoaded,
        loadError: s.loadError,
        dayKey: s.dayKey,
        nextResetAt: s.nextResetAt,
        day: s.day,
        official: s.official,
        stats: s.stats,
        ranks: s.ranks,
        run: s.run,
        events: s.events,
        eventsBase: s.eventsBase,
        pending: s.pending,
        isStarting: s.isStarting,
        isForfeiting: s.isForfeiting,
        teamErrors: s.teamErrors,
    })));
    const actions = useChampionChallengeStore(useShallow((s) => ({
        load: s.load,
        start: s.start,
        choose: s.choose,
        forfeit: s.forfeit,
        clearTeamErrors: s.clearTeamErrors,
        reset: s.reset,
    })));

    const lines = state.run?.lines || EMPTY;
    const lineup = state.day?.lineup || EMPTY;
    const request = useMemo(() => readMyRequest(lines), [lines]);
    const field = useMemo(() => readBattleField(lines), [lines]);
    const transcript = useMemo(() => describeLogLines(lines), [lines]);
    const mine = useMemo(() => myRoster(lines), [lines]);
    const theirs = useMemo(() => championRoster(lines, lineup), [lines, lineup]);

    return { ...state, ...actions, request, field, transcript, mine, theirs };
}
