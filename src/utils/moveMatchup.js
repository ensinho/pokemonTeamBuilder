import { typeChart } from '../constants/typeChart';

/**
 * How a move lands on the Pokémon in front of it — the battle HUD's
 * "Super eficaz ×2" (2026-11-17, the HUD clarity pass: a trainer should not
 * need the type chart in their head to pick a move). Pure; the battle screen
 * passes the move's type and category (battle-dex.json) and the target's
 * types and abilities.
 *
 * Only what is certain is said: the type chart, a Terastallized target's one
 * type, and Levitate when it is the species' only ability. Abilities that may
 * or may not be there (Flash Fire, Water Absorb…), items and field effects are
 * left to the battle text. Status moves have no reading.
 */

const cap = (type) => (type ? type[0].toUpperCase() + type.slice(1).toLowerCase() : '');

/** The chart's multiplier of `moveType` on a Pokémon of `defenderTypes`. */
export const typeMultiplier = (moveType, defenderTypes = []) => {
    const attacking = cap(moveType);
    return defenderTypes.reduce((product, type) => {
        const row = typeChart[String(type).toLowerCase()];
        const factor = row?.damageTaken?.[attacking];
        return product * (Number.isFinite(factor) ? factor : 1);
    }, 1);
};

/** The tone a multiplier reads as: 'immune' | 'super' | 'weak' | 'neutral'. */
export const matchupTone = (multiplier) => {
    if (multiplier === 0) return 'immune';
    if (multiplier >= 2) return 'super';
    if (multiplier < 1) return 'weak';
    return 'neutral';
};

/** "×2", "×½", "×¼", "×0" — the figure on the move's button. */
export const multiplierLabel = (multiplier) => {
    if (multiplier === 0.5) return '×½';
    if (multiplier === 0.25) return '×¼';
    return `×${multiplier}`;
};

/**
 * The types a target defends with: a Terastallized one has only its Tera type
 * (Stellar keeps its own), anyone else the species' types.
 */
export const defenderTypesOf = ({ types = [], teraType = null } = {}) => {
    const tera = String(teraType || '').toLowerCase();
    if (tera && tera !== 'stellar' && typeChart[tera]) return [tera];
    return types.map((type) => String(type).toLowerCase());
};

/**
 * `{ multiplier, tone }` for a move on a target, or null when there is nothing
 * to say (a status move, an unknown move or target).
 */
export const moveMatchup = ({ moveType, category, target } = {}) => {
    if (!moveType || !target || String(category).toLowerCase() === 'status') return null;
    const types = defenderTypesOf(target);
    if (!types.length) return null;
    let multiplier = typeMultiplier(moveType, types);
    const abilities = target.abilities || [];
    if (String(moveType).toLowerCase() === 'ground' && abilities.length === 1 && abilities[0] === 'Levitate') {
        multiplier = 0;
    }
    return { multiplier, tone: matchupTone(multiplier) };
};
