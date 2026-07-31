import { describe, expect, it } from 'vitest';
import {
    buildQuestionKey,
    evaluateAttributeQuestion,
    getPokemonHeightMeters,
    getPokemonWeightKg,
    normalizeQuestionText,
    parseFreeTextQuestion,
    resolvePokemonGenerationNumber,
} from './pokemonQuestionEvaluator';

// Shaped like the records the PokéRoom stores: index fields plus the physical
// data the room resolves when the secret is drawn (PokéAPI units).
const onix = {
    id: 95,
    name: 'onix',
    types: ['rock', 'ground'],
    generation: 'generation-i',
    height: 88,   // 8.8 m
    weight: 2100, // 210 kg
    evolutionStage: 1,
    evolutionStageCount: 2,
    baseStats: { hp: 35, attack: 45, defense: 160, 'special-attack': 30, 'special-defense': 45, speed: 70 },
};

const joltik = {
    id: 595,
    name: 'joltik',
    types: ['bug', 'electric'],
    generation: 'generation-v',
    height: 1,  // 0.1 m
    weight: 6,  // 0.6 kg
    evolutionStage: 1,
    evolutionStageCount: 2,
    baseStats: { hp: 50, attack: 47, defense: 50, 'special-attack': 57, 'special-defense': 50, speed: 65 },
};

const pikachu = {
    id: 25,
    name: 'pikachu',
    types: ['electric'],
    generation: 'generation-i',
    height: 4,  // 0.4 m
    weight: 60, // 6 kg
    evolutionStage: 2,
    evolutionStageCount: 3,
    baseStats: { hp: 35, attack: 55, defense: 40, 'special-attack': 50, 'special-defense': 50, speed: 90 },
};

describe('normalizeQuestionText', () => {
    // The name normalizer strips spaces, which silently killed every
    // multi-word intent. This one must keep words apart.
    it('keeps word boundaries and decimal separators', () => {
        expect(normalizeQuestionText('Maior que 1,5m?')).toBe('maior que 1,5m');
        expect(normalizeQuestionText('  É  do tipo  FOGO? ')).toBe('e do tipo fogo');
        expect(normalizeQuestionText('duas tipagens')).toBe('duas tipagens');
    });
});

describe('resolvePokemonGenerationNumber', () => {
    it('parses the index "generation-<roman>" strings', () => {
        expect(resolvePokemonGenerationNumber({ id: 1, generation: 'generation-i' })).toBe(1);
        expect(resolvePokemonGenerationNumber({ id: 595, generation: 'generation-v' })).toBe(5);
        expect(resolvePokemonGenerationNumber({ id: 906, generation: 'generation-ix' })).toBe(9);
    });

    it('accepts plain numbers and falls back to the id range', () => {
        expect(resolvePokemonGenerationNumber({ id: 25, generation: 3 })).toBe(3);
        expect(resolvePokemonGenerationNumber({ id: 25 })).toBe(1);
        expect(resolvePokemonGenerationNumber({ id: 700 })).toBe(6);
    });
});

describe('unit helpers', () => {
    it('converts PokéAPI decimetres and hectograms', () => {
        expect(getPokemonHeightMeters(onix)).toBeCloseTo(8.8);
        expect(getPokemonWeightKg(onix)).toBeCloseTo(210);
        expect(getPokemonHeightMeters({})).toBeNull();
        expect(getPokemonWeightKg({})).toBeNull();
    });

    it('prefers explicit human-unit fields when present', () => {
        expect(getPokemonHeightMeters({ heightM: 2.5, height: 999 })).toBe(2.5);
        expect(getPokemonWeightKg({ weightKg: 12, weight: 999 })).toBe(12);
    });
});

