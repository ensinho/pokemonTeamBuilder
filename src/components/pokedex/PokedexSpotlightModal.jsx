import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, Plus, Sparkles, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { TypeChip } from '../TypeChip';
import { StarIcon } from '../icons';
import { typeChart, typeColors, typeIcons } from '../../constants/types';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { resolvePokemonDetail } from '../../services/pokemonDataCache';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { toast } from '../../store/useToastStore';
import { pretty } from '../../utils/metaFormat';

const STAT_META = [
    { key: 'hp', short: 'HP' },
    { key: 'attack', short: 'Atk' },
    { key: 'defense', short: 'Def' },
    { key: 'special-attack', short: 'SpA' },
    { key: 'special-defense', short: 'SpD' },
    { key: 'speed', short: 'Spe' },
];

const ALL_TYPES = Object.keys(typeChart);

function normalizeStats(pokemon, detail) {
    if (Array.isArray(detail?.stats) && detail.stats.length > 0) {
        const byKey = new Map(detail.stats.map((s) => [s.name, Number(s.base_stat) || 0]));
        return STAT_META.map((m) => ({ ...m, value: byKey.get(m.key) ?? 0 }));
    }
    const base = pokemon?.baseStats;
    if (base && typeof base === 'object') {
        const hasAny = STAT_META.some((m) => Number.isFinite(Number(base[m.key])));
        if (hasAny) {
            return STAT_META.map((m) => ({ ...m, value: Number(base[m.key]) || 0 }));
        }
    }
    return null;
}

function computeWeaknesses(types = []) {
    if (!types.length) return [];
    const weaknesses = [];
    for (const attackType of ALL_TYPES) {
        const attackKey = attackType.charAt(0).toUpperCase() + attackType.slice(1);
        let mult = 1;
        for (const defType of types) {
            const chart = typeChart[defType];
            const mod = chart?.damageTaken?.[attackKey];
            if (mod !== undefined) mult *= mod;
        }
        if (mult >= 2) weaknesses.push({ type: attackType, mult });
    }
    weaknesses.sort((a, b) => b.mult - a.mult);
    return weaknesses;
}

/**
 * Split Quick-Peek Spotlight modal for the desktop Pokédex.
 * Plain click on a desktop Pokédex card opens this modal; stepping with ←/→ walks
 * the currently filtered list without leaving the Pokédex.
 */
