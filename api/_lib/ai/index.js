import { classify } from './evaluators/classify.js';
import { evaluateAttack } from './evaluators/attack.js';
import { evaluateSetup } from './evaluators/setup.js';
import { evaluateStatus, evaluateOther } from './evaluators/status.js';
import { evaluateRecovery } from './evaluators/recovery.js';
import { evaluateUtility } from './evaluators/utility.js';
import { evaluateSwitch } from './evaluators/switch.js';
import { createEstimator, hpPctOf } from './estimate.js';
import { winFeatures } from './features.js';
import { estimationClone, fogClone } from './fog.js';
import { predictFoe } from './foeModel.js';
import { knowledgeFrom } from './knowledge.js';
import { runLookahead } from './lookahead.js';
import { memoryFrom } from './memory.js';
import { predictWin } from './model.js';
import WIN_MODEL from './models/winprob-v1.js';
import { legalOptions } from './options.js';
import { personalityFor } from './personality/cynthia.js';
import { pick } from './policy.js';
import { profileFor } from './profiles.js';
import { scoreReplacements } from './replacement.js';
import { rngFor } from './rng.js';

/**
 * Cynthia's AI. `decide` is a pure function of its input (I3):
 *
 *   snapshot  battle.toJSON() taken *before* the player's choice is applied (I1)
 *   request   her side's request from the sim — the only source of options (I6)
 *   p2Lines   her channel of the log — the only source of what she knows (I5)
 *   seed      the battle seed; her dice are derived from it, never from the
 *             battle's own PRNG (I2)
 *
 * The flow: knowledge and memory from the log → fogged clone → estimates →
 * every legal option scored by its evaluator, weighted by the profile → a
 * one-turn lookahead for the top profiles → the policy picks. The result is
 * stored as a choice in the run's history and is never recomputed on replay
 * (I4), so changing anything here (bump AI_VERSION) can't rewrite a battle.
 *
 * Bump AI_VERSION: patch for weights, minor for a new evaluator, major for a
 * new model. It is recorded on every run, day document and trace.
 */
export const AI_VERSION = '1.0.1'; // 1.0.1: Mega Evolves whenever the sim allows it (options.js)

const EVALUATORS = {
    attack: evaluateAttack,
    setup: evaluateSetup,
    status: evaluateStatus,
    recovery: evaluateRecovery,
    utility: evaluateUtility,
    other: evaluateOther,
};

const RISK_LOW = 0.25;
const RISK_HIGH = 0.75;

const labelOf = (battle, option) => {
    if (option.kind === 'move') return battle.dex.moves.get(option.moveId).name;
    if (option.kind === 'switch') return `→ ${option.species}`;
    return option.choice;
};

const round = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : n);

// The trace is stored in Firestore, which refuses `undefined` anywhere in a
// document — and a candidate the lookahead skipped has no `sim`, most
// evaluators give no `parts`, a few no `reason`. Absent means "omit the key".
const defined = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/**
 * @param {{snapshot: object, request: object, p2Lines: string[], seed: number[], turn: number|string,
 *          profileKey: string, championId?: string, model?: object|null}} input
 * @returns {{choice: ?string, trace: ?object}}
 */
