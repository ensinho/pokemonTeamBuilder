/**
 * Level 50 competitive EV bench & Speed tier benchmark math for the Pokédex
 * tactical instrument (Gen 9 mainline formula, IV = 31, 510 total EV ceiling).
 *
 * Pure and Node-safe: all sprites resolve through `pokemonSprites.js`
 * (`assetHost.js` mirror-aware), and EV edits clamp instead of rejecting
 * (`docs/wounds.md` 2026-09-21, `/ux` §4).
 */

import { NATURE_MODIFIERS, natureMultiplier } from './damageCalc';
import { EV_MAX_PER_STAT, EV_TOTAL_BUDGET } from './evBudget';
import { getPokemonFrontSpriteUrl } from './pokemonSprites';
import { STAT_KEYS, STAT_SHOWDOWN_LABEL, toStatKey } from './statKeys';
import { looksLikeStatPoints, statPointSpreadToEvs } from './statPoints';

export { EV_MAX_PER_STAT, EV_TOTAL_BUDGET, STAT_KEYS, STAT_SHOWDOWN_LABEL };

export const BENCH_LEVEL = 50;
export const BENCH_IV = 31;
export const SHEDINJA_ID = 292;
export const EV_PRESETS = [0, 124, 252];
export const EV_STEP = 4;

// Max visual reference for a Level 50 stat bar (e.g. 252+ Chansey/Blissey HP or 252+ Regieleki Spe).
const LV50_BAR_CEILING = 260;

// Speed waterfall track domain [50 .. 230] covers Trick Room anchors (80) past Booster/252+ 135s (205).
const SPEED_TRACK_MIN = 50;
const SPEED_TRACK_MAX = 230;

export const BENCH_NATURES = [
    { id: 'serious', name: 'Serious', plus: null, minus: null },
    { id: 'timid', name: 'Timid', plus: 'speed', minus: 'attack' },
    { id: 'jolly', name: 'Jolly', plus: 'speed', minus: 'special-attack' },
    { id: 'modest', name: 'Modest', plus: 'special-attack', minus: 'attack' },
    { id: 'adamant', name: 'Adamant', plus: 'attack', minus: 'special-attack' },
    { id: 'bold', name: 'Bold', plus: 'defense', minus: 'attack' },
    { id: 'impish', name: 'Impish', plus: 'defense', minus: 'special-attack' },
    { id: 'calm', name: 'Calm', plus: 'special-defense', minus: 'attack' },
    { id: 'careful', name: 'Careful', plus: 'special-defense', minus: 'special-attack' },
    { id: 'naive', name: 'Naive', plus: 'speed', minus: 'special-defense' },
    { id: 'hasty', name: 'Hasty', plus: 'speed', minus: 'defense' },
    { id: 'brave', name: 'Brave', plus: 'attack', minus: 'speed' },
    { id: 'quiet', name: 'Quiet', plus: 'special-attack', minus: 'speed' },
    { id: 'relaxed', name: 'Relaxed', plus: 'defense', minus: 'speed' },
    { id: 'sassy', name: 'Sassy', plus: 'special-defense', minus: 'speed' },
];

/**
 * Five canonical VGC / OU Level 50 speed benchmarks (IV = 31):
 * - Incineroar #727: base 60, 0 EV, Neutral -> 80
 * - Rillaboom  #812: base 85, 0 EV, Neutral -> 105
 * - Urshifu    #892: base 97, 252 EV, Jolly (+Spe) -> 163
 * - Garchomp   #445: base 102, 252 EV, Jolly (+Spe) -> 169
 * - Flutter Mane #987: base 135, 252 EV, Timid (+Spe) -> 205
 */
export const SPEED_BENCHMARKS_LV50 = [
    { id: 727, slug: 'incineroar', name: 'Incineroar', buildTag: '0', speed: 80, type: 'fire' },
    { id: 812, slug: 'rillaboom', name: 'Rillaboom', buildTag: '0', speed: 105, type: 'grass' },
    { id: 892, slug: 'urshifu', name: 'Urshifu', buildTag: '252+', speed: 163, type: 'fighting' },
    { id: 445, slug: 'garchomp', name: 'Garchomp', buildTag: '252+', speed: 169, type: 'dragon' },
    { id: 987, slug: 'flutter-mane', name: 'Flutter Mane', buildTag: '252+', speed: 205, type: 'ghost' },
];

