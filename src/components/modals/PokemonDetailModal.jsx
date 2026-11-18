import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { Check, ChevronRight, Plus, Sparkles, Star, X } from 'lucide-react';

import '../../styles/pokemon-detail-view.css';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeChart, typeColors } from '../../constants/types';
import { getPokemonArtworkSpriteUrl, sanitizeSpriteUrl } from '../../utils/pokemonSprites';
import {
    getEvolutionChainData,
    getPokemonApiData,
    getPokemonSpeciesData,
    getStaticPokemonDetail,
} from '../../services/pokemonDataCache';
import { buildPokemonForms } from '../../utils/pokemonForms';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { useMostUsedBuild } from '../../hooks/useMostUsedBuild';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { useTranslation } from '../../hooks/useTranslation';
import { AbilityChip } from '../AbilityChip';
import { Loader } from '../Loader';
import { Sprite } from '../Sprite';
import { StatBar } from '../StatBar';
import { TypeChip } from '../TypeChip';

const ALL_TYPES = Object.keys(typeChart);
const DEFENSE_TIERS = [4, 2, 0.5, 0.25, 0];
const MULTIPLIER_LABEL = { 4: '4×', 2: '2×', 0.5: '½×', 0.25: '¼×', 0: '0×' };

const toChartKey = (type) => type.charAt(0).toUpperCase() + type.slice(1);
const cleanName = (name = '') => String(name).replace(/-/g, ' ');
const padDex = (id) => (id ? `#${String(id).padStart(4, '0')}` : '');

const heroTypeStyle = (types = []) => ({
    '--pdd-type-a': typeColors[types[0]] || 'var(--color-primary)',
    '--pdd-type-b': typeColors[types[1]] || typeColors[types[0]] || 'var(--color-primary)',
});

function computeTypeDefenses(defendingTypes = []) {
    const result = {};
    ALL_TYPES.forEach((attackType) => {
        result[attackType] = defendingTypes.reduce(
            (product, defType) => product * (typeChart[defType]?.damageTaken?.[toChartKey(attackType)] ?? 1),
            1,
        );
    });
    return result;
}