export const decide = ({ snapshot, request, p2Lines = [], seed, turn, profileKey, championId = 'cynthia', model = WIN_MODEL }) => {
    if (!request || request.wait) return { choice: null, trace: null };
    const started = performance.now();
    const profile = profileFor(profileKey);
    const personality = personalityFor(championId);
    const options = legalOptions(request);
    // A distinct tag per decision: several can share a turn (a move, then a
    // replacement after a faint), and each needs its own roll.
    const tag = `${turn}:${p2Lines.length}`;
    const baseTrace = { aiVersion: AI_VERSION, modelVersion: model?.version || null, turn, profile: profile.key };

    if (options.length === 1) {
        return { choice: options[0].choice, trace: { ...baseTrace, candidates: [], chosen: options[0].choice, roll: null, forced: true, ms: 0 } };
    }

    const knowledge = knowledgeFrom(p2Lines);
    const memory = memoryFrom(knowledge);
    const fogged = fogClone(snapshot, knowledge);
    const foggedJSON = fogged.toJSON();
    const est = createEstimator(estimationClone(foggedJSON));
    const { battle } = est;
    const me = battle.sides[1].active[0];
    const foe = battle.sides[0].active[0];
    const rng = rngFor(seed, tag, 'ai');

    const foePred = predictFoe({ est, foe, me, memory });
    const foeLive = foe && !foe.fainted && foe.hp > 0;
    const threat = foeLive ? est.threatOf(foe, me) : { exp: 0, ko: 0, moveId: null };
    const repeatThreat = profile.adaptation === 'full' && memory.repeat?.count >= 2 ? [memory.repeat.moveId] : undefined;
    const ctx = {
        est,
        battle,
        profile,
        personality,
        memory,
        knowledge,
        me,
        foe,
        foePred,
        threat,
        threatMoves: repeatThreat,
        turn: battle.turn,
        myHp: hpPctOf(me),
        foeHp: hpPctOf(foe),
        myAlive: battle.sides[1].pokemon.filter((mon) => !mon.fainted && mon.hp > 0).length,
        foeAlive: knowledge.foeRemaining,
        foeBoostSum: foe ? Object.values(foe.boosts).reduce((sum, n) => sum + Math.max(0, n), 0) : 0,
    };
    const winProb = model && foeLive && me && !me.fainted ? predictWin(model, winFeatures({ battle, est, knowledge })) : null;

    let scored;
    if (request.forceSwitch) {
        scored = scoreReplacements(ctx, options).map((entry) => ({ ...entry, heuristic: entry.score, final: entry.score, kind: 'replacement' }));
    } else {
        scored = options.map((option) => {
            if (option.kind === 'switch') {
                const result = evaluateSwitch(ctx, option);
                const score = result.score * profile.weights.switch;
                return { option, heuristic: score, final: score, parts: result.parts, reason: result.reason, kind: 'switch' };
            }
            if (option.kind !== 'move' || !foeLive) {
                return { option, heuristic: 0, final: 0, reason: 'no target', kind: 'other' };
            }
            const move = battle.dex.moves.get(option.moveId);
            const kind = option.moveId === 'struggle' || option.moveId === 'recharge' ? 'forced' : classify(move);
            if (kind === 'forced') return { option, heuristic: 0, final: 0, reason: kind, kind };
            const result = EVALUATORS[kind](ctx, move);
            const score = result.score * (profile.weights[kind] ?? 1);
            return { option, heuristic: score, final: score, parts: result.parts, reason: result.reason, kind };
        });

        // Read the switch: fire coverage at the bench she has seen.
        if (profile.readsSwitch !== null && foePred.pSwitch > profile.readsSwitch) {
            const bench = battle.sides[0].pokemon.filter((mon) => mon !== foe && !mon.fainted && knowledge.foe.has(mon.species.name));
            for (const entry of scored) {
                if (entry.kind !== 'attack' || !Number.isFinite(entry.final)) continue;
                const coverage = bench.length
                    ? bench.reduce((sum, mon) => {
                        const d = est.damage(me, mon, entry.option.moveId);
                        return sum + (d.immune ? 0 : d.expPct * d.acc);
                    }, 0) / bench.length
                    : 10;
                const bonus = foePred.pSwitch * coverage * 0.5;
                entry.final += bonus;
                entry.parts = { ...entry.parts, readSwitch: round(bonus) };
            }
        }

        if (profile.lookahead && foeLive && !request.forceSwitch) {
            const ranked = scored.filter((entry) => Number.isFinite(entry.final)).sort((a, b) => b.final - a.final);
            const candidates = ranked.slice(0, profile.lookahead.K);
            if (candidates.length > 1) {
                const simulated = runLookahead({
                    foggedJSON, before: est, candidates, foePred, seed, tag, settings: profile.lookahead, model, knowledge,
                });
                const w = profile.lookahead.w;
                for (const result of simulated) {
                    const entry = scored.find((e) => e.option === result.option);
                    entry.sim = result.sim;
                    entry.final = (1 - w) * entry.final + w * result.sim;
                    // Risk mode: losing anyway → take the swingy option; winning → the safe one.
                    if (winProb !== null && winProb < RISK_LOW) entry.final += 0.5 * result.sd;
                    if (winProb !== null && winProb > RISK_HIGH) entry.final -= 0.5 * result.sd;
                    entry.sd = result.sd;
                }
            }
        }
    }

    const { chosen, roll } = pick(scored, profile, rng);
    const trace = {
        ...baseTrace,
        winProb: winProb === null ? null : round(winProb * 100) / 100,
        candidates: scored.map((entry) => defined({
            choice: entry.option.choice,
            label: labelOf(battle, entry.option),
            kind: entry.kind,
            heuristic: round(entry.heuristic),
            sim: entry.sim === undefined ? undefined : round(entry.sim),
            final: round(entry.final),
            reason: entry.reason,
            parts: entry.parts ? defined(Object.fromEntries(Object.entries(entry.parts).map(([k, v]) => [k, typeof v === 'number' ? round(v) : v]))) : undefined,
        })),
        foe: { moves: foePred.moves.slice(0, 4).map((m) => ({ id: m.id, p: round(m.p * 100) / 100 })), pSwitch: round(foePred.pSwitch * 100) / 100 },
        chosen: chosen.option.choice,
        roll: roll === null ? null : round(roll * 1000) / 1000,
        estimateFallbacks: est.fallbacks,
        ms: Math.round(performance.now() - started),
    };
    return { choice: chosen.option.choice, trace };
};