export function formatNatureOption(natureObj, neutralLabel = 'Neutral (Serious)') {
    if (!natureObj || !natureObj.plus || !natureObj.minus) return neutralLabel;
    const plus = STAT_SHOWDOWN_LABEL[natureObj.plus] || natureObj.plus;
    const minus = STAT_SHOWDOWN_LABEL[natureObj.minus] || natureObj.minus;
    return `${natureObj.name} (+${plus} / -${minus})`;
}

export function normalizeBenchNature(rawNature) {
    const key = String(rawNature || '').trim().toLowerCase();
    if (!key || !NATURE_MODIFIERS[key]) return 'serious';
    const mod = NATURE_MODIFIERS[key];
    if (!mod.plus || !mod.minus) return 'serious';
    return key;
}

export const emptyBenchEvs = () =>
    Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));

const toSafeEv = (value) => {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n > 0 ? Math.min(EV_MAX_PER_STAT, n) : 0;
};

export function sumBenchEvs(evs = {}) {
    return STAT_KEYS.reduce((sum, key) => sum + toSafeEv(evs?.[key]), 0);
}

export function remainingBenchEvs(evs = {}) {
    return Math.max(0, EV_TOTAL_BUDGET - sumBenchEvs(evs));
}

/**
 * Clamp a requested EV value for `statKey` into `[0, 252]` and the `510` total
 * EV ceiling. When a request exceeds remaining budget (e.g. clicking `252` on
 * a 3rd stat when two stats already hold `252` -> `6` raw EVs left), it snaps
 * to the largest investable 4-EV multiple (`4` EVs, leaving `2` uninvestable
 * leftover EVs) instead of rejecting the click.
 */
export function clampBenchEv(evs = {}, statKey, requestedValue) {
    if (!STAT_KEYS.includes(statKey)) return 0;
    const req = Math.floor(Number(requestedValue));
    if (!Number.isFinite(req) || req <= 0) return 0;

    const spentElsewhere = STAT_KEYS.reduce(
        (sum, key) => sum + (key === statKey ? 0 : toSafeEv(evs?.[key])),
        0,
    );
    const rawAvailable = Math.max(0, Math.min(EV_MAX_PER_STAT, EV_TOTAL_BUDGET - spentElsewhere));
    if (req <= rawAvailable) {
        return req;
    }
    return Math.floor(rawAvailable / 4) * 4;
}

export function setBenchEv(evs = {}, statKey, requestedValue) {
    const base = { ...emptyBenchEvs(), ...(evs || {}) };
    if (!STAT_KEYS.includes(statKey)) return base;
    return {
        ...base,
        [statKey]: clampBenchEv(base, statKey, requestedValue),
    };
}

export function stepBenchEv(evs = {}, statKey, delta = EV_STEP) {
    const current = toSafeEv(evs?.[statKey]);
    return setBenchEv(evs, statKey, current + delta);
}

/**
 * Exact Gen 9 Level 50 stat calculation (`IV = 31`).
 * Handles Shedinja (`id === 292`) fixed `1` HP rule.
 */
export function calcLv50Stat({
    statKey,
    base,
    ev = 0,
    iv = BENCH_IV,
    nature = 'serious',
    pokemonId = null,
}) {
    const b = Math.max(0, Math.floor(Number(base) || 0));
    if (b <= 0) return 0;
    if (statKey === 'hp' && (Number(pokemonId) === SHEDINJA_ID || b === 1)) {
        return 1;
    }

    const safeIv = Math.max(0, Math.min(31, Math.floor(Number(iv ?? BENCH_IV))));
    const safeEv = toSafeEv(ev);
    const common = Math.floor(((2 * b + safeIv + Math.floor(safeEv / 4)) * BENCH_LEVEL) / 100);

    if (statKey === 'hp') {
        return common + BENCH_LEVEL + 10;
    }

    const normNature = String(nature || 'serious').trim().toLowerCase();
    return Math.floor((common + 5) * natureMultiplier(normNature, statKey));
}

/**
 * Parse a formatted usage spread string (e.g. `"4 HP / 252 Atk / 252 Spe"`)
 * and nature from `useMostUsedBuild` into a legal `{ evs, nature }` bench seed.
 */
