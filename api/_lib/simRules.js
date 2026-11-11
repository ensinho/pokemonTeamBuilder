import { Dex } from '@pkmn/sim';

/**
 * Our own battle rules, registered on `@pkmn/sim`'s rulesets so a format string
 * can name them after `@@@` like any Showdown rule.
 *
 * Importing this module is what registers them — `battleResolver.js` and
 * `challenge/engine.js` do, so every battle this server builds can read a
 * format that names one. A rule only ever *joins* a format: battles already
 * running keep the format they started with (it is part of the replay), so
 * adding a rule to `PVP_FORMAT` / the challenge's `FORMAT` changes new battles
 * and never re-rolls an old one.
 */

/**
 * **Quick Thaw Mod** (2026-11-11, Enzo: "a chance de descongelar tá muito
 * baixa"). The games thaw a frozen Pokémon 1 time in 5 before it moves; that
 * makes a freeze a coin with five faces against you, and a Pokémon frozen in a
 * six-against-six often sat out the battle. This rolls once more, first, at
 * 1 in 6: 1/6 + 5/6 × 1/5 = **1/3** a turn. Moves that defrost the user (Flame
 * Wheel, Scald…) are left to the status itself, which already thaws them.
 *
 * It runs before the status (priority 11 over `frz`'s 10). When it thaws, the
 * status's own handler is skipped — the sim drops a status handler whose status
 * changed during the event — so a Pokémon never thaws twice or thaws and then
 * "is frozen solid" in the same breath.
 */
export const QUICK_THAW_RULE = 'Quick Thaw Mod';
export const QUICK_THAW_CHANCE = [1, 6];

const RULES = {
    quickthawmod: {
        effectType: 'Rule',
        name: QUICK_THAW_RULE,
        desc: 'A frozen Pokémon thaws 1 time in 3 before it moves, instead of 1 in 5.',
        onBeforeMovePriority: 11,
        onBeforeMove(pokemon, _target, move) {
            if (pokemon.status !== 'frz') return;
            if (move.flags.defrost && !(move.id === 'burnup' && !pokemon.hasType('Fire'))) return;
            if (this.randomChance(...QUICK_THAW_CHANCE)) pokemon.cureStatus();
        },
    },
};

for (const [id, rule] of Object.entries(RULES)) {
    if (!Dex.data.Rulesets[id]) Dex.data.Rulesets[id] = rule;
}
