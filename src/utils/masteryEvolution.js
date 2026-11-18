/**
 * Mastery Evolution Line (2026-11-18, Peça 04 — "Dossiê Vivo no Perfil"):
 * maps the trainer's level and XP (utils/trainerLevel.js) onto a three-stage
 * franchise evolution line. Unreached stages stand in silhouette ("Quem é
 * esse?"), the active stage carries progress toward the next evolution, and
 * reaching the final form at Lv 15+ earns the gold mastery mark.
 *
 * Pure and deterministic: tested in masteryEvolution.test.js.
 */

import { levelForXp, xpForLevel } from './trainerLevel.js';

/** Level thresholds where each evolution stage unlocks: Stage 1 (Lv 1–5), Stage 2 (Lv 6–14), Stage 3 (Lv 15+). */
export const MASTERY_STAGE_LEVELS = Object.freeze([1, 6, 15]);

const DEFAULT_LINE = Object.freeze([
    Object.freeze({ id: 92, name: 'Gastly', type: 'ghost' }),
    Object.freeze({ id: 93, name: 'Haunter', type: 'ghost' }),
    Object.freeze({ id: 94, name: 'Gengar', type: 'ghost' }),
]);

/** Curated 3-stage franchise evolution trios so a trainer's chosen partner evolves with them. */
export const MASTERY_LINES = Object.freeze([
    DEFAULT_LINE,
    Object.freeze([
        Object.freeze({ id: 443, name: 'Gible', type: 'dragon' }),
        Object.freeze({ id: 444, name: 'Gabite', type: 'dragon' }),
        Object.freeze({ id: 445, name: 'Garchomp', type: 'dragon' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 63, name: 'Abra', type: 'psychic' }),
        Object.freeze({ id: 64, name: 'Kadabra', type: 'psychic' }),
        Object.freeze({ id: 65, name: 'Alakazam', type: 'psychic' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 1, name: 'Bulbasaur', type: 'grass' }),
        Object.freeze({ id: 2, name: 'Ivysaur', type: 'grass' }),
        Object.freeze({ id: 3, name: 'Venusaur', type: 'grass' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 4, name: 'Charmander', type: 'fire' }),
        Object.freeze({ id: 5, name: 'Charmeleon', type: 'fire' }),
        Object.freeze({ id: 6, name: 'Charizard', type: 'fire' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 7, name: 'Squirtle', type: 'water' }),
        Object.freeze({ id: 8, name: 'Wartortle', type: 'water' }),
        Object.freeze({ id: 9, name: 'Blastoise', type: 'water' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 152, name: 'Chikorita', type: 'grass' }),
        Object.freeze({ id: 153, name: 'Bayleef', type: 'grass' }),
        Object.freeze({ id: 154, name: 'Meganium', type: 'grass' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 155, name: 'Cyndaquil', type: 'fire' }),
        Object.freeze({ id: 156, name: 'Quilava', type: 'fire' }),
        Object.freeze({ id: 157, name: 'Typhlosion', type: 'fire' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 158, name: 'Totodile', type: 'water' }),
        Object.freeze({ id: 159, name: 'Croconaw', type: 'water' }),
        Object.freeze({ id: 160, name: 'Feraligatr', type: 'water' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 172, name: 'Pichu', type: 'electric' }),
        Object.freeze({ id: 25, name: 'Pikachu', type: 'electric' }),
        Object.freeze({ id: 26, name: 'Raichu', type: 'electric' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 252, name: 'Treecko', type: 'grass' }),
        Object.freeze({ id: 253, name: 'Grovyle', type: 'grass' }),
        Object.freeze({ id: 254, name: 'Sceptile', type: 'grass' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 255, name: 'Torchic', type: 'fire' }),
        Object.freeze({ id: 256, name: 'Combusken', type: 'fire' }),
        Object.freeze({ id: 257, name: 'Blaziken', type: 'fire' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 258, name: 'Mudkip', type: 'water' }),
        Object.freeze({ id: 259, name: 'Marshtomp', type: 'water' }),
        Object.freeze({ id: 260, name: 'Swampert', type: 'water' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 280, name: 'Ralts', type: 'fairy' }),
        Object.freeze({ id: 281, name: 'Kirlia', type: 'fairy' }),
        Object.freeze({ id: 282, name: 'Gardevoir', type: 'fairy' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 374, name: 'Beldum', type: 'steel' }),
        Object.freeze({ id: 375, name: 'Metang', type: 'steel' }),
        Object.freeze({ id: 376, name: 'Metagross', type: 'steel' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 387, name: 'Turtwig', type: 'grass' }),
        Object.freeze({ id: 388, name: 'Grotle', type: 'grass' }),
        Object.freeze({ id: 389, name: 'Torterra', type: 'grass' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 390, name: 'Chimchar', type: 'fire' }),
        Object.freeze({ id: 391, name: 'Monferno', type: 'fire' }),
        Object.freeze({ id: 392, name: 'Infernape', type: 'fire' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 393, name: 'Piplup', type: 'water' }),
        Object.freeze({ id: 394, name: 'Prinplup', type: 'water' }),
        Object.freeze({ id: 395, name: 'Empoleon', type: 'water' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 147, name: 'Dratini', type: 'dragon' }),
        Object.freeze({ id: 148, name: 'Dragonair', type: 'dragon' }),
        Object.freeze({ id: 149, name: 'Dragonite', type: 'dragon' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 246, name: 'Larvitar', type: 'rock' }),
        Object.freeze({ id: 247, name: 'Pupitar', type: 'rock' }),
        Object.freeze({ id: 248, name: 'Tyranitar', type: 'rock' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 656, name: 'Froakie', type: 'water' }),
        Object.freeze({ id: 657, name: 'Frogadier', type: 'water' }),
        Object.freeze({ id: 658, name: 'Greninja', type: 'water' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 722, name: 'Rowlet', type: 'grass' }),
        Object.freeze({ id: 723, name: 'Dartrix', type: 'grass' }),
        Object.freeze({ id: 724, name: 'Decidueye', type: 'grass' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 885, name: 'Dreepy', type: 'dragon' }),
        Object.freeze({ id: 886, name: 'Drakloak', type: 'dragon' }),
        Object.freeze({ id: 887, name: 'Dragapult', type: 'dragon' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 906, name: 'Sprigatito', type: 'grass' }),
        Object.freeze({ id: 907, name: 'Floragato', type: 'grass' }),
        Object.freeze({ id: 908, name: 'Meowscarada', type: 'grass' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 909, name: 'Fuecoco', type: 'fire' }),
        Object.freeze({ id: 910, name: 'Crocalor', type: 'fire' }),
        Object.freeze({ id: 911, name: 'Skeledirge', type: 'fire' }),
    ]),
    Object.freeze([
        Object.freeze({ id: 957, name: 'Tinkatink', type: 'fairy' }),
        Object.freeze({ id: 958, name: 'Tinkatuff', type: 'fairy' }),
        Object.freeze({ id: 959, name: 'Tinkaton', type: 'fairy' }),
    ]),
]);

