import { describe, it, expect } from 'vitest';
import { getPokemonDisplaySprite, sanitizeSpriteUrl } from './pokemonSprites';

describe('getPokemonDisplaySprite', () => {
    it('resolves normal pokemon display sprite based on id', () => {
        const pk = { id: 149, name: 'dragonite' };
        expect(getPokemonDisplaySprite(pk)).toContain('/149.png');
    });

    it('resolves normal pokemon artwork sprite if preferArtwork is set', () => {
        const pk = { id: 149, name: 'dragonite' };
        expect(getPokemonDisplaySprite(pk, { preferArtwork: true })).toContain('/official-artwork/149.png');
    });

    it('resolves Mega pokemon sprite by extracting id from sprite url', () => {
        const pk = {
            id: 149,
            name: 'Mega Dragonite',
            sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10281.png'
        };
        expect(getPokemonDisplaySprite(pk)).toContain('/10281.png');
        expect(getPokemonDisplaySprite(pk, { preferArtwork: true })).toContain('/official-artwork/10281.png');
    });

    it('resolves Mega pokemon with suffix name', () => {
        const pk = {
            id: 149,
            name: 'Dragonite-Mega',
            sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10281.png'
        };
        expect(getPokemonDisplaySprite(pk)).toContain('/10281.png');
    });

    it('falls back to base id if sprite url is missing or invalid', () => {
        const pk = {
            id: 149,
            name: 'Mega Dragonite'
        };
        expect(getPokemonDisplaySprite(pk)).toContain('/149.png');
    });
});

describe('sanitizeSpriteUrl', () => {
    it('converts raw githubusercontent urls to cdn jsdelivr urls', () => {
        const rawUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png';
        const expected = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/94.png';
        expect(sanitizeSpriteUrl(rawUrl)).toBe(expected);
    });

    it('converts raw items urls correctly', () => {
        const rawUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
        const expected = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/poke-ball.png';
        expect(sanitizeSpriteUrl(rawUrl)).toBe(expected);
    });

    it('leaves already-clean cdn urls unchanged', () => {
        const cdnUrl = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/94.png';
        expect(sanitizeSpriteUrl(cdnUrl)).toBe(cdnUrl);
    });

    it('handles non-string/falsy inputs gracefully', () => {
        expect(sanitizeSpriteUrl(null)).toBeNull();
        expect(sanitizeSpriteUrl(undefined)).toBeUndefined();
        expect(sanitizeSpriteUrl('')).toBe('');
    });
});
