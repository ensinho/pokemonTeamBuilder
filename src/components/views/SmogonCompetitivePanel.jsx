import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Swords, Shield, Zap, BookOpen, TrendingUp, Package, ArrowUpRight, Trophy } from 'lucide-react';

import { typeColors, typeIcons } from '../../constants/types';
import { useSmogonData } from '../../hooks/useSmogonData';
import { useUsageIndex, useUsageFormat } from '../../hooks/useUsageStats';
import { useMoveTypes } from '../../hooks/useMoveTypes';
import { useTournamentData } from '../../hooks/useTournamentData';
import { useTranslation } from '../../hooks/useTranslation';
import { itemSpriteUrl } from '../../utils/itemSuggestions';
import { formatEvSpread, formatIvNotes } from '../../utils/smogonSets';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { UsageBar, MonSprite, pctOf } from './metaShared';

const pretty = (slug = '') => String(slug).replace(/-/g, ' ');

function MetaPill({ icon, label, value, style, onClick }) {
    if (!value) return null;
    return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2.5 py-1 text-xs font-semibold text-fg" style={style}>
            {icon}
            <span className="text-[10px] uppercase tracking-[0.06em] text-muted">{label}</span>
            {onClick
                ? <button type="button" onClick={onClick} className="capitalize transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">{value}</button>
                : <span className="capitalize">{value}</span>}
        </span>
    );
}

/**
 * Live ladder usage for one species (default regulation), mirroring the /meta
 * page: the items / moves / abilities / Tera players ACTUALLY run, with real
 * frequencies. Returns null when this Pokémon has no usage data in the format.
 */
