/**
 * Quick look — the facts a trainer needs mid-battle about one Pokémon, move,
 * ability or item, resolved from data the app already ships (battle-dex.json,
 * ability-list.json, item-list.json and the Pokédex index). Pure, so the panel
 * renders on the first frame and the rules are testable.
 *
 * The battle screens turn quick-look mode on (useQuickLookMode); while it is on,
 * the global search opens these entries in QuickLookPanel instead of navigating
 * away from the battle. See docs/modules/components.md → "Quick look in battle".
 */
import { typeChart } from '../constants/typeChart';

export const QUICK_LOOK_KINDS = ['pokemon', 'move', 'ability', 'item'];

/** Showdown's id: lowercase letters and digits only ("Will-O-Wisp" → "willowisp"). */
export const toShowdownId = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const TYPES = Object.keys(typeChart);
const cap = (type) => type.charAt(0).toUpperCase() + type.slice(1);

// Damage tiers, worst first (the same reading as the Pokédex entry).
const DEFENSE_TIERS = [4, 2, 0.5, 0.25, 0];

/**
 * How hard each attacking type hits a Pokémon of `types`, grouped worst first:
 * `[{ multiplier: 4, types: ['ice'] }, …]`. Neutral (1×) is left out.
 */
export function defensesFor(types = []) {
    const defending = types.filter((type) => typeChart[type]);
    if (defending.length === 0) return [];
    const multipliers = Object.fromEntries(TYPES.map((attack) => [
        attack,
        defending.reduce((acc, def) => acc * (typeChart[def].damageTaken[cap(attack)] ?? 1), 1),
    ]));
    return DEFENSE_TIERS
        .map((multiplier) => ({ multiplier, types: TYPES.filter((attack) => multipliers[attack] === multiplier) }))
        .filter((group) => group.types.length > 0);
}

/**
 * What a move of `type` does to each single defending type:
 * `{ strong: [...], weak: [...], none: [...] }` (2×, ½×, 0×).
 */
export function coverageFor(type) {
    const dealt = typeChart[type]?.damageDealt;
    if (!dealt) return { strong: [], weak: [], none: [] };
    const at = (m) => TYPES.filter((def) => (dealt[cap(def)] ?? 1) === m);
    return { strong: at(2), weak: at(0.5), none: at(0) };
}

const STAT_NAMES = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

/** Candidate battle-dex keys for an index entry: the form's api name first. */
const speciesKeys = (entry) => {
    const keys = [entry?.apiName, entry?.name]
        .map(toShowdownId)
        .filter(Boolean);
    // PokéAPI spells a few forms longer than Showdown does ("-female" → "f").
    keys.push(...keys.map((key) => key.replace(/female$/, 'f').replace(/male$/, 'm')));
    return [...new Set(keys)];
};

/**
 * One Pokémon, from its index entry (types, base stats — always there) plus the
 * battle dex (abilities, height, weight — when it knows the species).
 */
export function resolvePokemon(entry, dex) {
    if (!entry?.id) return null;
    const row = speciesKeys(entry).map((key) => dex?.species?.[key]).find(Boolean) || null;
    const [dexName, dexTypes, dexStats, abilities = [], heightm = null, weightkg = null] = row || [];
    const types = entry.types?.length ? entry.types : (dexTypes || []);
    const stats = STAT_NAMES.map((name, index) => ({
        name,
        base_stat: Number(entry.baseStats?.[name] ?? dexStats?.[index] ?? 0),
    }));
    const hasStats = stats.some((stat) => stat.base_stat > 0);
    return {
        kind: 'pokemon',
        id: Number(entry.id),
        name: dexName || String(entry.name || '').replace(/-/g, ' '),
        types,
        stats: hasStats ? stats : [],
        total: hasStats ? stats.reduce((sum, stat) => sum + stat.base_stat, 0) : null,
        abilities,
        heightm,
        weightkg,
        defenses: defensesFor(types),
    };
}

/** One move from the battle dex (`[name, type, category, basePower, accuracy, pp, shortDesc]`). */
export function resolveMove(slug, dex) {
    const row = dex?.moves?.[toShowdownId(slug)];
    if (!row) return null;
    const [name, type, category, basePower, accuracy, pp, shortDesc] = row;
    const damageClass = String(category || '').toLowerCase();
    return {
        kind: 'move',
        slug,
        name,
        type,
        damageClass,
        power: basePower > 0 ? basePower : null,
        // Showdown writes `true` for a move that never misses.
        accuracy: accuracy === true ? null : accuracy,
        neverMisses: accuracy === true,
        pp: pp ?? null,
        effect: shortDesc || '',
        coverage: damageClass === 'status' ? null : coverageFor(type),
    };
}

/** One ability from ability-list.json (`{ n, en, e }`). */
export function resolveAbility(slug, list = []) {
    const key = toShowdownId(slug);
    const row = list.find((entry) => toShowdownId(entry.n) === key);
    if (!row) return null;
    return { kind: 'ability', slug: row.n, name: row.en || row.n, effect: row.e || '' };
}

/** One item from item-list.json (`{ n, en, c, e }`). */
export function resolveItem(slug, list = []) {
    const key = toShowdownId(slug);
    const row = list.find((entry) => toShowdownId(entry.n) === key);
    if (!row) return null;
    return { kind: 'item', slug: row.n, name: row.en || row.n, category: row.c || null, effect: row.e || '' };
}

/** The full page a quick look stands in for. */
export function quickLookPath({ kind, key } = {}) {
    if (kind === 'pokemon') return `/pokemon/${key}`;
    if (kind === 'move') return `/moves/${key}`;
    if (kind === 'ability') return `/abilities/${key}`;
    if (kind === 'item') return `/items/${key}`;
    return '/';
}

/** Two entries are the same look when kind and key match (keys compare as text). */
export const sameLook = (a, b) => Boolean(a && b && a.kind === b.kind && String(a.key) === String(b.key));
