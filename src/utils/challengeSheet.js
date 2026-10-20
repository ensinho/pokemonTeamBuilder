/**
 * The Champion Challenge's team sheet (Ficha): one shape for a member however
 * it is known — a rental set before the battle (the Time do dia), a saved team
 * in the picker, or the sim's own request during the battle — so one screen
 * draws all three. Pure; the dex (`public/data/battle-dex.json`) and the item
 * list (`battle-items.json`) are passed in, either may still be loading.
 *
 * A member: `{species, level, gender, types, ability, item, itemSlug,
 * nature, moves: [{name, type, category, power, pp, maxpp}], stats, statsKind,
 * hp: {current, max, pct} | null, status, fainted, active}`. `stats` are the
 * real figures in battle (`statsKind: 'real'`) and the species' base stats
 * before it (`'base'`).
 */

export const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

export const toId = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const titleCase = (text) => String(text || '')
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const speciesEntry = (dex, species) => dex?.species?.[toId(species)] || null;

/** The item's display name and sprite slug, from its id or its name. */
const itemOf = (items, raw) => {
    const id = toId(raw);
    if (!id) return { item: '', itemSlug: null };
    const known = (items || []).find((entry) => toId(entry.name) === id || toId(entry.slug) === id);
    return known ? { item: known.name, itemSlug: known.slug } : { item: titleCase(raw), itemSlug: null };
};

/** An ability id from a request ("torrent") back to its name, through the species' abilities. */
const abilityOf = (dex, species, raw) => {
    const id = toId(raw);
    if (!id) return '';
    const named = (speciesEntry(dex, species)?.[3] || []).find((name) => toId(name) === id);
    return named || titleCase(raw);
};

const moveOf = (dex, raw, pp = null, maxpp = null) => {
    // battle-dex.json move fields: name, type, category, power, accuracy, pp, desc.
    const entry = dex?.moves?.[toId(raw)];
    return {
        name: entry?.[0] || titleCase(raw),
        type: entry?.[1] || null,
        category: entry?.[2] || null,
        power: entry?.[3] || 0,
        pp: Number.isFinite(pp) ? pp : null,
        maxpp: Number.isFinite(maxpp) ? maxpp : null,
    };
};

const baseStats = (dex, species) => {
    const base = speciesEntry(dex, species)?.[2];
    return Array.isArray(base) ? Object.fromEntries(STAT_KEYS.map((key, i) => [key, base[i]])) : null;
};

const blank = (dex, species) => ({
    species,
    level: 50,
    gender: null,
    types: speciesEntry(dex, species)?.[1] || [],
    ability: '',
    item: '',
    itemSlug: null,
    nature: null,
    moves: [],
    stats: baseStats(dex, species),
    statsKind: 'base',
    hp: null,
    status: null,
    fainted: false,
    active: false,
});

/** A rental member (`{species, item, ability, moves}`, the Time do dia). */
export const sheetFromSet = (set, { dex, items } = {}) => ({
    ...blank(dex, set.species),
    ...itemOf(items, set.item),
    ability: set.ability || '',
    moves: (set.moves || []).filter(Boolean).map((move) => moveOf(dex, move)),
});

/** A saved team's member (`{name, customization}`), as the picker holds it. */
export const sheetFromSaved = (member, { dex, items } = {}) => {
    const species = titleCase(member.name || '');
    const custom = member.customization || {};
    return {
        ...blank(dex, species),
        ...itemOf(items, custom.item),
        ability: custom.ability ? abilityOf(dex, species, custom.ability) : '',
        nature: custom.nature ? titleCase(custom.nature) : null,
        moves: (custom.moves || []).filter(Boolean).map((move) => moveOf(dex, move)),
    };
};

/** `137/186 par` → `{hp: {current, max, pct}, status, fainted}`. */
const readCondition = (condition) => {
    const text = String(condition || '').trim();
    const fainted = /\bfnt$/.test(text);
    const [figures, status = null] = text.split(' ');
    const [current, max] = figures.split('/').map(Number);
    if (fainted) return { hp: { current: 0, max: Number.isFinite(max) ? max : null, pct: 0 }, status: null, fainted };
    if (!Number.isFinite(current) || !(max > 0)) return { hp: null, status: null, fainted: false };
    return { hp: { current, max, pct: Math.round((100 * current) / max) }, status, fainted: false };
};

