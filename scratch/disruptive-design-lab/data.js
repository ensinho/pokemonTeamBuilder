/**
 * Authentic PokemonBuilder dataset for Disruptive Design Lab v4.
 * Sourced from src/constants/typeChart.js, public/data/pokemon-index.json,
 * public/data/tournaments.json, public/data/competitive-usage.json,
 * public/data/usage/gen9vgc2026regi.json, and src/utils/trainerCardPattern.js.
 */

export const TYPE_COLORS = {
    normal: '#A8A77A',
    fire: '#EE8130',
    water: '#6390F0',
    electric: '#F7D02C',
    grass: '#7AC74C',
    ice: '#96D9D6',
    fighting: '#C22E28',
    poison: '#A33EA1',
    ground: '#E2BF65',
    flying: '#A98FF3',
    psychic: '#F95587',
    bug: '#A6B91A',
    rock: '#B6A136',
    ghost: '#735797',
    dragon: '#6F35FC',
    dark: '#705746',
    steel: '#B7B7CE',
    fairy: '#D685AD',
};

export const TYPE_LABELS_PT = {
    normal: 'Normal',
    fire: 'Fogo',
    water: 'Água',
    electric: 'Elétrico',
    grass: 'Grama',
    ice: 'Gelo',
    fighting: 'Lutador',
    poison: 'Veneno',
    ground: 'Terra',
    flying: 'Voador',
    psychic: 'Psíquico',
    bug: 'Inseto',
    rock: 'Pedra',
    ghost: 'Fantasma',
    dragon: 'Dragão',
    dark: 'Sombrio',
    steel: 'Aço',
    fairy: 'Fada',
};

export const TYPE_ICON_FILES = {
    normal: 'Normal_icon_LA.png',
    fire: 'Fire_icon_LA.png',
    water: 'Water_icon_LA.png',
    electric: 'Electric_icon_LA.png',
    grass: 'Grass_icon_LA.png',
    ice: 'Ice_icon_LA.png',
    fighting: 'Fighting_icon_LA.png',
    poison: 'Poison_icon_LA.png',
    ground: 'Ground_icon_LA.png',
    flying: 'Flying_icon_LA.png',
    psychic: 'Psychic_icon_LA.png',
    bug: 'Bug_icon_LA.png',
    rock: 'Rock_icon_LA.png',
    ghost: 'Ghost_icon_LA.png',
    dragon: 'Dragon_icon_LA.png',
    dark: 'Dark_icon_LA.png',
    steel: 'Steel_icon_LA.png',
    fairy: 'Fairy_icon_LA.png',
};

