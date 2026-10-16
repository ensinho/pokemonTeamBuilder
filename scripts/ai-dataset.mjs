#!/usr/bin/env node
/**
 * Self-play data for the M1 win-probability model
 * (docs/plans/daily-champion-challenge-ml.md §4).
 *
 *   npm run ai:dataset -- --battles 600
 *
 * Both sides are the same robot (ε-greedy), so the data says "who is winning
 * from here", not "how strong is the side that plays better" — M1 is used on
 * positions between Cynthia and humans, and a lopsided policy would bake that
 * lopsidedness into its bias. Half the battles are the real matchup (that
 * day's Cynthia lineup against that day's Time do dia), half are two random
 * battle teams, for variety.
 *
 * Features are computed exactly as in the game: from p2's side, on the
 * fogged clone, with what p2's log revealed (`features.winFeatures` is the one
 * source — no train/serve skew). Writes ndjson to scratch/ai-data/ (git-ignored).
 *
 * The anonymous rows recorded by real battles (`aiTraining`) are the F6 source;
 * exporting them is a follow-up (`--from-firestore`).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { PRNG } from '@pkmn/sim';

import { createEstimator } from '../api/_lib/ai/estimate.js';
import { FEATURE_VERSION, winFeatures } from '../api/_lib/ai/features.js';
import { estimationClone, fogClone } from '../api/_lib/ai/fog.js';
import { knowledgeFrom } from '../api/_lib/ai/knowledge.js';
import { robotChoice } from '../api/_lib/ai/testing/robots.js';
import { dailyTeamFor } from '../api/_lib/challenge/dailyTeam.js';
import { shiftDayKey } from '../api/_lib/challenge/day.js';
import { apply, createMatch, outcome, owes, requestOf, snapshot } from '../api/_lib/challenge/engine.js';
import { championTeamTextFor } from '../api/_lib/challenge/rotation.js';
import { hashSeed } from '../api/_lib/challenge/seed.js';
import { generateRandomTeam } from '../api/_lib/randomTeams.js';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? fallback : args[i + 1];
};
const BATTLES = Number(flag('battles', 600));
const OUT = flag('out', 'scratch/ai-data/selfplay.ndjson');
const SALT = flag('seed', 'm1');
// --full: features with complete information (the post-battle chart's view)
// instead of Cynthia's fogged one. For comparison; the game trains on the fog.
const FULL = args.includes('--full');
// How often (%) the robots play a random legal choice instead of the greedy one.
const EPSILON = Number(flag('epsilon', 25));

const teamsFor = (n) => {
    if (n % 2 === 0) {
        const day = shiftDayKey('2026-10-12', Math.floor(n / 2) % 365);
        return { p1: dailyTeamFor(day).showdownText, p2: championTeamTextFor(day) };
    }
    return {
        p1: generateRandomTeam({ seed: hashSeed('dataset', SALT, n, 'p1') }).showdownText,
        p2: generateRandomTeam({ seed: hashSeed('dataset', SALT, n, 'p2') }).showdownText,
    };
};

const rows = [];
let skipped = 0;
const started = Date.now();
for (let n = 0; n < BATTLES; n += 1) {
    const seed = hashSeed('dataset-battle', SALT, n);
    const prng = new PRNG(hashSeed('dataset-robots', SALT, n));
    const match = createMatch({ seed, teams: teamsFor(n), names: { p1: 'A', p2: 'B' } });
    const battleRows = [];
    for (let step = 0; step < 1000 && !match.battle.ended; step += 1) {
        const r1 = requestOf(match.battle, 'p1');
        const r2 = requestOf(match.battle, 'p2');
        if (r1?.active && r2?.active && !r1.forceSwitch && !r2.forceSwitch) {
            const knowledge = FULL ? null : knowledgeFrom(match.lines.p2);
            const json = FULL ? snapshot(match.battle) : fogClone(snapshot(match.battle), knowledge).toJSON();
            const est = createEstimator(estimationClone(json));
            battleRows.push(winFeatures({ battle: est.battle, est, knowledge }).map((v) => Math.round(v * 1000) / 1000));
        }
        const choices = ['p1', 'p2'].map((side) => (owes(match.battle, side) ? [side, robotChoice('epsilon', match.battle, side, requestOf(match.battle, side), prng, EPSILON)] : null));
        for (const entry of choices) if (entry) apply(match, entry[0], entry[1]);
    }
    const out = outcome(match.battle);
    if (!out.ended || !out.winner) {
        skipped += 1;
        continue;
    }
    for (const x of battleRows) rows.push({ battle: n, x, y: out.winner === 'p2' ? 1 : 0 });
    if ((n + 1) % 50 === 0) process.stderr.write(`${n + 1}/${BATTLES} battles, ${rows.length} rows\n`);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${rows.map((row) => JSON.stringify({ featureVersion: FEATURE_VERSION, ...row })).join('\n')}\n`);
console.log(`${BATTLES - skipped} battles (${skipped} unfinished/ties skipped), ${rows.length} turn rows → ${OUT} in ${((Date.now() - started) / 1000).toFixed(0)} s`);
