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

// Categorized move sets for ability calculations
export const SECONDARY_EFFECT_MOVES = new Set([
    // Status chance moves
    'thunderbolt', 'thunder', 'discharge', 'volt-tackle', 'spark', 'nuzzle', 'zap-cannon', 'thunder-punch',
    'body-slam', 'lick', 'force-palm', 'secret-power', 'bounce', 'dragon-breath', 'freeze-dry',
    'ice-beam', 'blizzard', 'powder-snow', 'ice-punch', 'ice-fang', 'frost-breath',
    'flamethrower', 'fire-blast', 'heat-wave', 'lava-plume', 'sacred-fire', 'inferno', 'ember',
    'flame-wheel', 'fire-punch', 'fire-fang', 'flare-blitz', 'scald', 'burning-jealousy', 'scorching-sands',
    'sludge-bomb', 'sludge-wave', 'poison-jab', 'gunk-shot', 'poison-tail', 'poison-sting', 'cross-poison', 'sludge',
    'tri-attack', 'smog', 'relic-song', 'syrup-bomb',
    // Flinch chance moves
    'rock-slide', 'iron-head', 'waterfall', 'zen-headbutt', 'dark-pulse', 'bite', 'air-slash',
    'icicle-crash', 'heart-stamp', 'headbutt', 'astonish', 'stomp', 'needle-arm', 'hyper-fang',
    'extrasensory', 'fake-out', 'crunch', 'air-cutter', 'steam-roller', 'fiery-wrath',
    // Stat drop chance (Target)
    'earth-power', 'moonblast', 'shadow-ball', 'energy-ball', 'psychic', 'acid-spray', 'play-rough',
    'flash-cannon', 'focus-blast', 'bug-buzz', 'apple-acid', 'grav-apple', 'mist-ball', 'luster-purge',
    'rock-tomb', 'icy-wind', 'mud-shot', 'electroweb', 'bulldoze', 'snarl', 'struggle-bug',
    'iron-tail', 'razor-shell', 'liquidation', 'spirit-break', 'skitter-leap', 'lunge', 'trop-kick',
    'low-sweep', 'acid', 'aurora-beam', 'bubble', 'bubble-beam', 'constrict', 'dazzling-gleam',
    'obstruct', 'octazooka', 'rock-smash', 'shadow-bone', 'springtide-storm',
    // Stat boost chance (User)
    'ancient-power', 'ominous-wind', 'silver-wind', 'charge-beam', 'fiery-dance', 'torch-song',
    'power-up-punch', 'metal-claw', 'steel-wing', 'meteor-mash', 'diamond-storm', 'crush-claw',
    'rage-fist',
]);

export const SLICING_MOVES = new Set([
    'leaf-blade', 'air-slash', 'ceaseless-edge', 'aqua-cutter', 'psycho-cut', 'sacred-sword',
    'slash', 'night-slash', 'x-scissor', 'stone-axe', 'kowtow-cleave', 'bitter-blade',
    'population-bomb', 'razor-leaf', 'air-cutter', 'cut', 'cross-poison', 'solar-blade', 'secret-sword'
]);

export const PUNCHING_MOVES = new Set([
    'fire-punch', 'ice-punch', 'thunder-punch', 'drain-punch', 'shadow-punch', 'mach-punch',
    'bullet-punch', 'rage-fist', 'dynamic-punch', 'meteor-mash', 'hammer-arm', 'focus-punch',
    'plasma-fists', 'surging-strikes', 'wicked-blow', 'ice-hammer', 'sky-upper-cut', 'headlong-rush'
]);

export const BITING_MOVES = new Set([
    'bite', 'crunch', 'fire-fang', 'ice-fang', 'thunder-fang', 'psychic-fangs', 'poison-fang',
    'hyper-fang', 'fishious-rend', 'jaw-lock'
]);

export const RECOIL_MOVES = new Set([
    'double-edge', 'flare-blitz', 'brave-bird', 'head-smash', 'high-jump-kick', 'jump-kick',
    'wood-hammer', 'wave-crash', 'take-down', 'wild-charge', 'submission', 'volt-tackle', 'head-charge'
]);

