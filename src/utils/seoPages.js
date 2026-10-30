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
import { guideMeta } from '../content/guideIndex.js';
import { STRUCTURED_COPY } from '../content/structuredCopy.js';

export { TYPE_IDS, strongAgainst, weaknessesOf };

export const SITE_URL = 'https://pokemonbuilder.app';
export const SITE_NAME = 'PokemonBuilder';
/** What people search for, and what the site was called until 2026-10-26 —
 *  given to search engines as the brand's alternate names (JSON-LD). */
export const SITE_ALTERNATE_NAMES = ['Pokémon Builder', 'Pokémon Team Builder', 'Pokemon Team Builder'];
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
/** Who makes the site — the Organization JSON-LD on every page, which is how
 *  search engines and AI assistants learn what PokemonBuilder is (2026-10-30). */
export const SITE_LOGO = `${SITE_URL}/android-chrome-512x512.png`;
export const SITE_FOUNDER = 'Enzo Esmeraldo';
export const SITE_SAME_AS = ['https://github.com/ensinho/pokemonTeamBuilder'];
/** Where people (and the About / Privacy pages) reach the site. */
export const SITE_CONTACT_EMAIL = 'pokemonteambuilderadmin@gmail.com';
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;


/** The site's own pages — About, How it works, Privacy, Terms — in the order
 *  the footers list them. Their text is content/sitePages.js, kept out of
 *  this file because this one rides the main bundle. */
export const SITE_PAGE_PATHS = {
    '/about': 'about',
    '/methodology': 'methodology',
    '/privacy': 'privacy',
    '/terms': 'terms',
};

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
    '/best-teams': 'bestTeams',
    '/guides': 'guides',
    ...SITE_PAGE_PATHS,
};

/** The pages that are a tool you use (WebApplication JSON-LD, with the
 *  feature list in content/structuredCopy.js). */
const TOOL_PAGES = new Set(['home', 'builder', 'damageCalculator', 'speedTiers', 'meta', 'pokedex', 'types']);

const PAGE_IMAGES = {
    pokepuzzle: `${SITE_URL}/pokepuzzle-og.png`,
    challenge: `${SITE_URL}/challenge-og.png`,
};

/** The daily games whose links can carry a result, and the code each takes. */
const RESULT_PAGES = { pokepuzzle: 'puzzle', challenge: 'challenge' };

