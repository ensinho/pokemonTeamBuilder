/**
 * A Mímica no Diário (2026-11-18, Fase 3 "Fantasminha de Plantão").
 *
 * Every day the mascot imitates one iconic Pokémon in 5 progressive clues
 * built strictly from his own vocabulary:
 *   1. Tone (primary type colour on the mascot)
 *   2. Size (beside a 1.6 m trainer scale figure)
 *   3. Gesture (canon pose + mood from `catalog.js`)
 *   4. Region & habitat (`PixelScene` shifts from daylight route to night)
 *   5. Official artwork silhouette (ONLY revealed on clue 5!)
 *
 * Standing rules:
 * - Lives in the Diário do dia (and accessible from `/games`); the day still
 *   has 4 counted daily games.
 * - Celebrates ONLY on the trainer's fresh solve, never on a reload of an
 *   already-solved day.
 * - Share text uses 5 clue squares and NEVER names the Pokémon (zero spoilers).
 */

export const MIME_STORAGE_KEY = 'ptb:dailyMime';
export const MIME_SYNC_EVENT = 'ptb:daily-mime';
export const MIME_CLUE_COUNT = 5;

let toAccount = null;
export const setMimeToAccount = (push) => { toAccount = push; };
export const TRAINER_HEIGHT_M = 1.6;
export const MIME_EPOCH_DAY = 20740;
/** Coprime with `MIME_POOL.length` (30): `gcd(7, 30) === 1` → full rotation. */
export const MIME_STRIDE = 7;

/**
 * 30 iconic Pokémon with canon Pokédex heights (metres), region/habitat keys,
 * and verified `MOODS` + `POSES` from `src/utils/mascot/catalog.js`.
 */
