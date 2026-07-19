import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TrendingUp, Search, Layers, X, Users, ArrowUpRight } from 'lucide-react';

import { useTournamentData } from '../../hooks/useTournamentData';
import { useUsageIndex, useUsageFormat } from '../../hooks/useUsageStats';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { PokeballIcon } from '../icons';
import { EmptyState } from '../EmptyState';
import { rankUsage, commonCores, commonTeams } from '../../utils/metaUsage';
import { MonSprite, pretty, SourceCredit, RegulationSelect } from './metaShared';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';

// A single core row (2-, 3- or 4-Pokémon grouping) with the sprites and share.
function CoreRow({ core, rank, onOpenMon }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
            <span className="w-5 shrink-0 text-center text-[11px] font-bold text-muted">#{rank}</span>
            <div className="flex shrink-0 -space-x-1.5">
                {core.ids.map((id) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onOpenMon(id)}
                        title={pretty(core.names[core.ids.indexOf(id)])}
                        className="rounded-full border border-border bg-surface-raised transition-transform hover:z-10 hover:-translate-y-0.5"
                    >
                        <MonSprite id={id} name="" className="h-9 w-9 image-pixelated" />
                    </button>
                ))}
            </div>
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold capitalize text-fg">
                {core.names.map(pretty).join(' · ')}
            </span>
            <div className="shrink-0 text-right">
                <span className="block text-sm font-extrabold tabular-nums text-primary">{core.pct}%</span>
                <span className="block text-[10px] tabular-nums text-muted">{core.count} teams</span>
            </div>
        </div>
    );
}

/**
 * Meta & Usage — the competitive command centre. Ranks Pokémon by real Smogon
 * ladder usage for the selected regulation (VGC / Pokémon Champions), and shows
 * the most common tournament-team cores. Clicking a Pokémon opens its focused
 * usage page (exactly what it runs) carrying the current regulation.
 */