const LINE_BY_POKEMON_ID = new Map();
MASTERY_LINES.forEach((line) => {
    line.forEach((entry) => LINE_BY_POKEMON_ID.set(entry.id, line));
});

const PERSONA_DEFAULT_ID = Object.freeze({
    strategist: 445,
    challenger: 65,
    traveler: 25,
    master: 94,
});

/** Picks the trainer's 3-stage line from their partner Pokémon or persona, falling back to Gastly → Haunter → Gengar. */
export function resolveMasteryLine({ partnerId = null, personaId = null } = {}) {
    const numId = Number(partnerId);
    if (Number.isInteger(numId) && LINE_BY_POKEMON_ID.has(numId)) {
        return LINE_BY_POKEMON_ID.get(numId);
    }
    const personaMon = personaId && PERSONA_DEFAULT_ID[personaId];
    if (personaMon && LINE_BY_POKEMON_ID.has(personaMon)) {
        return LINE_BY_POKEMON_ID.get(personaMon);
    }
    return DEFAULT_LINE;
}

/**
 * Computes the 3-stage Mastery Evolution Line for a trainer's XP / level.
 *
 * @param {object} [params]
 * @param {number} [params.xp]
 * @param {number} [params.level]
 * @param {number|null} [params.partnerId]
 * @param {string|null} [params.personaId]
 */
export function buildMasteryEvolution({ xp = 0, level = 1, partnerId = null, personaId = null } = {}) {
    const safeXp = Math.max(0, Math.floor(Number(xp) || 0));
    const safeLevelFloorXp = xpForLevel(Math.max(1, Math.floor(Number(level) || 1)));
    const effectiveXp = Math.max(safeXp, safeLevelFloorXp);
    const derived = levelForXp(effectiveXp);
    const effectiveLevel = derived.level;

    const line = resolveMasteryLine({ partnerId, personaId });
    const activeIndex = effectiveLevel >= MASTERY_STAGE_LEVELS[2]
        ? 2
        : effectiveLevel >= MASTERY_STAGE_LEVELS[1] ? 1 : 0;

    const nextStageLevel = activeIndex < 2 ? MASTERY_STAGE_LEVELS[activeIndex + 1] : null;
    let stageProgressPct = 100;
    let xpToEvolve = 0;

    if (nextStageLevel !== null) {
        const floorXp = xpForLevel(MASTERY_STAGE_LEVELS[activeIndex]);
        const ceilingXp = xpForLevel(nextStageLevel);
        const span = Math.max(1, ceilingXp - floorXp);
        stageProgressPct = Math.min(100, Math.max(0, Math.round(((effectiveXp - floorXp) / span) * 100)));
        xpToEvolve = Math.max(0, ceilingXp - effectiveXp);
    }

    const stages = line.map((mon, idx) => {
        const minLevel = MASTERY_STAGE_LEVELS[idx];
        const maxLevel = idx < 2 ? MASTERY_STAGE_LEVELS[idx + 1] - 1 : null;
        const reached = effectiveLevel >= minLevel;
        const current = idx === activeIndex;
        const completed = idx < 2 ? effectiveLevel >= MASTERY_STAGE_LEVELS[idx + 1] : reached;
        const isNext = idx === activeIndex + 1;
        let progressPct = 0;
        if (completed) progressPct = 100;
        else if (current || isNext) progressPct = stageProgressPct;

        return {
            stage: idx + 1,
            id: mon.id,
            name: mon.name,
            type: mon.type,
            minLevel,
            maxLevel,
            reached,
            current,
            completed,
            isNext,
            progressPct,
        };
    });

    return {
        level: effectiveLevel,
        xp: effectiveXp,
        mastered: effectiveLevel >= MASTERY_STAGE_LEVELS[2],
        nextLevel: nextStageLevel,
        xpToEvolve,
        progressPct: stageProgressPct,
        tone: line[activeIndex].type,
        lineLabel: line.map((m) => m.name).join(' → '),
        stages,
    };
}
