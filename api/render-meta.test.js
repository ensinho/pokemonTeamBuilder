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
    usage: { label: 'VGC Reg M-C', byId: { 6: { n: 100, usage: 12, items: [{ name: 'Charizardite Y', count: 61 }], abilities: [{ name: 'Blaze', count: 100 }], moves: [{ name: 'Heat Wave', count: 90 }, { name: 'Protect', count: 80 }], spreads: [{ nature: 'Timid', evs: { spa: 32, spe: 32 }, count: 40 }] } } },
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
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('Charizard: fraquezas, status e builds | PokemonBuilder');
        expect(attr(html, /<link rel="canonical" href="([^"]*)"/)).toBe('https://pokemonbuilder.app/pt/pokemon/charizard');
        expect(html).toContain('<link rel="alternate" hreflang="en" href="https://pokemonbuilder.app/pokemon/charizard" />');
        expect(html).toContain('<link rel="alternate" hreflang="pt-BR" href="https://pokemonbuilder.app/pt/pokemon/charizard" />');
        expect(html).toContain('<link rel="alternate" hreflang="x-default" href="https://pokemonbuilder.app/pokemon/charizard" />');
        expect(html).toContain('<meta property="og:locale" content="pt_BR" />');
    });

    it('serves unprefixed pages in English whatever else is true', () => {
        const html = page('/builder');
        expect(html).toContain('<html lang="en"');
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('Pokémon Team Builder | PokemonBuilder');
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
        expect(blocks.map((b) => b['@type'])).toEqual(['Organization', 'WebSite', 'WebApplication']);
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
        // Its link preview is the card api/og.js draws for it.
        expect(attr(html, /<meta property="og:image" content="([^"]*)"/)).toBe('https://pokemonbuilder.app/api/og?pokemon=6&amp;lang=pt');
        expect(attr(page('/types/water'), /<meta property="og:image" content="([^"]*)"/)).toBe('https://pokemonbuilder.app/api/og?type=water&amp;lang=en');
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

    it('unfurls a shared daily result as that result, keeping the game page canonical', () => {
        const html = buildPage(shell, { urlPath: '/pt/pokepuzzle', search: 'r=42.w.8.apcaa-ccccc', data }).html;
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('PokéPuzzle nº 42: 2/8 | PokemonBuilder');
        expect(attr(html, /<meta property="og:image" content="([^"]*)"/)).toBe('https://pokemonbuilder.app/api/og?puzzle=42.w.8.apcaa-ccccc&amp;lang=pt');
        expect(attr(html, /<meta property="og:url" content="([^"]*)"/)).toBe('https://pokemonbuilder.app/pt/pokepuzzle?r=42.w.8.apcaa-ccccc');
        expect(attr(html, /<link rel="canonical" href="([^"]*)"/)).toBe('https://pokemonbuilder.app/pt/pokepuzzle');

        const challenge = buildPage(shell, { urlPath: '/challenge', search: 'r=20261023.w.14.3.1830.5.platinum.37', data }).html;
        expect(attr(challenge, /<title>([^<]*)<\/title>/)).toBe('Beat Cynthia in 14 turns | PokemonBuilder');

        // A code that does not decode changes nothing.
        const bogus = buildPage(shell, { urlPath: '/pt/pokepuzzle', search: 'r=<script>', data }).html;
        expect(attr(bogus, /<meta property="og:image" content="([^"]*)"/)).toBe('https://pokemonbuilder.app/pokepuzzle-og.png');
    });

    it('prerenders the best-teams page with its top teams, Pokémon and pairs as links', () => {
        const html = page('/pt/best-teams');
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('Melhores times de Pokémon VGC | PokemonBuilder');
        expect(html).toContain('<h2>Os times do topo</h2>');
        expect(html).toContain('href="/pt/tournaments/team/w1">Wolfe&#39;s team</a> — 1st · Worlds 2026');
        expect(html).toContain('<h2>Pokémon mais usados</h2>');
        expect(html).toContain('href="/pt/pokemon/charmander">Charmander</a> (100% dos times)');
        expect(html).toContain('href="/pt/pokemon/charmander">Charmander</a> + <a href="/pt/pokemon/charizard">Charizard Mega Y</a>');
    });

    it('writes the most used build of a Pokémon in the default format', () => {
        const html = page('/pt/pokemon/charizard');
        expect(html).toContain('<h2>Charizard: build mais usada em VGC Reg M-C</h2>');
        expect(html).toContain('<li>Item: Charizardite Y (61%)</li>');
        expect(html).toContain('<li>Natureza e EVs: Timid · 32 SpA / 32 Spe (40%)</li>');
        expect(html).toContain('<li>Golpes: Heat Wave (90%), Protect (80%)</li>');
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
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('Worlds winner | PokemonBuilder');
        expect(html).toContain('<li>Incineroar</li>');
    });

    it('unfurls a shared team as itself, with its generated image', () => {
        const sharedTeam = { id: 'abc', name: 'Chuva', pokemons: [{ id: 6, name: 'charizard', types: ['fire', 'flying'] }, { id: 130, name: 'gyarados', types: ['water', 'flying'] }] };
        const html = page('/pt/t/abc', { sharedTeam });
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('Chuva — time Pokémon | PokemonBuilder');
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
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('Shared Team | PokemonBuilder');
        expect(attr(html, /<meta property="og:image" content="([^"]*)"/)).toBe('https://pokemonbuilder.app/og-image.png');
    });

    it('declares the card size on a dynamic image too', () => {
        const html = head(page('/pokemon/charizard'));
        expect(attr(html, /<meta property="og:image:width" content="([^"]*)"/)).toBe('1200');
        expect(attr(html, /<meta property="og:image:height" content="([^"]*)"/)).toBe('630');
        expect(attr(html, /<meta property="og:image:type" content="([^"]*)"/)).toBe('image/png');
    });
});

