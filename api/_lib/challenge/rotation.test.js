import { describe, it, expect } from 'vitest';
import { Dex, Teams } from '@pkmn/sim';

import { shiftDayKey } from './day.js';
import { BLUE_POOL, CYNTHIA_POOL } from './pool.js';
import {
    aceFor, championLineupFor, championTeamTextFor, difficultyFor, publicLineup, coreFor,
} from './rotation.js';

const START = '2026-10-14';
const DAYS = Array.from({ length: 365 }, (_, i) => shiftDayKey(START, i));
const tierOf = new Map(CYNTHIA_POOL.map((entry) => [entry.species, entry.tier]));
const poolIds = new Set(CYNTHIA_POOL.map((entry) => Dex.species.get(entry.species).id));
const lineups = new Map(DAYS.map((day) => [day, championLineupFor(day)]));

describe('daily champion rotation', () => {
    it('is a pure function of the day', () => {
        expect(championLineupFor(START)).toEqual(championLineupFor(START));
        expect(championTeamTextFor(START)).toBe(championTeamTextFor(START));
        expect(championLineupFor(START)).not.toEqual(championLineupFor(shiftDayKey(START, 1)));
    });

    it('is always 3 frequent + 1 occasional + 1 wildcard + the ace last, six distinct species', () => {
        for (const [day, lineup] of lineups) {
            expect(lineup, day).toHaveLength(6);
            expect(lineup[5].species).toBe('Garchomp');
            expect(lineup[0].tier).toBe('frequent');
            expect(lineup.filter((mon) => mon.tier === 'frequent')).toHaveLength(3);
            expect(lineup.filter((mon) => mon.tier === 'occasional')).toHaveLength(1);
            expect(lineup.filter((mon) => mon.wildcard)).toHaveLength(1);
            expect(new Set(lineup.map((mon) => Dex.species.get(mon.species).baseSpecies)).size).toBe(6);
        }
    });

    it('draws a wildcard that is outside her pool, not restricted or mythical, fully evolved and never the lead', () => {
        for (const lineup of lineups.values()) {
            const wildcard = lineup.find((mon) => mon.wildcard);
            const species = Dex.species.get(wildcard.species);
            expect(poolIds.has(Dex.species.get(species.baseSpecies).id)).toBe(false);
            expect(species.tags).not.toContain('Restricted Legendary');
            expect(species.tags).not.toContain('Mythical');
            expect(species.nfe).toBe(false);
            expect(lineup.indexOf(wildcard)).toBeGreaterThan(0);
            expect(lineup.indexOf(wildcard)).toBeLessThan(5);
            const types = lineup.flatMap((mon) => Dex.species.get(mon.species).types);
            const counts = types.reduce((map, type) => map.set(type, (map.get(type) || 0) + 1), new Map());
            expect(Math.max(...counts.values())).toBeLessThan(3);
        }
    });

    it('never repeats a composition within seven days', () => {
        const key = (lineup) => lineup.map((mon) => mon.species).sort().join('+');
        const coreKey = (day) => coreFor(day, 'cynthia').key;
        for (let i = 0; i < DAYS.length; i += 1) {
            for (let back = 1; back <= 7 && i - back >= 0; back += 1) {
                expect(key(lineups.get(DAYS[i])), `${DAYS[i]} vs ${DAYS[i - back]}`).not.toBe(key(lineups.get(DAYS[i - back])));
                // Stronger: even the familiar members don't repeat in a week.
                expect(coreKey(DAYS[i])).not.toBe(coreKey(DAYS[i - back]));
            }
        }
    });

    it('leads with Spiritomb about as often as its weight says (36% ± 10)', () => {
        const leads = [...lineups.values()].map((lineup) => lineup[0].species);
        const share = leads.filter((name) => name === 'Spiritomb').length / leads.length;
        expect(share).toBeGreaterThan(0.26);
        expect(share).toBeLessThan(0.46);
        for (const name of ['Roserade', 'Togekiss', 'Lucario', 'Milotic']) {
            const other = leads.filter((lead) => lead === name).length / leads.length;
            expect(other, name).toBeGreaterThan(0.06);
            expect(other, name).toBeLessThan(0.26);
        }
    });

    it('sets the difficulty by weekday and uses that variant', () => {
        expect(difficultyFor('2026-10-12')).toBe('dp'); // Monday
        expect(difficultyFor('2026-10-14')).toBe('platinum'); // Wednesday
        expect(difficultyFor('2026-10-16')).toBe('rematch'); // Friday
        expect(difficultyFor('2026-10-18')).toBe('world'); // Sunday
        const sunday = championLineupFor('2026-10-18');
        expect(sunday.filter((mon) => !mon.wildcard).every((mon) => mon.variantKey === 'world')).toBe(true);
    });

    it('builds a level-50 team text that the sim imports, and a public lineup without the wildcard', () => {
        const sets = Teams.import(championTeamTextFor(START));
        expect(sets).toHaveLength(6);
        expect(sets.every((set) => set.level === 50 || set.level === undefined)).toBe(true);
        expect(sets.every((set) => set.moves.length > 0)).toBe(true);
        const shown = publicLineup(championLineupFor(START));
        expect(shown.filter((mon) => mon.wildcard)).toEqual([{ wildcard: true }]);
        expect(JSON.stringify(shown)).not.toMatch(/moves|item|ability/i);
        expect(tierOf.get(shown[0].species)).toBe('frequent');
    });
});

describe("Blue's rotation", () => {
    const tiers = new Map(BLUE_POOL.map((entry) => [entry.species, entry]));
    const blue = DAYS.map((day) => ({ day, lineup: championLineupFor(day, 'blue') }));

    it("has Cynthia's shape: 3 frequent + 1 occasional + 1 wildcard + a starter as the ace, last", () => {
        for (const { day, lineup } of blue) {
            const count = (tier) => lineup.filter((mon) => mon.tier === tier).length;
            expect([count('frequent'), count('occasional'), count('wildcard'), count('core')]).toEqual([3, 1, 1, 1]);
            expect(lineup[5].species).toBe(aceFor(day, 'blue'));
            expect(['Charizard', 'Blastoise', 'Venusaur']).toContain(lineup[5].species);
            expect(lineup[0].tier).toBe('frequent');
            expect(new Set(lineup.map((mon) => mon.species)).size).toBe(6);
            expect(tiers.has(lineup.find((mon) => mon.wildcard).species)).toBe(false);
        }
    });

    it('brings every starter, and keeps each away from the member its team never has when it can', () => {
        const aces = new Map();
        for (const { lineup } of blue) {
            const ace = lineup[5].species;
            aces.set(ace, (aces.get(ace) || 0) + 1);
            const species = lineup.map((mon) => mon.species);
            const fits = BLUE_POOL.filter((entry) => entry.tier === 'core' && !species.includes(entry.excludes));
            if (fits.length) expect(species).not.toContain(tiers.get(ace).excludes);
        }
        expect([...aces.keys()].sort()).toEqual(['Blastoise', 'Charizard', 'Venusaur']);
        for (const n of aces.values()) expect(n).toBeGreaterThan(60);
    });

    it('leads with Pidgeot most often, and builds a team the sim imports', () => {
        const leads = blue.filter(({ lineup }) => lineup[0].species === 'Pidgeot').length / blue.length;
        expect(leads).toBeGreaterThan(0.2);
        for (const { day } of blue.slice(0, 7)) expect(Teams.import(championTeamTextFor(day, 'blue'))).toHaveLength(6);
    });
});
