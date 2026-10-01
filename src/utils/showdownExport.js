/**
 * Pure Pokémon Showdown export formatting.
 *
 * Extracted from `useActiveTeamStore` so the format logic is testable in
 * isolation and reusable. No store/Firebase access — given team members in,
 * a Showdown paste string out.
 *
 * What "correct" means here is checked against the real parser: the tests feed
 * every paste back through `@pkmn/sim`'s `Teams.import()` and compare the sets.
 */

import { STAT_KEYS, STAT_SHOWDOWN_LABEL, normalizeSpread } from './statKeys';
import { statPointsToEvs } from './evBudget';

export const formatShowdownCase = (str = '') =>
    String(str ?? '').split('-').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

export const getDefaultCustomization = (pokemonData = {}) => ({
    item: '',
    nature: 'serious',
    teraType: pokemonData.types?.[0] || 'normal',
    isShiny: false,
    ability: pokemonData.abilities?.[0]?.name || 'unknown',
    moves: [],
    evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
    ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
});

export const DEFAULT_LEVEL = 50;

const toSlug = (value = '') => String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[.'’:,%]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

// PokéAPI names a species by its default form; Showdown names it plainly. The
// parser resolves most of these as aliases on its own — the entries marked (!)
// are the ones it rejects outright, the rest are here so the paste reads the way
// Showdown itself would write it.
const SPECIES_OVERRIDES = {
    'aegislash-shield': 'Aegislash',
    'basculegion-female': 'Basculegion-F', // (!)
    'basculegion-male': 'Basculegion', // (!)
    'basculin-red-striped': 'Basculin',
    'darmanitan-standard': 'Darmanitan',
    'deoxys-normal': 'Deoxys',
    'dudunsparce-two-segment': 'Dudunsparce',
    'eiscue-ice': 'Eiscue',
    'enamorus-incarnate': 'Enamorus',
    'frillish-male': 'Frillish', // (!)
    'giratina-altered': 'Giratina',
    'gourgeist-average': 'Gourgeist',
    'indeedee-female': 'Indeedee-F', // (!)
    'indeedee-male': 'Indeedee', // (!)
    'jellicent-male': 'Jellicent', // (!)
    'keldeo-ordinary': 'Keldeo',
    'landorus-incarnate': 'Landorus',
    'lycanroc-midday': 'Lycanroc',
    'maushold-family-of-four': 'Maushold-Four', // (!)
    'maushold-family-of-three': 'Maushold',
    'meloetta-aria': 'Meloetta',
    'meowstic-female': 'Meowstic-F',
    'meowstic-female-mega': 'Meowstic-F-Mega',
    'meowstic-male': 'Meowstic',
    'meowstic-male-mega': 'Meowstic-Mega', // (!)
    'mimikyu-disguised': 'Mimikyu',
    'minior-red-meteor': 'Minior-Meteor', // (!)
    'morpeko-full-belly': 'Morpeko',
    'oinkologne-female': 'Oinkologne-F', // (!)
    'oinkologne-male': 'Oinkologne', // (!)
    'oricorio-baile': 'Oricorio',
    'palafin-zero': 'Palafin',
    'pumpkaboo-average': 'Pumpkaboo',
    'pyroar-male': 'Pyroar', // (!)
    'raticate-totem-alola': 'Raticate-Alola-Totem', // (!)
    'shaymin-land': 'Shaymin',
    'squawkabilly-green-plumage': 'Squawkabilly', // (!)
    'tatsugiri-curly': 'Tatsugiri',
    'thundurus-incarnate': 'Thundurus',
    'tornadus-incarnate': 'Tornadus',
    'toxtricity-amped': 'Toxtricity',
    'toxtricity-amped-gmax': 'Toxtricity-Gmax',
    'urshifu-single-strike': 'Urshifu',
    'urshifu-single-strike-gmax': 'Urshifu-Gmax',
    'wishiwashi-solo': 'Wishiwashi',
    'wormadam-plant': 'Wormadam',
    'zygarde-50': 'Zygarde',
};

// Species whose own name is hyphenated. Everything else reads "Great Tusk".
const HYPHENATED_SPECIES = new Set([
    'ho-oh', 'porygon-z', 'jangmo-o', 'hakamo-o', 'kommo-o',
    'wo-chien', 'chien-pao', 'ting-lu', 'chi-yu', 'nidoran-f', 'nidoran-m',
]);

// Where the species name ends and the forme begins ("arcanine" | "hisui").
const FORME_TOKENS = new Set([
    'mega', 'gmax', 'primal', 'alola', 'galar', 'hisui', 'paldea', 'totem', 'origin',
    'therian', 'wash', 'heat', 'frost', 'fan', 'mow', 'crowned', 'eternamax', 'rapid',
    'ice', 'shadow', 'dusk', 'dawn', 'midnight', 'school', 'blade', 'sky', 'attack',
    'defense', 'speed', 'sandy', 'trash', 'sunshine', 'zen', 'resolute', 'pirouette',
    'black', 'white', 'complete', 'unbound', 'hero', 'wellspring', 'hearthflame',
    'cornerstone', 'terastal', 'stellar', 'bloodmoon', 'eternal', 'masterpiece',
    'female', 'male', 'starter', 'ash', 'noice', 'hangry', 'droopy', 'stretchy',
    'three', 'four', 'roaming', 'blue', 'yellow', 'orange', 'white-striped',
]);

const PREFIX_FORMES = {
    mega: 'mega', alolan: 'alola', galarian: 'galar', hisuian: 'hisui',
    paldean: 'paldea', gigantamax: 'gmax', primal: 'primal',
};

// "Mega Charizard Y" / "Hisuian Arcanine" → "charizard-mega-y" / "arcanine-hisui".
// Saved teams written before members carried an `apiName` only kept the display
// name of a form, and "Mega Charizard Y" is not a species Showdown knows.
const slugFromDisplayName = (name = '') => {
    const words = String(name).trim().split(/\s+/).filter(Boolean);
    if (words.length < 2) return toSlug(name);
    const formes = [];
    while (words.length > 1 && PREFIX_FORMES[words[0].toLowerCase()]) {
        formes.push(PREFIX_FORMES[words.shift().toLowerCase()]);
    }
    if (formes.length === 0) return toSlug(name);
    // The variant letter of a Mega trails the species: "Mega Charizard Y".
    const variant = formes.includes('mega') && /^[xyz]$/i.test(words[words.length - 1]) ? [words.pop()] : [];
    return toSlug([...words, ...formes, ...variant].join('-'));
};

const prettySpecies = (slug) => {
    if (HYPHENATED_SPECIES.has(slug)) return slug.split('-').map(capitalize).join('-');
    const tokens = slug.split('-').filter(Boolean);
    const hyphenated = [...HYPHENATED_SPECIES].find((name) => slug.startsWith(`${name}-`));
    const speciesLength = hyphenated
        ? hyphenated.split('-').length
        : (() => {
            const formeAt = tokens.findIndex((token, index) => index > 0 && FORME_TOKENS.has(token));
            return formeAt === -1 ? tokens.length : formeAt;
        })();
    const species = tokens.slice(0, speciesLength).map(capitalize).join(hyphenated ? '-' : ' ');
    const forme = tokens.slice(speciesLength).map(capitalize).join('-');
    return forme ? `${species}-${forme}` : species;
};

const megaBaseSlug = (slug) => slug.replace(/-mega(-[xyz])?$/, '');

// A stone whose Mega does not evolve from the species' default form. The
// builder only offers plain Floette, but Floettite belongs to Floette-Eternal —
// "Floette @ Floettite" names a Pokémon that cannot use the stone (and that
// Pokémon Champions does not have at all).
const STONE_HOLDER = {
    floettite: { floette: 'Floette-Eternal' },
};

/**
 * The name Showdown knows a team member by.
 *
 * In order of trust: the name a paste gave us verbatim (`showdownName`, kept by
 * the importer for forms the index has no entry for), the PokéAPI slug of the
 * exact form (`apiName`, on the member or looked up by id through
 * `entryById`), and only then the display name. A Mega holding its stone is
 * written as the base species — the stone is what makes it a Mega in a paste.
 *
 * @param {object} member
 * @param {{ entryById?: (id:number) => object|null|undefined }} [options]
 */
export const showdownSpeciesName = (member = {}, { entryById } = {}) => {
    const item = toSlug(member?.customization?.item);

    const verbatim = typeof member?.showdownName === 'string' ? member.showdownName.trim() : '';
    if (verbatim) return verbatim;

    const entry = entryById?.(member?.id) || null;
    let slug = toSlug(member?.apiName || entry?.apiName || '');
    if (!slug) {
        const name = member?.name || '';
        // A lowercase hyphenated name is already a slug; anything else is a label.
        slug = /^[a-z0-9-]+$/.test(name) ? name : slugFromDisplayName(name);
    }
    if (!slug) return 'Unknown Pokemon';

    if (/-mega(-[xyz])?$/.test(slug) && item) slug = megaBaseSlug(slug);
    if (STONE_HOLDER[item]?.[slug]) return STONE_HOLDER[item][slug];

    return SPECIES_OVERRIDES[slug] || prettySpecies(slug);
};

const formatSpread = (spread, fallback) => STAT_KEYS
    .filter((key) => spread[key] !== fallback)
    .map((key) => `${spread[key]} ${STAT_SHOWDOWN_LABEL[key]}`)
    .join(' / ');

const moveNames = (moves) => {
    const seen = new Set();
    const out = [];
    for (const move of Array.isArray(moves) ? moves : []) {
        const name = typeof move === 'string' ? move : move?.name;
        const slug = toSlug(name);
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        out.push(formatShowdownCase(slug));
        if (out.length === 4) break;
    }
    return out;
};

/**
 * Build a Pokémon Showdown paste from a list of team members.
 *
 * `includeTeraType` follows the user's Tera Type preference: the line is
 * optional in Showdown's own format (gen IX defaults it, older formats ignore
 * it), so someone playing pre-gen-IX can leave it out entirely. The saved team
 * keeps its `teraType` either way — this only decides what gets pasted.
 *
 * `evScale` decides how a Stat Points member (Pokémon Champions, see
 * `evBudget.js`) is written. `'native'` — the default, and what a user pastes
 * into Showdown — keeps the points as they are, because that is the form
 * Showdown's Champions formats read and the form the tournament paste had.
 * `'ev'` converts them to the EVs they are worth, for an engine that only knows
 * the mainline formula (the in-app battles).
 *
 * @param {Array} teamMembers - members with optional `customization`
 * @param {{ includeTeraType?: boolean, entryById?: Function, evScale?: 'native'|'ev' }} [options]
 * @returns {string} Showdown-formatted export text
 */
export const buildShowdownExportText = (teamMembers = [], { includeTeraType = true, entryById, evScale = 'native' } = {}) => {
    return (Array.isArray(teamMembers) ? teamMembers : []).filter(Boolean).map((member) => {
        const baseCustomization = getDefaultCustomization(member);
        const savedCustomization = member.customization || {};
        const customization = { ...baseCustomization, ...savedCustomization };

        const usesStatPoints = customization.evScale === 'sp';
        let evs = normalizeSpread(savedCustomization.evs, 0);
        if (usesStatPoints && evScale === 'ev') {
            evs = Object.fromEntries(STAT_KEYS.map((key) => [key, statPointsToEvs(evs[key])]));
        }
        const ivs = normalizeSpread(savedCustomization.ivs, 31);

        const evsString = formatSpread(evs, 0);
        const ivsString = formatSpread(ivs, 31);
        const item = toSlug(customization.item);
        const ability = toSlug(customization.ability);
        const level = Number.isInteger(Number(customization.level)) && Number(customization.level) > 0
            ? Number(customization.level)
            : DEFAULT_LEVEL;
        const teraType = toSlug(customization.teraType);
        const species = showdownSpeciesName(member, { entryById });

        return [
            // No "@" at all for an empty hand: the parser reads "@ Nothing" as an
            // item literally named Nothing.
            item ? `${species} @ ${formatShowdownCase(item)}` : species,
            ability && ability !== 'unknown' ? `Ability: ${formatShowdownCase(ability)}` : null,
            `Level: ${level}`,
            customization.isShiny ? 'Shiny: Yes' : null,
            // Pokémon Champions has no Terastallization, so its pastes carry no line.
            includeTeraType && teraType && !usesStatPoints ? `Tera Type: ${formatShowdownCase(teraType)}` : null,
            evsString ? `EVs: ${evsString}` : null,
            `${formatShowdownCase(toSlug(customization.nature) || 'serious')} Nature`,
            ivsString ? `IVs: ${ivsString}` : null,
            ...moveNames(customization.moves).map((move) => `- ${move}`),
        ].filter(Boolean).join('\n');
    }).join('\n\n');
};
