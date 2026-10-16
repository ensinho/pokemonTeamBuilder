/**
 * Difficulty profiles, one per weekday pair (rotation.difficultyFor). The same
 * evaluators run on every day; a profile only turns knobs:
 *
 *  - `T` / `topN` — softmax temperature over the best N options. High T (DP)
 *    picks a weaker move now and then, as the DS AI did; T ≤ 0.5 is argmax.
 *  - `lookahead` — simulate the top-K candidates one turn ahead (`w` is how
 *    much that result weighs against the heuristic).
 *  - `readsSwitch` — the switch probability above which she fires coverage at
 *    the player's bench instead of the active Pokémon (null = never).
 *  - `adaptation` — 'setupOnly' answers boosting only; 'full' also reacts to a
 *    repeated move and to the player's last Pokémon.
 *  - `switching` — voluntary switches: 'koOnly' only when she would be KO'd
 *    before acting; 'normal' also for a bad matchup; `max` caps them per battle.
 *  - `setupThreshold` — she boosts only while the player's best hit on her is
 *    under this % of her HP.
 *  - `weights` — multiplies each evaluator's score (calibrated by `ai:arena`).
 *
 * Calibrated 2026-10-14 with `npm run ai:arena` (80–120 games, M1 loaded):
 * Cynthia's win rate against the greedy robot — dp 43.8% (target 40–55),
 * platinum 61.3% (50–65), rematch 68.3% (60–75), world 88.8% (≥ 70); against
 * the random robot 97.5–100%. Re-run it after any change here.
 *
 * The fog is not a knob: every profile plays fair (I5).
 */
export const PROFILES = {
    dp: {
        key: 'dp',
        T: 6,
        topN: 3,
        lookahead: null,
        readsSwitch: null,
        adaptation: 'setupOnly',
        switching: { mode: 'koOnly', max: 1 },
        setupThreshold: 25,
        weights: { attack: 1, setup: 1, status: 1, recovery: 1, utility: 1, switch: 1, other: 1 },
    },
    platinum: {
        key: 'platinum',
        T: 6,
        topN: 3,
        lookahead: null,
        readsSwitch: null,
        adaptation: 'full',
        switching: { mode: 'normal', max: 2 },
        setupThreshold: 30,
        weights: { attack: 1, setup: 1, status: 1, recovery: 1, utility: 1, switch: 1, other: 1 },
    },
    rematch: {
        key: 'rematch',
        T: 12,
        topN: 3,
        lookahead: { w: 0.5, K: 3, S: 2 },
        readsSwitch: 0.35,
        adaptation: 'full',
        switching: { mode: 'normal', max: Infinity },
        setupThreshold: 35,
        weights: { attack: 1, setup: 1, status: 1, recovery: 1, utility: 1, switch: 1, other: 1 },
    },
    world: {
        key: 'world',
        T: 1.5,
        topN: 2,
        lookahead: { w: 0.7, K: 4, S: 2 },
        readsSwitch: 0.25,
        adaptation: 'full',
        switching: { mode: 'normal', max: Infinity },
        setupThreshold: 40,
        weights: { attack: 1, setup: 1, status: 1, recovery: 1, utility: 1, switch: 1, other: 1 },
    },
};

export const profileFor = (key) => {
    const profile = PROFILES[key];
    if (!profile) throw new Error(`Unknown AI profile "${key}".`);
    return profile;
};