/**
 * The player's six from a sim request, with the active one's PP from
 * `request.active` (the side list carries move ids only).
 */
export const sheetFromRequest = (request, { dex, items } = {}) => {
    const activePp = new Map((request?.active?.[0]?.moves || []).map((move) => [toId(move.id || move.move), move]));
    return (request?.side?.pokemon || []).map((mon) => {
        const [species, ...rest] = String(mon.details || '').split(',').map((part) => part.trim());
        const level = Number((rest.find((part) => /^L\d+$/.test(part)) || 'L100').slice(1));
        const gender = rest.includes('M') ? 'M' : rest.includes('F') ? 'F' : null;
        const { hp, status, fainted } = readCondition(mon.condition);
        const stats = mon.stats ? { hp: hp?.max ?? null, ...mon.stats } : baseStats(dex, species);
        return {
            ...blank(dex, species),
            ...itemOf(items, mon.item),
            level,
            gender,
            ability: abilityOf(dex, species, mon.ability || mon.baseAbility),
            moves: (mon.moves || []).map((id) => {
                const live = mon.active ? activePp.get(toId(id)) : null;
                return moveOf(dex, id, live?.pp, live?.maxpp);
            }),
            stats,
            statsKind: mon.stats ? 'real' : 'base',
            hp,
            status,
            fainted,
            active: Boolean(mon.active),
        };
    });
};

/**
 * The request the screen may show while the playback is at `shown`: the newest
 * among the lines already played (the sim sends it after the turn that led to
 * it), or the first one while the opening plays — everyone at full HP. The
 * latest request in the log would already know how the turn on screen ends.
 */
export const settledRequest = (lines = [], shown = lines.length) => {
    let index = -1;
    for (let i = 0; i < lines.length; i += 1) {
        if (!lines[i].startsWith('|request|')) continue;
        if (i >= shown && index >= 0) break;
        index = i;
        if (i >= shown) break;
    }
    if (index < 0) return null;
    try {
        return JSON.parse(lines[index].slice('|request|'.length));
    } catch {
        return null;
    }
};

const speciesOf = (details) => String(details || '').split(',')[0].trim();

/**
 * Each of `side`'s Pokémon as the playback has drawn it — HP and status from
 * switches, damage, heals, faints and status lines, by species. Your own side's
 * lines carry exact figures (`137/186`).
 * @returns {Map<string, {hp: object|null, status: string|null, fainted: boolean}>}
 */
export const shownConditions = (lines = [], side = 'p1') => {
    const names = new Map();
    const out = new Map();
    for (const line of lines) {
        const parts = line.split('|');
        if (!parts[2]?.startsWith(side)) continue;
        const tag = parts[1];
        const nickname = parts[2].split(': ')[1];
        if (tag === 'switch' || tag === 'drag' || tag === 'replace') names.set(nickname, speciesOf(parts[3]));
        if (tag === 'detailschange') {
            // A Mega Evolution: carry what was shown over to the new species' name.
            const before = names.get(nickname);
            const after = speciesOf(parts[3]);
            names.set(nickname, after);
            if (before && out.has(before)) {
                out.set(after, out.get(before));
                out.delete(before);
            }
            continue;
        }
        const species = names.get(nickname);
        if (!species) continue;
        const now = out.get(species) || { hp: null, status: null, fainted: false };
        if (tag === 'faint') out.set(species, { hp: now.hp && { ...now.hp, current: 0, pct: 0 }, status: null, fainted: true });
        else if (tag === '-status') out.set(species, { ...now, status: parts[3] || null });
        else if (tag === '-curestatus') out.set(species, { ...now, status: null });
        else {
            const condition = tag === 'switch' || tag === 'drag' || tag === 'replace' ? parts[4]
                : tag === '-damage' || tag === '-heal' || tag === '-sethp' ? parts[3] : null;
            if (condition) out.set(species, readCondition(condition));
        }
    }
    return out;
};

/**
 * The playback's HP and status (`shownConditions`) laid over a sheet built from
 * a request, so the sheet never runs ahead of the field.
 */
export const withShown = (members, shown) => members.map((member) => {
    const seen = shown?.get(member.species);
    if (!seen) return member;
    const max = member.hp?.max ?? seen.hp?.max ?? null;
    return { ...member, hp: seen.hp ? { ...seen.hp, max } : member.hp, status: seen.status, fainted: seen.fainted };
});
