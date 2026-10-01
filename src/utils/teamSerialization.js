/**
 * The stored shape of a team member — one definition for every place a team is
 * written: a saved team, a share link, a forum post.
 *
 * It used to be three copies (two stores and the share modal), and all three
 * wrote `instanceId: pokemon.instanceId` straight through. Firestore rejects a
 * document containing `undefined`, so any member that reached them without an
 * instance id — every Pokémon of an imported tournament team — made the whole
 * write throw: the team could not be saved, shared or posted. Nothing here may
 * emit `undefined`.
 */

import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from './pokemonSprites';
import { megaDisplayName } from '../hooks/useMegaStones';
import { normalizeSpread } from './statKeys';
import { speciesIdOf } from './teamUniqueness';

// Monotonic counter so instanceIds stay unique even when several members are
// created within the same millisecond (e.g. the randomizer building 6 at once).
let teamMemberSeq = 0;

export const newInstanceId = (pokemonId) => `${pokemonId ?? 'x'}-${Date.now()}-${teamMemberSeq++}`;

/**
 * Give every member an instance id no other member shares. The builder keys
 * removal, reordering and edits on it, so two members with the same id — or
 * with none — are edited and removed together.
 */
export const withUniqueInstanceIds = (members = [], { regenerate = false } = {}) => {
    const taken = new Set();
    return (Array.isArray(members) ? members : []).filter(Boolean).map((member) => {
        const current = regenerate ? null : member.instanceId;
        const instanceId = current && !taken.has(current) ? current : newInstanceId(member.id);
        taken.add(instanceId);
        return instanceId === member.instanceId ? member : { ...member, instanceId };
    });
};

/** Deep copy with every `undefined` dropped — the one value Firestore refuses. */
export const stripUndefined = (value) => {
    if (Array.isArray(value)) return value.filter((entry) => entry !== undefined).map(stripUndefined);
    if (value && typeof value === 'object') {
        const out = {};
        for (const [key, entry] of Object.entries(value)) {
            if (entry !== undefined) out[key] = stripUndefined(entry);
        }
        return out;
    }
    return value;
};

const cleanMoves = (moves) => {
    const seen = new Set();
    const out = [];
    for (const move of Array.isArray(moves) ? moves : []) {
        const name = typeof move === 'string' ? move : move?.name;
        if (typeof name !== 'string' || !name.trim() || seen.has(name)) continue;
        seen.add(name);
        out.push(name);
        if (out.length === 4) break;
    }
    return out;
};

/** A customization that is safe to store and unambiguous to read back. */
export const serializeCustomization = (customization = {}) => stripUndefined({
    ...customization,
    moves: cleanMoves(customization?.moves),
    evs: normalizeSpread(customization?.evs, 0),
    ivs: normalizeSpread(customization?.ivs, 31),
});

/**
 * @param {object} pokemon     a builder member (or an already-stored one)
 * @param {object} megaStones  stone slug → mega form, from mega-stones.json
 * @param {Function} baseIdOf  form id → species id (see teamUniqueness)
 */
export const serializeTeamPokemon = (pokemon, megaStones = null, baseIdOf = null) => {
    const item = pokemon?.customization?.item;
    const mega = (item && megaStones) ? megaStones[item] : null;
    const isMega = Boolean(mega && mega.baseId === pokemon.id);

    const spriteId = isMega ? mega.spriteId : pokemon.id;
    const displayName = isMega ? megaDisplayName(mega.form) : pokemon.name;
    const types = (isMega && mega?.types) ? mega.types : (pokemon?.types || []);

    return stripUndefined({
        id: pokemon.id,
        // What the Species Clause compares. Stored so a reader needs no index to
        // tell that a regional form and its base are the same Pokémon.
        speciesId: speciesIdOf(pokemon, baseIdOf) ?? pokemon.id,
        name: displayName || '',
        // The exact form, for the Showdown export: `name` above is a label and
        // turns into "Mega Charizard Y" the moment a stone is equipped.
        apiName: pokemon.apiName || undefined,
        showdownName: pokemon.showdownName || undefined,
        types: Array.isArray(types) ? types : [],
        sprite: getPokemonArtworkSpriteUrl(spriteId),
        shinySprite: getPokemonArtworkSpriteUrl(spriteId, { shiny: true }),
        animatedSprite: getPokemonFrontSpriteUrl(spriteId),
        animatedShinySprite: getPokemonFrontSpriteUrl(spriteId, { shiny: true }),
        instanceId: pokemon.instanceId || newInstanceId(pokemon.id),
        customization: serializeCustomization(pokemon.customization || {}),
    });
};

/** Serialize a whole roster, guaranteeing distinct instance ids on the way out. */
export const serializeTeam = (members = [], megaStones = null, baseIdOf = null) =>
    withUniqueInstanceIds(members).map((member) => serializeTeamPokemon(member, megaStones, baseIdOf));
