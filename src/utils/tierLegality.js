// Smogon tier legality — who is allowed in a tier, as opposed to who is popular
// in it. The usage dataset answers the second question (and only for the ~150
// species the chaos dump covers); this answers the first, from the tier each
// species is *assigned* in Showdown's formats-data.
//
// The distinction matters because the Team Builder calls this a filter. A list
// labelled "OU" that silently holds only the 150 most-used Pokémon would hide
// every legal-but-niche pick, which is exactly the team a builder is for.

// Singles tiers, most to least restrictive. A species may be used in its own
// tier and in every tier ABOVE it — a UU Pokémon is legal in OU, an OU Pokémon
// is not legal in UU. The "BL" (banlist) rungs are species banned from the tier
// below them but legal above, so they sit between the two.
export const SINGLES_TIERS = ['AG', 'Uber', 'OU', 'UUBL', 'UU', 'RUBL', 'RU', 'NUBL', 'NU', 'PUBL', 'PU', 'ZUBL', 'ZU'];

// Doubles has its own, much shorter ladder.
export const DOUBLES_TIERS = ['DUber', 'DOU', 'DBL', 'DUU'];

// Little Cup is not a rung on either ladder — it is a separate rule (first-stage
// species only), so it is matched exactly rather than by rank.
const EXACT_TIERS = new Set(['LC', 'NFE']);

// Tiers that mean "cannot be used at all", whatever the target.
const UNUSABLE = new Set(['Illegal', 'Unreleased', 'CAP', 'CAP NFE', 'CAP LC']);

/**
 * Normalize a raw formats-data tier string.
 *
 * Showdown wraps a tier in parentheses — `(OU)` — for a species that is *ranked*
 * there but may not be used in the tiers below it. For legality the parentheses
 * carry no extra meaning, so they are stripped; dropping them silently would
 * otherwise make every such species read as unknown and vanish from the filter.
 */
export function normalizeTier(raw) {
    if (!raw || typeof raw !== 'string') return null;
    return raw.trim().replace(/^\(+|\)+$/g, '') || null;
}

/** Position on a ladder; -1 when the tier is not on it. */
const rankOn = (ladder, tier) => ladder.indexOf(tier);

/**
 * Is a species assigned `speciesTier` usable in `targetTier`?
 *
 * Both are raw formats-data strings. Unknown species tiers return `true`: the
 * dataset lags new releases, and hiding a Pokémon the builder cannot classify is
 * worse than showing one it should not have — the user can see what it is.
 */
export function isLegalInTier(speciesTier, targetTier) {
    const species = normalizeTier(speciesTier);
    const target = normalizeTier(targetTier);
    if (!target) return true;
    if (!species) return true;
    if (UNUSABLE.has(species)) return false;

    // LC / NFE are membership tests, not ranks.
    if (EXACT_TIERS.has(target)) {
        if (target === 'LC') return species === 'LC';
        // NFE admits LC species too: everything not fully evolved.
        return species === 'NFE' || species === 'LC';
    }
    // An LC/NFE species is fully usable in the singles ladder — it simply sits
    // at the very bottom of it, below ZU.
    const effective = EXACT_TIERS.has(species) ? 'ZU' : species;

    const ladder = rankOn(DOUBLES_TIERS, target) >= 0 ? DOUBLES_TIERS : SINGLES_TIERS;
    const targetRank = rankOn(ladder, target);
    const speciesRank = rankOn(ladder, effective);
    if (targetRank < 0) return true; // target not a ladder tier — no restriction
    // Not on this ladder: either a species with no doubles placement (Showdown
    // records one only when it differs) or a tier string newer than this code.
    // Both are "we cannot classify it", and the rule above is to show it.
    if (speciesRank < 0) return true;
    // Higher index = lower tier = usable in everything above it.
    return speciesRank >= targetRank;
}

/**
 * Which tier (and which of formats-data's three tier fields) a Smogon format id
 * restricts to. Returns `null` for formats that are not tier-restricted — VGC
 * regulations, Battle Stadium, 1v1, Monotype — where legality comes from a
 * rules set this dataset does not describe, and the builder must not pretend to
 * filter.
 */
export function tierRuleForFormat(formatId = '') {
    const id = String(formatId);
    const gen = /^gen(\d+)/.exec(id)?.[1];
    if (!gen) return null;
    const rest = id.slice(`gen${gen}`.length);

    // National Dex reads its own field, and only its OU/Ubers rungs are a ladder
    // we can express — natdexmonotype and friends are rule sets, not tiers.
    if (rest.startsWith('nationaldex')) {
        const sub = rest.slice('nationaldex'.length);
        if (sub === '') return { field: 'natdex', tier: 'OU' };
        if (sub === 'ubers') return { field: 'natdex', tier: 'Uber' };
        if (sub === 'uu') return { field: 'natdex', tier: 'UU' };
        if (sub === 'ru') return { field: 'natdex', tier: 'RU' };
        return null;
    }

    if (rest === 'doublesou') return { field: 'doubles', tier: 'DOU' };
    if (rest === 'doublesuu') return { field: 'doubles', tier: 'DUU' };
    if (rest === 'doublesubers') return { field: 'doubles', tier: 'DUber' };

    const singles = {
        ou: 'OU', ubers: 'Uber', uu: 'UU', ru: 'RU', nu: 'NU', pu: 'PU', zu: 'ZU',
        lc: 'LC', nfe: 'NFE', anythinggoes: 'AG',
    };
    if (singles[rest]) return { field: 'tier', tier: singles[rest] };

    // Everything else (vgc*, champions*, bss*, monotype, 1v1, cap, ubersuu…) has
    // no tier ladder we can enforce from this dataset.
    return null;
}

/** True when the format's roster can be narrowed by tier legality at all. */
export const formatHasTierFilter = (formatId) => tierRuleForFormat(formatId) !== null;

/**
 * The set of species ids legal in `formatId`.
 *
 * `legalityById` is the baked `tier-legality.json` map, `{ [id]: { tier,
 * doubles, natdex } }`. Returns `null` — meaning "do not filter" — when the
 * format has no tier rule or the dataset is missing, so a caller can tell
 * "everything is allowed" apart from "nothing matched".
 */
export function legalIdsForFormat(legalityById, formatId) {
    const rule = tierRuleForFormat(formatId);
    if (!rule || !legalityById) return null;

    const ids = new Set();
    for (const [id, entry] of Object.entries(legalityById)) {
        // Fall back to the singles tier when a species has no entry for the
        // requested field: most Pokémon carry only `tier`, and Showdown treats
        // that as their doubles/natdex placement too unless it says otherwise.
        const speciesTier = entry?.[rule.field] || entry?.tier;
        if (isLegalInTier(speciesTier, rule.tier)) ids.add(Number(id));
    }
    return ids.size ? ids : null;
}
