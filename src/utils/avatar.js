/**
 * Resolve which avatar a trainer shows, applying their pokemon/trainer choice.
 *
 * Pure and store-free so components can memoize it off the primitives they
 * already hold instead of calling into the store during render — and so it stays
 * testable without pulling Firebase in.
 *
 * Exactly one side of the returned pair is populated. That's what lets
 * denormalized copies (forum messages, the public directory) store a resolved
 * avatar and never carry the preference flag around.
 *
 * Falls back to whichever option *is* set, so choosing "trainer" without picking
 * a sprite (or vice versa) still leaves the user with a face.
 *
 * @returns {{trainerSprite: string|null, pokemonId: number|null, isShiny: boolean}}
 */
export const resolveAvatar = ({
    avatarPreference = 'pokemon',
    trainerSprite = null,
    greetingPokemonId = null,
    greetingPokemonIsShiny = false,
} = {}) => {
    const useTrainer = avatarPreference === 'trainer'
        ? Boolean(trainerSprite)
        : !greetingPokemonId && Boolean(trainerSprite);

    return {
        trainerSprite: useTrainer ? trainerSprite : null,
        pokemonId: useTrainer ? null : (greetingPokemonId || null),
        isShiny: useTrainer ? false : (Boolean(greetingPokemonId) && Boolean(greetingPokemonIsShiny)),
    };
};
