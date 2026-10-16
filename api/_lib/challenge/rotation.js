import { Dex, PRNG, Teams } from '@pkmn/sim';

import { generateRandomTeam } from '../randomTeams.js';
import { CHAMPIONS, LEVEL } from './constants.js';
import { daysBetween, weekdayOf } from './day.js';
import { poolFor } from './pool.js';
import { hashSeed } from './seed.js';

/**
 * Today's champion team — a pure function of the day.
 *
 * Fixed shape (decided 2026-10-14): **1 ace + 3 frequent + 1 occasional + 1
 * wildcard**. The ace (Garchomp) always closes; the lead is one of the frequent
 * three; the occasional and the wildcard fall somewhere in slots 2–5.
 *
 * ## Why cycles, not "reroll if it matches the last 7 days"
 *
 * The plan's first draft rerolled a day whose lineup matched one of the seven
 * before it. But each of those days was itself possibly rerolled against *its*
 * seven predecessors, so computing one day means computing all of history —
 * O(days since launch) on every cold start. Instead the 40 possible cores
 * (3-of-5 frequent × 1-of-4 occasional) are dealt in shuffled cycles: within a
 * cycle no core repeats, and the first seven of each cycle are kept clear of
 * the last seven of the previous one. That is O(1) per day and makes a repeat
 * inside any seven-day window impossible by construction. The wildcard, drawn
 * from hundreds of species, only adds variety on top.
 */

/** Day zero of the cycles. Any fixed date works; changing it reshuffles history. */
const EPOCH = '2026-10-12';
const NO_REPEAT_DAYS = 7;

/** Weekday → difficulty: Mon/Tue DP, Wed/Thu Platinum, Fri/Sat Rematch, Sun World. */
const DIFFICULTY_BY_WEEKDAY = ['world', 'dp', 'dp', 'platinum', 'platinum', 'rematch', 'rematch'];

export const DIFFICULTIES = ['dp', 'platinum', 'rematch', 'world'];

export const difficultyFor = (dayKey) => DIFFICULTY_BY_WEEKDAY[weekdayOf(dayKey)];

const combinations = (items, k) => {
    if (k === 0) return [[]];
    if (items.length < k) return [];
    const [head, ...rest] = items;
    return [
        ...combinations(rest, k - 1).map((combo) => [head, ...combo]),
        ...combinations(rest, k),
    ];
};

const shuffled = (items, prng) => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
        const j = prng.random(i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
};

const coresCache = new Map();
/** Every legal core (frequent trio + one occasional) for a champion, in a fixed order. */
const coresFor = (championId) => {
    if (!coresCache.has(championId)) {
        const pool = poolFor(championId);
        const frequent = pool.filter((entry) => entry.tier === 'frequent').map((entry) => entry.species);
        const occasional = pool.filter((entry) => entry.tier === 'occasional').map((entry) => entry.species);
        const cores = [];
        for (const trio of combinations(frequent, 3)) {
            for (const extra of occasional) cores.push({ frequent: trio, occasional: extra, key: [...trio, extra].join('+') });
        }
        coresCache.set(championId, cores);
    }
    return coresCache.get(championId);
};

const rawCycle = (championId, cycle) => shuffled(coresFor(championId), new PRNG(hashSeed('champion-cycle', championId, cycle)));

const cycleCache = new Map();
/**
 * The order cores are dealt in during one cycle. Only the first seven are ever
 * moved (swapped with the middle), so a cycle's last seven are its raw last
 * seven — which is what lets the next cycle check against them without
 * recursing into earlier history.
 */
const cycleOrder = (championId, cycle) => {
    const cacheKey = `${championId}:${cycle}`;
    if (cycleCache.has(cacheKey)) return cycleCache.get(cacheKey);
    const order = rawCycle(championId, cycle);
    if (order.length >= NO_REPEAT_DAYS * 3) {
        const previousTail = new Set(rawCycle(championId, cycle - 1).slice(-NO_REPEAT_DAYS).map((core) => core.key));
        for (let i = 0; i < NO_REPEAT_DAYS; i += 1) {
            if (!previousTail.has(order[i].key)) continue;
            for (let j = NO_REPEAT_DAYS; j < order.length - NO_REPEAT_DAYS; j += 1) {
                if (!previousTail.has(order[j].key)) {
                    [order[i], order[j]] = [order[j], order[i]];
                    break;
                }
            }
        }
    }
    if (cycleCache.size > 64) cycleCache.clear();
    cycleCache.set(cacheKey, order);
    return order;
};

/** The day's frequent trio and occasional. */
export const coreFor = (dayKey, championId) => {
    const cores = coresFor(championId);
    const index = daysBetween(EPOCH, dayKey);
    const cycle = Math.floor(index / cores.length);
    const position = index - cycle * cores.length;
    return cycleOrder(championId, cycle)[position];
};

const speciesOf = (name) => Dex.species.get(name);

