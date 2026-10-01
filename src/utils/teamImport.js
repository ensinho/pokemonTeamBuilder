/**
 * Turn a team from anywhere — a tournament dataset entry, a share link, a forum
 * post, a saved team — into builder members.
 *
 * Two shapes arrive here. A **stored** member is one this app wrote: it has a
 * `customization` object. A **set** is a parsed Showdown paste (the tournament
 * data): item, ability, nature, moves and spread sit on the member itself, in
 * Showdown's spelling ("Heat Wave", `spa`, "Timid"), and its `id` is the base
 * species even when `name` says "Arcanine-Hisui".
 *
 * Tournament teams used to be handed to the *saved-team* loader, which read
 * `customization` and `instanceId` off members that have neither. Every set was
 * replaced by blank defaults, and all six Pokémon shared the instance id
 * `undefined` — so editing one edited all, removing one emptied the team, and
 * the first save or share threw (see teamSerialization.js).
 *
 * Pure: the index, the mega-stone map and the detail lookups are passed in.
 */

import { getDefaultCustomization } from './showdownExport';
import { normalizeSpread } from './statKeys';
import { detectEvScale } from './evBudget';
import { buildBaseIdLookup, dedupeBySpecies } from './teamUniqueness';
import { newInstanceId, withUniqueInstanceIds } from './teamSerialization';

