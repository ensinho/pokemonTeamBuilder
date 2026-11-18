import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import '../../styles/entity-detail-view.css';
import '../../styles/meta-view.css';
import {
    ChevronLeft, TrendingUp, Swords, Sparkles, Package,
    Zap, BookOpen, Trophy, ArrowUpRight,
} from 'lucide-react';

import { toneInk, toneWash } from '../../utils/toneInk';
import { typeColors, typeIcons } from '../../constants/types';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { getPokemonFrontSpriteUrl, getPokemonArtworkSpriteUrl, resolveMegaPokemonEntry } from '../../utils/pokemonSprites';
import { useMegaStones } from '../../hooks/useMegaStones';
import { itemSpriteUrl } from '../../utils/itemSuggestions';
import { primaryMoves, setSpreadParts, titleCaseSlug, toApiSlug } from '../../utils/smogonSets';
import { looksLikeStatPoints } from '../../utils/statPoints';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTournamentData } from '../../hooks/useTournamentData';
import { useUsageIndex, useUsageFormat } from '../../hooks/useUsageStats';
import { useSmogonData } from '../../hooks/useSmogonData';
import { useMoveTypes } from '../../hooks/useMoveTypes';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useEntityNavigate, useSmartBack } from '../../hooks/useEntityNavigate';
import { EmptyState } from '../EmptyState';
import { Loader } from '../Loader';
import { UsageBar, MoveChip, Panel, SourceCredit } from './metaShared';
import { pretty, pctOf, formatUsageSpread } from '../../utils/metaFormat';
import { FormatPicker } from './metaControls';

const slugify = toApiSlug;

// Pikalytics keys its pages by the same Smogon format ids we bake, for the VGC
// and Champions ladders. The base species name is the page: a mega form is a
// set of its base there, not a Pokémon of its own.
const pikalyticsUrl = (formatId, name) => {
    if (!formatId || !name || !/^gen9(champions|vgc)/.test(formatId)) return null;
    const base = String(name).replace(/-Mega(-[A-Z])?$/, '');
    return `https://www.pikalytics.com/pokedex/${formatId}/${encodeURIComponent(base)}`;
};
const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

// Borderless figure + muted word readout (<dl>/<dd>/<dt>, zero nested tiles or icon clutter).
function HeroMetric({ value, label, tone = '' }) {
    return (
        <div className="usage-hero__metric">
            <dd className={`usage-hero__metric-val ${tone}`}>{value}</dd>
            <dt className="usage-hero__metric-lbl">{label}</dt>
        </div>
    );
}

/**
 * Focused per-Pokémon usage page, driven by real Smogon ladder stats for the
 * selected regulation: usage %, the items / moves / abilities / EV spreads /
 * Tera it actually runs, its most common teammates, curated Smogon sets, and
 * the recent tournament teams that featured it.
 */