export function PokemonDetailModal({
    pokemon,
    onClose,
    onAdd,
    currentTeam = [],
    showPokemonDetails,
    db,
    pokemonDetailsCache = {},
    setPokemonDetailsCache,
    isFavorite,
    onToggleFavorite,
}) {
    const { t } = useTranslation();
    const dialogRef = useModalA11y(onClose);
    const navigate = useNavigate();
    const { linkState } = useEntityNavigate();
    const shinyBurst = useShinyBurst();
    const favoriteBurst = useShinyBurst();

    const [showShiny, setShowShiny] = useState(false);
    const [evolutionDetails, setEvolutionDetails] = useState([]);
    const [forms, setForms] = useState([]);
    const [selectedFormId, setSelectedFormId] = useState(null);
    const [selectedFormDetail, setSelectedFormDetail] = useState(null);

    const build = useMostUsedBuild(pokemon?.id);

    useEffect(() => {
        if (!pokemon || !pokemon.evolution_chain_url) {
            setEvolutionDetails([]);
            return undefined;
        }

        let cancelled = false;

        const fetchEvolutionChain = async () => {
            try {
                const data = await getEvolutionChainData(pokemon.evolution_chain_url);
                const chain = [];
                let evoData = data.chain;
                do {
                    chain.push({
                        name: evoData.species.name,
                        url: evoData.species.url,
                    });
                    evoData = evoData.evolves_to[0];
                } while (!!evoData && Object.prototype.hasOwnProperty.call(evoData, 'evolves_to'));

                const detailsPromises = chain.map(async (evo) => {
                    const rawId = evo.url.split('/').filter(Boolean).pop();
                    const numericId = Number.parseInt(rawId, 10) || undefined;
                    if (pokemonDetailsCache[rawId]) {
                        return { id: numericId, ...pokemonDetailsCache[rawId] };
                    }

                    const staticDetail = await getStaticPokemonDetail(rawId);
                    if (staticDetail) {
                        setPokemonDetailsCache?.((prev) => ({ ...prev, [rawId]: staticDetail }));
                        return { id: numericId, ...staticDetail };
                    }

                    if (!db) return { id: numericId, name: evo.name, sprite: POKEBALL_PLACEHOLDER_URL };

                    const docSnap = await getDoc(doc(db, 'artifacts/pokemonTeamBuilder/pokemons', rawId)).catch(() => null);
                    if (docSnap?.exists()) {
                        const detail = docSnap.data();
                        setPokemonDetailsCache?.((prev) => ({ ...prev, [rawId]: detail }));
                        return { id: numericId, ...detail };
                    }

                    return { id: numericId, name: evo.name, sprite: POKEBALL_PLACEHOLDER_URL };
                });

                const resolvedDetails = await Promise.all(detailsPromises);
                if (!cancelled) {
                    setEvolutionDetails(resolvedDetails);
                }
            } catch (error) {
                console.error('Failed to fetch evolution chain', error);
            }
        };

        fetchEvolutionChain();

        return () => {
            cancelled = true;
        };
    }, [pokemon, db, pokemonDetailsCache, setPokemonDetailsCache]);

    // Fetch alternate forms / megas
    useEffect(() => {
        setForms([]);
        setSelectedFormId(null);
        setSelectedFormDetail(null);
        if (!pokemon?.id) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const apiData = await getPokemonApiData(pokemon.id);
                if (cancelled) return;
                const species = await getPokemonSpeciesData(apiData?.species?.url || pokemon.id);
                if (cancelled || !species?.varieties?.length) return;
                const built = await buildPokemonForms(species, { fetchPokemon: getPokemonApiData });
                if (!cancelled) setForms(built.filter((form) => form.id !== Number(pokemon.id)));
            } catch (err) {
                console.error('Failed to load pokémon forms', err);
            }
        })();
        return () => { cancelled = true; };
    }, [pokemon?.id]);

    // Resolve stats + abilities for a chosen form from the already-warm cache so
    // the scene answers the form selection live.
    useEffect(() => {
        setSelectedFormDetail(null);
        if (!selectedFormId) return undefined;
        let cancelled = false;
        getPokemonApiData(selectedFormId)
            .then((apiData) => {
                if (cancelled || !apiData) return;
                setSelectedFormDetail({
                    stats: apiData.stats?.map((s) => ({ name: s.stat?.name, base_stat: s.base_stat })).filter((s) => s.name) || [],
                    abilities: apiData.abilities?.map((a) => ({ name: a.ability?.name, url: a.ability?.url, is_hidden: a.is_hidden })).filter((a) => a.name) || [],
                });
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [selectedFormId]);

    const selectedForm = useMemo(
        () => forms.find((f) => f.id === selectedFormId) || null,
        [forms, selectedFormId],
    );

    const activeTypes = useMemo(
        () => (selectedForm?.types?.length ? selectedForm.types : (pokemon?.types || [])),
        [selectedForm, pokemon],
    );

    const typeDefenses = useMemo(() => computeTypeDefenses(activeTypes), [activeTypes]);

    if (!pokemon) return null;

    const entityToAdd = selectedForm
        ? { id: selectedForm.id, name: selectedForm.name, types: selectedForm.types, sprite: selectedForm.sprite }
        : pokemon;

    const isEntityOnTeam = currentTeam.some((member) => Number(member.id) === Number(entityToAdd.id));
    const isTeamFull = currentTeam.length >= 6;

    const fallbackSprite = sanitizeSpriteUrl(
        showShiny
            ? (pokemon.animatedShinySprite || pokemon.shinySprite || pokemon.sprite)
            : (pokemon.animatedSprite || pokemon.sprite),
    );
    const activeId = selectedForm?.id || pokemon.id;
    const heroArtworkSrc = getPokemonArtworkSpriteUrl(activeId, { shiny: showShiny });
    const heroFallbackSrc = selectedForm?.sprite ? sanitizeSpriteUrl(selectedForm.sprite) : fallbackSprite;
    const activeDisplayName = selectedForm ? selectedForm.displayName : cleanName(pokemon.name);

    const stats = selectedFormDetail?.stats?.length ? selectedFormDetail.stats : (pokemon.stats || []);
    const statTotal = stats.reduce((sum, s) => sum + (s.base_stat || 0), 0);
    const peakStat = stats.length ? Math.max(...stats.map((s) => s.base_stat || 0)) : 0;

    const abilities = selectedFormDetail?.abilities?.length ? selectedFormDetail.abilities : (pokemon.abilities || []);

    const defenseGroups = DEFENSE_TIERS
        .map((multiplier) => ({
            multiplier,
            types: Object.entries(typeDefenses).filter(([, m]) => m === multiplier).map(([name]) => name),
        }))
        .filter((group) => group.types.length > 0);
    const neutralTypes = Object.entries(typeDefenses).filter(([, m]) => m === 1).map(([name]) => name);

    const handleSelectEvolution = (evo) => {
        onClose();
        if (showPokemonDetails) {
            showPokemonDetails(evo);
        } else if (evo.id || evo.name) {
            navigate(`/pokemon/${evo.id || evo.name}`, { state: linkState });
        }
    };

    return (
        <div className="modal-scrim" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="pokemon-detail-title"
                tabIndex={-1}
                className="modal-panel modal-panel--xl pdd-modal"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="pdd-modal__hero" style={heroTypeStyle(activeTypes)}>
                    <div className="pdd-modal__bar">
                        <p className="pdd-modal__dex">{padDex(pokemon.id)}</p>
                        <div className="pdd-hero__actions">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!showShiny) shinyBurst.fire();
                                    setShowShiny((value) => !value);
                                }}
                                className={`pdd-iconbtn ${showShiny ? 'is-active' : ''} ${shinyBurst.isBursting ? 'is-bursting' : ''}`}
                                aria-pressed={showShiny}
                                aria-label={t('modals.pokedexToggleShinyAria')}
                                title={t('modals.pokedexToggleShinyAria')}
                            >
                                <Sparkles aria-hidden="true" />
                                {shinyBurst.burst}
                            </button>
                            {onToggleFavorite && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!isFavorite) favoriteBurst.fire();
                                        onToggleFavorite(pokemon.id);
                                    }}
                                    className={`pdd-iconbtn ${isFavorite ? 'is-active' : ''} ${favoriteBurst.isBursting ? 'is-bursting' : ''}`}
                                    aria-pressed={Boolean(isFavorite)}
                                    aria-label={isFavorite ? t('modals.pokedexRemoveFromFavoritesAria') : t('modals.pokedexAddToFavoritesAria')}
                                    title={isFavorite ? t('modals.pokedexRemoveFromFavoritesAria') : t('modals.pokedexAddToFavoritesAria')}
                                >
                                    <Star aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
                                    {favoriteBurst.burst}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label={t('modals.pokedexCloseDetailsAria', { name: cleanName(pokemon.name) })}
                                className="pdd-iconbtn"
                            >
                                <X aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                    <div className="pdd-modal__lead">
                        <div className="pdd-modal__stage">
                            <Sprite
                                key={`${activeId}-${showShiny}`}
                                className="pdd-modal__art"
                                src={heroArtworkSrc}
                                artworkSrc={heroFallbackSrc || POKEBALL_PLACEHOLDER_URL}
                                alt={activeDisplayName}
                                eager
                            />
                        </div>

                        <div className="pdd-modal__identity">
                            <h2 id="pokemon-detail-title" className="pdd-modal__name">
                                {activeDisplayName}
                            </h2>
                            {build && !selectedForm && (
                                <p className="pdd-modal__usage">
                                    {t('pdetail.build.in', { format: build.format, usage: build.data.usage })}
                                </p>
                            )}
                            <div className="pdd-modal__types">
                                {activeTypes.map((type) => <TypeChip key={type} type={type} />)}
                            </div>
                            {abilities.length > 0 && (
                                <div className="pdd-modal__abilities" aria-label={t('pokedex.abilities')}>
                                    <span className="pdd-modal__abilities-label">{t('pokedex.abilities')}</span>
                                    {abilities.map((ab, idx) => (
                                        <span key={idx} className="pdd-ability">
                                            <AbilityChip ability={ab} onBeforeNavigate={onClose} />
                                            {ab.is_hidden && <em>{t('pokedex.hiddenShort')}</em>}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="modal-body pdd-modal__body custom-scrollbar">
                    <div className="pdd-modal__duo">
                        <section className="pdd-modal__section">
                            <div className="pdd-modal__head">
                                <h3 className="pdd-modal__title">{t('pokedex.baseStats')}</h3>
                                {stats.length > 0 && (
                                    <span className="pdd-card__meta">
                                        {t('pokedex.statTotal')} <b>{statTotal}</b>
                                    </span>
                                )}
                            </div>
                            {stats.length > 0 ? (
                                <div className="pdd-stats">
                                    {stats.map((stat) => (
                                        <StatBar
                                            key={stat.name}
                                            stat={stat.name}
                                            value={stat.base_stat}
                                            peak={peakStat > 0 && stat.base_stat === peakStat}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="pdd-modal__loading">
                                    <Loader size="sm" scene="pokedex" />
                                </div>
                            )}
                        </section>

                        <section className="pdd-modal__section">
                            <div className="pdd-modal__head">
                                <h3 className="pdd-modal__title">{t('pokedex.typeEffectivenessTitle')}</h3>
                            </div>
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
                                                {group.types.map((tName) => <TypeChip key={tName} type={tName} size="sm" />)}
                                            </div>
                                        </div>
                                    );
                                })}
                                {neutralTypes.length > 0 && (
                                    <details className="pdd-neutral">
                                        <summary className="pdd-neutral__summary">
                                            <ChevronRight aria-hidden="true" />
                                            <span>{t('pokedex.neutralCount', { count: neutralTypes.length })}</span>
                                        </summary>
                                        <div className="pdd-pills pdd-neutral__pills">
                                            {neutralTypes.map((tName) => <TypeChip key={tName} type={tName} size="sm" />)}
                                        </div>
                                    </details>
                                )}
                            </div>
                        </section>
                    </div>

                    {evolutionDetails.length > 1 && (
                        <section className="pdd-modal__section">
                            <div className="pdd-modal__head">
                                <h3 className="pdd-modal__title">{t('pokedex.evolutionLine')}</h3>
                            </div>
                            <ol className="pdd-evo">
                                {evolutionDetails.map((evo, index) => {
                                    const isCurrent = Number(evo.id) === Number(pokemon.id) || evo.name === pokemon.name;
                                    return (
                                        <li key={evo.id || evo.name} className="pdd-evo__step">
                                            {index > 0 && <ChevronRight className="pdd-evo__arrow" aria-hidden="true" />}
                                            <button
                                                type="button"
                                                onClick={() => handleSelectEvolution(evo)}
                                                aria-current={isCurrent ? 'true' : undefined}
                                                className={`pdd-tile pdd-tile--compact ${isCurrent ? 'is-current' : ''}`}
                                            >
                                                <Sprite
                                                    className="pdd-tile__art"
                                                    src={evo.id ? getPokemonArtworkSpriteUrl(evo.id) : (evo.sprite || POKEBALL_PLACEHOLDER_URL)}
                                                    artworkSrc={evo.sprite || POKEBALL_PLACEHOLDER_URL}
                                                    alt=""
                                                />
                                                {evo.id && <span className="pdd-tile__dex">{padDex(evo.id)}</span>}
                                                <span className="pdd-tile__name">{cleanName(evo.name)}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ol>
                        </section>
                    )}

                    {forms.length > 0 && onAdd && (
                        <section className="pdd-modal__section">
                            <div className="pdd-modal__head">
                                <h3 className="pdd-modal__title">{t('modals.detailModalFormToAdd')}</h3>
                            </div>
                            <div className="pdd-modal__forms">
                                <button
                                    type="button"
                                    onClick={() => setSelectedFormId(null)}
                                    aria-pressed={!selectedFormId}
                                    className={`pdd-modal__form ${!selectedFormId ? 'is-current' : ''}`}
                                >
                                    <span
                                        className="type-platform pdd-modal__form-stage"
                                        style={{ '--card-type': typeColors[(pokemon.types || [])[0]] || 'var(--color-primary)' }}
                                    >
                                        <img
                                            src={sanitizeSpriteUrl(pokemon.sprite) || POKEBALL_PLACEHOLDER_URL}
                                            alt=""
                                            className="pdd-modal__form-sprite image-pixelated"
                                        />
                                    </span>
                                    <span className="pdd-modal__form-meta">
                                        <span className="pdd-modal__form-name">{cleanName(pokemon.name)}</span>
                                    </span>
                                </button>
                                {forms.map((form) => (
                                    <button
                                        key={form.id}
                                        type="button"
                                        onClick={() => setSelectedFormId(form.id)}
                                        aria-pressed={selectedFormId === form.id}
                                        title={form.displayName}
                                        className={`pdd-modal__form ${selectedFormId === form.id ? 'is-current' : ''}`}
                                    >
                                        <span
                                            className="type-platform pdd-modal__form-stage"
                                            style={{ '--card-type': typeColors[(form.types || activeTypes)[0]] || 'var(--color-primary)' }}
                                        >
                                            <img
                                                src={sanitizeSpriteUrl(form.sprite) || POKEBALL_PLACEHOLDER_URL}
                                                alt=""
                                                className="pdd-modal__form-sprite image-pixelated"
                                            />
                                        </span>
                                        <span className="pdd-modal__form-meta">
                                            <span className="pdd-modal__form-name">{form.displayName}</span>
                                            {form.types?.length > 0 && (
                                                <span className="pdd-modal__form-types">
                                                    {form.types.map((type) => <TypeChip key={type} type={type} size="sm" />)}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                <footer className="modal-footer modal-footer--ruled pdd-modal__footer">
                    <div className="pdd-modal__links">
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                navigate(`/pokemon/${pokemon.id}?tab=locations`, { state: linkState });
                            }}
                            className="btn btn-ghost btn-sm"
                        >
                            {t('modals.pokedexViewLocations')}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                navigate(`/pokemon/${pokemon.id}`, { state: linkState });
                            }}
                            className="btn btn-ghost btn-sm"
                        >
                            {t('pdetail.viewFullPage')}
                        </button>
                    </div>
                    {onAdd && (
                        <button
                            type="button"
                            onClick={() => {
                                onAdd(entityToAdd);
                                onClose();
                            }}
                            disabled={isEntityOnTeam || isTeamFull}
                            className={`btn ${isEntityOnTeam ? 'btn-secondary' : 'btn-primary'}`}
                        >
                            {isEntityOnTeam ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
                            {isEntityOnTeam
                                ? t('modals.detailModalInTeam')
                                : selectedForm
                                    ? t('modals.detailModalAddFormTeam', { name: selectedForm.displayName })
                                    : t('modals.detailModalAddTeam')}
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}
