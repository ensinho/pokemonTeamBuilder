import { CHALLENGE_ENDPOINT } from '../constants/firebase';
import { callAuthedApi } from './apiClient';

/**
 * The Champion Challenge endpoint (`api/challenge.js`). Every call resolves to
 * `{ok, status, payload, error}`; a network failure rejects. The server's error
 * codes are in docs/plans/daily-champion-challenge-tech.md §2.4.
 */
const call = (body) => callAuthedApi(CHALLENGE_ENDPOINT, body, { serverErrorMessage: 'internal' });

export const challengeApi = {
    /** The screen's data: the day, the run to show, the streak. Also wakes the function. */
    state: ({ championId } = {}) => call({ action: 'state', championId }),
    start: ({ championId, practice = false, team, trainerName }) => call({ action: 'start', championId, practice, team, trainerName }),
    choose: ({ runId, turn, choice }) => call({ action: 'choose', runId, turn, choice }),
    forfeit: ({ runId }) => call({ action: 'forfeit', runId }),
    /** Account deletion: off every day's ranking (the client may not write it). */
    forget: () => call({ action: 'forget' }),
    /** "Como venceu": a podium run's win-chance curve (numbers only). */
    report: ({ championId, board, uid, dayKey }) => call({ action: 'report', championId, board, uid, dayKey }),
};