export const TYPE_CHART = {
    normal: { damageTaken: { Fighting: 2, Ghost: 0 }, damageDealt: { Rock: 0.5, Steel: 0.5 } },
    fire: { damageTaken: { Water: 2, Ground: 2, Rock: 2, Fire: 0.5, Grass: 0.5, Ice: 0.5, Bug: 0.5, Steel: 0.5, Fairy: 0.5 }, damageDealt: { Fire: 0.5, Water: 0.5, Rock: 0.5, Dragon: 0.5, Grass: 2, Ice: 2, Bug: 2, Steel: 2 } },
    water: { damageTaken: { Grass: 2, Electric: 2, Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5 }, damageDealt: { Water: 0.5, Grass: 0.5, Dragon: 0.5, Fire: 2, Ground: 2, Rock: 2 } },
    grass: { damageTaken: { Fire: 2, Ice: 2, Poison: 2, Flying: 2, Bug: 2, Water: 0.5, Grass: 0.5, Electric: 0.5, Ground: 0.5 }, damageDealt: { Fire: 0.5, Grass: 0.5, Poison: 0.5, Flying: 0.5, Bug: 0.5, Steel: 0.5, Dragon: 0.5, Water: 2, Ground: 2, Rock: 2 } },
    electric: { damageTaken: { Ground: 2, Electric: 0.5, Flying: 0.5, Steel: 0.5 }, damageDealt: { Grass: 0.5, Electric: 0.5, Dragon: 0.5, Ground: 0, Water: 2, Flying: 2 } },
    ice: { damageTaken: { Fire: 2, Fighting: 2, Rock: 2, Steel: 2, Ice: 0.5 }, damageDealt: { Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5, Grass: 2, Ground: 2, Flying: 2, Dragon: 2 } },
    fighting: { damageTaken: { Flying: 2, Psychic: 2, Fairy: 2, Bug: 0.5, Rock: 0.5, Dark: 0.5 }, damageDealt: { Flying: 0.5, Psychic: 0.5, Bug: 0.5, Fairy: 0.5, Poison: 0.5, Ghost: 0, Normal: 2, Ice: 2, Rock: 2, Dark: 2, Steel: 2 } },
    poison: { damageTaken: { Ground: 2, Psychic: 2, Grass: 0.5, Fighting: 0.5, Poison: 0.5, Bug: 0.5, Fairy: 0.5 }, damageDealt: { Ground: 0.5, Rock: 0.5, Poison: 0.5, Ghost: 0.5, Steel: 0, Grass: 2, Fairy: 2 } },
    ground: { damageTaken: { Water: 2, Grass: 2, Ice: 2, Poison: 0.5, Rock: 0.5, Electric: 0 }, damageDealt: { Grass: 0.5, Bug: 0.5, Flying: 0, Fire: 2, Electric: 2, Poison: 2, Rock: 2, Steel: 2 } },
    flying: { damageTaken: { Electric: 2, Ice: 2, Rock: 2, Grass: 0.5, Fighting: 0.5, Bug: 0.5, Ground: 0 }, damageDealt: { Electric: 0.5, Rock: 0.5, Steel: 0.5, Grass: 2, Fighting: 2, Bug: 2 } },
    psychic: { damageTaken: { Bug: 2, Ghost: 2, Dark: 2, Fighting: 0.5, Psychic: 0.5 }, damageDealt: { Steel: 0.5, Psychic: 0.5, Dark: 0, Fighting: 2, Poison: 2 } },
    bug: { damageTaken: { Fire: 2, Flying: 2, Rock: 2, Grass: 0.5, Fighting: 0.5, Ground: 0.5 }, damageDealt: { Fire: 0.5, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Ghost: 0.5, Steel: 0.5, Fairy: 0.5, Grass: 2, Psychic: 2, Dark: 2 } },
    rock: { damageTaken: { Water: 2, Grass: 2, Fighting: 2, Ground: 2, Steel: 2, Normal: 0.5, Fire: 0.5, Poison: 0.5, Flying: 0.5 }, damageDealt: { Fighting: 0.5, Ground: 0.5, Steel: 0.5, Fire: 2, Ice: 2, Flying: 2, Bug: 2 } },
    ghost: { damageTaken: { Ghost: 2, Dark: 2, Poison: 0.5, Bug: 0.5, Normal: 0, Fighting: 0 }, damageDealt: { Steel: 0.5, Dark: 0.5, Normal: 0, Ghost: 2, Psychic: 2 } },
    dragon: { damageTaken: { Ice: 2, Dragon: 2, Fairy: 2, Fire: 0.5, Water: 0.5, Grass: 0.5, Electric: 0.5 }, damageDealt: { Steel: 0.5, Fairy: 0, Dragon: 2 } },
    dark: { damageTaken: { Fighting: 2, Bug: 2, Fairy: 2, Ghost: 0.5, Dark: 0.5, Psychic: 0 }, damageDealt: { Fighting: 0.5, Dark: 0.5, Fairy: 0.5, Ghost: 2, Psychic: 2 } },
    steel: { damageTaken: { Fire: 2, Fighting: 2, Ground: 2, Normal: 0.5, Grass: 0.5, Ice: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 0.5, Dragon: 0.5, Steel: 0.5, Fairy: 0.5, Poison: 0 }, damageDealt: { Fire: 0.5, Water: 0.5, Electric: 0.5, Steel: 0.5, Ice: 2, Rock: 2, Fairy: 2 } },
    fairy: { damageTaken: { Poison: 2, Steel: 2, Fighting: 0.5, Bug: 0.5, Dark: 0.5, Dragon: 0 }, damageDealt: { Fire: 0.5, Poison: 0.5, Steel: 0.5, Fighting: 2, Dragon: 2, Dark: 2 } },
};

export const ALL_TYPES = Object.keys(TYPE_CHART);