function LiveUsageBlock({ pokemonId }) {
    const { language } = useTranslation();
    const pt = language === 'pt';
    const { defaultFormatId } = useUsageIndex();
    const { byId, format } = useUsageFormat(defaultFormatId);
    const { typeForMove } = useMoveTypes();
    const { goToMove, goToAbility } = useEntityNavigate();

    const usage = pokemonId ? byId?.[pokemonId] : null;
    const rank = useMemo(() => {
        if (!byId || !pokemonId) return null;
        const sorted = Object.entries(byId).sort((a, b) => b[1].usage - a[1].usage);
        const i = sorted.findIndex(([id]) => Number(id) === pokemonId);
        return i >= 0 ? i + 1 : null;
    }, [byId, pokemonId]);

    const n = usage?.n || 0;
    if (!usage || n <= 0) return null;

    return (
        <section className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                    <TrendingUp className="w-3.5 h-3.5" /> {pt ? 'Uso real no ladder' : 'Real ladder usage'}{format?.label ? ` · ${format.label}` : ''}
                </span>
                <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-fg">{usage.usage}%</span>
                    <span className="text-muted">{pt ? 'uso' : 'usage'}</span>
                    {rank && <span className="rounded bg-surface-raised px-1.5 py-0.5 font-bold text-muted">#{rank}</span>}
                    <Link to={`/meta/${pokemonId}`} className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-raised px-2 py-1 font-semibold text-fg transition-colors hover:border-primary hover:text-primary">
                        {pt ? 'Ver tudo' : 'Full breakdown'} <ArrowUpRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <h5 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted"><Package className="w-3.5 h-3.5" /> {pt ? 'Itens' : 'Held items'}</h5>
                    <div className="space-y-1.5">
                        {usage.items.slice(0, 4).map((it) => (
                            <UsageBar
                                key={it.slug}
                                label={pretty(it.name)}
                                icon={<img src={itemSpriteUrl(it.slug)} alt="" className="h-4 w-4 image-pixelated" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />}
                                pct={pctOf(it.count, n)}
                                count={it.count}
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <h5 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted"><Swords className="w-3.5 h-3.5" /> {pt ? 'Golpes' : 'Moves'}</h5>
                    <div className="space-y-1.5">
                        {usage.moves.slice(0, 6).map((mv) => {
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
                </div>
            </div>

            {(usage.abilities?.length > 0 || usage.tera?.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5">
                    {usage.abilities.slice(0, 2).map((ab) => (
                        <button
                            key={ab.name}
                            type="button"
                            onClick={(e) => goToAbility(ab.name, e)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-surface-raised px-2 py-1 text-[11px] font-semibold capitalize text-fg transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <Zap className="w-3 h-3 text-accent" /> {pretty(ab.name)} <span className="text-muted">{pctOf(ab.count, n)}%</span>
                        </button>
                    ))}
                    {usage.tera.slice(0, 3).map((tt) => {
                        const c = typeColors[tt.name?.toLowerCase()] || 'var(--color-muted)';
                        return (
                            <span key={tt.name} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize" style={{ color: c, backgroundColor: `${c}1f` }}>
                                <Sparkles className="w-3 h-3" /> {pt ? 'Tera' : 'Tera'} {tt.name} {pctOf(tt.count, n)}%
                            </span>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

/**
 * A couple of recent real tournament teams that featured this species, plus how
 * many of the analysed tournament teams ran it. Returns null when none do.
 */
function RecentTournamentTeams({ pokemonId }) {
    const { language } = useTranslation();
    const pt = language === 'pt';
    const { teams } = useTournamentData();

    const featured = useMemo(
        () => teams.filter((tm) => (tm.pokemons || []).some((p) => p.id === pokemonId)),
        [teams, pokemonId],
    );
    if (!featured.length) return null;

    const shown = featured.slice(0, 4);
    const tournamentPct = pctOf(featured.length, teams.length);

    return (
        <section className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-bold text-warning">
                    <Trophy className="w-3.5 h-3.5" /> {pt ? 'Times de torneio recentes' : 'Recent tournament teams'}
                </span>
                <span className="text-xs text-muted">
                    <span className="font-bold text-fg">{tournamentPct}%</span> {pt ? `de ${teams.length} times` : `of ${teams.length} teams`}
                </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {shown.map((tm) => (
                    <Link
                        key={tm.id}
                        to={`/tournaments/team/${tm.id}`}
                        className="group flex items-center gap-3 rounded-lg border border-border bg-surface-raised p-2 transition-colors hover:border-primary"
                    >
                        <div className="flex shrink-0 -space-x-2">
                            {(tm.pokemons || []).slice(0, 6).map((p, i) => (
                                <MonSprite key={`${p.id}-${i}`} id={p.id} name={p.name} className="h-7 w-7 image-pixelated" />
                            ))}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-bold text-fg">{tm.tournament || tm.title}</p>
                            <p className="truncate text-[11px] text-muted">{[tm.placement, tm.format].filter(Boolean).join(' · ')}</p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-primary" />
                    </Link>
                ))}
            </div>
        </section>
    );
}

/**
 * Competitive tab for one species: our live tournament/ladder usage (what players
 * actually run right now) on top, then Smogon's expert-curated VGC sets + the
 * written reasoning behind each (also used by the editor's one-click "apply set").
 */
export function SmogonCompetitivePanel({ pokemonId }) {
    const { language } = useTranslation();
    const { goToMove, goToAbility } = useEntityNavigate();
    const { smogonFor, status } = useSmogonData();
    const { defaultFormatId } = useUsageIndex();
    const { byId: usageById } = useUsageFormat(defaultFormatId);
    const { teams } = useTournamentData();
    const pt = language === 'pt';
    const entry = pokemonId ? smogonFor(pokemonId) : null;
    const hasUsage = Boolean(pokemonId && usageById?.[pokemonId]?.n > 0);
    const hasSets = Boolean(entry?.sets?.length);
    const hasTeams = Boolean(pokemonId && teams.some((tm) => (tm.pokemons || []).some((p) => p.id === pokemonId)));

    if (status !== 'ready' && !hasUsage && !hasTeams) {
        return <div className="py-12 text-center text-sm text-muted">{pt ? 'Carregando dados competitivos…' : 'Loading competitive data…'}</div>;
    }

    if (!hasUsage && !hasSets && !hasTeams) {
        return (
            <div className="py-12 bg-surface border border-border rounded-xl text-center px-4">
                <BookOpen className="w-10 h-10 text-muted mx-auto mb-3" />
                <h5 className="font-bold text-fg mb-1">{pt ? 'Sem análise competitiva' : 'No competitive analysis'}</h5>
                <p className="text-xs text-muted max-w-sm mx-auto">
                    {pt
                        ? 'Este Pokémon ainda não aparece no meta competitivo analisado.'
                        : 'This Pokémon has no competitive usage or published sets yet.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <LiveUsageBlock pokemonId={pokemonId} />
            <RecentTournamentTeams pokemonId={pokemonId} />

            {hasSets && (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                            <Sparkles className="w-3.5 h-3.5" /> {pt ? 'Análise Smogon' : 'Smogon analysis'} · {entry.gen}
                        </span>
                        <span className="text-xs text-muted">
                            {pt
                                ? `${entry.sets.length} conjunto(s) recomendado(s) por especialistas`
                                : `${entry.sets.length} expert-recommended set${entry.sets.length > 1 ? 's' : ''}`}
                        </span>
                    </div>

                    {entry.overview && (
                        <p className="text-sm leading-relaxed text-fg whitespace-pre-line border-l-2 border-primary/40 pl-3">
                            {entry.overview}
                        </p>
                    )}

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {entry.sets.map((set, i) => {
                            const evSpread = formatEvSpread(set.evs);
                            const ivNotes = formatIvNotes(set.ivs);
                            return (
                                <article key={`${set.name}-${i}`} className="rounded-xl border border-border bg-surface p-4 space-y-3">
                                    <header className="flex items-baseline justify-between gap-2">
                                        <h4 className="flex items-baseline gap-2 text-base font-extrabold text-fg">
                                            {set.name}
                                            {set.source && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">{set.source}</span>}
                                        </h4>
                                        {set.tera?.length > 0 && (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold capitalize" style={{ color: typeColors[set.tera[0]] }}>
                                                <Sparkles className="w-3 h-3" /> {pt ? 'Tera' : 'Tera'} {set.tera.map((tt) => pretty(tt)).join(' / ')}
                                            </span>
                                        )}
                                    </header>

                                    <div className="flex flex-wrap gap-1.5">
                                        {set.item && (
                                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2.5 py-1 text-xs font-semibold text-fg">
                                                <img src={itemSpriteUrl(set.item)} alt="" className="w-4 h-4 image-pixelated" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                <span className="capitalize">{pretty(set.item)}</span>
                                                {set.itemAlts?.length > 0 && (
                                                    <span className="text-muted normal-case">/ {set.itemAlts.map(pretty).join(' / ')}</span>
                                                )}
                                            </span>
                                        )}
                                        <MetaPill icon={<Shield className="w-3.5 h-3.5 text-muted" />} label={pt ? 'Hab.' : 'Ability'} value={set.ability && pretty(set.ability)} onClick={set.ability ? (e) => goToAbility(set.ability, e) : undefined} />
                                        <MetaPill icon={<Zap className="w-3.5 h-3.5 text-muted" />} label={pt ? 'Natureza' : 'Nature'} value={set.nature} />
                                    </div>

                                    {evSpread && (
                                        <div className="text-xs text-muted">
                                            <span className="font-bold text-fg">EVs:</span> <span className="font-mono">{evSpread}</span>
                                            {ivNotes && <> · <span className="font-bold text-fg">IVs:</span> <span className="font-mono">{ivNotes}</span></>}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-1.5">
                                        {set.moves.map((slot, j) => (
                                            <span key={j} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-raised px-2 py-1 text-xs font-semibold capitalize text-fg">
                                                <Swords className="w-3 h-3 text-muted" />
                                                {slot.map((mv, k) => (
                                                    <React.Fragment key={mv}>
                                                        {k > 0 && <span className="text-muted" aria-hidden="true">/</span>}
                                                        <button type="button" onClick={(e) => goToMove(mv, e)} className="capitalize transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
                                                            {pretty(mv)}
                                                        </button>
                                                    </React.Fragment>
                                                ))}
                                            </span>
                                        ))}
                                    </div>

                                    {set.description && (
                                        <p className="text-xs leading-relaxed text-muted whitespace-pre-line">{set.description}</p>
                                    )}
                                </article>
                            );
                        })}
                    </div>

                    <p className="text-[11px] text-muted">
                        {pt
                            ? 'Conjuntos curados pelo Smogon. Use “Aplicar conjunto” no editor de time para preencher movimentos, item e EVs de uma vez.'
                            : 'Sets curated by Smogon. Use “Apply set” in the team editor to fill moves, item, and EVs in one click.'}
                    </p>
                </>
            )}
        </div>
    );
}
