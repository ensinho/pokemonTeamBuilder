import { hpPctOf } from './estimate.js';

/**
 * Model inputs — the single source for the game, the anonymous data capture and
 * training, so the three can never disagree (docs/plans/daily-champion-challenge-ml.md).
 *
 * Always from the champion's side (p2). In battle they are computed on the
 * fogged clone with what she knows (`knowledge`); for the post-battle chart and
 * for self-play training `knowledge` is null and everything is read from the
 * battle itself — the battle is over, or both sides are robots.
 */

/**
 * v1: the six features of the 2026-10-14 spike. A v2 candidate (entry hazards
 * weighted by Pokémon left, and the Pokémon lead weighted by how late it is)
 * was measured the same day on 2,000 self-play battles and did not beat v1
 * (log-loss 0.511 vs 0.501, inside the sample-to-sample spread), so it was
 * not kept. Append new features at the end, so an older model can still read
 * the first ones.
 */
export const FEATURE_VERSION = 1;

export const WIN_FEATURES = ['aliveDiff', 'hpSumDiff', 'matchupDiff', 'faster', 'boostDiff', 'statusDiff'];

const boostSum = (mon) => (mon ? Object.values(mon.boosts).reduce((sum, n) => sum + n, 0) : 0);
const alive = (side) => side.pokemon.filter((mon) => !mon.fainted && mon.hp > 0);

/**
 * M1 features.
 *
 * @param {{battle, est, knowledge?: import('./knowledge.js').Knowledge}} input
 * @returns {number[]}
 */
export const winFeatures = ({ battle, est, knowledge = null }) => {
    const [p1, p2] = battle.sides;
    const me = p2.active[0];
    const foe = p1.active[0];

    const myAlive = alive(p2).length;
    const myHp = alive(p2).reduce((sum, mon) => sum + hpPctOf(mon) / 100, 0);

    let foeAlive;
    let foeHp;
    if (knowledge) {
        // What she can see: seen Pokémon at their last shown HP, the unseen at full.
        const seen = [...knowledge.foe.values()];
        const unseen = Math.max(0, knowledge.foeTeamSize - seen.length);
        foeAlive = knowledge.foeRemaining;
        foeHp = seen.reduce((sum, mon) => sum + (mon.fainted ? 0 : mon.hpPct / 100), 0) + unseen;
        // The active's live HP from the battle is public too (the HP bar).
        const activeInfo = foe && knowledge.foe.get(foe.species.name);
        if (activeInfo && !activeInfo.fainted) foeHp += hpPctOf(foe) / 100 - activeInfo.hpPct / 100;
    } else {
        foeAlive = alive(p1).length;
        foeHp = alive(p1).reduce((sum, mon) => sum + hpPctOf(mon) / 100, 0);
    }

    let matchupDiff = 0;
    let faster = 0;
    if (me && foe && !me.fainted && !foe.fainted && me.hp > 0 && foe.hp > 0) {
        matchupDiff = (est.bestMoveAgainst(me, foe).exp - est.threatOf(foe, me).exp) / 100;
        const first = est.actsFirst(me, null, foe, null);
        faster = first === 1 ? 1 : first === 0 ? -1 : 0;
    }

    const statused = (mons) => mons.filter((mon) => mon.status).length;
    const foeStatused = knowledge
        ? [...knowledge.foe.values()].filter((mon) => !mon.fainted && mon.status).length
        : statused(alive(p1));

    return [
        myAlive - foeAlive,
        myHp - foeHp,
        matchupDiff,
        faster,
        (boostSum(me) - boostSum(foe)) / 6,
        foeStatused - statused(alive(p2)),
    ];
};

/**
 * M2 φ for one of the player's options, from Cynthia's side of the table:
 * [expected damage into her active, KO chance, STAB, super effective, same move
 * as last turn, is a switch].
 */
export const foeOptionFeatures = ({ est, foe, me, moveId, isSwitch, lastFoeMove }) => {
    if (isSwitch || !moveId) return [0, 0, 0, 0, 0, 1];
    const d = est.damage(foe, me, moveId);
    const move = est.battle.dex.moves.get(moveId);
    const exp = d.status || d.immune ? 0 : d.expPct * d.acc;
    const effectiveness = move.category === 'Status' ? 0 : est.battle.dex.getEffectiveness(move.type, me);
    return [
        +(exp / 100).toFixed(3),
        +(d.ko * d.acc).toFixed(3),
        foe.hasType(move.type) && move.category !== 'Status' ? 1 : 0,
        effectiveness > 0 ? 1 : 0,
        moveId === lastFoeMove ? 1 : 0,
        0,
    ];
};
