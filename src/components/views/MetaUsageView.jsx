import React, { Suspense, lazy, memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Layers, X, Users, ArrowUpRight, SlidersHorizontal, Info } from 'lucide-react';

import { useTournamentData } from '../../hooks/useTournamentData';
import { useUsageIndex, useUsageFormat } from '../../hooks/useUsageStats';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { EmptyState } from '../EmptyState';
import { rankUsage, commonCores, commonTeams } from '../../utils/metaUsage';
import { TOUR_BAND, cutoffLabel, filterRows, ladderPairs, sortRows, usageRows } from '../../utils/metaFormats';
import { MonSprite, SourceCredit } from './metaShared';
import { useMascotStore } from '../../store/useMascotStore';
import { pretty } from '../../utils/metaFormat';
import { CutoffSelect, FormatPicker, TypeFilter } from './metaControls';
import { AnchoredPopover } from '../AnchoredPopover';
import { MetaRowPopover } from '../meta/MetaRowPopover';
import '../../styles/meta-view.css';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useProgressiveReveal } from '../../hooks/useProgressiveReveal';
import { useReferenceStore } from '../../store/useReferenceStore';
import { maxWidthBelow } from '../../constants/breakpoints';
import { ShowMoreButton } from '../ShowMoreButton';
import { BottomSheet } from '../BottomSheet';
import { Loader } from '../Loader';
import { DataNotes } from '../DataNotes';
import { metaNotes } from '../../utils/dataNotes';
import { useUrlParam } from '../../hooks/useUrlParam';
import { typeColors, typeIcons } from '../../constants/types';

// --card-type for `.type-platform`: the Pokémon's first type, when the index
// knows it (a forme the index does not list simply stands on nothing).
const platformStyle = (typesById, id) => {
    const tone = typeColors[typesById.get(id)?.[0]];
    return tone ? { '--card-type': tone } : undefined;
};

// Ranked rows: #1 wears Shiny Gold ink (earned meta crown), #2-#3 wear Volt ink,
// #4+ stay quiet muted mono. Plain numeral, never a badge chip.
const rankClass = (rank) => {
    if (rank === 1) return 'meta-rank is-gold';
    if (rank === 2 || rank === 3) return 'meta-rank is-top';
    return 'meta-rank';
};

const isTopPlacement = (placement = '') => /^(champion|winner|1st|1º|campe)/i.test(String(placement).trim());

const placeBadgeClass = (rank, placement) => {
    if (rank === 1 || isTopPlacement(placement)) return 'meta-place-pill badge--gold';
    if (rank === 2 || rank === 3) return 'meta-place-pill meta-place-pill--top';
    return 'meta-place-pill';
};

const shortSpeciesLabel = (name = '') => pretty(String(name).replace(/-Mega(-[A-Z])?$/i, '-M'));

const TournamentSheetModal = lazy(() => import('../modals/TournamentSheetModal').then((m) => ({ default: m.TournamentSheetModal })));

// "2026-10-01" → "1 out" / "Oct 1". Parsed as a calendar day, not a UTC
// instant, so it never slides to the previous day west of Greenwich.
const formatDay = (iso, pt) => {
    const [y, m, d] = String(iso).split('-').map(Number);
    if (!y || !m || !d) return iso;
    return new Date(y, m - 1, d).toLocaleDateString(pt ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'short' });
};

/**
 * Single-line AffectUI-inspired ranked telemetry row:
 * tabular rank | sprite on type platform | species + types | type-tinted waterfall | tabular % & WR.
 */
