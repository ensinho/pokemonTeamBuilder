import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Package, Swords, Zap, TrendingUp, ArrowUpRight, Plus, Check, RotateCcw, Trash2 } from 'lucide-react';

// Styles (.editor-*) live in team-builder-view.css, loaded with the shell.
import { typeColors, typeIcons } from '../../constants/types';
import { getPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { itemSpriteUrl } from '../../utils/itemSuggestions';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useSmogonData } from '../../hooks/useSmogonData';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { useUsageIndex, useUsageFormat } from '../../hooks/useUsageStats';
import { useMoveTypes } from '../../hooks/useMoveTypes';
import { useBattleItems } from '../../hooks/useBattleItems';
import { applySmogonSet, formatEvSpread } from '../../utils/smogonSets';
import { EV_MAX_PER_STAT, EV_TOTAL_BUDGET, applyEvChange, maxEvFor, remainingEvs } from '../../utils/evBudget';
import { buildSignature } from '../../utils/teamDraft';
import { natureLabel, ALL_NATURES } from '../../constants/natures';
import { UsageBar, pctOf, pretty, RegulationSelect } from '../views/metaShared';
import { SpriteSelect } from '../SpriteSelect';
import { Switch } from '../Switch';
import { RollingNumber } from '../RollingNumber';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { TypeChip } from '../TypeChip';
import { CloseIcon } from '../icons';
import { getPokemonWeaknessEntries, WeaknessBadge } from './pokemonModalShared';
import { useTranslation } from '../../hooks/useTranslation';
import { useThemeStore } from '../../store/useThemeStore';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';

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
const STAT_NAMES = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const ZERO_EVS = { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 };

// Moves shown before "show more". A learnset runs 50–120 moves; listed whole
// inside the dialog it made the phone editor 2.4 screens long, and the four
// moves people actually pick are the first dozen once ranked by usage.
const MOVES_PREVIEW = 12;

/**
 * The member editor.
 *
 * Every way out keeps the edits — Done, ×, Escape, the scrim, a phone's
 * drag-down. Until 2026-10 only "Save changes" kept them and all the others
 * dropped them silently, which is the exit most people take on a phone. The
 * store answers a kept edit with an undo toast, so closing to mean "never
 * mind" is one tap away from undone.
 *
 * Move types come from the baked move → type map (`useMoveTypes`). The old
 * per-move fetch loop wrote one entry per move into a cache that lived in the
 * app shell, re-rendering the whole shell ~60 times each time this opened.
 */
