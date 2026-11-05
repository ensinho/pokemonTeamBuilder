import { CHAMPIONS, DEFAULT_CHAMPION, ENGINE_VERSION } from './constants.js';
import { dailyTeamFor } from './dailyTeam.js';
import { nextResetAt, weekdayOf } from './day.js';
import { championLineupFor, difficultyFor, publicLineup } from './rotation.js';

/**
 * Where the challenge lives in Firestore, and the documents it writes.
 *
 * Runs are **outside** `users/{uid}/`: the rule there gives the owner full
 * write access, and Firestore rules only add permissions, so a run stored there
 * could be marked "won" from the console (plan §3.3). Here the owner may read
 * and delete (account deletion), and only this server writes.
 *
 *   public/data/challengeDays/{day}     anyone reads: lineup (no sets, no wildcard), Time do dia
 *                                       (`{day}_{championId}` for every champion but Cynthia)
 *   challengeRuns/{runId}               owner reads: status, turn, result, curve at the end
 *                                       (ids: officialRunId / practiceRunId below)
 *     rounds/{seq}                      owner reads: p1's log lines per action
 *     secret/state                      nobody reads: seed, teams, choices, AI trace
 *   challengeStats/{uid}                owner reads: streak and records (another champion's
 *                                       under `champions.{id}`, outcome.js statsOf)
 *   public/data/challengeRanks/{day}    anyone reads: the day's two boards (ranking.js), per champion
 *   publicProfiles/{uid}                anyone reads; read here to stamp a ranked row
 *   aiTraining/{id}                     nobody reads: anonymous training rows
 */
export const paths = (appId) => {
    const base = `artifacts/${appId}`;
    return {
        day: (dayKey, championId) => `${base}/public/data/challengeDays/${dayKey}${championSuffix(championId)}`,
        run: (runId) => `${base}/challengeRuns/${runId}`,
        round: (runId, seq) => `${base}/challengeRuns/${runId}/rounds/${String(seq).padStart(4, '0')}`,
        secret: (runId) => `${base}/challengeRuns/${runId}/secret/state`,
        stats: (uid) => `${base}/challengeStats/${uid}`,
        ranks: (dayKey, championId) => `${base}/public/data/challengeRanks/${dayKey}${championSuffix(championId)}`,
        profile: (uid) => `${base}/publicProfiles/${uid}`,
        training: (id) => `${base}/aiTraining/${id}`,
    };
};

/**
 * Every champion but Cynthia carries its id in its document ids — hers are the
 * ids the challenge launched with, so nothing already stored moves.
 */
export const championSuffix = (championId) => (!championId || championId === DEFAULT_CHAMPION ? '' : `_${championId}`);

/**
 * The official run of one board (ranking.js `boardOf`): the first battle of
 * the day with the Time do dia, and the first with your own team, each count
 * once — so one trainer can stand on both boards. The daily board keeps the
 * original id.
 */
export const officialRunId = (uid, dayKey, championId = DEFAULT_CHAMPION, board = 'daily') => `${uid}_${dayKey}${championSuffix(championId)}${board === 'free' ? '_free' : ''}`;
export const practiceRunId = (officialId, n) => `${officialId}_p${n}`;

/** The public document of the day: what the Home card and the arena show. */
export const buildDayDoc = ({ dayKey, championId, aiVersion, nowMs }) => {
    const difficulty = difficultyFor(dayKey);
    const daily = dailyTeamFor(dayKey, championId);
    return {
        dayKey,
        championId,
        championName: CHAMPIONS[championId].name,
        difficulty,
        challengeKey: difficulty,
        weekday: weekdayOf(dayKey),
        lineup: publicLineup(championLineupFor(dayKey, championId)),
        dailyTeam: { showdownText: daily.showdownText, members: daily.members },
        nextResetAt: nextResetAt(nowMs),
        engineVersion: ENGINE_VERSION,
        aiVersion,
        createdAt: new Date(nowMs).toISOString(),
    };
};
