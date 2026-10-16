import { Battle, toID } from '@pkmn/sim';

/**
 * `Battle.fromJSON` adopts the JSON's `log` array instead of copying it, so two
 * clones of one JSON would write into the same log (and a clone of a raw
 * `toJSON()` into the live battle's — see engine.snapshot). Every clone here
 * gets its own.
 */
const cloneOf = (json) => {
    const battle = Battle.fromJSON({ ...json, log: json.log.slice() });
    battle.send = () => {};
    return battle;
};

/**
 * The battle as Cynthia believes it to be (invariant I5).
 *
 * A clone of the snapshot in which every player Pokémon she has seen carries
 * only what she has seen: unrevealed items are gone, unrevealed abilities are
 * the species' first, stats follow a standard spread, and the move list is the
 * revealed moves plus one STAB per type. All her estimates and simulations run
 * on this clone, so changing the player's hidden item or EVs cannot change her
 * decision — she errs the way a human across the table would.
 *
 * Validated in the 2026-10-14 spike: her Stone Edge into a real Assault Vest,
 * 252 HP/SpD Togekiss does 120–142; into the believed one, 110–130.
 *
 * Unseen bench Pokémon are left as they are but never read: the lookahead
 * never switches the player (`lookahead.js`).
 */

/** Random-battle style spread: 84 EVs everywhere, perfect IVs, neutral nature. */
const BELIEVED_SPREAD = {
    evs: { hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    nature: 'Serious',
};

/**
 * A stand-in for an unseen STAB: a real move of that type at about 90 base
 * power and full accuracy (real, so the lookahead can actually choose it).
 * `[physical, special]`.
 */
export const STAB_STAND_INS = {
    Normal: ['bodyslam', 'hypervoice'],
    Fire: ['blazekick', 'flamethrower'],
    Water: ['liquidation', 'surf'],
    Electric: ['wildcharge', 'thunderbolt'],
    Grass: ['seedbomb', 'energyball'],
    Ice: ['iciclecrash', 'icebeam'],
    Fighting: ['brickbreak', 'aurasphere'],
    Poison: ['poisonjab', 'sludgebomb'],
    Ground: ['highhorsepower', 'earthpower'],
    Flying: ['drillpeck', 'airslash'],
    Psychic: ['zenheadbutt', 'psychic'],
    Bug: ['xscissor', 'bugbuzz'],
    Rock: ['rockslide', 'powergem'],
    Ghost: ['shadowbone', 'shadowball'],
    Dragon: ['dragonclaw', 'dragonpulse'],
    Dark: ['crunch', 'darkpulse'],
    Steel: ['ironhead', 'flashcannon'],
    Fairy: ['playrough', 'moonblast'],
};

/** The four moves Cynthia expects a seen Pokémon to have. */
export const believedMoves = (dex, species, revealed) => {
    const moves = [...revealed].slice(0, 4);
    const physical = species.baseStats.atk >= species.baseStats.spa;
    const coveredTypes = new Set(moves
        .map((id) => dex.moves.get(id))
        .filter((move) => move.exists && move.category !== 'Status')
        .map((move) => move.type));
    for (const type of species.types) {
        if (moves.length >= 4) break;
        if (coveredTypes.has(type)) continue;
        const standIn = STAB_STAND_INS[type]?.[physical ? 0 : 1];
        if (standIn && !moves.includes(standIn)) moves.push(standIn);
    }
    return moves;
};

const moveSlot = (dex, id) => {
    const move = dex.moves.get(id);
    const pp = Math.max(1, Math.floor((move.pp || 5) * 1.6));
    return { move: move.name, id: move.id, pp, maxpp: pp, target: move.target, disabled: false, disabledSource: '', used: false };
};

const applyBelief = (battle, mon, info) => {
    const { dex } = battle;
    if (!info.itemKnown) {
        mon.item = '';
        mon.itemState = battle.initEffectState({ id: '', target: mon });
    }
    if (!info.ability) {
        const believed = toID(mon.species.abilities['0'] || '');
        mon.baseAbility = believed;
        mon.ability = believed;
        mon.abilityState = battle.initEffectState({ id: believed, target: mon });
    }

    const stats = battle.spreadModify(mon.species.baseStats, { ...BELIEVED_SPREAD, level: mon.level });
    const ratio = mon.maxhp ? mon.hp / mon.maxhp : 0;
    mon.storedStats = { atk: stats.atk, def: stats.def, spa: stats.spa, spd: stats.spd, spe: stats.spe };
    if (mon.species.maxHP !== 1) {
        mon.baseMaxhp = stats.hp;
        mon.maxhp = stats.hp;
    }
    // She sees the HP bar, which HP Percentage Mod rounds up to a whole percent.
    mon.hp = mon.fainted || mon.hp <= 0 ? 0 : Math.max(1, Math.round((Math.ceil(ratio * 100) / 100) * mon.maxhp));

    const slots = believedMoves(dex, mon.species, info.moves).map((id) => moveSlot(dex, id));
    // Keep real PP/disabled state for moves she has actually seen used.
    for (const slot of slots) {
        const real = mon.moveSlots.find((s) => s.id === slot.id);
        if (real) Object.assign(slot, { pp: real.pp, maxpp: real.maxpp, disabled: real.disabled, used: real.used });
    }
    mon.moveSlots = slots;
    mon.baseMoveSlots = slots.map((slot) => ({ ...slot }));
};

/**
 * @param {object} snapshotJSON `battle.toJSON()` taken before the player's choice
 * @param {import('./knowledge.js').Knowledge} knowledge
 * @returns {Battle} a detached clone; its `send` is a no-op
 */
export const fogClone = (snapshotJSON, knowledge) => {
    const battle = cloneOf(snapshotJSON);
    for (const mon of battle.sides[0].pokemon) {
        const info = knowledge.foe.get(mon.species.name) || knowledge.foe.get(mon.baseSpecies?.name);
        if (info) applyBelief(battle, mon, info);
    }
    return battle;
};

/**
 * A clone for damage estimates only. `getDamage` runs item handlers, and a
 * Yache or Sitrus Berry "eats" itself on the first estimate — which would make
 * every later estimate in the same decision see a Pokémon without its berry.
 * Here eating and using items always succeeds without removing anything.
 */
export const estimationClone = (json) => {
    const battle = cloneOf(json);
    for (const side of battle.sides) {
        for (const mon of side.pokemon) {
            mon.eatItem = () => true;
            mon.useItem = () => true;
        }
    }
    return battle;
};

/** A clone to play a turn on (lookahead): real item consumption, its own PRNG. */
export const simulationClone = (json, prng) => {
    const battle = cloneOf(json);
    battle.prng = prng;
    return battle;
};
