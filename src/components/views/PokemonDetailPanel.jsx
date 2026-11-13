import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    MapPin, Star, Sparkles, ChevronRight, Compass, Footprints, Waves, Fish, Gift, Music,
    Hammer, Activity, AlertCircle, Swords, Image as ImageIcon, Plus, Check, ChevronLeft, Trophy, Share2, Search,
} from 'lucide-react';

import '../../styles/pokemon-detail-view.css';
import '../../styles/reference-views.css';
import { typeColors } from '../../constants/types';
import { TypeChip } from '../TypeChip';
import { StatBar } from '../StatBar';
import { AbilityChip } from '../AbilityChip';
import { Sprite } from '../Sprite';
import { useTranslation } from '../../hooks/useTranslation';
import { useUrlTab } from '../../hooks/useUrlTab';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { usePokemonDetailData } from '../../hooks/usePokemonDetailData';
import { VERSION_CONFIG, formatTmName, formatVersionLabel } from '../../constants/pokemonVersions';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { SmogonCompetitivePanel } from './SmogonCompetitivePanel';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { Loader } from '../Loader';
import { ProfessorEntry } from '../pokedex/ProfessorEntry';
import { TournamentPresence } from '../TournamentPresence';
import { useTournamentPresence } from '../../hooks/useTournamentPresence';
import { useSharePage } from '../../hooks/useSharePage';
import { titleCaseSlug } from '../../utils/smogonSets';
import { MostUsedBuild } from '../MostUsedBuild';
import { useMostUsedBuild } from '../../hooks/useMostUsedBuild';
import { usePokedexStore } from '../../store/usePokedexStore';
import { useReferenceStore } from '../../store/useReferenceStore';
import { getPokemonNeighbors } from '../../utils/pokemonNeighbors';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';

const DETAIL_TABS = ['data', 'competitive', 'locations', 'moves', 'sprites'];

const METHOD_ICON_MAP = {
    walk: Footprints, surf: Waves, 'old-rod': Fish, 'good-rod': Fish, 'super-rod': Fish,
    gift: Gift, headbutt: Compass, 'rock-smash': Hammer, pokeflute: Music,
};

// Damage tiers, worst first — the same reading as the phone screen.
const DEFENSE_TIERS = [4, 2, 0.5, 0.25, 0];
const MULTIPLIER_LABEL = { 4: '4×', 2: '2×', 0.5: '½×', 0.25: '¼×', 0: '0×' };

const MOVE_METHODS = ['levelUp', 'machine', 'other'];

const cleanName = (name = '') => String(name).replace(/-/g, ' ');
const padDex = (id) => `#${String(id).padStart(4, '0')}`;

/** The type-tinted backdrop of the hero, shared in spirit with the phone screen. */
const heroTypeStyle = (types = []) => ({
    '--pdd-type-a': typeColors[types[0]] || 'var(--color-primary)',
    '--pdd-type-b': typeColors[types[1]] || typeColors[types[0]] || 'var(--color-primary)',
});

const isTypingTarget = (target) => Boolean(
    target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)),
);

/* ── Building blocks ───────────────────────────────────────────────────────── */

/** One region of the page: a bordered surface, a sentence-case title, a fill inside. */
function Card({ title, meta, children, className = '' }) {
    return (
        <section className={`pdd-card ${className}`}>
            {(title || meta) && (
                <div className="pdd-card__head">
                    {title && <h2 className="pdd-card__title">{title}</h2>}
                    {meta}
                </div>
            )}
            {children}
        </section>
    );
}