const UsageRow = memo(function UsageRow({
    mon,
    rank,
    monSuffix,
    linkState,
    types,
    usingSmogon,
    hasWinRates,
    pt,
    onHoverEnter,
    onHoverLeave,
}) {
    const primaryType = types?.[0];
    const tone = primaryType ? typeColors[primaryType] : null;
    const pctNum = Number(mon.pct) || 0;
    const pctLabel = usingSmogon ? pctNum.toFixed(1) : String(pctNum);
    const hasWr = Number.isFinite(mon.winRate);
    const wrTone = hasWr ? (mon.winRate >= 52 ? 'is-positive' : mon.winRate < 48 ? 'is-negative' : '') : '';
    const secondaryCol = hasWinRates || !usingSmogon;

    return (
        <li>
            <Link
                to={`/meta/${mon.id}${monSuffix}`}
                state={linkState}
                className={`meta-row ${secondaryCol ? 'has-wr' : ''}`}
                style={tone ? { '--mon-tone': tone } : undefined}
                onPointerEnter={(event) => onHoverEnter?.(mon, rank, event.currentTarget)}
                onPointerLeave={() => onHoverLeave?.(mon.id)}
            >
                <span className={`${rankClass(rank)} meta-row__rank`}>#{rank}</span>
                <span
                    className="meta-row__sprite-wrap type-platform"
                    style={tone ? { '--card-type': tone } : undefined}
                >
                    <MonSprite id={mon.id} name={mon.name} alt="" className="meta-row__sprite image-pixelated" />
                </span>
                <span className="meta-row__ident">
                    <span className="meta-row__name">{pretty(mon.name)}</span>
                    {types?.length > 0 && (
                        <span className="meta-row__types" aria-hidden="true">
                            {types.slice(0, 2).map((tp) => (
                                typeIcons[tp]
                                    ? <img key={tp} src={typeIcons[tp]} alt="" className="meta-row__type-icon" />
                                    : null
                            ))}
                        </span>
                    )}
                </span>
                <span className="meta-row__track" aria-hidden="true">
                    <span className="meta-row__fill" style={{ width: `${Math.min(Math.max(pctNum, 2), 100)}%` }} />
                </span>
                <span className="meta-row__stats">
                    <span className="meta-row__pct">{pctLabel}%</span>
                    {hasWinRates ? (
                        <span className={`meta-row__wr ${wrTone}`}>
                            {hasWr ? `${Number(mon.winRate).toFixed(1)}%` : '—'}
                        </span>
                    ) : !usingSmogon ? (
                        <span className="meta-row__wr">
                            {mon.count} {pt ? 'times' : 'teams'}
                        </span>
                    ) : null}
                </span>
            </Link>
        </li>
    );
});

/**
 * A single core row (2- or 3-Pokémon grouping) with overlapping sprites and share.
 * Borderless fill inside `.meta-panel` (0-1-2 containment).
 */
const CoreRow = memo(function CoreRow({ core, rank, onOpenMon, unit = 'teams', locale }) {
    return (
        <li className="meta-core-row">
            <span className={`${rankClass(rank)} meta-core-row__rank`}>#{rank}</span>
            <div className="meta-core-row__sprites">
                {core.ids.map((id, idx) => {
                    const rawName = core.names[idx] || '';
                    const label = pretty(rawName);
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onOpenMon(id)}
                            title={label}
                            aria-label={label}
                            className="meta-core-row__mon"
                        >
                            <MonSprite id={id} name={rawName} alt="" className="h-8 w-8 image-pixelated" />
                        </button>
                    );
                })}
            </div>
            <span className="meta-core-row__name">
                {core.names.map(pretty).join(' · ')}
            </span>
            <div className="meta-core-row__stats">
                <span className="meta-core-row__pct">{core.pct}%</span>
                <span className="meta-core-row__count">
                    {core.count.toLocaleString(locale)} {unit}
                </span>
            </div>
        </li>
    );
});

/**
 * Tournament Top-Cut composition strip (Peça 03):
 * placement badge + tabular share | title + player | 6-Pokémon platform strip | event link + Inspect Sheet CTA.
 */