export const PULSE_MOVES = new Set([
    'aura-sphere', 'dark-pulse', 'dragon-pulse', 'water-pulse', 'origin-pulse', 'terrain-pulse', 'heal-pulse'
]);

export const SOUND_MOVES = new Set([
    'alluring-voice', 'bark', 'boomburst', 'bug-buzz', 'chatter', 'clanging-scales',
    'clangorous-soul', 'confide', 'disarming-voice', 'echoed-voice', 'eerie-spell',
    'grass-whistle', 'growl', 'heal-bell', 'hyper-voice', 'howl', 'metal-sound',
    'noble-roar', 'overdrive', 'parting-shot', 'perish-song', 'psychic-noise',
    'relic-song', 'roar', 'round', 'screech', 'shadow-panic', 'sing',
    'snarl', 'snore', 'sparkling-aria', 'supersonic', 'torch-song', 'uproar'
]);

export const BALL_BOMB_MOVES = new Set([
    'shadow-ball', 'sludge-bomb', 'focus-blast', 'energy-ball', 'gyro-ball', 'electro-ball',
    'weather-ball', 'pyro-ball', 'misty-explosion', 'magnet-bomb', 'egg-bomb', 'acid-spray',
    'aura-sphere', 'bullet-seed', 'rock-wrecker', 'sear-shot', 'syrup-bomb', 'zap-cannon'
]);

const toChartKey = (type) => type.charAt(0).toUpperCase() + type.slice(1);

// Combined type multiplier of an attacking type vs. the defender's type(s).
export const typeEffectiveness = (attackingType, defendingTypes = []) => {
    if (!attackingType) return 1;
    return defendingTypes.reduce((product, def) => {
        const taken = typeChart[def.toLowerCase()]?.damageTaken;
        return product * (taken?.[toChartKey(attackingType)] ?? 1);
    }, 1);
};

export const getEffectiveMoveType = (moveType, ability, moveName = '') => {
    if (!ability || !moveType) return moveType;
    const normName = (moveName || '').toLowerCase().trim();

    if (ability === 'refrigerate' && moveType === 'normal') return 'ice';
    if (ability === 'pixilate' && moveType === 'normal') return 'fairy';
    if (ability === 'aerilate' && moveType === 'normal') return 'flying';
    if (ability === 'galvanize' && moveType === 'normal') return 'electric';
    if (ability === 'normalize') return 'normal';
    if (ability === 'liquid-voice' && SOUND_MOVES.has(normName)) return 'water';

    return moveType;
};

/**
 * Estimate damage rolls using complete competitive Pokemon calculations.
 *
 * Scoped to include levels, stats (IVs, EVs, Nature), Weather, Terrain, format,
 * attacker status (burn), attacker/defender items, attacker/defender abilities,
 * Terastallization, screens, hazards, and Helping Hand.
 *
 * @returns {object|null} damage roll details
 */