export const toSlug = (value = '') => String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[.'’:,%]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const MEGA_SUFFIX = /-mega(-[xyz])?$/;

const isStoredMember = (member) => Boolean(member?.customization && typeof member.customization === 'object');

/** The spread scale of a team of sets: what the team says, else what its numbers say. */
export const teamEvScale = (team) => {
    if (team?.evScale === 'sp' || team?.evScale === 'ev') return team.evScale;
    const spreads = (team?.pokemons || []).filter((p) => p && !isStoredMember(p)).map((p) => normalizeSpread(p.evs, 0));
    return detectEvScale(spreads);
};

/**
 * Stamp every tournament team with its spread scale.
 *
 * A team whose paste had no spreads at all says nothing about its own scale, but
 * its regulation does: if any team of a format is written in Stat Points, the
 * format is a Pokémon Champions one and so is every team in it.
 */
export const annotateEvScales = (teams = []) => {
    const own = teams.map((team) => teamEvScale(team));
    const byFormat = new Map();
    teams.forEach((team, index) => {
        if (own[index] === 'sp' && team?.format) byFormat.set(team.format, 'sp');
    });
    return teams.map((team, index) => ({
        ...team,
        evScale: own[index] || byFormat.get(team?.format) || 'ev',
    }));
};

const matchByName = (list, name) => {
    const slug = toSlug(name);
    if (!slug) return null;
    return (list || []).find((entry) => toSlug(entry?.name) === slug)?.name || null;
};

// A set, in the app's customization shape.
const customizationFromSet = (set, detail, scale) => {
    const base = getDefaultCustomization(detail);
    const ability = toSlug(set.ability);
    const moves = [];
    for (const move of Array.isArray(set.moves) ? set.moves : []) {
        const slug = matchByName(detail?.moves, move) || toSlug(move);
        if (slug && !moves.includes(slug)) moves.push(slug);
        if (moves.length === 4) break;
    }
    const level = Number(set.level);
    return {
        ...base,
        item: toSlug(set.item),
        ability: ability ? (matchByName(detail?.abilities, ability) || ability) : base.ability,
        nature: toSlug(set.nature) || base.nature,
        teraType: toSlug(set.tera || set.teraType) || base.teraType,
        moves,
        evs: normalizeSpread(set.evs, 0),
        ivs: normalizeSpread(set.ivs, 31),
        ...(Number.isInteger(level) && level > 0 && level !== 50 ? { level } : {}),
        ...(scale === 'sp' ? { evScale: 'sp' } : {}),
    };
};

// A stored member's customization, completed and with both spreads in app keys.
const customizationFromStored = (stored, detail) => {
    const base = getDefaultCustomization(detail);
    return {
        ...base,
        ...stored,
        moves: Array.isArray(stored.moves)
            ? stored.moves.map((m) => (typeof m === 'string' ? m : m?.name)).filter(Boolean).slice(0, 4)
            : base.moves,
        evs: normalizeSpread(stored.evs, 0),
        ivs: normalizeSpread(stored.ivs, 31),
    };
};

/**
 * Which Pokémon a set actually is. The dataset resolves every name to its base
 * species id, so "Arcanine-Hisui" arrives as #59 — Arcanine's types, Arcanine's
 * stats. This finds the form again.
 *
 * @returns {{ id: number, entry: object|null, lookupName: string|null, showdownName: string }}
 *   `lookupName` — the form has no index entry and is worth asking PokéAPI for
 *   by name (Rotom-Wash, Lycanroc-Dusk).
 *   `showdownName` — the paste's own name for the species, always kept, exactly
 *   as written. Nothing derived from an id says it better: "Maushold" and
 *   "Maushold-Four" share a dex number, and only the paste knows which one the
 *   player brought. That includes a "-Mega" suffix: stripping it looked tidy and
 *   turned "Floette-Mega" into "Floette", which is not what Mega Evolves there
 *   (Floette-Eternal is) and does not exist in Pokémon Champions at all —
 *   Showdown's validator rejected those teams and accepts the name as written.
 */
export const resolveSetForm = (set, pokemonIndex = []) => {
    const baseId = Number(set?.id);
    const baseEntry = pokemonIndex.find((entry) => entry.id === baseId) || null;
    const fullSlug = toSlug(set?.name);
    const isMega = MEGA_SUFFIX.test(fullSlug);
    const slug = fullSlug.replace(MEGA_SUFFIX, '');
    const baseSlug = toSlug(baseEntry?.apiName || baseEntry?.name);
    const showdownName = String(set?.name || '').trim();
    const base = { id: baseId, entry: baseEntry, lookupName: null, showdownName };

    // The plain species, or Showdown's short name for the default form
    // ("Aegislash" for aegislash-shield). A Mega stays its base species holding a
    // stone — that is how the builder models one — so it never changes id either.
    if (isMega || !slug || !baseSlug || slug === baseSlug || baseSlug.startsWith(`${slug}-`)) return base;

    const formEntry = pokemonIndex.find((entry) =>
        (entry.baseId || entry.id) === baseId && toSlug(entry.apiName) === slug);
    if (formEntry) return { ...base, id: formEntry.id, entry: formEntry };

    return { ...base, lookupName: slug };
};

/**
 * Build builder members from a team.
 *
 * @param {{ name?: string, pokemons: Array, evScale?: string }} team
 * @param {object} deps
 * @param {Array}    deps.pokemonIndex            loadPokemonIndex() output
 * @param {Function} deps.resolveDetail           id   → fat Pokémon record or null
 * @param {Function} [deps.resolveDetailByName]   slug → fat Pokémon record or null
 * @param {{ mode?: 'import'|'edit' }} [options]
 *   `import` — someone else's team becoming a new one: fresh instance ids, and
 *   a repeated species is dropped (first one wins) and reported.
 *   `edit` — the user's own saved team: ids are kept where they are usable and
 *   nothing is removed, so a legacy team with a repeat can be opened and fixed.
 * @returns {Promise<{ members: Array, dropped: Array, unresolved: Array }>}
 */
export async function buildTeamMembers(team, deps = {}, { mode = 'import' } = {}) {
    const { pokemonIndex = [], resolveDetail, resolveDetailByName } = deps;
    const raw = (Array.isArray(team?.pokemons) ? team.pokemons : []).filter((p) => p && p.id != null).slice(0, 6);
    const scale = teamEvScale(team);
    const baseIdOf = buildBaseIdLookup(pokemonIndex);
    const entryById = new Map(pokemonIndex.map((entry) => [entry.id, entry]));
    const unresolved = [];

    const built = await Promise.all(raw.map(async (source) => {
        const stored = isStoredMember(source);
        const form = stored
            ? { id: Number(source.id), entry: entryById.get(Number(source.id)) || null, lookupName: null, showdownName: source.showdownName || null }
            : resolveSetForm(source, pokemonIndex);

        let { id } = form;
        const { showdownName } = form;
        let apiName = form.entry?.apiName || source.apiName;
        let detail = null;

        if (form.lookupName) {
            detail = await Promise.resolve(resolveDetailByName?.(form.lookupName)).catch(() => null);
            if (detail?.id) {
                // Found the real form: its own id, types and stats.
                id = detail.id;
                apiName = form.lookupName;
            }
        }
        if (!detail) detail = await Promise.resolve(resolveDetail?.(id)).catch(() => null);
        if (!detail) unresolved.push(source.name || `#${id}`);

        const merged = { ...(form.entry || {}), ...(detail || {}) };
        const types = [merged.types, source.types].find((list) => Array.isArray(list) && list.length > 0) || ['normal'];
        const speciesId = stored
            ? (Number(source.speciesId) || baseIdOf(id) || id)
            : Number(source.id);

        return {
            ...merged,
            id,
            speciesId,
            name: merged.name || source.name || `#${id}`,
            ...(apiName ? { apiName } : {}),
            ...(showdownName ? { showdownName } : {}),
            types,
            instanceId: mode === 'edit' && source.instanceId ? source.instanceId : newInstanceId(id),
            customization: stored
                ? customizationFromStored(source.customization, { ...merged, types })
                : customizationFromSet(source, { ...merged, types }, scale),
        };
    }));

    if (mode === 'edit') {
        return { members: withUniqueInstanceIds(built), dropped: [], unresolved };
    }
    const { unique, dropped } = dedupeBySpecies(built, baseIdOf);
    return { members: withUniqueInstanceIds(unique), dropped, unresolved };
}