export function TeamPokemonEditorModal({ pokemon, onClose, onSave, colors, items, natures }) {
    const { t, language } = useTranslation();
    // Tera Type is gen IX only — hidden entirely when the user has it switched off.
    const showTeraType = useThemeStore((state) => state.showTeraType);
    const pt = language === 'pt';
    const navigate = useNavigate();
    const { linkState } = useEntityNavigate();
    const { smogonFor } = useSmogonData();
    // Regulations only: this is the team editor, so the usage tab answers "what
    // does this Pokémon run in the reg I'm building for". Browsing every Smogon
    // tier is the Meta page's job (the link below opens it).
    const { regulations: formats, defaultFormatId } = useUsageIndex();
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
    const [moveSearch, setMoveSearch] = useState('');
    const [showAllMoves, setShowAllMoves] = useState(false);
    const [activeTab, setActiveTab] = useState('build');
    const [evNotice, setEvNotice] = useState(null);
    const pokemonWeaknesses = useMemo(() => getPokemonWeaknessEntries(pokemon?.types || []), [pokemon]);

    // What the editor opened with. Only a difference from this is an edit: a
    // member opened while its record was still resolving gets its preset build
    // patched in underneath, and closing without touching anything must not
    // write the empty placeholder build back over it.
    const openedWithRef = useRef(pokemon.customization);
    const customizationRef = useRef(customization);
    customizationRef.current = customization;

    useEffect(() => {
        openedWithRef.current = pokemon.customization;
        setCustomization(pokemon.customization);
        setMoveSearch('');
        setShowAllMoves(false);
        setActiveTab('build');
        setEvNotice(null);
    }, [pokemon]);

    const closeKeepingEdits = () => {
        const next = customizationRef.current;
        if (buildSignature(next) !== buildSignature(openedWithRef.current)) {
            onSave(pokemon.instanceId, next);
        }
        onClose();
    };
    const dialogRef = useModalA11y(closeKeepingEdits);

    // Derived, not stored: a `useState` + `useEffect` pair lagged one render
    // behind a drag, so mid-gesture events were validated against a stale
    // budget and bounced at random.
    const remainingEVs = useMemo(() => remainingEvs(customization.evs), [customization.evs]);

    // The sprite in the header sparkles once when the user flips it to shiny —
    // the game's own way of saying "this one is shiny".
    const shinyBurst = useShinyBurst();

    // Clamp, never reject — and say so. The thumb travels as far as the budget
    // allows and stops on the real cap (docs/wounds.md 2026-09-21); the line
    // under the budget bar names the stop, because a slider that halts short of
    // where it was dragged reads as broken when nothing explains it.
    const handleEvChange = (stat, value) => {
        const requested = Math.floor(Number(value));
        const cap = maxEvFor(customization.evs, stat);
        if (Number.isFinite(requested) && requested > cap) {
            setEvNotice({ stat, value: cap, reason: cap >= EV_MAX_PER_STAT ? 'stat' : 'budget' });
        } else if (evNotice) {
            setEvNotice(null);
        }
        setCustomization((prev) => ({ ...prev, evs: applyEvChange(prev.evs, stat, value) }));
    };

    const resetEvs = () => {
        setEvNotice(null);
        setCustomization((prev) => ({ ...prev, evs: { ...ZERO_EVS } }));
    };

    const handleCustomizationChange = (field, value) => {
        setCustomization((prev) => ({ ...prev, [field]: value }));
    };

    // Compared by slug: a preset can carry a display-cased name ("Sucker Punch")
    // for a learnset slug ("sucker-punch"), and a strict match listed it as
    // unpicked — one tap away from picking it twice.
    const hasMove = (moves, name) => moves.some((m) => toSlug(m) === toSlug(name));
    const handleMoveToggle = (moveName) => {
        setCustomization((prev) => {
            const currentMoves = prev.moves;
            const isAdding = !hasMove(currentMoves, moveName);
            const newMoves = isAdding
                ? [...currentMoves, moveName]
                : currentMoves.filter((move) => toSlug(move) !== toSlug(moveName));

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

    // Competitive usage (what tournament teams actually run). EVs in this dataset
    // are unreliable, so Tera falls back to the Smogon sets' Tera types.
    const usageN = usage?.n || 0;

    // Usage share per move slug, when this Pokémon has data in the format.
    const movePctBySlug = useMemo(() => {
        const map = new Map();
        if (!usageN) return map;
        for (const mv of usage?.moves || []) map.set(toSlug(mv.name), pctOf(mv.count, usageN));
        return map;
    }, [usage, usageN]);

    // Most-used first (with the share on the row), then A–Z. The learnset
    // arrives in level-up order, which is the order nobody builds in.
    const sortedMoves = useMemo(() => {
        const moves = [...(pokemon.moves || [])];
        return moves.sort((a, b) => {
            const pa = movePctBySlug.get(toSlug(a.name)) || 0;
            const pb = movePctBySlug.get(toSlug(b.name)) || 0;
            return pb - pa || a.name.localeCompare(b.name);
        });
    }, [pokemon.moves, movePctBySlug]);

    const filteredMoves = useMemo(() => {
        if (!moveSearch) return sortedMoves;
        const q = moveSearch.toLowerCase().replace(/\s+/g, '-');
        return sortedMoves.filter((move) => move.name.toLowerCase().includes(q) || move.name.toLowerCase().replace(/-/g, ' ').includes(moveSearch.toLowerCase()));
    }, [moveSearch, sortedMoves]);
    const isMovePreview = !moveSearch && !showAllMoves && filteredMoves.length > MOVES_PREVIEW;
    const visibleMoves = isMovePreview ? filteredMoves.slice(0, MOVES_PREVIEW) : filteredMoves;

    if (!pokemon) return null;

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
        { id: 'build', label: t('builder.editor.tabBuild') },
        { id: 'stats', label: t('builder.editor.tabEvs') },
        ...(hasUsage ? [{ id: 'usage', label: t('builder.editor.tabUsage') }] : []),
    ];

    const controlClassName = 'w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm capitalize text-fg transition-colors focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary';
    const fieldLabelClassName = 'field-label mb-1 block';
    const removeMember = () => useActiveTeamStore.getState().handleRemoveFromTeam(pokemon.instanceId);

    return (
        <div className="modal-scrim" onClick={closeKeepingEdits} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="team-editor-title"
                tabIndex={-1}
                className="modal-panel modal-panel--2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="px-4 pt-4 sm:px-6 sm:pt-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="relative inline-flex flex-shrink-0">
                                <img
                                    src={getPokemonDisplaySprite(pokemon, { shiny: customization.isShiny, animated: true })}
                                    alt={pokemon.name}
                                    className="h-12 w-12 sm:h-14 sm:w-14 image-pixelated"
                                />
                                {shinyBurst.burst}
                            </span>
                            <div className="min-w-0">
                                <h2 id="team-editor-title" className="truncate text-lg font-bold capitalize text-fg sm:text-xl md:text-2xl">{pokemon.name}</h2>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {(pokemon.types || []).map((type) => <TypeChip key={type} type={type} />)}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs text-muted">
                                        {t('modals.editorModalWeakVs')}
                                    </span>
                                    {pokemonWeaknesses.length > 0 ? pokemonWeaknesses.slice(0, 4).map(({ type, multiplier }) => (
                                        <WeaknessBadge key={type} type={type} multiplier={multiplier} colors={colors} />
                                    )) : (
                                        <span className="text-xs text-muted">{t('common.none')}</span>
                                    )}
                                    {pokemonWeaknesses.length > 4 && (
                                        <span className="count-badge">+{pokemonWeaknesses.length - 4}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={closeKeepingEdits}
                            type="button"
                            className="modal-close"
                            aria-label={t('modals.editorModalCloseAria')}
                        >
                            <CloseIcon />
                        </button>
                    </div>

                    {/* Short labels in a full-width track: "Uso competitivo" was
                        cut off as the third tab on a phone. */}
                    <div role="tablist" aria-label={t('builder.editor.sectionsAria')} className="segmented segmented--block mt-3">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                role="tab"
                                type="button"
                                id={`tab-${tab.id}`}
                                aria-selected={activeTab === tab.id}
                                aria-controls={`panel-${tab.id}`}
                                onClick={() => setActiveTab(tab.id)}
                                className="segmented__item"
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </header>

                {/* The dialog's one scroller. The move grid used to scroll on
                    its own inside it (max-h-72), a scroller in a scroller. */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                    {activeTab === 'build' && (
                        <div role="tabpanel" id="panel-build" aria-labelledby="tab-build" className="space-y-5">
                            {smogonEntry?.sets?.length > 0 && (
                                <div className="rounded-xl bg-primary/5 p-3">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        <h3 className="text-sm font-bold text-fg">{t('builder.editor.smogonSets')}</h3>
                                        <span className="text-2xs text-muted">{t('builder.editor.smogonSetsHint')}</span>
                                    </div>
                                    <div className="editor-sets">
                                        {smogonEntry.sets.map((set, i) => {
                                            const spread = formatEvSpread(set.evs);
                                            return (
                                                <button
                                                    key={`${set.name}-${i}`}
                                                    type="button"
                                                    onClick={() => setCustomization((prev) => applySmogonSet(set, prev))}
                                                    className="w-full rounded-lg bg-surface-raised px-3 py-2 text-left transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                    title={t('builder.editor.applySet', { name: set.name })}
                                                >
                                                    <span className="flex items-center justify-between gap-1">
                                                        <span className="truncate text-sm font-bold text-fg">{set.name}</span>
                                                        {set.source && <span className="shrink-0 rounded bg-primary/15 px-1 text-2xs font-bold text-primary">{set.source}</span>}
                                                    </span>
                                                    <span className="block truncate text-2xs capitalize text-muted">
                                                        {set.item ? set.item.replace(/-/g, ' ') : t('builder.editor.noItem')}
                                                        {set.tera?.[0] ? ` · Tera ${set.tera[0].replace(/-/g, ' ')}` : ''}
                                                    </span>
                                                    {spread && <span className="mt-0.5 block truncate font-mono text-2xs text-muted">{spread}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                                <div>
                                    <span className={fieldLabelClassName}>{t('modals.editorModalItemLabel')}</span>
                                    <SpriteSelect
                                        value={customization.item}
                                        onChange={(slug) => handleCustomizationChange('item', slug)}
                                        options={itemOptions}
                                        getSprite={itemSpriteUrl}
                                        placeholder={t('common.none')}
                                        noneLabel={t('common.none')}
                                        searchPlaceholder={t('builder.editor.searchItem')}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="editor-nature" className={fieldLabelClassName}>{t('modals.editorModalNatureLabel')}</label>
                                    <select id="editor-nature" value={customization.nature} onChange={(event) => handleCustomizationChange('nature', event.target.value)} className={controlClassName}>
                                        {(natures && natures.length >= 25 ? natures : ALL_NATURES).map((nature) => <option key={nature.name} value={nature.name}>{natureLabel(nature.name)}</option>)}
                                    </select>
                                </div>
                                {showTeraType && (
                                    <div>
                                        <label htmlFor="editor-tera" className={fieldLabelClassName}>{t('modals.editorModalTeraLabel')}</label>
                                        <select id="editor-tera" value={customization.teraType} onChange={(event) => handleCustomizationChange('teraType', event.target.value)} className={controlClassName}>
                                            {Object.keys(typeColors).map((type) => <option key={type} value={type} className="capitalize">{t(`types.${type.toLowerCase()}`, { defaultValue: type })}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="editor-ability" className={fieldLabelClassName}>{t('modals.editorModalAbilityLabel')}</label>
                                    <select id="editor-ability" value={customization.ability} onChange={(event) => handleCustomizationChange('ability', event.target.value)} className={controlClassName}>
                                        {(pokemon.abilities || []).map((ability) => (
                                            <option key={ability.name} value={ability.name} className="capitalize">{ability.name.replace(/-/g, ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <Switch
                                checked={customization.isShiny}
                                onChange={(next) => {
                                    handleCustomizationChange('isShiny', next);
                                    if (next) shinyBurst.fire();
                                }}
                                label={t('modals.editorModalShinyLabel')}
                                className="w-fit"
                            />

                            <div className="pt-1">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-fg">{t('modals.editorModalMovesHeading')}</h3>
                                        <span className={`count-badge ${customization.moves.length === 4 ? 'text-success' : ''}`}>
                                            {customization.moves.length}/4
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted">
                                        {movePctBySlug.size > 0 ? t('builder.editor.mostUsedFirst') : t('modals.editorModalMovesHint')}
                                    </span>
                                </div>

                                {/* The picked moves, each removable, whatever the grid
                                    below lists: a preset move missing from this
                                    Pokémon's learnset data (a set from another format,
                                    an old save, a gap in the data) stays visible here
                                    and can be taken off. It is not flagged — the
                                    learnset data has gaps, and Kingambit's Sucker
                                    Punch read as illegal. */}
                                <div className="mb-3 flex min-h-[2.25rem] flex-wrap items-center gap-2">
                                    {customization.moves.length === 0 && (
                                        <span className="text-sm text-muted">{t('modals.editorModalNoMovesYet')}</span>
                                    )}
                                    {customization.moves.map((moveName) => {
                                        const moveType = typeForMove(moveName);
                                        return (
                                            <button
                                                key={moveName}
                                                type="button"
                                                onClick={() => handleMoveToggle(moveName)}
                                                aria-label={t('modals.editorModalRemoveMove', { move: moveName.replace(/-/g, ' ') })}
                                                className="type-chip editor-move-chip"
                                                style={{ '--type-chip': moveType ? typeColors[moveType] : 'var(--color-muted)' }}
                                            >
                                                {moveType && <img src={typeIcons[moveType]} alt="" aria-hidden="true" className="type-chip__icon" />}
                                                <span className="capitalize">{moveName.replace(/-/g, ' ')}</span>
                                                <CloseIcon className="h-3 w-3" />
                                            </button>
                                        );
                                    })}
                                </div>

                                <input
                                    type="text"
                                    placeholder={t('modals.editorModalSearchMoves')}
                                    value={moveSearch}
                                    onChange={(event) => setMoveSearch(event.target.value)}
                                    className="input-clean mb-3 w-full"
                                    aria-label={t('modals.editorModalSearchMoves')}
                                />

                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {filteredMoves.length === 0 ? (
                                        <p className="col-span-full py-6 text-center text-sm text-muted">{t('modals.editorModalNoMovesFound')}</p>
                                    ) : visibleMoves.map((move) => {
                                        const moveType = typeForMove(move.name);
                                        const isSelected = hasMove(customization.moves, move.name);
                                        const isFull = customization.moves.length >= 4;
                                        const isDisabled = !isSelected && isFull;
                                        const pct = movePctBySlug.get(toSlug(move.name));

                                        return (
                                            <button
                                                key={move.name}
                                                type="button"
                                                disabled={isDisabled}
                                                onClick={() => handleMoveToggle(move.name)}
                                                aria-pressed={isSelected}
                                                className={`editor-move ${isSelected ? 'is-selected' : ''}`}
                                                style={moveType ? { '--type-chip': typeColors[moveType] } : undefined}
                                            >
                                                {moveType ? (
                                                    <img src={typeIcons[moveType]} alt="" className="h-4 w-4 flex-shrink-0" />
                                                ) : (
                                                    <span className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                                )}
                                                <span className="min-w-0 flex-1 truncate capitalize">{move.name.replace(/-/g, ' ')}</span>
                                                {pct > 0 && <span className="count-badge shrink-0">{pct}%</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                {isMovePreview && (
                                    <button type="button" className="btn btn-ghost btn-sm btn-block mt-2" onClick={() => setShowAllMoves(true)}>
                                        {t('common.showMore', { count: filteredMoves.length - MOVES_PREVIEW })}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div role="tabpanel" id="panel-stats" aria-labelledby="tab-stats" className="space-y-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-lg font-bold text-fg">{t('modals.editorModalEffortValues')}</h3>
                                <div className="flex items-center gap-3">
                                    <p className="text-sm text-muted">
                                        {t('modals.editorModalRemaining')}: <span className={`text-lg font-bold ${remainingEVs === 0 ? 'text-success' : 'text-primary'}`}><RollingNumber value={remainingEVs} /></span> / {EV_TOTAL_BUDGET}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={resetEvs}
                                        disabled={remainingEVs === EV_TOTAL_BUDGET}
                                        className="btn btn-ghost btn-sm"
                                    >
                                        <RotateCcw aria-hidden="true" /> {t('builder.editor.resetEvs')}
                                    </button>
                                </div>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                                <div className="h-full w-full origin-left bg-primary transition-transform duration-200 ease-out" style={{ transform: `scaleX(${(EV_TOTAL_BUDGET - remainingEVs) / EV_TOTAL_BUDGET})` }} />
                            </div>
                            {/* Reserved line, so the rows do not jump when it fills. */}
                            <p className="editor-ev-notice" role="status" aria-live="polite">
                                {evNotice
                                    ? t(evNotice.reason === 'stat' ? 'builder.editor.evCapStat' : 'builder.editor.evCapBudget', { stat: STAT_ABBR[evNotice.stat], value: evNotice.value })
                                    : ''}
                            </p>

                            {/* The EV column is typable, so it gets a header — otherwise two
                                bare number columns sit side by side with nothing naming them. */}
                            <div className="flex items-center gap-3 text-2xs font-semibold text-muted">
                                <span className="w-10 shrink-0" />
                                <span className="min-w-0 flex-1" />
                                <span className="w-14 shrink-0 text-center">EV</span>
                                <span className="w-9 shrink-0 text-right">{t('builder.editor.statTotal')}</span>
                            </div>

                            <div className="space-y-4">
                                {STAT_NAMES.map((statName, index) => {
                                    const baseStat = pokemon.stats?.[index]?.base_stat ?? 0;
                                    const ev = Number(customization.evs?.[statName]) || 0;
                                    const totalStat = calculateStat(baseStat, ev, statName);
                                    const colorVar = STAT_COLOR_VAR[statName] ?? '--stat-hp';
                                    const fillPct = Math.min(100, (ev / EV_MAX_PER_STAT) * 100);
                                    const statColor = `var(${colorVar})`;
                                    const statLabel = statName.replace(/-/g, ' ');
                                    const affordable = maxEvFor(customization.evs, statName);

                                    // One clean row: stat · slider · typed EV · final stat.
                                    // step=1 on purpose: at step=4 the last 1-3 EVs of a spread
                                    // were unreachable and every drag snapped to a fixed set of
                                    // spots, which is exactly what users reported as "it won't
                                    // let me set precise numbers".
                                    return (
                                        <div key={statName} className="flex items-center gap-3">
                                            <span className="w-10 shrink-0 text-xs font-bold" style={{ color: statColor }}>{STAT_ABBR[statName]}</span>
                                            <input
                                                type="range"
                                                min="0"
                                                max={EV_MAX_PER_STAT}
                                                value={ev}
                                                step="1"
                                                onChange={(event) => handleEvChange(statName, event.target.value)}
                                                className="ev-slider min-w-0 flex-1"
                                                style={{ background: `linear-gradient(to right, ${statColor} 0%, ${statColor} ${fillPct}%, var(--color-surface-raised) ${fillPct}%, var(--color-surface-raised) 100%)` }}
                                                aria-label={`${statLabel} EV`}
                                                aria-valuetext={`${ev} EV`}
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                max={affordable}
                                                step="1"
                                                inputMode="numeric"
                                                value={ev}
                                                onChange={(event) => handleEvChange(statName, event.target.value)}
                                                onFocus={(event) => event.target.select()}
                                                className="w-14 shrink-0 rounded-md border border-border bg-surface-raised px-1 py-1 text-center font-mono text-xs tabular-nums text-fg transition-colors focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                                                aria-label={`${statLabel} EV value`}
                                                title={t('builder.editor.maxHere', { count: affordable })}
                                            />
                                            <span className="w-9 shrink-0 text-right font-mono text-sm font-bold tabular-nums text-fg">{totalStat}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'usage' && (
                        <div role="tabpanel" id="panel-usage" aria-labelledby="tab-usage" className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm text-muted">
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
                                            className="py-1 px-2.5 text-2xs h-8 rounded-lg"
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { closeKeepingEdits(); navigate(fmtId ? `/meta/${pokemon.id}?fmt=${fmtId}` : `/meta/${pokemon.id}`, { state: linkState }); }}
                                        className="btn btn-secondary btn-sm"
                                    >
                                        <TrendingUp className="h-3.5 w-3.5" /> {pt ? 'Página completa' : 'Full usage page'} <ArrowUpRight className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>

                            {fmtStatus === 'loading' ? (
                                <p className="text-sm text-muted">{pt ? 'Carregando dados de uso…' : 'Loading usage data…'}</p>
                            ) : !usage ? (
                                <div className="rounded-xl bg-bg px-4 py-3 text-sm text-muted">
                                    {pt
                                        ? `Sem dados de uso para ${pokemon.name} em ${format?.label || 'este regulamento'}. Tente outro regulamento acima.`
                                        : `No ${format?.label || 'this regulation'} usage data for ${pretty(pokemon.name)}. Try another regulation above.`}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {usage?.items?.length > 0 && (
                                        <section className="rounded-xl bg-bg p-3">
                                            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted">
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
                                        <section className="rounded-xl bg-bg p-3">
                                            <h3 className="mb-2 flex items-center justify-between gap-1.5 text-xs font-bold text-muted">
                                                <span className="flex items-center gap-1.5"><Swords className="h-3.5 w-3.5 text-primary" /> {pt ? 'Golpes' : 'Moves'}</span>
                                                <span className={`count-badge ${customization.moves.length === 4 ? 'text-success' : ''}`}>{customization.moves.length}/4</span>
                                            </h3>
                                            <div className="space-y-1.5">
                                                {usage.moves.slice(0, 10).map((mv) => {
                                                    const mt = typeForMove(mv.name);
                                                    const active = hasMove(customization.moves, mv.name);
                                                    return (
                                                        <UsageBar
                                                            key={mv.name}
                                                            label={pretty(mv.name)}
                                                            icon={mt && typeIcons[mt] ? <img src={typeIcons[mt]} alt="" className="h-4 w-4" /> : undefined}
                                                            pct={pctOf(mv.count, usageN)}
                                                            count={mv.count}
                                                            color={mt ? (typeColors[mt] || 'var(--color-success)') : 'var(--color-success)'}
                                                            active={active}
                                                            trailing={active ? <Check className="h-3.5 w-3.5 text-primary" /> : <Plus className="h-3.5 w-3.5 text-muted" />}
                                                            onClick={() => applyMoveName(mv.name)}
                                                            title={active ? (pt ? 'Remover golpe' : 'Remove move') : (pt ? 'Adicionar golpe' : 'Add move')}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    )}

                                    {(usage?.abilities?.length > 0 || usageNatures.length > 0) && (
                                        <section className="rounded-xl bg-bg p-3">
                                            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted">
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
                                                        <p className="pt-1.5 text-2xs font-bold text-muted">{pt ? 'Naturezas' : 'Natures'}</p>
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

                                    {showTeraType && teraList.length > 0 && (
                                        <section className="rounded-xl bg-bg p-3">
                                            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted">
                                                <Sparkles className="h-3.5 w-3.5 text-primary" /> {pt ? 'Tipo Tera' : 'Tera type'}
                                            </h3>
                                            <div className="flex flex-wrap gap-1.5">
                                                {teraList.slice(0, 8).map((tt) => {
                                                    const slug = tt.name?.toLowerCase();
                                                    const active = customization.teraType === slug;
                                                    return (
                                                        <button
                                                            key={tt.name}
                                                            type="button"
                                                            onClick={() => applyTeraSlug(slug)}
                                                            aria-pressed={active}
                                                            className={`type-chip type-chip--sm editor-tera-chip ${active ? 'is-selected' : ''}`}
                                                            style={{ '--type-chip': typeColors[slug] || 'var(--color-muted)' }}
                                                        >
                                                            {typeIcons[slug] && <img src={typeIcons[slug]} alt="" aria-hidden="true" className="type-chip__icon" />}
                                                            <span className="capitalize">{tt.name}</span>
                                                            {active && <Check className="h-3 w-3" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="mt-2 text-2xs text-muted">{pt ? 'EVs confiáveis estão nos conjuntos Smogon (aba Build).' : 'Reliable EV spreads live in the Smogon sets (Build tab).'}</p>
                                        </section>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* The one line kept: it separates content that scrolls from actions
                    that do not. Done is the only commit — every way out keeps the
                    edits — and removing the member lives here, where it is
                    deliberate, instead of as six red discs over the phone's slots. */}
                <footer className="modal-footer modal-footer--ruled editor-footer">
                    <button
                        type="button"
                        onClick={removeMember}
                        className="btn btn-ghost editor-remove"
                    >
                        <Trash2 aria-hidden="true" /> {t('builder.removeFromTeam')}
                    </button>
                    <button
                        type="button"
                        onClick={closeKeepingEdits}
                        className="btn btn-primary"
                    >
                        <Check aria-hidden="true" /> {t('builder.done')}
                    </button>
                </footer>
            </div>
        </div>
    );
}
