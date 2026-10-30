import { afterEach, describe, expect, it, vi } from 'vitest';

const load = async (mirror) => {
    vi.resetModules();
    vi.stubEnv('VITE_ASSET_MIRROR_URL', mirror);
    return import('./assetHost');
};

afterEach(() => vi.unstubAllEnvs());

describe('assetHost', () => {
    it('serves from the origins when no mirror is configured', async () => {
        const host = await load('');
        expect(host.isAssetMirrorEnabled).toBe(false);
        expect(host.POKEAPI_SPRITES_BASE).toBe(host.POKEAPI_SPRITES_ORIGIN);
        expect(host.SHOWDOWN_SPRITES_BASE).toBe(host.SHOWDOWN_SPRITES_ORIGIN);
        expect(host.toOriginUrl(`${host.POKEAPI_SPRITES_ORIGIN}/pokemon/25.png`)).toBeNull();
    });

    it('maps each origin to its prefix on the mirror and back', async () => {
        const host = await load('https://storage.googleapis.com/bucket/');
        const pokeapi = `${host.POKEAPI_SPRITES_ORIGIN}/pokemon/shiny/25.png`;
        const showdown = `${host.SHOWDOWN_SPRITES_ORIGIN}/trainers/cynthia.png`;

        expect(host.POKEAPI_SPRITES_BASE).toBe('https://storage.googleapis.com/bucket/pokeapi');
        expect(host.toMirrorUrl(pokeapi)).toBe('https://storage.googleapis.com/bucket/pokeapi/pokemon/shiny/25.png');
        expect(host.toMirrorUrl(showdown)).toBe('https://storage.googleapis.com/bucket/showdown/trainers/cynthia.png');
        expect(host.toOriginUrl(host.toMirrorUrl(pokeapi))).toBe(pokeapi);
        expect(host.toOriginUrl(host.toMirrorUrl(showdown))).toBe(showdown);
    });

    it('leaves URLs from other hosts alone', async () => {
        const host = await load('https://storage.googleapis.com/bucket');
        expect(host.toMirrorUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
        expect(host.toOriginUrl('https://example.com/a.png')).toBeNull();
    });
});
