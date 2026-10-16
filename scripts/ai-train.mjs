#!/usr/bin/env node
/**
 * Train the M1 win-probability model (logistic regression) and write it to
 * api/_lib/ai/models/winprob-v1.js — docs/plans/daily-champion-challenge-ml.md §4.
 *
 *   npm run ai:train                          # from scratch/ai-data/selfplay.ndjson
 *   npm run ai:train -- --in other.ndjson --force
 *
 * Plain JavaScript, no dependency: standardise, batch gradient descent with L2,
 * split 70/30 **by battle** (turns of one battle never straddle the split —
 * that would leak the outcome). The model is written only if it meets the bar:
 * log-loss ≤ 0.50, Brier ≤ 0.17, ECE ≤ 0.05, and better than the "more
 * Pokémon left" baseline. `--force` writes it anyway. The report (Markdown) is
 * printed and saved next to the data, for the PR.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { FEATURE_VERSION, WIN_FEATURES } from '../api/_lib/ai/features.js';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? fallback : args[i + 1];
};
const IN = flag('in', 'scratch/ai-data/selfplay.ndjson');
const OUT = flag('out', 'api/_lib/ai/models/winprob-v1.js');
const EPOCHS = Number(flag('epochs', 800));
const LR = Number(flag('lr', 0.2));
const L2 = Number(flag('l2', 1e-3));
const FORCE = args.includes('--force');

const BAR = { logLoss: 0.5, brier: 0.17, ece: 0.05 };

const data = readFileSync(IN, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line))
    .filter((row) => row.featureVersion === FEATURE_VERSION);
if (!data.length) throw new Error(`No rows with featureVersion ${FEATURE_VERSION} in ${IN}.`);

// By pairs of battles: the dataset alternates the real matchup and random
// teams, so splitting on the battle number alone would skew each side's mix.
const inTrain = (row) => Math.floor(row.battle / 2) % 10 < 7;
const train = data.filter(inTrain);
const test = data.filter((row) => !inTrain(row));
const k = WIN_FEATURES.length;

const mean = Array(k).fill(0);
const sd = Array(k).fill(0);
for (const row of train) row.x.forEach((v, j) => { mean[j] += v / train.length; });
for (const row of train) row.x.forEach((v, j) => { sd[j] += ((v - mean[j]) ** 2) / train.length; });
for (let j = 0; j < k; j += 1) sd[j] = Math.sqrt(sd[j]) || 1;

const sigmoid = (t) => 1 / (1 + Math.exp(-t));
const z = (x) => x.map((v, j) => (v - mean[j]) / sd[j]);
let weights = Array(k).fill(0);
let bias = 0;
const trainZ = train.map((row) => ({ x: z(row.x), y: row.y }));
for (let epoch = 0; epoch < EPOCHS; epoch += 1) {
    const gw = Array(k).fill(0);
    let gb = 0;
    for (const { x, y } of trainZ) {
        const e = sigmoid(bias + x.reduce((t, v, j) => t + v * weights[j], 0)) - y;
        for (let j = 0; j < k; j += 1) gw[j] += e * x[j];
        gb += e;
    }
    weights = weights.map((w, j) => w - LR * (gw[j] / trainZ.length + L2 * w));
    bias -= LR * (gb / trainZ.length);
}

const model = (row) => sigmoid(bias + z(row.x).reduce((t, v, j) => t + v * weights[j], 0));
const baseline = (row) => (row.x[0] > 0 ? 0.75 : row.x[0] < 0 ? 0.25 : 0.5);

const evaluate = (rows, predict) => {
    let logLoss = 0;
    let brier = 0;
    let correct = 0;
    const bins = Array.from({ length: 10 }, () => ({ n: 0, p: 0, y: 0 }));
    for (const row of rows) {
        const p = Math.min(1 - 1e-9, Math.max(1e-9, predict(row)));
        logLoss += -(row.y * Math.log(p) + (1 - row.y) * Math.log(1 - p));
        brier += (p - row.y) ** 2;
        correct += (p >= 0.5) === (row.y === 1) ? 1 : 0;
        const bin = bins[Math.min(9, Math.floor(p * 10))];
        bin.n += 1;
        bin.p += p;
        bin.y += row.y;
    }
    const n = rows.length;
    const ece = bins.reduce((sum, b) => sum + (b.n ? (b.n / n) * Math.abs(b.p / b.n - b.y / b.n) : 0), 0);
    return { logLoss: logLoss / n, brier: brier / n, accuracy: correct / n, ece, bins };
};

const m = evaluate(test, model);
const b = evaluate(test, baseline);
const passes = m.logLoss <= BAR.logLoss && m.brier <= BAR.brier && m.ece <= BAR.ece && m.logLoss < b.logLoss && m.brier < b.brier;
const battles = new Set(data.map((row) => row.battle)).size;
const f3 = (x) => x.toFixed(3);

const report = [
    `## M1 — win probability (${new Date().toISOString().slice(0, 10)})`,
    '',
    `${data.length} turn rows from ${battles} battles (${IN}); split by battle: ${train.length} train / ${test.length} test.`,
    '',
    '| Predictor (test) | Log-loss ↓ | Brier ↓ | Accuracy | ECE ↓ |',
    '|---|---|---|---|---|',
    `| Coin flip | 0.693 | 0.250 | — | — |`,
    `| More Pokémon left | ${f3(b.logLoss)} | ${f3(b.brier)} | ${(100 * b.accuracy).toFixed(1)}% | ${f3(b.ece)} |`,
    `| **Logistic, ${k} features** | **${f3(m.logLoss)}** | **${f3(m.brier)}** | **${(100 * m.accuracy).toFixed(1)}%** | **${f3(m.ece)}** |`,
    '',
    `Bar: log-loss ≤ ${BAR.logLoss}, Brier ≤ ${BAR.brier}, ECE ≤ ${BAR.ece}, better than the baseline → **${passes ? 'pass' : 'FAIL'}**.`,
    '',
    'Standardised weights: ' + WIN_FEATURES.map((name, j) => `${name} ${weights[j].toFixed(2)}`).join(', ') + `; bias ${bias.toFixed(2)}.`,
    '',
    '| Predicted | n | Mean predicted | Observed |',
    '|---|---|---|---|',
    ...m.bins.map((bin, i) => `| ${i / 10}–${(i + 1) / 10} | ${bin.n} | ${bin.n ? f3(bin.p / bin.n) : '—'} | ${bin.n ? f3(bin.y / bin.n) : '—'} |`),
].join('\n');

console.log(report);
writeFileSync(join(dirname(IN), 'report-m1.md'), `${report}\n`);

if (!passes && !FORCE) {
    console.error('\nThe model does not meet the bar; not written. Use --force to write it anyway.');
    process.exit(1);
}

const round = (x) => Math.round(x * 1e6) / 1e6;
const file = `// Generated by scripts/ai-train.mjs — do not edit by hand. Retrain with
// \`npm run ai:dataset && npm run ai:train\`; the report is in scratch/ai-data/report-m1.md.
export default ${JSON.stringify({
    version: 'winprob-v1',
    featureVersion: FEATURE_VERSION,
    features: WIN_FEATURES,
    trainedAt: new Date().toISOString().slice(0, 10),
    rows: data.length,
    battles,
    mean: mean.map(round),
    sd: sd.map(round),
    weights: weights.map(round),
    bias: round(bias),
    metrics: { logLoss: round(m.logLoss), brier: round(m.brier), accuracy: round(m.accuracy), ece: round(m.ece), baselineLogLoss: round(b.logLoss) },
}, null, 4)};
`;
writeFileSync(OUT, file);
console.log(`\nWritten ${OUT}`);
