import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Package, Swords, Zap, TrendingUp, ArrowUpRight, Plus, Check } from 'lucide-react';

import { typeColors, typeIcons } from '../../constants/types';
import { getMoveDetails } from '../../services/pokemonDataCache';
import { getPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { itemSpriteUrl } from '../../utils/itemSuggestions';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useSmogonData } from '../../hooks/useSmogonData';
import { useUsageIndex, useUsageFormat } from '../../hooks/useUsageStats';
import { useMoveTypes } from '../../hooks/useMoveTypes';
import { useBattleItems } from '../../hooks/useBattleItems';
import { applySmogonSet, formatEvSpread } from '../../utils/smogonSets';
import { natureLabel } from '../../constants/natures';
import { UsageBar, pctOf, pretty, RegulationSelect } from '../views/metaShared';
import { SpriteSelect } from '../SpriteSelect';
import { TypeBadge } from '../TypeBadge';
import { CloseIcon, SaveIcon } from '../icons';
import { getPokemonWeaknessEntries, WeaknessBadge } from './pokemonModalShared';
import { useTranslation } from '../../hooks/useTranslation';

// Slugify a display name ("Rock Slide" → "rock-slide") to match the slugs used
// by the move/ability selects and the Showdown export.
const toSlug = (s = '') => s.toLowerCase().replace(/[’'.]/g, '').replace(/\s+/g, '-');

// Collapse the tournament EV/nature spreads (EVs unreliable in this dataset) to
// a nature frequency list, most common first.
function natureBreakdown(spreads = []) {
    const m = new Map();
    for (const s of spreads) if (s.nature) m.set(s.nature, (m.get(s.nature) || 0) + s.count);
    return [...m.entries()].map(([nature, count]) => ({ nature, count })).sort((a, b) => b.count - a.count);
}

// Canonical, theme-independent stat colors (defined in index.css :root).
const STAT_COLOR_VAR = {
    hp: '--stat-hp',
    attack: '--stat-atk',
    defense: '--stat-def',
    'special-attack': '--stat-spa',
    'special-defense': '--stat-spd',
    speed: '--stat-spe',
};
const STAT_ABBR = { hp: 'HP', attack: 'Atk', defense: 'Def', 'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe' };

export function TeamPokemonEditorModal({ pokemon, onClose, onSave, colors, items, natures, moveDetailsCache = {}, setMoveDetailsCache = () => { } }) {
    const { t, language } = useTranslation();
    const pt = language === 'pt';
    const navigate = useNavigate();
    const { smogonFor } = useSmogonData();
    const { formats, defaultFormatId } = useUsageIndex();
    const [searchParams, setSearchParams] = useSearchParams();
    const fmtId = searchParams.get('fmt') || defaultFormatId || '';
    const { usageFor, format, status: fmtStatus } = useUsageFormat(fmtId);
    const { typeForMove } = useMoveTypes();
    const battleItems = useBattleItems();
    const smogonEntry = smogonFor(pokemon.id);
    const usage = usageFor(pokemon.id);

    // Battle-relevant item options (with sprites). Falls back to the full reference
    // item list if the baked battle-items dataset hasn't loaded.
    const itemOptions = useMemo(
        () => (battleItems.length
            ? battleItems
            : (items || []).map((it) => ({ slug: it.name, name: it.name.replace(/-/g, ' ') }))),
        [battleItems, items],
    );
    const [customization, setCustomization] = useState(pokemon.customization);
    const [remainingEVs, setRemainingEVs] = useState(510);
    const [moveSearch, setMoveSearch] = useState('');
    const [activeTab, setActiveTab] = useState('build');
    const dialogRef = useModalA11y(onClose);
    const statNames = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    const pokemonWeaknesses = useMemo(() => getPokemonWeaknessEntries(pokemon?.types || []), [pokemon]);

    const fetchMoveDetails = useCallback(async (moveUrl, moveName) => {
        if (moveDetailsCache[moveName] !== undefined) {
            return moveDetailsCache[moveName];
        }
        try {
            const moveData = await getMoveDetails(moveUrl, moveName);
            setMoveDetailsCache((prev) => ({ ...prev, [moveName]: moveData || null }));
            return moveData;
        } catch (error) {
            console.error(`Failed to fetch details for move: ${moveName}`, error);
            return null;
        }
    }, [moveDetailsCache, setMoveDetailsCache]);

    useEffect(() => {
        setCustomization(pokemon.customization);
        setMoveSearch('');
        setActiveTab('build');
    }, [pokemon]);

    useEffect(() => {
        const totalEVs = Object.values(customization.evs).reduce((sum, ev) => sum + ev, 0);
        setRemainingEVs(510 - totalEVs);
    }, [customization.evs]);

    const handleEvChange = (stat, value) => {
        const numericValue = Number(value);
        const currentEvs = { ...customization.evs };
        const oldVal = currentEvs[stat];
        const diff = numericValue - oldVal;

        if (numericValue > 252) return;
        if (remainingEVs - diff < 0) return;

        setCustomization((prev) => ({
            ...prev,
            evs: { ...prev.evs, [stat]: numericValue },
        }));
    };

    const handleCustomizationChange = (field, value) => {
        setCustomization((prev) => ({ ...prev, [field]: value }));
    };

    const handleMoveToggle = (moveName) => {
        setCustomization((prev) => {
            const currentMoves = prev.moves;
            const isAdding = !currentMoves.includes(moveName);
            const newMoves = isAdding
                ? [...currentMoves, moveName]
                : currentMoves.filter((move) => move !== moveName);

            if (newMoves.length > 4) return prev;
            if (isAdding) {
                setMoveSearch('');
            }
            return { ...prev, moves: newMoves };
        });
    };

    // ── One-click "apply from usage" helpers — mutate the live build, matching
    // the display-cased usage data back onto the slugs the selects/export expect.
    const applyItemSlug = (slug) => handleCustomizationChange('item', slug);
    const applyNatureName = (name) => handleCustomizationChange('nature', name.toLowerCase());
    const applyTeraSlug = (slug) => handleCustomizationChange('teraType', slug);
    const applyAbilityName = (name) => {
        const slug = toSlug(name);
        const match = (pokemon.abilities || []).find((a) => toSlug(a.name) === slug);
        handleCustomizationChange('ability', match ? match.name : slug);
    };
    const applyMoveName = (name) => {
        const slug = toSlug(name);
        const match = (pokemon.moves || []).find((mv) => toSlug(mv.name) === slug);
        handleMoveToggle(match ? match.name : slug);
    };

    const calculateStat = (base, ev, statName) => {
        if (statName === 'hp') {
            return Math.floor(base * 2 + 31 + Math.floor(ev / 4)) + 110;
        }
        return Math.floor(Math.floor(base * 2 + 31 + Math.floor(ev / 4)) + 5);
    };

    const filteredMoves = useMemo(() => {
        const moves = pokemon.moves || [];
        if (!moveSearch) return moves;
        return moves.filter((move) => move.name.toLowerCase().includes(moveSearch.toLowerCase()));
    }, [moveSearch, pokemon.moves]);

    useEffect(() => {
        filteredMoves.forEach((move) => {
            if (moveDetailsCache[move.name] === undefined) {
                fetchMoveDetails(move.url, move.name);
            }
        });
    }, [filteredMoves, moveDetailsCache, fetchMoveDetails]);

    if (!pokemon) return null;

    // Competitive usage (what tournament teams actually run). EVs in this dataset
    // are unreliable, so Tera falls back to the Smogon sets' Tera types.
    const usageN = usage?.n || 0;
    const hasUsage = usageN > 0 || formats.length > 0;
    const usageNatures = natureBreakdown(usage?.spreads);
    const teraList = usage?.tera?.length
        ? usage.tera.map((tt) => ({ name: tt.name, count: tt.count }))
        : (() => {
            const m = new Map();
            for (const s of smogonEntry?.sets || []) for (const tt of s.tera || []) m.set(tt, (m.get(tt) || 0) + 1);
            return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
        })();

    const tabs = [
        { id: 'build', label: t('modals.editorModalTabBuild') },
        { id: 'stats', label: t('modals.editorModalTabStats') },
        ...(hasUsage ? [{ id: 'usage', label: pt ? 'Uso competitivo' : 'Competitive usage' }] : []),
    ];

    const controlClassName = 'w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm capitalize text-fg transition-colors focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary';
    const fieldLabelClassName = 'mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-muted';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-4" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="team-editor-title"
                tabIndex={-1}
                className="relative flex w-full max-w-4xl max-h-[88vh] flex-col rounded-2xl bg-surface shadow-xl animate-scale-in focus:outline-none sm:max-h-[90vh]"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="border-b border-surface-raised px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <img
                                src={getPokemonDisplaySprite(pokemon, { shiny: customization.isShiny, animated: true })}
                                alt={pokemon.name}
                                className="h-12 w-12 sm:h-14 sm:w-14 image-pixelated flex-shrink-0"
                            />
                            <div className="min-w-0">
                                <h2 id="team-editor-title" className="truncate text-lg font-bold capitalize text-fg sm:text-xl md:text-2xl">{pokemon.name}</h2>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {pokemon.types.map((type) => <TypeBadge key={type} type={type} colors={colors} />)}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                                        {t('modals.editorModalWeakVs')}
                                    </span>
                                    {pokemonWeaknesses.length > 0 ? pokemonWeaknesses.slice(0, 4).map(({ type, multiplier }) => (
                                        <WeaknessBadge key={type} type={type} multiplier={multiplier} colors={colors} />
                                    )) : (
                                        <span className="text-xs text-muted">{t('common.none')}</span>
                                    )}
                                    {pokemonWeaknesses.length > 4 && (
                                        <span className="rounded-full bg-surface-raised px-2 py-1 text-[10px] font-bold text-muted">
                                            +{pokemonWeaknesses.length - 4}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            type="button"
                            className="p-2 rounded-lg text-muted hover:text-fg hover:bg-surface-raised transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label={t('modals.editorModalCloseAria')}
                        >
                            <CloseIcon />
                        </button>
                    </div>

                    <div role="tablist" aria-label="Editor sections" className="-mb-3 mt-4 flex gap-1 border-b border-transparent">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                role="tab"
                                type="button"
                                id={`tab-${tab.id}`}
                                aria-selected={activeTab === tab.id}
                                aria-controls={`panel-${tab.id}`}
                                onClick={() => setActiveTab(tab.id)}
                                className={`rounded-t-lg border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-4 sm:py-2 sm:text-sm ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted opacity-70 hover:opacity-100'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </header>

                <div
                    className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6"
                    style={{
                        '--scrollbar-track-color': colors.card,
                        '--scrollbar-thumb-color': colors.primary,
                        '--scrollbar-thumb-border-color': colors.card,
                    }}
                >
                    {activeTab === 'build' && (
                        <div role="tabpanel" id="panel-build" aria-labelledby="tab-build" className="space-y-5">
                            {smogonEntry?.sets?.length > 0 && (
                                <div className="rounded-xl border border-border bg-primary/5 p-3">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        <h3 className="text-sm font-bold text-fg">{pt ? 'Conjuntos Smogon' : 'Smogon sets'}</h3>
                                        <span className="text-[11px] text-muted">{pt ? 'um clique preenche tudo' : 'one click fills everything'}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        {smogonEntry.sets.map((set, i) => {
                                            const spread = formatEvSpread(set.evs);
                                            return (
                                                <button
                                                    key={`${set.name}-${i}`}
                                                    type="button"
                                                    onClick={() => setCustomization((prev) => applySmogonSet(set, prev))}
                                                    className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-left transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                    title={pt ? `Aplicar conjunto ${set.name}` : `Apply the ${set.name} set`}
                                                >
                                                    <span className="flex items-center justify-between gap-1">
                                                        <span className="truncate text-sm font-bold text-fg">{set.name}</span>
                                                        {set.source && <span className="shrink-0 rounded bg-primary/15 px-1 text-[9px] font-bold text-primary">{set.source}</span>}
                                                    </span>
                                                    <span className="block truncate text-[11px] capitalize text-muted">
                                                        {set.item ? set.item.replace(/-/g, ' ') : (pt ? 'sem item' : 'no item')}
                                                        {set.tera?.[0] ? ` · Tera ${set.tera[0].replace(/-/g, ' ')}` : ''}
                                                    </span>
                                                    {spread && <span className="mt-0.5 block truncate font-mono text-[10px] text-muted">{spread}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-4">
                                <div>
                                    <span className={fieldLabelClassName}>{t('modals.editorModalItemLabel')}</span>
                                    <SpriteSelect
                                        value={customization.item}
                                        onChange={(slug) => handleCustomizationChange('item', slug)}
                                        options={itemOptions}
                                        getSprite={itemSpriteUrl}
                                        placeholder={t('common.none')}
                                        noneLabel={t('common.none')}
                                        searchPlaceholder={pt ? 'Buscar item…' : 'Search item…'}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="editor-nature" className={fieldLabelClassName}>{t('modals.editorModalNatureLabel')}</label>
                                    <select id="editor-nature" value={customization.nature} onChange={(event) => handleCustomizationChange('nature', event.target.value)} className={controlClassName}>
                                        {natures.map((nature) => <option key={nature.name} value={nature.name}>{natureLabel(nature.name)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="editor-tera" className={fieldLabelClassName}>{t('modals.editorModalTeraLabel')}</label>
                                    <select id="editor-tera" value={customization.teraType} onChange={(event) => handleCustomizationChange('teraType', event.target.value)} className={controlClassName}>
                                        {Object.keys(typeColors).map((type) => <option key={type} value={type} className="capitalize">{t(`types.${type.toLowerCase()}`, { defaultValue: type })}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="editor-ability" className={fieldLabelClassName}>{t('modals.editorModalAbilityLabel')}</label>
                                    <select id="editor-ability" value={customization.ability} onChange={(event) => handleCustomizationChange('ability', event.target.value)} className={controlClassName}>
                                        {(pokemon.abilities || []).map((ability) => (
                                            <option key={ability.name} value={ability.name} className="capitalize">{ability.name.replace(/-/g, ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button
                                type="button"
                                role="switch"
                                aria-checked={customization.isShiny}
                                onClick={() => handleCustomizationChange('isShiny', !customization.isShiny)}
                                className={`inline-flex w-fit items-center gap-2.5 rounded-full border px-3 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${customization.isShiny ? 'border-success/50 bg-success/15' : 'border-border bg-surface-raised'}`}
                            >
                                <span
                                    className={`relative inline-block h-5 w-9 flex-shrink-0 rounded-full transition-colors ${customization.isShiny ? 'bg-success' : 'bg-bg'}`}
                                    aria-hidden="true"
                                >
                                    <span className={`absolute left-0.5 top-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${customization.isShiny ? 'translate-x-4' : 'translate-x-0'}`} />
                                </span>
                                <span className="text-sm font-semibold text-fg">{t('modals.editorModalShinyLabel')}</span>
                            </button>

                            <div className="border-t border-surface-raised pt-5">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-fg">{t('modals.editorModalMovesHeading')}</h3>
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${customization.moves.length === 4 ? 'bg-success/15 text-success' : 'bg-surface-raised text-muted'}`}>
                                            {customization.moves.length}/4
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted">{t('modals.editorModalMovesHint')}</span>
                                </div>

                                <div className="mb-3 flex min-h-[2.25rem] flex-wrap items-center gap-2">
                                    {customization.moves.length === 0 && (
                                        <span className="text-sm italic text-muted">{t('modals.editorModalNoMovesYet')}</span>
                                    )}
                                    {customization.moves.map((moveName) => {
                                        const moveType = moveDetailsCache[moveName]?.type;
                                        const tint = moveType ? typeColors[moveType] : colors.primary;
                                        return (
                                            <button
                                                key={moveName}
                                                type="button"
                                                onClick={() => handleMoveToggle(moveName)}
                                                aria-label={t('modals.editorModalRemoveMove', { move: moveName.replace(/-/g, ' ') })}
                                                className="group inline-flex items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-2.5 text-sm font-semibold capitalize text-fg transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                style={{ borderColor: tint, backgroundColor: `color-mix(in srgb, ${tint} 22%, var(--color-surface))` }}
                                            >
                                                {moveType && <img src={typeIcons[moveType]} alt="" className="h-4 w-4 flex-shrink-0" />}
                                                {moveName.replace(/-/g, ' ')}
                                                <CloseIcon className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" />
                                            </button>
                                        );
                                    })}
                                </div>

                                <input
                                    type="text"
                                    placeholder={t('modals.editorModalSearchMoves')}
                                    value={moveSearch}
                                    onChange={(event) => setMoveSearch(event.target.value)}
                                    className="mb-3 w-full rounded-lg bg-surface-raised p-2 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    aria-label={t('modals.editorModalSearchMoves')}
                                />

                                <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto custom-scrollbar pr-1 sm:grid-cols-3" style={{ '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}>
                                    {filteredMoves.length === 0 ? (
                                        <p className="col-span-full py-6 text-center text-sm text-muted">{t('modals.editorModalNoMovesFound')}</p>
                                    ) : filteredMoves.map((move) => {
                                        const moveType = moveDetailsCache[move.name]?.type;
                                        const tint = moveType ? typeColors[moveType] : colors.primary;
                                        const isSelected = customization.moves.includes(move.name);
                                        const isFull = customization.moves.length >= 4;
                                        const isDisabled = !isSelected && isFull;
                                        const style = isSelected
                                            ? { borderColor: tint, backgroundColor: `color-mix(in srgb, ${tint} 20%, var(--color-surface))` }
                                            : undefined;

                                        return (
                                            <button
                                                key={move.name}
                                                type="button"
                                                disabled={isDisabled}
                                                onClick={() => handleMoveToggle(move.name)}
                                                aria-pressed={isSelected}
                                                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm capitalize text-fg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSelected ? 'font-semibold' : 'border-border bg-surface-raised hover:border-border-hover'} ${isDisabled ? 'cursor-not-allowed opacity-40 hover:border-border' : ''}`}
                                                style={style}
                                            >
                                                {moveType ? (
                                                    <img src={typeIcons[moveType]} alt="" className="h-4 w-4 flex-shrink-0" />
                                                ) : (
                                                    <span className="h-4 w-4 flex-shrink-0 animate-pulse rounded-full bg-surface-raised" aria-hidden="true" />
                                                )}
                                                <span className="truncate">{move.name.replace(/-/g, ' ')}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div role="tabpanel" id="panel-stats" aria-labelledby="tab-stats" className="space-y-5">
                            <div className="flex items-baseline justify-between">
                                <h3 className="text-lg font-bold text-fg">{t('modals.editorModalEffortValues')}</h3>
                                <p className="text-sm text-muted">
                                    {t('modals.editorModalRemaining')}: <span className={`text-lg font-bold ${remainingEVs === 0 ? 'text-success' : 'text-primary'}`}>{remainingEVs}</span> / 510
                                </p>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                                <div className="h-full bg-primary transition-all duration-200" style={{ width: `${((510 - remainingEVs) / 510) * 100}%` }} />
                            </div>

                            <div className="space-y-4">
                                {statNames.map((statName, index) => {
                                    const baseStat = pokemon.stats?.[index]?.base_stat ?? 0;
                                    const ev = customization.evs[statName];
                                    const totalStat = calculateStat(baseStat, ev, statName);
                                    const colorVar = STAT_COLOR_VAR[statName] ?? '--stat-hp';
                                    const fillPct = (ev / 252) * 100;
                                    const statColor = `var(${colorVar})`;

                                    // One clean row: stat · slider · EV · final stat.
                                    return (
                                        <div key={statName} className="flex items-center gap-3">
                                            <span className="w-10 shrink-0 text-xs font-bold uppercase tracking-wide" style={{ color: statColor }}>{STAT_ABBR[statName]}</span>
                                            <input
                                                type="range"
                                                min="0"
                                                max="252"
                                                value={ev}
                                                step="4"
                                                onChange={(event) => handleEvChange(statName, event.target.value)}
                                                className="ev-slider min-w-0 flex-1"
                                                style={{ background: `linear-gradient(to right, ${statColor} 0%, ${statColor} ${fillPct}%, var(--color-surface-raised) ${fillPct}%, var(--color-surface-raised) 100%)` }}
                                                aria-label={`${statName.replace(/-/g, ' ')} EV`}
                                            />
                                            <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-muted">{ev} EV</span>
                                            <span className="w-9 shrink-0 text-right font-mono text-sm font-bold tabular-nums text-fg" title={pt ? 'Total' : 'Total stat'}>{totalStat}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'usage' && (
                        <div role="tabpanel" id="panel-usage" aria-labelledby="tab-usage" className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[13px] text-muted">
                                    {pt
                                        ? <>O que os melhores jogadores usam em <span className="font-bold text-fg">{usageN.toLocaleString(pt ? 'pt-BR' : 'en-US')}</span> times — clique para aplicar.</>
                                        : <>What top players run across <span className="font-bold text-fg">{usageN.toLocaleString(pt ? 'pt-BR' : 'en-US')}</span> teams — click to apply.</>}
                                </p>
                                <div className="flex items-center gap-2">
                                    {formats.length > 0 && (
                                        <RegulationSelect
                                            formats={formats}
                                            value={fmtId}
                                            onChange={(val) => setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set('fmt', val); return p; }, { replace: true })}
                                            pt={pt}
                                            className="py-1 px-2.5 text-[11px] h-8 rounded-lg"
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { onClose(); navigate(fmtId ? `/meta/${pokemon.id}?fmt=${fmtId}` : `/meta/${pokemon.id}`); }}
                                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-fg transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary h-8"
                                    >
                                        <TrendingUp className="h-3.5 w-3.5" /> {pt ? 'Página completa' : 'Full usage page'} <ArrowUpRight className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>

                            {fmtStatus === 'loading' ? (
                                <p className="text-sm text-muted">{pt ? 'Carregando dados de uso…' : 'Loading usage data…'}</p>
                            ) : !usage ? (
                                <div className="rounded-xl border border-border bg-bg px-4 py-3 text-sm text-muted">
                                    {pt
                                        ? `Sem dados de uso para ${pokemon.name} em ${format?.label || 'este regulamento'}. Tente outro regulamento acima.`
                                        : `No ${format?.label || 'this regulation'} usage data for ${pretty(pokemon.name)}. Try another regulation above.`}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {usage?.items?.length > 0 && (
                                        <section className="rounded-xl border border-border bg-bg p-3">
                                            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                                                <Package className="h-3.5 w-3.5 text-primary" /> {pt ? 'Itens' : 'Held items'}
                                            </h3>
                                            <div className="space-y-1.5">
                                                {usage.items.slice(0, 6).map((it) => {
                                                    const active = customization.item === it.slug;
                                                    return (
                                                        <UsageBar
                                                            key={it.slug}
                                                            label={pretty(it.name)}
                                                            icon={<img src={itemSpriteUrl(it.slug)} alt="" className="h-4 w-4 image-pixelated" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />}
                                                            pct={pctOf(it.count, usageN)}
                                                            count={it.count}
                                                            active={active}
                                                            trailing={active ? <Check className="h-3.5 w-3.5 text-primary" /> : <Plus className="h-3.5 w-3.5 text-muted" />}
                                                            onClick={() => applyItemSlug(it.slug)}
                                                            title={pt ? `Usar ${pretty(it.name)}` : `Use ${pretty(it.name)}`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    )}

                                    {usage?.moves?.length > 0 && (
                                        <section className="rounded-xl border border-border bg-bg p-3">
                                            <h3 className="mb-2 flex items-center justify-between gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                                                <span className="flex items-center gap-1.5"><Swords className="h-3.5 w-3.5 text-primary" /> {pt ? 'Golpes' : 'Moves'}</span>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${customization.moves.length === 4 ? 'bg-success/15 text-success' : 'bg-surface-raised text-muted'}`}>{customization.moves.length}/4</span>
                                            </h3>
                                            <div className="space-y-1.5">
                                                {usage.moves.slice(0, 10).map((mv) => {
                                                    const mt = typeForMove(mv.name);
                                                    const active = customization.moves.some((m) => toSlug(m) === toSlug(mv.name));
                                                    const full = customization.moves.length >= 4;
                                                    return (
                                                        <UsageBar
                                                            key={mv.name}
                                                            label={pretty(mv.name)}
                                                            icon={mt && typeIcons[mt] ? <img src={typeIcons[mt]} alt="" className="h-4 w-4" /> : undefined}
                                                            pct={pctOf(mv.count, usageN)}
                                                            count={mv.count}
                                                            color={mt ? (typeColors[mt] || 'var(--color-success)') : 'var(--color-success)'}
                                                            active={active}
                                                            trailing={active ? <Check className="h-3.5 w-3.5 text-primary" /> : <Plus className={`h-3.5 w-3.5 ${full ? 'text-muted/40' : 'text-muted'}`} />}
                                                            onClick={() => applyMoveName(mv.name)}
                                                            title={active ? (pt ? 'Remover golpe' : 'Remove move') : (pt ? 'Adicionar golpe' : 'Add move')}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    )}

                                    {(usage?.abilities?.length > 0 || usageNatures.length > 0) && (
                                        <section className="rounded-xl border border-border bg-bg p-3">
                                            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                                                <Zap className="h-3.5 w-3.5 text-primary" /> {pt ? 'Habilidades' : 'Abilities'}
                                            </h3>
                                            <div className="space-y-1.5">
                                                {(usage?.abilities || []).slice(0, 4).map((ab) => {
                                                    const active = toSlug(customization.ability) === toSlug(ab.name);
                                                    return (
                                                        <UsageBar key={ab.name} label={pretty(ab.name)} pct={pctOf(ab.count, usageN)} count={ab.count} color="var(--color-accent)" active={active} trailing={active ? <Check className="h-3.5 w-3.5 text-primary" /> : <Plus className="h-3.5 w-3.5 text-muted" />} onClick={() => applyAbilityName(ab.name)} />
                                                    );
                                                })}
                                                {usageNatures.length > 0 && (
                                                    <>
                                                        <p className="pt-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">{pt ? 'Naturezas' : 'Natures'}</p>
                                                        {usageNatures.slice(0, 4).map((nat) => {
                                                            const active = customization.nature === nat.nature.toLowerCase();
                                                            return (
                                                                <UsageBar key={nat.nature} label={nat.nature} pct={pctOf(nat.count, usageN)} count={nat.count} color="var(--color-info)" active={active} trailing={active ? <Check className="h-3.5 w-3.5 text-primary" /> : <Plus className="h-3.5 w-3.5 text-muted" />} onClick={() => applyNatureName(nat.nature)} />
                                                            );
                                                        })}
                                                    </>
                                                )}
                                            </div>
                                        </section>
                                    )}

                                    {teraList.length > 0 && (
                                        <section className="rounded-xl border border-border bg-bg p-3">
                                            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                                                <Sparkles className="h-3.5 w-3.5 text-primary" /> {pt ? 'Tipo Tera' : 'Tera type'}
                                            </h3>
                                            <div className="flex flex-wrap gap-1.5">
                                                {teraList.slice(0, 8).map((tt) => {
                                                    const slug = tt.name?.toLowerCase();
                                                    const c = typeColors[slug] || 'var(--color-muted)';
                                                    const active = customization.teraType === slug;
                                                    return (
                                                        <button
                                                            key={tt.name}
                                                            type="button"
                                                            onClick={() => applyTeraSlug(slug)}
                                                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? 'ring-1 ring-primary' : ''}`}
                                                            style={{ color: c, backgroundColor: `${c}1f`, borderColor: active ? c : `${c}55` }}
                                                        >
                                                            {typeIcons[slug] && <img src={typeIcons[slug]} alt="" className="h-3 w-3" />}
                                                            {tt.name}
                                                            {active && <Check className="h-3 w-3" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="mt-2 text-[10px] text-muted">{pt ? 'EVs confiáveis estão nos conjuntos Smogon (aba Build).' : 'Reliable EV spreads live in the Smogon sets (Build tab).'}</p>
                                        </section>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <footer className="flex items-center justify-end gap-2 border-t border-surface-raised px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-surface-raised px-4 py-2 font-semibold text-fg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onSave(pokemon.instanceId, customization);
                            onClose();
                        }}
                        className="bg-primary hover:opacity-90 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                    >
                        <SaveIcon /> {t('modals.editorModalSave')}
                    </button>
                </footer>
            </div>
        </div>
    );
}