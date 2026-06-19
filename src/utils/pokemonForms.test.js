import { describe, it, expect, vi } from 'vitest';
import { formDisplayName, buildPokemonForms } from './pokemonForms';

describe('formDisplayName', () => {
    it('labels mega forms as a prefix', () => {
        expect(formDisplayName('charizard-mega-x', 'charizard')).toBe('Mega Charizard X');
        expect(formDisplayName('charizard-mega-y', 'charizard')).toBe('Mega Charizard Y');
    });

    it('labels regional forms', () => {
        expect(formDisplayName('rattata-alola', 'rattata')).toBe('Alolan Rattata');
        expect(formDisplayName('meowth-galar', 'meowth')).toBe('Galarian Meowth');
        expect(formDisplayName('growlithe-hisui', 'growlithe')).toBe('Hisuian Growlithe');
    });

    it('labels gigantamax and primal', () => {
        expect(formDisplayName('charizard-gmax', 'charizard')).toBe('Gigantamax Charizard');
        expect(formDisplayName('kyogre-primal', 'kyogre')).toBe('Primal Kyogre');
    });

    it('title-cases unknown suffixes after the name', () => {
        expect(formDisplayName('deoxys-attack', 'deoxys')).toBe('Deoxys Attack');
    });

    it('handles empty / missing input', () => {
        expect(formDisplayName('')).toBe('');
        // With no base name, every token is just title-cased and joined.
        expect(formDisplayName('charizard-mega-x')).toBe('Charizard Mega X');
    });
});

describe('buildPokemonForms', () => {
    const species = {
        name: 'charizard',
        varieties: [
            { is_default: true, pokemon: { name: 'charizard', url: 'https://x/pokemon/6/' } },
            { is_default: false, pokemon: { name: 'charizard-mega-x', url: 'https://x/pokemon/10034/' } },
            { is_default: false, pokemon: { name: 'charizard-mega-y', url: 'https://x/pokemon/10035/' } },
        ],
    };

    it('skips the default variety and resolves id/types/sprite per form', async () => {
        const fetchPokemon = vi.fn(async (url) => {
            if (url.includes('10034')) {
                return { id: 10034, types: [{ type: { name: 'fire' } }, { type: { name: 'dragon' } }], sprites: { front_default: 'x.png' } };
            }
            return { id: 10035, types: [{ type: { name: 'fire' } }, { type: { name: 'flying' } }], sprites: { front_default: 'y.png' } };
        });

        const forms = await buildPokemonForms(species, { fetchPokemon });

        expect(forms).toHaveLength(2);
        expect(forms[0]).toMatchObject({ id: 10034, displayName: 'Mega Charizard X', types: ['fire', 'dragon'] });
        expect(forms[1]).toMatchObject({ id: 10035, displayName: 'Mega Charizard Y', types: ['fire', 'flying'] });
        expect(fetchPokemon).toHaveBeenCalledTimes(2);
    });

    it('drops a form whose fetch fails without sinking the rest', async () => {
        const fetchPokemon = vi.fn(async (url) => {
            if (url.includes('10034')) throw new Error('network');
            return { id: 10035, types: [{ type: { name: 'fire' } }], sprites: {} };
        });

        const forms = await buildPokemonForms(species, { fetchPokemon });
        expect(forms).toHaveLength(1);
        expect(forms[0].id).toBe(10035);
    });

    it('returns [] for a species with no varieties', async () => {
        const forms = await buildPokemonForms({ name: 'pikachu', varieties: [] }, { fetchPokemon: vi.fn() });
        expect(forms).toEqual([]);
    });
});
