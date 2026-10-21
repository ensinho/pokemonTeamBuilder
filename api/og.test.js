import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import handler, { renderTeamCard } from './og.js';
import { teamCardTree } from './_lib/ogImage.js';

const team = { id: 'x', name: 'Chuva', pokemons: [{ id: 6, name: 'charizard' }, { id: 130, name: 'gyarados' }] };
const noNetwork = async () => ({ ok: false });

const fakeRes = () => {
    const res = { headers: {}, code: 0, body: null };
    res.setHeader = (k, v) => { res.headers[k] = v; };
    res.status = (c) => { res.code = c; return res; };
    res.send = (b) => { res.body = b; return res; };
    res.end = () => res;
    return res;
};

describe('api/og', () => {
    it('keeps its static imports to builtins and dependency-free local modules', () => {
        const source = fs.readFileSync(path.join(process.cwd(), 'api', 'og.js'), 'utf8');
        const statics = [...source.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]);
        for (const spec of statics) expect(spec.startsWith('node:') || spec.startsWith('./_lib/'), spec).toBe(true);
    });

    it('renders a PNG of the requested size even when every artwork fails', async () => {
        const png = await renderTeamCard(team, 'pt', { fetchImpl: noNetwork });
        const bytes = Buffer.from(png);
        expect(bytes.subarray(1, 4).toString()).toBe('PNG');
        expect(bytes.readUInt32BE(16)).toBe(1200);
        expect(bytes.readUInt32BE(20)).toBe(630);
    }, 20000);

    it('answers an unknown team with the default card, never an error', async () => {
        const res = fakeRes();
        await handler({ url: '/api/og?team=missing' }, res);
        expect(res.code).toBe(302);
        expect(res.headers.Location).toBe('/og-image.png');
    });

    it('writes the copy in the requested language', () => {
        const tree = JSON.stringify(teamCardTree({ name: '', pokemons: team.pokemons }, [null, null], 'pt'));
        expect(tree).toContain('Um time Pokémon');
        expect(tree).toContain('Importe este time com um toque');
        expect(tree).toContain('Charizard · Gyarados');
    });
});
