import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetStaticData, cachedStaticData, loadStaticData, staticDataUrl } from './staticData';

const ok = (body) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

describe('loadStaticData', () => {
    beforeEach(() => { __resetStaticData(); });
    afterEach(() => { vi.unstubAllGlobals(); });

    it('makes one request for any number of simultaneous callers', async () => {
        const fetchMock = vi.fn(() => ok({ byStone: { charizarditex: {} } }));
        vi.stubGlobal('fetch', fetchMock);
        const results = await Promise.all(Array.from({ length: 36 }, () => loadStaticData('mega-stones.json')));
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(new Set(results).size).toBe(1); // one parsed object, shared
    });

    it('serves later callers from memory, synchronously too', async () => {
        const fetchMock = vi.fn(() => ok({ teams: [] }));
        vi.stubGlobal('fetch', fetchMock);
        expect(cachedStaticData('tournaments.json')).toBeUndefined();
        const first = await loadStaticData('tournaments.json');
        expect(cachedStaticData('tournaments.json')).toBe(first);
        expect(await loadStaticData('tournaments.json')).toBe(first);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('keeps files apart', async () => {
        const fetchMock = vi.fn((url) => ok({ url }));
        vi.stubGlobal('fetch', fetchMock);
        const [a, b] = await Promise.all([loadStaticData('smogon.json'), loadStaticData('usage/gen9ou.json')]);
        expect(a.url).toContain('/data/smogon.json?d=');
        expect(b.url).toContain('/data/usage/gen9ou.json?d=');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('rejects on an HTTP error and tries again on the next call', async () => {
        const fetchMock = vi.fn()
            .mockImplementationOnce(() => Promise.resolve({ ok: false, status: 503 }))
            .mockImplementationOnce(() => ok({ byId: {} }));
        vi.stubGlobal('fetch', fetchMock);
        await expect(loadStaticData('smogon.json')).rejects.toThrow('HTTP 503');
        expect(cachedStaticData('smogon.json')).toBeUndefined();
        await expect(loadStaticData('smogon.json')).resolves.toEqual({ byId: {} });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('stamps the URL with the day, so a rebuilt dataset arrives within one', () => {
        expect(staticDataUrl('move-types.json')).toMatch(/\/data\/move-types\.json\?d=\d{8}$/);
    });
});
