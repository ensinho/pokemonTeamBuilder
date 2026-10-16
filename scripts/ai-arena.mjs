#!/usr/bin/env node
/**
 * Calibrate Cynthia's AI by self-play — locally, straight against the engine,
 * no Firestore (docs/plans/daily-champion-challenge-ai.md §16).
 *
 *   npm run ai:arena -- --cynthia world --vs greedy --games 300
 *   npm run ai:arena -- --cynthia all --vs random --games 100
 *   npm run ai:bench                       # ms per decision, p50/p95, per profile
 *
 * The matchup is the real one: on each game a day is picked whose weekday plays
 * the profile under test, Cynthia brings that day's lineup with that profile's
 * sets, and the robot brings that day's Time do dia. Prints a Markdown table
 * (win rate with a 95% Wilson interval, turns, decision time, illegal choices)
 * for the PR.
 */
import { PRNG } from '@pkmn/sim';

import { decide } from '../api/_lib/ai/index.js';
import { PROFILES } from '../api/_lib/ai/profiles.js';
import { robotChoice } from '../api/_lib/ai/testing/robots.js';
import { dailyTeamFor } from '../api/_lib/challenge/dailyTeam.js';
import { shiftDayKey } from '../api/_lib/challenge/day.js';
import { apply, createMatch, outcome, owes, requestOf, snapshot } from '../api/_lib/challenge/engine.js';
import { championTeamTextFor, difficultyFor } from '../api/_lib/challenge/rotation.js';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? fallback : args[i + 1];
};
const bench = args.includes('--bench');
const profiles = flag('cynthia', 'all') === 'all' ? Object.keys(PROFILES) : flag('cynthia').split(',');
const unknown = profiles.filter((p) => !PROFILES[p]);
if (unknown.length) {
    console.error(`Unknown profile(s): ${unknown.join(', ')} — use ${Object.keys(PROFILES).join(', ')} or all.`);
    process.exit(1);
}

// Try a knob without editing profiles.js: --set rematch.T=20 --set rematch.lookahead.w=0.25
args.forEach((arg, i) => {
    if (arg !== '--set') return;
    const [path, raw] = args[i + 1].split('=');
    const keys = path.split('.');
    let target = PROFILES;
    for (const key of keys.slice(0, -1)) target = target[key] ??= {};
    target[keys[keys.length - 1]] = raw === 'null' ? null : Number.isNaN(Number(raw)) ? raw : Number(raw);
    console.error(`override ${path} = ${raw}`);
});
const opponents = bench ? ['random'] : flag('vs', 'random,greedy').split(',');
const games = Number(flag('games', bench ? 20 : 100));
const startDay = flag('from', '2026-10-12');

const wilson = (wins, n, z = 1.96) => {
    if (!n) return [0, 0];
    const p = wins / n;
    const center = (p + (z * z) / (2 * n)) / (1 + (z * z) / n);
    const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n);
    return [Math.max(0, center - half), Math.min(1, center + half)];
};
const pct = (x) => `${(100 * x).toFixed(1)}%`;
const quantile = (sorted, q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : 0);

/** Days whose weekday plays `profile`, in order from `startDay`. */
const daysFor = (profile, count) => {
    const days = [];
    for (let i = 0; days.length < count; i += 1) {
        const day = shiftDayKey(startDay, i);
        if (difficultyFor(day) === profile) days.push(day);
    }
    return days;
};

const play = (profile, robot, day, n) => {
    const seed = [n + 1, 77, robot.length, profile.length];
    const prng = new PRNG([n + 3, 5, 8, 13]);
    const match = createMatch({ seed, teams: { p1: dailyTeamFor(day).showdownText, p2: championTeamTextFor(day) }, names: { p1: 'Robot', p2: 'Cynthia' } });
    const ms = [];
    let illegal = 0;
    let fallbacks = 0;
    for (let step = 0; step < 1000 && !match.battle.ended; step += 1) {
        let ai = null;
        if (owes(match.battle, 'p2')) {
            const started = performance.now();
            const { choice, trace } = decide({
                snapshot: snapshot(match.battle), request: requestOf(match.battle, 'p2'), p2Lines: match.lines.p2, seed, turn: step, profileKey: profile,
            });
            ms.push(performance.now() - started);
            fallbacks += trace?.estimateFallbacks || 0;
            ai = choice;
        }
        if (owes(match.battle, 'p1')) apply(match, 'p1', robotChoice(robot, match.battle, 'p1', requestOf(match.battle, 'p1'), prng));
        if (ai && !apply(match, 'p2', ai).ok) {
            illegal += 1;
            apply(match, 'p2', 'default');
        }
    }
    const out = outcome(match.battle);
    return { won: out.winner === 'p2', ended: out.ended, turns: out.turns, ms, illegal, fallbacks };
};

const rows = [];
const started = Date.now();
for (const profile of profiles) {
    const days = daysFor(profile, Math.min(games, 60));
    for (const robot of opponents) {
        let wins = 0;
        let illegal = 0;
        let unfinished = 0;
        let turns = 0;
        let fallbacks = 0;
        const ms = [];
        for (let n = 0; n < games; n += 1) {
            const result = play(profile, robot, days[n % days.length], n);
            wins += result.won ? 1 : 0;
            illegal += result.illegal;
            unfinished += result.ended ? 0 : 1;
            turns += result.turns;
            fallbacks += result.fallbacks;
            ms.push(...result.ms);
        }
        ms.sort((a, b) => a - b);
        const [lo, hi] = wilson(wins, games);
        rows.push({ profile, robot, games, rate: wins / games, lo, hi, turns: turns / games, p50: quantile(ms, 0.5), p95: quantile(ms, 0.95), illegal, unfinished, fallbacks });
        process.stderr.write(`${profile} vs ${robot}: ${wins}/${games}\n`);
    }
}

console.log(`\n| Cynthia | vs | games | Cynthia wins | 95% CI | turns | ms p50 | ms p95 | illegal | unfinished | estimate fallbacks |`);
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
    console.log(`| ${r.profile} | ${r.robot} | ${r.games} | ${pct(r.rate)} | ${pct(r.lo)}–${pct(r.hi)} | ${r.turns.toFixed(1)} | ${r.p50.toFixed(1)} | ${r.p95.toFixed(1)} | ${r.illegal} | ${r.unfinished} | ${r.fallbacks} |`);
}
console.log(`\n${((Date.now() - started) / 1000).toFixed(0)} s on Node ${process.version}`);
if (rows.some((r) => r.illegal > 0)) process.exitCode = 1;
