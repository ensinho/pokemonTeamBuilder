/**
 * What Cynthia can bring, by difficulty. Server-only: these sets are the
 * hidden information of the challenge and never reach the browser.
 *
 * One variant per difficulty (`rotation.difficultyFor`), keyed the same way:
 *
 *  - `dp`       Diamond & Pearl — the original game moves, no item.
 *  - `platinum` Platinum moves with a simple item (Sitrus Berry).
 *  - `rematch`  Renegade Platinum's sets (items, abilities, natures).
 *  - `world`    Competitive sets in the spirit of the Pokémon World Tournament.
 *
 * `source` says where each variant comes from. Game movesets were checked on
 * Dittobase (2026-10-14): DP https://www.dittobase.com/diamond-pearl/gym-leaders-elite-four/cynthia,
 * Pt https://www.dittobase.com/platinum/gym-leaders-elite-four/cynthia. Renegade
 * Platinum comes from `public/data/gym-leaders.json`. Togekiss is not on her DP
 * team and Gastrodon not on her Platinum one, so each borrows the other game's
 * set. Glaceon, Eelektross and Braviary are on her teams outside Sinnoh
 * (pokemon.com, "Trainer Spotlight: Champion Cynthia"), but no primary source
 * for their sets could be reached, so every variant of theirs — and every
 * `world` set — is our own design and says so (`source: 'design'`).
 *
 * The text has no `Level:` line: the engine sets every Pokémon to 50.
 */

const block = ({ species, item, ability, nature, evs, moves }) => [
    item ? `${species} @ ${item}` : species,
    `Ability: ${ability}`,
    evs ? `EVs: ${evs}` : null,
    nature ? `${nature} Nature` : null,
    ...moves.map((move) => `- ${move}`),
].filter(Boolean).join('\n');

/**
 * Variants without their own spread (all but Sunday's) carry an even 84 EVs —
 * the Time do dia's spread (Showdown's random battles) — so what separates
 * Monday from Sunday is her sets and her play, not raw stats. Calibrated with
 * `npm run ai:arena` (2026-10-14): with no EVs at all, Monday's Cynthia won
 * 12% against the greedy robot, against a 40–55% target; with Renegade's
 * 252/252 spreads, Friday's won 81% against a 60–75% target.
 */
const EVEN_SPREAD = '84 HP / 84 Atk / 84 Def / 84 SpA / 84 SpD / 84 Spe';

const variant = (source, set) => ({ source, showdownText: block({ evs: EVEN_SPREAD, ...set }) });

const DP = 'dittobase:diamond-pearl';
const PT = 'dittobase:platinum';
const RP = 'gym-leaders.json:renegade-platinum';
const BDSP = 'dittobase:brilliant-diamond-shining-pearl';
const DESIGN = 'design';

