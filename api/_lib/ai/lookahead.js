import { createEstimator, hpPctOf } from './estimate.js';
import { winFeatures } from './features.js';
import { simulationClone } from './fog.js';
import { predictWin } from './model.js';
import { rngFor } from './rng.js';

/**
 * One turn ahead, for the top profiles. The heuristic misjudges what it can't
 * see — abilities, items, speed order, recoil, secondary effects — and the sim
 * gets all of those right, so the best few candidates are played out on the
 * fogged clone against the player's most likely replies.
 *
 * For each candidate i, reply j (top 3 of `predictFoe`) and sample s (S
 * seeds): clone the fogged battle, give it its own PRNG, make both choices, and
 * score how the position moved. The player never switches in these games — her
 * view of their bench is unknown, and inventing one would be guessing.
 *
 * Cost: a clone + one turn is ~1.5 ms; K=4 × 3 × 2 = 24 runs ≈ 35 ms.
 *
 * Position value, when the M1 model is loaded: ΔP(win) × MODEL_SCALE, so it
 * lives on the same "points ≈ % HP" scale as the heuristic it is blended with.
 * Without a model: (their HP lost + 100·faint) − (mine + 100·faint) + 15·[new
 * status on them]. Both add the boost swing (`boostSwing`).
 */

export const MODEL_SCALE = 600;

const guardItems = (battle) => {
    for (const side of battle.sides) {
        for (const mon of side.pokemon) {
            mon.eatItem = () => true;
            mon.useItem = () => true;
        }
    }
};

/** Attacking stats and Speed carry the next turns; defences matter less. */
const BOOST_VALUE = { atk: 15, spa: 15, spe: 10, def: 5, spd: 5, accuracy: 3, evasion: 3 };
const boostValue = (mon) => (mon ? Object.entries(mon.boosts).reduce((sum, [stat, n]) => sum + Math.max(0, n) * (BOOST_VALUE[stat] || 0), 0) : 0);

/**
 * A one-turn horizon can't see what a boost will be worth next turn — Swords
 * Dance just looks like a turn spent taking damage — so boosts gained (and the
 * player's boosts erased, e.g. by Haze) are worth points per stage: 15 for an
 * attacking stat, 10 for Speed, 5 for a defence.
 */
const counterpart = (b, a) => a.pokemon.find((mon) => mon.species.name === b.active[0].species.name) || a.active[0];

/**
 * The horizon correction, needed with or without the model: M1 learned from
 * robots that never set up, so its boost weight is near zero (0.09) and it
 * can't value a Swords Dance either.
 */
const boostSwing = (before, after) => {
    const [b1, b2] = before.sides;
    const [a1, a2] = after.sides;
    return (boostValue(counterpart(b2, a2)) - boostValue(b2.active[0])) - (boostValue(counterpart(b1, a1)) - boostValue(b1.active[0]));
};

const formulaValue = (before, after) => {
    const [b1, b2] = before.sides;
    const [a1, a2] = after.sides;
    const delta = (b, a) => {
        const bm = b.active[0];
        const am = counterpart(b, a);
        const lost = hpPctOf(bm) - hpPctOf(am);
        return lost + (am.fainted || am.hp <= 0 ? 100 : 0);
    };
    const statusGain = !b1.active[0].status && a1.active[0]?.status ? 15 : 0;
    return delta(b1, a1) - delta(b2, a2) + statusGain + boostSwing(before, after);
};

export const runLookahead = ({ foggedJSON, before, candidates, foePred, seed, tag, settings, model, knowledge }) => {
    const replies = foePred.moves.filter((m) => m.p > 0).slice(0, 3);
    const total = replies.reduce((sum, m) => sum + m.p, 0) || 1;
    const p0 = model ? predictWin(model, winFeatures({ battle: before.battle, est: before, knowledge })) : null;
    const foeMoveIndex = (battle, moveId) => battle.sides[0].active[0].moveSlots.findIndex((slot) => slot.id === moveId) + 1;

    return candidates.map((candidate, i) => {
        const values = [];
        let expected = 0;
        replies.forEach((reply, j) => {
            let sum = 0;
            let n = 0;
            for (let s = 0; s < settings.S; s += 1) {
                const clone = simulationClone(foggedJSON, rngFor(seed, tag, 'look', i, j, s));
                if (!clone.choose('p2', candidate.option.choice)) continue;
                const index = foeMoveIndex(clone, reply.id);
                if (!(index > 0 && clone.choose('p1', `move ${index}`))) clone.choose('p1', 'default');
                let value;
                if (model) {
                    guardItems(clone);
                    const p1 = predictWin(model, winFeatures({ battle: clone, est: createEstimator(clone), knowledge: null }));
                    value = (clone.ended ? (clone.winner === clone.sides[1].name ? 1 : 0) - p0 : p1 - p0) * MODEL_SCALE
                        + boostSwing(before.battle, clone);
                } else {
                    value = formulaValue(before.battle, clone);
                }
                values.push(value);
                sum += value;
                n += 1;
            }
            if (n) expected += (reply.p / total) * (sum / n);
        });
        const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        const sd = values.length > 1 ? Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length) : 0;
        return { ...candidate, sim: expected, sd, samples: values.length };
    });
};