export function seedBenchFromBuild(build) {
    const spreadInfo = build?.data?.spread;
    if (!spreadInfo) {
        return { evs: emptyBenchEvs(), nature: 'serious' };
    }

    const nature = normalizeBenchNature(spreadInfo.nature);
    const rawText = String(spreadInfo.evs || '');
    if (!rawText) {
        return { evs: emptyBenchEvs(), nature };
    }

    const parsed = emptyBenchEvs();
    for (const chunk of rawText.split('/')) {
        const match = chunk.trim().match(/^(\d+)\s+([A-Za-z.-]+)$/);
        if (!match) continue;
        const val = Number.parseInt(match[1], 10);
        const key = toStatKey(match[2]);
        if (key && Number.isFinite(val) && val >= 0) {
            parsed[key] = val;
        }
    }

    const normalizedEvs = looksLikeStatPoints(parsed) ? statPointSpreadToEvs(parsed) : parsed;
    const orderedKeys = [...STAT_KEYS].sort((a, b) => (normalizedEvs[b] || 0) - (normalizedEvs[a] || 0));
    let clamped = emptyBenchEvs();
    for (const key of orderedKeys) {
        const snapped = Math.floor(toSafeEv(normalizedEvs[key]) / 4) * 4;
        if (snapped > 0) {
            clamped = setBenchEv(clamped, key, snapped);
        }
    }

    return { evs: clamped, nature };
}

/**
 * Compute all 6 Level 50 stat rows, peak stat highlight (`isPeak`), EV totals,
 * and live Level 50 Speed for a Pokémon.
 */
export function computeStatBench({
    stats = [],
    evs = {},
    nature = 'serious',
    pokemonId = null,
}) {
    const baseByKey = Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));
    for (const entry of stats || []) {
        const key = toStatKey(entry?.name || entry?.stat);
        if (key) baseByKey[key] = Math.max(0, Math.floor(Number(entry.base_stat ?? entry.value) || 0));
    }

    const normNature = String(nature || 'serious').trim().toLowerCase();
    const rawRows = STAT_KEYS.map((key) => {
        const base = baseByKey[key];
        const ev = toSafeEv(evs?.[key]);
        const value = calcLv50Stat({ statKey: key, base, ev, nature: normNature, pokemonId });
        const modifier = key === 'hp' ? 1 : natureMultiplier(normNature, key);
        const pct = Math.max(2, Math.min(100, Math.round((value / LV50_BAR_CEILING) * 100)));
        return {
            key,
            label: STAT_SHOWDOWN_LABEL[key],
            base,
            ev,
            value,
            modifier,
            pct,
        };
    });

    const peakValue = rawRows.length ? Math.max(...rawRows.map((r) => r.value)) : 0;
    const rows = rawRows.map((row) => ({
        ...row,
        isPeak: peakValue > 0 && row.value === peakValue,
    }));

    const spentEvs = sumBenchEvs(evs);
    const remaining = Math.max(0, EV_TOTAL_BUDGET - spentEvs);
    const totalBase = rawRows.reduce((sum, r) => sum + r.base, 0);
    const speed = rows.find((r) => r.key === 'speed')?.value || 0;

    return {
        rows,
        peakValue,
        totalBase,
        spentEvs,
        remainingEvs: remaining,
        speed,
    };
}

const toTrackPct = (speed) => {
    const clamped = Math.max(SPEED_TRACK_MIN, Math.min(SPEED_TRACK_MAX, Number(speed) || SPEED_TRACK_MIN));
    return Math.round(((clamped - SPEED_TRACK_MIN) / (SPEED_TRACK_MAX - SPEED_TRACK_MIN)) * 100);
};

/**
 * Compare a Pokémon's live Level 50 Speed against the 5 canonical VGC/OU
 * speed benchmarks, attaching mirror-safe official front sprites.
 */
export function evaluateSpeedBenchmarks(speed = 0) {
    const currentSpeed = Math.max(0, Math.floor(Number(speed) || 0));
    const trackPct = toTrackPct(currentSpeed);
    const anchors = SPEED_BENCHMARKS_LV50.map((anchor) => {
        const delta = currentSpeed - anchor.speed;
        const outcome = delta > 0 ? 'faster' : delta === 0 ? 'tie' : 'slower';
        return {
            ...anchor,
            sprite: getPokemonFrontSpriteUrl(anchor.id),
            outcome,
            cleared: delta >= 0,
            delta,
            tickPct: toTrackPct(anchor.speed),
        };
    });

    return {
        speed: currentSpeed,
        trackPct,
        clearedCount: anchors.filter((a) => a.cleared).length,
        anchors,
    };
}