describe('parseFreeTextQuestion — the questions that used to answer "NÃO"', () => {
    it('understands an explicit height threshold', () => {
        expect(parseFreeTextQuestion('maior que 1m?')).toMatchObject({
            obj: { category: 'heightMin', value: 1 },
        });
        expect(parseFreeTextQuestion('tem mais de 1,5 metros?')).toMatchObject({
            obj: { category: 'heightMin', value: 1.5 },
        });
        expect(parseFreeTextQuestion('menor que 2m?')).toMatchObject({
            obj: { category: 'heightMax', value: 2 },
        });
        expect(parseFreeTextQuestion('tem menos de 50cm?')).toMatchObject({
            obj: { category: 'heightMax', value: 0.5 },
        });
    });

    it('understands fuzzy size buckets', () => {
        expect(parseFreeTextQuestion('alto?').obj).toEqual({ category: 'heightMin', value: 2 });
        expect(parseFreeTextQuestion('grande?').obj).toEqual({ category: 'heightMin', value: 2 });
        expect(parseFreeTextQuestion('ele eh grande?').obj).toEqual({ category: 'heightMin', value: 2 });
        expect(parseFreeTextQuestion('medio?').obj).toEqual({ category: 'heightRange', min: 1, max: 2 });
        expect(parseFreeTextQuestion('pequeno?').obj).toEqual({ category: 'heightMax', value: 1 });
        expect(parseFreeTextQuestion('é gigante?').obj).toEqual({ category: 'heightMin', value: 3 });
    });

    it('understands weight', () => {
        expect(parseFreeTextQuestion('é pesado?').obj).toEqual({ category: 'weightMin', value: 100 });
        expect(parseFreeTextQuestion('é leve?').obj).toEqual({ category: 'weightMax', value: 10 });
        expect(parseFreeTextQuestion('pesa mais de 50kg?').obj).toEqual({ category: 'weightMin', value: 50 });
    });

    it('does not read "status alto" as a height question', () => {
        expect(parseFreeTextQuestion('status alto?').obj).toEqual({ category: 'bstMin', value: 500 });
        expect(parseFreeTextQuestion('bst maior que 600?').obj).toEqual({ category: 'bstMin', value: 600 });
    });

    it('matches the multi-word intents that the old normalizer flattened', () => {
        expect(parseFreeTextQuestion('tem duas tipagens?').obj).toEqual({ category: 'isDualType' });
        expect(parseFreeTextQuestion('é monotipo?').obj).toEqual({ category: 'isDualType', invert: true });
        expect(parseFreeTextQuestion('é a evolução final?').obj).toEqual({ category: 'isFinalForm' });
        expect(parseFreeTextQuestion('não evolui?').obj).toEqual({ category: 'isSingleStage' });
        expect(parseFreeTextQuestion('é da geração 3?').obj).toEqual({ category: 'generation', value: 3 });
        expect(parseFreeTextQuestion('é de kanto?').obj).toEqual({ category: 'generation', value: 1 });
    });

    it('reads the generation with the number on either side', () => {
        expect(parseFreeTextQuestion('gen 3?').obj).toEqual({ category: 'generation', value: 3 });
        expect(parseFreeTextQuestion('3 gen?').obj).toEqual({ category: 'generation', value: 3 });
        expect(parseFreeTextQuestion('3ª gen?').obj).toEqual({ category: 'generation', value: 3 });
        expect(parseFreeTextQuestion('5 geração?').obj).toEqual({ category: 'generation', value: 5 });
    });

    it('understands a bare (or misspelled) evolution question', () => {
        expect(parseFreeTextQuestion('evolução?').obj).toEqual({ category: 'isEvolved' });
        expect(parseFreeTextQuestion('evolulção?').obj).toEqual({ category: 'isEvolved' });
        expect(parseFreeTextQuestion('ele evoluiu?').obj).toEqual({ category: 'isEvolved' });
        // The specific evolution intents still win over the catch-all stem.
        expect(parseFreeTextQuestion('é a evolução final?').obj).toEqual({ category: 'isFinalForm' });
        expect(parseFreeTextQuestion('não evolui?').obj).toEqual({ category: 'isSingleStage' });
    });

    it('does not fire type intents on innocent substrings', () => {
        // "macaco" contains "aco" (steel); "salto" contains "alto".
        expect(parseFreeTextQuestion('é um macaco?')?.obj).not.toEqual({ category: 'type', value: 'steel' });
    });

    it('returns null when it genuinely does not understand', () => {
        expect(parseFreeTextQuestion('qual a cor dos olhos dele')).toBeNull();
        expect(parseFreeTextQuestion('')).toBeNull();
        expect(parseFreeTextQuestion(null)).toBeNull();
    });
});

