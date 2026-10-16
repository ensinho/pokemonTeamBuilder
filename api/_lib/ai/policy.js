/**
 * From scores to one choice.
 *
 * Options scored −∞ are gone already (sanity filters live in the evaluators).
 * Among the rest, the profile's top N go through a softmax at temperature T —
 * T ≤ 0.5 is a plain argmax — and the roll comes from the AI's own seeded PRNG.
 * Ties break by option order, so the same input always gives the same choice.
 *
 * @param {Array<{option, final: number}>} scored
 * @returns {{chosen: object, roll: ?number, considered: object[]}}
 */
export const pick = (scored, profile, rng) => {
    const finite = scored
        .map((entry, index) => ({ ...entry, index }))
        .filter((entry) => Number.isFinite(entry.final))
        .sort((a, b) => b.final - a.final || a.index - b.index);

    // Everything filtered out (it can happen: status-only moveset into a
    // statused foe). Any legal option beats none — take the first.
    if (!finite.length) return { chosen: scored[0], roll: null, considered: [] };

    const considered = finite.slice(0, profile.topN);
    if (profile.T <= 0.5 || considered.length === 1) return { chosen: considered[0], roll: null, considered };

    const top = considered[0].final;
    const weights = considered.map((entry) => Math.exp((entry.final - top) / profile.T));
    const total = weights.reduce((a, b) => a + b, 0);
    const roll = rng.random();
    let acc = 0;
    for (let i = 0; i < considered.length; i += 1) {
        acc += weights[i] / total;
        if (roll < acc) return { chosen: considered[i], roll, considered };
    }
    return { chosen: considered[considered.length - 1], roll, considered };
};
