import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Layers, X, Users, ArrowUpRight } from 'lucide-react';

import { useTournamentData } from '../../hooks/useTournamentData';
import { useUsageIndex, useUsageFormat } from '../../hooks/useUsageStats';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { EmptyState } from '../EmptyState';
import { rankUsage, commonCores, commonTeams } from '../../utils/metaUsage';
import { filterRows, ladderPairs, sortRows, usageRows } from '../../utils/metaFormats';
import { MonSprite, pretty, SourceCredit } from './metaShared';
import { CutoffSelect, FormatPicker, TypeFilter } from './metaControls';
import '../../styles/meta-view.css';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useProgressiveReveal } from '../../hooks/useProgressiveReveal';
import { useReferenceStore } from '../../store/useReferenceStore';
import { maxWidthBelow } from '../../constants/breakpoints';
import { ShowMoreButton } from '../ShowMoreButton';
import { Loader } from '../Loader';

// A single core row (2-, 3- or 4-Pokémon grouping) with the sprites and share.
// `unit` names what `count` counts — tournament teams, or weighted ladder games
// for a Smogon tier's teammate data. They are not the same quantity.
function CoreRow({ core, rank, onOpenMon, unit = 'teams' }) {
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
                <span className="block text-[10px] tabular-nums text-muted">{core.count.toLocaleString()} {unit}</span>
            </div>
        </div>
    );
}

/**
 * Meta & Usage — the competitive command centre. Ranks Pokémon by real Smogon
 * ladder usage for the selected format — every current tier (OU → ZU, LC,
 * Monotype, Doubles, National Dex, past-gen OU) as well as the VGC and Pokémon
 * Champions regulations — at whichever ladder rating band the user picks. Also
 * shows the most common tournament-team cores. Clicking a Pokémon opens its
 * focused usage page (exactly what it runs) carrying the current format.
 */
