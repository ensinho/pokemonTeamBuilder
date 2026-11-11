import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Package, Swords, Zap, TrendingUp, ArrowUpRight, Plus, Check, RotateCcw, Trash2, Search } from 'lucide-react';

// Styles (.editor-*) live in team-builder-view.css, loaded with the shell.
import { typeColors, typeIcons } from '../../constants/types';
import { getPokemonArtworkSpriteUrl, getPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { itemSpriteUrl } from '../../utils/itemSuggestions';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useSmogonData } from '../../hooks/useSmogonData';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { useUsageIndex, useUsageFormat } from '../../hooks/useUsageStats';
import { useMoveTypes } from '../../hooks/useMoveTypes';
import { useBattleDex } from '../../hooks/useBattleDex';
import { useBattleItems } from '../../hooks/useBattleItems';
import { applySmogonSet, formatSetSpread } from '../../utils/smogonSets';
import { applyEvChange, evLimitsFor, maxEvFor, remainingEvs } from '../../utils/evBudget';
import { convertSpread, looksLikeStatPoints, statPointsToEvs } from '../../utils/statPoints';
import { buildSignature } from '../../utils/teamDraft';
import { natureLabel, ALL_NATURES } from '../../constants/natures';
import { UsageBar, RegulationSelect } from '../views/metaShared';
import { pctOf, pretty } from '../../utils/metaFormat';
import { SpriteSelect } from '../SpriteSelect';
import { Switch } from '../Switch';
import { RollingNumber } from '../RollingNumber';
import { Pager } from '../Pager';
import { usePaged } from '../../hooks/usePaged';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { TypeChip } from '../TypeChip';
import { CloseIcon } from '../icons';
import { getPokemonWeaknessEntries } from './pokemonModalShared';
import { useTranslation } from '../../hooks/useTranslation';
import { useThemeStore } from '../../store/useThemeStore';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { toneInk } from '../../utils/toneInk';

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