describe('buildQuestionKey — "already asked" identity', () => {
    // The regression: keying on category alone meant the first generation
    // question made all eight others look already-asked.
    it('separates each value inside a family', () => {
        const gen2 = buildQuestionKey({ category: 'generation', value: 2 });
        const gen5 = buildQuestionKey({ category: 'generation', value: 5 });
        expect(gen2).not.toBe(gen5);

        expect(buildQuestionKey({ category: 'type', value: 'fire' }))
            .not.toBe(buildQuestionKey({ category: 'type', value: 'water' }));

        expect(buildQuestionKey({ category: 'heightMin', value: 1 }))
            .not.toBe(buildQuestionKey({ category: 'heightMin', value: 2 }));

        expect(buildQuestionKey({ category: 'heightRange', min: 1, max: 2 }))
            .not.toBe(buildQuestionKey({ category: 'heightRange', min: 2, max: 3 }));
    });

    it('matches the same question asked twice', () => {
        expect(buildQuestionKey({ category: 'generation', value: 3 }))
            .toBe(buildQuestionKey({ category: 'generation', value: 3 }));
        expect(buildQuestionKey({ category: 'isLegendary' }))
            .toBe(buildQuestionKey({ category: 'isLegendary' }));
    });

    it('collapses a mirrored pair — the inverse answers the same attribute', () => {
        expect(buildQuestionKey({ category: 'isDualType' }))
            .toBe(buildQuestionKey({ category: 'isDualType', invert: true }));
    });

    it('separates different categories and tolerates junk', () => {
        expect(buildQuestionKey({ category: 'heightMin', value: 2 }))
            .not.toBe(buildQuestionKey({ category: 'weightMin', value: 2 }));
        expect(buildQuestionKey(null)).toBe('');
        expect(buildQuestionKey({})).toBe('');
    });
});

