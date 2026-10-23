import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPage } from './render-meta.js';

// The real shell, so a change to index.html that breaks a replacement pattern
// (a reordered attribute, a self-closing slash) fails here, not in production.
const shell = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');

const pokemons = [
    { id: 6, name: 'charizard', types: ['fire', 'flying'], baseStats: { hp: 78, attack: 84, defense: 78, 'special-attack': 109, 'special-defense': 85, speed: 100 } },
    { id: 4, name: 'charmander', types: ['fire'] },
    { id: 10034, name: 'charizard-mega-x', types: ['fire', 'dragon'] },
];
const data = {
    pokemons,
    findPokemon: (p) => pokemons.find((x) => x.name === p || String(x.id) === p) || null,
    findTeam: (id) => (id === 'worlds' ? { id, title: 'Worlds winner', tournament: 'Worlds', placement: '1st', pokemons: [{ name: 'Incineroar' }] } : null),
    tournamentTeams: [
        { id: 'w1', title: 'Wolfe\'s team', tournament: 'Worlds 2026', placement: '1st', format: 'Reg M-B', pokemons: [{ id: 6, name: 'Charizard-Mega-Y' }, { id: 4, name: 'Charmander' }] },
        { id: 'r2', title: 'Regional pick', tournament: 'Lille', pokemons: [{ id: 4, name: 'Charmander' }] },
    ],
};

const page = (urlPath, extra = {}) => buildPage(shell, { urlPath, data, ...extra }).html;
const head = (html) => html.slice(0, html.indexOf('</head>'));
const attr = (html, re) => html.match(re)?.[1];

