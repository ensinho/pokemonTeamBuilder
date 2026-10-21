/**
 * What every indexable page is called, in both languages — the one table the
 * server (api/render-meta.js, the HTML a crawler reads) and the client
 * (useDocumentMeta, what a navigation leaves behind) both read, so a page can
 * never carry one title in the source and another after hydration.
 *
 * Node-safe: no asset imports and explicit `.js` extensions, because the
 * serverless function imports this file as plain ESM.
 */
import { translate } from './translateCore.js';
import { typeChart } from '../constants/typeChart.js';
import { LOCALE_TAG, localizePath } from './localePath.js';
import { TYPE_IDS, strongAgainst, weaknessesOf } from './typeMatchups.js';

export { TYPE_IDS, strongAgainst, weaknessesOf };

export const SITE_URL = 'https://pokemonbuilder.app';
export const SITE_NAME = 'Pokémon Team Builder';
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

const artwork = (id) => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${id}.png`;

/** App path → copy key for every page that has fixed copy. */
export const STATIC_PAGES = {
    '/': 'home',
    '/pokedex': 'pokedex',
    '/builder': 'builder',
    '/meta': 'meta',
    '/tournaments': 'tournaments',
    '/damage-calculator': 'damageCalculator',
    '/speed-tiers': 'speedTiers',
    '/moves': 'moves',
    '/abilities': 'abilities',
    '/items': 'items',
    '/gyms': 'gyms',
    '/journeys': 'journeys',
    '/quiz': 'quiz',
    '/pokepuzzle': 'pokepuzzle',
    '/challenge': 'challenge',
    '/feed': 'feed',
    '/types': 'types',
};

const PAGE_IMAGES = {
    pokepuzzle: `${SITE_URL}/pokepuzzle-og.png`,
    challenge: `${SITE_URL}/challenge-og.png`,
};

/** `mr-mime` → `Mr Mime`; the same rule render-meta has always used for slugs. */
export function formatSlug(slug) {
    if (!slug) return '';
    let text = slug;
    try { text = decodeURIComponent(slug); } catch { /* keep the raw slug */ }
    return text
        .split('-')
        .map((word, i) => {
            if (!word) return '';
            if (i > 0 && ['of', 'the', 'in'].includes(word.toLowerCase())) return word.toLowerCase();
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

export const typeName = (type, language) => translate(language, `types.${type}`);

/** "A, B and C" / "A, B e C". */
export function joinList(items, language) {
    const list = items.filter(Boolean);
    if (list.length <= 1) return list[0] || '';
    return `${list.slice(0, -1).join(', ')} ${translate(language, 'seo.list.and')} ${list[list.length - 1]}`;
}

const chartKey = (name) => String(name).toLowerCase();

const withBrand = (pageTitle) => `${pageTitle} | ${SITE_NAME}`;

const crumbsFor = (language, trail) => [
    { name: translate(language, 'nav.home'), path: '/' },
    ...trail,
];

const staticCrumb = (language, key, path) => ({ name: translate(language, `seo.${key}.title`), path });

/**
 * Meta for one app path (no language prefix) in one language.
 *
 * `context` carries lookups only the caller can make: the server resolves
 * `pokemon` ({ id, name, types }) and `team` from its data files, the client
 * passes nothing and gets the name-only copy, which is what the server falls
 * back to as well.
 *
 * Returns `{ key, title, description, image, canonicalPath, breadcrumbs,
 * isStatic }`; `canonicalPath` is an app path — localize it per language.
 */
export function pageMeta(appPath, language, context = {}) {
    const t = (key, params) => translate(language, key, params);
    const path = appPath || '/';
    const segments = path.split('/').filter(Boolean);
    const base = {
        key: 'home',
        title: t('seo.home.title'),
        description: t('seo.home.description'),
        image: DEFAULT_IMAGE,
        canonicalPath: path,
        breadcrumbs: [],
        isStatic: false,
    };

    const staticKey = STATIC_PAGES[path];
    if (staticKey) {
        return {
            ...base,
            key: staticKey,
            title: staticKey === 'home' ? t('seo.home.title') : withBrand(t(`seo.${staticKey}.title`)),
            description: t(`seo.${staticKey}.description`),
            image: PAGE_IMAGES[staticKey] || DEFAULT_IMAGE,
            breadcrumbs: staticKey === 'home' ? [] : crumbsFor(language, [staticCrumb(language, staticKey, path)]),
            isStatic: true,
        };
    }

    const [section, param, extra] = segments;

    if ((section === 'pokemon' || section === 'meta') && param && !extra) {
        const { pokemon } = context;
        const name = formatSlug(pokemon?.name || param);
        const parentKey = section === 'pokemon' ? 'pokedex' : 'meta';
        const parentPath = section === 'pokemon' ? '/pokedex' : '/meta';
        const canonicalPath = pokemon?.name ? `/${section}/${pokemon.name}` : path;
        const breadcrumbs = crumbsFor(language, [
            staticCrumb(language, parentKey, parentPath),
            { name, path: canonicalPath },
        ]);
        const image = pokemon?.id ? artwork(pokemon.id) : DEFAULT_IMAGE;
        if (section === 'pokemon') {
            const types = (pokemon?.types || []).map(chartKey).filter((x) => typeChart[x]);
            const weak = weaknessesOf(types).map((w) => typeName(w.type, language));
            const description = types.length && weak.length
                ? t('seo.pokemon.description', {
                    name,
                    types: types.map((x) => typeName(x, language)).join('/'),
                    weaknesses: joinList(weak, language),
                })
                : t('seo.pokemon.fallbackDescription', { name });
            return { ...base, key: 'pokemon', title: withBrand(t('seo.pokemon.title', { name })), description, image, canonicalPath, breadcrumbs };
        }
        return {
            ...base,
            key: 'metaPokemon',
            title: withBrand(t('seo.metaPokemon.title', { name })),
            description: t('seo.metaPokemon.description', { name }),
            image,
            canonicalPath,
            breadcrumbs,
        };
    }

    if (section === 'tournaments' && param === 'team' && extra) {
        const { team } = context;
        const breadcrumbs = crumbsFor(language, [staticCrumb(language, 'tournaments', '/tournaments')]);
        if (team) {
            const event = `${team.placement ? t('seo.tournamentTeam.placement', { placement: team.placement, tournament: team.tournament }) : team.tournament}${team.format ? ` (${team.format})` : ''}`;
            return {
                ...base,
                key: 'tournamentTeam',
                title: withBrand(team.title),
                description: t('seo.tournamentTeam.description', { event }),
                breadcrumbs: [...breadcrumbs, { name: team.title, path }],
            };
        }
        return {
            ...base,
            key: 'tournamentTeam',
            title: withBrand(t('seo.tournamentTeam.title')),
            description: t('seo.tournamentTeam.fallbackDescription'),
            breadcrumbs,
        };
    }

    // A shared team's public page (/t/:id). The server looks the team up
    // (api/_lib/sharedTeam.js); with it, the card names the team and its six
    // and carries the generated image of them.
    if (section === 't' && param && !extra) {
        const { sharedTeam } = context;
        const crumbs = (name) => crumbsFor(language, [{ name, path }]);
        if (sharedTeam?.pokemons?.length) {
            const name = sharedTeam.name || t('seo.sharedTeamPage.untitled');
            const members = joinList(sharedTeam.pokemons.map((p) => formatSlug(p.name)), language);
            return {
                ...base,
                key: 'sharedTeamPage',
                title: withBrand(t('seo.sharedTeamPage.title', { name })),
                description: t('seo.sharedTeamPage.description', { members }),
                image: `${SITE_URL}/api/og?team=${encodeURIComponent(param)}&lang=${language}`,
                breadcrumbs: crumbs(name),
            };
        }
        return {
            ...base,
            key: 'sharedTeamPage',
            title: withBrand(t('seo.sharedTeam.title')),
            description: t('seo.sharedTeam.description'),
            breadcrumbs: crumbs(t('seo.sharedTeam.title')),
        };
    }

    if (section === 'teams' && param && !extra) {
        return { ...base, key: 'sharedTeam', title: withBrand(t('seo.sharedTeam.title')), description: t('seo.sharedTeam.description') };
    }

    const detailSections = { moves: 'move', abilities: 'ability', items: 'item' };
    if (detailSections[section] && param && !extra) {
        const key = detailSections[section];
        const name = context.name || formatSlug(param);
        return {
            ...base,
            key,
            title: withBrand(t(`seo.${key}.title`, { name })),
            description: t(`seo.${key}.description`, { name }),
            breadcrumbs: crumbsFor(language, [staticCrumb(language, section, `/${section}`), { name, path }]),
        };
    }

    if (section === 'types' && param && !extra && typeChart[param]) {
        const type = typeName(param, language);
        const weak = weaknessesOf([param]).map((w) => typeName(w.type, language));
        const strong = strongAgainst(param).map((x) => typeName(x, language));
        const none = t('seo.type.none');
        return {
            ...base,
            key: 'type',
            title: withBrand(t('seo.type.title', { type })),
            description: t('seo.type.description', {
                type,
                weaknesses: joinList(weak, language) || none,
                strong: joinList(strong, language) || none,
            }),
            breadcrumbs: crumbsFor(language, [staticCrumb(language, 'types', '/types'), { name: type, path }]),
        };
    }

    return base;
}

/**
 * schema.org JSON-LD for a page: the site and the app on Home, a breadcrumb
 * trail everywhere else. `searchPath` is the page that honours `?q=`.
 */
export function structuredData(meta, language) {
    const inLanguage = LOCALE_TAG[language];
    const abs = (appPath) => `${SITE_URL}${localizePath(appPath, language)}`;
    const blocks = [];
    if (meta.key === 'home') {
        blocks.push({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            url: abs('/'),
            inLanguage,
            potentialAction: {
                '@type': 'SearchAction',
                target: { '@type': 'EntryPoint', urlTemplate: `${abs('/pokedex')}?q={search_term_string}` },
                'query-input': 'required name=search_term_string',
            },
        });
        blocks.push({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: SITE_NAME,
            url: abs('/'),
            description: meta.description,
            inLanguage,
            applicationCategory: 'GameApplication',
            operatingSystem: 'Web',
            image: DEFAULT_IMAGE,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        });
    }
    if (meta.breadcrumbs?.length) {
        blocks.push({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: meta.breadcrumbs.map((crumb, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: crumb.name,
                item: abs(crumb.path),
            })),
        });
    }
    return blocks;
}

/** JSON for a `<script type="application/ld+json">`, safe to inline in HTML. */
export const jsonLdScript = (data) => JSON.stringify(data).replace(/</g, '\\u003c');
