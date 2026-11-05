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

/**
 * What Blue can bring — the same shape as Cynthia's pool, read from his teams
 * across the games (Wikidex, "Blue", checked 2026-11-04: https://www.wikidex.net/wiki/Blue):
 *
 *  - **Aces (`core`)**: the starter he took — Charizard, Blastoise or Venusaur,
 *    always last and highest-levelled in Red/Blue and FireRed/LeafGreen. One a
 *    day (`rotation.aceFor`). `excludes` is the member that ace's team never
 *    has, as in FRLG: no Arcanine beside Charizard, no Gyarados beside
 *    Blastoise, no Exeggutor beside Venusaur.
 *  - **Frequent**: Pidgeot, Alakazam and Rhydon are on every Champion team of
 *    his; Exeggutor, Gyarados and Arcanine fill the rest of each one (RB,
 *    FRLG, GSC, HGSS). Pidgeot leads most often, as in RB and FRLG.
 *  - **Occasional**: Tyranitar and Heracross (FRLG rematch), Machamp (HGSS,
 *    Black 2/White 2 PWT, Sun/Moon) and Aerodactyl (PWT, Sun/Moon).
 *
 * The difficulty keys keep Cynthia's names, so the week's schedule and the AI
 * profiles are shared: `dp` his Red & Blue moves, no item (from
 * `public/data/gym-leaders.json` where it lists them, `design` otherwise);
 * `platinum` the same a step up with a Sitrus Berry; `rematch` items,
 * abilities and natures; `world` competitive sets. Everything but the
 * gym-leaders.json members is our design and says so. The `dp` sets start from
 * his Red & Blue moves (`gym-leaders.json`) with each member's 60–65-power
 * filler (Leer, Rage, Whirlwind, Barrage) traded for one strong move of its
 * type, still with no item: with the game's own sets he won 21% against the
 * greedy robot where Monday's target is 40–55 (`npm run ai:arena -- --champion
 * blue`, 2026-11-05). Horn Drill is an OHKO move, banned by the challenge's
 * clauses (`BANNED_MOVES`).
 */
const RB = 'gym-leaders.json:red-blue';

