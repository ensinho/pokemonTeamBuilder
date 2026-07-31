import { LEGENDARY_IDS, GENERATION_RANGES } from '../constants/pokemon';
import { normalizePokemonQuizInput, buildPokemonQuizNameAliases } from '../services/pokemonDataCache';

// List of starter Pokemon families (by species ID)
export const STARTER_SPECIES_IDS = new Set([
    // Gen 1
    1, 2, 3, 4, 5, 6, 7, 8, 9,
    // Gen 2
    152, 153, 154, 155, 156, 157, 158, 159, 160,
    // Gen 3
    252, 253, 254, 255, 256, 257, 258, 259, 260,
    // Gen 4
    387, 388, 389, 390, 391, 392, 393, 394, 395,
    // Gen 5
    495, 496, 497, 498, 499, 500, 501, 502, 503,
    // Gen 6
    650, 651, 652, 653, 654, 655, 656, 657, 658,
    // Gen 7
    722, 723, 724, 725, 726, 727, 728, 729, 730,
    // Gen 8
    810, 811, 812, 813, 814, 815, 816, 817, 818,
    // Gen 9
    906, 907, 908, 909, 910, 911, 912, 913, 914,
]);

// Pikaclones
export const PIKACLONE_SPECIES_IDS = new Set([
    25, 26, 172, // Pikachu line
    311, 312,    // Plusle, Minun
    417,         // Pachirisu
    587,         // Emolga
    702,         // Dedenne
    777,         // Togedemaru
    877,         // Morpeko
    921, 922, 923 // Pawmi line
]);

// Baby Pokemons
export const BABY_SPECIES_IDS = new Set([
    172, 173, 174, 175, 236, 238, 239, 240, 298,
    360, 406, 433, 438, 439, 440, 446, 447, 458, 848
]);

// Fossil / Prehistoric Pokemons
export const FOSSIL_SPECIES_IDS = new Set([
    138, 139, 140, 141, 142,
    345, 346, 347, 348,
    408, 409, 410, 411,
    564, 565, 566, 567,
    696, 697, 698, 699,
    880, 881, 882, 883
]);

// Food based Pokemon
export const FOOD_SPECIES_IDS = new Set([
    582, 583, 584, // Vanillite line
    684, 685,      // Swirlix, Slurpuff
    769, 770,      // Sandygast (food adjacent), Bounsweet (fruit)
    761, 762, 763, // Bounsweet line
    840, 841, 842, 980, // Applin line
    868, 869,      // Milcery, Alcremie
    926, 927,      // Fidough, Dachsbun
    951, 952,      // Capsakid, Scovillain
    978,           // Tatsugiri
]);

// Object / Appliance based Pokemon
export const OBJECT_SPECIES_IDS = new Set([
    81, 82, 462,   // Magnemite line
    100, 101,      // Voltorb, Electrode
    479,           // Rotom
    562, 563,      // Yamask, Cofagrigus
    607, 608, 609, // Litwick, Lampent, Chandelure
    680, 681,      // Doublade, Aegislash
    707,           // Klefki
    769, 770,      // Sandygast, Palossand
    854, 855, 938, 939 // Sinistea, Polteageist, Poltchageist, Sinistcha
]);

// Real Animals classification (mammals, birds, reptiles, fish, insects)
export const REAL_ANIMAL_SPECIES_IDS = new Set([
    // Canines / Felids / Rodents / Birds / Reptiles / Fish / Insects
    16, 17, 18, 19, 20, 21, 22, 23, 24, 27, 28, 37, 38, 52, 53, 54, 55, 56, 57, 58, 59,
    116, 117, 118, 119, 129, 130, 161, 162, 163, 164, 179, 180, 181, 196, 197, 209, 210,
    228, 229, 261, 262, 276, 277, 318, 319, 396, 397, 398, 399, 400, 403, 404, 405, 418, 419,
    504, 505, 506, 507, 508, 519, 520, 521, 659, 660, 661, 662, 663, 731, 732, 733, 734, 735,
    819, 820, 821, 822, 823, 915, 916, 917, 918, 919, 920
]);

/**
 * Determine generation from Pokemon ID (1-1025)
 */
