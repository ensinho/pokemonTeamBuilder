// The text of a page, as plain HTML inside #root, for readers that never run
// the app's JavaScript (Bing's first pass, link-preview bots, AI crawlers) and
// for Google when its render budget runs out. React's createRoot replaces it
// on mount, so a person never sees it; it is visually hidden until then
// (index.html's `.seo-prerender`) so a slow connection doesn't flash unstyled
// text either. It carries the same facts the rendered page shows — never
// anything a visitor wouldn't find there.
//
// Order matters to readers that skim (2026-10-30): the breadcrumb, then
// <main> — its H1 and a first paragraph that says what the page is — and the
// site's own name and links last, in a <footer>. Before, every page opened
// with the brand link in a <p>, so "the first paragraph" of every page was the
// word PokemonBuilder.
//
// Pure: everything arrives as arguments, so api/render-meta.test.js can
// snapshot it without a filesystem.

import { escapeHtml } from './forumMeta.js';
import { translate } from '../../src/utils/translateCore.js';
import { localizePath } from '../../src/utils/localePath.js';
import { formatSlug, typeName } from '../../src/utils/seoPages.js';
import { immunitiesOf, resistancesOf, strongAgainst, weaknessesOf } from '../../src/utils/typeMatchups.js';
import { typeChart } from '../../src/constants/typeChart.js';
import { GUIDE_INDEX } from '../../src/content/guideIndex.js';
import { bestTeamsNotes, dayLabel, metaNotes } from '../../src/utils/dataNotes.js';
import { SITE_PAGE_PATHS } from '../../src/utils/seoPages.js';

const NAV = [
    ['/builder', 'builder'],
    ['/pokedex', 'pokedex'],
    ['/types', 'types'],
    ['/meta', 'meta'],
    ['/best-teams', 'bestTeams'],
    ['/tournaments', 'tournaments'],
    ['/damage-calculator', 'damageCalculator'],
    ['/speed-tiers', 'speedTiers'],
    ['/challenge', 'challenge'],
    ['/pokepuzzle', 'pokepuzzle'],
    ['/guides', 'guides'],
];

const MOVE_TYPE = (raw) => String(raw || '').toLowerCase();
/** How many holders of an ability the page lists before "and more". */
const HOLDER_LIMIT = 60;
/** How many of the default format's Pokémon the Meta page's HTML lists. */
const META_TOP = 30;

const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const LANDING_FEATURES = ['builder', 'pokedex', 'calc', 'meta', 'types', 'challenge'];
const LANDING_LINKS = {
    builder: '/builder', pokedex: '/pokedex', calc: '/damage-calculator', meta: '/meta', types: '/types', challenge: '/challenge',
};

/**
 * `entity` — { kind: 'move'|'ability'|'item', data } from the baked dex
 * (battle-dex.json / seo-dex.json, see render-meta.js); `guide` — a guide's
 * text (content/guides.js); `usage` — the default format, for /meta;
 * `notes` — the numbers behind the data notes (bestTeams: generatedAt;
 * meta: format, battles, month, kind); `sitePage` — About / How it works /
 * Privacy / Terms (content/sitePages.js); `notFound` — the page does not exist.
 */
