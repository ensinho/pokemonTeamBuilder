// Alternate forms & mega evolutions live in PokéAPI as a species' non-default
// `varieties` (e.g. charizard-mega-x, kyogre-primal, rattata-alola, toxtricity-gmax).
// Each variety is a real `/pokemon/{id}` with its OWN id, types and sprite — so a form
// can be navigated to and added to a team exactly like a base Pokémon.
//
// This module is the single place that turns species data into the form shape the
// Pokédex detail and Team Builder consume. Keeping it pure (the network call is
// injected) lets it be unit-tested and reused by the cache-build script.

// Cap per species — guards against a handful of mons with many cosmetic forms
// (e.g. Pikachu caps, Alcremie) flooding the UI / cache.
const MAX_FORMS = 8;

// "charizard-mega-x" → "Mega Charizard X"; "rattata-alola" → "Alolan Rattata".
// Falls back to a title-cased dash-join for anything we don't special-case.
export const formDisplayName = (rawName, baseName) => {
    if (!rawName) return '';
    const base = (baseName || '').toLowerCase();
    let rest = rawName.toLowerCase();
    // Strip the base species name so we label by the distinguishing suffix.
    if (base && rest.startsWith(`${base}-`)) rest = rest.slice(base.length + 1);

    const titleBase = base ? base.charAt(0).toUpperCase() + base.slice(1) : '';
    const tokens = rest.split('-').filter(Boolean);

    // These read naturally BEFORE the species name ("Mega Charizard", "Alolan Rattata").
    const PREFIX = { mega: 'Mega', gmax: 'Gigantamax', primal: 'Primal', alola: 'Alolan', galar: 'Galarian', hisui: 'Hisuian', paldea: 'Paldean' };

    const titleCase = (tok) => tok.length <= 2 ? tok.toUpperCase() : tok.charAt(0).toUpperCase() + tok.slice(1);

    const before = [];
    const after = [];
    tokens.forEach((tok) => {
        if (PREFIX[tok]) before.push(PREFIX[tok]);
        else after.push(titleCase(tok)); // variant markers ("X"/"Y") and descriptors ("Attack") trail the name
    });

    if (!titleBase) return tokens.map(titleCase).join(' ');
    return [...before, titleBase, ...after].join(' ').trim();
};

const idFromUrl = (url) => Number.parseInt(String(url).split('/').filter(Boolean).pop(), 10);

const pickSprite = (formData) =>
    formData?.sprites?.other?.['official-artwork']?.front_default
    || formData?.sprites?.front_default
    || null;

/**
 * Build the list of alternate forms / megas for a species.
 *
 * @param {object} speciesData  raw `/pokemon-species/{id}` response (has `varieties`)
 * @param {object} opts
 * @param {(urlOrId: string) => Promise<object>} opts.fetchPokemon  resolves a `/pokemon` entry
 * @returns {Promise<Array<{id:number,name:string,displayName:string,types:string[],sprite:string|null}>>}
 */
export const buildPokemonForms = async (speciesData, { fetchPokemon }) => {
    const baseName = speciesData?.name;
    const varieties = (speciesData?.varieties || [])
        .filter((v) => !v.is_default && v?.pokemon?.url)
        .slice(0, MAX_FORMS);

    const forms = await Promise.all(varieties.map(async (variety) => {
        try {
            const formData = await fetchPokemon(variety.pokemon.url);
            const id = formData?.id || idFromUrl(variety.pokemon.url);
            if (!Number.isInteger(id)) return null;
            return {
                id,
                name: variety.pokemon.name,
                displayName: formDisplayName(variety.pokemon.name, baseName),
                types: formData?.types?.map((t) => t.type?.name).filter(Boolean) || [],
                sprite: pickSprite(formData),
            };
        } catch {
            // One bad form shouldn't sink the rest — drop it.
            return null;
        }
    }));

    return forms.filter(Boolean);
};