export function defMultiplier(attackingType, defTypes = [], ability = '') {
    const atkCap = attackingType.charAt(0).toUpperCase() + attackingType.slice(1);
    const normAb = ability.toLowerCase();
    if (attackingType === 'ground' && normAb === 'levitate') return 0;
    if (attackingType === 'fire' && normAb === 'flash fire') return 0;
    if (attackingType === 'electric' && normAb === 'lightning rod') return 0;
    if (attackingType === 'water' && (normAb === 'water absorb' || normAb === 'storm drain')) return 0;
    return defTypes.reduce((mult, defType) => {
        const table = TYPE_CHART[defType]?.damageTaken || {};
        return mult * (table[atkCap] ?? 1);
    }, 1);
}

export const BUILDER_SLOTS_BASE = [
    {
        slot: 1,
        id: 445,
        spriteKey: 'garchomp',
        name: 'Garchomp',
        role: 'Sweeper Físico',
        types: ['dragon', 'ground'],
        item: 'Life Orb',
        ability: 'Rough Skin',
        nature: 'Jolly',
        moves: [
            { name: 'Earthquake', type: 'ground' },
            { name: 'Dragon Claw', type: 'dragon' },
            { name: 'Rock Slide', type: 'rock' },
            { name: 'Protect', type: 'normal' },
        ],
    },
    {
        slot: 2,
        id: 485,
        spriteKey: 'heatran',
        name: 'Heatran',
        role: 'Âncora Especial',
        types: ['fire', 'steel'],
        item: 'Leftovers',
        ability: 'Flash Fire',
        nature: 'Modest',
        moves: [
            { name: 'Heat Wave', type: 'fire' },
            { name: 'Earth Power', type: 'ground' },
            { name: 'Flash Cannon', type: 'steel' },
            { name: 'Protect', type: 'normal' },
        ],
    },
    {
        slot: 3,
        id: 727,
        spriteKey: 'incineroar',
        name: 'Incineroar',
        role: 'Pivot Intimidate',
        types: ['fire', 'dark'],
        item: 'Sitrus Berry',
        ability: 'Intimidate',
        nature: 'Careful',
        moves: [
            { name: 'Flare Blitz', type: 'fire' },
            { name: 'Knock Off', type: 'dark' },
            { name: 'Fake Out', type: 'normal' },
            { name: 'Parting Shot', type: 'dark' },
        ],
    },
    {
        slot: 4,
        id: 812,
        spriteKey: 'rillaboom',
        name: 'Rillaboom',
        role: 'Controle de Terreno',
        types: ['grass'],
        item: 'Assault Vest',
        ability: 'Grassy Surge',
        nature: 'Adamant',
        moves: [
            { name: 'Wood Hammer', type: 'grass' },
            { name: 'Grassy Glide', type: 'grass' },
            { name: 'High Horsepower', type: 'ground' },
            { name: 'U-turn', type: 'bug' },
        ],
    },
    null, // Slot 5 open initially for the AffectUI decision intervention
    {
        slot: 6,
        id: 987,
        spriteKey: 'flutter-mane',
        name: 'Flutter Mane',
        role: 'Atacante Rápido',
        types: ['ghost', 'fairy'],
        item: 'Booster Energy',
        ability: 'Protosynthesis',
        nature: 'Timid',
        moves: [
            { name: 'Moonblast', type: 'fairy' },
            { name: 'Shadow Ball', type: 'ghost' },
            { name: 'Dazzling Gleam', type: 'fairy' },
            { name: 'Protect', type: 'normal' },
        ],
    },
];

export const SUGGESTION_OPTIONS = [
    {
        id: 10009,
        spriteKey: 'rotom-wash',
        name: 'Rotom-Wash',
        role: 'Imune Ground · Pivot',
        types: ['electric', 'water'],
        item: 'Sitrus Berry',
        ability: 'Levitate',
        nature: 'Calm',
        moves: [
            { name: 'Hydro Pump', type: 'water' },
            { name: 'Thunderbolt', type: 'electric' },
            { name: 'Will-O-Wisp', type: 'fire' },
            { name: 'Protect', type: 'normal' },
        ],
        scoreAfter: 92,
        headline: 'Vulnerabilidade 4× a Ground detectada · Sugestão: Rotom-Wash no slot 5',
        rationale: 'Levitate anula Earthquake (0×), protege Heatran (4×) e Incineroar (2×) e fecha o core Fogo-Água-Grama com controle de burn.',
        deltas: ['+1 Imunidade Ground', 'Fogo · Água · Grama', 'Score 74 → 92'],
    },
    {
        id: 279,
        spriteKey: 'pelipper',
        name: 'Pelipper',
        role: 'Wide Guard · Tailwind',
        types: ['water', 'flying'],
        item: 'Focus Sash',
        ability: 'Drizzle',
        nature: 'Modest',
        moves: [
            { name: 'Weather Ball', type: 'water' },
            { name: 'Hurricane', type: 'flying' },
            { name: 'Wide Guard', type: 'rock' },
            { name: 'Tailwind', type: 'flying' },
        ],
        scoreAfter: 86,
        headline: 'Vulnerabilidade 4× a Ground detectada · Alternativa: Pelipper no slot 5',
        rationale: 'Tipo Voador garante imunidade a Ground e Wide Guard bloqueia Earthquake em dupla, porém Drizzle enfraquece STAB de Heatran e Incineroar.',
        deltas: ['+1 Imunidade Ground', '+Wide Guard', 'Score 74 → 86'],
    },
];