const isWildcardCandidate = (species, poolSpecies) => species.exists
    && !species.nfe
    && !poolSpecies.has(speciesOf(species.baseSpecies).id)
    && !species.tags.includes('Restricted Legendary')
    && !species.tags.includes('Mythical');

/** No type on three or more members, and the wildcard shares at most one type with the rest. */
const typesFit = (wildcardTypes, otherTypeLists) => {
    const others = new Set(otherTypeLists.flat());
    if (wildcardTypes.filter((type) => others.has(type)).length > 1) return false;
    const counts = new Map();
    for (const type of [...otherTypeLists.flat(), ...wildcardTypes]) counts.set(type, (counts.get(type) || 0) + 1);
    return [...counts.values()].every((count) => count < 3);
};

const wildcardCache = new Map();
/**
 * The day's surprise: one competitive set from Showdown's random-battle
 * generator (`randomTeams.js`), rerolled with the next seed until it fits.
 *
 * @param {string} dayKey
 * @param {string[]} teamSpecies the five fixed members, to check types against
 * @returns {{species: string, dexNum: number, showdownText: string}}
 */
export const wildcardFor = (dayKey, championId, teamSpecies) => {
    const cacheKey = `${championId}:${dayKey}`;
    if (wildcardCache.has(cacheKey)) return wildcardCache.get(cacheKey);

    const poolSpecies = new Set(poolFor(championId).map((entry) => speciesOf(entry.species).id));
    const otherTypes = teamSpecies.map((name) => speciesOf(name).types);
    for (let attempt = 0; attempt < 50; attempt += 1) {
        const { showdownText } = generateRandomTeam({ seed: hashSeed('wildcard', championId, dayKey, attempt) });
        for (const set of Teams.import(showdownText)) {
            const species = speciesOf(set.species);
            if (!isWildcardCandidate(species, poolSpecies) || !typesFit(species.types, otherTypes)) continue;
            set.level = LEVEL;
            const result = { species: species.name, dexNum: species.num, showdownText: Teams.export([set]).trim() };
            if (wildcardCache.size > 32) wildcardCache.clear();
            wildcardCache.set(cacheKey, result);
            return result;
        }
    }
    throw new Error(`No wildcard fits ${dayKey}.`);
};

/**
 * The six, in the order they are sent out.
 *
 * @returns {Array<{species: string, dexNum: number, tier: string, variantKey: string, wildcard?: true}>}
 */
export const championLineupFor = (dayKey, championId = 'cynthia') => {
    const pool = poolFor(championId);
    const byName = new Map(pool.map((entry) => [entry.species, entry]));
    const difficulty = difficultyFor(dayKey);
    const core = coreFor(dayKey, championId);
    const prng = new PRNG(hashSeed('champion', championId, dayKey));

    // Lead: weighted among the frequent trio (Spiritomb weighs most, as in DPPt).
    const weights = core.frequent.map((name) => Math.max(1, byName.get(name).leadWeight));
    let roll = prng.random(weights.reduce((sum, w) => sum + w, 0));
    let leadIndex = 0;
    while (roll >= weights[leadIndex]) {
        roll -= weights[leadIndex];
        leadIndex += 1;
    }
    const lead = core.frequent[leadIndex];
    const ace = pool.find((entry) => entry.tier === 'core').species;

    const fixed = [lead, ...core.frequent.filter((name) => name !== lead), core.occasional, ace];
    const wildcard = wildcardFor(dayKey, championId, fixed);
    const middle = shuffled([...core.frequent.filter((name) => name !== lead), core.occasional, '?wildcard'], prng);

    return [lead, ...middle, ace].map((name) => {
        if (name === '?wildcard') {
            return { species: wildcard.species, dexNum: wildcard.dexNum, tier: 'wildcard', variantKey: 'random', wildcard: true };
        }
        const entry = byName.get(name);
        return { species: entry.species, dexNum: entry.dexNum, tier: entry.tier, variantKey: difficulty };
    });
};

/** The champion's team as Showdown text, every member at the challenge level. */
export const championTeamTextFor = (dayKey, championId = 'cynthia') => {
    const pool = poolFor(championId);
    const byName = new Map(pool.map((entry) => [entry.species, entry]));
    const lineup = championLineupFor(dayKey, championId);
    const fixedSpecies = lineup.filter((mon) => !mon.wildcard).map((mon) => mon.species);
    return lineup.map((mon) => (mon.wildcard
        ? wildcardFor(dayKey, championId, fixedSpecies).showdownText
        : byName.get(mon.species).variants[mon.variantKey].showdownText
    )).join('\n\n');
};

/** What the public day document may show: no sets, and no wildcard species. */
export const publicLineup = (lineup) => lineup.map((mon) => (mon.wildcard
    ? { wildcard: true }
    : { species: mon.species, dexNum: mon.dexNum }));

export const championInfo = (championId) => CHAMPIONS[championId];