describe('evaluateAttributeQuestion', () => {
    it('answers height questions against real data', () => {
        expect(evaluateAttributeQuestion({ category: 'heightMin', value: 1 }, onix).answer).toBe(true);
        expect(evaluateAttributeQuestion({ category: 'heightMin', value: 1 }, joltik).answer).toBe(false);
        expect(evaluateAttributeQuestion({ category: 'heightMax', value: 1 }, joltik).answer).toBe(true);
        expect(evaluateAttributeQuestion({ category: 'heightRange', min: 1, max: 2 }, onix).answer).toBe(false);
        expect(evaluateAttributeQuestion({ category: 'heightRange', min: 1, max: 2 }, { height: 15 }).answer).toBe(true);
    });

    it('answers weight questions against real data', () => {
        expect(evaluateAttributeQuestion({ category: 'weightMin', value: 100 }, onix).answer).toBe(true);
        expect(evaluateAttributeQuestion({ category: 'weightMax', value: 10 }, joltik).answer).toBe(true);
    });

    it('answers generation questions for index-shaped records', () => {
        // This is the regression: `generation: 'generation-i'` compared against 1.
        expect(evaluateAttributeQuestion({ category: 'generation', value: 1 }, onix).answer).toBe(true);
        expect(evaluateAttributeQuestion({ category: 'generation', value: 5 }, joltik).answer).toBe(true);
        expect(evaluateAttributeQuestion({ category: 'generation', value: 2 }, onix).answer).toBe(false);
        expect(evaluateAttributeQuestion({ category: 'genBefore', value: 3 }, onix).answer).toBe(true);
        expect(evaluateAttributeQuestion({ category: 'genAfter', value: 3 }, joltik).answer).toBe(true);
    });

    it('applies invert for mirrored intents', () => {
        expect(evaluateAttributeQuestion({ category: 'isDualType' }, pikachu).answer).toBe(false);
        expect(evaluateAttributeQuestion({ category: 'isDualType', invert: true }, pikachu).answer).toBe(true);
        expect(evaluateAttributeQuestion({ category: 'isDualType', invert: true }, onix).answer).toBe(false);
    });

    it('reports unknown instead of "no" when the data is missing', () => {
        const noHeight = { id: 25, name: 'pikachu', types: ['electric'] };
        expect(evaluateAttributeQuestion({ category: 'heightMin', value: 1 }, noHeight)).toMatchObject({ unknown: true });
        expect(evaluateAttributeQuestion({ category: 'isFinalForm' }, noHeight)).toMatchObject({ unknown: true });
        expect(evaluateAttributeQuestion({ category: 'custom', value: 'qualquer coisa' }, onix)).toMatchObject({ unknown: true });
        expect(evaluateAttributeQuestion({ category: 'nope' }, onix)).toMatchObject({ unknown: true });
    });

    it('does not invert an unanswerable question', () => {
        const result = evaluateAttributeQuestion({ category: 'heightMin', value: 1, invert: true }, { id: 1 });
        expect(result.unknown).toBe(true);
        expect(result.answer).toBe(false);
    });

    it('resolves evolution stages from the chain metadata', () => {
        expect(evaluateAttributeQuestion({ category: 'isBaseForm' }, onix).answer).toBe(true);
        expect(evaluateAttributeQuestion({ category: 'isFinalForm' }, onix).answer).toBe(false);
        expect(evaluateAttributeQuestion({ category: 'isBaseForm' }, pikachu).answer).toBe(false);
        expect(evaluateAttributeQuestion({ category: 'isSingleStage' }, { evolutionStage: 1, evolutionStageCount: 1 }).answer).toBe(true);
    });

    it('treats "is an evolution" as stage > 1, not as "not a base form"', () => {
        // A single-stage Pokémon is neither a base form nor an evolution — the
        // naive `isBaseForm` inversion would wrongly call it evolved.
        const singleStage = { id: 128, evolutionStage: 1, evolutionStageCount: 1 };
        expect(evaluateAttributeQuestion({ category: 'isEvolved' }, singleStage).answer).toBe(false);
        expect(evaluateAttributeQuestion({ category: 'isBaseForm', invert: true }, singleStage).answer).toBe(true);

        expect(evaluateAttributeQuestion({ category: 'isEvolved' }, pikachu).answer).toBe(true);
        expect(evaluateAttributeQuestion({ category: 'isEvolved' }, onix).answer).toBe(false);
        expect(evaluateAttributeQuestion({ category: 'isEvolved' }, { id: 1 })).toMatchObject({ unknown: true });
    });

    it('answers type and stat questions', () => {
        expect(evaluateAttributeQuestion({ category: 'type', value: 'rock' }, onix).answer).toBe(true);
        expect(evaluateAttributeQuestion({ category: 'type', value: 'fire' }, onix).answer).toBe(false);
        expect(evaluateAttributeQuestion({ category: 'topStatSpeed' }, pikachu).answer).toBe(true);
        expect(evaluateAttributeQuestion({ category: 'topStatSpeed' }, onix).answer).toBe(false);
        expect(evaluateAttributeQuestion({ category: 'isLegendary' }, onix).answer).toBe(false);
    });

    it('handles favorites stored as a Set, array or object map', () => {
        const q = { category: 'isUserFavorite' };
        expect(evaluateAttributeQuestion(q, pikachu, new Set([25, 26])).answer).toBe(true);
        expect(evaluateAttributeQuestion(q, pikachu, [{ id: 25 }]).answer).toBe(true);
        expect(evaluateAttributeQuestion(q, pikachu, { 25: true }).answer).toBe(true);
        expect(evaluateAttributeQuestion(q, pikachu, new Set([1])).answer).toBe(false);
    });
});
