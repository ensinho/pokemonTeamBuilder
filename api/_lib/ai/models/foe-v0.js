/**
 * M2 v0 — "which move will the player use?" with hand-set weights.
 *
 * φ(option) = [expected damage into Cynthia's active (% of max HP), same move
 * as the player's last]. The weights reproduce the original heuristic
 * `p ∝ exp(E[d]/15)` with a 30% boost for a repeated move (ln 1.3 ≈ 0.262).
 * When human battles exist (F6) `ai-train` replaces this file with learned
 * weights over the full φ, without touching the code that reads it.
 */
export default {
    version: 'foe-v0',
    features: ['expPct', 'sameAsLast'],
    weights: [1 / 15, Math.log(1.3)],
};
