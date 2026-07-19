import React, { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import '../../styles/entity-detail-view.css';
import {
    ChevronLeft, TrendingUp, Users, Swords, Sparkles, Package,
    Zap, BookOpen, Trophy, ArrowUpRight,
} from 'lucide-react';

import { typeColors, typeIcons } from '../../constants/types';
import { getPokemonFrontSpriteUrl, getPokemonArtworkSpriteUrl, resolveMegaPokemonEntry } from '../../utils/pokemonSprites';
import { useMegaStones } from '../../hooks/useMegaStones';
import { itemSpriteUrl } from '../../utils/itemSuggestions';
import { formatEvSpread, primaryMoves, titleCaseSlug, toApiSlug } from '../../utils/smogonSets';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTournamentData } from '../../hooks/useTournamentData';
import { useUsageIndex, useUsageFormat } from '../../hooks/useUsageStats';
import { useSmogonData } from '../../hooks/useSmogonData';
import { useMoveTypes } from '../../hooks/useMoveTypes';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { EmptyState } from '../EmptyState';
import { UsageBar, MonSprite, MoveChip, Panel, pretty, pctOf, formatUsageSpread, SourceCredit, RegulationSelect, useSmartBack } from './metaShared';

const slugify = toApiSlug;
const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

function MetricTile({ icon, value, label, accent }) {
    return (
        <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-3 py-2.5 text-center">
            <span className="mb-0.5" style={accent ? { color: accent } : undefined}>{icon}</span>
            <span className="text-lg font-extrabold tabular-nums text-fg">{value}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</span>
        </div>
    );
}

/**
 * Focused per-Pokémon usage page (pikalytics-style), driven by real Smogon ladder
 * stats for the selected regulation: usage %, the items / moves / abilities / EV
 * spreads / Tera it actually runs, its most common teammates, curated Smogon sets,
 * and the recent tournament teams that featured it. The regulation is carried in
 * the ?fmt query param so it stays in sync with the Meta page.
 */
