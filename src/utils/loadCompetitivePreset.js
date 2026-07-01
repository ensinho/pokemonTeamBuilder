// Builds the "most competitively used" default set for a freshly added team
// member, so a Pokémon arrives already equipped like the meta runs it (e.g.
// Tyranitar → Tyranitarite, not a stale Assault Vest analysis set).
//
// It merges the precise per-regulation Smogon ladder usage (public/data/usage/*)
// for the "what's used" fields — item, ability, moves, Tera — with the reliable
// standard EV spread from smogon.json (the ladder spreads can be Champions-scale
// or noisy). Falls back to the tournament usage, then the curated Smogon set.

import { primaryMoves } from './smogonSets';

const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};
const url = (file) => `${import.meta.env.BASE_URL || '/'}data/${file}`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

const loadJson = async (file) => {
    try { const r = await fetch(url(file)); if (r.ok) return await r.json(); } catch (_) { /* optional */ }
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
    const smogonSet = smogonById[id]?.sets?.[0] || null;
    if (!usage && !comp && !smogonSet) return null;

    const usedMoves = (usage?.moves || comp?.moves || []).slice(0, 4).map((m) => toSlug(m.name)).filter(Boolean);
    const abilityName = usage?.abilities?.[0]?.name || comp?.abilities?.[0]?.name;
    const teraName = usage?.tera?.[0]?.name || comp?.tera?.[0]?.name || smogonSet?.tera?.[0];

    // EVs: prefer the curated Smogon set's standard 0-252 spread; only use a usage
    // spread if it actually looks like a full investment (Champions spreads don't).
    let evs = smogonSet?.evs || null;
    if (!evs && usage?.spreads?.[0]?.evs) {
        const raw = usage.spreads[0].evs;
        if (Object.values(raw).reduce((a, b) => a + b, 0) >= 100) {
            evs = {};
            for (const [k, v] of Object.entries(raw)) if (EV_MAP[k]) evs[EV_MAP[k]] = v;
        }
    }

    return {
        item: usage?.items?.[0]?.slug || comp?.items?.[0]?.slug || smogonSet?.item || '',
        ability: abilityName ? toSlug(abilityName) : (smogonSet?.ability || undefined),
        nature: usage?.spreads?.[0]?.nature?.toLowerCase() || smogonSet?.nature || undefined,
        teraType: teraName ? teraName.toLowerCase() : undefined,
        moves: usedMoves.length ? usedMoves : (smogonSet ? primaryMoves(smogonSet) : []),
        evs,
    };
}
