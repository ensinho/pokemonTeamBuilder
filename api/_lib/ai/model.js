/**
 * Linear models, applied. Training lives in `scripts/ai-train.mjs`; a trained
 * model is a plain data file under `models/` (weights, standardisation, metrics)
 * so a prediction is a dot product — microseconds, deterministic, explainable.
 * See docs/plans/daily-champion-challenge-ml.md.
 */

const sigmoid = (t) => 1 / (1 + Math.exp(-t));

/**
 * M1: P(the champion wins from here).
 * @param {{mean: number[], sd: number[], weights: number[], bias: number}} model
 * @param {number[]} x raw features (`features.winFeatures`)
 */
export const predictWin = (model, x) => {
    let t = model.bias;
    for (let j = 0; j < model.weights.length; j += 1) {
        t += model.weights[j] * ((x[j] - model.mean[j]) / (model.sd[j] || 1));
    }
    return sigmoid(t);
};

/**
 * M2: P(each option) = softmax(w · φ(option)).
 * @param {{weights: number[]}} model
 * @param {number[][]} phis one feature vector per option
 * @returns {number[]}
 */
export const predictActions = (model, phis) => {
    if (!phis.length) return [];
    const logits = phis.map((phi) => phi.reduce((sum, v, j) => sum + v * (model.weights[j] || 0), 0));
    const top = Math.max(...logits);
    const exps = logits.map((l) => Math.exp(l - top));
    const total = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / total);
};