export const POKEDEX_SPECIES = {
    gengar: {
        id: 94,
        dex: '#0094',
        spriteKey: 'gengar',
        name: 'Gengar',
        genus: 'Shadow Pokémon',
        types: ['ghost', 'poison'],
        height: '1.5 m',
        weight: '40.5 kg',
        generation: 'Gen I · Kanto',
        professorNote: 'Sombra e velocidade letal: 130 Sp. Atk e 110 Speed colocam pressão imediata sem Choice Scarf, enquanto Poison/Ghost pune fadas dominantes.',
        baseStats: { hp: 60, atk: 65, def: 60, spa: 130, spd: 75, spe: 110 },
        defaultNature: 'Timid',
        defaultEvs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
        abilities: [
            { name: 'Cursed Body', usage: 94.2, desc: '30% de chance de desabilitar o golpe que o atingiu por 4 turnos.' },
            { name: 'Levitate (Histórico)', usage: 5.8, desc: 'Imunidade clássica a golpes Ground em formatos legados (Gen III–VI).' },
        ],
        items: [
            { name: 'Focus Sash', usage: 58.4 },
            { name: 'Gengarite', usage: 24.1 },
            { name: 'Life Orb', usage: 11.2 },
            { name: 'Choice Scarf', usage: 6.3 },
        ],
        moves: [
            { name: 'Shadow Ball', type: 'ghost', usage: 91.6 },
            { name: 'Sludge Bomb', type: 'poison', usage: 84.3 },
            { name: 'Protect', type: 'normal', usage: 76.8 },
            { name: 'Icy Wind', type: 'ice', usage: 42.5 },
            { name: 'Taunt', type: 'dark', usage: 28.9 },
        ],
    },
    garchomp: {
        id: 445,
        dex: '#0445',
        spriteKey: 'garchomp',
        name: 'Garchomp',
        genus: 'Mach Pokémon',
        types: ['dragon', 'ground'],
        height: '1.9 m',
        weight: '95.0 kg',
        generation: 'Gen IV · Sinnoh',
        professorNote: '102 de Speed base rompe a faixa saturada dos base 100 em Reg M-C. Rough Skin pune Fake Out e ataques físicos de contato.',
        baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
        defaultNature: 'Jolly',
        defaultEvs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        abilities: [
            { name: 'Rough Skin', usage: 96.4, desc: 'Causa 1/8 do HP máximo de dano ao atacante em golpes de contato.' },
            { name: 'Sand Veil', usage: 3.6, desc: 'Eleva evasão em 1.25× durante Tempestade de Areia.' },
        ],
        items: [
            { name: 'Life Orb', usage: 46.8 },
            { name: 'Clear Amulet', usage: 31.5 },
            { name: 'Choice Scarf', usage: 14.2 },
            { name: 'Focus Sash', usage: 7.5 },
        ],
        moves: [
            { name: 'Earthquake', type: 'ground', usage: 88.4 },
            { name: 'Dragon Claw', type: 'dragon', usage: 82.1 },
            { name: 'Protect', type: 'normal', usage: 79.5 },
            { name: 'Stomping Tantrum', type: 'ground', usage: 54.0 },
            { name: 'Rock Slide', type: 'rock', usage: 39.2 },
        ],
    },
    raichu: {
        id: 26,
        dex: '#0026',
        spriteKey: 'raichu',
        name: 'Raichu',
        genus: 'Mouse Pokémon',
        types: ['electric'],
        height: '0.8 m',
        weight: '30.0 kg',
        generation: 'Gen I · Kanto',
        professorNote: 'Peça elétrica #1 de Buenos Aires SPE 2027: Lightning Rod protege parceiros Water/Flying enquanto Fake Out + Nuzzle travam o ritmo.',
        baseStats: { hp: 60, atk: 90, def: 55, spa: 90, spd: 80, spe: 110 },
        defaultNature: 'Timid',
        defaultEvs: { hp: 72, atk: 0, def: 36, spa: 8, spd: 140, spe: 252 },
        abilities: [
            { name: 'Lightning Rod', usage: 89.7, desc: 'Redireciona golpes Electric de alvo único e eleva Sp. Atk em +1.' },
            { name: 'Static', usage: 10.3, desc: '30% de chance de paralisar quem atacar com contato físico.' },
        ],
        items: [
            { name: 'Raichunite Y', usage: 64.0 },
            { name: 'Raichunite X', usage: 19.9 },
            { name: 'Focus Sash', usage: 8.8 },
            { name: 'Assault Vest', usage: 7.3 },
        ],
        moves: [
            { name: 'Fake Out', type: 'normal', usage: 94.1 },
            { name: 'Protect', type: 'normal', usage: 86.2 },
            { name: 'Zap Cannon', type: 'electric', usage: 62.5 },
            { name: 'Focus Blast', type: 'fighting', usage: 51.8 },
            { name: 'Volt Switch', type: 'electric', usage: 38.4 },
        ],
    },
    'rotom-wash': {
        id: 10009,
        dex: '#0479W',
        spriteKey: 'rotom-wash',
        name: 'Rotom-Wash',
        genus: 'Plasma Pokémon',
        types: ['electric', 'water'],
        height: '0.3 m',
        weight: '0.3 kg',
        generation: 'Gen IV · Sinnoh',
        professorNote: 'Uma única fraqueza (Grass) graças a Levitate. Pivot defensivo ideal para times com Heatran e Incineroar.',
        baseStats: { hp: 50, atk: 65, def: 107, spa: 105, spd: 107, spe: 86 },
        defaultNature: 'Calm',
        defaultEvs: { hp: 252, atk: 0, def: 100, spa: 4, spd: 140, spe: 12 },
        abilities: [
            { name: 'Levitate', usage: 100.0, desc: 'Concede imunidade total a ataques do tipo Ground e entry hazards no solo.' },
        ],
        items: [
            { name: 'Sitrus Berry', usage: 67.4 },
            { name: 'Safety Goggles', usage: 19.2 },
            { name: 'Leftovers', usage: 8.9 },
            { name: 'Choice Specs', usage: 4.5 },
        ],
        moves: [
            { name: 'Hydro Pump', type: 'water', usage: 96.2 },
            { name: 'Thunderbolt', type: 'electric', usage: 84.5 },
            { name: 'Will-O-Wisp', type: 'fire', usage: 71.0 },
            { name: 'Protect', type: 'normal', usage: 88.4 },
            { name: 'Electroweb', type: 'electric', usage: 34.7 },
        ],
    },
};