export const getPokemonGeneration = (id) => {
    const numericId = Number(id);
    for (const [genKey, range] of Object.entries(GENERATION_RANGES)) {
        if (genKey === 'all') continue;
        if (numericId >= range.start && numericId <= range.end) {
            const num = genKey.replace('generation-', '');
            if (num === 'i') return 1;
            if (num === 'ii') return 2;
            if (num === 'iii') return 3;
            if (num === 'iv') return 4;
            if (num === 'v') return 5;
            if (num === 'vi') return 6;
            if (num === 'vii') return 7;
            if (num === 'viii') return 8;
            if (num === 'ix') return 9;
        }
    }
    return 1;
};

const ROMAN_GENERATIONS = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };

/**
 * Resolve a Pokémon's generation to a plain number.
 *
 * The index (`pokemon-index.json`) stores it as `"generation-i"`, so comparing
 * `pokemon.generation` straight against a number silently answered "no" to
 * every generation question. Accepts a number, a `generation-<roman>` string,
 * or nothing at all — falling back to the id range.
 */
export const resolvePokemonGenerationNumber = (pokemon) => {
    const raw = pokemon?.generation;

    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;

    if (typeof raw === 'string') {
        const digits = raw.match(/\d+/);
        if (digits) return Number(digits[0]);
        const roman = raw.toLowerCase().replace('generation', '').replace(/[^a-z]/g, '');
        if (ROMAN_GENERATIONS[roman]) return ROMAN_GENERATIONS[roman];
    }

    return getPokemonGeneration(pokemon?.id);
};

const toFiniteNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

/**
 * Height in metres. PokéAPI serves decimetres, so `heightDm`/`height` are
 * divided by 10; `heightM` is trusted as-is. Returns null when unknown, which
 * callers must treat as "cannot answer" rather than "no".
 */
export const getPokemonHeightMeters = (pokemon) => {
    const meters = toFiniteNumber(pokemon?.heightM);
    if (meters !== null) return meters;
    const decimetres = toFiniteNumber(pokemon?.heightDm ?? pokemon?.height);
    return decimetres === null ? null : decimetres / 10;
};

/** Weight in kilograms. PokéAPI serves hectograms. Null when unknown. */
export const getPokemonWeightKg = (pokemon) => {
    const kilos = toFiniteNumber(pokemon?.weightKg);
    if (kilos !== null) return kilos;
    const hectograms = toFiniteNumber(pokemon?.weightHg ?? pokemon?.weight);
    return hectograms === null ? null : hectograms / 10;
};

const stripDiacritics = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Normalize a typed *question* (not a Pokémon name).
 *
 * `normalizePokemonQuizInput` removes every non-alphanumeric character —
 * including spaces — which is right for matching names but silently broke every
 * multi-word intent here ("maior que 1m" collapsed to "maiorque1m"). This keeps
 * words separated, and keeps `.`/`,` so decimals like "1,5m" survive.
 */
