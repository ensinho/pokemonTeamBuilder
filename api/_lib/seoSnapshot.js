// The text of a page, as plain HTML inside #root, for readers that never run
// the app's JavaScript (Bing's first pass, link-preview bots, AI crawlers) and
// for Google when its render budget runs out. React's createRoot replaces it
// on mount, so a person never sees it; it is visually hidden until then
// (index.html's `.seo-prerender`) so a slow connection doesn't flash unstyled
// text either. It carries the same facts the rendered page shows — never
// anything a visitor wouldn't find there.
//
// Pure: everything arrives as arguments, so api/render-meta.test.js can
// snapshot it without a filesystem.

import { escapeHtml } from './forumMeta.js';
import { translate } from '../../src/utils/translateCore.js';
import { localizePath } from '../../src/utils/localePath.js';
import { formatSlug, typeName } from '../../src/utils/seoPages.js';
import { immunitiesOf, resistancesOf, strongAgainst, weaknessesOf } from '../../src/utils/typeMatchups.js';
import { typeChart } from '../../src/constants/typeChart.js';

const NAV = [
    ['/builder', 'builder'],
    ['/pokedex', 'pokedex'],
    ['/types', 'types'],
    ['/meta', 'meta'],
    ['/tournaments', 'tournaments'],
    ['/damage-calculator', 'damageCalculator'],
    ['/speed-tiers', 'speedTiers'],
    ['/challenge', 'challenge'],
    ['/pokepuzzle', 'pokepuzzle'],
];

const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const LANDING_FEATURES = ['builder', 'pokedex', 'calc', 'meta', 'types', 'challenge'];
const LANDING_LINKS = {
    builder: '/builder', pokedex: '/pokedex', calc: '/damage-calculator', meta: '/meta', types: '/types', challenge: '/challenge',
};

export function renderSnapshot({ meta, language, appPath, pokemon = null, team = null, pokemons = [] }) {
    const t = (key, params) => translate(language, key, params);
    const href = (path) => escapeHtml(localizePath(path, language));
    const link = (path, text) => `<a href="${href(path)}">${escapeHtml(text)}</a>`;
    const list = (items) => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '');
    const typeLink = (type) => link(`/types/${type}`, typeName(type, language));

    const parts = [];
    parts.push(`<header><p>${link('/', t('seo.siteName'))}</p><nav aria-label="${escapeHtml(t('seo.snapshot.explore'))}">${list(NAV.map(([path, key]) => link(path, t(`seo.${key}.title`))))}</nav></header>`);

    if (meta.breadcrumbs?.length) {
        parts.push(`<nav aria-label="breadcrumb"><ol>${meta.breadcrumbs.map((c) => `<li>${link(c.path, c.name)}</li>`).join('')}</ol></nav>`);
    }

    const body = [];
    if (meta.key === 'home') {
        body.push(`<h1>${escapeHtml(t('landing.title'))}</h1>`);
        body.push(`<p>${escapeHtml(t('landing.lede'))}</p>`);
        body.push(`<p>${link('/builder', t('landing.primaryCta'))} · ${link('/pokedex', t('landing.secondaryCta'))}</p>`);
        body.push(`<h2>${escapeHtml(t('landing.featuresTitle'))}</h2>`);
        body.push(list(LANDING_FEATURES.map((f) => `<h3>${link(LANDING_LINKS[f], t(`landing.features.${f}.title`))}</h3><p>${escapeHtml(t(`landing.features.${f}.body`))}</p>`)));
    } else {
        // The page title without the brand suffix reads as the page's heading.
        body.push(`<h1>${escapeHtml(meta.title.replace(/ \| Pokémon Team Builder$/, ''))}</h1>`);
        body.push(`<p>${escapeHtml(meta.description)}</p>`);
    }

    if (meta.key === 'pokemon' && pokemon) {
        const types = (pokemon.types || []).filter((x) => typeChart[x]);
        body.push(`<p>${types.map(typeLink).join(' / ')}</p>`);
        const weak = weaknessesOf(types);
        if (weak.length) {
            body.push(`<h2>${escapeHtml(t('seo.snapshot.weakTo'))}</h2>`);
            body.push(list(weak.map((w) => `${typeLink(w.type)} (${w.multiplier}×)`)));
        }
        const resists = resistancesOf(types);
        if (resists.length) {
            body.push(`<h2>${escapeHtml(t('seo.snapshot.resists'))}</h2>`);
            body.push(list(resists.map((r) => `${typeLink(r.type)} (${r.multiplier}×)`)));
        }
        const immune = immunitiesOf(types);
        if (immune.length) {
            body.push(`<h2>${escapeHtml(t('seo.snapshot.immuneTo'))}</h2>`);
            body.push(list(immune.map(typeLink)));
        }
        if (pokemon.baseStats) {
            body.push(`<h2>${escapeHtml(t('seo.snapshot.baseStats'))}</h2>`);
            body.push(list(STAT_KEYS
                .filter((k) => Number.isFinite(pokemon.baseStats[k]))
                .map((k) => `${escapeHtml(t(`seo.snapshot.stats.${k}`))}: ${pokemon.baseStats[k]}`)));
        }
        body.push(`<p>${link(`/meta/${pokemon.name}`, t('seo.metaPokemon.title', { name: formatSlug(pokemon.name) }))}</p>`);
    }

    if (meta.key === 'type') {
        const type = appPath.split('/')[2];
        const weak = weaknessesOf([type]).map((w) => w.type);
        const strong = strongAgainst(type);
        if (weak.length) body.push(`<h2>${escapeHtml(t('seo.snapshot.weakTo'))}</h2>${list(weak.map(typeLink))}`);
        if (strong.length) body.push(`<h2>${escapeHtml(t('seo.snapshot.strongAgainst'))}</h2>${list(strong.map(typeLink))}`);
        const ofType = pokemons.filter((p) => p.types?.includes(type) && p.id <= 1025);
        if (ofType.length) {
            body.push(`<h2>${escapeHtml(t('seo.snapshot.pokemonOfType', { type: typeName(type, language) }))}</h2>`);
            body.push(list(ofType.map((p) => link(`/pokemon/${p.name}`, formatSlug(p.name)))));
        }
    }

    if (meta.key === 'types') {
        body.push(`<h2>${escapeHtml(t('seo.snapshot.allTypes'))}</h2>${list(Object.keys(typeChart).map(typeLink))}`);
    }

    if (meta.key === 'pokedex' && pokemons.length) {
        body.push(`<h2>${escapeHtml(t('seo.snapshot.allPokemon'))}</h2>`);
        body.push(list(pokemons.filter((p) => p.id <= 1025).map((p) => link(`/pokemon/${p.name}`, `#${p.id} ${formatSlug(p.name)}`))));
    }

    if (meta.key === 'tournamentTeam' && team?.pokemons?.length) {
        const names = team.pokemons.map((p) => p?.name || p?.species || '').filter(Boolean);
        if (names.length) body.push(`<h2>${escapeHtml(t('seo.snapshot.roster'))}</h2>${list(names.map((n) => escapeHtml(n)))}`);
    }

    parts.push(`<main>${body.join('')}</main>`);
    return `<div class="seo-prerender">${parts.join('')}</div>`;
}
