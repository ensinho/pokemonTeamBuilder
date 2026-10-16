import { hpPctOf } from './estimate.js';
import { matchup } from './evaluators/switch.js';

/**
 * Who comes in after a faint: the best matchup against the player's active,
 * +50 for a revenge kill (moves first *and* likely KOs). The ace waits while
 * anyone else stands. When the player's active is down too (a double KO),
 * there is nothing to match against, so the healthiest goes in.
 *
 * @returns {Array<{option, score, parts, reason}>}
 */
export const scoreReplacements = (ctx, options) => {
    const { me, foe, est, personality } = ctx;
    const side = me.side;

    // Revival Blessing: bring back the strongest, the ace above all.
    if (options.some((o) => o.kind === 'revive')) {
        return options.map((option) => {
            const mon = side.pokemon[option.slot];
            const stats = Object.values(mon.species.baseStats).reduce((a, b) => a + b, 0);
            return { option, score: stats / 10 + (mon.species.name === personality.aceSpecies ? 30 : 0), reason: 'revive' };
        });
    }

    const nonAce = options.filter((o) => side.pokemon[o.slot]?.species.name !== personality.aceSpecies);
    const pool = nonAce.length ? nonAce : options;

    return options.map((option) => {
        const mon = side.pokemon[option.slot];
        if (!pool.includes(option)) return { option, score: -Infinity, reason: 'the ace comes last' };
        if (!foe || foe.fainted || foe.hp <= 0) return { option, score: hpPctOf(mon), reason: 'healthiest' };
        const m = matchup(ctx, mon);
        const revenge = m.first && m.deals.ko > 0.5 && est.actsFirst(mon, m.deals.moveId, foe, null) === 1;
        return {
            option,
            score: m.score + (revenge ? 50 : 0),
            parts: { matchup: m.score, revenge },
            reason: revenge ? 'revenge kill' : 'matchup',
        };
    });
};