export function PokemonUsageView() {
    const { idOrName } = useParams();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const { t, language } = useTranslation();
    const { goToMove, goToAbility, goToItem, linkState } = useEntityNavigate();
    const pt = language === 'pt';
    const locale = pt ? 'pt-BR' : 'en-US';
    const { goBack, backLabel } = useSmartBack('/meta', pt);

    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    const typesById = useMemo(() => {
        const map = new Map();
        for (const p of pokemonIndex) if (!map.has(p.id) && p.types?.length) map.set(p.id, p.types);
        return map;
    }, [pokemonIndex]);

    const { formats, defaultFormatId } = useUsageIndex();
    const fmtId = params.get('fmt') || defaultFormatId || '';
    const { byId, usageFor, format, detailCutoff, status: fmtStatus } = useUsageFormat(fmtId);
    const { teams } = useTournamentData();
    const { smogonFor } = useSmogonData();
    const { typeForMove } = useMoveTypes();
    const byStone = useMegaStones();

    // Resolve :idOrName → an index entry (numeric id first, then by slug).
    const entry = useMemo(() => {
        if (!pokemonIndex.length) return null;
        const asId = Number(idOrName);
        if (Number.isFinite(asId)) return pokemonIndex.find((p) => p.id === asId) || null;
        const slug = slugify(idOrName || '');
        return pokemonIndex.find((p) => {
            const lowName = (p.name || '').toLowerCase();
            const lowApi = (p.apiName || '').toLowerCase();
            return lowName === slug ||
                lowApi === slug ||
                lowName.replace(/\s+/g, '-') === slug ||
                lowName.startsWith(`${slug}-`);
        }) || null;
    }, [pokemonIndex, idOrName]);

    const id = entry?.id;
    const usage = id ? usageFor(id) : null;
    const smogon = id ? smogonFor(id) : null;

    // Rank within the selected regulation (by weighted usage).
    const rank = useMemo(() => {
        if (!byId || !id) return null;
        const sorted = Object.entries(byId).sort((a, b) => b[1].usage - a[1].usage);
        const i = sorted.findIndex(([sid]) => Number(sid) === id);
        return i >= 0 ? i + 1 : null;
    }, [byId, id]);

    const featuredTeams = useMemo(
        () => teams.filter((tm) => (tm.pokemons || []).some((p) => p.id === id || resolveMegaPokemonEntry(p, pokemonIndex, byStone).spriteId === id)).slice(0, 8),
        [teams, id, pokemonIndex, byStone],
    );

    // Tera: real usage Tera types; fall back to curated Smogon sets (never on Champions).
    const teraList = useMemo(() => {
        if (usage?.tera?.length) return usage.tera.map((t) => ({ name: t.name, count: t.count }));
        if (/champions/.test(fmtId)) return [];
        const m = new Map();
        for (const set of smogon?.sets || []) for (const t of set.tera || []) m.set(t, (m.get(t) || 0) + 1);
        return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    }, [usage, smogon, fmtId]);

    const setFmt = (val) => setParams((prev) => { const p = new URLSearchParams(prev); p.set('fmt', val); return p; }, { replace: true });

    const displayName = entry ? titleCaseSlug(entry.name) : '';
    useDocumentMeta(entry ? {
        pokemon: entry,
        title: `${displayName} Usage & Sets`,
        description: `${displayName} competitive usage, items, EV spreads, and top teammates${format?.name ? ` in ${format.name}` : ''}${usage?.usage ? ` — ${usage.usage.toFixed(1)}% usage` : ''} on PokemonBuilder.`,
        image: getPokemonArtworkSpriteUrl(entry.id),
        path: `/meta/${entry.name}`,
    } : undefined);

    if (pokemonIndex.length && !entry) {
        return (
            <main className="edv-page usage-view">
                <button type="button" onClick={goBack} className="edv-back mb-4">
                    <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="hidden sm:inline">{backLabel}</span>
                    <span className="sm:hidden">{pt ? 'Voltar' : 'Back'}</span>
                </button>
                <EmptyState mascot="lost" title={pt ? 'Pokémon não encontrado' : 'Pokémon not found'} message={pt ? 'Verifique o endereço.' : 'Check the URL.'} />
            </main>
        );
    }

    if (!entry) {
        return <Loader size="lg" scene="pokedex" block />;
    }

    const resolvedHero = resolveMegaPokemonEntry({ id, name: usage?.name || entry.name }, pokemonIndex, byStone);
    const heroTypes = typesById.get(resolvedHero.spriteId) || entry.types || [];
    const accent = typeColors[heroTypes[0]] || 'var(--color-primary)';
    const n = usage?.n || 0;
    const hasUsage = Boolean(usage && n > 0);
    const usageLoading = fmtStatus === 'loading' && !byId;
    const spreadsInSp = Boolean(usage?.spreads?.length) && usage.spreads.every((sp) => looksLikeStatPoints(sp.evs) || !Object.keys(sp.evs || {}).length);
    const rankTone = rank === 1 ? 'is-gold' : (rank === 2 || rank === 3) ? 'is-top' : '';
    const pikaHref = pikalyticsUrl(fmtId, usage?.name);

    return (
        <main className="edv-page usage-view">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={goBack} className="edv-back">
                    <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="hidden sm:inline">{backLabel}</span>
                    <span className="sm:hidden">{pt ? 'Voltar' : 'Back'}</span>
                </button>
                {formats.length > 0 && (
                    <FormatPicker formats={formats} value={fmtId} onChange={setFmt} pt={pt} compact />
                )}
            </div>

            {/* Hero — official artwork on its type platform + borderless figure+word telemetry */}
            <section className="usage-hero">
                <div className="usage-hero__inner">
                    <div className="usage-hero__stage type-platform" style={{ '--card-type': accent }}>
                        <img
                            src={getPokemonArtworkSpriteUrl(resolvedHero.spriteId)}
                            alt={pretty(usage?.name || entry.name)}
                            className="usage-hero__art"
                            decoding="async"
                            onError={(e) => {
                                const fallback = getPokemonFrontSpriteUrl(resolvedHero.spriteId);
                                if (e.currentTarget.src !== fallback) {
                                    e.currentTarget.src = fallback;
                                } else {
                                    e.currentTarget.src = POKEBALL_PLACEHOLDER_URL;
                                }
                            }}
                        />
                    </div>
                    <div className="usage-hero__body">
                        <div className="usage-hero__title-row">
                            <h1 className="usage-hero__name">{pretty(usage?.name || entry.name)}</h1>
                            <span className="usage-hero__dex">#{String(id).padStart(4, '0')}</span>
                        </div>
                        <div className="usage-hero__types">
                            {heroTypes.map((tp) => {
                                const c = typeColors[tp];
                                const typeKey = `types.${tp}`;
                                const typeLabel = t(typeKey);
                                return (
                                    <span
                                        key={tp}
                                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-2xs font-semibold capitalize"
                                        style={c ? {
                                            color: toneInk(c),
                                            backgroundColor: toneWash(c, 14),
                                            borderColor: toneWash(c, 45),
                                        } : undefined}
                                    >
                                        {typeIcons[tp] && <img src={typeIcons[tp]} alt="" className="h-3.5 w-3.5" aria-hidden="true" />}
                                        {typeLabel !== typeKey ? typeLabel : cap(tp)}
                                    </span>
                                );
                            })}
                        </div>
                        <div className="usage-hero__links">
                            <Link to={`/pokemon/${id}`} state={linkState} className="btn btn-secondary btn-sm">
                                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>{pt ? 'Ficha completa' : 'Full Pokédex entry'}</span>
                            </Link>
                            {format && (
                                <span
                                    className="usage-hero__pill"
                                    title={detailCutoff > 0
                                        ? (pt ? `Partidas entre jogadores com rating ${detailCutoff} ou mais` : `Games between players rated ${detailCutoff} and above`)
                                        : undefined}
                                >
                                    {format.label}{detailCutoff > 0 ? ` · ${detailCutoff}+` : ''}
                                </span>
                            )}
                            {usage?.tour && (
                                <span
                                    className="usage-hero__pill figure"
                                    title={pt ? 'Times registrados em torneios do Limitless' : 'Teams registered at Limitless tournaments'}
                                >
                                    {pt ? 'Torneios' : 'Tournaments'}: {Number(usage.tour.usage).toFixed(1)}%
                                    {Number.isFinite(usage.tour.winRate) && ` · ${Number(usage.tour.winRate).toFixed(1)}% ${pt ? 'vit.' : 'WR'}`}
                                    {usage.tour.topCut > 0 && ` · ${usage.tour.topCut} top 8`}
                                </span>
                            )}
                            {pikaHref && (
                                <a
                                    href={pikaHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-ghost btn-sm"
                                >
                                    <span>Pikalytics</span>
                                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                                </a>
                            )}
                        </div>
                    </div>
                    <dl className="usage-hero__metrics">
                        <HeroMetric
                            value={hasUsage ? `${Number(usage.usage).toFixed(1)}%` : '—'}
                            label={pt ? 'Uso' : 'Usage'}
                        />
                        <HeroMetric
                            value={rank ? `#${rank}` : '—'}
                            label={pt ? 'Ranking' : 'Rank'}
                            tone={rankTone}
                        />
                        <HeroMetric
                            value={hasUsage ? (usage.rawCount ?? usage.teams ?? usage.n ?? 0).toLocaleString(locale) : '—'}
                            label={pt ? 'Partidas' : 'Games'}
                        />
                    </dl>
                </div>
            </section>

            {usageLoading && (
                <Loader size="md" scene="pokedex" block />
            )}
            {!usageLoading && !hasUsage && (
                <div className="meta-panel mb-4 text-sm text-muted">
                    {pt
                        ? `Sem dados de uso para ${pretty(entry.name)} em ${format?.label || 'este formato'}. Tente outro formato acima.`
                        : `No ${format?.label || 'this format'} usage data for ${pretty(entry.name)}. Try another format above.`}
                </div>
            )}

            {/* Usage breakdowns — balanced two-column masonry (zero stretched dead space), zero nested borders */}
            {hasUsage && (
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                    <div className="space-y-4 min-w-0">
                        <Panel title={pt ? 'Golpes' : 'Moves'} icon={<Swords className="h-4 w-4 text-muted" aria-hidden="true" />}>
                            <div className="space-y-1.5">
                                {usage.moves.slice(0, 12).map((mv) => {
                                    const mt = typeForMove(mv.name);
                                    return (
                                        <UsageBar
                                            key={mv.name}
                                            label={pretty(mv.name)}
                                            icon={mt && typeIcons[mt] ? <img src={typeIcons[mt]} alt="" className="h-4 w-4" aria-hidden="true" /> : undefined}
                                            pct={pctOf(mv.count, n)}
                                            count={mv.count}
                                            color={mt ? (typeColors[mt] || accent) : accent}
                                            onClick={(e) => goToMove(mv.name, e)}
                                        />
                                    );
                                })}
                            </div>
                        </Panel>

                        {usage.spreads?.length > 0 && (
                            <Panel
                                title={spreadsInSp
                                    ? (pt ? 'Spreads (Stat Points)' : 'Common spreads (Stat Points)')
                                    : (pt ? 'Spreads (EVs reais)' : 'Common spreads')}
                                icon={<TrendingUp className="h-4 w-4 text-muted" aria-hidden="true" />}
                            >
                                <div className="space-y-1.5">
                                    {usage.spreads.slice(0, 6).map((sp, i) => {
                                        const spread = formatUsageSpread(sp.evs);
                                        const pct = pctOf(sp.count, n);
                                        return (
                                            <div key={`${sp.nature}-${i}`} className="usage-spread" style={{ '--bar-tone': accent }}>
                                                <div className="usage-spread__top">
                                                    <span className="usage-spread__nature">{sp.nature}</span>
                                                    <span className="usage-spread__evs">{spread || (pt ? 'sem EVs' : 'no EVs')}</span>
                                                    <span className="usage-spread__pct">{pct}%</span>
                                                </div>
                                                <span className="usage-bar__track" aria-hidden="true">
                                                    <span className="usage-bar__fill" style={{ width: `${Math.min(Math.max(pct, 2), 100)}%` }} />
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Panel>
                        )}
                    </div>

                    <div className="space-y-4 min-w-0">
                        <Panel title={pt ? 'Itens' : 'Held items'} icon={<Package className="h-4 w-4 text-muted" aria-hidden="true" />}>
                            <div className="space-y-1.5">
                                {usage.items.map((it) => (
                                    <UsageBar
                                        key={it.slug}
                                        label={pretty(it.name)}
                                        icon={(
                                            <img
                                                src={itemSpriteUrl(it.slug)}
                                                alt=""
                                                className="h-4 w-4 image-pixelated"
                                                onError={(e) => {
                                                    if (e.currentTarget.parentElement) e.currentTarget.parentElement.style.display = 'none';
                                                }}
                                            />
                                        )}
                                        pct={pctOf(it.count, n)}
                                        count={it.count}
                                        color={accent}
                                        onClick={(e) => goToItem(it.slug, e)}
                                    />
                                ))}
                            </div>
                        </Panel>

                        <Panel title={pt ? 'Habilidades' : 'Abilities'} icon={<Zap className="h-4 w-4 text-muted" aria-hidden="true" />}>
                            <div className="space-y-1.5">
                                {usage.abilities.map((ab) => (
                                    <UsageBar
                                        key={ab.name}
                                        label={pretty(ab.name)}
                                        pct={pctOf(ab.count, n)}
                                        count={ab.count}
                                        color={accent}
                                        onClick={(e) => goToAbility(ab.name, e)}
                                    />
                                ))}
                            </div>
                        </Panel>

                        <Panel title={pt ? 'Tera & Parceiros' : 'Tera & Teammates'} icon={<Sparkles className="h-4 w-4 text-muted" aria-hidden="true" />}>
                            {teraList.length > 0 && (
                                <div className="mb-4 flex flex-wrap gap-1.5">
                                    {teraList.slice(0, 6).map((tt) => {
                                        const low = tt.name?.toLowerCase();
                                        const c = typeColors[low] || null;
                                        const tKey = `types.${low}`;
                                        const tName = low && t(tKey) !== tKey ? t(tKey) : tt.name;
                                        return (
                                            <span
                                                key={tt.name}
                                                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-2xs font-semibold capitalize"
                                                style={c ? {
                                                    color: toneInk(c),
                                                    backgroundColor: toneWash(c, 14),
                                                    borderColor: toneWash(c, 45),
                                                } : { borderColor: 'transparent', backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-fg)' }}
                                            >
                                                {typeIcons[low] && <img src={typeIcons[low]} alt="" className="h-3.5 w-3.5" aria-hidden="true" />}
                                                {tName}
                                                {n > 0 && tt.count ? <span className="figure">{pctOf(tt.count, n)}%</span> : ''}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                            {usage.teammates?.length > 0 ? (
                                <div className="usage-teammates">
                                    {usage.teammates.slice(0, 12).map((tm) => {
                                        const resolvedTeam = resolveMegaPokemonEntry(tm, pokemonIndex, byStone);
                                        const mateTone = typeColors[typesById.get(resolvedTeam.spriteId)?.[0] || typesById.get(tm.id)?.[0]];
                                        const pct = pctOf(tm.count, n);
                                        return (
                                            <button
                                                key={tm.id}
                                                type="button"
                                                onClick={() => navigate(fmtId ? `/meta/${resolvedTeam.spriteId}?fmt=${fmtId}` : `/meta/${resolvedTeam.spriteId}`, { state: linkState })}
                                                title={`${pretty(resolvedTeam.name)} · ${pct}%`}
                                                className="usage-teammate"
                                            >
                                                <span className="type-platform inline-flex" style={mateTone ? { '--card-type': mateTone } : undefined}>
                                                    <img
                                                        src={getPokemonFrontSpriteUrl(resolvedTeam.spriteId)}
                                                        alt={resolvedTeam.name}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="h-10 w-10 shrink-0 object-contain image-pixelated"
                                                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                                    />
                                                </span>
                                                <span className="usage-teammate__name">{pretty(resolvedTeam.name)}</span>
                                                <span className="usage-teammate__pct">{pct}%</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-muted">{pt ? 'Sem parceiros frequentes.' : 'No frequent teammates.'}</p>
                            )}
                        </Panel>
                    </div>
                </div>
            )}

            {/* Curated Smogon sets (named sets with reasoning) */}
            {smogon?.sets?.length > 0 && (
                <section className="mt-6">
                    <h2 className="mb-3 flex items-center gap-1.5 text-md font-semibold text-fg">
                        <Sparkles className="h-4 w-4 text-muted" aria-hidden="true" /> {pt ? 'Sets recomendados (Smogon)' : 'Recommended sets (Smogon)'}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        {smogon.sets.map((set, i) => {
                            const { unit: spreadUnit, text: spread } = setSpreadParts(set);
                            const teraColor = set.tera?.length > 0 ? typeColors[set.tera[0]?.toLowerCase()] : null;
                            return (
                                <article key={`${set.name}-${i}`} className="usage-set-card">
                                    <div className="mb-2.5 flex items-center justify-between gap-2">
                                        <h3 className="truncate text-sm font-semibold text-fg">{set.name}</h3>
                                        {set.source && <span className="usage-set-card__source">{set.source}</span>}
                                    </div>
                                    <div className="mb-3 flex flex-wrap gap-1.5 text-2xs">
                                        {set.item && (
                                            <button type="button" onClick={(e) => goToItem(set.item, e)} className="inline-flex items-center gap-1 rounded-md bg-surface-raised px-2 py-0.5 capitalize text-fg transition-colors hover:bg-surface-hover hover:text-primary focus:outline-none">
                                                <img src={itemSpriteUrl(slugify(set.item))} alt="" className="h-4 w-4 shrink-0 image-pixelated" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                {pretty(set.item)}
                                            </button>
                                        )}
                                        {set.ability && (
                                            <button type="button" onClick={(e) => goToAbility(set.ability, e)} className="rounded-md bg-surface-raised px-2 py-0.5 capitalize text-fg transition-colors hover:bg-surface-hover hover:text-primary focus:outline-none">
                                                {pretty(set.ability)}
                                            </button>
                                        )}
                                        {set.nature && <span className="rounded-md bg-surface-raised px-2 py-0.5 text-fg">{set.nature}</span>}
                                        {set.tera?.length > 0 && (
                                            <span
                                                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold"
                                                style={teraColor ? {
                                                    color: toneInk(teraColor),
                                                    backgroundColor: toneWash(teraColor, 14),
                                                } : { backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-fg)' }}
                                            >
                                                <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" /> {pt ? 'Tera' : 'Tera'} {set.tera[0]}
                                            </span>
                                        )}
                                    </div>
                                    {spread && (
                                        <p className="mb-3 text-2xs text-muted">
                                            <span className="font-semibold text-fg">{spreadUnit}:</span>{' '}
                                            <span className="figure">{spread}</span>
                                        </p>
                                    )}
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {primaryMoves(set).map((mv) => (
                                            <MoveChip key={mv} name={mv} type={typeForMove(mv)} className="w-full justify-center rounded-lg py-1.5 text-center text-2xs" />
                                        ))}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Recent tournament teams featuring this Pokémon */}
            {featuredTeams.length > 0 && (
                <section className="mt-6">
                    <h2 className="mb-3 flex items-center gap-1.5 text-md font-semibold text-fg">
                        <Trophy className="h-4 w-4 text-muted" aria-hidden="true" /> {pt ? 'Times recentes com este Pokémon' : 'Recent teams featuring it'}
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {featuredTeams.map((tm) => (
                            <button
                                key={tm.id}
                                type="button"
                                onClick={() => navigate(`/tournaments/team/${tm.id}`, { state: linkState })}
                                className="usage-featured-team group"
                            >
                                <div className="usage-featured-team__roster">
                                    {(tm.pokemons || []).slice(0, 6).map((p, i) => {
                                        const resolvedTourneyMon = resolveMegaPokemonEntry(p, pokemonIndex, byStone);
                                        return (
                                            <img
                                                key={`${p.id}-${i}`}
                                                src={getPokemonFrontSpriteUrl(resolvedTourneyMon.spriteId)}
                                                alt={resolvedTourneyMon.name}
                                                loading="lazy"
                                                decoding="async"
                                                className="usage-featured-team__mini image-pixelated"
                                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold text-fg transition-colors group-hover:text-primary">{tm.tournament || tm.title}</p>
                                    <p className="mt-0.5 truncate text-2xs font-semibold tabular-nums text-muted">{[tm.placement, tm.format].filter(Boolean).join(' · ')}</p>
                                </div>
                                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-primary" aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <SourceCredit pt={pt} sources={['smogon', 'vgcpastes', 'pikalytics']} className="mt-8 border-t border-border pt-4" />
        </main>
    );
}