export const NATURES = {
    Timid: { label: 'Timid (+Spe / -Atk)', plus: 'spe', minus: 'atk' },
    Modest: { label: 'Modest (+SpA / -Atk)', plus: 'spa', minus: 'atk' },
    Jolly: { label: 'Jolly (+Spe / -SpA)', plus: 'spe', minus: 'spa' },
    Adamant: { label: 'Adamant (+Atk / -SpA)', plus: 'atk', minus: 'spa' },
    Calm: { label: 'Calm (+SpD / -Atk)', plus: 'spd', minus: 'atk' },
};

export const SPEED_BENCHMARKS = [
    { speed: 128, label: 'Rillaboom' },
    { speed: 152, label: 'Urshifu 252' },
    { speed: 169, label: 'Garchomp +' },
    { speed: 178, label: '110+ Timid' },
    { speed: 205, label: 'Flutter 135+' },
];

export const TOURNAMENT_TEAMS = [
    {
        id: '4e572771dec214f8',
        rank: 1,
        placementLabel: '#1 · Champion',
        tier: 'topcut',
        tags: ['topcut', 'mega', 'terrain'],
        title: "Eze's Buenos Aires SPE 2027",
        player: 'Ezequiel Bustamente',
        tournament: 'Buenos Aires SPE 2027',
        date: '15 Nov 2026',
        format: 'Reg M-C',
        record: '10–1',
        leadType: 'ice',
        archetype: 'Mega Baxcalibur · Grassy Balance',
        pokemons: [
            { id: 998, spriteKey: 'baxcalibur', name: 'Baxcalibur-Mega', types: ['dragon', 'ice'], item: 'Baxcalibrite', ability: 'Ice Body', nature: 'Adamant', moves: ['Glaive Rush', 'Ice Shard', 'Swords Dance', 'Protect'] },
            { id: 26, spriteKey: 'raichu', name: 'Raichu-Mega-Y', types: ['electric'], item: 'Raichunite Y', ability: 'Lightning Rod', nature: 'Timid', moves: ['Zap Cannon', 'Focus Blast', 'Fake Out', 'Protect'] },
            { id: 727, spriteKey: 'incineroar', name: 'Incineroar', types: ['fire', 'dark'], item: 'Sitrus Berry', ability: 'Intimidate', nature: 'Careful', moves: ['Flare Blitz', 'Darkest Lariat', 'Fake Out', 'Parting Shot'] },
            { id: 637, spriteKey: 'volcarona', name: 'Volcarona', types: ['bug', 'fire'], item: 'Grassy Seed', ability: 'Flame Body', nature: 'Modest', moves: ['Bug Buzz', 'Heat Wave', 'Quiver Dance', 'Protect'] },
            { id: 350, spriteKey: 'milotic', name: 'Milotic', types: ['water'], item: 'Leftovers', ability: 'Competitive', nature: 'Calm', moves: ['Muddy Water', 'Hypnosis', 'Coil', 'Recover'] },
            { id: 812, spriteKey: 'rillaboom', name: 'Rillaboom', types: ['grass'], item: 'Miracle Seed', ability: 'Grassy Surge', nature: 'Adamant', moves: ['Wood Hammer', 'Grassy Glide', 'High Horsepower', 'Fake Out'] },
        ],
    },
    {
        id: 'cb961dfd044ef427',
        rank: 2,
        placementLabel: '#2 · Runner Up',
        tier: 'topcut',
        tags: ['topcut', 'mega', 'weather'],
        title: "Bruno Quiroga's Charizard-Y Hyper",
        player: 'Bruno Quiroga',
        tournament: 'Buenos Aires SPE 2027',
        date: '15 Nov 2026',
        format: 'Reg M-C',
        record: '9–2',
        leadType: 'fire',
        archetype: 'Dual Mega · Sun Tailwind',
        pokemons: [
            { id: 142, spriteKey: 'aerodactyl', name: 'Aerodactyl-Mega', types: ['rock', 'flying'], item: 'Aerodactylite', ability: 'Unnerve', nature: 'Jolly', moves: ['Dual Wingbeat', 'Rock Slide', 'Protect', 'Tailwind'] },
            { id: 6, spriteKey: 'charizard', name: 'Charizard-Mega-Y', types: ['fire', 'flying'], item: 'Charizardite Y', ability: 'Drought', nature: 'Modest', moves: ['Heat Wave', 'Weather Ball', 'Protect', 'Solar Beam'] },
            { id: 981, spriteKey: 'farigiraf', name: 'Farigiraf', types: ['normal', 'psychic'], item: 'Sitrus Berry', ability: 'Armor Tail', nature: 'Bold', moves: ['Psychic Noise', 'Protect', 'Trick Room', 'Helping Hand'] },
            { id: 983, spriteKey: 'kingambit', name: 'Kingambit', types: ['dark', 'steel'], item: 'Focus Sash', ability: 'Defiant', nature: 'Adamant', moves: ['Kowtow Cleave', 'Iron Head', 'Sucker Punch', 'Low Kick'] },
            { id: 700, spriteKey: 'sylveon', name: 'Sylveon', types: ['fairy'], item: 'Fairy Feather', ability: 'Pixilate', nature: 'Modest', moves: ['Hyper Voice', 'Moonblast', 'Protect', 'Yawn'] },
            { id: 445, spriteKey: 'garchomp', name: 'Garchomp', types: ['dragon', 'ground'], item: 'Life Orb', ability: 'Rough Skin', nature: 'Jolly', moves: ['Dragon Claw', 'Stomping Tantrum', 'Protect', 'Earthquake'] },
        ],
    },
    {
        id: '7dc35555df689638',
        rank: 3,
        placementLabel: '#3 · Top 4',
        tier: 'topcut',
        tags: ['topcut', 'mega'],
        title: "Marante's Dual Threat Balance",
        player: 'Samuel Pereira Marante',
        tournament: 'Buenos Aires SPE 2027',
        date: '15 Nov 2026',
        format: 'Reg M-C',
        record: '8–2',
        leadType: 'electric',
        archetype: 'Raichu-Y · Staraptor Pivot',
        pokemons: [
            { id: 26, spriteKey: 'raichu', name: 'Raichu-Mega-Y', types: ['electric'], item: 'Raichunite Y', ability: 'Lightning Rod', nature: 'Timid', moves: ['Zap Cannon', 'Focus Blast', 'Fake Out', 'Protect'] },
            { id: 398, spriteKey: 'staraptor', name: 'Staraptor-Mega', types: ['normal', 'flying'], item: 'Staraptite', ability: 'Intimidate', nature: 'Jolly', moves: ['Brave Bird', 'Close Combat', 'U-turn', 'Protect'] },
            { id: 727, spriteKey: 'incineroar', name: 'Incineroar', types: ['fire', 'dark'], item: 'Safety Goggles', ability: 'Intimidate', nature: 'Careful', moves: ['Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot'] },
            { id: 445, spriteKey: 'garchomp', name: 'Garchomp', types: ['dragon', 'ground'], item: 'Clear Amulet', ability: 'Rough Skin', nature: 'Jolly', moves: ['Earthquake', 'Dragon Claw', 'Rock Slide', 'Protect'] },
            { id: 987, spriteKey: 'flutter-mane', name: 'Flutter Mane', types: ['ghost', 'fairy'], item: 'Booster Energy', ability: 'Protosynthesis', nature: 'Timid', moves: ['Moonblast', 'Shadow Ball', 'Icy Wind', 'Protect'] },
            { id: 812, spriteKey: 'rillaboom', name: 'Rillaboom', types: ['grass'], item: 'Assault Vest', ability: 'Grassy Surge', nature: 'Adamant', moves: ['Wood Hammer', 'Grassy Glide', 'High Horsepower', 'Fake Out'] },
        ],
    },
    {
        id: '942f0375c862f0c5',
        rank: 6,
        placementLabel: '#6 · Top 8',
        tier: 'topcut',
        tags: ['topcut', 'mega', 'weather'],
        title: "Juan Velasco's Sun Fairy",
        player: 'Juan Velasco',
        tournament: 'Buenos Aires SPE 2027',
        date: '15 Nov 2026',
        format: 'Reg M-C',
        record: '7–2',
        leadType: 'fairy',
        archetype: 'Charizard-Y · Basculegion Mode',
        pokemons: [
            { id: 6, spriteKey: 'charizard', name: 'Charizard-Mega-Y', types: ['fire', 'flying'], item: 'Charizardite Y', ability: 'Drought', nature: 'Modest', moves: ['Protect', 'Heat Wave', 'Weather Ball', 'Solar Beam'] },
            { id: 670, spriteKey: 'floette', name: 'Floette-Mega', types: ['fairy'], item: 'Floettite', ability: 'Flower Veil', nature: 'Modest', moves: ['Protect', 'Moonblast', 'Dazzling Gleam', 'Light of Ruin'] },
            { id: 902, spriteKey: 'basculegion', name: 'Basculegion', types: ['water', 'ghost'], item: 'Mystic Water', ability: 'Adaptability', nature: 'Adamant', moves: ['Protect', 'Wave Crash', 'Last Respects', 'Aqua Jet'] },
            { id: 547, spriteKey: 'whimsicott', name: 'Whimsicott', types: ['grass', 'fairy'], item: 'Focus Sash', ability: 'Prankster', nature: 'Timid', moves: ['Protect', 'Moonblast', 'Encore', 'Tailwind'] },
            { id: 983, spriteKey: 'kingambit', name: 'Kingambit', types: ['dark', 'steel'], item: 'Chople Berry', ability: 'Defiant', nature: 'Adamant', moves: ['Iron Head', 'Kowtow Cleave', 'Sucker Punch', 'Low Kick'] },
            { id: 445, spriteKey: 'garchomp', name: 'Garchomp', types: ['dragon', 'ground'], item: 'Life Orb', ability: 'Rough Skin', nature: 'Jolly', moves: ['Protect', 'Dragon Claw', 'Earthquake', 'Rock Slide'] },
        ],
    },
];

