import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import handler, { renderTeamCard } from './og.js';
import { pokemonCardTree, resultCardTree, teamCardTree } from './_lib/ogImage.js';

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

describe('api/og daily results', () => {
    it('draws a PokéPuzzle board and a Champion Challenge result as PNGs', async () => {
        for (const url of ['/api/og?puzzle=42.w.8.apcaa-ccccc&lang=pt', '/api/og?challenge=20261023.w.14.3.1830.5.platinum.3157&lang=en']) {
            const res = fakeRes();
            await handler({ url }, res);
            expect(res.code, url).toBe(200);
            expect(res.headers['Content-Type']).toBe('image/png');
            expect(Buffer.from(res.body).readUInt32BE(16)).toBe(1200);
        }
    }, 30000);

    it('answers a code that does not decode with the default card', async () => {
        const res = fakeRes();
        await handler({ url: '/api/og?puzzle=1.w.8.<b>hi</b>' }, res);
        expect(res.code).toBe(302);
        expect(res.headers.Location).toBe('/og-image.png');
    });

    it('writes the result in the requested language, never the answer', () => {
        const tree = JSON.stringify(resultCardTree('puzzle', { puzzleNumber: 42, won: true, attempts: 2, maxAttempts: 8, rows: ['apcaa', 'ccccc'] }, 'pt'));
        expect(tree).toContain('2/8');
        expect(tree).toContain('Acertei o Pokémon em 2 de 8 tentativas');
        expect(tree).toContain('Jogue o de hoje');
        const challenge = JSON.stringify(resultCardTree('challenge', { dayKey: '2026-10-23', won: true, turns: 14, remaining: 3, score: 1830, streak: 5, curve: [0.2, 1] }, 'pt'));
        expect(challenge).toContain('Venci a Cynthia em 14 turnos');
        expect(challenge).toContain('3 Pokémon de pé');
        expect(challenge).toContain('Desafio da Campeã');
    });
});

describe('api/og reference pages', () => {
    it('draws a Pokémon card and a type card even when the artwork fails', async () => {
        for (const url of ['/api/og?pokemon=445&lang=pt', '/api/og?type=fire&lang=en']) {
            const res = fakeRes();
            await handler({ url }, res);
            expect(res.code, url).toBe(200);
            expect(Buffer.from(res.body).readUInt32BE(16)).toBe(1200);
        }
    }, 30000);

    it('answers an unknown Pokémon or type with the default card', async () => {
        for (const url of ['/api/og?pokemon=99999', '/api/og?type=shadow', '/api/og?type=<b>']) {
            const res = fakeRes();
            await handler({ url }, res);
            expect(res.code, url).toBe(302);
        }
    });

    it('writes the weaknesses in the requested language', () => {
        const tree = JSON.stringify(pokemonCardTree({ id: 445, name: 'garchomp', types: ['dragon', 'ground'], baseStats: { hp: 108, attack: 130, defense: 95, 'special-attack': 80, 'special-defense': 85, speed: 102 } }, null, 'pt'));
        expect(tree).toContain('Fraco contra');
        expect(tree).toContain('Gelo 4×');
        expect(tree).toContain('Imune a Elétrico');
        expect(tree).toContain('Soma de status 600');
    });
});