const dayLabel = (dayKey, language) => new Intl.DateTimeFormat(LOCALE_TAG[language], { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${dayKey}T12:00:00Z`));

/**
 * Title, description and the image's lines for a decoded result
 * (`{ kind: 'puzzle'|'challenge', code, data }`). api/_lib/ogImage.js draws
 * the same words, so the card and the text under it agree.
 */
export function resultShareMeta({ kind, data }, language) {
    const t = (key, params) => translate(language, `seo.resultShare.${key}`, params);
    if (kind === 'puzzle') {
        const score = `${data.won ? data.attempts : 'X'}/${data.maxAttempts}`;
        return {
            title: data.puzzleNumber ? t('puzzleTitle', { n: data.puzzleNumber, score }) : t('puzzleFreeTitle', { score }),
            description: data.won ? t('puzzleWon', { attempts: data.attempts, max: data.maxAttempts }) : t('puzzleLost'),
            score,
            cta: t('puzzleCta'),
        };
    }
    const facts = [
        data.won ? t('standing', { n: data.remaining }) : null,
        data.score ? t('score', { n: data.score }) : null,
        data.streak > 1 ? t('streak', { n: data.streak }) : null,
    ].filter(Boolean);
    return {
        title: data.won ? t('challengeWon', { turns: data.turns }) : t('challengeLost'),
        description: t('challengeDescription', { date: dayLabel(data.dayKey, language) }),
        date: dayLabel(data.dayKey, language),
        facts,
        cta: t('challengeCta'),
    };
}

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
    // A shared daily result (`?r=`, utils/resultShareCode.js): the page stays
    // the game's, but the preview is the sharer's result, drawn by api/og.js.
    const { result } = context;
    if (staticKey && result && RESULT_PAGES[staticKey] === result.kind) {
        const share = resultShareMeta(result, language);
        return {
            ...base,
            key: staticKey,
            title: withBrand(share.title),
            description: share.description,
            image: `${SITE_URL}/api/og?${result.kind}=${encodeURIComponent(result.code)}&lang=${language}`,
            breadcrumbs: crumbsFor(language, [staticCrumb(language, staticKey, path)]),
            isStatic: true,
        };
    }
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
        // The card api/og.js draws for it: art, types, weaknesses (2026-10-24).
        const image = pokemon?.id ? `${SITE_URL}/api/og?pokemon=${pokemon.id}&lang=${language}` : DEFAULT_IMAGE;
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

    // A guide (/guides/:slug, content/guides.js): titled from guideIndex.js so
    // the client and the server agree without loading the guide's text.
    if (section === 'guides' && param && !extra) {
        const guide = guideMeta(param, language);
        if (guide) {
            return {
                ...base,
                key: 'guide',
                guide: guide.slug,
                updated: guide.updated,
                title: withBrand(guide.title),
                description: guide.description,
                breadcrumbs: crumbsFor(language, [staticCrumb(language, 'guides', '/guides'), { name: guide.title, path }]),
            };
        }
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
            image: `${SITE_URL}/api/og?type=${param}&lang=${language}`,
            breadcrumbs: crumbsFor(language, [staticCrumb(language, 'types', '/types'), { name: type, path }]),
        };
    }

    return base;
}

/**
 * schema.org JSON-LD for a page. Every page names the Organization behind the
 * site; Home adds the WebSite (with its search) and the app; a tool page adds
 * itself as a WebApplication with what it does; deeper pages get a breadcrumb
 * trail. `extras.faq` ([{ q, a }], a guide's visible FAQ) adds a FAQPage, and
 * a guide is an Article. `searchPath` is the page that honours `?q=`.
 */
export function structuredData(meta, language, extras = {}) {
    const copy = STRUCTURED_COPY[language] || STRUCTURED_COPY.en;
    const inLanguage = LOCALE_TAG[language];
    const abs = (appPath) => `${SITE_URL}${localizePath(appPath, language)}`;
    const context = 'https://schema.org';
    const blocks = [{
        '@context': context,
        '@type': 'Organization',
        '@id': ORG_ID,
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAMES,
        url: `${SITE_URL}/`,
        logo: SITE_LOGO,
        description: copy.org,
        founder: { '@type': 'Person', name: SITE_FOUNDER },
        sameAs: SITE_SAME_AS,
        contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: SITE_CONTACT_EMAIL, availableLanguage: ['en', 'pt'] },
    }];
    if (meta.key === 'home') {
        blocks.push({
            '@context': context,
            '@type': 'WebSite',
            '@id': WEBSITE_ID,
            name: SITE_NAME,
            alternateName: SITE_ALTERNATE_NAMES,
            url: abs('/'),
            inLanguage,
            publisher: { '@id': ORG_ID },
            potentialAction: {
                '@type': 'SearchAction',
                target: { '@type': 'EntryPoint', urlTemplate: `${abs('/pokedex')}?q={search_term_string}` },
                'query-input': 'required name=search_term_string',
            },
        });
    }
    if (TOOL_PAGES.has(meta.key)) {
        blocks.push({
            '@context': context,
            '@type': 'WebApplication',
            name: meta.key === 'home' ? SITE_NAME : meta.title.replace(` | ${SITE_NAME}`, ''),
            ...(meta.key === 'home' ? { alternateName: SITE_ALTERNATE_NAMES } : {}),
            url: abs(meta.canonicalPath || '/'),
            description: meta.description,
            inLanguage,
            applicationCategory: 'GameApplication',
            operatingSystem: 'Web',
            isAccessibleForFree: true,
            image: meta.image || DEFAULT_IMAGE,
            featureList: copy.features[meta.key] || [],
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            publisher: { '@id': ORG_ID },
        });
    }
    if (meta.key === 'about') {
        blocks.push({
            '@context': context,
            '@type': 'AboutPage',
            name: meta.title.replace(` | ${SITE_NAME}`, ''),
            description: meta.description,
            url: abs(meta.canonicalPath),
            inLanguage,
            mainEntity: { '@id': ORG_ID },
        });
    }
    if (meta.key === 'guide') {
        blocks.push({
            '@context': context,
            '@type': 'Article',
            headline: meta.title.replace(` | ${SITE_NAME}`, ''),
            description: meta.description,
            inLanguage,
            url: abs(meta.canonicalPath),
            mainEntityOfPage: abs(meta.canonicalPath),
            datePublished: meta.updated,
            dateModified: meta.updated,
            author: { '@id': ORG_ID },
            publisher: { '@id': ORG_ID },
            image: meta.image || DEFAULT_IMAGE,
        });
    }
    if (extras.faq?.length) {
        blocks.push({
            '@context': context,
            '@type': 'FAQPage',
            inLanguage,
            mainEntity: extras.faq.map(({ q, a }) => ({
                '@type': 'Question',
                name: q,
                acceptedAnswer: { '@type': 'Answer', text: a },
            })),
        });
    }
    if (meta.breadcrumbs?.length) {
        blocks.push({
            '@context': context,
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