export const calcDamage = ({
    level = 50,
    movePower,
    moveType,
    moveCategory, // 'physical' | 'special'
    moveName = '',
    isSpread = false,
    attacker,     // { baseStats, types, evs?, ivs?, nature?, level?, ability?, item?, status?, isTerastallized?, teraType? }
    defender,     // { baseStats, types, evs?, ivs?, nature?, level?, ability?, item?, status?, isTerastallized?, teraType?, currentHp? }
    field,        // { format, weather, terrain, attackerSide, defenderSide }
    isCritical = false,
}) => {
    if (!movePower || !attacker?.baseStats || !defender?.baseStats) return null;
    if (moveCategory !== 'physical' && moveCategory !== 'special') return null;

    const normName = (moveName || '').toLowerCase().trim();
    const atkLevel = attacker.level || level || 50;
    const defLevel = defender.level || level || 50;

    // Type-changing abilities
    const effectiveMoveType = getEffectiveMoveType(moveType, attacker?.ability, moveName);
    let ateBoost = 1.0;
    if (['aerilate', 'pixilate', 'refrigerate', 'galvanize', 'normalize'].includes(attacker?.ability) && (moveType === 'normal' || attacker?.ability === 'normalize')) {
        ateBoost = 1.2;
    }

    const atkKey = moveCategory === 'physical' ? 'attack' : 'special-attack';
    const defKey = moveCategory === 'physical' ? 'defense' : 'special-defense';

    // 1. Offensive stat calculation (A)
    let A = calcStat({
        base: attacker.baseStats[atkKey], statKey: atkKey, level: atkLevel,
        ev: attacker.evs?.[atkKey] ?? 0, iv: attacker.ivs?.[atkKey] ?? 31, nature: attacker.nature,
    });

    if (atkKey === 'attack') {
        if (attacker.ability === 'huge-power' || attacker.ability === 'pure-power') {
            A *= 2;
        }
        if (attacker.ability === 'guts' && attacker.status && attacker.status !== 'healthy') {
            A = Math.floor(A * 1.5);
        }
        if (attacker.ability === 'hustle' || attacker.ability === 'gorilla-tactics') {
            A = Math.floor(A * 1.5);
        }
        if (attacker.ability === 'toxic-boost' && attacker.status === 'poisoned') {
            A = Math.floor(A * 1.5);
        }
        if (attacker.ability === 'orichalcum-pulse' && field?.weather === 'sun') {
            A = Math.floor(A * 1.333);
        }
    } else if (atkKey === 'special-attack') {
        if (attacker.ability === 'solar-power' && field?.weather === 'sun') {
            A = Math.floor(A * 1.5);
        }
        if (attacker.ability === 'flare-boost' && attacker.status === 'burned') {
            A = Math.floor(A * 1.5);
        }
        if (attacker.ability === 'hadron-engine' && field?.terrain === 'electric') {
            A = Math.floor(A * 1.333);
        }
    }

    if (defender.ability === 'tablets-of-ruin' && atkKey === 'attack') {
        A = Math.floor(A * 0.75);
    }
    if (defender.ability === 'vessel-of-ruin' && atkKey === 'special-attack') {
        A = Math.floor(A * 0.75);
    }
    if (attacker.ability === 'slow-start' && atkKey === 'attack') {
        A = Math.floor(A * 0.5);
    }

    if (atkKey === 'attack' && attacker.item === 'choice-band') {
        A = Math.floor(A * 1.5);
    } else if (atkKey === 'special-attack' && attacker.item === 'choice-specs') {
        A = Math.floor(A * 1.5);
    }

    // 2. Defensive stat calculation (D)
    let D = calcStat({
        base: defender.baseStats[defKey], statKey: defKey, level: defLevel,
        ev: defender.evs?.[defKey] ?? 0, iv: defender.ivs?.[defKey] ?? 31, nature: defender.nature,
    });

    const defenderTypes = defender.isTerastallized && defender.teraType
        ? [defender.teraType]
        : defender.types || [];

    if (field?.weather === 'sand' && defenderTypes.includes('rock') && defKey === 'special-defense') {
        D = Math.floor(D * 1.5);
    }
    if (field?.weather === 'snow' && defenderTypes.includes('ice') && defKey === 'defense') {
        D = Math.floor(D * 1.5);
    }

    if (defKey === 'defense') {
        if (defender.ability === 'fur-coat') {
            D *= 2;
        }
        if (field?.terrain === 'grassy' && defender.ability === 'grass-pelt') {
            D = Math.floor(D * 1.5);
        }
    }
    if (defender.ability === 'marvel-scale' && defender.status && defender.status !== 'healthy' && defKey === 'defense') {
        D = Math.floor(D * 1.5);
    }

    if (attacker.ability === 'sword-of-ruin' && defKey === 'defense') {
        D = Math.floor(D * 0.75);
    }
    if (attacker.ability === 'beads-of-ruin' && defKey === 'special-defense') {
        D = Math.floor(D * 0.75);
    }

    if (defKey === 'special-defense' && defender.item === 'assault-vest') {
        D = Math.floor(D * 1.5);
    }
    if (defender.item === 'eviolite') {
        D = Math.floor(D * 1.5);
    }

    // HP calculation
    const defenderHP = calcStat({
        base: defender.baseStats.hp, statKey: 'hp', level: defLevel,
        ev: defender.evs?.hp ?? 0, iv: defender.ivs?.hp ?? 31,
    });

    // 3. Base Damage calculation
    let calcPower = movePower;
    if (attacker.ability === 'technician' && calcPower <= 60) {
        calcPower *= 1.5;
    }

    const levelFactor = Math.floor((2 * atkLevel) / 5) + 2;
    let baseDamage = Math.floor(Math.floor((levelFactor * calcPower * A) / D) / 50) + 2;

    // 4. Modifiers
    // Format / Spread
    let formatMult = 1.0;
    if (field?.format === 'doubles' && isSpread) {
        formatMult = 0.75;
    }

    // Weather
    let weatherMult = 1.0;
    if (field?.weather === 'sun') {
        if (effectiveMoveType === 'fire') weatherMult = 1.5;
        else if (effectiveMoveType === 'water') weatherMult = 0.5;
    } else if (field?.weather === 'rain') {
        if (effectiveMoveType === 'water') weatherMult = 1.5;
        else if (effectiveMoveType === 'fire') weatherMult = 0.5;
    }

    // Critical Hit
    let critMult = 1.0;
    if (isCritical) {
        critMult = attacker.ability === 'sniper' ? 2.25 : 1.5;
    }

    // STAB
    let stab = 1.0;
    const attackerOriginalTypes = attacker.types || [];
    const isAdaptability = attacker.ability === 'adaptability';
    const normalStabVal = isAdaptability ? 2.0 : 1.5;
    const doubleStabVal = isAdaptability ? 2.25 : 2.0;

    if (attacker.isTerastallized && attacker.teraType) {
        const matchesOriginal = attackerOriginalTypes.includes(effectiveMoveType);
        const matchesTera = attacker.teraType === effectiveMoveType;
        if (matchesOriginal && matchesTera) {
            stab = doubleStabVal;
        } else if (matchesOriginal || matchesTera) {
            stab = normalStabVal;
        }
    } else {
        if (attackerOriginalTypes.includes(effectiveMoveType)) {
            stab = normalStabVal;
        }
    }

    // Type Effectiveness & Immunities
    let effectiveness = typeEffectiveness(effectiveMoveType, defenderTypes);

    // Defender Ability Immunities
    if ((defender.ability === 'levitate' || defender.ability === 'earth-eater') && effectiveMoveType === 'ground') {
        effectiveness = 0;
    } else if ((defender.ability === 'flash-fire' || defender.ability === 'well-baked-body') && effectiveMoveType === 'fire') {
        effectiveness = 0;
    } else if ((defender.ability === 'water-absorb' || defender.ability === 'storm-drain') && effectiveMoveType === 'water') {
        effectiveness = 0;
    } else if ((defender.ability === 'volt-absorb' || defender.ability === 'lightning-rod' || defender.ability === 'motor-drive') && effectiveMoveType === 'electric') {
        effectiveness = 0;
    } else if (defender.ability === 'sap-sipper' && effectiveMoveType === 'grass') {
        effectiveness = 0;
    } else if (defender.ability === 'bulletproof' && BALL_BOMB_MOVES.has(normName)) {
        effectiveness = 0;
    } else if (defender.ability === 'soundproof' && SOUND_MOVES.has(normName)) {
        effectiveness = 0;
    } else if (defender.ability === 'wonder-guard' && effectiveness <= 1) {
        effectiveness = 0;
    }

    // Burn status
    let burnMult = 1.0;
    if (attacker.status === 'burned' && moveCategory === 'physical' && attacker.ability !== 'guts') {
        burnMult = 0.5;
    }

    // Other Multipliers (Helping Hand, Abilities, Items, Screens)
    let otherMult = 1.0;

    if (field?.attackerSide?.helpingHand) {
        otherMult *= 1.5;
    }

    if (ateBoost > 1.0) {
        otherMult *= ateBoost;
    }

    // Attacker Abilities
    if (attacker.ability === 'sheer-force' && (SECONDARY_EFFECT_MOVES.has(normName) || attacker.hasSecondaryEffect)) {
        otherMult *= 1.3;
    }
    if (attacker.ability === 'transistor' && effectiveMoveType === 'electric') {
        otherMult *= 1.3;
    }
    if (attacker.ability === 'dragons-maw' && effectiveMoveType === 'dragon') {
        otherMult *= 1.5;
    }
    if (attacker.ability === 'rocky-payload' && effectiveMoveType === 'rock') {
        otherMult *= 1.5;
    }
    if (attacker.ability === 'water-bubble' && effectiveMoveType === 'water') {
        otherMult *= 2.0;
    }
    if ((attacker.ability === 'steely-spirit' || attacker.ability === 'steelworker') && effectiveMoveType === 'steel') {
        otherMult *= 1.5;
    }
    if (attacker.ability === 'tinted-lens' && effectiveness < 1) {
        otherMult *= 2.0;
    }
    if (attacker.ability === 'neuroforce' && effectiveness > 1) {
        otherMult *= 1.25;
    }
    if (attacker.ability === 'dark-aura' && effectiveMoveType === 'dark') {
        otherMult *= 1.33;
    }
    if (attacker.ability === 'fairy-aura' && effectiveMoveType === 'fairy') {
        otherMult *= 1.33;
    }
    if (attacker.ability === 'sharpness' && SLICING_MOVES.has(normName)) {
        otherMult *= 1.5;
    }
    if (attacker.ability === 'iron-fist' && PUNCHING_MOVES.has(normName)) {
        otherMult *= 1.2;
    }
    if (attacker.ability === 'strong-jaw' && BITING_MOVES.has(normName)) {
        otherMult *= 1.5;
    }
    if (attacker.ability === 'mega-launcher' && PULSE_MOVES.has(normName)) {
        otherMult *= 1.5;
    }
    if (attacker.ability === 'punk-rock' && SOUND_MOVES.has(normName)) {
        otherMult *= 1.3;
    }
    if (attacker.ability === 'reckless' && RECOIL_MOVES.has(normName)) {
        otherMult *= 1.2;
    }
    if (attacker.ability === 'tough-claws' && moveCategory === 'physical') {
        otherMult *= 1.3;
    }
    if (attacker.ability === 'sand-force' && field?.weather === 'sand' && ['rock', 'ground', 'steel'].includes(effectiveMoveType)) {
        otherMult *= 1.3;
    }
    if (attacker.ability === 'analytic') {
        const atkSpd = calcStat({ base: attacker.baseStats.speed, statKey: 'speed', level: atkLevel, ev: attacker.evs?.speed ?? 0, iv: attacker.ivs?.speed ?? 31, nature: attacker.nature });
        const defSpd = calcStat({ base: defender.baseStats.speed, statKey: 'speed', level: defLevel, ev: defender.evs?.speed ?? 0, iv: defender.ivs?.speed ?? 31, nature: defender.nature });
        if (atkSpd < defSpd) {
            otherMult *= 1.3;
        }
    }
    if (attacker.ability === 'supreme-overlord') {
        otherMult *= 1.1;
    }
    if (attacker.ability === 'overgrow' && effectiveMoveType === 'grass') otherMult *= 1.5;
    if (attacker.ability === 'blaze' && effectiveMoveType === 'fire') otherMult *= 1.5;
    if (attacker.ability === 'torrent' && effectiveMoveType === 'water') otherMult *= 1.5;
    if (attacker.ability === 'swarm' && effectiveMoveType === 'bug') otherMult *= 1.5;
    if (attacker.ability === 'flash-fire' && effectiveMoveType === 'fire') otherMult *= 1.5;

    // Attacker Items
    if (attacker.item === 'life-orb') {
        otherMult *= 1.3;
    }
    if (attacker.item === 'expert-belt' && effectiveness > 1) {
        otherMult *= 1.2;
    }
    if (attacker.item === 'muscle-band' && moveCategory === 'physical') {
        otherMult *= 1.1;
    }
    if (attacker.item === 'wise-glasses' && moveCategory === 'special') {
        otherMult *= 1.1;
    }
    const itemTypeBoosts = {
        'charcoal': 'fire', 'mystic-water': 'water', 'magnet': 'electric',
        'miracle-seed': 'grass', 'never-melt-ice': 'ice', 'black-belt': 'fighting',
        'poison-barb': 'poison', 'soft-sand': 'ground', 'sharp-beak': 'flying',
        'twisted-spoon': 'psychic', 'silver-powder': 'bug', 'hard-stone': 'rock',
        'spell-tag': 'ghost', 'dragon-fang': 'dragon', 'black-glasses': 'dark',
        'metal-coat': 'steel', 'silk-scarf': 'normal', 'pixie-plate': 'fairy'
    };
    if (itemTypeBoosts[attacker.item] === effectiveMoveType) {
        otherMult *= 1.2;
    }

    // Terrain Multipliers (Electric, Grassy, Psychic Terrain boost same-type by 1.3x)
    if (field?.terrain === 'electric' && effectiveMoveType === 'electric') {
        otherMult *= 1.3;
    } else if (field?.terrain === 'grassy') {
        if (effectiveMoveType === 'grass') otherMult *= 1.3;
        else if (['earthquake', 'bulldoze', 'magnitude'].includes(normName)) otherMult *= 0.5;
    } else if (field?.terrain === 'psychic' && effectiveMoveType === 'psychic') {
        otherMult *= 1.3;
    } else if (field?.terrain === 'misty' && effectiveMoveType === 'dragon') {
        otherMult *= 0.5;
    }

    // Defender Abilities
    if (defender.ability === 'multiscale' || defender.ability === 'shadow-shield') {
        const currentHp = defender.currentHp !== undefined ? defender.currentHp : defenderHP;
        if (currentHp >= defenderHP) {
            otherMult *= 0.5;
        }
    }
    if (defender.ability === 'fluffy') {
        if (moveCategory === 'physical') otherMult *= 0.5;
        if (effectiveMoveType === 'fire') otherMult *= 2.0;
    }
    if (defender.ability === 'ice-scales' && moveCategory === 'special') {
        otherMult *= 0.5;
    }
    if (defender.ability === 'thick-fat' && (effectiveMoveType === 'fire' || effectiveMoveType === 'ice')) {
        otherMult *= 0.5;
    }
    if (defender.ability === 'heatproof' && effectiveMoveType === 'fire') {
        otherMult *= 0.5;
    }
    if (defender.ability === 'purifying-salt' && effectiveMoveType === 'ghost') {
        otherMult *= 0.5;
    }
    if (defender.ability === 'punk-rock' && SOUND_MOVES.has(normName)) {
        otherMult *= 0.5;
    }
    if (defender.ability === 'dry-skin') {
        if (effectiveMoveType === 'fire') otherMult *= 1.25;
        else if (effectiveMoveType === 'water') otherMult = 0;
    }
    if (defender.ability === 'water-bubble' && effectiveMoveType === 'fire') {
        otherMult *= 0.5;
    }
    if (['solid-rock', 'filter', 'prism-armor'].includes(defender.ability) && effectiveness > 1) {
        otherMult *= 0.75;
    }

    // Friend Guard
    if (field?.defenderSide?.friendGuard) {
        otherMult *= 0.75;
    }

    // Defender Screens (Crits bypass screens)
    if (!isCritical) {
        const screenReduction = field?.format === 'doubles' ? (2 / 3) : 0.5;
        if (field?.defenderSide?.reflect && moveCategory === 'physical') {
            otherMult *= screenReduction;
        }
        if (field?.defenderSide?.lightScreen && moveCategory === 'special') {
            otherMult *= screenReduction;
        }
        if (field?.defenderSide?.auroraVeil) {
            otherMult *= screenReduction;
        }
    }

    // 5. Apply Roll calculation
    const applySingleRoll = (rollValue) => {
        let d = baseDamage;
        d = Math.floor(d * formatMult);
        d = Math.floor(d * weatherMult);
        d = Math.floor(d * critMult);
        d = Math.floor((d * rollValue) / 100);
        d = Math.floor(d * stab);
        d = Math.floor(d * effectiveness);
        d = Math.floor(d * burnMult);
        d = Math.floor(d * otherMult);
        return d;
    };

    const rolls = Array.from({ length: 16 }, (_, i) => 85 + i);
    const damageRolls = rolls.map(r => applySingleRoll(r));
    const minDamage = damageRolls[0];
    const maxDamage = damageRolls[15];

    // Hazards damage
    let hazardsDamage = 0;
    if (field?.defenderSide?.stealthRock) {
        const rockEffectiveness = typeEffectiveness('rock', defenderTypes);
        hazardsDamage += Math.floor(defenderHP * (0.125 * rockEffectiveness));
    }
    if (field?.defenderSide?.spikes > 0) {
        const isGrounded = !defenderTypes.includes('flying') && defender.ability !== 'levitate';
        if (isGrounded) {
            const layers = field.defenderSide.spikes;
            const spikesFractions = [0, 0.125, 0.1667, 0.25];
            const frac = spikesFractions[layers] || 0;
            hazardsDamage += Math.floor(defenderHP * frac);
        }
    }

    const currentHPVal = defender.currentHp !== undefined ? defender.currentHp : defenderHP;
    const hpToDefeat = Math.max(1, currentHPVal - hazardsDamage);

    let koText = '';
    let koHits = 1;
    let koGuaranteed = false;

    if (minDamage <= 0) {
        koText = 'Deals no damage';
        koHits = Infinity;
        koGuaranteed = false;
    } else if (hazardsDamage >= currentHPVal) {
        koText = 'guaranteed KO from hazards alone';
        koHits = 0;
        koGuaranteed = true;
    } else {
        if (minDamage >= hpToDefeat) {
            koText = 'guaranteed 1HKO';
            koHits = 1;
            koGuaranteed = true;
        } else if (maxDamage >= hpToDefeat) {
            const koCount = damageRolls.filter(d => d >= hpToDefeat).length;
            const chance = Math.round((koCount / 16) * 100);
            koText = `possible 1HKO (${chance}% chance)`;
            koHits = 1;
            koGuaranteed = false;
        } else {
            // Check for 2HKO
            const min2 = minDamage * 2;
            const max2 = maxDamage * 2;
            if (min2 >= hpToDefeat) {
                koText = 'guaranteed 2HKO';
                koHits = 2;
                koGuaranteed = true;
            } else if (max2 >= hpToDefeat) {
                let koPairs = 0;
                for (let i = 0; i < 16; i++) {
                    for (let j = 0; j < 16; j++) {
                        if (damageRolls[i] + damageRolls[j] >= hpToDefeat) koPairs++;
                    }
                }
                const chance = Math.round((koPairs / 256) * 100);
                koText = `possible 2HKO (${chance}% chance)`;
                koHits = 2;
                koGuaranteed = false;
            } else {
                // Check for 3HKO
                const min3 = minDamage * 3;
                const max3 = maxDamage * 3;
                if (min3 >= hpToDefeat) {
                    koText = 'guaranteed 3HKO';
                    koHits = 3;
                    koGuaranteed = true;
                } else if (max3 >= hpToDefeat) {
                    koText = 'possible 3HKO';
                    koHits = 3;
                    koGuaranteed = false;
                } else {
                    // Check for 4HKO
                    const min4 = minDamage * 4;
                    const max4 = maxDamage * 4;
                    if (min4 >= hpToDefeat) {
                        koText = 'guaranteed 4HKO';
                        koHits = 4;
                        koGuaranteed = true;
                    } else if (max4 >= hpToDefeat) {
                        koText = 'possible 4HKO';
                        koHits = 4;
                        koGuaranteed = false;
                    } else {
                        koText = 'possible 5HKO or worse';
                        koHits = 5;
                        koGuaranteed = false;
                    }
                }
            }
        }
    }

    return {
        defenderHP,
        effectiveness,
        effectiveType: effectiveMoveType,
        stab: stab > 1.0,
        minDamage,
        maxDamage,
        minPct: Math.round((minDamage / defenderHP) * 1000) / 10,
        maxPct: Math.round((maxDamage / defenderHP) * 1000) / 10,
        koHits,
        koGuaranteed,
        koText,
        damageRolls,
        hazardsDamage,
    };
};