export const META_WATERFALL = [
    { id: 812, spriteKey: 'rillaboom', name: 'Rillaboom', types: ['grass'], usage: 44.8, winRate: 47.8, topCut: 279, teams: 3878, core: 'Grassy Pivot' },
    { id: 903, spriteKey: 'sneasler', name: 'Sneasler', types: ['fighting', 'poison'], usage: 36.9, winRate: 48.5, topCut: 246, teams: 3191, core: 'Unburden Seed' },
    { id: 727, spriteKey: 'incineroar', name: 'Incineroar', types: ['fire', 'dark'], usage: 33.6, winRate: 47.4, topCut: 233, teams: 2910, core: 'Intimidate Cycle' },
    { id: 445, spriteKey: 'garchomp', name: 'Garchomp', types: ['dragon', 'ground'], usage: 29.3, winRate: 47.7, topCut: 199, teams: 2534, core: 'Ground Pressure' },
    { id: 26, spriteKey: 'raichu', name: 'Raichu', types: ['electric'], usage: 26.2, winRate: 48.5, topCut: 169, teams: 2265, core: 'Lightning Rod' },
    { id: 983, spriteKey: 'kingambit', name: 'Kingambit', types: ['dark', 'steel'], usage: 23.9, winRate: 50.4, topCut: 169, teams: 2065, core: 'Defiant Closer' },
    { id: 1000, spriteKey: 'gholdengo', name: 'Gholdengo', types: ['steel', 'ghost'], usage: 21.4, winRate: 47.9, topCut: 138, teams: 1856, core: 'Make It Rain' },
    { id: 6, spriteKey: 'charizard', name: 'Charizard', types: ['fire', 'flying'], usage: 17.6, winRate: 49.8, topCut: 135, teams: 1527, core: 'Drought Mega-Y' },
];

