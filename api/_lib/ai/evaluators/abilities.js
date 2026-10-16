import { toID } from '@pkmn/sim';

/**
 * Abilities that absorb or nullify a move type, by type. If the player's
 * Pokémon *could* have one (it is among its species' abilities) and hasn't
 * shown its ability yet, an attack of that type is discounted rather than
 * trusted — the AI doc's "× 0.3 if the target may be immune".
 */
const ABSORBERS = {
    Ground: ['levitate', 'eartheater'],
    Water: ['waterabsorb', 'stormdrain', 'dryskin'],
    Electric: ['voltabsorb', 'lightningrod', 'motordrive'],
    Fire: ['flashfire', 'wellbakedbody'],
    Grass: ['sapsipper'],
};

const SLEEP_PROOF = ['insomnia', 'vitalspirit', 'sweetveil', 'comatose', 'purifyingsalt'];

const possibleAbilities = (mon) => Object.values(mon.species.abilities).map(toID);

const unrevealed = (ctx, mon) => !ctx.knowledge.foe.get(mon.species.name)?.ability;

export const mayAbsorb = (ctx, mon, move) => {
    const absorbers = ABSORBERS[move.type];
    if (!absorbers || !unrevealed(ctx, mon)) return false;
    return possibleAbilities(mon).some((ability) => absorbers.includes(ability));
};

export const maySleepProof = (ctx, mon) => {
    if (!unrevealed(ctx, mon)) return SLEEP_PROOF.includes(ctx.knowledge.foe.get(mon.species.name)?.ability);
    return possibleAbilities(mon).some((ability) => SLEEP_PROOF.includes(ability));
};

/** A revealed ability, or null. */
export const revealedAbility = (ctx, mon) => ctx.knowledge.foe.get(mon.species.name)?.ability || null;
