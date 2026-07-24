import { describe, it, expect } from 'vitest';
import { buildTeamThreats } from './teamThreats';

// Minimal factories — only the fields the engine reads.
const mon = (types) => ({ types });
const threat = (id, name, types, usage, winRate) => ({ id, name, types, usage, winRate });

describe('buildTeamThreats', () => {
    it('returns nothing for an empty team or empty meta', () => {
        expect(buildTeamThreats([], [threat(1, 'a', ['fire'], 30, 55)])).toEqual([]);
        expect(buildTeamThreats([mon(['grass'])], [])).toEqual([]);
    });

    it('flags a meta mon whose STAB hits the team super-effectively', () => {
        // Grass team; a Fire threat hits it 2x.
        const out = buildTeamThreats([mon(['grass'])], [threat(6, 'Charizard', ['fire'], 30, 52)]);
        expect(out).toHaveLength(1);
        expect(out[0].id).toBe(6);
        expect(out[0].weakCount).toBe(1);
        expect(out[0].teamSize).toBe(1);
        expect(out[0].worst).toBe(2);
    });

    it('excludes meta mons the team is not weak to', () => {
        // Fire team vs a Grass threat (grass does 0.5x into fire) → not a threat.
        const out = buildTeamThreats([mon(['fire'])], [threat(3, 'Venusaur', ['grass'], 40, 50)]);
        expect(out).toEqual([]);
    });

    it('counts how many members are pressured (weakCount out of teamSize)', () => {
        // Two of three members are weak to Ground (fire, electric); grass resists it.
        const team = [mon(['fire']), mon(['electric']), mon(['grass'])];
        const out = buildTeamThreats(team, [threat(445, 'Garchomp', ['ground'], 30, 51)]);
        expect(out[0].weakCount).toBe(2);
        expect(out[0].teamSize).toBe(3);
    });

    it('ranks a higher-usage / higher-win-rate threat above a marginal one', () => {
        const team = [mon(['grass'])];
        const strong = threat(6, 'Charizard', ['fire'], 35, 56);   // popular + winning
        const weak = threat(999, 'Rando', ['fire'], 2, 44);        // rare + losing
        const out = buildTeamThreats(team, [weak, strong]);
        expect(out[0].id).toBe(6);
        expect(out[1].id).toBe(999);
        expect(out[0].score).toBeGreaterThan(out[1].score);
    });

    it('respects the limit and excludeIds options', () => {
        const team = [mon(['grass'])];
        const meta = [
            threat(1, 'A', ['fire'], 30, 55),
            threat(2, 'B', ['ice'], 28, 53),
            threat(3, 'C', ['poison'], 26, 52),
        ];
        expect(buildTeamThreats(team, meta, { limit: 2 })).toHaveLength(2);
        const excluded = buildTeamThreats(team, meta, { excludeIds: new Set([1]) });
        expect(excluded.some((x) => x.id === 1)).toBe(false);
    });

    it('treats a missing win-rate as neutral (no crash, still ranks by usage/pressure)', () => {
        const team = [mon(['grass'])];
        const out = buildTeamThreats(team, [threat(6, 'Charizard', ['fire'], 30, undefined)]);
        expect(out).toHaveLength(1);
        expect(out[0].winRate).toBeNull();
        expect(out[0].score).toBeGreaterThan(0);
    });
});
