import { describe, it, expect } from 'vitest';

import {
    formatHasTierFilter,
    isLegalInTier,
    legalIdsForFormat,
    normalizeTier,
    tierRuleForFormat,
} from './tierLegality';

describe('normalizeTier', () => {
    it('strips the parentheses Showdown uses for "ranked here, not usable below"', () => {
        expect(normalizeTier('(OU)')).toBe('OU');
        expect(normalizeTier('OU')).toBe('OU');
    });

    it('returns null for nothing, rather than a falsy string', () => {
        expect(normalizeTier('')).toBe(null);
        expect(normalizeTier(undefined)).toBe(null);
        expect(normalizeTier(null)).toBe(null);
    });
});

describe('isLegalInTier', () => {
    it('lets a lower tier play up, but not the reverse', () => {
        expect(isLegalInTier('UU', 'OU')).toBe(true);
        expect(isLegalInTier('ZU', 'OU')).toBe(true);
        expect(isLegalInTier('OU', 'UU')).toBe(false);
        expect(isLegalInTier('Uber', 'OU')).toBe(false);
    });

    it('is reflexive', () => {
        for (const t of ['OU', 'UU', 'RU', 'NU', 'PU', 'ZU', 'Uber']) {
            expect(isLegalInTier(t, t)).toBe(true);
        }
    });

    it('places a BL rung above the tier it is banned from', () => {
        // UUBL is banned from UU but perfectly legal in OU.
        expect(isLegalInTier('UUBL', 'OU')).toBe(true);
        expect(isLegalInTier('UUBL', 'UU')).toBe(false);
        expect(isLegalInTier('UUBL', 'RU')).toBe(false);
    });

    it('admits everything into Anything Goes', () => {
        for (const t of ['AG', 'Uber', 'OU', 'ZU', 'LC']) {
            expect(isLegalInTier(t, 'AG')).toBe(true);
        }
    });

    it('treats LC and NFE as membership, not as a rank', () => {
        expect(isLegalInTier('LC', 'LC')).toBe(true);
        expect(isLegalInTier('NFE', 'LC')).toBe(false);
        expect(isLegalInTier('OU', 'LC')).toBe(false);
        expect(isLegalInTier('NFE', 'NFE')).toBe(true);
        expect(isLegalInTier('LC', 'NFE')).toBe(true);
    });

    it('lets an LC species play up the singles ladder', () => {
        expect(isLegalInTier('LC', 'OU')).toBe(true);
        expect(isLegalInTier('LC', 'ZU')).toBe(true);
    });

    it('excludes what cannot be used at all', () => {
        expect(isLegalInTier('Illegal', 'OU')).toBe(false);
        expect(isLegalInTier('Unreleased', 'ZU')).toBe(false);
    });

    it('keeps a species it cannot classify rather than hiding it', () => {
        expect(isLegalInTier(undefined, 'OU')).toBe(true);
        expect(isLegalInTier('SomethingNew', 'OU')).toBe(true);
    });

    it('imposes nothing when there is no target tier', () => {
        expect(isLegalInTier('Uber', null)).toBe(true);
    });

    it('ranks the doubles ladder separately from singles', () => {
        expect(isLegalInTier('DUU', 'DOU')).toBe(true);
        expect(isLegalInTier('DOU', 'DUU')).toBe(false);
        expect(isLegalInTier('DUber', 'DOU')).toBe(false);
    });
});

describe('tierRuleForFormat', () => {
    it('maps the singles ladder', () => {
        expect(tierRuleForFormat('gen9ou')).toEqual({ field: 'tier', tier: 'OU' });
        expect(tierRuleForFormat('gen9zu')).toEqual({ field: 'tier', tier: 'ZU' });
        expect(tierRuleForFormat('gen9ubers')).toEqual({ field: 'tier', tier: 'Uber' });
        expect(tierRuleForFormat('gen9lc')).toEqual({ field: 'tier', tier: 'LC' });
    });

    it('maps past generations the same way', () => {
        expect(tierRuleForFormat('gen1ou')).toEqual({ field: 'tier', tier: 'OU' });
        expect(tierRuleForFormat('gen8ubers')).toEqual({ field: 'tier', tier: 'Uber' });
    });

    it('sends doubles and National Dex to their own fields', () => {
        expect(tierRuleForFormat('gen9doublesou')).toEqual({ field: 'doubles', tier: 'DOU' });
        expect(tierRuleForFormat('gen9nationaldex')).toEqual({ field: 'natdex', tier: 'OU' });
        expect(tierRuleForFormat('gen9nationaldexubers')).toEqual({ field: 'natdex', tier: 'Uber' });
    });

    it('refuses to invent a rule for formats whose legality it cannot describe', () => {
        // These are rule sets, not tier ladders — claiming to filter them would
        // show a roster that is simply wrong.
        for (const id of ['gen9vgc2026regi', 'gen9championsvgc2026regmb', 'gen9monotype', 'gen91v1', 'gen9cap', 'gen9bssregi', 'gen9nationaldexmonotype']) {
            expect(tierRuleForFormat(id)).toBe(null);
            expect(formatHasTierFilter(id)).toBe(false);
        }
    });

    it('returns null for junk', () => {
        expect(tierRuleForFormat('')).toBe(null);
        expect(tierRuleForFormat('nonsense')).toBe(null);
    });
});

describe('legalIdsForFormat', () => {
    const legality = {
        984: { tier: 'OU' },                        // Great Tusk
        645: { tier: 'UU' },                        // Landorus-T (pretend)
        1007: { tier: 'Uber' },                     // Koraidon
        25: { tier: 'ZU' },                         // Pikachu
        1: { tier: 'LC' },                          // Bulbasaur
        999: { tier: 'Illegal' },
        777: { tier: 'UU', doubles: 'DOU' },        // differs by field
    };

    it('includes the target tier and everything below it', () => {
        const ou = legalIdsForFormat(legality, 'gen9ou');
        expect(ou.has(984)).toBe(true);
        expect(ou.has(645)).toBe(true);
        expect(ou.has(25)).toBe(true);
        expect(ou.has(1)).toBe(true);
    });

    it('excludes what is above the tier, and what is unusable', () => {
        const ou = legalIdsForFormat(legality, 'gen9ou');
        expect(ou.has(1007)).toBe(false);
        expect(ou.has(999)).toBe(false);
    });

    it('narrows as the tier drops', () => {
        const uu = legalIdsForFormat(legality, 'gen9uu');
        expect(uu.has(984)).toBe(false);
        expect(uu.has(645)).toBe(true);
    });

    it('reads the doubles field, falling back to the singles tier', () => {
        const dou = legalIdsForFormat(legality, 'gen9doublesou');
        expect(dou.has(777)).toBe(true);   // explicit DOU
        expect(dou.has(984)).toBe(true);   // no doubles entry → falls back, allowed
    });

    it('returns null — "do not filter" — for an untiered format or missing data', () => {
        expect(legalIdsForFormat(legality, 'gen9vgc2026regi')).toBe(null);
        expect(legalIdsForFormat(null, 'gen9ou')).toBe(null);
        expect(legalIdsForFormat({}, 'gen9ou')).toBe(null);
    });
});
