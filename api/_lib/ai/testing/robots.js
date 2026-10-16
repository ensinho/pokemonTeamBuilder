import { snapshot } from '../../challenge/engine.js';
import { createEstimator } from '../estimate.js';
import { estimationClone } from '../fog.js';
import { legalOptions } from '../options.js';

/**
 * Sparring partners for the arena (`scripts/ai-arena.mjs`) and for self-play
 * data (`scripts/ai-dataset.mjs`). They play either side and see the whole
 * battle — they are yardsticks, not players to be fair to.
 *
 *  - `random`  a uniformly random legal choice.
 *  - `greedy`  the move with the highest immediate expected damage; switches
 *              only when forced, into whoever hits hardest.
 *  - `epsilon` greedy, but random `epsilon`% of the time (default 25) — self-play variety.
 */

const sideIndex = (side) => (side === 'p1' ? 0 : 1);

const greedyChoice = (battle, side, request) => {
    const options = legalOptions(request);
    const est = createEstimator(estimationClone(snapshot(battle)));
    const mine = est.battle.sides[sideIndex(side)];
    const theirs = est.battle.sides[1 - sideIndex(side)];
    const foe = theirs.active[0];
    if (!foe || foe.fainted) return options[0].choice;

    let best = options[0];
    let bestValue = -Infinity;
    for (const option of options) {
        let value;
        if (option.kind === 'move') {
            const d = est.damage(mine.active[0], foe, option.moveId);
            value = d.status || d.immune ? 0 : d.expPct * d.acc;
        } else if (option.kind === 'switch' && request.forceSwitch) {
            value = est.bestMoveAgainst(mine.pokemon[option.slot], foe).exp;
        } else {
            value = -1;
        }
        if (value > bestValue) {
            bestValue = value;
            best = option;
        }
    }
    return best.choice;
};

export const robotChoice = (kind, battle, side, request, prng, epsilon = 25) => {
    const options = legalOptions(request);
    if (!options.length) return null;
    if (kind === 'random' || (kind === 'epsilon' && prng.random(100) < epsilon)) return options[prng.random(options.length)].choice;
    return greedyChoice(battle, side, request);
};

export const ROBOTS = ['random', 'greedy', 'epsilon'];
