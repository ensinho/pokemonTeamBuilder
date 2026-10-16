import { createEstimator } from './estimate.js';
import { foeOptionFeatures, winFeatures } from './features.js';
import { estimationClone, fogClone } from './fog.js';
import { knowledgeFrom } from './knowledge.js';
import { memoryFrom } from './memory.js';
import { predictWin } from './model.js';
import WIN_MODEL from './models/winprob-v1.js';
import { legalOptions } from './options.js';

/**
 * What the endpoint records about a turn, outside the decision itself.
 *
 * `trainingRow` is one anonymous row for the models: M1 features and the
 * player's options as M2 sees them — computed on the fogged clone, the same
 * way the game computes them (no train/serve skew), and with nothing that
 * identifies the player.
 *
 * `winProbFull` is the post-battle chart's point: P(player wins) with full
 * information. It is computed during the battle but stored where no client can
 * read it until the battle is over (decision 2026-10-14: the chance is shown
 * only at the end).
 */

const round3 = (n) => Math.round(n * 1000) / 1000;

export const trainingRow = ({ snapshot, p2Lines, p1Request, p1Choice }) => {
    const knowledge = knowledgeFrom(p2Lines);
    const memory = memoryFrom(knowledge);
    const fogged = fogClone(snapshot, knowledge);
    const est = createEstimator(estimationClone(fogged.toJSON()));
    const [p1, p2] = est.battle.sides;
    const foe = p1.active[0];
    const me = p2.active[0];
    if (!foe || !me || foe.fainted || me.fainted) return null;

    const options = legalOptions(p1Request);
    const chosen = options.findIndex((option) => option.choice === p1Choice);
    return {
        m1: winFeatures({ battle: est.battle, est, knowledge }).map(round3),
        m2: {
            // The player's move slots are their real ones; she only scores them
            // with what she believes about the Pokémon using them.
            options: options.map((option) => foeOptionFeatures({
                est, foe, me, moveId: option.moveId, isSwitch: option.kind === 'switch', lastFoeMove: memory.lastFoeMove,
            })),
            chosen,
        },
    };
};

export const winProbFull = (snapshot, model = WIN_MODEL) => {
    if (!model) return null;
    const est = createEstimator(estimationClone(snapshot));
    const [p1, p2] = est.battle.sides;
    if (!p1.active[0] || !p2.active[0]) return null;
    return round3(1 - predictWin(model, winFeatures({ battle: est.battle, est })));
};