export const MIME_POOL = Object.freeze([
    {
        id: 4, slug: 'charmander', name: 'Charmander', type: 'fire', height: 0.6,
        generation: 'generation-i', region: 'kanto', habitat: 'mountain',
        gesture: 'tailFlame', mood: 'confiante', pose: 'segurandoChama',
        decoys: [{ id: 37, name: 'Vulpix' }, { id: 58, name: 'Growlithe' }, { id: 155, name: 'Cyndaquil' }],
    },
    {
        id: 1, slug: 'bulbasaur', name: 'Bulbasaur', type: 'grass', height: 0.7,
        generation: 'generation-i', region: 'kanto', habitat: 'grassland',
        gesture: 'sunBulb', mood: 'aliviado', pose: 'comemorando',
        decoys: [{ id: 43, name: 'Oddish' }, { id: 69, name: 'Bellsprout' }, { id: 152, name: 'Chikorita' }],
    },
    {
        id: 7, slug: 'squirtle', name: 'Squirtle', type: 'water', height: 0.5,
        generation: 'generation-i', region: 'kanto', habitat: 'watersEdge',
        gesture: 'shellShield', mood: 'animado', pose: 'segurandoEscudo',
        decoys: [{ id: 60, name: 'Poliwag' }, { id: 116, name: 'Horsea' }, { id: 158, name: 'Totodile' }],
    },
    {
        id: 25, slug: 'pikachu', name: 'Pikachu', type: 'electric', height: 0.4,
        generation: 'generation-i', region: 'kanto', habitat: 'forest',
        gesture: 'cheekSparks', mood: 'empolgado', pose: 'tomadaSolta',
        decoys: [{ id: 26, name: 'Raichu' }, { id: 100, name: 'Voltorb' }, { id: 135, name: 'Jolteon' }],
    },
    {
        id: 39, slug: 'jigglypuff', name: 'Jigglypuff', type: 'fairy', height: 0.5,
        generation: 'generation-i', region: 'kanto', habitat: 'grassland',
        gesture: 'lullaby', mood: 'apaixonado', pose: 'acenando',
        decoys: [{ id: 35, name: 'Clefairy' }, { id: 40, name: 'Wigglytuff' }, { id: 175, name: 'Togepi' }],
    },
    {
        id: 52, slug: 'meowth', name: 'Meowth', type: 'normal', height: 0.4,
        generation: 'generation-i', region: 'kanto', habitat: 'urban',
        gesture: 'shinyCoin', mood: 'travesso', pose: 'segurandoInsignia',
        decoys: [{ id: 19, name: 'Rattata' }, { id: 133, name: 'Eevee' }, { id: 53, name: 'Persian' }],
    },
    {
        id: 54, slug: 'psyduck', name: 'Psyduck', type: 'water', height: 0.8,
        generation: 'generation-i', region: 'kanto', habitat: 'watersEdge',
        gesture: 'headache', mood: 'confuso', pose: 'matutando',
        decoys: [{ id: 79, name: 'Slowpoke' }, { id: 90, name: 'Shellder' }, { id: 120, name: 'Staryu' }],
    },
    {
        id: 63, slug: 'abra', name: 'Abra', type: 'psychic', height: 0.9,
        generation: 'generation-i', region: 'kanto', habitat: 'urban',
        gesture: 'sleepTeleport', mood: 'sonolento', pose: 'dormindo',
        decoys: [{ id: 96, name: 'Drowzee' }, { id: 122, name: 'Mr. Mime' }, { id: 64, name: 'Kadabra' }],
    },
    {
        id: 68, slug: 'machamp', name: 'Machamp', type: 'fighting', height: 1.6,
        generation: 'generation-i', region: 'kanto', habitat: 'mountain',
        gesture: 'fourArms', mood: 'determinado', pose: 'comemorando',
        decoys: [{ id: 57, name: 'Primeape' }, { id: 106, name: 'Hitmonlee' }, { id: 107, name: 'Hitmonchan' }],
    },
    {
        id: 74, slug: 'geodude', name: 'Geodude', type: 'rock', height: 0.4,
        generation: 'generation-i', region: 'kanto', habitat: 'mountain',
        gesture: 'boulderGuard', mood: 'determinado', pose: 'segurandoEscudo',
        decoys: [{ id: 95, name: 'Onix' }, { id: 111, name: 'Rhyhorn' }, { id: 138, name: 'Omanyte' }],
    },
    {
        id: 79, slug: 'slowpoke', name: 'Slowpoke', type: 'water', height: 1.2,
        generation: 'generation-i', region: 'kanto', habitat: 'watersEdge',
        gesture: 'tailFish', mood: 'bocejo', pose: 'esperando',
        decoys: [{ id: 54, name: 'Psyduck' }, { id: 86, name: 'Seel' }, { id: 134, name: 'Vaporeon' }],
    },
    {
        id: 92, slug: 'gastly', name: 'Gastly', type: 'ghost', height: 1.3,
        generation: 'generation-i', region: 'kanto', habitat: 'cave',
        gesture: 'gasOrb', mood: 'travesso', pose: 'shadowBall',
        decoys: [{ id: 93, name: 'Haunter' }, { id: 94, name: 'Gengar' }, { id: 200, name: 'Misdreavus' }],
    },
    {
        id: 94, slug: 'gengar', name: 'Gengar', type: 'ghost', height: 1.5,
        generation: 'generation-i', region: 'kanto', habitat: 'cave',
        gesture: 'shadowGrin', mood: 'desafiador', pose: 'shadowBall',
        decoys: [{ id: 93, name: 'Haunter' }, { id: 92, name: 'Gastly' }, { id: 354, name: 'Banette' }],
    },
    {
        id: 95, slug: 'onix', name: 'Onix', type: 'rock', height: 8.8,
        generation: 'generation-i', region: 'kanto', habitat: 'cave',
        gesture: 'tunnelRoar', mood: 'bravo', pose: 'espiando',
        decoys: [{ id: 76, name: 'Golem' }, { id: 112, name: 'Rhydon' }, { id: 142, name: 'Aerodactyl' }],
    },
    {
        id: 104, slug: 'cubone', name: 'Cubone', type: 'ground', height: 0.4,
        generation: 'generation-i', region: 'kanto', habitat: 'mountain',
        gesture: 'moonCry', mood: 'triste', pose: 'apontando',
        decoys: [{ id: 27, name: 'Sandshrew' }, { id: 50, name: 'Diglett' }, { id: 105, name: 'Marowak' }],
    },
    {
        id: 113, slug: 'chansey', name: 'Chansey', type: 'normal', height: 1.1,
        generation: 'generation-i', region: 'kanto', habitat: 'urban',
        gesture: 'carePouch', mood: 'feliz', pose: 'segurandoPresente',
        decoys: [{ id: 35, name: 'Clefairy' }, { id: 108, name: 'Lickitung' }, { id: 115, name: 'Kangaskhan' }],
    },
    {
        id: 129, slug: 'magikarp', name: 'Magikarp', type: 'water', height: 0.9,
        generation: 'generation-i', region: 'kanto', habitat: 'watersEdge',
        gesture: 'highSplash', mood: 'surpreso', pose: 'pulando',
        decoys: [{ id: 118, name: 'Goldeen' }, { id: 98, name: 'Krabby' }, { id: 349, name: 'Feebas' }],
    },
    {
        id: 131, slug: 'lapras', name: 'Lapras', type: 'water', height: 2.5,
        generation: 'generation-i', region: 'kanto', habitat: 'sea',
        gesture: 'ferrySong', mood: 'aliviado', pose: 'acenando',
        decoys: [{ id: 87, name: 'Dewgong' }, { id: 91, name: 'Cloyster' }, { id: 134, name: 'Vaporeon' }],
    },
    {
        id: 133, slug: 'eevee', name: 'Eevee', type: 'normal', height: 0.3,
        generation: 'generation-i', region: 'kanto', habitat: 'urban',
        gesture: 'manyPaths', mood: 'animado', pose: 'acenando',
        decoys: [{ id: 52, name: 'Meowth' }, { id: 37, name: 'Vulpix' }, { id: 132, name: 'Ditto' }],
    },
    {
        id: 143, slug: 'snorlax', name: 'Snorlax', type: 'normal', height: 2.1,
        generation: 'generation-i', region: 'kanto', habitat: 'mountain',
        gesture: 'roadNap', mood: 'sonolento', pose: 'dormindo',
        decoys: [{ id: 115, name: 'Kangaskhan' }, { id: 128, name: 'Tauros' }, { id: 108, name: 'Lickitung' }],
    },
    {
        id: 149, slug: 'dragonite', name: 'Dragonite', type: 'dragon', height: 2.2,
        generation: 'generation-i', region: 'kanto', habitat: 'sea',
        gesture: 'stormCourier', mood: 'feliz', pose: 'olhandoNuvem',
        decoys: [{ id: 148, name: 'Dragonair' }, { id: 6, name: 'Charizard' }, { id: 142, name: 'Aerodactyl' }],
    },
    {
        id: 150, slug: 'mewtwo', name: 'Mewtwo', type: 'psychic', height: 2.0,
        generation: 'generation-i', region: 'kanto', habitat: 'cave',
        gesture: 'psychicPulse', mood: 'desafiador', pose: 'shadowBall',
        decoys: [{ id: 65, name: 'Alakazam' }, { id: 97, name: 'Hypno' }, { id: 151, name: 'Mew' }],
    },
    {
        id: 151, slug: 'mew', name: 'Mew', type: 'psychic', height: 0.4,
        generation: 'generation-i', region: 'kanto', habitat: 'forest',
        gesture: 'bubbleFloat', mood: 'brilhando', pose: 'pulando',
        decoys: [{ id: 63, name: 'Abra' }, { id: 150, name: 'Mewtwo' }, { id: 251, name: 'Celebi' }],
    },
    {
        id: 37, slug: 'vulpix', name: 'Vulpix', type: 'fire', height: 0.6,
        generation: 'generation-i', region: 'kanto', habitat: 'mountain',
        gesture: 'sixTails', mood: 'gatinho', pose: 'segurandoChama',
        decoys: [{ id: 4, name: 'Charmander' }, { id: 58, name: 'Growlithe' }, { id: 136, name: 'Flareon' }],
    },
    {
        id: 59, slug: 'arcanine', name: 'Arcanine', type: 'fire', height: 1.9,
        generation: 'generation-i', region: 'kanto', habitat: 'grassland',
        gesture: 'windSprint', mood: 'orgulhoso', pose: 'pulando',
        decoys: [{ id: 38, name: 'Ninetales' }, { id: 78, name: 'Rapidash' }, { id: 126, name: 'Magmar' }],
    },
    {
        id: 130, slug: 'gyarados', name: 'Gyarados', type: 'water', height: 6.5,
        generation: 'generation-i', region: 'kanto', habitat: 'sea',
        gesture: 'seaRampage', mood: 'bravo', pose: 'apontando',
        decoys: [{ id: 73, name: 'Tentacruel' }, { id: 131, name: 'Lapras' }, { id: 9, name: 'Blastoise' }],
    },
    {
        id: 197, slug: 'umbreon', name: 'Umbreon', type: 'dark', height: 1.0,
        generation: 'generation-ii', region: 'johto', habitat: 'urban',
        gesture: 'moonRings', mood: 'desconfiado', pose: 'espiando',
        decoys: [{ id: 198, name: 'Murkrow' }, { id: 215, name: 'Sneasel' }, { id: 228, name: 'Houndour' }],
    },
    {
        id: 248, slug: 'tyranitar', name: 'Tyranitar', type: 'rock', height: 2.0,
        generation: 'generation-ii', region: 'johto', habitat: 'mountain',
        gesture: 'armorQuake', mood: 'desafiador', pose: 'segurandoEscudo',
        decoys: [{ id: 208, name: 'Steelix' }, { id: 212, name: 'Scizor' }, { id: 185, name: 'Sudowoodo' }],
    },
    {
        id: 282, slug: 'gardevoir', name: 'Gardevoir', type: 'psychic', height: 1.6,
        generation: 'generation-iii', region: 'hoenn', habitat: 'urban',
        gesture: 'guardianGrace', mood: 'apaixonado', pose: 'acenando',
        decoys: [{ id: 65, name: 'Alakazam' }, { id: 196, name: 'Espeon' }, { id: 359, name: 'Absol' }],
    },
    {
        id: 448, slug: 'lucario', name: 'Lucario', type: 'fighting', height: 1.2,
        generation: 'generation-iv', region: 'sinnoh', habitat: 'mountain',
        gesture: 'auraSphere', mood: 'determinado', pose: 'shadowBall',
        decoys: [{ id: 392, name: 'Infernape' }, { id: 475, name: 'Gallade' }, { id: 454, name: 'Toxicroak' }],
    },
]);

