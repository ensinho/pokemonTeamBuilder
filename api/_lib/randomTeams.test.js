import { describe, it, expect } from 'vitest';

import {
    generateRandomTeam, generateRandomTeams, deriveTeamSeeds,
    RANDOM_BATTLE_FORMAT, RandomTeamError,
} from './randomTeams';
import { packTeam, replayBattle } from './battleResolver';

const SEED = [11, 22, 33, 44];

describe('deriveTeamSeeds', () => {
    it('is a pure function of the battle seed', () => {
        expect(deriveTeamSeeds(SEED)).toEqual(deriveTeamSeeds(SEED));
    });

    it('gives each side a different seed', () => {
        const [p1, p2] = deriveTeamSeeds(SEED);
        expect(p1).not.toEqual(p2);
    });

    it('produces seeds the simulator accepts: four 16-bit integers', () => {
        for (const seed of deriveTeamSeeds(SEED, 4)) {
            expect(seed).toHaveLength(4);
            for (const part of seed) {
                expect(Number.isInteger(part)).toBe(true);
                expect(part).toBeGreaterThanOrEqual(0);
                expect(part).toBeLessThan(0x10000);
            }
        }
    });

    it('refuses a seed the sim could not use', () => {
        expect(() => deriveTeamSeeds([1, 2, 3])).toThrow(RandomTeamError);
        expect(() => deriveTeamSeeds(null)).toThrow(/four-part seed/);
    });
});

describe('generateRandomTeam', () => {
    it('deals six Pokémon', () => {
        const { roster } = generateRandomTeam({ format: RANDOM_BATTLE_FORMAT, seed: SEED });
        expect(roster).toHaveLength(6);
    });

    it('is deterministic — the same seed always deals the same team', () => {
        const a = generateRandomTeam({ format: RANDOM_BATTLE_FORMAT, seed: SEED });
        const b = generateRandomTeam({ format: RANDOM_BATTLE_FORMAT, seed: SEED });
        expect(a.showdownText).toBe(b.showdownText);
    });

    it('deals a different team from a different seed', () => {
        const a = generateRandomTeam({ format: RANDOM_BATTLE_FORMAT, seed: SEED });
        const b = generateRandomTeam({ format: RANDOM_BATTLE_FORMAT, seed: [1, 2, 3, 4] });
        expect(a.showdownText).not.toBe(b.showdownText);
    });

    // The level is the balancing mechanism, so a team where every Pokémon is 100
    // would mean the tier scaling silently stopped being applied.
    it('scales levels rather than fixing them', () => {
        const { roster } = generateRandomTeam({ format: RANDOM_BATTLE_FORMAT, seed: SEED });
        for (const mon of roster) {
            expect(mon.level).toBeGreaterThan(0);
            expect(mon.level).toBeLessThanOrEqual(100);
        }
        expect(new Set(roster.map((mon) => mon.level)).size).toBeGreaterThan(1);
    });

    it('reports a National Dex number for every slot, so sprites resolve', () => {
        const { roster } = generateRandomTeam({ format: RANDOM_BATTLE_FORMAT, seed: SEED });
        for (const mon of roster) {
            expect(mon.id).toBeGreaterThan(0);
            expect(mon.name).toBeTruthy();
        }
    });

    // The rolled team goes into the same document a hand-built one does, and the
    // resolver imports it the same way. If this ever diverges, every random
    // battle dies at the first turn with "team could not be parsed".
    it('exports text the resolver can pack', () => {
        const { showdownText } = generateRandomTeam({ format: RANDOM_BATTLE_FORMAT, seed: SEED });
        const packed = packTeam(showdownText, 'Random');
        expect(packed.split(']')).toHaveLength(6);
    });

    it('names the format in the error when it cannot generate', () => {
        expect(() => generateRandomTeam({ format: 'gen9notaformat', seed: SEED }))
            .toThrow(RandomTeamError);
    });
});

describe('generateRandomTeams', () => {
    it('deals both sides from one battle seed, and not the same team twice', () => {
        const teams = generateRandomTeams({ seed: SEED });
        expect(teams.p1.roster).toHaveLength(6);
        expect(teams.p2.roster).toHaveLength(6);
        expect(teams.p1.showdownText).not.toBe(teams.p2.showdownText);
    });

    it('is reproducible from the stored seed alone', () => {
        expect(generateRandomTeams({ seed: SEED })).toEqual(generateRandomTeams({ seed: SEED }));
    });
});

describe('a rolled battle in the simulator', () => {
    it('starts without team preview and asks both players for a move', async () => {
        const teams = generateRandomTeams({ seed: SEED });
        const opening = await replayBattle({
            format: RANDOM_BATTLE_FORMAT,
            seed: SEED,
            teams: { p1: teams.p1.showdownText, p2: teams.p2.showdownText },
            names: { p1: 'A', p2: 'B' },
            choices: [],
        });

        expect(opening.turn).toBe(1);
        expect(opening.awaiting).toEqual({ p1: true, p2: true });
        expect(opening.log.omniscient.some((line) => line.startsWith('|teampreview'))).toBe(false);
    });

    // `Battle#getTeam` returns a supplied team as-is and only generates one when
    // none was given. That is what lets a random battle store its teams — and it
    // is the assumption the whole feature rests on, so it is worth pinning: if a
    // future @pkmn/sim ignored our team and rolled its own, every replay of an
    // in-progress battle would deal a different one.
    it('plays the team we dealt, not one the format generates', async () => {
        const teams = generateRandomTeams({ seed: SEED });
        const opening = await replayBattle({
            format: RANDOM_BATTLE_FORMAT,
            seed: [9, 9, 9, 9],
            teams: { p1: teams.p1.showdownText, p2: teams.p2.showdownText },
            names: { p1: 'A', p2: 'B' },
            choices: [],
        });

        const request = opening.log.p1.filter((line) => line.startsWith('|request|')).pop();
        const mine = JSON.parse(request.slice('|request|'.length)).side.pokemon;
        expect(mine.map((mon) => mon.details.split(',')[0]))
            .toEqual(teams.p1.roster.map((mon) => mon.name));
    });
});