export function renderSnapshot({ meta, language, appPath, pokemon = null, team = null, sharedTeam = null, presence = null, bestTeams = null, build = null, pokemons = [], entity = null, guide = null, sitePage = null, usage = null, notes = null, notFound = false }) {
    const t = (key, params) => translate(language, key, params);
    const href = (path) => escapeHtml(localizePath(path, language));
    const link = (path, text) => `<a href="${href(path)}">${escapeHtml(text)}</a>`;
    const list = (items) => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '');
    const typeLink = (type) => link(`/types/${type}`, typeName(type, language));

    const slugOf = (id) => pokemons.find((p) => p.id === id)?.name || id;
    // A guide's or a site page's sections, as GuideView / InfoPageView draw
    // them. A link with `href` leaves the site (GitHub, mailto).
    const sectionsHtml = (sections) => sections.map((section) => [
        `<h2>${escapeHtml(section.heading)}</h2>`,
        ...(section.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
        section.steps?.length ? `<ol>${section.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>` : '',
        section.links?.length
            ? `<p>${section.links.map((l) => (l.href ? `<a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>` : link(l.to, l.label))).join(' · ')}</p>`
            : '',
    ].join('')).join('');
    const notesSection = (paragraphs) => (paragraphs.length
        ? `<h2>${escapeHtml(t('dataNotes.heading'))}</h2>${paragraphs.map((x) => `<p>${escapeHtml(x)}</p>`).join('')}<p>${link('/guides/team-from-tournament-data', t('dataNotes.guideLink'))}</p>`
        : '');

    const parts = [];
    if (meta.breadcrumbs?.length) {
        parts.push(`<nav aria-label="breadcrumb"><ol>${meta.breadcrumbs.map((c) => `<li>${link(c.path, c.name)}</li>`).join('')}</ol></nav>`);
    }

    const body = [];
    if (notFound) {
        body.push(`<h1>${escapeHtml(t('seo.notFound.title'))}</h1>`);
        body.push(`<p>${escapeHtml(t('seo.notFound.description'))}</p>`);
        body.push(`<p>${escapeHtml(t('seo.snapshot.notFound'))}</p>`);
        body.push(list(NAV.map(([path, key]) => link(path, t(`seo.${key}.title`)))));
    } else if (meta.key === 'home') {
        body.push(`<h1>${escapeHtml(t('landing.title'))}</h1>`);
        body.push(`<p>${escapeHtml(t('landing.lede'))}</p>`);
        body.push(`<p>${link('/builder', t('landing.primaryCta'))} · ${link('/pokedex', t('landing.secondaryCta'))}</p>`);
        body.push(`<h2>${escapeHtml(t('landing.featuresTitle'))}</h2>`);
        body.push(list(LANDING_FEATURES.map((f) => `<h3>${link(LANDING_LINKS[f], t(`landing.features.${f}.title`))}</h3><p>${escapeHtml(t(`landing.features.${f}.body`))}</p>`)));
    } else {
        // The page title without the brand suffix reads as the page's heading.
        body.push(`<h1>${escapeHtml(meta.title.replace(/ \| PokemonBuilder$/, ''))}</h1>`);
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

    // The page's "Most used build" card (utils/mostUsedBuild.js): what players
    // run on the ladder of the default format, each pick with its share.
    if ((meta.key === 'pokemon' || meta.key === 'metaPokemon') && pokemon && build?.data) {
        const b = build.data;
        const label = (key) => escapeHtml(t(`pdetail.build.${key}`));
        const pick = (p) => `${escapeHtml(p.name)} (${p.share}%)`;
        const rows = [
            b.item ? `${label('item')}: ${pick(b.item)}` : null,
            b.ability ? `${label('ability')}: ${pick(b.ability)}` : null,
            b.spread ? `${label('spread')}: ${escapeHtml([b.spread.nature, b.spread.evs].filter(Boolean).join(' · '))} (${b.spread.share}%)` : null,
            b.tera ? `${label('tera')}: ${pick(b.tera)}` : null,
            b.moves.length ? `${label('moves')}: ${b.moves.map(pick).join(', ')}` : null,
        ].filter(Boolean);
        body.push(`<h2>${escapeHtml(t('seo.snapshot.build', { name: formatSlug(pokemon.name), format: build.format }))}</h2>`);
        body.push(list(rows));
    }

    // What the page's "In tournaments" card shows (utils/tournamentPresence.js):
    // the teams that carried it and the partners it was built with.
    if ((meta.key === 'pokemon' || meta.key === 'metaPokemon') && pokemon && presence?.count) {
        body.push(`<h2>${escapeHtml(t('seo.snapshot.tournamentTeams', { name: formatSlug(pokemon.name) }))}</h2>`);
        body.push(`<p>${escapeHtml(t('seo.snapshot.tournamentShare', { count: presence.count, total: presence.total }))}</p>`);
        body.push(list(presence.teams.map((tm) => {
            const event = [tm.tournament, tm.placement, tm.format].filter(Boolean).join(' · ');
            return `${link(`/tournaments/team/${tm.id}`, tm.title || tm.tournament)}${event ? ` — ${escapeHtml(event)}` : ''}`;
        })));
        body.push(`<p>${link('/best-teams', t('seo.bestTeams.title'))}</p>`);
        if (presence.partners.length) {
            body.push(`<h2>${escapeHtml(t('seo.snapshot.tournamentPartners'))}</h2>`);
            body.push(list(presence.partners.map((p) => (
                `${link(`/pokemon/${slugOf(p.id)}`, formatSlug(p.name))} (${escapeHtml(t('seo.snapshot.timesTogether', { count: p.count }))})`
            ))));
        }
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

    // The best-teams page (utils/bestTeams.js): the same three lists the page draws.
    if (meta.key === 'bestTeams' && bestTeams) {
        const mon = (p) => link(`/pokemon/${slugOf(p.id)}`, formatSlug(p.name));
        body.push(`<p>${escapeHtml(t('bestTeamsPage.lede', { total: bestTeams.total, events: bestTeams.events }))}</p>`);
        body.push(`<h2>${escapeHtml(t('bestTeamsPage.top'))}</h2>`);
        body.push(list(bestTeams.top.map((tm) => {
            const event = [tm.placement, tm.tournament, tm.player].filter(Boolean).join(' · ');
            const members = (tm.pokemons || []).map((p) => escapeHtml(formatSlug(p.name))).join(', ');
            return `${link(`/tournaments/team/${tm.id}`, tm.title || tm.tournament)}${event ? ` — ${escapeHtml(event)}` : ''}${members ? `: ${members}` : ''}`;
        })));
        body.push(`<h2>${escapeHtml(t('bestTeamsPage.pokemon'))}</h2>`);
        body.push(list(bestTeams.pokemon.map((p) => `${mon(p)} (${escapeHtml(t('bestTeamsPage.pokemonShare', { share: p.share }))})`)));
        body.push(`<h2>${escapeHtml(t('bestTeamsPage.pairs'))}</h2>`);
        body.push(list(bestTeams.pairs.map((pair) => `${mon(pair.a)} + ${mon(pair.b)} (${escapeHtml(t('bestTeamsPage.pairShare', { count: pair.count }))})`)));
        body.push(notesSection(bestTeamsNotes({ ...bestTeams, generatedAt: notes?.generatedAt }, language)));
    }

    // Move, ability and item pages: the facts the page shows, from the dex
    // the battle tooltips use (the page itself fetches PokéAPI in the browser).
    if (!notFound && entity?.kind === 'move') {
        const [name, rawType, category, power, accuracy, pp, desc] = entity.data;
        const type = MOVE_TYPE(rawType);
        const categoryText = t(`seo.snapshot.categories.${category}`);
        body.push(`<p>${escapeHtml(t('seo.snapshot.moveFacts', { name, type: typeName(type, language), category: categoryText }))}</p>`);
        body.push(list([
            `${escapeHtml(t('seo.snapshot.type'))}: ${typeChart[type] ? typeLink(type) : escapeHtml(rawType)}`,
            `${escapeHtml(t('seo.snapshot.category'))}: ${escapeHtml(categoryText)}`,
            power ? `${escapeHtml(t('seo.snapshot.power'))}: ${power}` : null,
            `${escapeHtml(t('seo.snapshot.accuracy'))}: ${accuracy === true ? escapeHtml(t('seo.snapshot.alwaysHits')) : `${accuracy}%`}`,
            `${escapeHtml(t('seo.snapshot.pp'))}: ${pp}`,
        ].filter(Boolean)));
        if (desc) body.push(`<h2>${escapeHtml(t('seo.snapshot.whatItDoes', { name }))}</h2><p>${escapeHtml(desc)}</p>`);
    }
    if (!notFound && entity?.kind === 'ability') {
        const [name, desc, holders] = entity.data;
        if (desc) body.push(`<h2>${escapeHtml(t('seo.snapshot.whatItDoes', { name }))}</h2><p>${escapeHtml(desc)}</p>`);
        const shown = (holders || []).filter((id) => pokemons.some((p) => p.id === id));
        if (shown.length) {
            body.push(`<h2>${escapeHtml(t('seo.snapshot.abilityHolders', { name }))}</h2>`);
            body.push(list(shown.slice(0, HOLDER_LIMIT).map((id) => link(`/pokemon/${slugOf(id)}`, formatSlug(slugOf(id))))));
        }
    }
    if (!notFound && entity?.kind === 'item') {
        const [name, desc, megaFor] = entity.data;
        if (desc) body.push(`<h2>${escapeHtml(t('seo.snapshot.whatItDoes', { name }))}</h2><p>${escapeHtml(desc)}</p>`);
        if (megaFor && pokemons.some((p) => p.id === megaFor)) {
            const slug = slugOf(megaFor);
            // Left as {{pokemon}} by translate (no value given), then swapped for the link.
            body.push(`<p>${escapeHtml(t('seo.snapshot.itemMega', { name })).replace('{{pokemon}}', link(`/pokemon/${slug}`, formatSlug(slug)))}</p>`);
        }
    }

    // The guides: the index lists them; a guide is its full text (the same
    // sections and FAQ GuideView draws).
    if (!notFound && meta.key === 'guides') {
        body.push(list(GUIDE_INDEX.map((g) => {
            const copy = g[language] || g.en;
            return `<h2>${link(`/guides/${g.slug}`, copy.title)}</h2><p>${escapeHtml(copy.description)}</p>`;
        })));
    }
    if (!notFound && meta.key === 'guide' && guide) {
        body.push(`<p>${escapeHtml(guide.lede)}</p>`);
        body.push(sectionsHtml(guide.sections));
        if (guide.faq?.length) {
            body.push(`<h2>${escapeHtml(t('guidesPage.faq'))}</h2>`);
            for (const item of guide.faq) body.push(`<h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p>`);
        }
        const others = GUIDE_INDEX.filter((g) => g.slug !== meta.guide);
        if (others.length) {
            body.push(`<h2>${escapeHtml(t('guidesPage.more'))}</h2>`);
            body.push(list(others.map((g) => link(`/guides/${g.slug}`, (g[language] || g.en).title))));
        }
    }

    // About, How it works, Privacy, Terms: the full text, dated.
    if (!notFound && sitePage) {
        body.push(`<p>${escapeHtml(t('sitePages.updated', { date: dayLabel(sitePage.updated, language) }))}</p>`);
        body.push(`<p>${escapeHtml(sitePage.lede)}</p>`);
        body.push(sectionsHtml(sitePage.sections));
    }

    // Meta & usage: the default format's ranking, as the page opens on it, and
    // where the numbers come from.
    if (!notFound && meta.key === 'meta' && usage?.top?.length) {
        body.push(`<h2>${escapeHtml(t('seo.snapshot.mostUsed', { format: usage.label }))}</h2>`);
        body.push(`<ol>${usage.top.slice(0, META_TOP).map((row) => (
            `<li>${link(`/meta/${slugOf(row.id)}`, row.name || formatSlug(slugOf(row.id)))} (${escapeHtml(t('seo.snapshot.usageShare', { share: row.usage }))})</li>`
        )).join('')}</ol>`);
    }
    if (!notFound && meta.key === 'meta' && notes) body.push(notesSection(metaNotes(notes, language)));

    if (meta.key === 'types') {
        body.push(`<h2>${escapeHtml(t('seo.snapshot.allTypes'))}</h2>${list(Object.keys(typeChart).map(typeLink))}`);
    }

    if (meta.key === 'pokedex' && pokemons.length) {
        body.push(`<h2>${escapeHtml(t('seo.snapshot.allPokemon'))}</h2>`);
        body.push(list(pokemons.filter((p) => p.id <= 1025).map((p) => link(`/pokemon/${p.name}`, `#${p.id} ${formatSlug(p.name)}`))));
    }

    if (meta.key === 'sharedTeamPage' && sharedTeam?.pokemons?.length) {
        body.push(`<h2>${escapeHtml(t('seo.snapshot.roster'))}</h2>`);
        body.push(list(sharedTeam.pokemons.map((p) => {
            const types = p.types.filter((x) => typeChart[x]).map(typeLink).join(' / ');
            return `${link(`/pokemon/${p.id}`, formatSlug(p.name))}${types ? ` — ${types}` : ''}`;
        })));
    }

    if (meta.key === 'tournamentTeam' && team?.pokemons?.length) {
        const names = team.pokemons.map((p) => p?.name || p?.species || '').filter(Boolean);
        if (names.length) body.push(`<h2>${escapeHtml(t('seo.snapshot.roster'))}</h2>${list(names.map((n) => escapeHtml(n)))}`);
    }

    parts.push(`<main>${body.join('')}</main>`);
    const siteLinks = list(Object.entries(SITE_PAGE_PATHS).map(([path, key]) => link(path, t(`sitePages.links.${key}`))));
    parts.push(`<footer><a href="${href('/')}">${escapeHtml(t('seo.siteName'))}</a><nav aria-label="${escapeHtml(t('seo.snapshot.explore'))}">${list(NAV.map(([path, key]) => link(path, t(`seo.${key}.title`))))}</nav><nav aria-label="${escapeHtml(t('sitePages.footerLabel'))}">${siteLinks}</nav></footer>`);
    return `<div class="seo-prerender">${parts.join('')}</div>`;
}