const TeamStripCard = memo(function TeamStripCard({
    tm,
    fullTeam,
    rank,
    typesById,
    linkState,
    pt,
    t,
    onInspect,
}) {
    const unitLabel = tm.count > 1 ? (pt ? 'times' : 'teams') : (pt ? 'time' : 'team');
    const placement = fullTeam?.placement || tm.placement || '';
    const badgeLabel = [rank ? `#${rank}` : null, placement || null].filter(Boolean).join(' · ');
    const teamTitle = fullTeam?.title || tm.tournament || (pt ? 'Time de torneio' : 'Tournament team');
    const subLine = [fullTeam?.player, fullTeam?.format || tm.format, fullTeam?.date].filter(Boolean).join(' · ');
    const roster = Array.isArray(fullTeam?.pokemons) && fullTeam.pokemons.length > 0
        ? fullTeam.pokemons.slice(0, 6)
        : tm.ids.slice(0, 6).map((id, j) => ({ id, name: tm.names[j] }));

    return (
        <article className="meta-team-card">
            <div className="meta-team-card__head">
                <span className="meta-team-card__lead">
                    <span className={placeBadgeClass(rank, placement)}>
                        {badgeLabel}
                    </span>
                </span>
                <span className="meta-team-card__share">
                    <strong>{tm.pct}%</strong> · {tm.count} {unitLabel}
                </span>
            </div>

            <div className="meta-team-card__identity">
                <Link
                    to={`/tournaments/team/${tm.teamId}`}
                    state={linkState}
                    className="meta-team-card__title"
                >
                    {teamTitle}
                </Link>
                {subLine && <p className="meta-team-card__sub">{subLine}</p>}
            </div>

            <div className="meta-team-card__roster">
                {roster.map((mon, j) => (
                    <span key={`${mon.id}-${j}`} className="meta-team-card__slot">
                        <span
                            className="meta-team-card__sprite-wrap type-platform"
                            style={platformStyle(typesById, mon.id)}
                        >
                            <MonSprite
                                id={mon.id}
                                name={mon.name}
                                item={mon.item}
                                className="meta-team-card__sprite image-pixelated"
                            />
                        </span>
                        <span className="meta-team-card__mon-name">
                            {shortSpeciesLabel(mon.name)}
                        </span>
                    </span>
                ))}
            </div>

            <div className="meta-team-card__foot">
                <Link
                    to={`/tournaments/team/${tm.teamId}`}
                    state={linkState}
                    className="meta-team-card__event"
                >
                    <span>{tm.tournament || (pt ? 'Time de torneio' : 'Tournament team')}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </Link>
                {fullTeam && (
                    <button
                        type="button"
                        onClick={() => onInspect(tm, rank, fullTeam)}
                        aria-label={t('meta.sheet.inspectAria', { name: teamTitle })}
                        className="btn btn-sm t-sheet-trigger"
                    >
                        {t('meta.sheet.inspect')}
                    </button>
                )}
            </div>
        </article>
    );
});

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
    const locale = pt ? 'pt-BR' : 'en-US';
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
        data: usageData, format, totalBattles, tournament,
        cutoffs, detailCutoff, activeCutoff, status: fmtStatus,
    } = useUsageFormat(fmtId, params.get('cut'));
    const { teams } = useTournamentData();
    const teamById = useMemo(() => new Map(teams.map((tm) => [tm.id, tm])), [teams]);
    const [inspectedSheet, setInspectedSheet] = useState(null);
    const handleInspectSheet = useCallback((tm, rank, fullTeam) => {
        if (!fullTeam) return;
        setInspectedSheet({
            team: fullTeam,
            rank,
            sharePct: tm.pct,
            shareCount: tm.count,
        });
    }, []);

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

    // The search is in the URL too (?q=), with the format, tab, sort and cutoff.
    const [search, setSearch] = useUrlParam('q');
    // Active tab lives in the URL (?tab=teams) so it's shareable and survives back-nav.
    const wantsTeams = params.get('tab') === 'teams';
    const setTab = (id) => setParams((prev) => {
        const p = new URLSearchParams(prev);
        if (id === 'usage') p.delete('tab'); else p.set('tab', id);
        return p;
    });

    // Tournament teams for the selected regulation.
    const regToken = (format?.label || '').replace(/vgc/i, '').replace(/\b\d{4}\b/, '').replace(/\s+/g, ' ').trim();
    const { teamsForReg, regHasTeams } = useMemo(() => {
        if (!regToken) return { teamsForReg: teams, regHasTeams: true };
        const matched = teams.filter((tm) => (tm.format || '').toLowerCase() === regToken.toLowerCase());
        return matched.length ? { teamsForReg: matched, regHasTeams: true } : { teamsForReg: teams, regHasTeams: false };
    }, [teams, regToken]);
    const teamCompositions = useMemo(() => commonTeams(teamsForReg, 24), [teamsForReg]);

    // Sort mode for the usage list: by raw usage (default), win-rate, or A-Z.
    const SORTS = ['usage', 'wr', 'name'];
    const sortMode = SORTS.includes(params.get('sort')) ? params.get('sort') : 'usage';
    const setSortMode = (id) => setParams((prev) => {
        const p = new URLSearchParams(prev);
        if (id === 'usage') p.delete('sort'); else p.set('sort', id);
        return p;
    }, { replace: true });

    // Type filter (?type=fire,water).
    const typeFilter = useMemo(
        () => (params.get('type') || '').split(',').map((s) => s.trim()).filter(Boolean),
        [params],
    );
    const setTypeFilter = (types) => setParams((prev) => {
        const p = new URLSearchParams(prev);
        if (types.length) p.set('type', types.join(',')); else p.delete('type');
        return p;
    }, { replace: true });

    const smogonRanked = useMemo(
        () => sortRows(usageRows(usageData, activeCutoff), sortMode)
            .map((r) => ({ ...r, pct: r.usage, count: r.rawCount })),
        [usageData, activeCutoff, sortMode],
    );
    // The "#N" figure is the Pokémon's standing on the ladder, computed once in
    // usage order so A-Z sort or a type filter never claims a filtered mon is #1.
    const rankById = useMemo(() => {
        const rows = usageData ? usageRows(usageData, activeCutoff) : [];
        return new Map(rows.map((r, i) => [r.id, i + 1]));
    }, [usageData, activeCutoff]);
    const usingSmogon = smogonRanked.length > 0;
    const hasWinRates = useMemo(() => smogonRanked.some((r) => Number.isFinite(r.winRate)), [smogonRanked]);
    const tournamentRanked = useMemo(() => rankUsage(teams), [teams]);

    const selectedFormat = useMemo(() => formats.find((f) => f.id === fmtId) || null, [formats, fmtId]);
    const isTier = selectedFormat?.kind === 'tier';
    const tab = wantsTeams && !isTier ? 'teams' : 'usage';
    const ranked = useMemo(
        () => (usingSmogon ? smogonRanked : (isTier ? [] : tournamentRanked)),
        [usingSmogon, smogonRanked, isTier, tournamentRanked],
    );

    const cores2 = useMemo(
        () => (isTier ? ladderPairs(usageData, 6) : commonCores(teams, 2, 6)),
        [isTier, usageData, teams],
    );
    const cores3 = useMemo(() => (isTier ? [] : commonCores(teams, 3, 6)), [isTier, teams]);

    const rawQuery = search.trim().toLowerCase();
    const deferredQuery = useDeferredValue(rawQuery);
    const visible = useMemo(
        () => filterRows(ranked, { query: deferredQuery, types: typeFilter, typesById }),
        [ranked, deferredQuery, typeFilter, typesById],
    );

    // Paged on both phone and desktop so first paint stays well within the 60-item budget.
    const isMobile = useMediaQuery(maxWidthBelow('lg'));
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [sourcesOpen, setSourcesOpen] = useState(false);
    const sourcesBtnRef = useRef(null);
    const sourcesPopoverRef = useRef(null);

    // Desktop hover telemetry preview for usage rows (180ms enter, 100ms leave grace).
    const [hoveredRow, setHoveredRow] = useState(null);
    const hoverEnterTimerRef = useRef(0);
    const hoverLeaveTimerRef = useRef(0);

    const clearHoverTimers = useCallback(() => {
        if (hoverEnterTimerRef.current) {
            window.clearTimeout(hoverEnterTimerRef.current);
            hoverEnterTimerRef.current = 0;
        }
        if (hoverLeaveTimerRef.current) {
            window.clearTimeout(hoverLeaveTimerRef.current);
            hoverLeaveTimerRef.current = 0;
        }
    }, []);

    const handleRowHoverEnter = useCallback((mon, rank, element) => {
        if (typeof window === 'undefined' || !element) return;
        if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
        if (hoverLeaveTimerRef.current) {
            window.clearTimeout(hoverLeaveTimerRef.current);
            hoverLeaveTimerRef.current = 0;
        }
        if (hoverEnterTimerRef.current) window.clearTimeout(hoverEnterTimerRef.current);
        hoverEnterTimerRef.current = window.setTimeout(() => {
            hoverEnterTimerRef.current = 0;
            if (!element.isConnected) return;
            setHoveredRow({ mon, rank, rect: element.getBoundingClientRect() });
        }, 180);
    }, []);

    const handleRowHoverLeave = useCallback(() => {
        if (hoverEnterTimerRef.current) {
            window.clearTimeout(hoverEnterTimerRef.current);
            hoverEnterTimerRef.current = 0;
        }
        if (hoverLeaveTimerRef.current) window.clearTimeout(hoverLeaveTimerRef.current);
        hoverLeaveTimerRef.current = window.setTimeout(() => {
            hoverLeaveTimerRef.current = 0;
            setHoveredRow(null);
        }, 100);
    }, []);

    useEffect(() => clearHoverTimers, [clearHoverTimers]);

    useEffect(() => {
        if (!hoveredRow) return undefined;
        const onScroll = () => {
            clearHoverTimers();
            setHoveredRow(null);
        };
        window.addEventListener('scroll', onScroll, { capture: true, passive: true });
        return () => window.removeEventListener('scroll', onScroll, { capture: true });
    }, [hoveredRow, clearHoverTimers]);

    useEffect(() => {
        clearHoverTimers();
        setHoveredRow(null);
    }, [fmtId, activeCutoff, tab, sortMode, deferredQuery, clearHoverTimers]);

    // Dismiss Sources popover on outside click or Escape.
    useEffect(() => {
        if (!sourcesOpen) return undefined;
        const onPointerDown = (event) => {
            if (sourcesPopoverRef.current?.contains(event.target) || sourcesBtnRef.current?.contains(event.target)) return;
            setSourcesOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setSourcesOpen(false);
                sourcesBtnRef.current?.focus();
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [sourcesOpen]);
    const reveal = useProgressiveReveal(visible.length, {
        initial: isMobile ? 20 : 50,
        step: isMobile ? 30 : 50,
        enabled: true,
        resetKey: `${fmtId}|${activeCutoff}|${sortMode}|${deferredQuery}|${typeFilter.join(',')}`,
    });

    const setFmt = (id) => setParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('fmt', id);
        p.delete('cut');
        return p;
    }, { replace: true });
    const setCutoff = (c) => { useMascotStore.getState().emitBeat('start'); setCutoffParam(c); };
    const setCutoffParam = (c) => setParams((prev) => {
        const p = new URLSearchParams(prev);
        if (c === detailCutoff) p.delete('cut'); else p.set('cut', String(c));
        return p;
    }, { replace: true });

    const cutParam = params.get('cut');
    const monSuffix = useMemo(() => {
        const monQuery = new URLSearchParams();
        if (fmtId) monQuery.set('fmt', fmtId);
        if (cutParam) monQuery.set('cut', cutParam);
        const qs = monQuery.toString();
        return qs ? `?${qs}` : '';
    }, [fmtId, cutParam]);

    const openMon = useCallback(
        (id) => navigate(`/meta/${id}${monSuffix}`, { state: linkState }),
        [navigate, monSuffix, linkState],
    );

    const hasFilters = Boolean(rawQuery) || typeFilter.length > 0;
    const clearFilters = () => {
        setSearch('');
        setTypeFilter([]);
    };

    const loading = idxStatus === 'loading' || (usingSmogon ? false : fmtStatus === 'loading');
    if (loading && !ranked.length) {
        return <Loader size="lg" scene="pokedex" block />;
    }

    const noData = !ranked.length;
    const battlesLabel = totalBattles ? totalBattles.toLocaleString(locale) : '';
    const compactBattles = totalBattles > 0
        ? new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 }).format(totalBattles)
        : '';
    const sourcesShort = isTier ? 'Smogon' : 'Smogon / Limitless';
    const sourcesChipText = compactBattles
        ? t('markedUi.meta.sourcesChip', { battles: compactBattles, sources: sourcesShort })
        : sourcesShort;

    const sortControl = (variant) => (
        <div className={`segmented segmented--quiet ${variant}`} role="group" aria-label={pt ? 'Ordenar por' : 'Sort by'}>
            {[
                { id: 'usage', label: pt ? 'Uso' : 'Usage' },
                ...(hasWinRates ? [{ id: 'wr', label: pt ? 'Vitórias' : 'Win rate' }] : []),
                { id: 'name', label: 'A–Z' },
            ].map((option) => (
                <button
                    key={option.id}
                    type="button"
                    onClick={() => setSortMode(option.id)}
                    aria-pressed={sortMode === option.id}
                    className="segmented__item"
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
    const changedFilters = typeFilter.length + (sortMode !== 'usage' ? 1 : 0);
    const secondaryHead = hasWinRates
        ? (pt ? 'Vit.' : 'WR')
        : (!usingSmogon ? (pt ? 'Times' : 'Teams') : null);

    const sourcesSummaryText = usingSmogon && format && activeCutoff === TOUR_BAND && tournament
        ? `${format.label}: ${tournament.teamsAnalyzed.toLocaleString(locale)} ${pt ? 'times' : 'teams'} · ${tournament.tournaments} ${pt ? 'torneios Limitless' : 'Limitless events'}${tournament.from && tournament.to ? ` (${formatDay(tournament.from, pt)} – ${formatDay(tournament.to, pt)})` : ''}`
        : usingSmogon && format
            ? `${format.label}${battlesLabel ? ` · ${battlesLabel} ${pt ? 'partidas' : 'games'}` : ''}${month ? ` · ${month}` : ''}${cutoffs.length > 1 && activeCutoff > 0 ? ` · ${activeCutoff}+` : ''}`
            : (pt
                ? 'Pokémon mais usados nos times recentes de torneios.'
                : 'Most-used Pokémon across recent tournament teams.');

    const hoveredDetail = hoveredRow ? usageData?.byId?.[hoveredRow.mon.id] || null : null;

    return (
        <div className="meta-page">
            <div className="meta-top-bar">
                {!isTier ? (
                    <div role="tablist" aria-label={pt ? 'Visões do meta' : 'Meta views'} className="tabs meta-top-bar__tabs">
                        {[
                            { id: 'usage', label: 'Pokémon' },
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
                ) : (
                    <div className="meta-top-bar__tier-label">
                        <span className="meta-top-bar__tier-name">{format?.label || 'Meta'}</span>
                        {month && <span className="meta-top-bar__tier-month figure">{month}</span>}
                    </div>
                )}

                <button
                    ref={sourcesBtnRef}
                    type="button"
                    onClick={() => setSourcesOpen((prev) => !prev)}
                    aria-expanded={sourcesOpen}
                    aria-haspopup="dialog"
                    className={`meta-sources-chip ${sourcesOpen ? 'is-active' : ''}`}
                >
                    <span className="meta-sources-chip__dot" aria-hidden="true" />
                    <span className="meta-sources-chip__text">{sourcesChipText}</span>
                    <Info className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                </button>

                <AnchoredPopover
                    isOpen={sourcesOpen}
                    anchorRef={sourcesBtnRef}
                    popoverRef={sourcesPopoverRef}
                    placement="bottom"
                    offset={8}
                    zIndex={90}
                    role="dialog"
                    ariaLabel={t('markedUi.meta.sourcesTitle')}
                    className="meta-sources-popover"
                >
                    <div className="meta-sources-popover__head">
                        <h3 className="meta-sources-popover__title">{t('markedUi.meta.sourcesTitle')}</h3>
                        <button
                            type="button"
                            onClick={() => setSourcesOpen(false)}
                            aria-label={t('common.close', { defaultValue: 'Close' })}
                            className="meta-sources-popover__close"
                        >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    </div>
                    <p className="meta-sources-popover__summary">{sourcesSummaryText}</p>
                    <SourceCredit pt={pt} sources={['smogon', 'limitless', 'vgcpastes', 'pikalytics']} className="meta-sources-popover__credits" />
                    <DataNotes
                        className="meta-sources-popover__notes"
                        paragraphs={metaNotes({ format: format?.label, battles: totalBattles, month, kind: format?.kind }, language)}
                    />
                </AnchoredPopover>
            </div>

            {tab === 'usage' && (
                <div className="meta-toolbar__context">
                    <FormatPicker
                        formats={formats}
                        value={fmtId}
                        onChange={setFmt}
                        pt={pt}
                        className="min-w-0 flex-1 sm:flex-none"
                    />
                    {isMobile ? (
                        <button
                            type="button"
                            onClick={() => setFiltersOpen(true)}
                            aria-haspopup="dialog"
                            className={`btn btn-secondary meta-filters-btn ${changedFilters > 0 ? 'is-active' : ''}`}
                        >
                            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                            <span>{pt ? 'Filtros' : 'Filters'}</span>
                            {cutoffs.length > 1 && <span className="figure text-muted">· {cutoffLabel(activeCutoff, pt)}</span>}
                            {changedFilters > 0 && <span className="count-badge">{changedFilters}</span>}
                        </button>
                    ) : (
                        <CutoffSelect cutoffs={cutoffs} value={activeCutoff} onChange={setCutoff} pt={pt} className="segmented--quiet" />
                    )}
                </div>
            )}
            {filtersOpen && isMobile && tab === 'usage' && (
                <BottomSheet onClose={() => setFiltersOpen(false)} title={pt ? 'Filtros' : 'Filters'}>
                    <div className="meta-filters-sheet">
                        {cutoffs.length > 1 && (
                            <section>
                                <h3 className="meta-filters-sheet__label">{pt ? 'Rating mínimo' : 'Rating floor'}</h3>
                                <CutoffSelect cutoffs={cutoffs} value={activeCutoff} onChange={setCutoff} pt={pt} className="segmented--quiet segmented--block" />
                            </section>
                        )}
                        <section>
                            <h3 className="meta-filters-sheet__label">{pt ? 'Ordenar por' : 'Sort by'}</h3>
                            {sortControl('segmented--block')}
                        </section>
                        <section>
                            <h3 className="meta-filters-sheet__label">{pt ? 'Tipos' : 'Types'}</h3>
                            <TypeFilter selected={typeFilter} onChange={setTypeFilter} pt={pt} inline />
                        </section>
                        <button type="button" className="btn btn-primary btn-block" onClick={() => setFiltersOpen(false)}>
                            {pt ? 'Ver resultados' : 'Show results'}
                        </button>
                    </div>
                </BottomSheet>
            )}
            <div className="meta-toolbar__filters">
                {tab === 'usage' && (
                    <div className="meta-search">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={pt ? 'Buscar Pokémon…' : 'Search Pokémon…'}
                            aria-label={pt ? 'Buscar Pokémon' : 'Search Pokémon'}
                            className="meta-search__input"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="touch-target absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
                                aria-label={t('common.clear')}
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                )}
                {tab === 'usage' && !isMobile && sortControl('segmented--lg')}
                {tab === 'usage' && !isMobile && <TypeFilter selected={typeFilter} onChange={setTypeFilter} pt={pt} />}
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
                    <div className="meta-panel__head">
                        <h2 className="meta-panel__title">
                            <Users className="h-4 w-4 text-muted" aria-hidden="true" /> {pt ? 'Times mais usados' : 'Most-used teams'}
                        </h2>
                        {!regHasTeams && format && (
                            <span className="text-2xs text-muted">
                                {pt ? '(todas as regulações — sem times de torneio nesta ainda)' : '(all regulations — no tournament teams in this one yet)'}
                            </span>
                        )}
                    </div>
                    {teamCompositions.length === 0 ? (
                        <EmptyState compact title={pt ? 'Sem times' : 'No teams'} message={pt ? 'Sem dados de times de torneio.' : 'No tournament team data available.'} />
                    ) : (
                        <div className="meta-teams-grid">
                            {teamCompositions.map((tm, i) => (
                                <TeamStripCard
                                    key={tm.ids.join('-')}
                                    tm={tm}
                                    fullTeam={teamById.get(tm.teamId) || null}
                                    rank={i + 1}
                                    typesById={typesById}
                                    linkState={linkState}
                                    pt={pt}
                                    t={t}
                                    onInspect={handleInspectSheet}
                                />
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                <div className="meta-layout">
                    {/* Ranked usage waterfall */}
                    <section className="meta-panel">
                        <div className="meta-panel__head">
                            <h2 className="meta-panel__title">
                                {pt ? 'Pokémon mais usados' : 'Top Pokémon'}
                            </h2>
                            <span className="meta-panel__meta">{visible.length.toLocaleString(locale)}</span>
                        </div>
                        {visible.length === 0 ? (
                            <EmptyState
                                mascot="search"
                                compact
                                title={pt ? 'Nenhum resultado' : 'No matches'}
                                message={pt ? 'Tente outra busca ou limpe os filtros.' : 'Try another search, or clear the filters.'}
                                action={hasFilters ? { label: t('common.clearFilters'), onClick: clearFilters } : undefined}
                            />
                        ) : (
                            <>
                                <div className={`meta-waterfall-head ${secondaryHead ? 'has-wr' : ''}`} aria-hidden="true">
                                    <span className="text-right">#</span>
                                    <span />
                                    <span>Pokémon</span>
                                    <span>{pt ? 'Participação' : 'Share'}</span>
                                    <span className="meta-row__stats">
                                        <span className="meta-row__pct" style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-medium)', color: 'var(--color-muted)' }}>
                                            {pt ? 'Uso' : 'Usage'}
                                        </span>
                                        {secondaryHead && (
                                            <span className="meta-row__wr" style={{ fontSize: 'var(--text-2xs)' }}>
                                                {secondaryHead}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <ol className="meta-waterfall-list">
                                    {visible.slice(0, reveal.limit).map((mon) => {
                                        const rank = rankById.get(mon.id) ?? (ranked.indexOf(mon) + 1);
                                        return (
                                            <UsageRow
                                                key={mon.id}
                                                mon={mon}
                                                rank={rank}
                                                monSuffix={monSuffix}
                                                linkState={linkState}
                                                types={typesById.get(mon.id)}
                                                usingSmogon={usingSmogon}
                                                hasWinRates={hasWinRates}
                                                pt={pt}
                                                onHoverEnter={handleRowHoverEnter}
                                                onHoverLeave={handleRowHoverLeave}
                                            />
                                        );
                                    })}
                                </ol>
                            </>
                        )}
                        {reveal.hasMore && (
                            <ShowMoreButton remaining={reveal.remaining} onClick={reveal.showMore} />
                        )}
                    </section>

                    {/* Pairs & Trios supporting rail */}
                    <aside className="meta-rail">
                        <section className="meta-panel">
                            <div className="meta-panel__head">
                                <h2 className="meta-panel__title">
                                    <Layers className="h-4 w-4 text-muted" aria-hidden="true" /> {pt ? 'Duplas comuns' : 'Common pairs'}
                                </h2>
                            </div>
                            <p className="meta-panel__sub">
                                {isTier
                                    ? (pt ? 'Parceiros mais frequentes no ladder' : 'Most frequent partners on the ladder')
                                    : (pt ? 'De times recentes de torneios' : 'From recent tournament teams')}
                            </p>
                            {cores2.length ? (
                                <ol className="meta-core-list">
                                    {cores2.map((c, i) => (
                                        <CoreRow
                                            key={c.ids.join('-')}
                                            core={c}
                                            rank={i + 1}
                                            onOpenMon={openMon}
                                            unit={isTier ? (pt ? 'jogos' : 'games') : (pt ? 'times' : 'teams')}
                                            locale={locale}
                                        />
                                    ))}
                                </ol>
                            ) : (
                                <p className="text-xs text-muted">{pt ? 'Dados insuficientes.' : 'Not enough data.'}</p>
                            )}
                        </section>

                        {cores3.length > 0 && (
                            <section className="meta-panel">
                                <div className="meta-panel__head">
                                    <h2 className="meta-panel__title">
                                        <Layers className="h-4 w-4 text-muted" aria-hidden="true" /> {pt ? 'Trios comuns' : 'Common trios'}
                                    </h2>
                                </div>
                                <ol className="meta-core-list">
                                    {cores3.map((c, i) => (
                                        <CoreRow
                                            key={c.ids.join('-')}
                                            core={c}
                                            rank={i + 1}
                                            onOpenMon={openMon}
                                            unit={pt ? 'times' : 'teams'}
                                            locale={locale}
                                        />
                                    ))}
                                </ol>
                            </section>
                        )}
                    </aside>
                </div>
            )}

            {tab === 'usage' && hoveredRow && hoveredDetail && (
                <MetaRowPopover
                    mon={hoveredRow.mon}
                    rank={hoveredRow.rank}
                    detail={hoveredDetail}
                    types={typesById.get(hoveredRow.mon.id)}
                    anchorRect={hoveredRow.rect}
                    usingSmogon={usingSmogon}
                    t={t}
                />
            )}

            {inspectedSheet && (
                <Suspense fallback={null}>
                    <TournamentSheetModal
                        team={inspectedSheet.team}
                        rank={inspectedSheet.rank}
                        sharePct={inspectedSheet.sharePct}
                        shareCount={inspectedSheet.shareCount}
                        onClose={() => setInspectedSheet(null)}
                    />
                </Suspense>
            )}
        </div>
    );
}