export const BLUE_POOL = [
    {
        species: 'Pidgeot',
        dexNum: 18,
        tier: 'frequent',
        leadWeight: 3,
        variants: {
            dp: variant(RB, { species: 'Pidgeot', ability: 'Keen Eye', moves: ['Aerial Ace', 'Double-Edge', 'Quick Attack', 'Steel Wing'] }),
            platinum: variant(DESIGN, { species: 'Pidgeot', item: 'Sitrus Berry', ability: 'Keen Eye', moves: ['Air Slash', 'Heat Wave', 'Quick Attack', 'Roost'] }),
            rematch: variant(DESIGN, { species: 'Pidgeot', item: 'Sitrus Berry', ability: 'Big Pecks', nature: 'Jolly', moves: ['Brave Bird', 'Quick Attack', 'U-turn', 'Roost'] }),
            world: variant(DESIGN, { species: 'Pidgeot', item: 'Life Orb', ability: 'Keen Eye', nature: 'Timid', evs: '4 HP / 252 SpA / 252 Spe', moves: ['Hurricane', 'Heat Wave', 'U-turn', 'Roost'] }),
        },
    },
    {
        species: 'Alakazam',
        dexNum: 65,
        tier: 'frequent',
        leadWeight: 1,
        variants: {
            dp: variant(RB, { species: 'Alakazam', ability: 'Synchronize', moves: ['Psychic', 'Shadow Ball', 'Recover', 'Reflect'] }),
            platinum: variant(DESIGN, { species: 'Alakazam', item: 'Sitrus Berry', ability: 'Synchronize', moves: ['Psychic', 'Shadow Ball', 'Focus Blast', 'Recover'] }),
            rematch: variant(DESIGN, { species: 'Alakazam', item: 'Focus Sash', ability: 'Magic Guard', nature: 'Timid', moves: ['Psychic', 'Shadow Ball', 'Focus Blast', 'Recover'] }),
            world: variant(DESIGN, { species: 'Alakazam', item: 'Life Orb', ability: 'Magic Guard', nature: 'Timid', evs: '4 HP / 252 SpA / 252 Spe', moves: ['Nasty Plot', 'Psychic', 'Focus Blast', 'Shadow Ball'] }),
        },
    },
    {
        species: 'Rhydon',
        dexNum: 112,
        tier: 'frequent',
        leadWeight: 1,
        variants: {
            dp: variant(RB, { species: 'Rhydon', ability: 'Rock Head', moves: ['Earthquake', 'Rock Slide', 'Megahorn', 'Take Down'] }),
            platinum: variant(DESIGN, { species: 'Rhydon', item: 'Sitrus Berry', ability: 'Rock Head', moves: ['Earthquake', 'Rock Slide', 'Megahorn', 'Hammer Arm'] }),
            rematch: variant(DESIGN, { species: 'Rhydon', item: 'Eviolite', ability: 'Lightning Rod', nature: 'Adamant', moves: ['Earthquake', 'Stone Edge', 'Megahorn', 'Swords Dance'] }),
            world: variant(DESIGN, { species: 'Rhydon', item: 'Eviolite', ability: 'Lightning Rod', nature: 'Adamant', evs: '252 HP / 252 Atk / 4 SpD', moves: ['Earthquake', 'Stone Edge', 'Megahorn', 'Stealth Rock'] }),
        },
    },
    {
        species: 'Exeggutor',
        dexNum: 103,
        tier: 'frequent',
        // He leads with it in HeartGold & SoulSilver.
        leadWeight: 2,
        variants: {
            dp: variant(RB, { species: 'Exeggutor', ability: 'Chlorophyll', moves: ['Psychic', 'Giga Drain', 'Egg Bomb', 'Hypnosis'] }),
            platinum: variant(DESIGN, { species: 'Exeggutor', item: 'Sitrus Berry', ability: 'Chlorophyll', moves: ['Psychic', 'Giga Drain', 'Egg Bomb', 'Hypnosis'] }),
            rematch: variant(DESIGN, { species: 'Exeggutor', item: 'Sitrus Berry', ability: 'Harvest', nature: 'Modest', moves: ['Leaf Storm', 'Psychic', 'Sleep Powder', 'Leech Seed'] }),
            world: variant(DESIGN, { species: 'Exeggutor', item: 'Sitrus Berry', ability: 'Harvest', nature: 'Modest', evs: '252 HP / 252 SpA / 4 SpD', moves: ['Giga Drain', 'Psychic', 'Sleep Powder', 'Synthesis'] }),
        },
    },
    {
        species: 'Gyarados',
        dexNum: 130,
        tier: 'frequent',
        leadWeight: 1,
        variants: {
            dp: variant(DESIGN, { species: 'Gyarados', ability: 'Intimidate', moves: ['Hydro Pump', 'Bite', 'Thrash', 'Ice Fang'] }),
            platinum: variant(DESIGN, { species: 'Gyarados', item: 'Sitrus Berry', ability: 'Intimidate', moves: ['Waterfall', 'Crunch', 'Ice Fang', 'Dragon Dance'] }),
            rematch: variant(DESIGN, { species: 'Gyarados', item: 'Sitrus Berry', ability: 'Intimidate', nature: 'Adamant', moves: ['Waterfall', 'Earthquake', 'Ice Fang', 'Dragon Dance'] }),
            world: variant(DESIGN, { species: 'Gyarados', item: 'Leftovers', ability: 'Intimidate', nature: 'Jolly', evs: '4 HP / 252 Atk / 252 Spe', moves: ['Dragon Dance', 'Waterfall', 'Earthquake', 'Taunt'] }),
        },
    },
    {
        species: 'Arcanine',
        dexNum: 59,
        tier: 'frequent',
        leadWeight: 1,
        variants: {
            dp: variant(RB, { species: 'Arcanine', ability: 'Intimidate', moves: ['Flamethrower', 'Extreme Speed', 'Bite', 'Take Down'] }),
            platinum: variant(DESIGN, { species: 'Arcanine', item: 'Sitrus Berry', ability: 'Intimidate', moves: ['Flamethrower', 'Extreme Speed', 'Crunch', 'Thunder Fang'] }),
            rematch: variant(DESIGN, { species: 'Arcanine', item: 'Sitrus Berry', ability: 'Intimidate', nature: 'Adamant', moves: ['Flare Blitz', 'Extreme Speed', 'Wild Charge', 'Morning Sun'] }),
            world: variant(DESIGN, { species: 'Arcanine', item: 'Leftovers', ability: 'Intimidate', nature: 'Impish', evs: '252 HP / 4 Atk / 252 Def', moves: ['Flare Blitz', 'Extreme Speed', 'Will-O-Wisp', 'Morning Sun'] }),
        },
    },
    {
        species: 'Tyranitar',
        dexNum: 248,
        tier: 'occasional',
        leadWeight: 0,
        variants: {
            dp: variant(DESIGN, { species: 'Tyranitar', ability: 'Sand Stream', moves: ['Crunch', 'Rock Slide', 'Earthquake', 'Scary Face'] }),
            platinum: variant(DESIGN, { species: 'Tyranitar', item: 'Sitrus Berry', ability: 'Sand Stream', moves: ['Crunch', 'Stone Edge', 'Earthquake', 'Dragon Dance'] }),
            rematch: variant(DESIGN, { species: 'Tyranitar', item: 'Chople Berry', ability: 'Sand Stream', nature: 'Adamant', moves: ['Stone Edge', 'Crunch', 'Earthquake', 'Dragon Dance'] }),
            world: variant(DESIGN, { species: 'Tyranitar', item: 'Leftovers', ability: 'Sand Stream', nature: 'Careful', evs: '252 HP / 4 Atk / 252 SpD', moves: ['Stealth Rock', 'Stone Edge', 'Crunch', 'Earthquake'] }),
        },
    },
    {
        species: 'Heracross',
        dexNum: 214,
        tier: 'occasional',
        leadWeight: 0,
        variants: {
            dp: variant(DESIGN, { species: 'Heracross', ability: 'Guts', moves: ['Megahorn', 'Brick Break', 'Rock Slide', 'Horn Attack'] }),
            platinum: variant(DESIGN, { species: 'Heracross', item: 'Sitrus Berry', ability: 'Guts', moves: ['Megahorn', 'Close Combat', 'Stone Edge', 'Night Slash'] }),
            rematch: variant(DESIGN, { species: 'Heracross', item: 'Flame Orb', ability: 'Guts', nature: 'Jolly', moves: ['Close Combat', 'Megahorn', 'Facade', 'Knock Off'] }),
            world: variant(DESIGN, { species: 'Heracross', item: 'Choice Scarf', ability: 'Moxie', nature: 'Jolly', evs: '4 HP / 252 Atk / 252 Spe', moves: ['Close Combat', 'Megahorn', 'Stone Edge', 'Knock Off'] }),
        },
    },
    {
        species: 'Machamp',
        dexNum: 68,
        tier: 'occasional',
        leadWeight: 0,
        variants: {
            dp: variant(DESIGN, { species: 'Machamp', ability: 'Guts', moves: ['Cross Chop', 'Rock Slide', 'Seismic Toss', 'Karate Chop'] }),
            platinum: variant(DESIGN, { species: 'Machamp', item: 'Sitrus Berry', ability: 'No Guard', moves: ['Dynamic Punch', 'Stone Edge', 'Bullet Punch', 'Payback'] }),
            rematch: variant(DESIGN, { species: 'Machamp', item: 'Sitrus Berry', ability: 'No Guard', nature: 'Adamant', moves: ['Dynamic Punch', 'Stone Edge', 'Bullet Punch', 'Knock Off'] }),
            world: variant(DESIGN, { species: 'Machamp', item: 'Assault Vest', ability: 'No Guard', nature: 'Adamant', evs: '252 HP / 252 Atk / 4 SpD', moves: ['Dynamic Punch', 'Stone Edge', 'Bullet Punch', 'Knock Off'] }),
        },
    },
    {
        species: 'Aerodactyl',
        dexNum: 142,
        tier: 'occasional',
        leadWeight: 0,
        variants: {
            dp: variant(DESIGN, { species: 'Aerodactyl', ability: 'Rock Head', moves: ['Rock Slide', 'Wing Attack', 'Bite', 'Earthquake'] }),
            platinum: variant(DESIGN, { species: 'Aerodactyl', item: 'Sitrus Berry', ability: 'Rock Head', moves: ['Rock Slide', 'Aerial Ace', 'Crunch', 'Ice Fang'] }),
            rematch: variant(DESIGN, { species: 'Aerodactyl', item: 'Life Orb', ability: 'Rock Head', nature: 'Jolly', moves: ['Stone Edge', 'Double-Edge', 'Earthquake', 'Ice Fang'] }),
            world: variant(DESIGN, { species: 'Aerodactyl', item: 'Focus Sash', ability: 'Unnerve', nature: 'Jolly', evs: '4 HP / 252 Atk / 252 Spe', moves: ['Stealth Rock', 'Stone Edge', 'Earthquake', 'Taunt'] }),
        },
    },
    {
        species: 'Charizard',
        dexNum: 6,
        tier: 'core',
        leadWeight: 0,
        excludes: 'Arcanine',
        variants: {
            dp: variant(RB, { species: 'Charizard', ability: 'Blaze', moves: ['Flamethrower', 'Slash', 'Air Slash', 'Dragon Claw'] }),
            platinum: variant(DESIGN, { species: 'Charizard', item: 'Sitrus Berry', ability: 'Blaze', moves: ['Flamethrower', 'Air Slash', 'Dragon Pulse', 'Focus Blast'] }),
            rematch: variant(DESIGN, { species: 'Charizard', item: 'Charcoal', ability: 'Blaze', nature: 'Timid', moves: ['Flamethrower', 'Air Slash', 'Dragon Pulse', 'Focus Blast'] }),
            // No Mega Stone: the AI keeps its ace by species name, and a Mega renames it.
            world: variant(DESIGN, { species: 'Charizard', item: 'Life Orb', ability: 'Solar Power', nature: 'Timid', evs: '4 HP / 252 SpA / 252 Spe', moves: ['Fire Blast', 'Air Slash', 'Focus Blast', 'Roost'] }),
        },
    },
    {
        species: 'Blastoise',
        dexNum: 9,
        tier: 'core',
        leadWeight: 0,
        excludes: 'Gyarados',
        variants: {
            dp: variant(DESIGN, { species: 'Blastoise', ability: 'Torrent', moves: ['Hydro Pump', 'Blizzard', 'Bite', 'Skull Bash'] }),
            platinum: variant(DESIGN, { species: 'Blastoise', item: 'Sitrus Berry', ability: 'Torrent', moves: ['Surf', 'Ice Beam', 'Dark Pulse', 'Aura Sphere'] }),
            rematch: variant(DESIGN, { species: 'Blastoise', item: 'Leftovers', ability: 'Torrent', nature: 'Modest', moves: ['Hydro Pump', 'Ice Beam', 'Aura Sphere', 'Dark Pulse'] }),
            world: variant(DESIGN, { species: 'Blastoise', item: 'White Herb', ability: 'Torrent', nature: 'Modest', evs: '4 HP / 252 SpA / 252 Spe', moves: ['Shell Smash', 'Hydro Pump', 'Ice Beam', 'Aura Sphere'] }),
        },
    },
    {
        species: 'Venusaur',
        dexNum: 3,
        tier: 'core',
        leadWeight: 0,
        excludes: 'Exeggutor',
        variants: {
            dp: variant(DESIGN, { species: 'Venusaur', ability: 'Overgrow', moves: ['Razor Leaf', 'Sludge Bomb', 'Sleep Powder', 'Body Slam'] }),
            platinum: variant(DESIGN, { species: 'Venusaur', item: 'Sitrus Berry', ability: 'Overgrow', moves: ['Energy Ball', 'Sludge Bomb', 'Sleep Powder', 'Earthquake'] }),
            rematch: variant(DESIGN, { species: 'Venusaur', item: 'Black Sludge', ability: 'Chlorophyll', nature: 'Modest', moves: ['Giga Drain', 'Sludge Bomb', 'Sleep Powder', 'Synthesis'] }),
            world: variant(DESIGN, { species: 'Venusaur', item: 'Black Sludge', ability: 'Overgrow', nature: 'Bold', evs: '252 HP / 252 Def / 4 SpA', moves: ['Giga Drain', 'Sludge Bomb', 'Leech Seed', 'Synthesis'] }),
        },
    },
];

export const POOLS = { cynthia: CYNTHIA_POOL, blue: BLUE_POOL };

export const poolFor = (championId) => {
    const pool = POOLS[championId];
    if (!pool) throw new Error(`Unknown champion "${championId}".`);
    return pool;
};
