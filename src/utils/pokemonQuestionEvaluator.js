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
 * @param {object} question - Question object e.g. { category: 'type', value: 'fire' }
 * @param {object} secretPokemon - Secret Pokemon data object
 * @returns {{ answer: boolean, hint: string }}
 */
export const evaluateAttributeQuestion = (question, secretPokemon, userFavorites = []) => {
    if (!question || !secretPokemon) {
        return { answer: false, hint: 'Dados insuficientes' };
    }

    const { category, value } = question;
    const types = (secretPokemon.types || []).map((t) => t.toLowerCase());
    const id = Number(secretPokemon.id);
    const gen = secretPokemon.generation || getPokemonGeneration(id);
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
        case 'isBaby':
            return { answer: BABY_SPECIES_IDS.has(id) };
        case 'isSingleStage':
            return { answer: Boolean(secretPokemon.isSingleStage) };
        case 'isBaseForm':
            return { answer: Boolean(secretPokemon.isBaseForm) };
        case 'isFinalForm':
            return { answer: Boolean(secretPokemon.isFinalForm) };
        case 'isSingleStage':
            return { answer: Boolean(secretPokemon.isSingleStage) };
        case 'isBaby':
            return { answer: Boolean(secretPokemon.isBaby) };

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
        case 'bstMin':
            return { answer: bst >= Number(value) };
        case 'bstMax':
            return { answer: bst <= Number(value) };
        case 'topStatSpeed': {
            let maxStat = 'hp';
            let maxVal = 0;
            if (typeof stats === 'object' && !Array.isArray(stats)) {
                for (const [k, v] of Object.entries(stats)) {
                    if (v > maxVal) { maxVal = v; maxStat = k; }
                }
            }
            return { answer: maxStat === 'speed' };
        }

        // --- PESSOAL & FAVORITOS ---
        case 'isUserFavorite': {
            const favIds = (userFavorites || []).map((f) => Number(typeof f === 'object' ? f.id : f));
            return { answer: favIds.includes(Number(secretPokemon.id)) };
        }

        default:
            return { answer: false, hint: 'Pergunta não reconhecida' };
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
 * Parse a free-text question typed by the user and detect natural human intents
 */
export const parseFreeTextQuestion = (textInput) => {
    if (!textInput || typeof textInput !== 'string') return null;
    const norm = normalizePokemonQuizInput(textInput);

    // --- TIPAGEM & QUANTIDADE DE TIPOS ---
    if (
        norm.includes('duas tipagens') ||
        norm.includes('dois tipos') ||
        norm.includes('2 tipos') ||
        norm.includes('2 tipagens') ||
        norm.includes('tipo duplo') ||
        norm.includes('dual type') ||
        norm.includes('dupla tipagem') ||
        norm.includes('segundo tipo')
    ) {
        return { obj: { category: 'isDualType' }, label: 'Possui 2 Tipos (Dual Type)?' };
    }

    if (
        norm.includes('um tipo') ||
        norm.includes('1 tipo') ||
        norm.includes('tipo unico') ||
        norm.includes('so 1 tipo') ||
        norm.includes('apenas um tipo') ||
        norm.includes('monotipo')
    ) {
        return { obj: { category: 'isDualType', invert: true }, label: 'Possui apenas 1 Tipo (Monotipo)?' };
    }

    // --- ELEMNTOS / TIPOS ---
    if (norm.includes('fogo') || norm.includes('fire') || norm.includes('chama') || norm.includes('queima'))
        return { obj: { category: 'type', value: 'fire' }, label: 'É do tipo Fogo?' };

    if (norm.includes('agua') || norm.includes('water') || norm.includes('aquatico') || norm.includes('marino'))
        return { obj: { category: 'type', value: 'water' }, label: 'É do tipo Água?' };

    if (norm.includes('planta') || norm.includes('grass') || norm.includes('grama') || norm.includes('folha'))
        return { obj: { category: 'type', value: 'grass' }, label: 'É do tipo Planta?' };

    if (norm.includes('eletric') || norm.includes('raio') || norm.includes('trovao') || norm.includes('choque'))
        return { obj: { category: 'type', value: 'electric' }, label: 'É do tipo Elétrico?' };

    if (norm.includes('dragao') || norm.includes('dragon'))
        return { obj: { category: 'type', value: 'dragon' }, label: 'É do tipo Dragão?' };

    if (norm.includes('fantasma') || norm.includes('ghost') || norm.includes('assombrad') || norm.includes('espirito'))
        return { obj: { category: 'type', value: 'ghost' }, label: 'É do tipo Fantasma?' };

    if (norm.includes('psiquic') || norm.includes('psychic') || norm.includes('mente') || norm.includes('telepat'))
        return { obj: { category: 'type', value: 'psychic' }, label: 'É do tipo Psíquico?' };

    if (norm.includes('gelo') || norm.includes('ice') || norm.includes('neve') || norm.includes('congelad'))
        return { obj: { category: 'type', value: 'ice' }, label: 'É do tipo Gelo?' };

    if (norm.includes('lutador') || norm.includes('fighting') || norm.includes('luta') || norm.includes('artes marciais'))
        return { obj: { category: 'type', value: 'fighting' }, label: 'É do tipo Lutador?' };

    if (norm.includes('veneno') || norm.includes('poison') || norm.includes('toxico'))
        return { obj: { category: 'type', value: 'poison' }, label: 'É do tipo Veneno?' };

    if (norm.includes('terra') || norm.includes('ground') || norm.includes('terrestre'))
        return { obj: { category: 'type', value: 'ground' }, label: 'É do tipo Terrestre?' };

    if (norm.includes('voador') || norm.includes('flying') || norm.includes('asa') || norm.includes('voa'))
        return { obj: { category: 'type', value: 'flying' }, label: 'É do tipo Voador?' };

    if (norm.includes('inseto') || norm.includes('bug') || norm.includes('besouro'))
        return { obj: { category: 'type', value: 'bug' }, label: 'É do tipo Inseto?' };

    if (norm.includes('pedra') || norm.includes('rock') || norm.includes('rocha'))
        return { obj: { category: 'type', value: 'rock' }, label: 'É do tipo Pedra?' };

    if (norm.includes('sombrio') || norm.includes('dark') || norm.includes('noturno') || norm.includes('trevas'))
        return { obj: { category: 'type', value: 'dark' }, label: 'É do tipo Sombrio?' };

    if (norm.includes('aco') || norm.includes('steel') || norm.includes('metal') || norm.includes('ferro'))
        return { obj: { category: 'type', value: 'steel' }, label: 'É do tipo Aço?' };

    if (norm.includes('fada') || norm.includes('fairy') || norm.includes('magico'))
        return { obj: { category: 'type', value: 'fairy' }, label: 'É do tipo Fada?' };

    // --- EVOLUÇÃO & ESTÁGIOS ---
    if (
        norm.includes('nao evolui') ||
        norm.includes('sem evolucao') ||
        norm.includes('estagio unico') ||
        norm.includes('nao tem evolucao')
    ) {
        return { obj: { category: 'isSingleStage' }, label: 'Não possui evolução (Estágio Único)?' };
    }

    if (
        norm.includes('evolucao final') ||
        norm.includes('ultima evolucao') ||
        norm.includes('ultimo estagio') ||
        norm.includes('estagio final') ||
        norm.includes('ja evoluiu') ||
        norm.includes('totalmente evoluido')
    ) {
        return { obj: { category: 'isFinalForm' }, label: 'É a Evolução Final?' };
    }

    if (
        norm.includes('forma base') ||
        norm.includes('primeira evolucao') ||
        norm.includes('1o estagio') ||
        norm.includes('primeiro estagio') ||
        norm.includes('forma inicial')
    ) {
        return { obj: { category: 'isBaseForm' }, label: 'É a Forma Base (1º Estágio)?' };
    }

    if (norm.includes('bebe') || norm.includes('baby') || norm.includes('filhote')) {
        return { obj: { category: 'isBaby' }, label: 'É um Pokémon Bebê?' };
    }

    // --- VELOCIDADE & STATUS ---
    if (
        norm.includes('rapido') ||
        norm.includes('veloz') ||
        norm.includes('velocidade') ||
        norm.includes('alta velocidade')
    ) {
        return { obj: { category: 'topStatSpeed' }, label: 'O melhor status é Velocidade?' };
    }

    if (
        norm.includes('mais de 500') ||
        norm.includes('bst 500') ||
        norm.includes('status alto') ||
        norm.includes('bst maior 500') ||
        norm.includes('forte')
    ) {
        return { obj: { category: 'bstMin', value: 500 }, label: 'Total de Status Base (BST) > 500?' };
    }

    // --- GERAÇÕES & REGIÕES ---
    if (norm.includes('gen1') || norm.includes('geracao 1') || norm.includes('geracao1') || norm.includes('kanto') || norm.includes('1a geracao'))
        return { obj: { category: 'generation', value: 1 }, label: 'É da 1ª Geração (Kanto)?' };

    if (norm.includes('gen2') || norm.includes('geracao 2') || norm.includes('geracao2') || norm.includes('johto') || norm.includes('2a geracao'))
        return { obj: { category: 'generation', value: 2 }, label: 'É da 2ª Geração (Johto)?' };

    if (norm.includes('gen3') || norm.includes('geracao 3') || norm.includes('geracao3') || norm.includes('hoenn') || norm.includes('3a geracao'))
        return { obj: { category: 'generation', value: 3 }, label: 'É da 3ª Geração (Hoenn)?' };

    if (norm.includes('gen4') || norm.includes('geracao 4') || norm.includes('sinnoh'))
        return { obj: { category: 'generation', value: 4 }, label: 'É da 4ª Geração (Sinnoh)?' };

    if (norm.includes('gen5') || norm.includes('geracao 5') || norm.includes('unova'))
        return { obj: { category: 'generation', value: 5 }, label: 'É da 5ª Geração (Unova)?' };

    if (norm.includes('gen6') || norm.includes('geracao 6') || norm.includes('kalos'))
        return { obj: { category: 'generation', value: 6 }, label: 'É da 6ª Geração (Kalos)?' };

    if (norm.includes('gen7') || norm.includes('geracao 7') || norm.includes('alola'))
        return { obj: { category: 'generation', value: 7 }, label: 'É da 7ª Geração (Alola)?' };

    if (norm.includes('gen8') || norm.includes('geracao 8') || norm.includes('galar'))
        return { obj: { category: 'generation', value: 8 }, label: 'É da 8ª Geração (Galar)?' };

    if (norm.includes('gen9') || norm.includes('geracao 9') || norm.includes('paldea'))
        return { obj: { category: 'generation', value: 9 }, label: 'É da 9ª Geração (Paldea)?' };

    // --- ESPECIAIS & CONCEITOS ---
    if (norm.includes('lendario') || norm.includes('mitico') || norm.includes('legendary'))
        return { obj: { category: 'isLegendary' }, label: 'É Lendário ou Mítico?' };

    if (norm.includes('inicial') || norm.includes('starter'))
        return { obj: { category: 'isStarter' }, label: 'É um Pokémon Inicial?' };

    if (norm.includes('comida') || norm.includes('doce') || norm.includes('fruta') || norm.includes('comestivel'))
        return { obj: { category: 'isFoodBased' }, label: 'É baseado em Comida?' };

    if (norm.includes('animal') || norm.includes('bicho') || norm.includes('fauna'))
        return { obj: { category: 'isRealAnimal' }, label: 'É parecido com um Animal Real?' };

    if (norm.includes('objeto') || norm.includes('ferramenta') || norm.includes('item'))
        return { obj: { category: 'isObjectBased' }, label: 'É baseado em Objeto ou Utensílio?' };

    if (norm.includes('favorito') || norm.includes('gosto') || norm.includes('curto'))
        return { obj: { category: 'isUserFavorite' }, label: 'Está na minha lista de Favoritos?' };

    if (norm.includes('fossil') || norm.includes('prehistorico') || norm.includes('dinossauro'))
        return { obj: { category: 'isFossil' }, label: 'É um Fóssil Pré-Histórico?' };

    if (norm.includes('pikaclone') || norm.includes('clone do pikachu') || norm.includes('rato eletrico'))
        return { obj: { category: 'isPikaclone' }, label: 'É um Pikaclone?' };

    return null;
};
