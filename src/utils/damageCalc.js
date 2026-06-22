import { typeChart } from '../constants/types';

// Each nature raises one stat 10% and lowers another 10% (neutral natures: none).
// Keys match the app's stat naming (attack / defense / special-attack / …).
export const NATURE_MODIFIERS = {
    hardy: {}, docile: {}, serious: {}, bashful: {}, quirky: {},
    lonely: { plus: 'attack', minus: 'defense' },
    brave: { plus: 'attack', minus: 'speed' },
    adamant: { plus: 'attack', minus: 'special-attack' },
    naughty: { plus: 'attack', minus: 'special-defense' },
    bold: { plus: 'defense', minus: 'attack' },
    relaxed: { plus: 'defense', minus: 'speed' },
    impish: { plus: 'defense', minus: 'special-attack' },
    lax: { plus: 'defense', minus: 'special-defense' },
    timid: { plus: 'speed', minus: 'attack' },
    hasty: { plus: 'speed', minus: 'defense' },
    jolly: { plus: 'speed', minus: 'special-attack' },
    naive: { plus: 'speed', minus: 'special-defense' },
    modest: { plus: 'special-attack', minus: 'attack' },
    mild: { plus: 'special-attack', minus: 'defense' },
    quiet: { plus: 'special-attack', minus: 'speed' },
    rash: { plus: 'special-attack', minus: 'special-defense' },
    calm: { plus: 'special-defense', minus: 'attack' },
    gentle: { plus: 'special-defense', minus: 'defense' },
    sassy: { plus: 'special-defense', minus: 'speed' },
    careful: { plus: 'special-defense', minus: 'special-attack' },
};

export const natureMultiplier = (nature, statKey) => {
    const mod = NATURE_MODIFIERS[nature] || {};
    if (mod.plus === statKey) return 1.1;
    if (mod.minus === statKey) return 0.9;
    return 1;
};

// Mainline stat formula. HP uses a distinct equation from the other five stats.
export const calcStat = ({ base, iv = 31, ev = 0, level = 50, nature = 'serious', statKey }) => {
    const common = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100);
    if (statKey === 'hp') {
        // Shedinja-style 1-HP edge case is out of scope; standard HP otherwise.
        return common + level + 10;
    }
    return Math.floor((common + 5) * natureMultiplier(nature, statKey));
};

const toChartKey = (type) => type.charAt(0).toUpperCase() + type.slice(1);

// Combined type multiplier of an attacking type vs. the defender's type(s).
export const typeEffectiveness = (attackingType, defendingTypes = []) => {
    if (!attackingType) return 1;
    return defendingTypes.reduce((product, def) => {
        const taken = typeChart[def]?.damageTaken;
        return product * (taken?.[toChartKey(attackingType)] ?? 1);
    }, 1);
};

/**
 * Estimate a damage roll for one hit using the mainline formula.
 *
 * Intentionally scoped to the dominant factors — level, the relevant offensive/
 * defensive stats, STAB, type effectiveness and an optional critical hit. Weather,
 * abilities, items and field effects are not modelled, so this is a strong estimate
 * rather than a frame-perfect simulator.
 *
 * @returns {object|null} roll summary, or null when inputs are insufficient
 */
export const calcDamage = ({
    level = 50,
    movePower,
    moveType,
    moveCategory, // 'physical' | 'special'
    attacker,     // { baseStats, types, evs?, ivs?, nature? }
    defender,     // { baseStats, types, evs?, ivs?, nature? }
    isCritical = false,
}) => {
    if (!movePower || !attacker?.baseStats || !defender?.baseStats) return null;
    if (moveCategory !== 'physical' && moveCategory !== 'special') return null;

    const atkKey = moveCategory === 'physical' ? 'attack' : 'special-attack';
    const defKey = moveCategory === 'physical' ? 'defense' : 'special-defense';

    const A = calcStat({
        base: attacker.baseStats[atkKey], statKey: atkKey, level,
        ev: attacker.evs?.[atkKey] ?? 0, iv: attacker.ivs?.[atkKey] ?? 31, nature: attacker.nature,
    });
    const D = calcStat({
        base: defender.baseStats[defKey], statKey: defKey, level,
        ev: defender.evs?.[defKey] ?? 0, iv: defender.ivs?.[defKey] ?? 31, nature: defender.nature,
    });
    const defenderHP = calcStat({
        base: defender.baseStats.hp, statKey: 'hp', level,
        ev: defender.evs?.hp ?? 0, iv: defender.ivs?.hp ?? 31,
    });

    const levelFactor = Math.floor((2 * level) / 5) + 2;
    let baseDamage = Math.floor(Math.floor((levelFactor * movePower * A) / D) / 50) + 2;

    if (isCritical) baseDamage = Math.floor(baseDamage * 1.5);

    const stab = attacker.types?.includes(moveType) ? 1.5 : 1;
    const effectiveness = typeEffectiveness(moveType, defender.types);

    const applyRoll = (roll) => {
        let d = Math.floor(baseDamage * roll);
        d = Math.floor(d * stab);
        d = Math.floor(d * effectiveness);
        return d;
    };

    const minDamage = applyRoll(0.85);
    const maxDamage = applyRoll(1.0);

    const pct = (d) => Math.round((d / defenderHP) * 1000) / 10;
    const hitsToKO = (d) => (d > 0 ? Math.ceil(defenderHP / d) : Infinity);

    const guaranteedHits = hitsToKO(minDamage); // worst roll
    const possibleHits = hitsToKO(maxDamage);   // best roll

    return {
        defenderHP,
        effectiveness,
        stab: stab > 1,
        minDamage,
        maxDamage,
        minPct: pct(minDamage),
        maxPct: pct(maxDamage),
        // If best and worst roll agree on hit count, the KO is guaranteed.
        koHits: guaranteedHits === possibleHits ? guaranteedHits : possibleHits,
        koGuaranteed: guaranteedHits === possibleHits && Number.isFinite(guaranteedHits),
    };
};