export const TRAINER_PRESETS = [
    {
        uid: 'PTB-9408-BR',
        name: 'Enzo',
        handle: '@enzo.vgc',
        persona: 'Estrategista',
        toneType: 'dragon',
        partnerKey: 'gengar',
        partnerName: 'Gengar',
        since: 'Desde Jul 2024',
        streak: 18,
        xp: 4280,
        fullDays: 27,
        rank: '#14',
        league: 'Liga Sinnoh · Master',
    },
    {
        uid: 'CYN-0445-SP',
        name: 'Cynthia Lab',
        handle: '@campeasinnoh',
        persona: 'Desafiante',
        toneType: 'ground',
        partnerKey: 'garchomp',
        partnerName: 'Garchomp',
        since: 'Desde Mar 2024',
        streak: 34,
        xp: 6150,
        fullDays: 41,
        rank: '#3',
        league: 'Liga Sinnoh · Elite',
    },
    {
        uid: 'VGC-0812-TK',
        name: 'Kiwamu',
        handle: '@kiwamu.endo',
        persona: 'Explorador',
        toneType: 'electric',
        partnerKey: 'raichu',
        partnerName: 'Raichu',
        since: 'Desde Nov 2024',
        streak: 12,
        xp: 2890,
        fullDays: 19,
        rank: '#42',
        league: 'Liga Kanto · Top Cut',
    },
];

// Deterministic pixel banner generator matching src/utils/trainerCardPattern.js
export function hashSeed(text = '') {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

function mulberry32(seed) {
    let a = seed || 1;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function trainerPixels(seed, { cols = 36, rows = 10, accents = 6 } = {}) {
    const rand = mulberry32(hashSeed(String(seed || 'trainer')));
    const cells = [];
    for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
            const chance = Math.max(0, (x / cols) - 0.16) * 0.95;
            if (rand() < chance) {
                const r = rand();
                cells.push({ x, y, o: r < 0.5 ? 0.25 : r < 0.85 ? 0.45 : 0.72, accent: false });
            }
        }
    }
    const right = cells.filter((c) => c.x >= cols / 2);
    for (let i = 0; i < Math.min(accents, right.length); i += 1) {
        right[Math.floor(rand() * right.length)].accent = true;
    }
    return cells;
}
