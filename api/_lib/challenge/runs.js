import { CHAMPIONS, ENGINE_VERSION } from './constants.js';
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
 *   challengeRuns/{runId}               owner reads: status, turn, result, curve at the end
 *     rounds/{seq}                      owner reads: p1's log lines per action
 *     secret/state                      nobody reads: seed, teams, choices, AI trace
 *   challengeStats/{uid}                owner reads: streak and records
 *   public/data/challengeRanks/{day}    anyone reads: the day's two boards (ranking.js)
 *   publicProfiles/{uid}                anyone reads; read here to stamp a ranked row
 *   aiTraining/{id}                     nobody reads: anonymous training rows
 */
export const paths = (appId) => {
    const base = `artifacts/${appId}`;
    return {
        day: (dayKey) => `${base}/public/data/challengeDays/${dayKey}`,
        run: (runId) => `${base}/challengeRuns/${runId}`,
        round: (runId, seq) => `${base}/challengeRuns/${runId}/rounds/${String(seq).padStart(4, '0')}`,
        secret: (runId) => `${base}/challengeRuns/${runId}/secret/state`,
        stats: (uid) => `${base}/challengeStats/${uid}`,
        ranks: (dayKey) => `${base}/public/data/challengeRanks/${dayKey}`,
        profile: (uid) => `${base}/publicProfiles/${uid}`,
        training: (id) => `${base}/aiTraining/${id}`,
    };
};

export const officialRunId = (uid, dayKey) => `${uid}_${dayKey}`;
export const practiceRunId = (uid, dayKey, n) => `${uid}_${dayKey}_p${n}`;

/** The public document of the day: what the Home card and the arena show. */
export const buildDayDoc = ({ dayKey, championId, aiVersion, nowMs }) => {
    const difficulty = difficultyFor(dayKey);
    const daily = dailyTeamFor(dayKey);
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