/** Label/value row for the spec lists (training, breeding). */
function Spec({ label, value }) {
    return (
        <div className="pdd-spec">
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

function Empty({ title, message }) {
    return (
        <div className="pdd-empty">
            <AlertCircle className="w-8 h-8" aria-hidden="true" />
            <p className="pdd-empty__title">{title}</p>
            <p className="pdd-empty__message">{message}</p>
        </div>
    );
}

/**
 * The desktop Pokédex entry (≥1024px). Same story as the phone screen
 * (MobilePokemonDetailView), told with the width a desktop has: a hero in the
 * Pokémon's own type colours where the artwork is the protagonist, one tab
 * strip, and below it the data in order of what a trainer asks first — what it
 * does (stats, matchups), where it goes (evolution, forms), how it is played
 * (build, tournaments) — with the reference specs in a side rail.
 *
 * Both screens read `usePokemonDetailData`, so this is a layout, not a second
 * Pokédex. ← / → walk to the neighbour in the list the trainer was browsing.
 */
export function PokemonDetailPanel({
    pokemonId,
    indexEntry = null,
    favoritePokemons,
    onToggleFavoritePokemon,
    onAdd,
    currentTeam = [],
    onNavigate,
    db,
    pokemonDetailsCache = {},
    setPokemonDetailsCache,
    backLabel,
    onBack,
}) {
    const { t, language } = useTranslation();
    const pt = language === 'pt';
    const navigate = useNavigate();
    const location = useLocation();
    const { goToMove } = useEntityNavigate();

    // In the URL (?tab=): Pikachu → Moves → a move → Back used to land on Data.
    const [activeTab, setActiveTab] = useUrlTab(DETAIL_TABS, 'data');
    const tournamentPresence = useTournamentPresence(pokemonId);
    const build = useMostUsedBuild(pokemonId);
    const sharePage = useSharePage();
    // The sparkle a shiny makes, fired by the two buttons that earn it.
    const shinyBurst = useShinyBurst();
    const favoriteBurst = useShinyBurst();

    const {
        selectedPokemon,
        selectedPokemonDetails,
        fullApiData,
        evolutionDetails,
        forms,
        isEncountersLoading,
        isMovesLoading,
        spriteToShow,
        showShiny,
        setShowShiny,
        customSelectedSprite,
        setCustomSelectedSprite,
        pokemonGenerationSprites,
        availableVersions,
        locationsVersionFilter,
        setLocationsVersionFilter,
        filteredGroupedEncounters,
        availableMoveVersions,
        selectedMoveVersion,
        setSelectedMoveVersion,
        resolvedMoves,
        typeDefenses,
        pokemonGenus,
        pokedexDescription,
        isDescriptionLocal,
        isGenusLocal,
        heightInM,
        heightInFt,
        weightInKg,
        weightInLbs,
        evYield,
        genderText,
        eggGroups,
        baseFriendshipText,
        growthRateText,
        eggCyclesText,
        catchRateText,
    } = usePokemonDetailData({ pokemonId, db, pokemonDetailsCache, setPokemonDetailsCache, language });

    // The hero paints from the light index entry on the first frame and upgrades
    // in place, like the phone screen — no blank page while the document loads.
    const identity = selectedPokemonDetails || indexEntry || { id: pokemonId, name: '', types: [] };
    const types = identity.types || [];
    const favoriteId = Number(identity.id);
    const isFavorite = Boolean(favoritePokemons?.has?.(favoriteId));
    const isOnTeam = currentTeam.some((m) => Number(m.id) === favoriteId);
    const isTeamFull = currentTeam.length >= 6;

    /* ── Neighbours (← / →) ───────────────────────────────────────────────── */
    const browseSequence = usePokedexStore((s) => s.browseSequence);
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const { prev, next } = useMemo(
        () => getPokemonNeighbors(browseSequence, pokemonId, pokemonIndex),
        [browseSequence, pokemonId, pokemonIndex],
    );

    // Stepping sideways REPLACES the history entry, as the phone's swipe does:
    // ten Pokémon browsed with the arrows still leave Back meaning the Pokédex.
    const goToNeighbor = useCallback((entry) => {
        if (!entry?.id) return;
        navigate(`/pokemon/${entry.id}${location.search}`, { replace: true, state: location.state });
    }, [navigate, location.search, location.state]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            if (isTypingTarget(event.target) || document.querySelector('[aria-modal="true"]')) return;
            const target = event.key === 'ArrowLeft' ? prev : next;
            if (!target) return;
            event.preventDefault();
            goToNeighbor(target);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [prev, next, goToNeighbor]);

    // The app has one scroller and it does not reset between routes (2026-08-26
    // wound): stepping from halfway down one Pokémon must start the next at the top.
    useEffect(() => {
        document.querySelector('.app-shell__content')?.scrollTo({ top: 0 });
    }, [pokemonId]);

    const handleSelectPokemon = (pokemon) => { if (pokemon?.id != null) onNavigate?.(pokemon.id); };

    // A stage resolved without its full document has no types; the index has them.
    const typesOf = (entry) => {
        if (entry?.types?.length) return entry.types;
        return pokemonIndex.find((p) => Number(p.id) === Number(entry?.id))?.types || [];
    };

    /* ── Moves tab state ──────────────────────────────────────────────────── */
    const [moveMethod, setMoveMethod] = useState('levelUp');
    const [moveQuery, setMoveQuery] = useState('');

    const stats = selectedPokemonDetails?.stats || [];
    const statTotal = stats.reduce((sum, s) => sum + (s.base_stat || 0), 0);
    const peakStat = stats.length ? Math.max(...stats.map((s) => s.base_stat)) : null;

    const defenseGroups = DEFENSE_TIERS
        .map((multiplier) => ({
            multiplier,
            types: Object.entries(typeDefenses).filter(([, m]) => m === multiplier).map(([name]) => name),
        }))
        .filter((group) => group.types.length > 0);
    const neutralCount = Object.values(typeDefenses).filter((m) => m === 1).length;

    // The artwork is the protagonist; a sprite picked in the gallery takes its place.
    const heroSrc = customSelectedSprite || getPokemonArtworkSpriteUrl(identity.id, { shiny: showShiny });

    /* ── Tabs ─────────────────────────────────────────────────────────────── */
    const tabs = [
        { key: 'data', icon: <Activity />, label: t('pokedex.dataTab') },
        { key: 'competitive', icon: <Trophy />, label: t('pokedex.competitiveTab') },
        { key: 'locations', icon: <MapPin />, label: t('pokedex.locationsTab') },
        { key: 'moves', icon: <Swords />, label: t('pokedex.movesTab') },
        { key: 'sprites', icon: <ImageIcon />, label: t('pokedex.spritesTab') },
    ];

    const renderData = () => {
        if (!selectedPokemonDetails) return <div className="pdd-loading"><Loader size="md" scene="pokedex" /></div>;
        const hasEvolution = evolutionDetails.length > 1;
        // Two short rows read better as one: a three-stage line beside a couple
        // of forms, instead of a wide card that is mostly empty.
        const pairLineage = hasEvolution && forms.length > 0 && forms.length <= 2;
        return (
            <div className="pdd-data">
                <div className="pdd-data__main">
                    <div className="pdd-duo">
                        {stats.length > 0 && (
                            <Card
                                title={t('pokedex.baseStats')}
                                meta={<span className="pdd-card__meta">{t('pokedex.statTotal')} <b>{statTotal}</b></span>}
                            >
                                <div className="pdd-stats">
                                    {stats.map((stat) => (
                                        <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} peak={stat.base_stat === peakStat} />
                                    ))}
                                </div>
                            </Card>
                        )}

                        {defenseGroups.length > 0 && (
                            <Card title={t('pokedex.typeEffectivenessTitle')}>
                                <div className="pdd-defenses">
                                    {defenseGroups.map((group) => {
                                        const tone = group.multiplier > 1 ? 'weak' : group.multiplier === 0 ? 'immune' : 'resist';
                                        return (
                                            <div key={group.multiplier} className={`pdd-defense pdd-defense--${tone}`}>
                                                <p className="pdd-defense__label">
                                                    <span className="pdd-defense__mult">{MULTIPLIER_LABEL[group.multiplier]}</span>
                                                    {tone === 'weak' ? t('pokedex.weakAgainst')
                                                        : tone === 'immune' ? t('pokedex.immuneTo')
                                                            : t('pokedex.resistantTo')}
                                                </p>
                                                <div className="pdd-pills">
                                                    {group.types.map((type) => <TypeChip key={type} type={type} size="sm" />)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {neutralCount > 0 && (
                                        <p className="pdd-defense__neutral">{t('pokedex.neutralCount', { count: neutralCount })}</p>
                                    )}
                                </div>
                            </Card>
                        )}
                    </div>

                    <div className={pairLineage ? 'pdd-duo pdd-duo--lineage' : 'pdd-stack'}>
                        {hasEvolution && (
                            <Card title={t('pokedex.evolutionLine')}>
                                {/* The evolution line is the progress bar the games
                                    taught everyone to read: stage → stage → stage. */}
                                <ol className="pdd-evo">
                                    {evolutionDetails.map((evo, index) => (
                                        <li key={evo.id || evo.name} className="pdd-evo__step">
                                            {index > 0 && <ChevronRight className="pdd-evo__arrow" aria-hidden="true" />}
                                            <button
                                                type="button"
                                                onClick={() => handleSelectPokemon(evo)}
                                                aria-current={Number(evo.id) === favoriteId ? 'page' : undefined}
                                                className={`pdd-tile ${Number(evo.id) === favoriteId ? 'is-current' : ''}`}
                                            >
                                                <Sprite
                                                    className="pdd-tile__art"
                                                    src={evo.id ? getPokemonArtworkSpriteUrl(evo.id) : (evo.sprite || POKEBALL_PLACEHOLDER_URL)}
                                                    artworkSrc={evo.sprite || null}
                                                    alt=""
                                                />
                                                {evo.id && <span className="pdd-tile__dex">{padDex(evo.id)}</span>}
                                                <span className="pdd-tile__name">{cleanName(evo.name)}</span>
                                                {typesOf(evo).length > 0 && (
                                                    <span className="pdd-tile__types">
                                                        {typesOf(evo).map((type) => <TypeChip key={type} type={type} size="sm" />)}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ol>
                            </Card>
                        )}

                        {forms.length > 0 && (
                            <Card title={t('pokedex.formsAndMegas')}>
                                <div className={`pdd-forms ${pairLineage ? 'pdd-forms--paired' : ''}`}>
                                    {forms.map((form) => (
                                        <button
                                            key={form.id}
                                            type="button"
                                            onClick={() => handleSelectPokemon({ id: form.id })}
                                            className={`pdd-tile ${Number(form.id) === favoriteId ? 'is-current' : ''}`}
                                            title={form.displayName}
                                        >
                                            <Sprite className="pdd-tile__art" src={form.sprite || POKEBALL_PLACEHOLDER_URL} alt="" />
                                            <span className="pdd-tile__name">{form.displayName}</span>
                                            {form.types?.length > 0 && (
                                                <span className="pdd-tile__types">
                                                    {form.types.map((type) => <TypeChip key={type} type={type} size="sm" />)}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>

                    {build && (
                        <Card title={t('pdetail.build.title')}>
                            <MostUsedBuild pokemonId={pokemonId} build={build} />
                        </Card>
                    )}

                    {tournamentPresence && (
                        <Card title={t('pdetail.tournaments.title')}>
                            <TournamentPresence presence={tournamentPresence} onShowAll={() => setActiveTab('competitive')} />
                        </Card>
                    )}
                </div>

                <aside className="pdd-data__rail">
                    <Card title={t('pokedex.training')} className="pdd-card--specs">
                        <dl className="pdd-specs">
                            <Spec label={t('pokedex.evYield')} value={evYield || '—'} />
                            <Spec label={t('pokedex.catchRate')} value={catchRateText || '—'} />
                            <Spec label={t('pokedex.baseFriendship')} value={baseFriendshipText || '—'} />
                            <Spec label={t('pokedex.baseExp')} value={<span className="pdd-mono">{fullApiData?.base_experience ?? '—'}</span>} />
                            <Spec label={t('pokedex.growthRate')} value={growthRateText || '—'} />
                        </dl>
                        <h3 className="pdd-card__subtitle">{t('pokedex.breeding')}</h3>
                        <dl className="pdd-specs">
                            <Spec label={t('pokedex.eggGroups')} value={<span className="pdd-capitalize">{eggGroups || '—'}</span>} />
                            <Spec label={t('pokedex.genderRatio')} value={genderText || '—'} />
                            <Spec label={t('pokedex.eggCycles')} value={eggCyclesText || '—'} />
                        </dl>
                    </Card>
                </aside>
            </div>
        );
    };

    const renderLocations = () => {
        if (isEncountersLoading) return <div className="pdd-loading"><Loader size="md" scene="search" /></div>;
        if (filteredGroupedEncounters.length === 0 && locationsVersionFilter === 'all') {
            return <Empty title={t('pokedex.locationsEmptyTitle')} message={t('pokedex.locationsEmpty')} />;
        }
        return (
            <div className="pdd-stack">
                {availableVersions.length > 0 && (
                    <div className="pdd-toolbar">
                        <p className="pdd-toolbar__title">{t('pokedex.locationsTitle')}</p>
                        <label className="pdd-toolbar__field">
                            <span className="sr-only">{t('pokedex.locationsVersionFilter')}</span>
                            <select
                                value={locationsVersionFilter}
                                onChange={(event) => setLocationsVersionFilter(event.target.value)}
                                className="select-clean"
                            >
                                <option value="all">{t('pokedex.locationsAllVersions')}</option>
                                {availableVersions.map((version) => (
                                    <option key={version} value={version}>{formatVersionLabel(version)}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                )}

                {filteredGroupedEncounters.length === 0 && (
                    <Empty title={t('pokedex.locationsEmptyTitle')} message={t('pokedex.locationsEmpty')} />
                )}

                {filteredGroupedEncounters.map((group) => (
                    <Card key={group.id} title={group.name}>
                        <div className="pdd-places">
                            {group.locations.map((place) => (
                                <div key={place.location} className="pdd-place">
                                    <p className="pdd-place__name">
                                        <MapPin aria-hidden="true" />
                                        <span>{place.location}</span>
                                    </p>
                                    {place.versions.map((version) => {
                                        const config = VERSION_CONFIG[version.name] || { label: cleanName(version.name), color: 'var(--color-muted)' };
                                        const distinct = Array.from(version.details.reduce((acc, detail) => {
                                            acc.set(`${detail.methodKey}-${detail.minLevel}-${detail.maxLevel}`, detail);
                                            return acc;
                                        }, new Map()).values());
                                        return distinct.map((detail, index) => {
                                            const MethodIcon = METHOD_ICON_MAP[detail.methodKey] || Compass;
                                            return (
                                                <div key={`${version.name}-${index}`} className="pdd-encounter">
                                                    <span className="pdd-encounter__version" style={{ '--pdd-pill': config.color }}>{config.label}</span>
                                                    <span className="pdd-encounter__method">
                                                        <MethodIcon aria-hidden="true" />
                                                        <span className="pdd-capitalize">{detail.method}</span>
                                                    </span>
                                                    <span className="pdd-encounter__meta pdd-mono">
                                                        {detail.minLevel === detail.maxLevel ? `Lv ${detail.minLevel}` : `Lv ${detail.minLevel}–${detail.maxLevel}`}
                                                        <b>{detail.chance}%</b>
                                                    </span>
                                                </div>
                                            );
                                        });
                                    })}
                                </div>
                            ))}
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    const renderMoves = () => {
        if (isMovesLoading) return <div className="pdd-loading"><Loader size="md" scene="pokedex" /></div>;
        const counts = {
            levelUp: resolvedMoves.levelUp.length,
            machine: resolvedMoves.machine.length,
            other: (resolvedMoves.other || []).length,
        };
        const available = MOVE_METHODS.filter((key) => counts[key] > 0);
        if (available.length === 0) {
            return <Empty title={t('pokedex.movesEmptyTitle')} message={t('pokedex.movesEmpty')} />;
        }
        // A method with nothing in this game version falls to the first that has rows.
        const method = counts[moveMethod] > 0 ? moveMethod : available[0];
        const labels = { levelUp: t('pokedex.movesLevelUp'), machine: t('pokedex.movesMachine'), other: t('pokedex.movesOther') };
        const slotHeader = { levelUp: t('pokedex.movesHeaderLevel'), machine: t('pokedex.movesHeaderTm'), other: t('pokedex.locationsMethod') };
        const query = moveQuery.trim().toLowerCase().replace(/\s+/g, '-');
        const rows = (method === 'other' ? resolvedMoves.other || [] : resolvedMoves[method])
            .filter((move) => !query || move.name.includes(query) || move.type?.includes(query));

        return (
            <div className="pdd-stack">
                <div className="pdd-toolbar">
                    <div className="segmented" role="group" aria-label={t('pokedex.movesTitle')}>
                        {MOVE_METHODS.map((key) => (
                            <button
                                key={key}
                                type="button"
                                className="segmented__item"
                                aria-pressed={method === key}
                                disabled={counts[key] === 0}
                                onClick={() => setMoveMethod(key)}
                            >
                                {labels[key]}
                                <span className="count-badge">{counts[key]}</span>
                            </button>
                        ))}
                    </div>
                    <div className="pdd-toolbar__end">
                        <label className="pdd-search">
                            <Search aria-hidden="true" />
                            <input
                                type="search"
                                className="input-clean"
                                value={moveQuery}
                                onChange={(event) => setMoveQuery(event.target.value)}
                                placeholder={t('pokedex.movesFilter')}
                                aria-label={t('pokedex.movesFilter')}
                            />
                        </label>
                        {availableMoveVersions.length > 0 && (
                            <label className="pdd-toolbar__field">
                                <span className="sr-only">{t('pokedex.movesVersionFilter')}</span>
                                <select
                                    value={selectedMoveVersion}
                                    onChange={(event) => setSelectedMoveVersion(event.target.value)}
                                    className="select-clean"
                                >
                                    {availableMoveVersions.map((version) => (
                                        <option key={version} value={version}>{formatVersionLabel(version)}</option>
                                    ))}
                                </select>
                            </label>
                        )}
                    </div>
                </div>

                <section className="pdd-card pdd-card--flush">
                    {rows.length === 0 ? (
                        <p className="pdd-card__note">{t('search.noResults', { query: moveQuery.trim() })}</p>
                    ) : (
                        <table className="pdd-moves">
                            <thead>
                                <tr>
                                    <th className="pdd-moves__slot">{slotHeader[method]}</th>
                                    <th>{t('pokedex.movesHeaderName')}</th>
                                    <th>{t('pokedex.movesHeaderType')}</th>
                                    <th>{t('pokedex.movesHeaderClass')}</th>
                                    <th className="pdd-moves__num">{t('pokedex.movesHeaderPower')}</th>
                                    <th className="pdd-moves__num">{t('pokedex.movesHeaderAcc')}</th>
                                    <th className="pdd-moves__num">{t('pokedex.movesHeaderPp')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((move, index) => {
                                    const category = move.damageClass === 'physical' || move.damageClass === 'special' ? move.damageClass : 'status';
                                    return (
                                        <tr key={`${move.name}-${index}`} onClick={(event) => goToMove(move.name, event)}>
                                            <td className="pdd-moves__slot pdd-mono">
                                                {method === 'levelUp' ? (move.level === 0 ? 'Evo' : (move.level || '—'))
                                                    : method === 'machine' ? (move.tmName ? formatTmName(move.tmName) : '—')
                                                        : cleanName(move.learnMethod || '—')}
                                            </td>
                                            <td>
                                                <button type="button" className="pdd-moves__name" onClick={(event) => goToMove(move.name, event)}>
                                                    {cleanName(move.name)}
                                                </button>
                                            </td>
                                            <td>{move.type && <TypeChip type={move.type} size="sm" />}</td>
                                            <td><span className={`ref-cat ref-cat--${category}`}>{t(`db.${category}`)}</span></td>
                                            <td className="pdd-moves__num pdd-mono">{move.power ?? '—'}</td>
                                            <td className="pdd-moves__num pdd-mono">{move.accuracy ? `${move.accuracy}%` : '—'}</td>
                                            <td className="pdd-moves__num pdd-mono">{move.pp ?? '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </section>
            </div>
        );
    };

    const renderSprites = () => {
        if (pokemonGenerationSprites.length === 0) {
            return <Empty title={t('pokedex.spritesEmptyTitle')} message={t('pokedex.spritesEmpty')} />;
        }
        return (
            <Card
                title={t('pokedex.spritesTitle')}
                meta={customSelectedSprite && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCustomSelectedSprite(null)}>
                        {t('pokedex.spritesSpotlightReset')}
                    </button>
                )}
            >
                <p className="pdd-card__note">{t('pokedex.spritesSpotlightHint')}</p>
                <div className="pdd-sprites">
                    {pokemonGenerationSprites.map((generation) => (
                        <div key={generation.name} className="pdd-sprite">
                            <p className="pdd-sprite__label">{generation.name}</p>
                            <div className="pdd-sprite__row">
                                {[{ url: generation.normal, tag: 'Normal' }, { url: generation.shiny, tag: 'Shiny' }]
                                    .filter((variant) => variant.url)
                                    .map((variant) => (
                                        <button
                                            key={variant.tag}
                                            type="button"
                                            onClick={() => setCustomSelectedSprite(variant.url)}
                                            aria-pressed={customSelectedSprite === variant.url}
                                            className={`pdd-sprite__pick ${customSelectedSprite === variant.url ? 'is-active' : ''}`}
                                        >
                                            <img src={variant.url} alt={`${identity.name} ${generation.name} ${variant.tag}`} className="image-pixelated" loading="lazy" />
                                            <span>{variant.tag}</span>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    };

    const renderTab = () => {
        // Competitive only needs the species id, so it renders while the rest loads.
        if (activeTab === 'competitive') return <SmogonCompetitivePanel pokemonId={selectedPokemon?.id || pokemonId} />;
        if (activeTab === 'locations') return renderLocations();
        if (activeTab === 'moves') return renderMoves();
        if (activeTab === 'sprites') return renderSprites();
        return renderData();
    };

    const abilities = selectedPokemonDetails?.abilities || [];

    return (
        <div className="pdd">
            <header className="pdd-hero" style={heroTypeStyle(types)}>
                <div className="pdd-hero__bar">
                    {onBack ? (
                        <button type="button" className="btn btn-ghost btn-sm pdd-hero__back" onClick={onBack}>
                            <ChevronLeft aria-hidden="true" />
                            {backLabel || t('common.back')}
                        </button>
                    ) : <span />}
                    <div className="pdd-hero__actions">
                        <button
                            type="button"
                            onClick={() => sharePage(`/pokemon/${indexEntry?.name || identity.name || identity.id}`, titleCaseSlug(identity.name))}
                            className="pdd-iconbtn"
                            aria-label={t('common.sharePage')}
                            title={t('common.sharePage')}
                        >
                            <Share2 aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!showShiny) shinyBurst.fire();
                                setCustomSelectedSprite(null);
                                setShowShiny((value) => !value);
                            }}
                            className={`pdd-iconbtn ${showShiny ? 'is-active' : ''} ${shinyBurst.isBursting ? 'is-bursting' : ''}`}
                            aria-pressed={showShiny}
                            aria-label={t('pokedex.toggleShiny')}
                            title={t('pokedex.toggleShiny')}
                        >
                            <Sparkles aria-hidden="true" />
                            {shinyBurst.burst}
                        </button>
                        {onToggleFavoritePokemon && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isFavorite) favoriteBurst.fire();
                                    onToggleFavoritePokemon(favoriteId);
                                }}
                                className={`pdd-iconbtn ${isFavorite ? 'is-active' : ''} ${favoriteBurst.isBursting ? 'is-bursting' : ''}`}
                                aria-pressed={isFavorite}
                                aria-label={isFavorite ? t('common.remove') : t('pokedex.addFavorite')}
                                title={isFavorite ? t('common.remove') : t('pokedex.addFavorite')}
                            >
                                <Star aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
                                {favoriteBurst.burst}
                            </button>
                        )}
                        {onAdd && (
                            <button
                                type="button"
                                className={`btn ${isOnTeam ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                                onClick={() => onAdd({ id: favoriteId, name: identity.name, types })}
                                disabled={!identity.name || isOnTeam || isTeamFull}
                            >
                                {isOnTeam ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
                                {isOnTeam ? t('pdetail.onTeam') : t('pdetail.addToTeam')}
                            </button>
                        )}
                    </div>
                </div>

                <div className="pdd-hero__main">
                    <div className="pdd-hero__stage">
                        <Sprite
                            key={heroSrc}
                            className={`pdd-hero__art ${customSelectedSprite ? 'is-pixel' : ''}`}
                            src={heroSrc}
                            artworkSrc={spriteToShow}
                            alt={cleanName(identity.name)}
                            eager
                            heroTarget
                        />
                    </div>

                    <div className="pdd-hero__identity">
                        <p className="pdd-hero__dex">{padDex(identity.id)}</p>
                        <h1 className="pdd-hero__name">{cleanName(identity.name)}</h1>
                        {pokemonGenus && isGenusLocal && <p className="pdd-hero__genus">{pokemonGenus}</p>}
                        <div className="pdd-hero__types">
                            {types.map((type) => <TypeChip key={type} type={type} />)}
                        </div>

                        {pokedexDescription && (
                            <ProfessorEntry
                                className="pdd-hero__entry"
                                text={pokedexDescription}
                                lang={isDescriptionLocal ? undefined : 'en'}
                                note={isDescriptionLocal ? null : t('pokedex.originalText')}
                            />
                        )}

                        <dl className="pdd-facts">
                            <div className="pdd-fact">
                                <dt>{t('pokedex.height')}</dt>
                                <dd className="pdd-mono">{heightInM ? `${heightInM} m` : '—'}{heightInFt && <small>{heightInFt}</small>}</dd>
                            </div>
                            <div className="pdd-fact">
                                <dt>{t('pokedex.weight')}</dt>
                                <dd className="pdd-mono">{weightInKg ? `${weightInKg} kg` : '—'}{weightInLbs && <small>{weightInLbs} lbs</small>}</dd>
                            </div>
                            <div className="pdd-fact pdd-fact--wide">
                                <dt>{t('pokedex.abilities')}</dt>
                                <dd className="pdd-fact__abilities">
                                    {abilities.length === 0 && '—'}
                                    {abilities.map((ability, index) => (
                                        <span key={index} className="pdd-ability">
                                            <AbilityChip ability={ability} />
                                            {ability.is_hidden && <em>{t('pokedex.hiddenShort')}</em>}
                                        </span>
                                    ))}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {(prev || next) && (
                    <nav className="pdd-hero__steps" aria-label={pt ? 'Pokémon vizinhos' : 'Neighbouring Pokémon'}>
                        {prev ? (
                            <button type="button" className="pdd-step" onClick={() => goToNeighbor(prev)} aria-keyshortcuts="ArrowLeft">
                                <ChevronLeft aria-hidden="true" />
                                <span className="pdd-step__dex">{padDex(prev.id)}</span>
                                <span className="pdd-step__name">{cleanName(prev.name)}</span>
                            </button>
                        ) : <span />}
                        <kbd className="pdd-step__hint" aria-hidden="true">← →</kbd>
                        {next ? (
                            <button type="button" className="pdd-step pdd-step--next" onClick={() => goToNeighbor(next)} aria-keyshortcuts="ArrowRight">
                                <span className="pdd-step__name">{cleanName(next.name)}</span>
                                <span className="pdd-step__dex">{padDex(next.id)}</span>
                                <ChevronRight aria-hidden="true" />
                            </button>
                        ) : <span />}
                    </nav>
                )}
            </header>

            <div className="pdd-tabs-bar">
                <div className="tabs" role="tablist" aria-label="Pokédex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            id={`pdd-tab-${tab.key}`}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.key}
                            aria-controls="pdd-panel"
                            onClick={() => setActiveTab(tab.key)}
                            className="tabs__item"
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="pdd-body" id="pdd-panel" role="tabpanel" aria-labelledby={`pdd-tab-${activeTab}`}>
                {renderTab()}
            </div>
        </div>
    );
}
