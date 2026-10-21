import { describe, expect, it } from 'vitest';
import {
    alternateUrls,
    localizePath,
    resolveArrivalLanguage,
    routerBasename,
    splitLocalePath,
} from './localePath';

describe('splitLocalePath', () => {
    it('reads the Portuguese prefix and leaves the app path the router sees', () => {
        expect(splitLocalePath('/pt/pokemon/charizard')).toEqual({ language: 'pt', appPath: '/pokemon/charizard', hasPrefix: true });
        expect(splitLocalePath('/pt')).toEqual({ language: 'pt', appPath: '/', hasPrefix: true });
        expect(splitLocalePath('/pt/')).toEqual({ language: 'pt', appPath: '/', hasPrefix: true });
    });

    it('treats every unprefixed path as English', () => {
        expect(splitLocalePath('/builder')).toEqual({ language: 'en', appPath: '/builder', hasPrefix: false });
        expect(splitLocalePath('/')).toEqual({ language: 'en', appPath: '/', hasPrefix: false });
    });

    it('does not mistake a route that merely starts with "pt" for the prefix', () => {
        expect(splitLocalePath('/ptero').language).toBe('en');
        expect(splitLocalePath('/pokemon/pt').appPath).toBe('/pokemon/pt');
    });

    it('works under the GitHub Pages base path', () => {
        const base = '/pokemonTeamBuilder';
        expect(splitLocalePath('/pokemonTeamBuilder/pt/builder', base)).toEqual({ language: 'pt', appPath: '/builder', hasPrefix: true });
        expect(splitLocalePath('/pokemonTeamBuilder/builder', base)).toEqual({ language: 'en', appPath: '/builder', hasPrefix: false });
        expect(splitLocalePath('/pokemonTeamBuilder', base).appPath).toBe('/');
    });
});

describe('localizePath', () => {
    it('round-trips with splitLocalePath', () => {
        for (const appPath of ['/', '/builder', '/pokemon/mr-mime', '/tournaments/team/abc']) {
            for (const language of ['en', 'pt']) {
                for (const base of ['', '/pokemonTeamBuilder']) {
                    const full = localizePath(appPath, language, base);
                    expect(splitLocalePath(full, base)).toMatchObject({ language, appPath });
                }
            }
        }
    });

    it('writes the Portuguese home as /pt, not /pt/', () => {
        expect(localizePath('/', 'pt')).toBe('/pt');
        expect(localizePath('/', 'en')).toBe('/');
    });
});

describe('routerBasename', () => {
    it('absorbs the prefix so app routes never see it', () => {
        expect(routerBasename('/pt/builder')).toBe('/pt');
        expect(routerBasename('/builder')).toBe('');
        expect(routerBasename('/pokemonTeamBuilder/pt/x', '/pokemonTeamBuilder')).toBe('/pokemonTeamBuilder/pt');
        expect(routerBasename('/pokemonTeamBuilder/x', '/pokemonTeamBuilder/')).toBe('/pokemonTeamBuilder');
    });
});

describe('resolveArrivalLanguage', () => {
    it('lets an explicit choice win over the URL and the browser', () => {
        expect(resolveArrivalLanguage({ saved: 'en', urlLanguage: 'pt', urlHasPrefix: true, browserLanguage: 'pt-BR' })).toBe('en');
        expect(resolveArrivalLanguage({ saved: 'pt', urlLanguage: 'en', urlHasPrefix: false, browserLanguage: 'en-US' })).toBe('pt');
    });

    it('gives a crawler (no storage, en-US) exactly the language its URL names', () => {
        expect(resolveArrivalLanguage({ saved: null, urlLanguage: 'pt', urlHasPrefix: true, browserLanguage: 'en-US' })).toBe('pt');
        expect(resolveArrivalLanguage({ saved: null, urlLanguage: 'en', urlHasPrefix: false, browserLanguage: 'en-US' })).toBe('en');
    });

    it('sends a Portuguese browser on an unprefixed URL to Portuguese', () => {
        expect(resolveArrivalLanguage({ saved: null, urlLanguage: 'en', urlHasPrefix: false, browserLanguage: 'pt-BR' })).toBe('pt');
        expect(resolveArrivalLanguage({ saved: 'garbage', urlHasPrefix: false, browserLanguage: 'pt-PT' })).toBe('pt');
    });
});

describe('alternateUrls', () => {
    it('lists one absolute URL per language for the hreflang set', () => {
        expect(alternateUrls('https://x.app', '/pokemon/pikachu')).toEqual([
            { language: 'en', hreflang: 'en', href: 'https://x.app/pokemon/pikachu' },
            { language: 'pt', hreflang: 'pt-BR', href: 'https://x.app/pt/pokemon/pikachu' },
        ]);
        expect(alternateUrls('https://x.app', '/', '?a=1').map((a) => a.href)).toEqual(['https://x.app/?a=1', 'https://x.app/pt?a=1']);
    });
});
