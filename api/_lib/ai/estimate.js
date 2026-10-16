/**
 * Damage, speed and threat estimates on an estimation clone (`fog.js`).
 *
 * ## Cost
 *
 * One `getDamage` call is ~0.075 ms; cloning a battle is ~0.6 ms. So a
 * decision clones once and memoises every `(attacker, defender, move)` it
 * asks about — a full decision, switches included, is a few milliseconds.
 * The max roll is computed and the min derived (`× 0.85`, the bottom of the
 * damage roll); exact to a point or two, at half the calls.
 *
 * ## Robustness
 *
 * `getDamage` outside a real move execution throws for moves that read
 * execution context — Beat Up reads `move.allies` (19 times in ~7k spike
 * turns). Every call is wrapped; on a throw the estimate falls back to the
 * classic formula from base power, effectiveness and STAB, and is marked
 * `fallback` so the trace shows it. A test sends every move in the dex through.
 */

const MIN_ROLL = 0.85;

/** Expected hits for multi-hit moves: 2–5 averages 3.1 (35/35/15/15%). */
const expectedHits = (move, attacker) => {
    if (!move.multihit) return 1;
    if (typeof move.multihit === 'number') return move.multihit;
    if (attacker.ability === 'skilllink') return move.multihit[1];
    if (move.multihit[0] === 2 && move.multihit[1] === 5) return 3.1;
    return (move.multihit[0] + move.multihit[1]) / 2;
};

const accuracyOf = (move) => (move.accuracy === true ? 1 : Math.max(0, Math.min(1, (move.accuracy || 100) / 100)));

/** The textbook formula, for when the sim can't be asked. */
const roughDamage = (battle, attacker, defender, move) => {
    if (!move.basePower) return 0;
    const physical = move.category === 'Physical';
    const attack = attacker.getStat(physical ? 'atk' : 'spa');
    const defense = Math.max(1, defender.getStat(physical ? 'def' : 'spd'));
    const base = Math.floor(Math.floor(Math.floor((2 * attacker.level) / 5 + 2) * move.basePower * attack / defense) / 50) + 2;
    const stab = attacker.hasType(move.type) ? 1.5 : 1;
    const effectiveness = defender.runImmunity(move.type) ? 2 ** battle.dex.getEffectiveness(move.type, defender) : 0;
    return Math.floor(base * stab * effectiveness);
};

const monKey = (mon) => `${mon.side.id}${mon.side.pokemon.indexOf(mon)}`;

/**
 * @param {import('@pkmn/sim').Battle} battle an estimation clone
 */
export const createEstimator = (battle) => {
    const memo = new Map();
    let fallbacks = 0;

    /**
     * @returns {{status: boolean, immune: boolean, min: number, max: number, expPct: number, ko: number, acc: number, hits: number, fallback: boolean}}
     */
    const damage = (attacker, defender, moveId) => {
        const key = `${monKey(attacker)}>${monKey(defender)}:${moveId}`;
        if (memo.has(key)) return memo.get(key);

        const move = battle.dex.getActiveMove(moveId);
        const acc = accuracyOf(move);
        let result;
        if (move.category === 'Status' || !defender || defender.fainted || defender.hp <= 0) {
            result = { status: move.category === 'Status', immune: false, min: 0, max: 0, expPct: 0, ko: 0, acc, hits: 0, fallback: false };
        } else {
            move.willCrit = false;
            let raw;
            let fallback = false;
            battle.randomizer = (base) => base;
            try {
                raw = battle.actions.getDamage(attacker, defender, move, true);
            } catch {
                fallback = true;
                fallbacks += 1;
                raw = roughDamage(battle, attacker, defender, move);
            }
            const hits = expectedHits(move, attacker);
            const immune = raw === false || raw === undefined || raw === null;
            const max = immune ? 0 : Math.max(0, Number(raw) || 0) * hits;
            const min = Math.floor(max * MIN_ROLL);
            const hp = defender.hp;
            const maxhp = defender.maxhp || 1;
            const capped = Math.min(hp, (min + max) / 2);
            let ko = 0;
            if (max >= hp && max > 0) ko = min >= hp ? 1 : (max - hp + 1) / (max - min + 1);
            result = { status: false, immune, min, max, expPct: (100 * capped) / maxhp, ko, acc, hits, fallback };
        }
        memo.set(key, result);
        return result;
    };

    const priorityOf = (mon, moveId) => {
        if (!moveId) return 0;
        const move = battle.dex.moves.get(moveId);
        let priority = move.priority || 0;
        if (mon.ability === 'prankster' && move.category === 'Status') priority += 1;
        if (mon.ability === 'galewings' && move.type === 'Flying' && mon.hp === mon.maxhp) priority += 1;
        if (mon.ability === 'triage' && move.flags?.heal) priority += 3;
        return priority;
    };

    /** 1 if `a` moves before `b`, 0 if after, 0.5 on a speed tie. Trick Room included. */
    const actsFirst = (a, aMoveId, b, bMoveId) => {
        const pa = priorityOf(a, aMoveId);
        const pb = priorityOf(b, bMoveId);
        if (pa !== pb) return pa > pb ? 1 : 0;
        const sa = a.getActionSpeed();
        const sb = b.getActionSpeed();
        if (sa === sb) return 0.5;
        return sa > sb ? 1 : 0;
    };

    const moveIdsOf = (mon) => mon.moveSlots.map((slot) => slot.id).filter((id) => id !== 'struggle' && id !== 'recharge');

    /** Best expected damage (% of max HP, × accuracy) `attacker` can deal `defender`. */
    const bestMoveAgainst = (attacker, defender, moveIds = moveIdsOf(attacker)) => {
        let best = { exp: 0, ko: 0, moveId: null };
        for (const id of moveIds) {
            const d = damage(attacker, defender, id);
            if (d.status || d.immune) continue;
            const exp = d.expPct * d.acc;
            if (exp > best.exp) best = { exp, ko: d.ko * d.acc, moveId: id };
        }
        return best;
    };

    return {
        battle,
        damage,
        actsFirst,
        priorityOf,
        moveIdsOf,
        bestMoveAgainst,
        /** The player's most damaging believed move into `mine`. */
        threatOf: (foe, mine, moveIds) => bestMoveAgainst(foe, mine, moveIds || moveIdsOf(foe)),
        get fallbacks() { return fallbacks; },
    };
};

export const hpPctOf = (mon) => (mon && mon.maxhp ? (100 * Math.max(0, mon.hp)) / mon.maxhp : 0);
