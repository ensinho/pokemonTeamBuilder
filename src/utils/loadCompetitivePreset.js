// Builds the "most competitively used" default set for a freshly added team
// member, so a Pokémon arrives already equipped like the meta runs it (e.g.
// Tyranitar → Tyranitarite, not a stale Assault Vest analysis set).
//
// It takes every field from the precise per-regulation Smogon ladder usage
// (public/data/usage/*) — item, ability, moves, Tera, and the most-used spread
// with its own nature — falling back to the tournament usage, then the curated
// Smogon set. Pokémon Champions spreads arrive in Stat Points (0–32) and are
// converted to the EVs the editor speaks.

import { primaryMoves } from './smogonSets';
import { looksLikeStatPoints, statPointSpreadToEvs } from './statPoints';
import { loadStaticData } from '../services/staticData';

// The same shared request the hooks make (services/staticData.js): adding a
// member must not download smogon.json a second time.
const loadJson = async (file) => {
    try { return await loadStaticData(file); } catch (_) { /* optional */ }
    return null;
};

const cache = new Map();
const loadOnce = async (key, loader) => {
    if (cache.has(key)) return cache.get(key);
    const v = await loader();
    cache.set(key, v);
    return v;
};

const getSmogonById = () => loadOnce('smogon', async () => (await loadJson('smogon.json'))?.byId || {});
const getCompUsageById = () => loadOnce('comp', async () => (await loadJson('competitive-usage.json'))?.byId || {});
const getDefaultUsageById = () => loadOnce('usage', async () => {
    const idx = await loadJson('usage-index.json');
    const fmt = idx?.default;
    if (!fmt) return {};
    return (await loadJson(`usage/${fmt}.json`))?.byId || {};
});

const toSlug = (s = '') => s.toLowerCase().replace(/[’'.]/g, '').replace(/\s+/g, '-');
// usage EV short keys → the customization's full stat keys
const EV_MAP = { hp: 'hp', atk: 'attack', def: 'defense', spa: 'special-attack', spd: 'special-defense', spe: 'speed' };

/**
 * The ladder's most-used spread as `{ evs, nature }` in the editor's keys, or
 * null when it is not usable. Nature and EVs come from the same spread so a
 * preset never pairs one build's nature with another build's investment.
 *
 * Champions spreads are Stat Points and convert exactly. A spread that is
 * neither SP nor a real investment (a near-empty EV line) is ignored.
 */
export function usageSpread(spread) {
    const raw = spread?.evs;
    if (!raw || !Object.keys(raw).length) return null;
    const sp = looksLikeStatPoints(raw);
    if (!sp && Object.values(raw).reduce((a, b) => a + b, 0) < 100) return null;
    const converted = sp ? statPointSpreadToEvs(raw) : raw;
    const evs = {};
    for (const [k, v] of Object.entries(converted)) if (EV_MAP[k]) evs[EV_MAP[k]] = v;
    return { evs, nature: spread.nature ? spread.nature.toLowerCase() : undefined };
}

/**
 * Resolve a customization patch (item / ability / nature / teraType / moves /
 * evs) representing the most-used competitive build for `id`, or null if we have
 * nothing for it.
 */
export async function competitivePresetFor(id) {
    const [smogonById, usageById, compById] = await Promise.all([
        getSmogonById(), getDefaultUsageById(), getCompUsageById(),
    ]);
    const usage = usageById[id] || null;      // precise per-format Smogon usage
    const comp = compById[id] || null;        // tournament poképaste usage
    const smogonSets = smogonById[id]?.sets || [];
    const smogonSet = smogonSets[0] || null;
    // The first curated set that actually publishes a spread.
    const spreadSet = smogonSets.find((s) => s.evs && Object.values(s.evs).some((v) => v > 0)) || null;
    if (!usage && !comp && !smogonSet) return null;

    // Candidates, most used first — more than four, because usage is keyed by base
    // species: Rotom's list holds Rotom-Wash's Hydro Pump, Gyarados's abilities
    // lead with Mega Gyarados's Mold Breaker. createTeamMember keeps the first
    // ones this exact Pokémon can actually have.
    const usedMoves = (usage?.moves || comp?.moves || []).slice(0, 12).map((m) => toSlug(m.name)).filter(Boolean);
    const usedAbilities = (usage?.abilities || comp?.abilities || []).map((a) => toSlug(a.name)).filter(Boolean);
    const abilityName = usage?.abilities?.[0]?.name || comp?.abilities?.[0]?.name;
    const teraName = usage?.tera?.[0]?.name || comp?.tera?.[0]?.name || smogonSet?.tera?.[0];

    const { evs, nature } = usageSpread(usage?.spreads?.[0]) || {
        evs: spreadSet?.evs || null,
        nature: spreadSet?.nature || smogonSet?.nature || undefined,
    };

    return {
        item: usage?.items?.[0]?.slug || comp?.items?.[0]?.slug || smogonSet?.item || '',
        ability: abilityName ? toSlug(abilityName) : (smogonSet?.ability || undefined),
        abilities: [...usedAbilities, smogonSet?.ability].filter(Boolean),
        nature,
        teraType: teraName ? teraName.toLowerCase() : undefined,
        moves: usedMoves.length ? usedMoves : (smogonSet ? primaryMoves(smogonSet) : []),
        evs,
    };
}