// 2026-10-30: pages that do not exist, pages that should not be indexed, and
// what a crawler reads on the pages that used to be a title and nothing else.
describe('render-meta: existence, indexing and the content AI crawlers read', () => {
    const dex = {
        move: { karatechop: ['Karate Chop', 'fighting', 'Physical', 50, 100, 25, 'High critical hit ratio.'], swift: ['Swift', 'normal', 'Special', 60, true, 20, 'This move does not check accuracy.'] },
        ability: { blaze: ['Blaze', "At 1/3 or less of its max HP, this Pokemon's Fire attacks have 1.5x power.", [4, 6]] },
        item: { charizarditey: ['Charizardite Y', 'If held by a Charizard, this item allows it to Mega Evolve into Mega Charizard Y.', 6] },
    };
    const build = (urlPath, extra = {}) => buildPage(shell, { urlPath, data: { ...data, dex }, ...extra });
    const blocksOf = (html) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const robots = (html) => attr(html, /<meta name="robots" content="([^"]*)"/);
    const main = (html) => html.match(/<main>([\s\S]*?)<\/main>/)?.[1] || '';

    it('answers 404, noindex, for a path no route knows', () => {
        const { html, status } = build('/pt/nao-existe');
        expect(status).toBe(404);
        expect(robots(html)).toBe('noindex, follow');
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('Página não encontrada | PokemonBuilder');
        expect(main(html)).toContain('href="/pt/builder"');
    });

    it('answers 404 for a Pokémon, a tournament team, a type or a guide that does not exist', () => {
        expect(build('/pokemon/notreal').status).toBe(404);
        expect(build('/meta/notreal').status).toBe(404);
        expect(build('/tournaments/team/nope').status).toBe(404);
        expect(build('/types/shadow').status).toBe(404);
        expect(build('/guides/nope').status).toBe(404);
        expect(build('/pokemon/charizard/extra').status).toBe(404);
    });

    it('keeps real pages indexable and the visitor’s own pages out of the index', () => {
        for (const path of ['/', '/pt', '/pokemon/charizard', '/pt/types/fire', '/guides', '/pt/guides/first-vgc-team', '/moves/karate-chop']) {
            const { html, status } = build(path);
            expect(status, path).toBe(200);
            expect(robots(html), path).toBeUndefined();
        }
        for (const path of ['/profile', '/pt/battles/abc', '/teams', '/favorites', '/admin']) {
            const { html, status } = build(path);
            expect(status, path).toBe(200);
            expect(robots(html), path).toBe('noindex, follow');
        }
    });

    it('serves a move the dex lacks, but not for the index', () => {
        const { html, status } = build('/moves/brand-new-move');
        expect(status).toBe(200);
        expect(robots(html)).toBe('noindex, follow');
    });

    it('opens <main> with the H1 and a definition, the site links coming last', () => {
        const html = build('/pt/builder').html;
        const snapshot = html.match(/<div class="seo-prerender">([\s\S]*?)<\/div>/)?.[1] || '';
        expect(snapshot.indexOf('<main>')).toBeLessThan(snapshot.indexOf('<footer>'));
        expect(attr(snapshot, /<p>([^<]*)<\/p>/)).toMatch(/^Montador de times Pokémon grátis/);
    });

    it('writes a move’s facts and effect', () => {
        const html = main(build('/pt/moves/karate-chop').html);
        expect(html).toContain('<p>Karate Chop é um golpe físico do tipo Lutador.</p>');
        expect(html).toContain('Tipo: <a href="/pt/types/fighting">Lutador</a>');
        expect(html).toContain('Poder: 50');
        expect(html).toContain('Precisão: 100%');
        expect(html).toContain('High critical hit ratio.');
        expect(main(build('/moves/swift').html)).toContain('Accuracy: never misses');
    });

    it('titles a move page with its real name', () => {
        expect(attr(build('/moves/karate-chop').html, /<title>([^<]*)<\/title>/)).toBe('Karate Chop (move): type, power and effect | PokemonBuilder');
    });

    it('lists the Pokémon that can have an ability, and the Pokémon a Mega Stone is for', () => {
        const ability = main(build('/abilities/blaze').html);
        expect(ability).toContain('What Blaze does');
        expect(ability).toContain('<a href="/pokemon/charmander">Charmander</a>');
        expect(main(build('/pt/items/charizardite-y').html)).toContain('Charizardite Y é a Mega Stone de <a href="/pt/pokemon/charizard">Charizard</a>.');
    });

    it('writes a guide in full, with its FAQ as FAQPage and the page as an Article', () => {
        const html = build('/pt/guides/first-vgc-team').html;
        expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('Como montar um time competitivo de Pokémon VGC, passo a passo | PokemonBuilder');
        expect(main(html)).toContain('<h2>Por que a velocidade importa tanto nas duplas?</h2>');
        expect(main(html)).toContain('<h3>O PokemonBuilder é grátis?</h3>');
        const types = blocksOf(html).map((b) => b['@type']);
        expect(types).toEqual(['Organization', 'Article', 'FAQPage', 'BreadcrumbList']);
        const faq = blocksOf(html).find((b) => b['@type'] === 'FAQPage');
        expect(faq.mainEntity[0]).toMatchObject({ '@type': 'Question', name: 'O PokemonBuilder é grátis?' });
    });

    it('lists the guides on /guides', () => {
        expect(main(build('/guides').html)).toContain('href="/guides/team-from-tournament-data"');
    });

    it('describes each tool as a WebApplication with what it does', () => {
        const app = blocksOf(build('/damage-calculator').html).find((b) => b['@type'] === 'WebApplication');
        expect(app).toMatchObject({ name: 'Pokémon Damage Calculator', url: 'https://pokemonbuilder.app/damage-calculator', isAccessibleForFree: true });
        expect(app.featureList).toContain('Damage rolls and KO chances');
    });

    it('gives the Meta page its ranking and the method behind it', () => {
        const usage = {
            label: 'VGC Reg M-C', kind: 'vgc', month: '2026-09', totalBattles: 1631943, byId: {},
            top: [{ id: 6, name: 'Charizard', usage: 12.5 }],
        };
        const html = main(buildPage(shell, { urlPath: '/pt/meta', data: { ...data, dex, usage } }).html);
        expect(html).toContain('<h2>Pokémon mais usados em VGC Reg M-C</h2>');
        expect(html).toContain('<a href="/pt/meta/charizard">Charizard</a> (em 12.5% dos times)');
        expect(html).toContain('1.631.943 partidas de VGC Reg M-C em setembro de 2026');
        expect(html).toContain('href="/pt/guides/team-from-tournament-data"');
    });

    it('states where the best teams come from and when they were refreshed', () => {
        const html = main(buildPage(shell, { urlPath: '/best-teams', data: { ...data, dex, tournamentsGeneratedAt: '2026-10-29T07:32:04.383Z' } }).html);
        expect(html).toContain('<h2>Where does this data come from?</h2>');
        expect(html).toContain('VGCPastes');
        expect(html).toContain('last update: Oct 29, 2026');
    });
});
