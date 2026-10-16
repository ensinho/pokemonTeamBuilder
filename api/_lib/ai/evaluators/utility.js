import { toID } from '@pkmn/sim';

import { HAZARDS, PHAZE, isProtect } from './classify.js';

const positiveBoosts = (mon) => Object.values(mon.boosts).reduce((sum, n) => sum + Math.max(0, n), 0);

/**
 * Field moves: Haze and phazing answer the player's boosts, Protect is a rare
 * scout, hazards go up early while the player still has Pokémon to hurt, and
 * weather is a small nudge when it isn't already up.
 */
export const evaluateUtility = (ctx, move) => {
    const { me, foe, memory, knowledge, battle } = ctx;

    if (move.id === 'haze' || PHAZE.has(move.id)) {
        const boosts = positiveBoosts(foe);
        if (PHAZE.has(move.id) && knowledge.foeRemaining <= 1) return { score: 0, reason: 'nothing to drag in' };
        const answer = memory.setupCount >= 1 ? 2 : 1;
        return { score: 15 * boosts * answer, parts: { foeBoosts: boosts }, reason: 'erase boosts' };
    }

    if (isProtect(move)) {
        if (memory.lastMyMove && memory.lastMyMoveTurn === ctx.turn - 1 && isProtect(battle.dex.moves.get(memory.lastMyMove))) {
            return { score: -Infinity, reason: 'protect twice' };
        }
        const chip = ['brn', 'psn', 'tox'].includes(foe.status) || me.item === 'leftovers';
        return { score: 10 + (chip ? 5 : 0), reason: 'scout' };
    }

    if (HAZARDS.has(move.id)) {
        const layers = foe.side.sideConditions[move.id]?.layers || (foe.side.sideConditions[move.id] ? 1 : 0);
        const maxLayers = move.id === 'spikes' ? 3 : move.id === 'toxicspikes' ? 2 : 1;
        if (layers >= maxLayers) return { score: -Infinity, reason: 'already set' };
        if (ctx.turn > 5 || knowledge.foeRemaining < 2) return { score: 0, reason: 'too late' };
        return { score: (25 * knowledge.foeRemaining) / 5, reason: 'hazards' };
    }

    if (move.weather) return { score: battle.field.weather === toID(move.weather) ? 0 : 6, reason: 'weather' };
    if (move.terrain) return { score: battle.field.terrain === toID(move.terrain) ? 0 : 6, reason: 'terrain' };
    return { score: 0 };
};
