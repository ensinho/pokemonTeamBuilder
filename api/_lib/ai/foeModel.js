import { predictActions } from './model.js';
import FOE_V0 from './models/foe-v0.js';

/**
 * What the player is likely to do next — the M2 model over the moves Cynthia
 * believes they have (revealed + STAB stand-ins), plus a switch probability
 * from their switching habit.
 *
 * Used for the expected threat, for judging a switch-in (it takes the
 * predicted hit), for the responses simulated in the lookahead, and for
 * reading a switch.
 *
 * @returns {{moves: Array<{id: string, p: number, exp: number}>, pSwitch: number, top: ?string}}
 */
export const predictFoe = ({ est, foe, me, memory, model = FOE_V0 }) => {
    if (!foe || !me || foe.fainted || me.fainted) return { moves: [], pSwitch: 0, top: null };
    const ids = est.moveIdsOf(foe);
    const phis = ids.map((id) => {
        const d = est.damage(foe, me, id);
        return [d.status || d.immune ? 0 : d.expPct * d.acc, memory.lastFoeMove === id ? 1 : 0];
    });
    const ps = predictActions(model, phis);
    const moves = ids
        .map((id, i) => ({ id, p: ps[i], exp: phis[i][0] }))
        .sort((a, b) => b.p - a.p || a.id.localeCompare(b.id));

    let pSwitch = Math.min(0.5, Math.max(0, 0.1 + 0.4 * memory.switchRate));
    const mine = est.bestMoveAgainst(me, foe);
    if (mine.ko > 0.5 && est.actsFirst(me, mine.moveId, foe, moves[0]?.id) === 1) pSwitch = Math.min(0.65, pSwitch + 0.15);

    return { moves, pSwitch, top: moves[0]?.id || null };
};