// Moves per page. A learnset runs 50–120 moves; listed whole inside the dialog
// it made the phone editor 2.4 screens long. A fixed page (two columns of
// six) keeps the dialog the same height whatever is filtered, and the four
// moves people actually pick are on the first one once ranked by usage.
const MOVES_PER_PAGE = 12;
const MOVE_CATEGORIES = ['physical', 'special', 'status'];
// Showdown id ("Rock Slide" / "rock-slide" → "rockslide"), the battle dex's key.
const toDexId = (s = '') => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const prettyMove = (s = '') => s.replace(/-/g, ' ');

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
export function TeamPokemonEditorModal({ pokemon, onClose, onSave, items, natures }) {
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
    // Category, power, accuracy, PP and the one-line effect of every move —
    // one small static file, shared with the Moves list and the battle screen.
    const dex = useBattleDex();
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
    const [moveCategory, setMoveCategory] = useState('all');
    const [moveType, setMoveType] = useState('all');
    // null = the default order: most used when the format has data, else A–Z.
    const [moveSort, setMoveSort] = useState(null);
    // The move whose description the info line shows (pointed at, focused or
    // just picked) — the games' move box.
    const [inspected, setInspected] = useState(null);
    const [artFailed, setArtFailed] = useState(false);
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
        setMoveCategory('all');
        setMoveType('all');
        setMoveSort(null);
        setInspected(null);
        setArtFailed(false);
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
    //
    // A member of an imported Pokémon Champions team keeps its spread in Stat
    // Points (`customization.evScale === 'sp'`, see statPoints.js): 32 per stat,
    // 66 in all, exported as written. The caps and labels follow its scale.
    const evScale = customization.evScale === 'sp' ? 'sp' : 'ev';
    const evLimits = evLimitsFor(evScale);
    const evUnit = evScale === 'sp' ? 'SP' : 'EV';
    const remainingEVs = useMemo(() => remainingEvs(customization.evs, evScale), [customization.evs, evScale]);

    // The sprite in the header sparkles once when the user flips it to shiny —
    // the game's own way of saying "this one is shiny".
    const shinyBurst = useShinyBurst();

    // Clamp, never reject — and say so. The thumb travels as far as the budget
    // allows and stops on the real cap (docs/wounds.md 2026-09-21); the line
    // under the budget bar names the stop, because a slider that halts short of
    // where it was dragged reads as broken when nothing explains it.
    const handleEvChange = (stat, value) => {
        const requested = Math.floor(Number(value));
        const cap = maxEvFor(customization.evs, stat, evScale);
        if (Number.isFinite(requested) && requested > cap) {
            setEvNotice({ stat, value: cap, reason: cap >= evLimits.maxPerStat ? 'stat' : 'budget' });
        } else if (evNotice) {
            setEvNotice(null);
        }
        setCustomization((prev) => ({ ...prev, evs: applyEvChange(prev.evs, stat, value, prev.evScale === 'sp' ? 'sp' : 'ev') }));
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

    // Stat Points feed the stat formula as the EVs they are worth.
    const calculateStat = (base, rawEv, statName) => {
        const ev = evScale === 'sp' ? statPointsToEvs(rawEv) : rawEv;
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

    // The learnset as rows the picker can filter and sort: each move with its
    // type, category, numbers and usage share. Built once per Pokémon/dex.
    const moveRows = useMemo(() => (pokemon.moves || []).map((move) => {
        const row = dex?.moves?.[toDexId(move.name)];
        return {
            name: move.name,
            slug: toSlug(move.name),
            type: typeForMove(move.name) || row?.[1] || null,
            category: row ? String(row[2] || '').toLowerCase() : null,
            power: row?.[3] || null,
            accuracy: row && row[4] !== true ? row[4] || null : null,
            pp: row?.[5] || null,
            desc: row?.[6] || '',
            pct: movePctBySlug.get(toSlug(move.name)) || 0,
        };
    }), [pokemon.moves, dex, typeForMove, movePctBySlug]);

    // The types this Pokémon actually has moves of — its own types first (the
    // STAB ones are what gets picked), then the best-stocked.
    const moveTypeOptions = useMemo(() => {
        const counts = new Map();
        for (const row of moveRows) if (row.type) counts.set(row.type, (counts.get(row.type) || 0) + 1);
        const own = (pokemon.types || []).map((type) => String(type).toLowerCase());
        return [...counts.keys()].sort((a, b) => (own.includes(b) - own.includes(a)) || counts.get(b) - counts.get(a) || a.localeCompare(b));
    }, [moveRows, pokemon.types]);

    // Most-used first (with the share on the row), then A–Z. The learnset
    // arrives in level-up order, which is the order nobody builds in.
    const sortMode = moveSort || (movePctBySlug.size > 0 ? 'usage' : 'name');
    const filteredMoves = useMemo(() => {
        const raw = moveSearch.trim().toLowerCase();
        const q = raw.replace(/\s+/g, '-');
        const list = moveRows.filter((row) => {
            if (moveCategory !== 'all' && row.category !== moveCategory) return false;
            if (moveType !== 'all' && row.type !== moveType) return false;
            if (!raw) return true;
            return row.name.toLowerCase().includes(q) || prettyMove(row.name.toLowerCase()).includes(raw);
        });
        const byName = (a, b) => a.name.localeCompare(b.name);
        if (sortMode === 'power') return list.sort((a, b) => (b.power || 0) - (a.power || 0) || byName(a, b));
        if (sortMode === 'usage') return list.sort((a, b) => b.pct - a.pct || byName(a, b));
        return list.sort(byName);
    }, [moveRows, moveSearch, moveCategory, moveType, sortMode]);
    const movePages = usePaged(filteredMoves, MOVES_PER_PAGE, `${moveSearch}|${moveCategory}|${moveType}|${sortMode}`);
    const visibleMoves = movePages.pageItems;
    const hasMoveFilters = Boolean(moveSearch) || moveCategory !== 'all' || moveType !== 'all';
    const clearMoveFilters = () => { setMoveSearch(''); setMoveCategory('all'); setMoveType('all'); };

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

    // The stage takes the Pokémon's first type as its tone; the artwork is the
    // protagonist and falls back to the sprite for a form with no artwork.
    const stageTone = typeColors[String(pokemon.types?.[0] || '').toLowerCase()] || 'var(--color-primary)';
    const artSrc = artFailed
        ? getPokemonDisplaySprite(pokemon, { shiny: customization.isShiny, animated: true })
        : getPokemonArtworkSpriteUrl(pokemon.id, { shiny: customization.isShiny });
    const itemOption = customization.item ? itemOptions.find((it) => it.slug === customization.item) : null;
    const inspectedRow = inspected ? moveRows.find((row) => row.slug === toSlug(inspected)) : null;
    const moveSlots = [0, 1, 2, 3].map((i) => customization.moves[i] || null);
    const removeMember = () => useActiveTeamStore.getState().handleRemoveFromTeam(pokemon.instanceId);

    return (
        <div className="modal-scrim" onClick={closeKeepingEdits} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="team-editor-title"
                tabIndex={-1}
                className="modal-panel editor"
                style={{ '--stage-tone': stageTone }}
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    onClick={closeKeepingEdits}
                    type="button"
                    className="modal-close editor__close"
                    aria-label={t('modals.editorModalCloseAria')}
                >
                    <CloseIcon />
                </button>

                {/* The stage: who is being built, and the build as it stands.
                    It answers every edit — the artwork turns shiny, a picked
                    move takes its slot in its type's colour, an empty slot
                    stays dashed — and it stays put while the tabs change. */}
                <aside className="editor-stage" data-sheet-handle>
                    <span className="editor-stage__art">
                        <img
                            key={artFailed ? 'sprite' : 'art'}
                            src={artSrc}
                            alt=""
                            aria-hidden="true"
                            width="192"
                            height="192"
                            decoding="async"
                            className={artFailed ? 'image-pixelated' : ''}
                            onError={() => setArtFailed(true)}
                        />
                        {shinyBurst.burst}
                    </span>

                    <div className="editor-stage__id">
                        <h2 id="team-editor-title" className="editor-stage__name">{prettyMove(pokemon.name)}</h2>
                        <div className="editor-stage__types">
                            {(pokemon.types || []).map((type) => <TypeChip key={type} type={type} />)}
                        </div>
                        <div className="editor-stage__weak">
                            <span className="editor-stage__label">{t('modals.editorModalWeakVs')}</span>
                            {pokemonWeaknesses.length > 0 ? pokemonWeaknesses.map(({ type, multiplier }) => (
                                <span
                                    key={type}
                                    className="editor-weak"
                                    style={{ '--type-chip': typeColors[type] }}
                                    title={`${t(`types.${type.toLowerCase()}`, { defaultValue: type })} ×${multiplier}`}
                                >
                                    <img src={typeIcons[type]} alt={t(`types.${type.toLowerCase()}`, { defaultValue: type })} />
                                    {multiplier > 2 && <span className="figure">×{multiplier}</span>}
                                </span>
                            )) : (
                                <span className="editor-stage__label">{t('common.none')}</span>
                            )}
                        </div>
                    </div>

                    <Switch
                        checked={customization.isShiny}
                        onChange={(next) => {
                            handleCustomizationChange('isShiny', next);
                            if (next) shinyBurst.fire();
                        }}
                        label={t('modals.editorModalShinyLabel')}
                        size="sm"
                        className="editor-stage__shiny"
                    />

                    <div className="editor-sheet">
                        <dl className="editor-sheet__facts">
                            <div>
                                <dt>{t('modals.editorModalItemLabel')}</dt>
                                <dd>
                                    {itemOption && <img src={itemSpriteUrl(itemOption.slug)} alt="" aria-hidden="true" className="image-pixelated" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                                    {itemOption ? itemOption.name : (customization.item ? prettyMove(customization.item) : '—')}
                                </dd>
                            </div>
                            <div>
                                <dt>{t('modals.editorModalAbilityLabel')}</dt>
                                <dd>{customization.ability ? prettyMove(customization.ability) : '—'}</dd>
                            </div>
                            <div>
                                <dt>{t('modals.editorModalNatureLabel')}</dt>
                                <dd>{customization.nature ? natureLabel(customization.nature) : '—'}</dd>
                            </div>
                        </dl>

                        <ul className="editor-slots" aria-label={t('modals.editorModalMovesHeading')}>
                            {moveSlots.map((moveName, i) => {
                                if (!moveName) {
                                    return <li key={`empty-${i}`} className="editor-slot editor-slot--empty">{t('builder.editor.emptySlot')}</li>;
                                }
                                const slotType = typeForMove(moveName);
                                return (
                                    <li key={moveName}>
                                        <button
                                            type="button"
                                            className="editor-slot"
                                            style={{ '--type-chip': slotType ? typeColors[slotType] : 'var(--color-muted)' }}
                                            onClick={() => handleMoveToggle(moveName)}
                                            onMouseEnter={() => setInspected(moveName)}
                                            onFocus={() => setInspected(moveName)}
                                            aria-label={t('modals.editorModalRemoveMove', { move: prettyMove(moveName) })}
                                        >
                                            {slotType && <img src={typeIcons[slotType]} alt="" aria-hidden="true" />}
                                            <span>{prettyMove(moveName)}</span>
                                            <CloseIcon aria-hidden="true" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </aside>

                <div className="editor-main">
                <header className="editor-main__head">
                    {/* Short labels in a full-width track: "Uso competitivo" was
                        cut off as the third tab on a phone. */}
                    <div role="tablist" aria-label={t('builder.editor.sectionsAria')} className="segmented segmented--block">
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
                <div className="editor-main__body custom-scrollbar">
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
                                            const spread = formatSetSpread(set);
                                            return (
                                                <button
                                                    key={`${set.name}-${i}`}
                                                    type="button"
                                                    onClick={() => setCustomization((prev) => {
                                                        // A set's spread is in its format's scale (Champions sets
                                                        // are Stat Points); the member keeps its own.
                                                        const next = applySmogonSet(set, prev);
                                                        const from = looksLikeStatPoints(set.evs) ? 'sp' : 'ev';
                                                        return { ...next, evs: convertSpread(next.evs, from, prev.evScale === 'sp' ? 'sp' : 'ev') };
                                                    })}
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

                            <div className="editor-fields">
                                <div className="field">
                                    <span className="field-label">{t('modals.editorModalItemLabel')}</span>
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
                                <div className="field">
                                    <label htmlFor="editor-ability" className="field-label">{t('modals.editorModalAbilityLabel')}</label>
                                    <select id="editor-ability" value={customization.ability} onChange={(event) => handleCustomizationChange('ability', event.target.value)} className="select-clean capitalize">
                                        {(pokemon.abilities || []).map((ability) => (
                                            <option key={ability.name} value={ability.name} className="capitalize">{ability.name.replace(/-/g, ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="field">
                                    <label htmlFor="editor-nature" className="field-label">{t('modals.editorModalNatureLabel')}</label>
                                    <select id="editor-nature" value={customization.nature} onChange={(event) => handleCustomizationChange('nature', event.target.value)} className="select-clean capitalize">
                                        {(natures && natures.length >= 25 ? natures : ALL_NATURES).map((nature) => <option key={nature.name} value={nature.name}>{natureLabel(nature.name)}</option>)}
                                    </select>
                                </div>
                                {showTeraType && (
                                    <div className="field">
                                        <label htmlFor="editor-tera" className="field-label">{t('modals.editorModalTeraLabel')}</label>
                                        <select id="editor-tera" value={customization.teraType} onChange={(event) => handleCustomizationChange('teraType', event.target.value)} className="select-clean capitalize">
                                            {Object.keys(typeColors).map((type) => <option key={type} value={type} className="capitalize">{t(`types.${type.toLowerCase()}`, { defaultValue: type })}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <section className="editor-moves" aria-labelledby="editor-moves-title">
                                <div className="editor-moves__head">
                                    <h3 id="editor-moves-title">{t('modals.editorModalMovesHeading')}</h3>
                                    <span className={`count-badge ${customization.moves.length === 4 ? 'text-success' : ''}`}>
                                        {customization.moves.length}/4
                                    </span>
                                    {/* The pager rides the heading, above the grid: turning
                                        a page never needs a scroll to reach it. */}
                                    <span className="editor-moves__count figure">{t('db.results', { count: filteredMoves.length })}</span>
                                    <Pager page={movePages.page} pageCount={movePages.pageCount} onChange={movePages.setPage} label={t('builder.editor.movesPager')} />
                                </div>

                                {/* The picked moves, each removable, whatever the grid
                                    below lists: a preset move missing from this
                                    Pokémon's learnset data (a set from another format,
                                    an old save, a gap in the data) stays visible here
                                    and can be taken off. It is not flagged — the
                                    learnset data has gaps, and Kingambit's Sucker
                                    Punch read as illegal. On a wide screen the
                                    stage's four slots are this row. */}
                                <div className="editor-picked">
                                    {customization.moves.length === 0 && (
                                        <span className="text-sm text-muted">{t('modals.editorModalNoMovesYet')}</span>
                                    )}
                                    {customization.moves.map((moveName) => {
                                        const pickedType = typeForMove(moveName);
                                        return (
                                            <button
                                                key={moveName}
                                                type="button"
                                                onClick={() => handleMoveToggle(moveName)}
                                                aria-label={t('modals.editorModalRemoveMove', { move: prettyMove(moveName) })}
                                                className="type-chip editor-move-chip"
                                                style={{ '--type-chip': pickedType ? typeColors[pickedType] : 'var(--color-muted)' }}
                                            >
                                                {pickedType && <img src={typeIcons[pickedType]} alt="" aria-hidden="true" className="type-chip__icon" />}
                                                <span className="capitalize">{prettyMove(moveName)}</span>
                                                <CloseIcon className="h-3 w-3" />
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Find a move three ways, left to right: by name, by
                                    what it is (category), by how to rank the rest. */}
                                <div className="editor-moves__tools">
                                    <label className="search-field editor-moves__search">
                                        <Search aria-hidden="true" />
                                        <input
                                            type="text"
                                            placeholder={t('modals.editorModalSearchMoves')}
                                            value={moveSearch}
                                            onChange={(event) => setMoveSearch(event.target.value)}
                                            onKeyDown={(event) => {
                                                // Enter takes the top match the grid shows (the first
                                                // one not already picked) and clears the search for
                                                // the next move: type, Enter, type, Enter.
                                                if (event.key !== 'Enter' || event.nativeEvent.isComposing || !moveSearch.trim()) return;
                                                event.preventDefault();
                                                if (customization.moves.length >= 4) return;
                                                const top = visibleMoves.find((move) => !hasMove(customization.moves, move.name));
                                                if (!top) return;
                                                handleMoveToggle(top.name);
                                                setInspected(top.name);
                                                setMoveSearch('');
                                            }}
                                            enterKeyHint="done"
                                            className="input-clean"
                                            aria-label={t('modals.editorModalSearchMoves')}
                                        />
                                    </label>
                                    <div className="segmented segmented--sm" role="group" aria-label={t('builder.editor.moveCategoryFilter')}>
                                        <button type="button" className="segmented__item" aria-pressed={moveCategory === 'all'} onClick={() => setMoveCategory('all')}>
                                            {t('builder.editor.moveFilterAll')}
                                        </button>
                                        {MOVE_CATEGORIES.map((category) => (
                                            <button key={category} type="button" className="segmented__item" aria-pressed={moveCategory === category} onClick={() => setMoveCategory(category)}>
                                                <span className="editor-cat-dot" data-cat={category} aria-hidden="true" />
                                                {t(`db.${category}`)}
                                            </button>
                                        ))}
                                    </div>
                                    <select
                                        value={sortMode}
                                        onChange={(event) => setMoveSort(event.target.value)}
                                        className="select-clean editor-moves__sort"
                                        aria-label={t('builder.editor.moveSort')}
                                    >
                                        {movePctBySlug.size > 0 && <option value="usage">{t('builder.editor.sortUsage')}</option>}
                                        <option value="power">{t('builder.editor.sortPower')}</option>
                                        <option value="name">{t('builder.editor.sortName')}</option>
                                    </select>
                                </div>

                                {/* Only the types this Pokémon has moves of, its own
                                    first. The chosen one spells its name. */}
                                {moveTypeOptions.length > 1 && (
                                    <div className="editor-types" role="group" aria-label={t('builder.editor.moveTypeFilter')}>
                                        <button type="button" className="editor-type editor-type--all" aria-pressed={moveType === 'all'} onClick={() => setMoveType('all')}>
                                            {t('builder.editor.moveFilterAll')}
                                        </button>
                                        {moveTypeOptions.map((type) => {
                                            const label = t(`types.${type}`, { defaultValue: type });
                                            return (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    className="editor-type"
                                                    style={{ '--type-chip': typeColors[type] }}
                                                    aria-pressed={moveType === type}
                                                    aria-label={label}
                                                    title={label}
                                                    onClick={() => setMoveType(moveType === type ? 'all' : type)}
                                                >
                                                    <img src={typeIcons[type]} alt="" aria-hidden="true" />
                                                    {moveType === type && <span className="capitalize">{label}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* The games' move box: what the move under the
                                    pointer (or just picked) does. A reserved line. */}
                                <p className="editor-move-info" role="status" aria-live="polite">
                                    {inspectedRow ? (
                                        <>
                                            <strong>{prettyMove(inspectedRow.name)}</strong>
                                            <span className="figure">
                                                {[
                                                    inspectedRow.power ? `${t('builder.editor.movePower')} ${inspectedRow.power}` : null,
                                                    inspectedRow.accuracy ? `${t('builder.editor.moveAccuracy')} ${inspectedRow.accuracy}%` : null,
                                                    inspectedRow.pp ? `PP ${inspectedRow.pp}` : null,
                                                ].filter(Boolean).join(' · ')}
                                            </span>
                                            {inspectedRow.desc && <span>{inspectedRow.desc}</span>}
                                        </>
                                    ) : t('builder.editor.moveHint')}
                                </p>

                                {filteredMoves.length === 0 ? (
                                    <div className="editor-moves__empty">
                                        <p>{t('modals.editorModalNoMovesFound')}</p>
                                        {hasMoveFilters && (
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={clearMoveFilters}>
                                                {t('builder.editor.clearMoveFilters')}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="editor-move-grid">
                                        {visibleMoves.map((move) => {
                                            const isSelected = hasMove(customization.moves, move.name);
                                            const isDisabled = !isSelected && customization.moves.length >= 4;
                                            return (
                                                <button
                                                    key={move.name}
                                                    type="button"
                                                    disabled={isDisabled}
                                                    onClick={() => { handleMoveToggle(move.name); setInspected(move.name); }}
                                                    onMouseEnter={() => setInspected(move.name)}
                                                    onFocus={() => setInspected(move.name)}
                                                    aria-pressed={isSelected}
                                                    className={`editor-move ${isSelected ? 'is-selected' : ''}`}
                                                    style={move.type ? { '--type-chip': typeColors[move.type] } : undefined}
                                                >
                                                    {move.type ? (
                                                        <img src={typeIcons[move.type]} alt="" className="editor-move__icon" />
                                                    ) : (
                                                        <span className="editor-move__icon" aria-hidden="true" />
                                                    )}
                                                    <span className="editor-move__name">{prettyMove(move.name)}</span>
                                                    {move.pct > 0 && <span className="count-badge">{move.pct}%</span>}
                                                    {move.category && (
                                                        <span className="editor-move__power figure" data-cat={move.category} title={t(`db.${move.category}`)}>
                                                            <span className="editor-cat-dot" data-cat={move.category} aria-hidden="true" />
                                                            {move.power || '—'}
                                                        </span>
                                                    )}
                                                    {isSelected && <Check className="editor-move__check" aria-hidden="true" />}
                                                </button>
                                            );
                                        })}
                                        {movePages.pageCount > 1 && Array.from({ length: MOVES_PER_PAGE - visibleMoves.length }, (_, i) => (
                                            <span key={`filler-${i}`} className="editor-move editor-move--filler" aria-hidden="true" />
                                        ))}
                                    </div>
                                )}

                            </section>
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div role="tabpanel" id="panel-stats" aria-labelledby="tab-stats" className="space-y-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-lg font-bold text-fg">{evScale === 'sp' ? t('modals.editorModalStatPoints') : t('modals.editorModalEffortValues')}</h3>
                                <div className="flex items-center gap-3">
                                    <p className="text-sm text-muted">
                                        {t('modals.editorModalRemaining')}: <span className={`text-lg font-bold ${remainingEVs === 0 ? 'text-success' : 'text-primary'}`}><RollingNumber value={remainingEVs} /></span> / {evLimits.total}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={resetEvs}
                                        disabled={remainingEVs === evLimits.total}
                                        className="btn btn-ghost btn-sm"
                                    >
                                        <RotateCcw aria-hidden="true" /> {t('builder.editor.resetEvs')}
                                    </button>
                                </div>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                                <div className="h-full w-full origin-left bg-primary transition-transform duration-200 ease-out" style={{ transform: `scaleX(${Math.min(1, Math.max(0, (evLimits.total - remainingEVs) / evLimits.total))})` }} />
                            </div>
                            {/* Reserved line, so the rows do not jump when it fills. */}
                            <p className="editor-ev-notice" role="status" aria-live="polite">
                                {evNotice
                                    ? t(evNotice.reason === 'stat' ? 'builder.editor.evCapStat' : 'builder.editor.evCapBudget', { stat: STAT_ABBR[evNotice.stat], value: evNotice.value, max: evLimits.maxPerStat, unit: evScale === 'sp' ? 'Stat Points' : 'EVs' })
                                    : ''}
                            </p>

                            {/* The EV column is typable, so it gets a header — otherwise two
                                bare number columns sit side by side with nothing naming them. */}
                            <div className="flex items-center gap-3 text-2xs font-semibold text-muted">
                                <span className="w-10 shrink-0" />
                                <span className="min-w-0 flex-1" />
                                <span className="w-14 shrink-0 text-center">{evUnit}</span>
                                <span className="w-9 shrink-0 text-right">{t('builder.editor.statTotal')}</span>
                            </div>

                            <div className="space-y-4">
                                {STAT_NAMES.map((statName, index) => {
                                    const baseStat = pokemon.stats?.[index]?.base_stat ?? 0;
                                    const ev = Number(customization.evs?.[statName]) || 0;
                                    const totalStat = calculateStat(baseStat, ev, statName);
                                    const colorVar = STAT_COLOR_VAR[statName] ?? '--stat-hp';
                                    const fillPct = Math.min(100, (ev / evLimits.maxPerStat) * 100);
                                    const statColor = `var(${colorVar})`;
                                    const statLabel = statName.replace(/-/g, ' ');
                                    const affordable = maxEvFor(customization.evs, statName, evScale);

                                    // One clean row: stat · slider · typed EV · final stat.
                                    // step=1 on purpose: at step=4 the last 1-3 EVs of a spread
                                    // were unreachable and every drag snapped to a fixed set of
                                    // spots, which is exactly what users reported as "it won't
                                    // let me set precise numbers".
                                    return (
                                        <div key={statName} className="flex items-center gap-3">
                                            <span className="w-10 shrink-0 text-xs font-bold" style={{ color: toneInk(statColor) }}>{STAT_ABBR[statName]}</span>
                                            <input
                                                type="range"
                                                min="0"
                                                max={evLimits.maxPerStat}
                                                value={ev}
                                                step="1"
                                                onChange={(event) => handleEvChange(statName, event.target.value)}
                                                className="ev-slider min-w-0 flex-1"
                                                style={{ background: `linear-gradient(to right, ${statColor} 0%, ${statColor} ${fillPct}%, var(--color-surface-raised) ${fillPct}%, var(--color-surface-raised) 100%)` }}
                                                aria-label={`${statLabel} ${evUnit}`}
                                                aria-valuetext={`${ev} ${evUnit}`}
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
                                                aria-label={`${statLabel} ${evUnit} value`}
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
        </div>
    );
}