export const CYNTHIA_POOL = [
    {
        species: 'Spiritomb',
        dexNum: 442,
        tier: 'frequent',
        leadWeight: 3,
        variants: {
            dp: variant(DP, { species: 'Spiritomb', ability: 'Pressure', moves: ['Dark Pulse', 'Psychic', 'Silver Wind', 'Embargo'] }),
            platinum: variant(PT, { species: 'Spiritomb', item: 'Sitrus Berry', ability: 'Pressure', moves: ['Dark Pulse', 'Psychic', 'Silver Wind', 'Shadow Ball'] }),
            rematch: variant(RP, { species: 'Spiritomb', item: 'Lum Berry', ability: 'Pressure', nature: 'Calm', moves: ['Dark Pulse', 'Will-O-Wisp', 'Confuse Ray', 'Rest'] }),
            world: variant(DESIGN, { species: 'Spiritomb', item: 'Leftovers', ability: 'Pressure', nature: 'Calm', evs: '252 HP / 4 Def / 252 SpD', moves: ['Dark Pulse', 'Shadow Ball', 'Will-O-Wisp', 'Nasty Plot'] }),
        },
    },
    {
        species: 'Roserade',
        dexNum: 407,
        tier: 'frequent',
        leadWeight: 1,
        variants: {
            dp: variant(DP, { species: 'Roserade', ability: 'Natural Cure', moves: ['Energy Ball', 'Sludge Bomb', 'Shadow Ball', 'Extrasensory'] }),
            platinum: variant(PT, { species: 'Roserade', item: 'Sitrus Berry', ability: 'Natural Cure', moves: ['Energy Ball', 'Sludge Bomb', 'Toxic', 'Extrasensory'] }),
            rematch: variant(RP, { species: 'Roserade', item: 'White Herb', ability: 'Technician', nature: 'Timid', moves: ['Leaf Storm', 'Sludge Bomb', 'Dazzling Gleam', 'Sleep Powder'] }),
            world: variant(DESIGN, { species: 'Roserade', item: 'Focus Sash', ability: 'Natural Cure', nature: 'Timid', evs: '4 HP / 252 SpA / 252 Spe', moves: ['Leaf Storm', 'Sludge Bomb', 'Sleep Powder', 'Spikes'] }),
        },
    },
    {
        species: 'Togekiss',
        dexNum: 468,
        tier: 'frequent',
        leadWeight: 1,
        variants: {
            dp: variant(PT, { species: 'Togekiss', ability: 'Serene Grace', moves: ['Air Slash', 'Aura Sphere', 'Water Pulse', 'Shock Wave'] }),
            platinum: variant(PT, { species: 'Togekiss', item: 'Sitrus Berry', ability: 'Serene Grace', moves: ['Air Slash', 'Aura Sphere', 'Water Pulse', 'Shock Wave'] }),
            // Moonblast is a Renegade Platinum addition; official Togekiss can't learn it.
            rematch: variant(RP, { species: 'Togekiss', item: 'Sitrus Berry', ability: 'Serene Grace', nature: 'Timid', moves: ['Air Slash', 'Thunder Wave', 'Roost', 'Moonblast'] }),
            world: variant(DESIGN, { species: 'Togekiss', item: 'Leftovers', ability: 'Serene Grace', nature: 'Timid', evs: '252 HP / 4 SpA / 252 Spe', moves: ['Air Slash', 'Dazzling Gleam', 'Thunder Wave', 'Roost'] }),
        },
    },
    {
        species: 'Lucario',
        dexNum: 448,
        tier: 'frequent',
        leadWeight: 1,
        variants: {
            dp: variant(DP, { species: 'Lucario', ability: 'Inner Focus', moves: ['Aura Sphere', 'Dragon Pulse', 'Psychic', 'Earthquake'] }),
            platinum: variant(PT, { species: 'Lucario', item: 'Sitrus Berry', ability: 'Inner Focus', moves: ['Aura Sphere', 'Extreme Speed', 'Shadow Ball', 'Stone Edge'] }),
            // Adaptability is not a Lucario ability in the official games; it is
            // in Renegade Platinum, and no validator runs in battle.
            rematch: variant(RP, { species: 'Lucario', item: 'Life Orb', ability: 'Adaptability', nature: 'Jolly', moves: ['High Jump Kick', 'Meteor Mash', 'Extreme Speed', 'Ice Punch'] }),
            world: variant(DESIGN, { species: 'Lucario', item: 'Life Orb', ability: 'Inner Focus', nature: 'Timid', evs: '4 HP / 252 SpA / 252 Spe', moves: ['Nasty Plot', 'Aura Sphere', 'Flash Cannon', 'Vacuum Wave'] }),
        },
    },
    {
        species: 'Milotic',
        dexNum: 350,
        tier: 'frequent',
        leadWeight: 1,
        variants: {
            dp: variant(DP, { species: 'Milotic', ability: 'Marvel Scale', moves: ['Surf', 'Ice Beam', 'Mirror Coat', 'Aqua Ring'] }),
            platinum: variant(PT, { species: 'Milotic', item: 'Sitrus Berry', ability: 'Marvel Scale', moves: ['Surf', 'Ice Beam', 'Mirror Coat', 'Dragon Pulse'] }),
            rematch: variant(RP, { species: 'Milotic', item: 'Leftovers', ability: 'Marvel Scale', nature: 'Bold', moves: ['Surf', 'Ice Beam', 'Recover', 'Hypnosis'] }),
            world: variant(DESIGN, { species: 'Milotic', item: 'Leftovers', ability: 'Competitive', nature: 'Bold', evs: '252 HP / 252 Def / 4 SpA', moves: ['Scald', 'Ice Beam', 'Recover', 'Haze'] }),
        },
    },
    {
        species: 'Gastrodon',
        dexNum: 423,
        tier: 'occasional',
        leadWeight: 0,
        variants: {
            dp: variant(DP, { species: 'Gastrodon', ability: 'Sticky Hold', moves: ['Muddy Water', 'Earthquake', 'Stone Edge', 'Sludge Bomb'] }),
            platinum: variant(DP, { species: 'Gastrodon', item: 'Sitrus Berry', ability: 'Sticky Hold', moves: ['Muddy Water', 'Earthquake', 'Stone Edge', 'Sludge Bomb'] }),
            rematch: variant(BDSP, { species: 'Gastrodon', item: 'Leftovers', ability: 'Storm Drain', nature: 'Quiet', moves: ['Scald', 'Earthquake', 'Sludge Bomb', 'Rock Tomb'] }),
            world: variant(DESIGN, { species: 'Gastrodon', item: 'Leftovers', ability: 'Storm Drain', nature: 'Calm', evs: '252 HP / 4 Def / 252 SpD', moves: ['Scald', 'Earth Power', 'Recover', 'Toxic'] }),
        },
    },
    {
        species: 'Glaceon',
        dexNum: 471,
        tier: 'occasional',
        leadWeight: 0,
        variants: {
            dp: variant(DESIGN, { species: 'Glaceon', ability: 'Snow Cloak', moves: ['Ice Beam', 'Shadow Ball', 'Quick Attack', 'Bite'] }),
            platinum: variant(DESIGN, { species: 'Glaceon', item: 'Sitrus Berry', ability: 'Snow Cloak', moves: ['Ice Beam', 'Shadow Ball', 'Water Pulse', 'Mirror Coat'] }),
            rematch: variant(DESIGN, { species: 'Glaceon', item: 'Leftovers', ability: 'Ice Body', nature: 'Calm', moves: ['Ice Beam', 'Shadow Ball', 'Calm Mind', 'Wish'] }),
            world: variant(DESIGN, { species: 'Glaceon', item: 'Life Orb', ability: 'Ice Body', nature: 'Modest', evs: '4 HP / 252 SpA / 252 Spe', moves: ['Freeze-Dry', 'Shadow Ball', 'Calm Mind', 'Protect'] }),
        },
    },
    {
        species: 'Eelektross',
        dexNum: 604,
        tier: 'occasional',
        leadWeight: 0,
        variants: {
            dp: variant(DESIGN, { species: 'Eelektross', ability: 'Levitate', moves: ['Thunderbolt', 'Crunch', 'Dragon Claw', 'Acid Spray'] }),
            platinum: variant(DESIGN, { species: 'Eelektross', item: 'Sitrus Berry', ability: 'Levitate', moves: ['Thunderbolt', 'Crunch', 'Dragon Claw', 'Flamethrower'] }),
            rematch: variant(DESIGN, { species: 'Eelektross', item: 'Leftovers', ability: 'Levitate', nature: 'Adamant', moves: ['Coil', 'Wild Charge', 'Drain Punch', 'Crunch'] }),
            world: variant(DESIGN, { species: 'Eelektross', item: 'Assault Vest', ability: 'Levitate', nature: 'Quiet', evs: '252 HP / 4 Atk / 252 SpA', moves: ['Thunderbolt', 'Flamethrower', 'Giga Drain', 'Knock Off'] }),
        },
    },
    {
        species: 'Braviary',
        dexNum: 628,
        tier: 'occasional',
        leadWeight: 0,
        variants: {
            dp: variant(DESIGN, { species: 'Braviary', ability: 'Keen Eye', moves: ['Aerial Ace', 'Crush Claw', 'Rock Slide', 'Slash'] }),
            platinum: variant(DESIGN, { species: 'Braviary', item: 'Sitrus Berry', ability: 'Keen Eye', moves: ['Aerial Ace', 'Crush Claw', 'Rock Slide', 'Superpower'] }),
            rematch: variant(DESIGN, { species: 'Braviary', item: 'Sitrus Berry', ability: 'Defiant', nature: 'Adamant', moves: ['Brave Bird', 'Superpower', 'Rock Slide', 'Bulk Up'] }),
            world: variant(DESIGN, { species: 'Braviary', item: 'Life Orb', ability: 'Sheer Force', nature: 'Adamant', evs: '4 HP / 252 Atk / 252 Spe', moves: ['Brave Bird', 'Close Combat', 'Rock Slide', 'Bulk Up'] }),
        },
    },
    {
        species: 'Garchomp',
        dexNum: 445,
        tier: 'core',
        leadWeight: 0,
        variants: {
            // Sand Veil, as on the DS — Rough Skin only arrived in Gen 5.
            dp: variant(DP, { species: 'Garchomp', ability: 'Sand Veil', moves: ['Dragon Rush', 'Earthquake', 'Brick Break', 'Giga Impact'] }),
            platinum: variant(PT, { species: 'Garchomp', item: 'Sitrus Berry', ability: 'Sand Veil', moves: ['Dragon Rush', 'Earthquake', 'Flamethrower', 'Giga Impact'] }),
            rematch: variant(RP, { species: 'Garchomp', item: 'Yache Berry', ability: 'Rough Skin', nature: 'Jolly', moves: ['Earthquake', 'Outrage', 'Stone Edge', 'Swords Dance'] }),
            world: variant(DESIGN, { species: 'Garchomp', item: 'Yache Berry', ability: 'Rough Skin', nature: 'Jolly', evs: '4 HP / 252 Atk / 252 Spe', moves: ['Swords Dance', 'Earthquake', 'Dragon Claw', 'Stone Edge'] }),
        },
    },
];

export const POOLS = { cynthia: CYNTHIA_POOL };

export const poolFor = (championId) => {
    const pool = POOLS[championId];
    if (!pool) throw new Error(`Unknown champion "${championId}".`);
    return pool;
};