export function PokedexSpotlightModal({
    pokemon,
    list = [],
    onSelectPokemon,
    onClose,
    isFavorite,
    onToggleFavorite,
    fromPath = '/pokedex',
}) {
    const { t } = useTranslation();
    const dialogRef = useModalA11y(onClose);
    const shinyBurst = useShinyBurst();
    const favBurst = useShinyBurst();

    const teamLength = useActiveTeamStore((s) => s.currentTeam.length);
    const [isShiny, setIsShiny] = useState(false);
    const [detailState, setDetailState] = useState({ id: null, data: null, loading: false });

    const currentIndex = useMemo(
        () => (pokemon ? list.findIndex((entry) => entry.id === pokemon.id) : -1),
        [list, pokemon],
    );
    const prevPokemon = currentIndex > 0 ? list[currentIndex - 1] : null;
    const nextPokemon = currentIndex >= 0 && currentIndex < list.length - 1 ? list[currentIndex + 1] : null;

    // Reset shiny toggle when changing Pokémon so each entry opens in canonical palette.
    useEffect(() => {
        setIsShiny(false);
    }, [pokemon?.id]);

    // Lazy-load full detail via pokemonDataCache (zero raw fetch).
    useEffect(() => {
        if (!pokemon?.id) return undefined;
        let cancelled = false;
        setDetailState({ id: pokemon.id, data: null, loading: true });

        resolvePokemonDetail(pokemon.id)
            .then((resolved) => {
                if (!cancelled) {
                    setDetailState({ id: pokemon.id, data: resolved, loading: false });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setDetailState({ id: pokemon.id, data: null, loading: false });
                }
            });

        return () => { cancelled = true; };
    }, [pokemon?.id]);

    // ArrowLeft / ArrowRight steps through the filtered list.
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            if (event.key === 'ArrowLeft' && prevPokemon) {
                event.preventDefault();
                onSelectPokemon(prevPokemon);
            } else if (event.key === 'ArrowRight' && nextPokemon) {
                event.preventDefault();
                onSelectPokemon(nextPokemon);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [prevPokemon, nextPokemon, onSelectPokemon]);

    const detail = detailState.id === pokemon?.id ? detailState.data : null;
    const isLoadingDetail = detailState.id === pokemon?.id && detailState.loading;

    const types = useMemo(
        () => (detail?.types?.length ? detail.types : pokemon?.types || []),
        [detail, pokemon],
    );
    const stats = useMemo(() => normalizeStats(pokemon, detail), [pokemon, detail]);
    const weaknesses = useMemo(() => computeWeaknesses(types), [types]);

    if (!pokemon || typeof document === 'undefined') return null;

    const primaryType = types[0];
    const cardTone = primaryType ? typeColors[primaryType] : null;
    const displayName = pretty(pokemon.name);

    const bst = stats ? stats.reduce((sum, s) => sum + s.value, 0) : null;
    const peakStatValue = stats ? Math.max(...stats.map((s) => s.value)) : 0;
    const atkStat = stats?.find((s) => s.key === 'attack');
    const spaStat = stats?.find((s) => s.key === 'special-attack');
    const speStat = stats?.find((s) => s.key === 'speed');
    const bestOffense = atkStat && spaStat
        ? (spaStat.value > atkStat.value ? spaStat : atkStat)
        : null;

    const isTeamFull = teamLength >= 6;
    const artworkSrc = getPokemonArtworkSpriteUrl(pokemon.id, { shiny: isShiny });

    const handleAddToTeam = () => {
        const store = useActiveTeamStore.getState();
        const beforeCount = store.currentTeam.length;
        const payload = detail ? { ...pokemon, ...detail } : pokemon;
        store.handleAddPokemon(payload);
        const afterCount = useActiveTeamStore.getState().currentTeam.length;
        if (afterCount > beforeCount) {
            toast.success(t('markedUi.pokedex.spotlightAdded', { name: displayName }));
        }
    };

    const handleToggleShiny = () => {
        if (!isShiny) shinyBurst.fire();
        setIsShiny((prev) => !prev);
    };

    const handleFavoriteClick = () => {
        if (!isFavorite) favBurst.fire();
        onToggleFavorite(pokemon.id);
    };

    return createPortal(
        <div
            className="modal-scrim"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="pokedex-spotlight-title"
                tabIndex={-1}
                className="modal-panel pokedex-spotlight"
                style={cardTone ? { '--card-type': cardTone } : undefined}
            >
                <div className="pokedex-spotlight__stage">
                    <div className="pokedex-spotlight__stage-top">
                        <span className="pokedex-spotlight__dex figure">
                            #{String(pokemon.id).padStart(4, '0')}
                        </span>
                        <button
                            type="button"
                            onClick={handleToggleShiny}
                            aria-pressed={isShiny}
                            className={`pokedex-spotlight__shiny ${isShiny ? 'is-active' : ''} ${shinyBurst.isBursting ? 'is-bursting' : ''}`}
                        >
                            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{t('markedUi.pokedex.spotlightShiny')}</span>
                            {shinyBurst.burst}
                        </button>
                    </div>

                    <div className="pokedex-spotlight__art-wrap">
                        <img
                            key={`${pokemon.id}-${isShiny ? 'shiny' : 'std'}`}
                            src={artworkSrc}
                            alt={displayName}
                            width={240}
                            height={240}
                            decoding="async"
                            className="pokedex-spotlight__art"
                            onError={(event) => {
                                const fallback = getPokemonFrontSpriteUrl(pokemon.id, { shiny: isShiny });
                                if (event.currentTarget.src !== fallback) {
                                    event.currentTarget.src = fallback;
                                } else {
                                    event.currentTarget.src = POKEBALL_PLACEHOLDER_URL;
                                }
                            }}
                        />
                    </div>

                    <div className="pokedex-spotlight__nav">
                        <button
                            type="button"
                            onClick={() => prevPokemon && onSelectPokemon(prevPokemon)}
                            disabled={!prevPokemon}
                            aria-label={t('markedUi.pokedex.spotlightPrev')}
                            className="btn btn-secondary btn-sm btn-icon pokedex-spotlight__nav-btn"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                        {currentIndex >= 0 && list.length > 0 && (
                            <span className="pokedex-spotlight__pos figure">
                                {currentIndex + 1} / {list.length}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => nextPokemon && onSelectPokemon(nextPokemon)}
                            disabled={!nextPokemon}
                            aria-label={t('markedUi.pokedex.spotlightNext')}
                            className="btn btn-secondary btn-sm btn-icon pokedex-spotlight__nav-btn"
                        >
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <div className="pokedex-spotlight__body">
                    <div className="pokedex-spotlight__head">
                        <div className="pokedex-spotlight__identity">
                            <div className="pokedex-spotlight__types">
                                {types.map((tp) => (
                                    <TypeChip key={tp} type={tp} size="sm" />
                                ))}
                            </div>
                            <h2 id="pokedex-spotlight-title" className="pokedex-spotlight__name">
                                {displayName}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={t('markedUi.pokedex.spotlightClose')}
                            className="modal-close"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>

                    {stats ? (
                        <>
                            <dl className="pokedex-spotlight__metrics">
                                <div className="pokedex-spotlight__metric">
                                    <dt className="pokedex-spotlight__metric-label">{t('markedUi.pokedex.spotlightBst')}</dt>
                                    <dd className="pokedex-spotlight__metric-val figure">{bst}</dd>
                                </div>
                                {bestOffense && (
                                    <div className="pokedex-spotlight__metric">
                                        <dt className="pokedex-spotlight__metric-label">{bestOffense.short}</dt>
                                        <dd className={`pokedex-spotlight__metric-val figure ${bestOffense.value === peakStatValue ? 'is-peak' : ''}`}>
                                            {bestOffense.value}
                                        </dd>
                                    </div>
                                )}
                                {speStat && (
                                    <div className="pokedex-spotlight__metric">
                                        <dt className="pokedex-spotlight__metric-label">{speStat.short}</dt>
                                        <dd className={`pokedex-spotlight__metric-val figure ${speStat.value === peakStatValue ? 'is-peak' : ''}`}>
                                            {speStat.value}
                                        </dd>
                                    </div>
                                )}
                            </dl>

                            <ul className="pokedex-spotlight__stats">
                                {stats.map((stat) => {
                                    const isPeak = stat.value === peakStatValue && peakStatValue > 0;
                                    const widthPct = Math.min(100, Math.max(4, Math.round((stat.value / 200) * 100)));
                                    return (
                                        <li key={stat.key} className="pokedex-spotlight__stat-row">
                                            <span className="pokedex-spotlight__stat-name">{stat.short}</span>
                                            <span className={`pokedex-spotlight__stat-val figure ${isPeak ? 'is-peak' : ''}`}>
                                                {stat.value}
                                            </span>
                                            <span className="pokedex-spotlight__stat-track" aria-hidden="true">
                                                <span
                                                    className={`pokedex-spotlight__stat-fill ${isPeak ? 'is-peak' : ''}`}
                                                    style={{ width: `${widthPct}%` }}
                                                />
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    ) : isLoadingDetail ? (
                        <p className="pokedex-spotlight__loading">{t('markedUi.pokedex.spotlightLoading')}</p>
                    ) : null}

                    {weaknesses.length > 0 && (
                        <div className="pokedex-spotlight__weak">
                            <span className="pokedex-spotlight__weak-label">
                                {t('markedUi.pokedex.spotlightWeakTo')}
                            </span>
                            <div className="pokedex-spotlight__weak-list">
                                {weaknesses.slice(0, 6).map(({ type, mult }) => (
                                    <span
                                        key={type}
                                        className="pokedex-spotlight__weak-chip"
                                        style={{ '--type-chip': typeColors[type] }}
                                        title={`${t(`types.${type}`, { defaultValue: type })} ×${mult}`}
                                    >
                                        {typeIcons[type] && (
                                            <img src={typeIcons[type]} alt="" aria-hidden="true" className="pokedex-spotlight__weak-icon" />
                                        )}
                                        <span className="figure">{mult}×</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pokedex-spotlight__actions">
                        <button
                            type="button"
                            onClick={handleAddToTeam}
                            className="btn btn-primary pokedex-spotlight__add"
                        >
                            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="btn__label">
                                {isTeamFull
                                    ? t('markedUi.pokedex.spotlightTeamFull')
                                    : t('markedUi.pokedex.spotlightAddTeam')}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={handleFavoriteClick}
                            aria-pressed={isFavorite}
                            aria-label={t(isFavorite ? 'pokedex.removeFavoriteAria' : 'pokedex.addFavoriteAria', { name: displayName })}
                            title={t(isFavorite ? 'pokedex.removeFavoriteAria' : 'pokedex.addFavoriteAria', { name: displayName })}
                            className={`btn btn-secondary btn-icon pokedex-spotlight__fav ${isFavorite ? 'is-active' : ''} ${favBurst.isBursting ? 'is-bursting' : ''}`}
                        >
                            <StarIcon className="h-4 w-4" isFavorite={isFavorite} color="currentColor" />
                            {favBurst.burst}
                        </button>

                        <Link
                            to={`/pokemon/${pokemon.id}`}
                            state={{ from: fromPath }}
                            onClick={onClose}
                            aria-label={t('markedUi.pokedex.spotlightOpenFull')}
                            title={t('markedUi.pokedex.spotlightOpenFull')}
                            className="btn btn-secondary btn-icon pokedex-spotlight__open"
                        >
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
