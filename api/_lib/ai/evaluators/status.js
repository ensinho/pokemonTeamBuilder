import { maySleepProof, revealedAbility } from './abilities.js';

/**
 * Non-damaging status moves. Each is worth something only against the right
 * target, and is no option at all (−∞) against one it can't affect — status on
 * a Pokémon that already has one, Will-O-Wisp into a Fire type, sleep while the
 * Sleep Clause is in use.
 */
export const evaluateStatus = (ctx, move) => {
    const { est, me, foe, knowledge } = ctx;
    const acc = move.accuracy === true ? 1 : move.accuracy / 100;
    if (foe.volatiles.substitute && !move.flags?.bypasssub) return { score: -Infinity, reason: 'behind a substitute' };

    if (move.volatileStatus === 'confusion') {
        if (foe.volatiles.confusion) return { score: -Infinity, reason: 'already confused' };
        // Worth less than a burn or paralysis: it wears off and only sometimes bites.
        return { score: 12 * acc, reason: 'confuse' };
    }

    const status = move.status;
    if (!status) return { score: 0 };
    if (foe.status) return { score: -Infinity, reason: 'already has a status' };
    const ability = revealedAbility(ctx, foe);
    if (ability === 'comatose' || ability === 'purifyingsalt') return { score: -Infinity, reason: 'status-proof' };

    if (status === 'brn') {
        if (foe.hasType('Fire')) return { score: -Infinity, reason: 'fire type' };
        if (['guts', 'flareboost', 'waterveil', 'waterbubble', 'thermalexchange', 'marvelscale'].includes(ability)) return { score: 0, reason: 'burn helps or fails' };
        const { atk, spa } = foe.storedStats;
        return { score: 45 * (atk / (atk + spa)) * acc, parts: { physicalRatio: atk / (atk + spa) }, reason: 'cripple a physical attacker' };
    }

    if (status === 'par') {
        if (foe.hasType('Electric')) return { score: -Infinity, reason: 'electric type' };
        if (move.id === 'thunderwave' && !foe.runImmunity('Electric')) return { score: -Infinity, reason: 'immune to Thunder Wave' };
        if (move.flags?.powder && foe.hasType('Grass')) return { score: -Infinity, reason: 'powder immune' };
        if (ability === 'limber') return { score: -Infinity, reason: 'limber' };
        const ace = me.side.pokemon.find((mon) => mon.species.name === ctx.personality.aceSpecies && !mon.fainted);
        const outspeeds = est.actsFirst(foe, null, me, null) === 1 || (ace && est.actsFirst(foe, null, ace, null) === 1);
        return { score: outspeeds ? 40 * acc : 5 * acc, reason: outspeeds ? 'slow a faster foe' : 'already slower' };
    }

    if (status === 'slp') {
        if (knowledge.sleepClauseActive) return { score: -Infinity, reason: 'sleep clause' };
        if (move.flags?.powder && foe.hasType('Grass')) return { score: -Infinity, reason: 'powder immune' };
        const terrain = est.battle.field.terrain;
        if ((terrain === 'electricterrain' || terrain === 'mistyterrain') && foe.isGrounded()) return { score: -Infinity, reason: 'terrain' };
        if (['insomnia', 'vitalspirit', 'sweetveil'].includes(ability)) return { score: -Infinity, reason: 'sleep-proof' };
        return { score: 50 * acc * (maySleepProof(ctx, foe) ? 0.3 : 1), reason: 'sleep' };
    }

    if (status === 'tox' || status === 'psn') {
        if (foe.hasType('Steel') || foe.hasType('Poison')) return { score: -Infinity, reason: 'poison-proof type' };
        if (['immunity', 'poisonheal'].includes(ability)) return { score: -Infinity, reason: 'poison-proof' };
        const b = foe.species.baseStats;
        const bulky = b.hp + b.def + b.spd > 250;
        return { score: (bulky ? 30 : 15) * acc, reason: bulky ? 'wear down a wall' : 'chip' };
    }

    return { score: 10 * acc, reason: status };
};

/**
 * Status moves no evaluator claims (Embargo, Sweet Scent, Attract…): a token
 * score, so a high-temperature profile plays one now and then, the way the
 * DS-era AI did, while the higher profiles all but never do. Memento is the
 * exception that has a real use: going down anyway, cripple the foe.
 */
export const evaluateOther = (ctx, move) => {
    if (move.id === 'memento') return { score: ctx.myHp < 30 && ctx.myAlive > 1 ? 25 : 0, reason: 'memento' };
    return { score: 3, reason: 'flavour' };
};
