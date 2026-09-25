import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Sparkles, Star, AlertCircle, MapPin, Compass,
    Footprints, Waves, Fish, Gift, Music, Hammer,
} from 'lucide-react';

import '../../styles/pokemon-detail-mobile.css';
import { typeColors } from '../../constants/types';
import { VERSION_CONFIG, formatTmName, formatVersionLabel } from '../../constants/pokemonVersions';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { Sprite } from '../Sprite';
import { TypeChip } from '../TypeChip';
import { StatBar } from '../StatBar';
import { AbilityChip } from '../AbilityChip';
import { useTranslation } from '../../hooks/useTranslation';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { usePokemonDetailData } from '../../hooks/usePokemonDetailData';
import { useSwipeDeck } from '../../hooks/useSwipeDeck';
import { usePokedexStore } from '../../store/usePokedexStore';
import { useReferenceStore } from '../../store/useReferenceStore';
import { getPokemonNeighbors } from '../../utils/pokemonNeighbors';
import { getPokemonArtworkSpriteUrl, getPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { SmogonCompetitivePanel } from './SmogonCompetitivePanel';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { Loader } from '../Loader';

const METHOD_ICON_MAP = {
    walk: Footprints, surf: Waves, 'old-rod': Fish, 'good-rod': Fish, 'super-rod': Fish,
    gift: Gift, headbutt: Compass, 'rock-smash': Hammer, pokeflute: Music,
};

// Damage tiers, worst first. Labels come from the caller so they translate.
const DEFENSE_TIERS = [4, 2, 0.5, 0.25, 0];

const MULTIPLIER_LABEL = { 4: '4×', 2: '2×', 0.5: '½×', 0.25: '¼×', 0: '0×' };

const cleanName = (name = '') => String(name).replace(/-/g, ' ');

/** The type-tinted backdrop every hero (real or peeked) shares. */
const heroTypeStyle = (types = []) => ({
    '--pdm-type-a': typeColors[types[0]] || 'var(--color-primary)',
    '--pdm-type-b': typeColors[types[1]] || typeColors[types[0]] || 'var(--color-primary)',
});

/* ── Building blocks ───────────────────────────────────────────────────────── */

/** A full-bleed band. No border, no radius: the fill is what groups it. */
function Section({ title, action, children, className = '' }) {
    return (
        <section className={`pdm-section ${className}`}>
            {(title || action) && (
                <div className="pdm-section__head">
                    {title && <h2 className="pdm-section__title">{title}</h2>}
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

/** Label/value row for the spec tables (Pokédex data, training, breeding). */
function Row({ label, value }) {
    return (
        <div className="pdm-kv">
            <dt className="pdm-kv__label">{label}</dt>
            <dd className="pdm-kv__value">{value}</dd>
        </div>
    );
}

/**
 * The neighbour sliding in from the edge during a swipe. Everything it shows
 * comes from the light index entry (id, name, types) — no fetch, so the peek is
 * instant and the real screen loads only once the swipe commits.
 */
function PeekHero({ entry, side }) {
    return (
        <div className={`pdm__peek pdm__peek--${side}`} aria-hidden="true">
            <div className="pdm__hero pdm__hero--peek" style={heroTypeStyle(entry.types)}>
                <p className="pdm__dex">#{String(entry.id).padStart(4, '0')}</p>
                <h2 className="pdm__name">{cleanName(entry.name)}</h2>
                <div className="pdm__types">
                    {(entry.types || []).map((type) => <TypeChip key={type} type={type} />)}
                </div>
                <Sprite
                    className="pdm__art"
                    src={getPokemonDisplaySprite(entry)}
                    artworkSrc={getPokemonArtworkSpriteUrl(entry.id)}
                    alt=""
                    eager
                />
            </div>
        </div>
    );
}

/* ── The screen ────────────────────────────────────────────────────────────── */

/**
 * The phone Pokédex entry: one dedicated screen per Pokémon, edge to edge, with
 * the list still under your thumb — swipe sideways and the next result in the
 * list you were browsing slides in.
 *
 * Desktop keeps PokemonDetailPanel; both read `usePokemonDetailData`, so this is
 * a layout, not a second copy of the Pokédex.
 */
export function MobilePokemonDetailView({
    pokemonId,
    indexEntry,
    favoritePokemons,
    onToggleFavoritePokemon,
    onNavigate,
    onBack,
    db,
    pokemonDetailsCache = {},
    setPokemonDetailsCache,
}) {
    const { t, language } = useTranslation();
    const pt = language === 'pt';
    const navigate = useNavigate();
    const location = useLocation();
    const { goToMove } = useEntityNavigate();

    const [activeTab, setActiveTab] = useState('data');

    const {
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
        formattedId,
        pokemonGenus,
        pokedexDescription,
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
    // in place — waiting for the full document to show a name is what made the
    // old screen feel like a page load rather than a card turning over.
    const identity = selectedPokemonDetails || indexEntry || { id: pokemonId, name: '', types: [] };
    const types = identity.types || [];
    const isFavorite = Boolean(favoritePokemons?.has?.(Number(identity.id)));
    const shinyBurst = useShinyBurst();
    const favoriteBurst = useShinyBurst();

    /* ── Carousel ─────────────────────────────────────────────────────────── */
    const browseSequence = usePokedexStore((s) => s.browseSequence);
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const { prev, next } = useMemo(
        () => getPokemonNeighbors(browseSequence, pokemonId, pokemonIndex),
        [browseSequence, pokemonId, pokemonIndex],
    );

    // A swipe REPLACES the history entry: browsing ten Pokémon sideways must
    // still leave "back" meaning the Pokédex, not nine presses of it. The
    // breadcrumb trail rides along untouched so the origin stays correct.
    const goToNeighbor = useCallback((entry, direction) => {
        if (!entry?.id) return;
        navigate(`/pokemon/${entry.id}`, {
            replace: true,
            state: { ...(location.state || {}), pdmDirection: direction },
        });
    }, [navigate, location.state]);

    const { rootRef, phase, isActive, handlers } = useSwipeDeck({
        hasPrev: Boolean(prev),
        hasNext: Boolean(next),
        onPrev: () => goToNeighbor(prev, 'prev'),
        onNext: () => goToNeighbor(next, 'next'),
    });

    // The app has one scroll container and it does not reset itself between
    // routes (2026-08-26 wound) — a new Pokémon opened from halfway down the
    // last one would start halfway down.
    useEffect(() => {
        document.querySelector('.app-shell__content')?.scrollTo({ top: 0 });
    }, [pokemonId]);

    const enterDirection = location.state?.pdmDirection;

    // Five tabs do not fit a 320px screen, so the strip scrolls. Centre the one
    // that was tapped: a half-visible tab at the edge is how the strip says it
    // has more, and the tap is the moment to show what is on either side.
    const handleTabClick = (key, event) => {
        setActiveTab(key);
        const tab = event.currentTarget;
        const strip = tab.parentElement;
        strip?.scrollTo({ left: tab.offsetLeft - (strip.clientWidth - tab.clientWidth) / 2, behavior: 'smooth' });
    };

    /* ── Tab content ──────────────────────────────────────────────────────── */
    const tabs = [
        { key: 'data', label: t('pokedex.dataTab') },
        { key: 'competitive', label: t('pokedex.competitiveTab') },
        { key: 'locations', label: t('pokedex.locationsTab') },
        { key: 'moves', label: t('pokedex.movesTab') },
        { key: 'sprites', label: t('pokedex.spritesTab') },
    ];

    const statTotal = (selectedPokemonDetails?.stats || []).reduce((sum, s) => sum + (s.base_stat || 0), 0);

    const defenseGroups = DEFENSE_TIERS
        .map((multiplier) => ({
            multiplier,
            types: Object.entries(typeDefenses).filter(([, m]) => m === multiplier).map(([name]) => name),
        }))
        .filter((group) => group.types.length > 0);

    const renderData = () => {
        if (!selectedPokemonDetails) return <Loading />;
        return (
            <>
                {pokedexDescription && (
                    <Section title={t('pokedex.pokedexEntry')}>
                        <p className="pdm-prose">{pokedexDescription}</p>
                    </Section>
                )}

                {selectedPokemonDetails.stats?.length > 0 && (
                    <Section
                        title={t('pokedex.baseStats')}
                        action={<span className="pdm-section__meta">{t('pokedex.statTotal')} {statTotal}</span>}
                    >
                        <div className="pdm-stats">
                            {selectedPokemonDetails.stats.map((stat) => (
                                <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} />
                            ))}
                        </div>
                    </Section>
                )}

                {defenseGroups.length > 0 && (
                    <Section title={t('pokedex.typeEffectivenessTitle')}>
                        <div className="pdm-defenses">
                            {defenseGroups.map((group) => (
                                <div key={group.multiplier} className="pdm-defense">
                                    <p className="pdm-defense__label">
                                        {group.multiplier > 1 ? t('pokedex.weakAgainst')
                                            : group.multiplier === 0 ? t('pokedex.immuneTo')
                                                : t('pokedex.resistantTo')}
                                        <span className="pdm-defense__mult">{MULTIPLIER_LABEL[group.multiplier]}</span>
                                    </p>
                                    <div className="pdm-pills">
                                        {group.types.map((type) => <TypeChip key={type} type={type} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {evolutionDetails.length > 1 && (
                    <Section title={t('pokedex.evolutionLine')}>
                        <div className="pdm-rail">
                            {evolutionDetails.map((evo) => (
                                <button
                                    key={evo.id || evo.name}
                                    type="button"
                                    onClick={() => onNavigate?.(evo.id)}
                                    className={`pdm-rail__item ${evo.id === selectedPokemonDetails.id ? 'is-current' : ''}`}
                                >
                                    <img src={evo.sprite || POKEBALL_PLACEHOLDER_URL} alt="" className="image-pixelated" />
                                    <span>{cleanName(evo.name)}</span>
                                </button>
                            ))}
                        </div>
                    </Section>
                )}

                {forms.length > 0 && (
                    <Section title={t('pokedex.formsAndMegas')}>
                        <div className="pdm-rail">
                            {forms.map((form) => (
                                <button
                                    key={form.id}
                                    type="button"
                                    onClick={() => onNavigate?.(form.id)}
                                    className={`pdm-rail__item ${form.id === selectedPokemonDetails.id ? 'is-current' : ''}`}
                                >
                                    <img src={form.sprite || POKEBALL_PLACEHOLDER_URL} alt="" className="image-pixelated" />
                                    <span>{form.displayName}</span>
                                </button>
                            ))}
                        </div>
                    </Section>
                )}

                <Section title={t('pokedex.pokedexData')}>
                    <dl className="pdm-table">
                        <Row label={t('pokedex.nationalId')} value={<span className="pdm-mono">#{formattedId || '----'}</span>} />
                        <Row label={t('pokedex.species')} value={pokemonGenus || t('common.loading')} />
                        <Row label={t('pokedex.height')} value={<span className="pdm-mono">{heightInM ? `${heightInM} m` : '—'}{heightInFt ? ` (${heightInFt})` : ''}</span>} />
                        <Row label={t('pokedex.weight')} value={<span className="pdm-mono">{weightInKg ? `${weightInKg} kg` : '—'}{weightInLbs ? ` (${weightInLbs} lbs)` : ''}</span>} />
                        <Row
                            label={t('pokedex.abilities')}
                            value={(
                                <span className="pdm-abilities">
                                    {(selectedPokemonDetails.abilities || []).map((ability, index) => (
                                        <span key={index} className="pdm-ability">
                                            <AbilityChip ability={ability} />
                                            {ability.is_hidden && <em>{t('pokedex.hiddenShort')}</em>}
                                        </span>
                                    ))}
                                </span>
                            )}
                        />
                    </dl>
                </Section>

                <Section title={t('pokedex.training')}>
                    <dl className="pdm-table">
                        <Row label={t('pokedex.evYield')} value={evYield} />
                        <Row label={t('pokedex.catchRate')} value={catchRateText || '—'} />
                        <Row label={t('pokedex.baseFriendship')} value={baseFriendshipText || '—'} />
                        <Row label={t('pokedex.baseExp')} value={<span className="pdm-mono">{fullApiData?.base_experience ?? '—'}</span>} />
                        <Row label={t('pokedex.growthRate')} value={growthRateText || '—'} />
                    </dl>
                </Section>

                <Section title={t('pokedex.breeding')}>
                    <dl className="pdm-table">
                        <Row label={t('pokedex.eggGroups')} value={<span className="pdm-capitalize">{eggGroups}</span>} />
                        <Row label={t('pokedex.genderRatio')} value={genderText || '—'} />
                        <Row label={t('pokedex.eggCycles')} value={eggCyclesText || '—'} />
                    </dl>
                </Section>
            </>
        );
    };

    const renderLocations = () => {
        if (isEncountersLoading) return <Loading />;
        if (filteredGroupedEncounters.length === 0) {
            return <Empty title={t('pokedex.locationsEmptyTitle')} message={t('pokedex.locationsEmpty')} />;
        }
        return (
            <>
                {availableVersions.length > 0 && (
                    <Section title={t('pokedex.locationsVersionFilter')}>
                        <select
                            value={locationsVersionFilter}
                            onChange={(event) => setLocationsVersionFilter(event.target.value)}
                            className="pdm-select"
                            aria-label={t('pokedex.locationsVersionFilter')}
                        >
                            <option value="all">{t('pokedex.locationsAllVersions')}</option>
                            {availableVersions.map((version) => (
                                <option key={version} value={version}>{formatVersionLabel(version)}</option>
                            ))}
                        </select>
                    </Section>
                )}

                {filteredGroupedEncounters.map((group) => (
                    <Section key={group.id} title={group.name}>
                        <div className="pdm-locations">
                            {group.locations.map((place) => (
                                <div key={place.location} className="pdm-location">
                                    <p className="pdm-location__name">
                                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                                        {place.location}
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
                                                <div key={`${version.name}-${index}`} className="pdm-encounter">
                                                    <span className="pdm-encounter__version" style={{ '--pdm-pill': config.color }}>{config.label}</span>
                                                    <span className="pdm-encounter__method">
                                                        <MethodIcon className="w-3.5 h-3.5" aria-hidden="true" />
                                                        <span className="pdm-capitalize">{detail.method}</span>
                                                    </span>
                                                    <span className="pdm-encounter__meta pdm-mono">
                                                        {detail.minLevel === detail.maxLevel ? `Lv ${detail.minLevel}` : `Lv ${detail.minLevel}-${detail.maxLevel}`}
                                                        <b>{detail.chance}%</b>
                                                    </span>
                                                </div>
                                            );
                                        });
                                    })}
                                </div>
                            ))}
                        </div>
                    </Section>
                ))}
            </>
        );
    };

    const renderMoves = () => {
        if (isMovesLoading) return <Loading />;
        const blocks = [
            { key: 'levelUp', title: t('pokedex.movesLevelUp'), rows: resolvedMoves.levelUp },
            { key: 'machine', title: t('pokedex.movesMachine'), rows: resolvedMoves.machine },
            { key: 'other', title: t('pokedex.movesOther'), rows: resolvedMoves.other || [] },
        ].filter((block) => block.rows.length > 0);

        return (
            <>
                {availableMoveVersions.length > 0 && (
                    <Section title={t('pokedex.movesVersionFilter')}>
                        <select
                            value={selectedMoveVersion}
                            onChange={(event) => setSelectedMoveVersion(event.target.value)}
                            className="pdm-select"
                            aria-label={t('pokedex.movesVersionFilter')}
                        >
                            {availableMoveVersions.map((version) => (
                                <option key={version} value={version}>{formatVersionLabel(version)}</option>
                            ))}
                        </select>
                    </Section>
                )}

                {blocks.length === 0
                    ? <Empty title={t('pokedex.movesEmptyTitle')} message={t('pokedex.movesEmpty')} />
                    : blocks.map((block) => (
                        <Section key={block.key} title={block.title}>
                            <div className="pdm-moves">
                                {block.rows.map((move, index) => (
                                    <button
                                        key={`${move.name}-${index}`}
                                        type="button"
                                        className="pdm-move"
                                        onClick={(event) => goToMove(move.name, event)}
                                    >
                                        <span className="pdm-move__slot pdm-mono">
                                            {block.key === 'levelUp' ? move.level
                                                : block.key === 'machine' ? (move.tmName ? formatTmName(move.tmName) : '—')
                                                    : cleanName(move.learnMethod || '—')}
                                        </span>
                                        <span className="pdm-move__body">
                                            <span className="pdm-move__name">{cleanName(move.name)}</span>
                                            <span className="pdm-move__stats pdm-mono">
                                                {t('pokedex.movesHeaderPower')} {move.power ?? '—'}
                                                {' · '}{t('pokedex.movesHeaderAcc')} {move.accuracy ? `${move.accuracy}%` : '—'}
                                                {move.pp ? ` · ${t('pokedex.movesHeaderPp')} ${move.pp}` : ''}
                                            </span>
                                        </span>
                                        <TypeChip type={move.type} size="sm" />
                                    </button>
                                ))}
                            </div>
                        </Section>
                    ))}
            </>
        );
    };

    const renderSprites = () => {
        if (pokemonGenerationSprites.length === 0) {
            return <Empty title={t('pokedex.spritesEmptyTitle')} message={t('pokedex.spritesEmpty')} />;
        }
        return (
            <Section title={t('pokedex.spritesTitle')}>
                <div className="pdm-sprites">
                    {pokemonGenerationSprites.map((generation) => (
                        <div key={generation.name} className="pdm-sprite">
                            <p className="pdm-sprite__label">{generation.name}</p>
                            <div className="pdm-sprite__row">
                                {[{ url: generation.normal, tag: 'Normal' }, { url: generation.shiny, tag: 'Shiny' }]
                                    .filter((variant) => variant.url)
                                    .map((variant) => (
                                        <button
                                            key={variant.tag}
                                            type="button"
                                            onClick={() => setCustomSelectedSprite(variant.url)}
                                            className={`pdm-sprite__pick ${customSelectedSprite === variant.url ? 'is-active' : ''}`}
                                        >
                                            <img src={variant.url} alt={`${identity.name} ${generation.name} ${variant.tag}`} className="image-pixelated" />
                                            <span>{variant.tag}</span>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Section>
        );
    };

    const renderTab = () => {
        if (activeTab === 'competitive') return <div className="pdm-competitive"><SmogonCompetitivePanel pokemonId={identity.id} /></div>;
        if (activeTab === 'locations') return renderLocations();
        if (activeTab === 'moves') return renderMoves();
        if (activeTab === 'sprites') return renderSprites();
        return renderData();
    };

    return (
        <div
            ref={rootRef}
            className="pdm"
            data-phase={phase}
            {...handlers}
        >
            {isActive && prev && <PeekHero entry={prev} side="prev" />}
            {isActive && next && <PeekHero entry={next} side="next" />}

            <div className={`pdm__screen ${enterDirection ? `pdm__screen--from-${enterDirection}` : ''}`}>
                <header className="pdm__hero" style={heroTypeStyle(types)}>
                    <div className="pdm__bar">
                        <button type="button" onClick={onBack} className="pdm__iconbtn" aria-label={pt ? 'Voltar' : 'Back'}>
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="pdm__bar-actions">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!showShiny) shinyBurst.fire();
                                    setShowShiny((value) => !value);
                                }}
                                className={`pdm__iconbtn ${showShiny ? 'is-active' : ''} ${shinyBurst.isBursting ? 'is-bursting' : ''}`}
                                aria-pressed={showShiny}
                                aria-label={t('pokedex.toggleShiny')}
                            >
                                <Sparkles className="w-5 h-5" />
                                {shinyBurst.burst}
                            </button>
                            {onToggleFavoritePokemon && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!isFavorite) favoriteBurst.fire();
                                        onToggleFavoritePokemon(Number(identity.id));
                                    }}
                                    className={`pdm__iconbtn ${isFavorite ? 'is-active' : ''} ${favoriteBurst.isBursting ? 'is-bursting' : ''}`}
                                    aria-pressed={isFavorite}
                                    aria-label={isFavorite ? t('common.remove') : t('pokedex.addFavorite')}
                                >
                                    <Star className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />
                                    {favoriteBurst.burst}
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="pdm__dex">#{String(identity.id).padStart(4, '0')}</p>
                    <h1 className="pdm__name">{cleanName(identity.name)}</h1>
                    {pokemonGenus && <p className="pdm__genus">{pokemonGenus}</p>}
                    <div className="pdm__types">
                        {types.map((type) => <TypeChip key={type} type={type} />)}
                    </div>

                    <div className="pdm__stage">
                        <button
                            type="button"
                            className="pdm__step"
                            onClick={() => goToNeighbor(prev, 'prev')}
                            disabled={!prev}
                            aria-label={prev ? `${t('pokedex.previousPokemon')}: ${cleanName(prev.name)}` : t('pokedex.previousPokemon')}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <Sprite
                            className="pdm__art"
                            src={spriteToShow}
                            artworkSrc={getPokemonArtworkSpriteUrl(identity.id, { shiny: showShiny })}
                            alt={cleanName(identity.name)}
                            eager
                            heroTarget
                        />
                        <button
                            type="button"
                            className="pdm__step"
                            onClick={() => goToNeighbor(next, 'next')}
                            disabled={!next}
                            aria-label={next ? `${t('pokedex.nextPokemon')}: ${cleanName(next.name)}` : t('pokedex.nextPokemon')}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <nav className="pdm__tabs" role="tablist" aria-label="Pokédex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            id={`pdm-tab-${tab.key}`}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.key}
                            aria-controls="pdm-panel"
                            onClick={(event) => handleTabClick(tab.key, event)}
                            className={`pdm__tab ${activeTab === tab.key ? 'is-active' : ''}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="pdm__body" id="pdm-panel" role="tabpanel" aria-labelledby={`pdm-tab-${activeTab}`}>
                    {renderTab()}
                </div>
            </div>
        </div>
    );
}

function Loading() {
    return (
        <div className="pdm-loading">
            <Loader />
        </div>
    );
}

function Empty({ title, message }) {
    return (
        <div className="pdm-empty">
            <AlertCircle className="w-8 h-8" aria-hidden="true" />
            <p className="pdm-empty__title">{title}</p>
            <p className="pdm-empty__message">{message}</p>
        </div>
    );
}
