// Builds the Team Builder's game-filter sections: the game's real sub-dexes
// (e.g. Central / Coastal / Mountain Kalos) in regional order, each base species
// followed INLINE by its game-legal battle forms (Mega X/Y, regional variants…),
// then a National Pokédex section for everything else obtainable by that game's
// generation. Shared by the desktop and mobile builders.

const GEN_ORDER = [
    'generation-i', 'generation-ii', 'generation-iii', 'generation-iv', 'generation-v',
    'generation-vi', 'generation-vii', 'generation-viii', 'generation-ix',
];
const genIndex = (g) => {
    const i = GEN_ORDER.indexOf(g);
    return i < 0 ? GEN_ORDER.length : i;
};

const MEGA_RE = /-mega(-[xy])?$/;
const SUFFIX_RE = /-(mega(-[xy])?|primal|alola|galar|hisui|paldea|gmax)$/;
// Real PokéAPI megas occupy ids 10033–10090; anything higher tagged "-mega" is a
// project-added hypothetical mega and must NOT appear in a real game's dex.
const isOfficialForm = (f) => !MEGA_RE.test(f.apiName || '') || f.id <= 10090;
const suffixOf = (name = '') => (name.match(SUFFIX_RE)?.[1] || '').replace(/-[xy]$/, '');

/**
 * @param {object} ctx
 * @param {Array} ctx.fullIndex            - the complete pokemon index (base + forms)
 * @param {Array<{key,name,speciesIds}>} ctx.gameDexes - ordered regional sub-dexes
 * @param {{generation?:string, formSuffixes?:string[]}} ctx.game - selected game
 * @param {(entry)=>boolean} ctx.matches   - search / type / favourite predicate
 * @returns {Array<{key,name,mons}>}
 */
export function buildGameSections({ fullIndex = [], gameDexes, game, matches = () => true }) {
    if (!gameDexes || !fullIndex.length) return [];
    const byId = new Map(fullIndex.map((p) => [p.id, p]));
    const allowed = new Set(game?.formSuffixes || []);

    // Game-legal battle forms grouped under their base species id.
    const formsByBase = new Map();
    if (allowed.size) {
        for (const p of fullIndex) {
            if (!p.isForm || !isOfficialForm(p) || !allowed.has(suffixOf(p.apiName))) continue;
            if (!formsByBase.has(p.baseId)) formsByBase.set(p.baseId, []);
            formsByBase.get(p.baseId).push(p);
        }
    }

    // A base species followed immediately by its (filtered) forms.
    const expand = (id) => {
        const out = [];
        const base = byId.get(id);
        if (base && matches(base)) out.push(base);
        for (const f of formsByBase.get(id) || []) if (matches(f)) out.push(f);
        return out;
    };

    const placed = new Set();
    const regionalIds = new Set();
    const sections = [];

    for (const dex of gameDexes) {
        const mons = [];
        for (const id of dex.speciesIds) {
            regionalIds.add(id);
            if (placed.has(id)) continue;
            placed.add(id);
            mons.push(...expand(id));
        }
        if (mons.length) sections.push({ key: dex.key, name: dex.name, mons });
    }

    // National Pokédex: every base species available by this game's generation
    // that isn't already in a regional sub-dex, in national order.
    const gi = genIndex(game?.generation);
    const nationalIds = fullIndex
        .filter((p) => !p.isForm && p.id <= 1025 && !regionalIds.has(p.id) && genIndex(p.generation) <= gi)
        .sort((a, b) => a.id - b.id)
        .map((p) => p.id);

    const natMons = [];
    for (const id of nationalIds) {
        if (placed.has(id)) continue;
        placed.add(id);
        natMons.push(...expand(id));
    }
    if (natMons.length) sections.push({ key: 'national', name: 'National', mons: natMons });

    return sections;
}
