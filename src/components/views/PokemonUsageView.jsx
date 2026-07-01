import React, { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
    ChevronLeft, TrendingUp, Users, Swords, Sparkles, Package,
    Zap, BookOpen, Trophy, ArrowUpRight,
} from 'lucide-react';

import { typeColors, typeIcons } from '../../constants/types';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { itemSpriteUrl } from '../../utils/itemSuggestions';
import { formatEvSpread, primaryMoves } from '../../utils/smogonSets';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTournamentData } from '../../hooks/useTournamentData';
import { useUsageIndex, useUsageFormat } from '../../hooks/useUsageStats';
import { useSmogonData } from '../../hooks/useSmogonData';
import { useMoveTypes } from '../../hooks/useMoveTypes';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from '../EmptyState';
import { UsageBar, MonSprite, MoveChip, Panel, pretty, pctOf, formatUsageSpread, SourceCredit, RegulationSelect, useSmartBack } from './metaShared';

const slugify = (s = '') => s.toLowerCase().trim().replace(/[.'’:]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
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
    const goBack = useSmartBack('/meta');
    const { language } = useTranslation();
    const pt = language === 'pt';

    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    React.useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    const { formats, defaultFormatId } = useUsageIndex();
    const fmtId = params.get('fmt') || defaultFormatId || '';
    const { byId, usageFor, format, status: fmtStatus } = useUsageFormat(fmtId);
    const { teams } = useTournamentData();
    const { smogonFor } = useSmogonData();
    const { typeForMove } = useMoveTypes();

    // Resolve :idOrName → an index entry (numeric id first, then by slug).
    const entry = useMemo(() => {
        if (!pokemonIndex.length) return null;
        const asId = Number(idOrName);
        if (Number.isFinite(asId)) return pokemonIndex.find((p) => p.id === asId) || null;
        const slug = slugify(idOrName || '');
        return pokemonIndex.find((p) => p.name === slug || p.name.startsWith(`${slug}-`)) || null;
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
        () => teams.filter((tm) => (tm.pokemons || []).some((p) => p.id === id)).slice(0, 8),
        [teams, id],
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

    if (pokemonIndex.length && !entry) {
        return (
            <main className="mx-auto max-w-5xl px-4 py-10">
                <button type="button" onClick={goBack} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
                    <ChevronLeft className="h-4 w-4" /> {pt ? 'Voltar' : 'Back'}
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
                <button type="button" onClick={goBack} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
                    <ChevronLeft className="h-4 w-4" /> {pt ? 'Voltar' : 'Back'}
                </button>
                {formats.length > 0 && (
                    <RegulationSelect formats={formats} value={fmtId} onChange={setFmt} pt={pt} className="py-1.5 text-[13px]" />
                )}
            </div>

            {/* Header */}
            <section className="mb-5 overflow-hidden rounded-2xl border border-border bg-surface" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                    <img
                        src={getPokemonArtworkSpriteUrl(id)}
                        alt={entry.name}
                        className="h-24 w-24 shrink-0 object-contain"
                        style={{ filter: `drop-shadow(0 6px 14px ${accent}44)` }}
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-extrabold capitalize text-fg">{pretty(entry.name)}</h1>
                            <span className="text-sm font-semibold text-muted">#{String(id).padStart(4, '0')}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {types.map((tp) => (
                                <span key={tp} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize" style={{ color: typeColors[tp], backgroundColor: `${typeColors[tp]}1f` }}>
                                    {typeIcons[tp] && <img src={typeIcons[tp]} alt="" className="h-3 w-3" />}{cap(tp)}
                                </span>
                            ))}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Link to={`/pokemon/${id}`} className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-[12px] font-semibold text-fg transition-colors hover:border-primary">
                                <BookOpen className="h-3.5 w-3.5" /> {pt ? 'Ficha completa' : 'Full Pokédex entry'}
                            </Link>
                            {format && <span className="rounded-lg bg-surface-raised px-2.5 py-1.5 text-[11px] font-semibold text-muted">{format.label}{format.cutoff ? ` · ${format.cutoff}+` : ''}</span>}
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
                                        />
                                    );
                                })}
                            </div>
                        </Panel>

                        <Panel title={pt ? 'Habilidades' : 'Abilities'} icon={<Zap className="h-4 w-4 text-primary" />}>
                            <div className="space-y-1.5">
                                {usage.abilities.map((ab) => (
                                    <UsageBar key={ab.name} label={pretty(ab.name)} pct={pctOf(ab.count, n)} count={ab.count} color="var(--color-accent)" />
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
                                            <div key={`${sp.nature}-${i}`} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5">
                                                <span className="shrink-0 rounded bg-surface-raised px-1.5 py-0.5 text-[11px] font-bold text-fg">{sp.nature}</span>
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
                                <div className="mb-3 flex flex-wrap gap-1.5">
                                    {teraList.slice(0, 6).map((tt) => {
                                        const c = typeColors[tt.name?.toLowerCase()] || 'var(--color-muted)';
                                        return (
                                            <span key={tt.name} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize" style={{ color: c, backgroundColor: `${c}1f` }}>
                                                {typeIcons[tt.name?.toLowerCase()] && <img src={typeIcons[tt.name.toLowerCase()]} alt="" className="h-3 w-3" />}
                                                {tt.name}{n > 0 && tt.count ? ` ${pctOf(tt.count, n)}%` : ''}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                            {usage.teammates?.length > 0 ? (
                                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-8">
                                    {usage.teammates.slice(0, 10).map((tm) => (
                                        <button
                                            key={tm.id}
                                            type="button"
                                            onClick={() => navigate(fmtId ? `/meta/${tm.id}?fmt=${fmtId}` : `/meta/${tm.id}`)}
                                            title={`${pretty(tm.name)} · ${pctOf(tm.count, n)}%`}
                                            className="flex flex-col items-center rounded-lg border border-border bg-surface p-1 transition-colors hover:border-primary"
                                        >
                                            <MonSprite id={tm.id} name={tm.name} className="h-9 w-9 image-pixelated" />
                                            <span className="text-[9px] font-bold tabular-nums text-muted">{pctOf(tm.count, n)}%</span>
                                        </button>
                                    ))}
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
                <div className="mt-5">
                    <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-muted">
                        <Sparkles className="h-4 w-4" /> {pt ? 'Sets recomendados (Smogon)' : 'Recommended sets (Smogon)'}
                    </h2>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                        {smogon.sets.map((set, i) => {
                            const spread = formatEvSpread(set.evs);
                            return (
                                <article key={`${set.name}-${i}`} className="rounded-2xl border border-border bg-surface p-3.5">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <h3 className="truncate text-[13px] font-extrabold text-fg">{set.name}</h3>
                                        {set.source && <span className="shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-semibold text-muted">{set.source}</span>}
                                    </div>
                                    <div className="mb-2 flex flex-wrap gap-1.5 text-[11px]">
                                        {set.item && (
                                            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-raised px-1.5 py-0.5 capitalize text-fg">
                                                <img src={itemSpriteUrl(slugify(set.item))} alt="" className="h-4 w-4 image-pixelated" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                {pretty(set.item)}
                                            </span>
                                        )}
                                        {set.ability && <span className="rounded-md border border-border bg-surface-raised px-1.5 py-0.5 capitalize text-fg">{pretty(set.ability)}</span>}
                                        {set.nature && <span className="rounded-md border border-border bg-surface-raised px-1.5 py-0.5 text-fg">{set.nature}</span>}
                                        {set.tera?.length > 0 && (
                                            <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold" style={{ color: typeColors[set.tera[0]?.toLowerCase()] || 'var(--color-primary)', backgroundColor: `${typeColors[set.tera[0]?.toLowerCase()] || '#888'}1f` }}>
                                                <Sparkles className="h-3 w-3" /> {pt ? 'Tera' : 'Tera'} {set.tera[0]}
                                            </span>
                                        )}
                                    </div>
                                    {spread && <p className="mb-2 text-[11px] text-muted"><span className="font-semibold text-fg">EVs:</span> {spread}</p>}
                                    <div className="flex flex-wrap gap-1">
                                        {primaryMoves(set).map((mv) => (
                                            <MoveChip key={mv} name={mv} type={typeForMove(mv)} />
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
                <div className="mt-5">
                    <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-muted">
                        <Trophy className="h-4 w-4" /> {pt ? 'Times recentes com este Pokémon' : 'Recent teams featuring it'}
                    </h2>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                        {featuredTeams.map((tm) => (
                            <button
                                key={tm.id}
                                type="button"
                                onClick={() => navigate(`/tournaments/team/${tm.id}`)}
                                className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <div className="flex shrink-0 -space-x-2">
                                    {(tm.pokemons || []).slice(0, 6).map((p, i) => (
                                        <MonSprite key={`${p.id}-${i}`} id={p.id} name={p.name} className="h-8 w-8 image-pixelated" />
                                    ))}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12px] font-bold text-fg">{tm.tournament || tm.title}</p>
                                    <p className="truncate text-[11px] text-muted">{[tm.placement, tm.format].filter(Boolean).join(' · ')}</p>
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