export function MetaUsageView() {
    const { t, language } = useTranslation();
    const pt = language === 'pt';
    useDocumentMeta({
        title: 'Meta & Usage',
        description: 'Competitive usage stats for every Smogon tier and VGC regulation: top Pokémon, items, moves, spreads, and Tera types from real ladder data.',
        path: '/meta',
    });
    const navigate = useNavigate();
    const { linkState } = useEntityNavigate();
    const [params, setParams] = useSearchParams();

    const { formats, defaultFormatId, month, status: idxStatus } = useUsageIndex();
    const fmtId = params.get('fmt') || defaultFormatId || '';
    const {
        data: usageData, format, totalBattles,
        cutoffs, detailCutoff, activeCutoff, status: fmtStatus,
    } = useUsageFormat(fmtId, params.get('cut'));
    const { teams } = useTournamentData();

    // Types come from the Pokédex index (the app's canonical source) rather than
    // being duplicated into every baked usage file.
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);
    const typesById = useMemo(() => {
        const map = new Map();
        for (const p of pokemonIndex) if (!map.has(p.id) && p.types?.length) map.set(p.id, p.types);
        return map;
    }, [pokemonIndex]);

    const [search, setSearch] = useState('');
    // Active tab lives in the URL (?tab=teams) so it's shareable and survives back-nav.
    // `tab` is resolved again below once we know whether the format is a tier:
    // the tournament-team dataset is VGC-only, so "Common teams" is not a view a
    // Smogon tier has.
    const wantsTeams = params.get('tab') === 'teams';
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

    // Sort mode for the usage list: by raw usage (default), by tournament
    // win-rate, or alphabetically — the last one matters now that a tier can
    // list 200 Pokémon and "is X in this tier?" is a real question. Lives in the
    // URL (?sort=wr) so it's shareable + survives back-nav.
    const SORTS = ['usage', 'wr', 'name'];
    const sortMode = SORTS.includes(params.get('sort')) ? params.get('sort') : 'usage';
    const setSortMode = (id) => setParams((prev) => {
        const p = new URLSearchParams(prev);
        if (id === 'usage') p.delete('sort'); else p.set('sort', id);
        return p;
    }, { replace: true });

    // Type filter (?type=fire,water) — also in the URL, so a filtered tier is a
    // link you can send someone.
    const typeFilter = useMemo(
        () => (params.get('type') || '').split(',').map((s) => s.trim()).filter(Boolean),
        [params],
    );
    const setTypeFilter = (types) => setParams((prev) => {
        const p = new URLSearchParams(prev);
        if (types.length) p.set('type', types.join(',')); else p.delete('type');
        return p;
    }, { replace: true });

    // Usage ranking for the selected format at the selected rating band (falls
    // back to tournament appearance counts if the usage dataset isn't
    // available). Carries win-rate when the dataset has it (Limitless-mined).
    const smogonRanked = useMemo(
        () => sortRows(usageRows(usageData, activeCutoff), sortMode)
            .map((r) => ({ ...r, pct: r.usage, count: r.rawCount })),
        [usageData, activeCutoff, sortMode],
    );
    // The "#N" badge is the Pokémon's standing on the ladder, so it is computed
    // once in usage order and looked up — not taken from its position in the
    // list, which under A–Z sort or a type filter would say something false.
    const rankById = useMemo(() => {
        const rows = usageData ? usageRows(usageData, activeCutoff) : [];
        return new Map(rows.map((r, i) => [r.id, i + 1]));
    }, [usageData, activeCutoff]);
    const usingSmogon = smogonRanked.length > 0;
    const hasWinRates = useMemo(() => smogonRanked.some((r) => Number.isFinite(r.winRate)), [smogonRanked]);
    const tournamentRanked = useMemo(() => rankUsage(teams), [teams]);
    // The tournament-team ranking is a VGC sample, so it can only stand in for a
    // VGC regulation. Falling back to it for, say, Gen 8 Ubers would print VGC
    // Pokémon under a tier that has never seen them — an empty state is honest
    // and a wrong list is not.
    const selectedFormat = useMemo(() => formats.find((f) => f.id === fmtId) || null, [formats, fmtId]);
    const isTier = selectedFormat?.kind === 'tier';
    const tab = wantsTeams && !isTier ? 'teams' : 'usage';
    const ranked = useMemo(
        () => (usingSmogon ? smogonRanked : (isTier ? [] : tournamentRanked)),
        [usingSmogon, smogonRanked, isTier, tournamentRanked],
    );

    // Pairs and trios come from the baked tournament teams — a VGC sample, so it
    // can sit beside a VGC regulation but not beside Gen 8 Ubers. A tier gets the
    // partnerships from its own ladder instead (the `teammates` counts in its
    // usage file), which is both correct for it and better data.
    const cores2 = useMemo(
        () => (isTier ? ladderPairs(usageData, 6) : commonCores(teams, 2, 6)),
        [isTier, usageData, teams],
    );
    const cores3 = useMemo(() => (isTier ? [] : commonCores(teams, 3, 6)), [isTier, teams]);

    const query = search.trim().toLowerCase();
    const visible = useMemo(
        () => filterRows(ranked, { query, types: typeFilter, typesById }),
        [ranked, query, typeFilter, typesById],
    );

    // On a phone the ranking is one two-column grid of every Pokémon in the
    // format, stacked *above* the pairs and trios — ~12,000px of scroll before
    // either is reachable. Reveal it in pages there; desktop keeps the full grid
    // beside the cores. A new format, sort or search starts from the first page.
    const isMobile = useMediaQuery(maxWidthBelow('lg'));
    const reveal = useProgressiveReveal(visible.length, {
        initial: 12,
        step: 24,
        enabled: isMobile,
        resetKey: `${fmtId}|${activeCutoff}|${sortMode}|${query}|${typeFilter.join(',')}`,
    });

    // Changing the format drops the rating band: the bands a format publishes
    // differ (VGC runs 1630, OU runs 1695/1825), so carrying ?cut across would
    // ask for one the new ladder never had. Everything else is kept.
    const setFmt = (id) => setParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('fmt', id);
        p.delete('cut');
        return p;
    }, { replace: true });
    const setCutoff = (c) => setParams((prev) => {
        const p = new URLSearchParams(prev);
        if (c === detailCutoff) p.delete('cut'); else p.set('cut', String(c));
        return p;
    }, { replace: true });

    const monQuery = new URLSearchParams();
    if (fmtId) monQuery.set('fmt', fmtId);
    if (params.get('cut')) monQuery.set('cut', params.get('cut'));
    const monSuffix = monQuery.toString() ? `?${monQuery}` : '';
    const openMon = (id) => navigate(`/meta/${id}${monSuffix}`, { state: linkState });
    const openTeam = (teamId) => navigate(`/tournaments/team/${teamId}`, { state: linkState });

    const loading = idxStatus === 'loading' || (usingSmogon ? false : fmtStatus === 'loading');
    if (loading && !ranked.length) {
        return (
            <Loader size="lg" block />
        );
    }

    // A tier with no baked file is a ladder that did not run (or publish) last
    // month — say that, and leave the picker reachable above the message.
    const noData = !ranked.length;
    const battlesLabel = totalBattles ? totalBattles.toLocaleString(pt ? 'pt-BR' : 'en-US') : '';

    return (
        <div className="mx-auto max-w-[1600px] sm:px-5 sm:py-5">
            <header className="mb-4 sm:mb-5">
                {/* No padding of its own on a phone: .app-shell__body is already the
                    gutter, and a second px-3 inside it put this text 12px right
                    of the page title above it — and its py-4 stacked into a blank
                    band under the header. No line clamp either: a lead paragraph
                    cut off at "clique em um..." reads as broken. The how-to clause
                    is for a pointer; on a phone the cards are plainly tappable,
                    so dropping it is what lets the sentence end on its own. */}
                <p className="max-w-2xl text-[13px] text-muted sm:text-sm">
                    {usingSmogon && format ? (
                        <>
                            {pt
                                ? `Uso real de ${format.label} no ladder competitivo${battlesLabel ? ` (${battlesLabel} partidas${month ? `, ${month}` : ''})` : ''}`
                                : `Real ${format.label} ladder usage${battlesLabel ? ` (${battlesLabel} games${month ? `, ${month}` : ''})` : ''}`}
                            {cutoffs.length > 1 && activeCutoff > 0 && (
                                <span className="whitespace-nowrap">{pt ? `, rating ${activeCutoff}+` : `, rated ${activeCutoff}+`}</span>
                            )}
                            <span className="sm:hidden">.</span>
                            <span className="hidden sm:inline">
                                {pt
                                    ? ' — clique em um Pokémon para ver exatamente o que ele roda.'
                                    : ' — click any Pokémon to see exactly what it runs (items, moves, spreads, Tera & partners).'}
                            </span>
                        </>
                    ) : (pt
                        ? 'Pokémon mais usados nos times recentes de torneios — clique para ver o que estão rodando.'
                        : 'Most-used Pokémon across recent tournament teams — click any to see what they run.')}
                </p>
                <SourceCredit pt={pt} sources={['smogon', 'vgcpastes', 'pikalytics']} className="mt-2.5" />
            </header>

            {/* Tabs. Only two views exist for a VGC regulation; a Smogon tier has
                one, because the tournament-team dataset behind "Common teams" is
                a VGC sample and would list VGC teams under, say, Gen 8 Ubers. */}
            {!isTier && (
                <div role="tablist" aria-label={pt ? 'Visões do meta' : 'Meta views'} className="tabs mb-4">
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
                            className="tabs__item"
                        >
                            {tb.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Toolbar, in two rows on a phone. Row one is the context
                everything below depends on — which ladder, at which rating —
                and takes the full width so it reads as the heading it is. Row
                two is what you do to the list: search, type, order. Left to
                wrap freely these landed in a ragged block; pinning the rows
                keeps one top and bottom edge per row. */}
            {tab === 'usage' && (
                <div className="meta-toolbar__context mb-3 flex flex-wrap items-center gap-2">
                    <FormatPicker
                        formats={formats}
                        value={fmtId}
                        onChange={setFmt}
                        pt={pt}
                        className="min-w-0 flex-1 sm:flex-none sm:min-w-[13rem]"
                    />
                    <CutoffSelect cutoffs={cutoffs} value={activeCutoff} onChange={setCutoff} pt={pt} />
                </div>
            )}
            <div className="mb-5 flex flex-wrap items-center gap-2">
                {tab === 'usage' && (
                    <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={pt ? 'Buscar Pokémon…' : 'Search Pokémon…'}
                            className="min-h-11 w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-9 text-sm text-fg focus:border-primary focus:outline-none"
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch('')} className="touch-target absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-fg" aria-label={t('common.clear')}>
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
                {tab === 'usage' && (
                    <div className="segmented segmented--lg" role="group" aria-label={pt ? 'Ordenar por' : 'Sort by'}>
                        {[
                            { id: 'usage', label: pt ? 'Uso' : 'Usage' },
                            ...(hasWinRates ? [{ id: 'wr', label: pt ? 'Vitórias' : 'Win rate' }] : []),
                            { id: 'name', label: 'A–Z' },
                        ].map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setSortMode(s.id)}
                                aria-pressed={sortMode === s.id}
                                className="segmented__item"
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                )}
                {tab === 'usage' && <TypeFilter selected={typeFilter} onChange={setTypeFilter} pt={pt} />}
                {tab === 'teams' && formats.length > 0 && (
                    <div className="w-full sm:ml-auto sm:w-auto">
                        <FormatPicker formats={formats} value={fmtId} onChange={setFmt} pt={pt} className="w-full sm:w-auto" />
                    </div>
                )}
            </div>

            {noData ? (
                <EmptyState
                    title={pt ? 'Sem dados deste formato' : 'No data for this format'}
                    message={isTier
                        ? (pt
                            ? 'Esta ladder não publicou estatísticas no mês mais recente do Smogon. Escolha outro formato acima.'
                            : 'This ladder published no stats for Smogon’s latest month. Pick another format above.')
                        : (pt ? 'Os dados de uso ainda não carregaram.' : 'Usage data has not loaded yet.')}
                />
            ) : tab === 'teams' ? (
                <section>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="flex items-center gap-1.5 text-base font-semibold text-fg">
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
                                    className="group flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-3 text-left transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                    <h2 className="mb-3 flex items-center gap-1.5 text-base font-semibold text-fg">
                        {pt ? 'Pokémon mais usados' : 'Top Pokémon'}
                    </h2>
                    {visible.length === 0 ? (
                        <EmptyState compact title={pt ? 'Nenhum resultado' : 'No matches'} message={pt ? 'Tente outra busca ou limpe os filtros.' : 'Try another search, or clear the filters.'} />
                    ) : (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 motion-stagger">
                            {visible.slice(0, reveal.limit).map((mon) => {
                                // The mon's standing on the ladder, never its
                                // position in this list — a filtered or A–Z list
                                // renumbered 1..n would claim Pikachu is #1 in OU.
                                const rank = rankById.get(mon.id) ?? (ranked.indexOf(mon) + 1);
                                return (
                                    <button
                                        key={mon.id}
                                        type="button"
                                        onClick={() => openMon(mon.id)}
                                        className="meta-mon-card group relative flex flex-col items-center rounded-2xl border border-border bg-surface p-2.5 text-center transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        <span className="absolute left-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-raised px-1 text-[10px] font-bold text-muted">{rank}</span>
                                        <MonSprite id={mon.id} name={mon.name} className="h-16 w-16 image-pixelated" />
                                        <span className="w-full truncate text-[12px] font-bold capitalize text-fg">{pretty(mon.name)}</span>
                                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                                            <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(mon.pct, 3)}%` }} />
                                        </div>
                                        <span className="meta-mon-card__pct mt-1 text-[10px] font-semibold tabular-nums text-muted">
                                            <strong className="meta-mon-card__value">{mon.pct}%</strong> {usingSmogon ? (pt ? 'uso' : 'usage') : `· ${mon.count} ${pt ? 'times' : 'teams'}`}
                                        </span>
                                        {Number.isFinite(mon.winRate) && (
                                            <span className="text-[10px] font-semibold tabular-nums text-muted">
                                                {mon.winRate}% {pt ? 'vit' : 'WR'}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {reveal.hasMore && (
                        <ShowMoreButton remaining={reveal.remaining} onClick={reveal.showMore} />
                    )}
                </section>

                {/* Pairs — from this ladder's own teammate counts on a tier, from
                    the tournament teams on a VGC regulation. The source is named
                    under the heading, because "28%" means a different thing in
                    each and the panel should not pretend otherwise. */}
                <section className="space-y-5">
                    <div>
                        <h2 className="mb-1 flex items-center gap-1.5 text-base font-semibold text-fg">
                            <Layers className="h-4 w-4" /> {pt ? 'Duplas comuns' : 'Common pairs'}
                        </h2>
                        <p className="mb-3 text-[0.6875rem] text-muted">
                            {isTier
                                ? (pt ? 'Parceiros mais frequentes no ladder' : 'Most frequent partners on the ladder')
                                : (pt ? 'De times recentes de torneios' : 'From recent tournament teams')}
                        </p>
                        <div className="space-y-2">
                            {cores2.length
                                ? cores2.map((c, i) => (
                                    <CoreRow
                                        key={c.ids.join('-')}
                                        core={c}
                                        rank={i + 1}
                                        onOpenMon={openMon}
                                        unit={isTier ? (pt ? 'jogos' : 'games') : (pt ? 'times' : 'teams')}
                                    />
                                ))
                                : <p className="text-xs text-muted">{pt ? 'Dados insuficientes.' : 'Not enough data.'}</p>}
                        </div>
                    </div>
                    {cores3.length > 0 && (
                        <div>
                            <h2 className="mb-3 flex items-center gap-1.5 text-base font-semibold text-fg">
                                <Layers className="h-4 w-4" /> {pt ? 'Trios comuns' : 'Common trios'}
                            </h2>
                            <div className="space-y-2">
                                {cores3.map((c, i) => (
                                    <CoreRow key={c.ids.join('-')} core={c} rank={i + 1} onOpenMon={openMon} unit={pt ? 'times' : 'teams'} />
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </div>
            )}
        </div>
    );
}
