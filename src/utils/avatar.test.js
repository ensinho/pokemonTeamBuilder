import { describe, it, expect } from 'vitest';
import { resolveAvatar } from './avatar';

describe('resolveAvatar', () => {
    const pokemonOnly = { greetingPokemonId: 25, greetingPokemonIsShiny: true };
    const both = { greetingPokemonId: 25, greetingPokemonIsShiny: true, trainerSprite: 'cynthia' };

    it('defaults to the partner Pokémon', () => {
        expect(resolveAvatar(pokemonOnly)).toEqual({
            trainerSprite: null, pokemonId: 25, isShiny: true,
        });
    });

    it('keeps the Pokémon when both exist and no preference is set', () => {
        expect(resolveAvatar(both)).toEqual({
            trainerSprite: null, pokemonId: 25, isShiny: true,
        });
    });

    it('uses the trainer sprite when that is the preference', () => {
        expect(resolveAvatar({ ...both, avatarPreference: 'trainer' })).toEqual({
            trainerSprite: 'cynthia', pokemonId: null, isShiny: false,
        });
    });

    it('populates exactly one side, never both', () => {
        for (const preference of ['pokemon', 'trainer']) {
            const result = resolveAvatar({ ...both, avatarPreference: preference });
            expect(Boolean(result.trainerSprite) && Boolean(result.pokemonId)).toBe(false);
            expect(Boolean(result.trainerSprite) || Boolean(result.pokemonId)).toBe(true);
        }
    });

    // Each fallback keeps the user from ending up faceless when their preferred
    // option isn't actually set.
    it('falls back to the trainer sprite when preferring pokemon without one', () => {
        expect(resolveAvatar({ trainerSprite: 'red', avatarPreference: 'pokemon' })).toEqual({
            trainerSprite: 'red', pokemonId: null, isShiny: false,
        });
    });

    it('falls back to the Pokémon when preferring trainer without a sprite', () => {
        expect(resolveAvatar({ ...pokemonOnly, avatarPreference: 'trainer' })).toEqual({
            trainerSprite: null, pokemonId: 25, isShiny: true,
        });
    });

    it('yields an empty avatar when the trainer has neither', () => {
        expect(resolveAvatar()).toEqual({ trainerSprite: null, pokemonId: null, isShiny: false });
        expect(resolveAvatar({ avatarPreference: 'trainer' }))
            .toEqual({ trainerSprite: null, pokemonId: null, isShiny: false });
    });

    it('never reports shiny without a Pokémon to be shiny', () => {
        expect(resolveAvatar({ greetingPokemonIsShiny: true }).isShiny).toBe(false);
        expect(resolveAvatar({ trainerSprite: 'red', greetingPokemonIsShiny: true }).isShiny).toBe(false);
    });
});
