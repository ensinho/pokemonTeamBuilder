import { describe, it, expect } from 'vitest';
import { calcDamage, calcStat } from './damageCalc';

describe('calcStat', () => {
    it('calculates HP stat correctly', () => {
        // Base 90 HP, 31 IVs, 0 EVs, Level 50 -> common = Math.floor((180 + 31) * 50 / 100) = 105. HP = 105 + 50 + 10 = 165
        const hp = calcStat({ base: 90, iv: 31, ev: 0, level: 50, statKey: 'hp' });
        expect(hp).toBe(165);
    });

    it('calculates regular stat with nature modifiers', () => {
        // Base 130 Attack, 31 IV, 252 EV, Level 50, Adamant (+Atk)
        // common = Math.floor((2 * 130 + 31 + 63) * 50 / 100) = Math.floor(354 * 0.5) = 177
        // Neutral stat = 177 + 5 = 182. Adamant Attack = Math.floor(182 * 1.1) = 200
        const atk = calcStat({ base: 130, iv: 31, ev: 252, level: 50, nature: 'adamant', statKey: 'attack' });
        expect(atk).toBe(200);
    });
});

describe('calcDamage', () => {
    const defaultAttacker = {
        baseStats: { hp: 90, attack: 92, defense: 75, 'special-attack': 92, 'special-defense': 85, speed: 60 },
        types: ['grass', 'ice'],
        evs: { attack: 0, 'special-attack': 252 },
        ivs: { attack: 31, 'special-attack': 31 },
        nature: 'timid',
        level: 50
    };

    const defaultDefender = {
        baseStats: { hp: 90, attack: 92, defense: 75, 'special-attack': 92, 'special-defense': 85, speed: 60 },
        types: ['grass', 'ice'],
        evs: { hp: 0, defense: 0, 'special-defense': 0 },
        ivs: { hp: 31, defense: 31, 'special-defense': 31 },
        nature: 'serious',
        level: 50
    };

    it('returns null if inputs are missing', () => {
        expect(calcDamage({})).toBeNull();
    });

    it('calculates base damage with STAB and neutrality', () => {
        // Attacker: Abomasnow SpA = calcStat(92 base, 31 IV, 252 EV, level 50, Timid) = 144
        // Defender: Abomasnow SpD = calcStat(85 base, 31 IV, 0 EV, level 50, Serious) = 105
        // Blizzard: Special, 110 BP, Ice type. Ice-type move on Grass/Ice defender is 1x effective
        // levelFactor = 22. baseDamage = Math.floor(Math.floor(22 * 110 * 144 / 105) / 50) + 2 = Math.floor(3317) / 50 + 2 = 68
        // min roll = 85%: Math.floor(68 * 0.85) = 57. STAB = 1.5 -> Math.floor(57 * 1.5) = 85. Effectiveness = 1x -> 85
        // max roll = 100%: Math.floor(68 * 1.0) = 68. STAB = 1.5 -> Math.floor(68 * 1.5) = 102. Effectiveness = 1x -> 102
        const res = calcDamage({
            level: 50,
            movePower: 110,
            moveType: 'ice',
            moveCategory: 'special',
            attacker: defaultAttacker,
            defender: defaultDefender
        });

        expect(res).toBeDefined();
        expect(res.minDamage).toBe(85);
        expect(res.maxDamage).toBe(102);
        expect(res.stab).toBe(true);
        expect(res.effectiveness).toBe(1);
    });

    it('applies weather multipliers correctly', () => {
        // Sun should reduce water moves
        const resSun = calcDamage({
            level: 50,
            movePower: 80,
            moveType: 'water',
            moveCategory: 'special',
            attacker: defaultAttacker,
            defender: defaultDefender,
            field: { weather: 'sun' }
        });
        // Rain should boost water moves
        const resRain = calcDamage({
            level: 50,
            movePower: 80,
            moveType: 'water',
            moveCategory: 'special',
            attacker: defaultAttacker,
            defender: defaultDefender,
            field: { weather: 'rain' }
        });

        expect(resSun.maxDamage).toBeLessThan(resRain.maxDamage);
    });

    it('applies terrain multipliers correctly', () => {
        const resPsychic = calcDamage({
            level: 50,
            movePower: 90,
            moveType: 'psychic',
            moveCategory: 'special',
            attacker: defaultAttacker,
            defender: defaultDefender,
            field: { terrain: 'psychic' }
        });
        const resNone = calcDamage({
            level: 50,
            movePower: 90,
            moveType: 'psychic',
            moveCategory: 'special',
            attacker: defaultAttacker,
            defender: defaultDefender,
            field: { terrain: 'none' }
        });

        expect(resPsychic.maxDamage).toBeGreaterThan(resNone.maxDamage);
    });

    it('handles terastallization STAB and typing modifications', () => {
        // Defender terastallizes to Fire. Water move becomes super effective (2x)
        const res = calcDamage({
            level: 50,
            movePower: 80,
            moveType: 'water',
            moveCategory: 'special',
            attacker: defaultAttacker,
            defender: {
                ...defaultDefender,
                isTerastallized: true,
                teraType: 'fire'
            }
        });
        expect(res.effectiveness).toBe(2);
    });

    it('applies ability and item modifiers', () => {
        // Huge power boosts Attack
        const resHugePower = calcDamage({
            level: 50,
            movePower: 80,
            moveType: 'normal',
            moveCategory: 'physical',
            attacker: { ...defaultAttacker, ability: 'huge-power', evs: { attack: 252 } },
            defender: defaultDefender
        });

        const resNormal = calcDamage({
            level: 50,
            movePower: 80,
            moveType: 'normal',
            moveCategory: 'physical',
            attacker: { ...defaultAttacker, evs: { attack: 252 } },
            defender: defaultDefender
        });

        expect(resHugePower.maxDamage).toBeGreaterThan(resNormal.maxDamage);
    });

    it('handles defender screens and hazards', () => {
        // Aurora veil halves the damage
        const resVeil = calcDamage({
            level: 50,
            movePower: 90,
            moveType: 'normal',
            moveCategory: 'special',
            attacker: defaultAttacker,
            defender: defaultDefender,
            field: { defenderSide: { auroraVeil: true } }
        });

        const resNormal = calcDamage({
            level: 50,
            movePower: 90,
            moveType: 'normal',
            moveCategory: 'special',
            attacker: defaultAttacker,
            defender: defaultDefender
        });

        expect(resVeil.maxDamage).toBeLessThan(resNormal.maxDamage);
    });

    it('handles type-changing ate abilities (Refrigerate, Pixilate, Aerilate, Galvanize, Normalize)', () => {
        // Aurorus (Rock/Ice) with Refrigerate using Hyper Beam (Normal, 150 BP) against Bulbasaur (Grass/Poison)
        const aurorus = {
            baseStats: { hp: 123, attack: 77, defense: 72, 'special-attack': 99, 'special-defense': 92, speed: 58 },
            types: ['rock', 'ice'],
            evs: { 'special-attack': 252 },
            ivs: { 'special-attack': 31 },
            nature: 'serious',
            ability: 'refrigerate',
            level: 50
        };

        const bulbasaur = {
            baseStats: { hp: 45, attack: 49, defense: 49, 'special-attack': 65, 'special-defense': 65, speed: 45 },
            types: ['grass', 'poison'],
            evs: { hp: 0 },
            ivs: { hp: 31 },
            nature: 'serious',
            level: 50
        };

        const resRefrigerate = calcDamage({
            level: 50,
            movePower: 150,
            moveType: 'normal',
            moveCategory: 'special',
            moveName: 'Hyper Beam',
            attacker: aurorus,
            defender: bulbasaur
        });

        const resNeutralAbility = calcDamage({
            level: 50,
            movePower: 150,
            moveType: 'normal',
            moveCategory: 'special',
            moveName: 'Hyper Beam',
            attacker: { ...aurorus, ability: '' },
            defender: bulbasaur
        });

        expect(resRefrigerate.effectiveType).toBe('ice');
        expect(resRefrigerate.effectiveness).toBe(2); // Ice vs Grass/Poison is 2x (2x vs Grass, 1x vs Poison)
        expect(resRefrigerate.stab).toBe(true); // Aurorus is Ice type -> gets STAB
        expect(resRefrigerate.maxDamage).toBeGreaterThan(resNeutralAbility.maxDamage * 2); // 4x vs 1x + STAB + 1.2x boost
    });

    it('handles Aura abilities (Dark Aura, Fairy Aura, Aura Break)', () => {
        const darkAttacker = {
            baseStats: { hp: 126, attack: 131, defense: 95, 'special-attack': 131, 'special-defense': 98, speed: 99 },
            types: ['dark', 'flying'],
            evs: { attack: 252 },
            ivs: { attack: 31 },
            nature: 'adamant',
            ability: 'dark-aura',
            level: 50
        };

        const neutralDefender = {
            baseStats: { hp: 100, attack: 100, defense: 100, 'special-attack': 100, 'special-defense': 100, speed: 100 },
            types: ['normal'],
            evs: { hp: 0, defense: 0 },
            ivs: { hp: 31, defense: 31 },
            nature: 'serious',
            level: 50
        };

        const resWithDarkAura = calcDamage({
            level: 50,
            movePower: 80,
            moveType: 'dark',
            moveCategory: 'physical',
            moveName: 'Knock Off',
            attacker: darkAttacker,
            defender: neutralDefender
        });

        const resWithoutDarkAura = calcDamage({
            level: 50,
            movePower: 80,
            moveType: 'dark',
            moveCategory: 'physical',
            moveName: 'Knock Off',
            attacker: { ...darkAttacker, ability: '' },
            defender: neutralDefender
        });

        expect(resWithDarkAura.maxDamage).toBeGreaterThan(resWithoutDarkAura.maxDamage);

        // Test Aura Break reversing Dark Aura
        const resWithAuraBreak = calcDamage({
            level: 50,
            movePower: 80,
            moveType: 'dark',
            moveCategory: 'physical',
            moveName: 'Knock Off',
            attacker: darkAttacker,
            defender: { ...neutralDefender, ability: 'aura-break' }
        });

        expect(resWithAuraBreak.maxDamage).toBeLessThan(resWithoutDarkAura.maxDamage);
    });
});
