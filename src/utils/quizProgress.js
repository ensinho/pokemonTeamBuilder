/**
 * The Quiz as something to complete (2026-11-12): every generation is a
 * region with three stars, and a run can be played three ways. Pure — the
 * view (GenerationQuizView) and the store (useQuizRunsStore) ask here.
 *
 * Nothing new is stored for the stars: they are read from the best mark the
 * runs already keep (`bestFound` / `totalCount`). A Sprint or Flawless run is
 * its own run document (`<signature>~<mode>`), so it never touches the
 * progress of the classic run of the same generations.
 */

export const QUIZ_MODES = Object.freeze(['classic', 'sprint', 'flawless']);

/** How long a Sprint lasts. */
export const SPRINT_SECONDS = 60;

/** The share of a region each star asks for. */
export const STAR_THRESHOLDS = Object.freeze([0.5, 0.8, 1]);

const isMode = (mode) => QUIZ_MODES.includes(mode);

/** The id a run is kept under: the selection's signature, plus the mode when it is not the classic one. */
export const runIdFor = (signature, mode = 'classic') => (
    isMode(mode) && mode !== 'classic' ? `${signature}~${mode}` : signature
);

/** The mode a run was played in (runs saved before 2026-11-12 are classic). */
export const modeOfRun = (run) => (isMode(run?.mode) ? run.mode : 'classic');

/** The stars a best mark is worth: 0–3. */
export function starsFor(found, total) {
    if (!(total > 0) || !(found > 0)) return 0;
    return STAR_THRESHOLDS.filter((share) => found >= Math.ceil(total * share)).length;
}

/** The next star and how many names it is away, or null when all three are won. */
export function nextStarGoal(found, total) {
    if (!(total > 0)) return null;
    const have = Math.max(0, found || 0);
    for (let i = 0; i < STAR_THRESHOLDS.length; i += 1) {
        const needed = Math.ceil(total * STAR_THRESHOLDS[i]);
        if (have < needed) return { star: i + 1, missing: needed - have };
    }
    return null;
}

/** Seconds left of a Sprint that ends at `deadline` (ms), never below zero. */
export const sprintSecondsLeft = (deadline, now = Date.now()) => Math.max(0, Math.ceil((deadline - now) / 1000));

/** "1:05" for a clock. */
export const formatClock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
