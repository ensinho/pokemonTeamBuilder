import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';

import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { getEvolutionChainData, getStaticPokemonDetail } from '../../services/pokemonDataCache';
import { useModalA11y } from '../../hooks/useModalA11y';
import { AbilityChip } from '../AbilityChip';
import { StatBar } from '../StatBar';
import { TypeBadge } from '../TypeBadge';
import { CloseIcon, PlusIcon, SparklesIcon, StarIcon } from '../icons';
import { CompactStatBar, getPokemonWeaknessEntries, WeaknessBadge } from './pokemonModalShared';

export function PokemonDetailModal({
    pokemon,
    onClose,
    onAdd,
    currentTeam,
    colors,
    showPokemonDetails,
    db,
    pokemonDetailsCache = {},
    setPokemonDetailsCache,
    isFavorite,
    onToggleFavorite,
}) {
    const dialogRef = useModalA11y(onClose);
    const navigate = useNavigate();
    const [showShiny, setShowShiny] = useState(false);
    const [evolutionDetails, setEvolutionDetails] = useState([]);
    const pokemonWeaknesses = useMemo(() => getPokemonWeaknessEntries(pokemon?.types || []), [pokemon]);

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
                    const id = evo.url.split('/').filter(Boolean).pop();
                    if (pokemonDetailsCache[id]) {
                        return pokemonDetailsCache[id];
                    }

                    const staticDetail = await getStaticPokemonDetail(id);
                    if (staticDetail) {
                        setPokemonDetailsCache?.((prev) => ({ ...prev, [id]: staticDetail }));
                        return staticDetail;
                    }

                    if (!db) return { name: evo.name, sprite: POKEBALL_PLACEHOLDER_URL };

                    const docRef = doc(db, 'artifacts/pokemonTeamBuilder/pokemons', id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const detail = docSnap.data();
                        setPokemonDetailsCache?.((prev) => ({ ...prev, [id]: detail }));
                        return detail;
                    }

                    return { name: evo.name, sprite: POKEBALL_PLACEHOLDER_URL };
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

    if (!pokemon) return null;

    const isAlreadyOnTeam = currentTeam.some((member) => member.id === pokemon.id);
    const spriteToShow = showShiny
        ? (pokemon.animatedShinySprite || pokemon.shinySprite)
        : (pokemon.animatedSprite || pokemon.sprite);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm h-[100vh] flex items-center justify-center z-50 p-3 sm:p-6" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="pokemon-detail-title"
                tabIndex={-1}
                className="relative flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-surface-raised bg-surface shadow-2xl animate-scale-in focus:outline-none sm:max-h-[90vh]"
                style={{
                    '--scrollbar-track-color': colors.card,
                    '--scrollbar-thumb-color': colors.primary,
                    '--scrollbar-thumb-border-color': colors.card,
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    type="button"
                    aria-label={`Close ${pokemon.name} details`}
                    className="absolute top-4 right-4 text-muted hover:text-fg hover:rotate-90 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
                >
                    <CloseIcon />
                </button>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-5 sm:px-5 sm:pt-5">
                    <div className="text-center">
                        <div className="relative inline-block">
                            <img src={spriteToShow || POKEBALL_PLACEHOLDER_URL} alt={pokemon.name} className="mx-auto h-24 w-24 sm:h-32 sm:w-32 image-pixelated hover:scale-110 transition-transform duration-300" />
                            <button
                                type="button"
                                onClick={() => setShowShiny((value) => !value)}
                                className={`absolute -bottom-2 -right-5 rounded-full p-1 transition-all duration-200 hover:scale-110 active:scale-95 ${showShiny ? 'bg-accent text-bg' : 'bg-surface-raised text-fg'}`}
                                title="Toggle Shiny"
                            >
                                <SparklesIcon className="w-4 h-4" />
                            </button>
                            {onToggleFavorite && (
                                <button
                                    type="button"
                                    onClick={() => onToggleFavorite(pokemon.id)}
                                    className={`absolute -bottom-2 -left-5 rounded-full p-1 transition-all duration-200 hover:scale-110 active:scale-95 ${isFavorite ? 'bg-accent-soft text-accent' : 'bg-surface-raised text-muted'}`}
                                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                    <StarIcon className="w-5 h-5" isFavorite={isFavorite} color="currentColor" />
                                </button>
                            )}
                        </div>
                        <h2 id="pokemon-detail-title" className="mt-2 text-2xl font-bold capitalize text-fg sm:text-3xl">
                            {pokemon.name} <span className="text-muted">#{pokemon.id}</span>
                        </h2>
                        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                            {pokemon.types.map((type) => <TypeBadge key={type} type={type} colors={colors} />)}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                navigate(`/pokedex?pokemon=${pokemon.id}`);
                            }}
                            className="mt-3.5 text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface-raised hover:border-primary hover:text-primary transition-all mx-auto text-muted font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            📍 View Locations
                        </button>
                    </div>

                    <div className="mt-4 sm:hidden">
                        <h3 className="mb-2 text-center text-lg font-bold text-fg">Base Stats</h3>
                        <div className="space-y-1.5 rounded-xl bg-bg p-3">
                            {pokemon.stats?.map((stat) => (
                                <CompactStatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />
                            ))}
                        </div>
                    </div>

                    <div className="mt-5 hidden sm:block">
                        <h3 className="mb-3 text-center text-xl font-bold text-fg">Base Stats</h3>
                        <div className="space-y-2">
                            {pokemon.stats?.map((stat) => <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />)}
                        </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-bg p-3 sm:p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <h3 className="text-base font-bold text-fg sm:text-lg">Weaknesses</h3>
                            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                                {pokemonWeaknesses.length}
                            </span>
                        </div>
                        {pokemonWeaknesses.length > 0 ? (
                            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                                {pokemonWeaknesses.map(({ type, multiplier }) => (
                                    <WeaknessBadge key={type} type={type} multiplier={multiplier} colors={colors} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-xs text-muted sm:text-left sm:text-sm">
                                No major weaknesses.
                            </p>
                        )}
                    </div>

                    {evolutionDetails.length > 1 && (
                        <div className="mt-4">
                            <h3 className="mb-2 text-center text-lg font-bold text-fg sm:text-xl">Evolution Line</h3>
                            <div className="overflow-x-auto custom-scrollbar pb-1">
                                <div className="flex min-w-max items-center gap-1 sm:gap-2 px-1 sm:justify-center">
                                    {evolutionDetails.map((evo, index) => (
                                        <React.Fragment key={evo.name}>
                                            <button type="button" onClick={() => { onClose(); showPokemonDetails(evo); }} className="min-w-[4.75rem] sm:min-w-[6rem] text-center cursor-pointer p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-surface-raised">
                                                <img src={evo.sprite || POKEBALL_PLACEHOLDER_URL} alt={evo.name} className="h-14 w-14 sm:h-20 sm:w-20 mx-auto" />
                                                <p className="text-xs leading-tight text-fg capitalize sm:text-sm">{evo.name}</p>
                                            </button>
                                            {index < evolutionDetails.length - 1 && <span className="px-1 text-lg text-muted sm:text-2xl">→</span>}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 sm:mt-5">
                        <h3 className="mb-2 text-center text-lg font-bold text-fg sm:mb-3 sm:text-xl">Abilities</h3>
                        <div className="flex flex-wrap justify-center gap-2">
                            {pokemon.abilities?.map((ability, index) => <AbilityChip key={index} ability={ability} />)}
                        </div>
                    </div>
                </div>

                {!isAlreadyOnTeam && onAdd && (
                    <div className="shrink-0 border-t border-surface-raised px-4 py-3 sm:px-5">
                        <div className="flex justify-center">
                            <button onClick={() => { onAdd(pokemon); onClose(); }} className="w-full sm:w-auto bg-primary hover:opacity-90 text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-opacity active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-fg">
                                <PlusIcon /> Add to Team
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}