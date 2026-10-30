import { describe, expect, it } from 'vitest';
import { STATIC_PAGES, joinList, pageMeta, strongAgainst, structuredData, weaknessesOf } from './seoPages';
import { TRANSLATIONS } from '../constants/translations';

describe('seo copy', () => {
    it('has a title and a description for every static page in both languages', () => {
        for (const language of ['en', 'pt']) {
            for (const key of Object.values(STATIC_PAGES)) {
                const copy = TRANSLATIONS[language].seo[key];
                expect(copy?.title, `${language}.seo.${key}.title`).toBeTruthy();
                expect(copy?.description, `${language}.seo.${key}.description`).toBeTruthy();
            }
        }
    });

    it('keeps the two languages on the same keys', () => {
        const keys = (node, prefix = '') => Object.entries(node).flatMap(([k, v]) => (
            v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
        ));
        for (const section of ['seo', 'landing', 'typesPage', 'sharedTeamView', 'reminderOffer', 'bestTeamsPage', 'dataNotes', 'guidesPage', 'sitePages', 'consent']) {
            expect(keys(TRANSLATIONS.pt[section]).sort(), section).toEqual(keys(TRANSLATIONS.en[section]).sort());
        }
    });

    it('keeps descriptions inside what a results page shows', () => {
        for (const language of ['en', 'pt']) {
            for (const key of Object.values(STATIC_PAGES)) {
                expect(pageMeta(Object.keys(STATIC_PAGES).find((p) => STATIC_PAGES[p] === key), language).description.length, `${language} ${key}`).toBeLessThanOrEqual(200);
            }
        }
    });
});

describe('weaknessesOf', () => {
    it('multiplies across both types and puts 4× first', () => {
        expect(weaknessesOf(['fire', 'flying'])).toEqual([
            { type: 'rock', multiplier: 4 },
            { type: 'water', multiplier: 2 },
            { type: 'electric', multiplier: 2 },
        ]);
    });

    it('lets an immunity cancel a weakness', () => {
        // Ground/Flying would be weak to Electric if Ground were not immune.
        expect(weaknessesOf(['ground', 'flying']).map((w) => w.type)).not.toContain('electric');
    });

    it('ignores unknown types', () => {
        expect(weaknessesOf(['shadow'])).toEqual([]);
    });
});

describe('strongAgainst', () => {
    it('lists what a type hits super effectively', () => {
        expect(strongAgainst('fire').sort()).toEqual(['bug', 'grass', 'ice', 'steel']);
    });
});

describe('joinList', () => {
    it('joins with the language\'s "and"', () => {
        expect(joinList(['A', 'B', 'C'], 'en')).toBe('A, B and C');
        expect(joinList(['A', 'B'], 'pt')).toBe('A e B');
        expect(joinList(['A'], 'pt')).toBe('A');
    });
});

describe('pageMeta', () => {
    it('writes a Pokémon page in Portuguese with its weaknesses', () => {
        const meta = pageMeta('/pokemon/6', 'pt', { pokemon: { id: 6, name: 'charizard', types: ['fire', 'flying'] } });
        expect(meta.title).toBe('Charizard: fraquezas, status e builds | PokemonBuilder');
        expect(meta.description).toContain('do tipo Fogo/Voador, fraco contra Pedra, Água e Elétrico');
        expect(meta.canonicalPath).toBe('/pokemon/charizard');
        expect(meta.breadcrumbs.map((c) => c.path)).toEqual(['/', '/pokedex', '/pokemon/charizard']);
    });

    it('falls back to the slug when the Pokémon is unknown', () => {
        const meta = pageMeta('/pokemon/mr-mime', 'en');
        expect(meta.title).toBe('Mr Mime: weaknesses, stats & builds | PokemonBuilder');
        expect(meta.canonicalPath).toBe('/pokemon/mr-mime');
    });

    it('covers the type pages and refuses a type that does not exist', () => {
        expect(pageMeta('/types/fire', 'pt').title).toBe('Tipo Fogo: fraquezas e vantagens | PokemonBuilder');
        expect(pageMeta('/types/shadow', 'pt').key).toBe('home');
    });

    it('marks fixed-copy pages as static and gives Home no breadcrumb', () => {
        expect(pageMeta('/builder', 'pt')).toMatchObject({ isStatic: true, title: 'Montador de times Pokémon (Team Builder) | PokemonBuilder' });
        expect(pageMeta('/', 'en').breadcrumbs).toEqual([]);
    });

    it('describes a tournament team from its data', () => {
        const team = { title: 'Wolfe Glick', tournament: 'Worlds 2024', placement: '1st', format: 'VGC' };
        expect(pageMeta('/tournaments/team/x', 'pt', { team }).description).toMatch(/^1st no Worlds 2024 \(VGC\): o time completo/);
    });
});

describe('structuredData', () => {
    it('declares the site search on Home, pointing at a page that honours ?q=', () => {
        const [org, site, app] = structuredData(pageMeta('/', 'pt'), 'pt');
        expect(org['@type']).toBe('Organization');
        expect(site['@type']).toBe('WebSite');
        expect(site.inLanguage).toBe('pt-BR');
        expect(site.potentialAction.target.urlTemplate).toBe('https://pokemonbuilder.app/pt/pokedex?q={search_term_string}');
        expect(app['@type']).toBe('WebApplication');
    });

    it('gives deeper pages a breadcrumb trail of absolute, localized URLs', () => {
        const crumbs = structuredData(pageMeta('/types/water', 'pt'), 'pt').find((b) => b['@type'] === 'BreadcrumbList');
        expect(crumbs['@type']).toBe('BreadcrumbList');
        expect(crumbs.itemListElement.map((i) => i.item)).toEqual([
            'https://pokemonbuilder.app/pt',
            'https://pokemonbuilder.app/pt/types',
            'https://pokemonbuilder.app/pt/types/water',
        ]);
    });

    it('names the organisation on every page, the tool on a tool page and the guide as an Article', () => {
        for (const path of ['/', '/builder', '/pokemon/charizard', '/guides/first-vgc-team']) {
            expect(structuredData(pageMeta(path, 'en'), 'en')[0]).toMatchObject({ '@type': 'Organization', name: 'PokemonBuilder', url: 'https://pokemonbuilder.app/' });
        }
        const app = structuredData(pageMeta('/speed-tiers', 'pt'), 'pt').find((b) => b['@type'] === 'WebApplication');
        expect(app).toMatchObject({ name: 'Speed tiers de Pokémon', inLanguage: 'pt-BR' });
        expect(app.featureList).toContain('Choice Scarf');
        const guide = structuredData(pageMeta('/guides/first-vgc-team', 'en'), 'en', { faq: [{ q: 'Q?', a: 'A.' }] });
        expect(guide.map((b) => b['@type'])).toEqual(['Organization', 'Article', 'FAQPage', 'BreadcrumbList']);
    });

    it('gives the organisation a contact and marks the About page as one', () => {
        const [org] = structuredData(pageMeta('/', 'en'), 'en');
        expect(org.contactPoint).toMatchObject({ '@type': 'ContactPoint', email: 'pokemonteambuilderadmin@gmail.com' });
        const about = structuredData(pageMeta('/about', 'pt'), 'pt');
        expect(about.map((b) => b['@type'])).toEqual(['Organization', 'AboutPage', 'BreadcrumbList']);
        expect(about[1]).toMatchObject({ url: 'https://pokemonbuilder.app/pt/about', mainEntity: { '@id': 'https://pokemonbuilder.app/#organization' } });
    });
});