describe('render-meta buildPage', () => {
    it('serves /pt pages in Portuguese, with lang, canonical and hreflang', () => {
        const html = page('/pt/pokemon/charizard');
        expect(html).toContain('<html lang="pt-BR"');
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('Charizard: fraquezas, status e builds | Pokémon Team Builder');
        expect(attr(html, /<link rel="canonical" href="([^"]*)"/)).toBe('https://pokemonbuilder.app/pt/pokemon/charizard');
        expect(html).toContain('<link rel="alternate" hreflang="en" href="https://pokemonbuilder.app/pokemon/charizard" />');
        expect(html).toContain('<link rel="alternate" hreflang="pt-BR" href="https://pokemonbuilder.app/pt/pokemon/charizard" />');
        expect(html).toContain('<link rel="alternate" hreflang="x-default" href="https://pokemonbuilder.app/pokemon/charizard" />');
        expect(html).toContain('<meta property="og:locale" content="pt_BR" />');
    });

    it('serves unprefixed pages in English whatever else is true', () => {
        const html = page('/builder');
        expect(html).toContain('<html lang="en"');
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('Team Builder | Pokémon Team Builder');
        expect(html).toContain('<meta property="og:locale:alternate" content="pt_BR" />');
    });

    it('consolidates the numeric id onto the slug in each language', () => {
        expect(attr(page('/pt/pokemon/6'), /<link rel="canonical" href="([^"]*)"/)).toBe('https://pokemonbuilder.app/pt/pokemon/charizard');
        expect(attr(page('/meta/6'), /<link rel="canonical" href="([^"]*)"/)).toBe('https://pokemonbuilder.app/meta/charizard');
    });

    it('treats a trailing slash as the same page', () => {
        expect(attr(page('/pt/pokedex/'), /<link rel="canonical" href="([^"]*)"/)).toBe('https://pokemonbuilder.app/pt/pokedex');
    });

    it('emits JSON-LD that parses, and keeps it from closing its script tag', () => {
        const blocks = [...page('/pt').matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
        expect(blocks.map((b) => b['@type'])).toEqual(['WebSite', 'WebApplication']);
        const topicMeta = { id: 'abc', title: '</script><b>hi', description: 'x' };
        const html = page('/feed', { topicMeta });
        expect(head(html)).not.toContain('</script><b>');
    });

    it('prerenders the page text inside #root, in the page language', () => {
        const html = page('/pt/pokemon/charizard');
        const snapshot = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<script/)?.[1] || '';
        expect(snapshot).toContain('class="seo-prerender"');
        expect(snapshot).toContain('<h1>Charizard: fraquezas, status e builds</h1>');
        expect(snapshot).toContain('href="/pt/types/rock">Pedra</a> (4×)');
        expect(snapshot).toContain('Velocidade: 100');
        expect(snapshot).toContain('href="/pt/meta/charizard"');
    });

    it('lists the tournament teams and partners of a Pokémon, as its page shows them', () => {
        const snapshot = page('/pt/pokemon/charizard');
        expect(snapshot).toContain('<h2>Times de torneio com Charizard</h2>');
        expect(snapshot).toContain('Em 1 de 2 times de torneio recentes.');
        expect(snapshot).toContain('href="/pt/tournaments/team/w1">Wolfe&#39;s team</a> — Worlds 2026 · 1st · Reg M-B');
        expect(snapshot).toContain('href="/pt/pokemon/charmander">Charmander</a> (1 times juntos)');
        // Nothing for a Pokémon no team carried.
        expect(page('/pokemon/10034')).not.toContain('Tournament teams with');
    });

    it('lists only base-form Pokémon on a type page', () => {
        const html = page('/types/fire');
        expect(html).toContain('href="/pokemon/charmander"');
        expect(html).not.toContain('href="/pokemon/charizard-mega-x"');
    });

    it('unfurls a forum topic under its own canonical URL', () => {
        const html = page('/pt/feed', { topicMeta: { id: 'abc', title: 'Meu time', description: 'Olha só' } });
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('Meu time');
        expect(attr(html, /<link rel="canonical" href="([^"]*)"/)).toBe('https://pokemonbuilder.app/pt/feed?topic=abc');
    });

    it('escapes user text and survives replacement patterns in it', () => {
        const html = page('/feed', { topicMeta: { id: 'a', title: 'A $& "quote" <b>', description: '$1' } });
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('A $&amp; &quot;quote&quot; &lt;b&gt;');
        expect(attr(html, /<meta name="description" content="([^"]*)"/)).toBe('$1');
    });

    it('describes tournament teams from the data and lists the roster', () => {
        const html = page('/pt/tournaments/team/worlds');
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('Worlds winner | Pokémon Team Builder');
        expect(html).toContain('<li>Incineroar</li>');
    });

    it('unfurls a shared team as itself, with its generated image', () => {
        const sharedTeam = { id: 'abc', name: 'Chuva', pokemons: [{ id: 6, name: 'charizard', types: ['fire', 'flying'] }, { id: 130, name: 'gyarados', types: ['water', 'flying'] }] };
        const html = page('/pt/t/abc', { sharedTeam });
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('Chuva — time Pokémon | Pokémon Team Builder');
        expect(attr(html, /<meta name="description" content="([^"]*)"/)).toContain('Charizard e Gyarados');
        expect(attr(html, /<meta property="og:image" content="([^"]*)"/)).toBe('https://pokemonbuilder.app/api/og?team=abc&amp;lang=pt');
        expect(html).toContain('href="/pt/types/fire">Fogo</a>');
    });

    it('treats a legacy /builder?team= link as the team page', () => {
        const sharedTeam = { id: 'abc', name: 'Chuva', pokemons: [{ id: 6, name: 'charizard', types: ['fire'] }] };
        const html = page('/builder', { sharedTeam });
        expect(attr(html, /<link rel="canonical" href="([^"]*)"/)).toBe('https://pokemonbuilder.app/t/abc');
    });

    it('keeps the generic card when the team could not be read', () => {
        const html = page('/t/abc');
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('Shared Team | Pokémon Team Builder');
        expect(attr(html, /<meta property="og:image" content="([^"]*)"/)).toBe('https://pokemonbuilder.app/og-image.png');
    });
});