export const normalizeQuestionText = (value = '') => stripDiacritics(String(value ?? '').toLowerCase())
    .replace(/[^a-z0-9.,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasAny = (text, terms) => terms.some((term) => text.includes(term));

const GREATER_TERMS = ['maior', 'mais de', 'mais que', 'acima', 'superior', 'passa de', 'ultrapassa', 'no minimo'];
const SMALLER_TERMS = ['menor', 'menos de', 'menos que', 'abaixo', 'inferior', 'no maximo', 'ate '];

const parseMeasure = (text, units) => {
    const pattern = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:${units})(?![a-z])`);
    const match = text.match(pattern);
    return match ? Number(match[1].replace(',', '.')) : null;
};

const formatMeters = (meters) => `${String(Number(meters).toFixed(2)).replace(/\.?0+$/, '').replace('.', ',')}m`;
const formatKilos = (kilos) => `${String(Number(kilos).toFixed(2)).replace(/\.?0+$/, '').replace('.', ',')}kg`;

/**
 * Calculate Levenshtein distance between two strings for fuzzy matching
 */
export const calculateLevenshteinDistance = (a, b) => {
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i += 1) {
        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[a.length][b.length];
};

/**
 * Check if input string fuzzy matches a Pokemon name/aliases
 */
export const fuzzyMatchPokemon = (inputName, targetPokemonName, threshold = 2) => {
    const normalizedInput = normalizePokemonQuizInput(inputName);
    const targetAliases = buildPokemonQuizNameAliases(targetPokemonName);

    for (const alias of targetAliases) {
        if (alias === normalizedInput) return { match: true, exact: true, distance: 0 };
        const dist = calculateLevenshteinDistance(normalizedInput, alias);
        if (dist <= threshold) {
            return { match: true, exact: false, distance: dist };
        }
    }
    return { match: false, exact: false, distance: Infinity };
};

/**
 * Evaluate an attribute question against a target secret Pokemon record.
 *
 * A returned `unknown: true` means the question could not be judged — the
 * record is missing the data it needs (e.g. height). Callers must surface that
 * as "cannot answer" and NOT as a "no", which is what the old `default` branch
 * did for every unrecognised category.
 *
 * @param {object} question - Question object e.g. { category: 'type', value: 'fire' }
 * @param {object} secretPokemon - Secret Pokemon data object
 * @returns {{ answer: boolean, unknown?: boolean, hint?: string }}
 */
export const evaluateAttributeQuestion = (question, secretPokemon, userFavorites = []) => {
    const result = evaluateAttributeQuestionCore(question, secretPokemon, userFavorites);

    // `invert` powers the mirrored intents ("monotipo?" is "dual type?" negated).
    // An unanswerable question stays unanswerable — negating it would invent data.
    if (question?.invert && !result.unknown) {
        return { ...result, answer: !result.answer };
    }
    return result;
};

const evaluateAttributeQuestionCore = (question, secretPokemon, userFavorites = []) => {
    if (!question || !secretPokemon) {
        return { answer: false, unknown: true, hint: 'Dados insuficientes' };
    }

    const { category, value } = question;
    const types = (secretPokemon.types || []).map((t) => t.toLowerCase());
    const id = Number(secretPokemon.id);
    const gen = resolvePokemonGenerationNumber(secretPokemon);
    const stats = secretPokemon.baseStats || secretPokemon.stats || {};

    let bst = 0;
    if (typeof stats === 'object') {
        if (Array.isArray(stats)) {
            bst = stats.reduce((sum, s) => sum + (s.base_stat || 0), 0);
        } else {
            bst = (stats.hp || 0) + (stats.attack || 0) + (stats.defense || 0) +
                  (stats['special-attack'] || stats.spAtk || 0) +
                  (stats['special-defense'] || stats.spDef || 0) + (stats.speed || 0);
        }
    }

    switch (category) {
        // --- TIPOS ---
        case 'type':
            return { answer: types.includes(String(value).toLowerCase()) };
        case 'isDualType':
            return { answer: types.length > 1 };

        // --- GERAÇÃO & REGIÃO ---
        case 'generation':
            return { answer: String(gen) === String(value) };
        case 'genBefore':
            return { answer: gen < Number(value) };
        case 'genAfter':
            return { answer: gen > Number(value) };

        // --- LINHA EVOLUTIVA ---
        // The stage flags come from the evolution chain, which the lightweight
        // index does not carry — `evolutionStage`/`evolutionStageCount` are added
        // by the room when the secret is drawn. Absent them the honest answer is
        // "unknown", not "no".
        case 'isBaby':
            return { answer: Boolean(secretPokemon.isBaby) || BABY_SPECIES_IDS.has(id) };
        case 'isSingleStage': {
            const total = toFiniteNumber(secretPokemon.evolutionStageCount);
            if (total === null) return { answer: false, unknown: true, hint: 'Sem dados de evolução' };
            return { answer: total === 1 };
        }
        case 'isBaseForm': {
            const stage = toFiniteNumber(secretPokemon.evolutionStage);
            const total = toFiniteNumber(secretPokemon.evolutionStageCount);
            if (stage === null || total === null) return { answer: false, unknown: true, hint: 'Sem dados de evolução' };
            return { answer: stage === 1 && total > 1 };
        }
        case 'isFinalForm': {
            const stage = toFiniteNumber(secretPokemon.evolutionStage);
            const total = toFiniteNumber(secretPokemon.evolutionStageCount);
            if (stage === null || total === null) return { answer: false, unknown: true, hint: 'Sem dados de evolução' };
            return { answer: stage === total && total > 1 };
        }
        // "É uma evolução?" — deliberately not `isBaseForm` inverted, because a
        // single-stage Pokémon is not a base form *and* not an evolution.
        case 'isEvolved': {
            const stage = toFiniteNumber(secretPokemon.evolutionStage);
            if (stage === null) return { answer: false, unknown: true, hint: 'Sem dados de evolução' };
            return { answer: stage > 1 };
        }

        // --- CATEGORIAS ESPECIAIS & CONCEITOS REAIS ---
        case 'isLegendary':
            return { answer: LEGENDARY_IDS.has(id) };
        case 'isStarter':
            return { answer: STARTER_SPECIES_IDS.has(id) };
        case 'isPikaclone':
            return { answer: PIKACLONE_SPECIES_IDS.has(id) };
        case 'isFossil':
            return { answer: FOSSIL_SPECIES_IDS.has(id) };
        case 'isFoodBased':
            return { answer: FOOD_SPECIES_IDS.has(id) };
        case 'isObjectBased':
            return { answer: OBJECT_SPECIES_IDS.has(id) };
        case 'isRealAnimal':
            return { answer: REAL_ANIMAL_SPECIES_IDS.has(id) };

        // --- FÍSICA & ESTATÍSTICAS ---
        // Height/weight arrive in human units (metres / kg) on the question and
        // are compared against the record's PokéAPI decimetres / hectograms.
        case 'heightMin': {
            const meters = getPokemonHeightMeters(secretPokemon);
            if (meters === null) return { answer: false, unknown: true, hint: 'Sem dados de altura' };
            return { answer: meters >= Number(value) };
        }
        case 'heightMax': {
            const meters = getPokemonHeightMeters(secretPokemon);
            if (meters === null) return { answer: false, unknown: true, hint: 'Sem dados de altura' };
            return { answer: meters < Number(value) };
        }
        case 'heightRange': {
            const meters = getPokemonHeightMeters(secretPokemon);
            if (meters === null) return { answer: false, unknown: true, hint: 'Sem dados de altura' };
            return { answer: meters >= Number(question.min) && meters < Number(question.max) };
        }
        case 'weightMin': {
            const kilos = getPokemonWeightKg(secretPokemon);
            if (kilos === null) return { answer: false, unknown: true, hint: 'Sem dados de peso' };
            return { answer: kilos >= Number(value) };
        }
        case 'weightMax': {
            const kilos = getPokemonWeightKg(secretPokemon);
            if (kilos === null) return { answer: false, unknown: true, hint: 'Sem dados de peso' };
            return { answer: kilos < Number(value) };
        }

        case 'bstMin':
            if (!bst) return { answer: false, unknown: true, hint: 'Sem dados de status' };
            return { answer: bst >= Number(value) };
        case 'bstMax':
            if (!bst) return { answer: false, unknown: true, hint: 'Sem dados de status' };
            return { answer: bst <= Number(value) };
        case 'topStatSpeed': {
            if (!bst) return { answer: false, unknown: true, hint: 'Sem dados de status' };
            let maxStat = null;
            let maxVal = -1;
            const entries = Array.isArray(stats)
                ? stats.map((s) => [s.name, s.base_stat])
                : Object.entries(stats);
            for (const [k, v] of entries) {
                if (Number(v) > maxVal) { maxVal = Number(v); maxStat = k; }
            }
            return { answer: maxStat === 'speed' };
        }

        // --- PESSOAL & FAVORITOS ---
        case 'isUserFavorite': {
            let favArray = [];
            if (Array.isArray(userFavorites)) {
                favArray = userFavorites;
            } else if (userFavorites && typeof userFavorites === 'object') {
                if (userFavorites instanceof Set) {
                    favArray = Array.from(userFavorites);
                } else if (typeof userFavorites[Symbol.iterator] === 'function') {
                    favArray = Array.from(userFavorites);
                } else {
                    favArray = Object.keys(userFavorites);
                }
            }
            const favIds = favArray.map((f) => Number(typeof f === 'object' && f !== null ? (f.id ?? f.pokemonId ?? f) : f));
            return { answer: favIds.includes(Number(secretPokemon.id)) };
        }

        // A question nobody taught the evaluator about. Answering "no" here is a
        // lie — it reads as information about the secret Pokémon when it is really
        // just a parser gap. Callers should reject the question instead.
        case 'custom':
        default:
            return { answer: false, unknown: true, hint: 'Pergunta não reconhecida' };
    }
};

/**
 * Compare a direct Pokemon guess against the secret Pokemon and generate proximity feedback
 */
export const comparePokemonGuess = (guessedPokemon, secretPokemon) => {
    if (!guessedPokemon || !secretPokemon) return null;

    const isExact = Number(guessedPokemon.id) === Number(secretPokemon.id);
    const guessedGen = getPokemonGeneration(guessedPokemon.id);
    const secretGen = getPokemonGeneration(secretPokemon.id);

    const guessedTypes = (guessedPokemon.types || []).map((t) => t.toLowerCase());
    const secretTypes = (secretPokemon.types || []).map((t) => t.toLowerCase());

    const commonTypes = guessedTypes.filter((t) => secretTypes.includes(t));

    return {
        isExact,
        genDiff: secretGen - guessedGen,
        genMatch: secretGen === guessedGen,
        typeMatches: commonTypes,
        sharedTypesCount: commonTypes.length,
        isLegendaryMatch: LEGENDARY_IDS.has(Number(guessedPokemon.id)) === LEGENDARY_IDS.has(Number(secretPokemon.id)),
    };
};

/**
 * Natural-language question intents, in priority order.
 *
 * `terms` are substring matches (safe for multi-word phrases and long stems);
 * `words` are whole-token matches, used for short strings that would otherwise
 * hit innocent substrings — "aco" inside "macaco", "luta" inside "lutador".
 *
 * Order matters: the first match wins, so narrower intents ("status alto")
 * must precede broader ones ("alto").
 */
const QUESTION_INTENTS = [
    // --- QUANTIDADE DE TIPOS ---
    {
        terms: ['duas tipagens', 'dois tipos', '2 tipos', '2 tipagens', 'tipo duplo', 'dual type', 'dupla tipagem', 'segundo tipo'],
        obj: { category: 'isDualType' },
        label: 'Possui 2 Tipos (Dual Type)?',
    },
    {
        terms: ['um tipo', '1 tipo', 'tipo unico', 'apenas um tipo', 'monotipo', 'mono tipo'],
        obj: { category: 'isDualType', invert: true },
        label: 'Possui apenas 1 Tipo (Monotipo)?',
    },

    // --- TIPOS / ELEMENTOS ---
    { terms: ['fogo', 'fire', 'chama', 'queima', 'flamejante'], obj: { category: 'type', value: 'fire' }, label: 'É do tipo Fogo?' },
    { terms: ['agua', 'water', 'aquatico', 'marinho'], obj: { category: 'type', value: 'water' }, label: 'É do tipo Água?' },
    { terms: ['planta', 'grass', 'grama', 'folha', 'vegetal'], obj: { category: 'type', value: 'grass' }, label: 'É do tipo Planta?' },
    { terms: ['eletric', 'electric', 'raio', 'trovao', 'choque'], obj: { category: 'type', value: 'electric' }, label: 'É do tipo Elétrico?' },
    { terms: ['dragao', 'dragon'], obj: { category: 'type', value: 'dragon' }, label: 'É do tipo Dragão?' },
    { terms: ['fantasma', 'ghost', 'assombrad', 'espirito'], obj: { category: 'type', value: 'ghost' }, label: 'É do tipo Fantasma?' },
    { terms: ['psiquic', 'psychic', 'telepat'], words: ['mente'], obj: { category: 'type', value: 'psychic' }, label: 'É do tipo Psíquico?' },
    { terms: ['congelad'], words: ['gelo', 'ice', 'neve'], obj: { category: 'type', value: 'ice' }, label: 'É do tipo Gelo?' },
    { terms: ['lutador', 'fighting', 'artes marciais', 'briga'], words: ['luta'], obj: { category: 'type', value: 'fighting' }, label: 'É do tipo Lutador?' },
    { terms: ['veneno', 'poison', 'toxico', 'venenoso'], obj: { category: 'type', value: 'poison' }, label: 'É do tipo Veneno?' },
    { terms: ['ground', 'terrestre'], words: ['terra'], obj: { category: 'type', value: 'ground' }, label: 'É do tipo Terrestre?' },
    { terms: ['voador', 'flying'], words: ['voa', 'asa', 'asas'], obj: { category: 'type', value: 'flying' }, label: 'É do tipo Voador?' },
    { terms: ['inseto', 'besouro'], words: ['bug'], obj: { category: 'type', value: 'bug' }, label: 'É do tipo Inseto?' },
    { terms: ['pedra', 'rock', 'rocha'], obj: { category: 'type', value: 'rock' }, label: 'É do tipo Pedra?' },
    { terms: ['sombrio', 'noturno', 'trevas'], words: ['dark'], obj: { category: 'type', value: 'dark' }, label: 'É do tipo Sombrio?' },
    { terms: ['steel'], words: ['aco', 'metal', 'metalico', 'ferro'], obj: { category: 'type', value: 'steel' }, label: 'É do tipo Aço?' },
    { terms: ['fairy', 'magico'], words: ['fada'], obj: { category: 'type', value: 'fairy' }, label: 'É do tipo Fada?' },

    // --- EVOLUÇÃO & ESTÁGIOS ---
    {
        terms: ['nao evolui', 'sem evolucao', 'estagio unico', 'nao tem evolucao', 'unico estagio'],
        obj: { category: 'isSingleStage' },
        label: 'Não possui evolução (Estágio Único)?',
    },
    {
        terms: ['evolucao final', 'ultima evolucao', 'ultimo estagio', 'estagio final', 'ja evoluiu', 'totalmente evoluido', 'evoluido'],
        obj: { category: 'isFinalForm' },
        label: 'É a Evolução Final?',
    },
    {
        terms: ['forma base', 'primeira evolucao', '1o estagio', 'primeiro estagio', 'forma inicial', 'nao evoluiu'],
        obj: { category: 'isBaseForm' },
        label: 'É a Forma Base (1º Estágio)?',
    },
    { terms: ['bebe', 'baby', 'filhote'], obj: { category: 'isBaby' }, label: 'É um Pokémon Bebê?' },
    // Catch-all for the evolution family, placed after the specific ones above so
    // they win. A bare stem also absorbs the common typos ("evolulcao", "evoluçao")
    // that an exact-phrase list would reject outright.
    {
        terms: ['evolu'],
        obj: { category: 'isEvolved' },
        label: 'Já é uma evolução (não é forma base)?',
    },

    // --- STATUS ---
    // Before the physical block: "status alto" must not be read as "alto" (height).
    {
        terms: ['status alto', 'status altos', 'bst alto', 'status bom', 'muito forte'],
        words: ['forte'],
        obj: { category: 'bstMin', value: 500 },
        label: 'Total de Status Base (BST) ≥ 500?',
    },
    {
        terms: ['status baixo', 'status baixos', 'bst baixo', 'status ruim'],
        words: ['fraco', 'fraquinho'],
        obj: { category: 'bstMax', value: 350 },
        label: 'Total de Status Base (BST) ≤ 350?',
    },
    {
        terms: ['alta velocidade', 'velocidade', 'mais rapido'],
        words: ['rapido', 'veloz'],
        obj: { category: 'topStatSpeed' },
        label: 'O melhor status é Velocidade?',
    },

    // --- FÍSICO: PESO ---
    {
        terms: ['pesado', 'pesa muito', 'peso alto', 'muito peso'],
        words: ['gordo'],
        obj: { category: 'weightMin', value: 100 },
        label: 'Pesa 100kg ou mais (é pesado)?',
    },
    {
        terms: ['pesa pouco', 'peso baixo', 'levinho'],
        words: ['leve'],
        obj: { category: 'weightMax', value: 10 },
        label: 'Pesa menos de 10kg (é leve)?',
    },

    // --- FÍSICO: ALTURA ---
    // "gigante" before "grande" so the bigger claim wins when both appear.
    {
        terms: ['gigante', 'gigantesco', 'colossal', 'enorme', 'muito grande', 'muito alto'],
        obj: { category: 'heightMin', value: 3 },
        label: 'Tem 3m ou mais (é gigante)?',
    },
    {
        terms: ['tamanho medio', 'medio porte', 'porte medio', 'intermediario'],
        words: ['medio', 'media'],
        obj: { category: 'heightRange', min: 1, max: 2 },
        label: 'Tem entre 1m e 2m (tamanho médio)?',
    },
    {
        terms: ['grandao', 'altao', 'comprido'],
        words: ['grande', 'alto', 'alta'],
        obj: { category: 'heightMin', value: 2 },
        label: 'Tem 2m ou mais (é grande)?',
    },
    {
        terms: ['pequenininho', 'minusculo', 'baixinho', 'pequeno porte'],
        words: ['pequeno', 'pequena', 'baixo', 'baixa', 'miudo'],
        obj: { category: 'heightMax', value: 1 },
        label: 'Tem menos de 1m (é pequeno)?',
    },

    // --- GERAÇÕES & REGIÕES ---
    { terms: ['gen 1', 'gen1', 'geracao 1', 'geracao1', 'kanto', '1a geracao', 'primeira geracao'], obj: { category: 'generation', value: 1 }, label: 'É da 1ª Geração (Kanto)?' },
    { terms: ['gen 2', 'gen2', 'geracao 2', 'geracao2', 'johto', '2a geracao', 'segunda geracao'], obj: { category: 'generation', value: 2 }, label: 'É da 2ª Geração (Johto)?' },
    { terms: ['gen 3', 'gen3', 'geracao 3', 'geracao3', 'hoenn', '3a geracao', 'terceira geracao'], obj: { category: 'generation', value: 3 }, label: 'É da 3ª Geração (Hoenn)?' },
    { terms: ['gen 4', 'gen4', 'geracao 4', 'geracao4', 'sinnoh', '4a geracao', 'quarta geracao'], obj: { category: 'generation', value: 4 }, label: 'É da 4ª Geração (Sinnoh)?' },
    { terms: ['gen 5', 'gen5', 'geracao 5', 'geracao5', 'unova', '5a geracao', 'quinta geracao'], obj: { category: 'generation', value: 5 }, label: 'É da 5ª Geração (Unova)?' },
    { terms: ['gen 6', 'gen6', 'geracao 6', 'geracao6', 'kalos', '6a geracao', 'sexta geracao'], obj: { category: 'generation', value: 6 }, label: 'É da 6ª Geração (Kalos)?' },
    { terms: ['gen 7', 'gen7', 'geracao 7', 'geracao7', 'alola', '7a geracao', 'setima geracao'], obj: { category: 'generation', value: 7 }, label: 'É da 7ª Geração (Alola)?' },
    { terms: ['gen 8', 'gen8', 'geracao 8', 'geracao8', 'galar', '8a geracao', 'oitava geracao'], obj: { category: 'generation', value: 8 }, label: 'É da 8ª Geração (Galar)?' },
    { terms: ['gen 9', 'gen9', 'geracao 9', 'geracao9', 'paldea', '9a geracao', 'nona geracao'], obj: { category: 'generation', value: 9 }, label: 'É da 9ª Geração (Paldea)?' },

    // --- ESPECIAIS & CONCEITOS ---
    { terms: ['lendario', 'mitico', 'legendary', 'mythical'], obj: { category: 'isLegendary' }, label: 'É Lendário ou Mítico?' },
    { terms: ['inicial', 'starter'], obj: { category: 'isStarter' }, label: 'É um Pokémon Inicial?' },
    { terms: ['fossil', 'prehistorico', 'dinossauro'], obj: { category: 'isFossil' }, label: 'É um Fóssil Pré-Histórico?' },
    { terms: ['pikaclone', 'clone do pikachu', 'rato eletrico'], obj: { category: 'isPikaclone' }, label: 'É um Pikaclone?' },
    { terms: ['comida', 'comestivel', 'sobremesa'], words: ['doce', 'fruta', 'bolo'], obj: { category: 'isFoodBased' }, label: 'É baseado em Comida?' },
    { terms: ['animal real', 'parece um animal', 'bicho', 'fauna'], words: ['animal'], obj: { category: 'isRealAnimal' }, label: 'É parecido com um Animal Real?' },
    { terms: ['objeto', 'ferramenta', 'utensilio', 'maquina'], words: ['item', 'coisa'], obj: { category: 'isObjectBased' }, label: 'É baseado em Objeto ou Utensílio?' },

    // --- PESSOAL & FAVORITOS ---
    {
        terms: ['favorito', 'favoritos', 'meu xodo', 'xodo', 'eu gosto', 'gosto dele', 'amo ele', 'amo esse', 'adoro ele', 'adoro esse', 'curto ele'],
        words: ['amo', 'adoro', 'curto'],
        obj: { category: 'isUserFavorite' },
        label: 'Está na minha lista de Favoritos?',
    },
];

const matchesIntent = (text, tokens, intent) => {
    if (intent.terms && hasAny(text, intent.terms)) return true;
    if (intent.words && intent.words.some((word) => tokens.includes(word))) return true;
    return false;
};

/**
 * Parse a free-text question typed by the user into an evaluable question object.
 *
 * Returns `null` when nothing matched. Callers MUST treat null as "I did not
 * understand" and ask again — submitting an unparsed question used to log it as
 * `custom`, which the evaluator answered "NÃO", so the board filled with
 * confident wrong answers to questions like "maior que 1m?".
 *
 * @param {string} textInput
 * @returns {{ obj: object, label: string } | null}
 */
export const parseFreeTextQuestion = (textInput) => {
    if (!textInput || typeof textInput !== 'string') return null;

    const norm = normalizeQuestionText(textInput);
    if (!norm) return null;
    const tokens = norm.split(' ');

    // Explicit measurements win over every fuzzy bucket: "mais de 1,5m" is a
    // precise ask and must not be swallowed by the "grande" heuristic.
    const kilos = parseMeasure(norm, 'kg|quilos?|kilos?');
    if (kilos !== null) {
        return hasAny(norm, SMALLER_TERMS)
            ? { obj: { category: 'weightMax', value: kilos }, label: `Pesa menos de ${formatKilos(kilos)}?` }
            : { obj: { category: 'weightMin', value: kilos }, label: `Pesa ${formatKilos(kilos)} ou mais?` };
    }

    const centimeters = parseMeasure(norm, 'cm|centimetros?');
    const meters = centimeters !== null ? centimeters / 100 : parseMeasure(norm, 'm|metros?');
    if (meters !== null) {
        return hasAny(norm, SMALLER_TERMS)
            ? { obj: { category: 'heightMax', value: meters }, label: `Tem menos de ${formatMeters(meters)} de altura?` }
            : { obj: { category: 'heightMin', value: meters }, label: `Tem ${formatMeters(meters)} ou mais de altura?` };
    }

    // Explicit BST threshold: "bst maior que 500", "status acima de 450".
    if (hasAny(norm, ['bst', 'status', 'stats'])) {
        const bstMatch = norm.match(/\b(\d{3})\b/);
        if (bstMatch) {
            const threshold = Number(bstMatch[1]);
            return hasAny(norm, SMALLER_TERMS)
                ? { obj: { category: 'bstMax', value: threshold }, label: `Total de Status Base (BST) ≤ ${threshold}?` }
                : { obj: { category: 'bstMin', value: threshold }, label: `Total de Status Base (BST) ≥ ${threshold}?` };
        }
    }

    // Generation with the number on either side — people type both "gen 3" and
    // "3 gen" / "3a geracao", and the word order should not decide whether it works.
    const genMatch = norm.match(/\bgen(?:eration|eracao)?\s*([1-9])\b/)
        || norm.match(/\b([1-9])\s*a?\s*(?:gen|geracao|generation)\b/);
    if (genMatch) {
        const genNumber = Number(genMatch[1]);
        return { obj: { category: 'generation', value: genNumber }, label: `É da ${genNumber}ª Geração?` };
    }

    const intent = QUESTION_INTENTS.find((candidate) => matchesIntent(norm, tokens, candidate));
    if (!intent) return null;

    return { obj: { ...intent.obj }, label: intent.label };
};

/**
 * Stable identity for a question, used to tell "already asked" from "similar".
 *
 * The category alone is NOT the identity: `generation 2` and `generation 5` are
 * different questions, as are `heightMin 1` and `heightMin 2`. Comparing on
 * category only made the first question of a family block all the others.
 *
 * `invert` is deliberately excluded — "tem 2 tipos?" and "é monotipo?" are the
 * same attribute read in opposite directions, so asking one really does answer
 * the other and the pair should collapse to one key.
 */
export const buildQuestionKey = (question) => {
    if (!question?.category) return '';

    const parts = [question.category];
    if (question.value !== undefined && question.value !== null) parts.push(`v=${question.value}`);
    if (question.min !== undefined && question.min !== null) parts.push(`min=${question.min}`);
    if (question.max !== undefined && question.max !== null) parts.push(`max=${question.max}`);

    return parts.join('|');
};

/** Suggestions shown when a typed question could not be understood. */
export const QUESTION_EXAMPLES = Object.freeze([
    'É do tipo fogo?',
    'Tem mais de 1m?',
    'É pequeno?',
    'É lendário?',
    'É da geração 1?',
    'É pesado?',
    'É um inicial?',
    'É rápido?',
]);