export function PokemonUsageView() {
    const { idOrName } = useParams();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const { language } = useTranslation();
    const { goToMove, goToAbility, goToItem, linkState } = useEntityNavigate();
    const pt = language === 'pt';
    const { goBack, backLabel } = useSmartBack('/meta', pt);

    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    React.useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    const { formats, defaultFormatId } = useUsageIndex();
    const fmtId = params.get('fmt') || defaultFormatId || '';
    const { byId, usageFor, format, status: fmtStatus } = useUsageFormat(fmtId);
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

    // Tera: real usage Tera types; fall back to the Tera on curated Smogon sets
    // (Pokémon Champions has no Tera, so those formats leave this empty).
    const teraList = useMemo(() => {
        if (usage?.tera?.length) return usage.tera.map((t) => ({ name: t.name, count: t.count }));
        const m = new Map();
        for (const set of smogon?.sets || []) for (const t of set.tera || []) m.set(t, (m.get(t) || 0) + 1);
        return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    }, [usage, smogon]);

    const setFmt = (val) => setParams((prev) => { const p = new URLSearchParams(prev); p.set('fmt', val); return p; }, { replace: true });

    const displayName = entry ? titleCaseSlug(entry.name) : '';
    useDocumentMeta(entry ? {
        title: `${displayName} Usage & Sets`,
        description: `${displayName} competitive usage, items, EV spreads, and top teammates${format?.name ? ` in ${format.name}` : ''}${usage?.usage ? ` — ${usage.usage.toFixed(1)}% usage` : ''} on Pokémon Team Builder.`,
        image: getPokemonArtworkSpriteUrl(entry.id),
        // Always canonicalize to the name slug so /meta/25 and /meta/raichu consolidate.
        path: `/meta/${entry.name}`,
    } : undefined);

    if (pokemonIndex.length && !entry) {
        return (
            <main className="mx-auto max-w-5xl px-4 py-10">
                <button type="button" onClick={goBack} className="edv-back mb-4">
                    <ChevronLeft className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">{backLabel}</span>
                    <span className="sm:hidden">{pt ? 'Voltar' : 'Back'}</span>
                </button>
                <EmptyState title={pt ? 'Pokémon não encontrado' : 'Pokémon not found'} message={pt ? 'Verifique o endereço.' : 'Check the URL.'} />
            </main>
        );
    }

    if (!entry) {
        return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted">{pt ? 'Carregando…' : 'Loading…'}</div>;
    }

    const types = entry.types || [];
    const accent = typeColors[types[0]] || 'var(--color-primary)';
    const n = usage?.n || 0;
    const hasUsage = Boolean(usage && n > 0);
    const usageLoading = fmtStatus === 'loading' && !byId;

    return (
        <main className="mx-auto max-w-[1400px] px-3 py-5 sm:px-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={goBack} className="edv-back">
                    <ChevronLeft className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">{backLabel}</span>
                    <span className="sm:hidden">{pt ? 'Voltar' : 'Back'}</span>
                </button>
                {formats.length > 0 && (
                    <RegulationSelect formats={formats} value={fmtId} onChange={setFmt} pt={pt} className="py-1.5 text-[13px]" />
                )}
            </div>

            {/* Header */}
            <section
                className="mb-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-md"
                style={{
                    borderTop: `4px solid ${accent}`,
                    background: `radial-gradient(120% 120% at 0% 0%, ${accent}0d, transparent 60%), var(--color-surface)`
                }}
            >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
                    <div className="relative flex items-center justify-center p-3 rounded-2xl bg-surface-raised shrink-0 border border-border shadow-inner">
                        <img
                            src={getPokemonFrontSpriteUrl(id)}
                            alt={entry.name}
                            className="h-20 w-20 shrink-0 object-contain image-pixelated transition-transform hover:scale-110 duration-300"
                            style={{ filter: `drop-shadow(0 6px 14px ${accent}44)` }}
                            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-2xl font-extrabold capitalize tracking-tight text-fg sm:text-3xl">{pretty(entry.name)}</h1>
                            <span className="text-sm font-semibold text-muted">#{String(id).padStart(4, '0')}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {types.map((tp) => (
                                <span key={tp} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize" style={{ color: typeColors[tp], backgroundColor: `${typeColors[tp]}1f` }}>
                                    {typeIcons[tp] && <img src={typeIcons[tp]} alt="" className="h-3.5 w-3.5" />}{cap(tp)}
                                </span>
                            ))}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Link to={`/pokemon/${id}`} state={linkState} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-3.5 py-1.75 text-[12px] font-bold text-fg transition-all hover:border-primary active:scale-95">
                                <BookOpen className="h-3.5 w-3.5" /> {pt ? 'Ficha completa' : 'Full Pokédex entry'}
                            </Link>
                            {format && <span className="rounded-xl bg-surface-raised/60 px-3 py-1.75 text-[11px] font-semibold text-muted">{format.label}{format.cutoff ? ` · ${format.cutoff}+` : ''}</span>}
                        </div>
                    </div>
                    <div className="grid shrink-0 grid-cols-3 gap-2 sm:w-64">
                        <MetricTile icon={<TrendingUp className="h-4 w-4" />} value={hasUsage ? `${usage.usage}%` : '—'} label={pt ? 'Uso' : 'Usage'} accent={accent} />
                        <MetricTile icon={<Trophy className="h-4 w-4" />} value={rank ? `#${rank}` : '—'} label={pt ? 'Ranking' : 'Rank'} accent="var(--color-accent)" />
                        <MetricTile icon={<Users className="h-4 w-4" />} value={hasUsage ? usage.rawCount.toLocaleString(pt ? 'pt-BR' : 'en-US') : '—'} label={pt ? 'Partidas' : 'Games'} accent="var(--color-info)" />
                    </div>
                </div>
            </section>

            {usageLoading && (
                <p className="mb-4 text-sm text-muted">{pt ? 'Carregando dados de uso…' : 'Loading usage data…'}</p>
            )}
            {!usageLoading && !hasUsage && (
                <div className="mb-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
                    {pt
                        ? `Sem dados de uso para ${entry.name} em ${format?.label || 'este regulamento'}. Tente outro regulamento acima.`
                        : `No ${format?.label || 'this regulation'} usage data for ${pretty(entry.name)}. Try another regulation above.`}
                </div>
            )}

            {/* Usage breakdowns */}
            {hasUsage && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <Panel title={pt ? 'Itens' : 'Held items'} icon={<Package className="h-4 w-4 text-primary" />}>
                            <div className="space-y-1.5">
                                {usage.items.map((it) => (
                                    <UsageBar
                                        key={it.slug}
                                        label={pretty(it.name)}
                                        icon={<img src={itemSpriteUrl(it.slug)} alt="" className="h-4 w-4 image-pixelated" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />}
                                        pct={pctOf(it.count, n)}
                                        count={it.count}
                                        onClick={(e) => goToItem(it.slug, e)}
                                    />
                                ))}
                            </div>
                        </Panel>

                        <Panel title={pt ? 'Golpes' : 'Moves'} icon={<Swords className="h-4 w-4 text-primary" />}>
                            <div className="space-y-1.5">
                                {usage.moves.slice(0, 12).map((mv) => {
                                    const mt = typeForMove(mv.name);
                                    return (
                                        <UsageBar
                                            key={mv.name}
                                            label={pretty(mv.name)}
                                            icon={mt && typeIcons[mt] ? <img src={typeIcons[mt]} alt="" className="h-4 w-4" /> : undefined}
                                            pct={pctOf(mv.count, n)}
                                            count={mv.count}
                                            color={mt ? (typeColors[mt] || 'var(--color-success)') : 'var(--color-success)'}
                                            onClick={(e) => goToMove(mv.name, e)}
                                        />
                                    );
                                })}
                            </div>
                        </Panel>

                        <Panel title={pt ? 'Habilidades' : 'Abilities'} icon={<Zap className="h-4 w-4 text-primary" />}>
                            <div className="space-y-1.5">
                                {usage.abilities.map((ab) => (
                                    <UsageBar key={ab.name} label={pretty(ab.name)} pct={pctOf(ab.count, n)} count={ab.count} color="var(--color-accent)" onClick={(e) => goToAbility(ab.name, e)} />
                                ))}
                            </div>
                        </Panel>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* Real EV spreads (nature + investment) */}
                        {usage.spreads?.length > 0 && (
                            <Panel title={pt ? 'Spreads (EVs reais)' : 'Common spreads'} icon={<TrendingUp className="h-4 w-4 text-primary" />}>
                                <div className="space-y-1.5">
                                    {usage.spreads.slice(0, 6).map((sp, i) => {
                                        const spread = formatUsageSpread(sp.evs);
                                        return (
                                            <div key={`${sp.nature}-${i}`} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 hover:border-border transition-colors">
                                                <span className="shrink-0 rounded bg-surface-raised px-2 py-0.5 text-[11px] font-bold text-fg">{sp.nature}</span>
                                                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted">{spread || (pt ? 'sem EVs' : 'no EVs')}</span>
                                                <span className="shrink-0 text-[11px] font-bold tabular-nums text-primary">{pctOf(sp.count, n)}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Panel>
                        )}

                        <Panel title={pt ? 'Tera & Parceiros' : 'Tera & Teammates'} icon={<Sparkles className="h-4 w-4 text-primary" />}>
                            {teraList.length > 0 && (
                                <div className="mb-4 flex flex-wrap gap-1.5">
                                    {teraList.slice(0, 6).map((tt) => {
                                        const c = typeColors[tt.name?.toLowerCase()] || 'var(--color-muted)';
                                        return (
                                            <span key={tt.name} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize" style={{ color: c, backgroundColor: `${c}1f` }}>
                                                {typeIcons[tt.name?.toLowerCase()] && <img src={typeIcons[tt.name.toLowerCase()]} alt="" className="h-3.5 w-3.5" />}
                                                {tt.name}{n > 0 && tt.count ? ` ${pctOf(tt.count, n)}%` : ''}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                            {usage.teammates?.length > 0 ? (
                                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 xl:grid-cols-6">
                                    {usage.teammates.slice(0, 12).map((tm) => {
                                        const resolvedTeam = resolveMegaPokemonEntry(tm, pokemonIndex, byStone);
                                        return (
                                            <button
                                                key={tm.id}
                                                type="button"
                                                onClick={() => navigate(fmtId ? `/meta/${resolvedTeam.spriteId}?fmt=${fmtId}` : `/meta/${resolvedTeam.spriteId}`, { state: linkState })}
                                                title={`${pretty(resolvedTeam.name)} · ${pctOf(tm.count, n)}%`}
                                                className="group flex flex-col items-center gap-1 rounded-xl border border-border bg-surface p-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-md"
                                            >
                                                <img
                                                    src={getPokemonFrontSpriteUrl(resolvedTeam.spriteId)}
                                                    alt={resolvedTeam.name}
                                                    className="h-10 w-10 image-pixelated shrink-0 object-contain transition-transform duration-300 group-hover:scale-110"
                                                    onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                                />
                                                <span className="text-[9px] font-extrabold text-fg truncate w-full text-center capitalize">{pretty(resolvedTeam.name).split('-')[0]}</span>
                                                <span className="text-[9px] font-bold tabular-nums text-primary">{pctOf(tm.count, n)}%</span>
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
                <div className="mt-6">
                    <h2 className="mb-3.5 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-muted">
                        <Sparkles className="h-4 w-4" /> {pt ? 'Sets recomendados (Smogon)' : 'Recommended sets (Smogon)'}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        {smogon.sets.map((set, i) => {
                            const spread = formatEvSpread(set.evs);
                            return (
                                <article
                                    key={`${set.name}-${i}`}
                                    className="group rounded-2xl border border-border bg-surface p-4 transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-lg"
                                    style={{ borderTop: `4px solid ${accent}`, background: `linear-gradient(135deg, ${accent}04, var(--color-surface) 40%), var(--color-surface)` }}
                                >
                                    <div className="mb-2.5 flex items-center justify-between gap-2">
                                        <h3 className="truncate text-sm font-extrabold text-fg">{set.name}</h3>
                                        {set.source && <span className="shrink-0 rounded-full bg-surface-raised px-2.5 py-0.5 text-[9px] font-bold text-muted uppercase tracking-wide">{set.source}</span>}
                                    </div>
                                    <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
                                        {set.item && (
                                            <button type="button" onClick={(e) => goToItem(set.item, e)} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-raised px-1.5 py-0.5 capitalize text-fg transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                                <img src={itemSpriteUrl(slugify(set.item))} alt="" className="h-4 w-4 image-pixelated shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                {pretty(set.item)}
                                            </button>
                                        )}
                                        {set.ability && (
                                            <button type="button" onClick={(e) => goToAbility(set.ability, e)} className="rounded-md border border-border bg-surface-raised px-1.5 py-0.5 capitalize text-fg transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                                {pretty(set.ability)}
                                            </button>
                                        )}
                                        {set.nature && <span className="rounded-md border border-border bg-surface-raised px-1.5 py-0.5 text-fg">{set.nature}</span>}
                                        {set.tera?.length > 0 && (
                                            <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold" style={{ color: typeColors[set.tera[0]?.toLowerCase()] || 'var(--color-primary)', backgroundColor: `${typeColors[set.tera[0]?.toLowerCase()] || '#888'}1f` }}>
                                                <Sparkles className="h-3 w-3 shrink-0" /> {pt ? 'Tera' : 'Tera'} {set.tera[0]}
                                            </span>
                                        )}
                                    </div>
                                    {spread && <p className="mb-3 text-[11px] text-muted"><span className="font-semibold text-fg">EVs:</span> {spread}</p>}
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {primaryMoves(set).map((mv) => (
                                            <MoveChip key={mv} name={mv} type={typeForMove(mv)} className="w-full text-center justify-center py-1.5 rounded-lg border border-border bg-surface-raised/20 text-[10px] hover:border-border transition-colors" />
                                        ))}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recent tournament teams featuring this Pokémon */}
            {featuredTeams.length > 0 && (
                <div className="mt-6">
                    <h2 className="mb-3.5 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-muted">
                        <Trophy className="h-4 w-4" /> {pt ? 'Times recentes com este Pokémon' : 'Recent teams featuring it'}
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {featuredTeams.map((tm) => (
                            <button
                                key={tm.id}
                                type="button"
                                onClick={() => navigate(`/tournaments/team/${tm.id}`, { state: linkState })}
                                className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <div className="flex shrink-0 -space-x-2">
                                    {(tm.pokemons || []).slice(0, 6).map((p, i) => {
                                        const resolvedTourneyMon = resolveMegaPokemonEntry(p, pokemonIndex, byStone);
                                        return (
                                            <img
                                                key={`${p.id}-${i}`}
                                                src={getPokemonFrontSpriteUrl(resolvedTourneyMon.spriteId)}
                                                alt={resolvedTourneyMon.name}
                                                className="h-8 w-8 image-pixelated shrink-0 object-contain bg-surface-raised rounded-full border border-border shadow-sm"
                                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-fg group-hover:text-primary transition-colors">{tm.tournament || tm.title}</p>
                                    <p className="truncate text-[10px] font-semibold text-muted mt-0.5">{[tm.placement, tm.format].filter(Boolean).join(' · ')}</p>
                                </div>
                                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-primary" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <SourceCredit pt={pt} sources={['smogon', 'vgcpastes', 'pikalytics']} className="mt-8 border-t border-border pt-4" />
        </main>
    );
}