const hash32 = (seed) => {
    let h = (seed >>> 0) || 1;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    return (h ^ (h >>> 16)) >>> 0;
};

/** Pretty-format a slug like `'mr-mime'` → `'Mr. Mime'` or `'bulbasaur'` → `'Bulbasaur'`. */
export function formatMimePokemonName(raw = '') {
    if (!raw) return '';
    if (raw === 'mr-mime') return 'Mr. Mime';
    return String(raw)
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

/** Issue number shown on the card (`Mímica nº 37`). */
export function mimeNumberFor(dayNumber = 0) {
    const safe = Number.isFinite(dayNumber) ? Math.floor(dayNumber) : MIME_EPOCH_DAY;
    return Math.max(1, safe - MIME_EPOCH_DAY + 1);
}

/** Deterministic daily Pokémon using a coprime stride over `MIME_POOL`. */
export function dailyMimeFor(dayNumber = 0) {
    const safe = Math.abs(Number.isFinite(dayNumber) ? Math.floor(dayNumber) : 0);
    const index = (safe * MIME_STRIDE) % MIME_POOL.length;
    const entry = MIME_POOL[index];
    return {
        dayNumber: safe,
        number: mimeNumberFor(safe),
        entry,
    };
}

/**
 * Build the 4 deterministic candidate options (the answer + 3 plausible
 * same-generation / same-type decoys from `pokemon-index.json` when available,
 * falling back cleanly to `entry.decoys`).
 */
export function pickMimeCandidates(entry, pokemonIndex = null, dayNumber = 0) {
    if (!entry) return [];
    const chosenIds = new Set([entry.id]);
    const decoys = [];

    const takeFrom = (pool, salt) => {
        if (!pool.length || decoys.length >= 3) return;
        const start = hash32(dayNumber * 31 + entry.id * 17 + salt) % pool.length;
        for (let step = 0; step < pool.length && decoys.length < 3; step += 1) {
            const candidate = pool[(start + step) % pool.length];
            const id = Number(candidate?.id);
            if (!Number.isInteger(id) || id <= 0 || chosenIds.has(id)) continue;
            chosenIds.add(id);
            decoys.push({
                id,
                name: candidate.displayName || formatMimePokemonName(candidate.name),
            });
        }
    };

    if (Array.isArray(pokemonIndex) && pokemonIndex.length > 0) {
        const baseMons = pokemonIndex.filter(
            (mon) => mon && !mon.isForm && Number.isInteger(mon.id) && mon.id > 0 && mon.id <= 1025 && mon.id !== entry.id
        );
        const sameGenAndType = baseMons.filter(
            (mon) => mon.generation === entry.generation && String(mon.types?.[0] || '').toLowerCase() === entry.type
        );
        const sameTypeClassic = baseMons.filter(
            (mon) => mon.id <= 493 && String(mon.types?.[0] || '').toLowerCase() === entry.type
        );
        const sameGen = baseMons.filter((mon) => mon.generation === entry.generation);

        takeFrom(sameGenAndType, 1);
        takeFrom(sameTypeClassic, 2);
        takeFrom(sameGen, 3);
    }

    if (decoys.length < 3 && Array.isArray(entry.decoys)) {
        for (const fallback of entry.decoys) {
            if (decoys.length >= 3) break;
            if (!chosenIds.has(fallback.id)) {
                chosenIds.add(fallback.id);
                decoys.push({ id: fallback.id, name: fallback.name });
            }
        }
    }

    const all = [{ id: entry.id, name: entry.name }, ...decoys.slice(0, 3)];
    // Deterministic Fisher-Yates shuffle keyed by dayNumber + entry.id
    const ordered = [...all];
    for (let i = ordered.length - 1; i > 0; i -= 1) {
        const j = hash32(dayNumber * 97 + entry.id * 13 + i * 7) % (i + 1);
        const tmp = ordered[i];
        ordered[i] = ordered[j];
        ordered[j] = tmp;
    }
    return ordered;
}

/**
 * Scale geometry comparing a 1.6 m trainer with the Pokémon's canon height,
 * plus the descriptive size band for clue 2.
 */
export function heightScaleMetrics(pokemonHeight, trainerHeight = TRAINER_HEIGHT_M) {
    const h = Number.isFinite(pokemonHeight) && pokemonHeight > 0 ? pokemonHeight : 1.0;
    const maxH = Math.max(trainerHeight, h);
    const trainerPct = Math.max(20, Math.round((trainerHeight / maxH) * 100));
    const pokemonPct = Math.max(18, Math.round((h / maxH) * 100));

    let band = 'waist';
    if (h < 0.55) band = 'tiny';
    else if (h < 1.15) band = 'waist';
    else if (h <= 1.85) band = 'eye';
    else band = 'giant';

    return { trainerPct, pokemonPct, band, heightLabel: h.toFixed(1) };
}

/**
 * Derive visual stage state for a given clue (`1..5`), solve status, and
 * brief wrong-guess reaction.
 *
 * CRITICAL: `showSilhouette` is strictly `clue >= 5 && !solved` — the official
 * artwork silhouette NEVER appears before clue 5!
 */
export function mimeStageState({ entry, clue = 1, solved = false, wrongFlash = false }) {
    const safeClue = Math.max(1, Math.min(MIME_CLUE_COUNT, Math.floor(clue) || 1));
    const sceneKind = safeClue >= 4 || solved ? 'night' : 'morning';
    const mascotTone = entry?.type || 'ghost';

    let mascotMood = 'confiante';
    let mascotPose = 'parado';
    if (wrongFlash) {
        mascotMood = 'triste';
        mascotPose = 'dandoDeOmbros';
    } else if (solved) {
        mascotMood = 'radiante';
        mascotPose = 'comemorando';
    } else if (safeClue >= 3) {
        mascotMood = entry?.mood || 'confiante';
        mascotPose = entry?.pose || 'parado';
    }

    return {
        clue: safeClue,
        sceneKind,
        mascotTone,
        mascotMood,
        mascotPose,
        showRuler: safeClue >= 2 || solved,
        showRegion: safeClue >= 4 || solved,
        showSilhouette: safeClue >= 5 && !solved,
        revealArtwork: Boolean(solved),
    };
}

/** Normalize persisted state for `dayKey` (resets automatically on a new day). */
export function normalizeMimeDayState(raw, dayKey) {
    const v = raw && typeof raw === 'object' ? raw : null;
    if (!v || typeof dayKey !== 'string' || v.dayKey !== dayKey) {
        return {
            v: 1,
            dayKey: String(dayKey || ''),
            clue: 1,
            wrongIds: [],
            solved: false,
            solvedAtClue: null,
            shared: false,
        };
    }
    const clue = Math.max(1, Math.min(MIME_CLUE_COUNT, Math.floor(Number(v.clue) || 1)));
    const wrongIds = Array.isArray(v.wrongIds)
        ? Array.from(new Set(v.wrongIds.filter((id) => Number.isInteger(id) && id > 0))).slice(0, 4)
        : [];
    const solved = v.solved === true;
    const solvedAtClue = solved
        ? Math.max(1, Math.min(MIME_CLUE_COUNT, Math.floor(Number(v.solvedAtClue) || clue)))
        : null;
    return {
        v: 1,
        dayKey,
        clue,
        wrongIds,
        solved,
        solvedAtClue,
        shared: v.shared === true,
    };
}

/** Open the next clue (`1..5`), no-op if already at 5 or solved. */
export function applyMimeNextClue(state) {
    if (!state || state.solved || state.clue >= MIME_CLUE_COUNT) return state;
    return { ...state, clue: state.clue + 1 };
}

/** Apply a candidate guess; returns `{ nextState, outcome: 'won'|'wrong'|'noop' }`. */
export function applyMimeGuess(state, candidateId, answerId) {
    if (!state || state.solved || !Number.isInteger(candidateId)) {
        return { nextState: state, outcome: 'noop' };
    }
    if (state.wrongIds.includes(candidateId)) {
        return { nextState: state, outcome: 'noop' };
    }
    if (candidateId === answerId) {
        return {
            nextState: {
                ...state,
                solved: true,
                solvedAtClue: state.clue,
            },
            outcome: 'won',
        };
    }
    return {
        nextState: {
            ...state,
            wrongIds: [...state.wrongIds, candidateId],
            clue: Math.min(MIME_CLUE_COUNT, state.clue + 1),
        },
        outcome: 'wrong',
    };
}

/** Boolean array of length 5 marking how many clues were used (`1..5`). */
export function mimeClueSquares(usedClues = 1) {
    const used = Math.max(1, Math.min(MIME_CLUE_COUNT, Math.floor(Number(usedClues) || 1)));
    return [0, 1, 2, 3, 4].map((i) => i < used);
}

/** Textual 5-square clue strip for Diário comments (`🟪🟪⬜⬜⬜`, zero spoilers). */
export function formatMimeSquares(usedClues = 1) {
    return mimeClueSquares(usedClues).map((on) => (on ? '🟪' : '⬜')).join('');
}

/** Build the spoiler-free Diário share line (`Mímica nº 37 · na 2ª pista 🟪🟪⬜⬜⬜`). */
export function formatMimeShareLine({ number, clue, t }) {
    const safeClue = Math.max(1, Math.min(MIME_CLUE_COUNT, Math.floor(Number(clue) || 1)));
    const squares = formatMimeSquares(safeClue);
    if (typeof t === 'function') {
        const translated = t('mime.shareFormat', { n: number, clue: safeClue, squares });
        if (translated && translated !== 'mime.shareFormat') return translated;
    }
    return `Mímica nº ${number} · na ${safeClue}ª pista ${squares}`;
}

/**
 * Merge local and account copies of today's Mímica state:
 * - solved in either is solved here (keeping the earliest solvedAtClue)
 * - wrong guesses are a union, and open clue count is at least max(a, b, wrong+1)
 * - shared to Diário in either is shared here
 */
export function mergeMimeDayStates(local, remote, dayKey) {
    const a = normalizeMimeDayState(local, dayKey);
    const b = normalizeMimeDayState(remote, dayKey);
    const wrongIds = Array.from(new Set([...a.wrongIds, ...b.wrongIds])).slice(0, 4);
    const solved = a.solved || b.solved;
    const clue = Math.max(
        a.clue,
        b.clue,
        Math.min(MIME_CLUE_COUNT, wrongIds.length + 1)
    );
    let solvedAtClue = null;
    if (solved) {
        if (a.solved && b.solved) {
            solvedAtClue = Math.min(a.solvedAtClue || a.clue, b.solvedAtClue || b.clue);
        } else {
            solvedAtClue = a.solved ? (a.solvedAtClue || a.clue) : (b.solvedAtClue || b.clue);
        }
    }
    return normalizeMimeDayState({
        v: 1,
        dayKey,
        clue,
        wrongIds,
        solved,
        solvedAtClue,
        shared: a.shared || b.shared,
    }, dayKey);
}

export function readMimeDayState(dayKey, storage = typeof window !== 'undefined' ? window.localStorage : null) {
    try {
        if (!storage) return normalizeMimeDayState(null, dayKey);
        return normalizeMimeDayState(JSON.parse(storage.getItem(MIME_STORAGE_KEY) || 'null'), dayKey);
    } catch {
        return normalizeMimeDayState(null, dayKey);
    }
}

export function writeMimeDayState(
    state,
    storage = typeof window !== 'undefined' ? window.localStorage : null,
    { syncAccount = true } = {}
) {
    const clean = normalizeMimeDayState(state, state?.dayKey || '');
    try {
        if (storage) storage.setItem(MIME_STORAGE_KEY, JSON.stringify(clean));
    } catch { /* private mode */ }
    const isBrowserDefault = typeof window !== 'undefined' && storage === window.localStorage;
    if (isBrowserDefault) {
        window.dispatchEvent(new CustomEvent(MIME_SYNC_EVENT));
        if (syncAccount) {
            Promise.resolve(toAccount?.(clean)).catch(() => {});
        }
    }
    return clean;
}

/** Merge the account's persisted `dailyMime` into local storage without echoing a write back. */
export function applyAccountMime(remote, dayKey, storage = typeof window !== 'undefined' ? window.localStorage : null) {
    const local = readMimeDayState(dayKey, storage);
    const merged = mergeMimeDayStates(local, remote, dayKey);
    if (JSON.stringify(merged) === JSON.stringify(local)) return merged;
    return writeMimeDayState(merged, storage, { syncAccount: false });
}