export function MetaUsageView() {
    const { t, language } = useTranslation();
    const pt = language === 'pt';
    useDocumentMeta({
        title: 'Meta & Usage',
        description: 'Competitive VGC usage stats by regulation: top Pokémon, items, moves, spreads, and Tera types from real ladder data.',
        path: '/meta',
    });
    const navigate = useNavigate();
    const { linkState } = useEntityNavigate();
    const [params, setParams] = useSearchParams();

    const { formats, defaultFormatId, month, status: idxStatus } = useUsageIndex();
    const fmtId = params.get('fmt') || defaultFormatId || '';
    const { byId, format, totalBattles, status: fmtStatus } = useUsageFormat(fmtId);
    const { teams } = useTournamentData();

    const [search, setSearch] = useState('');
    // Active tab lives in the URL (?tab=teams) so it's shareable and survives back-nav.
    const tab = params.get('tab') === 'teams' ? 'teams' : 'usage';
    const setTab = (id) => setParams((prev) => {
        const p = new URLSearchParams(prev);
        if (id === 'usage') p.delete('tab'); else p.set('tab', id);
        return p;
    });

    // Tournament teams for the selected regulation (derive a "Reg X" token from the
    // Smogon format label and match tournament `format`). Falls back to all teams
    // when that regulation has no tournament teams baked yet (e.g. a brand-new reg).
    const regToken = (format?.label || '').replace(/vgc/i, '').replace(/\b\d{4}\b/, '').replace(/\s+/g, ' ').trim();
    const { teamsForReg, regHasTeams } = useMemo(() => {
        if (!regToken) return { teamsForReg: teams, regHasTeams: true };
        const matched = teams.filter((tm) => (tm.format || '').toLowerCase() === regToken.toLowerCase());
        return matched.length ? { teamsForReg: matched, regHasTeams: true } : { teamsForReg: teams, regHasTeams: false };
    }, [teams, regToken]);
    const teamCompositions = useMemo(() => commonTeams(teamsForReg, 24), [teamsForReg]);

    // Smogon usage ranking for the selected regulation (falls back to tournament
    // appearance counts if the usage dataset isn't available).
    const smogonRanked = useMemo(() => {
        if (!byId) return [];
        return Object.entries(byId)
            .map(([id, e]) => ({ id: Number(id), name: e.name, pct: e.usage, count: e.rawCount }))
            .sort((a, b) => b.pct - a.pct);
    }, [byId]);
    const usingSmogon = smogonRanked.length > 0;
    const tournamentRanked = useMemo(() => rankUsage(teams), [teams]);
    const ranked = usingSmogon ? smogonRanked : tournamentRanked;

    const cores2 = useMemo(() => commonCores(teams, 2, 6), [teams]);
    const cores3 = useMemo(() => commonCores(teams, 3, 6), [teams]);

    const query = search.trim().toLowerCase();
    const visible = useMemo(
        () => (query ? ranked.filter((r) => pretty(r.name).toLowerCase().includes(query)) : ranked),
        [ranked, query],
    );

    const setFmt = (id) => setParams((prev) => { const p = new URLSearchParams(prev); p.set('fmt', id); return p; }, { replace: true });
    const openMon = (id) => navigate(fmtId ? `/meta/${id}?fmt=${fmtId}` : `/meta/${id}`, { state: linkState });
    const openTeam = (teamId) => navigate(`/tournaments/team/${teamId}`, { state: linkState });

    const loading = idxStatus === 'loading' || (usingSmogon ? false : fmtStatus === 'loading');
    if (loading && !ranked.length) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '40vh', color: 'var(--color-primary)' }} role="status" aria-label="Loading">
                <PokeballIcon className="w-14 h-14 animate-spin opacity-70" />
            </div>
        );
    }

    if (!ranked.length) {
        return <EmptyState title={pt ? 'Sem dados de meta' : 'No meta data'} message={pt ? 'Os dados de uso ainda não carregaram.' : 'Usage data has not loaded yet.'} />;
    }

    const battlesLabel = totalBattles ? totalBattles.toLocaleString(pt ? 'pt-BR' : 'en-US') : '';

    return (
        <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5 sm:py-5">
            <header className="mb-4 sm:mb-5">
                <h1 className="flex items-center gap-2 text-xl font-extrabold text-fg sm:text-3xl">
                    <TrendingUp className="h-5 w-5 text-primary sm:h-6 sm:w-6" /> {pt ? 'Meta & Uso' : 'Meta & Usage'}
                </h1>
                <p className="mt-1 line-clamp-2 max-w-2xl text-[13px] text-muted sm:line-clamp-none sm:text-sm">
                    {usingSmogon && format
                        ? (pt
                            ? `Uso real de ${format.label} no ladder competitivo${battlesLabel ? ` (${battlesLabel} partidas${month ? `, ${month}` : ''})` : ''} — clique em um Pokémon para ver exatamente o que ele roda.`
                            : `Real ${format.label} ladder usage${battlesLabel ? ` (${battlesLabel} games${month ? `, ${month}` : ''})` : ''} — click any Pokémon to see exactly what it runs (items, moves, spreads, Tera & partners).`)
                        : (pt
                            ? 'Pokémon mais usados nos times recentes de torneios — clique para ver o que estão rodando.'
                            : 'Most-used Pokémon across recent tournament teams — click any to see what they run.')}
                </p>
                <SourceCredit pt={pt} sources={['smogon', 'vgcpastes', 'pikalytics']} className="mt-2.5" />
            </header>

            {/* Tabs */}
            <div role="tablist" aria-label={pt ? 'Visões do meta' : 'Meta views'} className="mb-4 flex gap-1 border-b border-border">
                {[
                    { id: 'usage', label: pt ? 'Uso' : 'Usage' },
                    { id: 'teams', label: pt ? 'Times comuns' : 'Common teams' },
                ].map((tb) => (
                    <button
                        key={tb.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === tb.id}
                        onClick={() => setTab(tb.id)}
                        className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tab === tb.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg'}`}
                    >
                        {tb.label}
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
                {tab === 'usage' && (
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={pt ? 'Buscar Pokémon…' : 'Search Pokémon…'}
                            className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-9 text-sm text-fg focus:border-primary focus:outline-none"
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-fg" aria-label={t('common.clear')}>
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
                {formats.length > 0 && (
                    <div className="ml-auto">
                        <RegulationSelect formats={formats} value={fmtId} onChange={setFmt} pt={pt} />
                    </div>
                )}
            </div>

            {tab === 'teams' ? (
                <section>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-muted">
                            <Users className="h-4 w-4" /> {pt ? 'Times mais usados' : 'Most-used teams'}
                        </h2>
                        {!regHasTeams && format && (
                            <span className="text-[11px] text-muted">
                                {pt ? '(todas as regulações — sem times de torneio nesta ainda)' : '(all regulations — no tournament teams in this one yet)'}
                            </span>
                        )}
                    </div>
                    {teamCompositions.length === 0 ? (
                        <EmptyState compact title={pt ? 'Sem times' : 'No teams'} message={pt ? 'Sem dados de times de torneio.' : 'No tournament team data available.'} />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {teamCompositions.map((tm, i) => (
                                <button
                                    key={tm.ids.join('-')}
                                    type="button"
                                    onClick={() => openTeam(tm.teamId)}
                                    className="group flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-raised px-1 text-[10px] font-bold text-muted">#{i + 1}</span>
                                        <span className="text-right">
                                            <span className="text-sm font-extrabold tabular-nums text-primary">{tm.count}</span>
                                            <span className="ml-1 text-[11px] text-muted">{tm.count > 1 ? (pt ? 'times' : 'teams') : (pt ? 'time' : 'team')} · {tm.pct}%</span>
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {tm.ids.map((id, j) => (
                                            <MonSprite key={`${id}-${j}`} id={id} name={tm.names[j]} className="h-12 w-12 image-pixelated" />
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="min-w-0 truncate text-[11px] text-muted">{[tm.tournament, tm.placement].filter(Boolean).join(' · ')}</span>
                                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted transition-colors group-hover:text-primary" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Ranked usage grid */}
                <section className="lg:col-span-2">
                    <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-muted">
                        {pt ? 'Pokémon mais usados' : 'Top Pokémon'}
                    </h2>
                    {visible.length === 0 ? (
                        <EmptyState compact title={pt ? 'Nenhum resultado' : 'No matches'} message={pt ? 'Tente outra busca.' : 'Try another search.'} />
                    ) : (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 motion-stagger">
                            {visible.map((mon, i) => {
                                const rank = query ? ranked.indexOf(mon) + 1 : i + 1;
                                return (
                                    <button
                                        key={mon.id}
                                        type="button"
                                        onClick={() => openMon(mon.id)}
                                        className="group relative flex flex-col items-center rounded-2xl border border-border bg-surface p-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        <span className="absolute left-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-raised px-1 text-[10px] font-bold text-muted">{rank}</span>
                                        <MonSprite id={mon.id} name={mon.name} className="h-16 w-16 image-pixelated" />
                                        <span className="w-full truncate text-[12px] font-bold capitalize text-fg">{pretty(mon.name)}</span>
                                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                                            <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(mon.pct, 3)}%` }} />
                                        </div>
                                        <span className="mt-1 text-[10px] font-semibold tabular-nums text-muted">
                                            {mon.pct}% {usingSmogon ? (pt ? 'uso' : 'usage') : `· ${mon.count} ${pt ? 'times' : 'teams'}`}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Common team cores (from real tournament teams) */}
                <section className="space-y-5">
                    <div>
                        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-muted">
                            <Layers className="h-4 w-4" /> {pt ? 'Duplas comuns' : 'Common pairs'}
                        </h2>
                        <div className="space-y-2">
                            {cores2.length
                                ? cores2.map((c, i) => <CoreRow key={c.ids.join('-')} core={c} rank={i + 1} onOpenMon={openMon} />)
                                : <p className="text-xs text-muted">{pt ? 'Dados insuficientes.' : 'Not enough data.'}</p>}
                        </div>
                    </div>
                    {cores3.length > 0 && (
                        <div>
                            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-muted">
                                <Layers className="h-4 w-4" /> {pt ? 'Trios comuns' : 'Common trios'}
                            </h2>
                            <div className="space-y-2">
                                {cores3.map((c, i) => <CoreRow key={c.ids.join('-')} core={c} rank={i + 1} onOpenMon={openMon} />)}
                            </div>
                        </div>
                    )}
                </section>
            </div>
            )}
        </div>
    );
}
