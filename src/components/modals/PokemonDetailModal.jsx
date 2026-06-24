import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { Sparkles, Database, ChevronRight } from 'lucide-react';

import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeColors, typeIcons } from '../../constants/types';
import { getEvolutionChainData, getStaticPokemonDetail, getPokemonSpeciesData, getPokemonApiData } from '../../services/pokemonDataCache';
import { buildPokemonForms } from '../../utils/pokemonForms';
import { useModalA11y } from '../../hooks/useModalA11y';
import { AbilityChip } from '../AbilityChip';
import { StatBar } from '../StatBar';
import { TypeBadge } from '../TypeBadge';
import { CloseIcon, PlusIcon, SparklesIcon, StarIcon } from '../icons';
import { getPokemonWeaknessEntries } from './pokemonModalShared';
import { useTranslation } from '../../hooks/useTranslation';

// Full type chart for computing all defensive matchups (same as PokedexView)
const ALL_TYPES = [
    'normal', 'fire', 'water', 'electric', 'grass', 'ice',
    'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
    'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];
const TYPE_CHART = {
    normal: { damageTaken: { Fighting: 2, Ghost: 0 } },
    fire: { damageTaken: { Fire: 0.5, Water: 2, Grass: 0.5, Ice: 0.5, Ground: 2, Bug: 0.5, Rock: 2, Steel: 0.5, Fairy: 0.5 } },
    water: { damageTaken: { Fire: 0.5, Water: 0.5, Electric: 2, Grass: 2, Ice: 0.5, Steel: 0.5 } },
    electric: { damageTaken: { Electric: 0.5, Ground: 2, Flying: 0.5, Steel: 0.5 } },
    grass: { damageTaken: { Fire: 2, Water: 0.5, Electric: 0.5, Grass: 0.5, Ice: 2, Poison: 2, Ground: 0.5, Flying: 2, Bug: 2 } },
    ice: { damageTaken: { Fire: 2, Ice: 0.5, Fighting: 2, Rock: 2, Steel: 2 } },
    fighting: { damageTaken: { Flying: 2, Psychic: 2, Bug: 0.5, Rock: 0.5, Dark: 0.5, Fairy: 2 } },
    poison: { damageTaken: { Grass: 0.5, Fighting: 0.5, Poison: 0.5, Ground: 2, Psychic: 2, Bug: 0.5, Fairy: 0.5 } },
    ground: { damageTaken: { Water: 2, Electric: 0, Grass: 2, Ice: 2, Poison: 0.5, Rock: 0.5 } },
    flying: { damageTaken: { Electric: 2, Grass: 0.5, Ice: 2, Fighting: 0.5, Ground: 0, Bug: 0.5, Rock: 2 } },
    psychic: { damageTaken: { Fighting: 0.5, Psychic: 0.5, Bug: 2, Ghost: 2, Dark: 2 } },
    bug: { damageTaken: { Fire: 2, Grass: 0.5, Fighting: 0.5, Ground: 0.5, Flying: 2, Rock: 2 } },
    rock: { damageTaken: { Normal: 0.5, Fire: 0.5, Water: 2, Grass: 2, Fighting: 2, Poison: 0.5, Ground: 2, Flying: 0.5, Steel: 2 } },
    ghost: { damageTaken: { Normal: 0, Fighting: 0, Poison: 0.5, Bug: 0.5, Ghost: 2, Dark: 2 } },
    dragon: { damageTaken: { Fire: 0.5, Water: 0.5, Electric: 0.5, Grass: 0.5, Ice: 2, Dragon: 2, Fairy: 2 } },
    dark: { damageTaken: { Fighting: 2, Psychic: 0, Bug: 2, Ghost: 0.5, Dark: 0.5, Fairy: 2 } },
    steel: { damageTaken: { Normal: 0.5, Fire: 2, Grass: 0.5, Ice: 0.5, Fighting: 2, Poison: 0, Ground: 2, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 0.5, Dragon: 0.5, Steel: 0.5, Fairy: 0.5 } },
    fairy: { damageTaken: { Fighting: 0.5, Poison: 2, Bug: 0.5, Dragon: 0, Dark: 0.5, Steel: 2 } },
};

const toChartKey = (t) => t.charAt(0).toUpperCase() + t.slice(1);

function computeTypeDefenses(defendingTypes = []) {
    const result = {};
    ALL_TYPES.forEach((attackType) => {
        result[attackType] = defendingTypes.reduce((product, defType) => {
            return product * (TYPE_CHART[defType]?.damageTaken?.[toChartKey(attackType)] ?? 1);
        }, 1);
    });
    return result;
}

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
    const { t, language } = useTranslation();
    const dialogRef = useModalA11y(onClose);
    const navigate = useNavigate();
    const [showShiny, setShowShiny] = useState(false);
    const [evolutionDetails, setEvolutionDetails] = useState([]);
    const [forms, setForms] = useState([]);
    const [selectedFormId, setSelectedFormId] = useState(null);

    // Type defenses (full chart, not just weaknesses)
    const typeDefenses = useMemo(() => computeTypeDefenses(pokemon?.types || []), [pokemon]);

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

    // Fetch alternate forms / megas
    useEffect(() => {
        setForms([]);
        setSelectedFormId(null);
        if (!pokemon?.id) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const species = await getPokemonSpeciesData(pokemon.id);
                if (cancelled || !species?.varieties?.length) return;
                const built = await buildPokemonForms(species, { fetchPokemon: getPokemonApiData });
                if (!cancelled) setForms(built);
            } catch (err) {
                console.error('Failed to load pokémon forms', err);
            }
        })();
        return () => { cancelled = true; };
    }, [pokemon?.id]);

    if (!pokemon) return null;

    const isAlreadyOnTeam = currentTeam.some((member) => member.id === pokemon.id);
    const spriteToShow = showShiny
        ? (pokemon.animatedShinySprite || pokemon.shinySprite)
        : (pokemon.animatedSprite || pokemon.sprite);

    const selectedForm = forms.find((f) => f.id === selectedFormId) || null;
    const entityToAdd = selectedForm
        ? { id: selectedForm.id, name: selectedForm.name, types: selectedForm.types, sprite: selectedForm.sprite }
        : pokemon;

    // Tiered type defense groups (matching PokedexView)
    const defTiers = [
        { label: language === 'pt' ? '4× Muito Fraco' : '4× Super Weak', mult: 4, bg: 'bg-red-500/15', border: 'border-red-500/40', text: 'text-red-400', badge: 'bg-red-500/20 border-red-500/50 text-red-300' },
        { label: language === 'pt' ? '2× Fraco' : '2× Weak', mult: 2, bg: 'bg-orange-500/10', border: 'border-orange-500/35', text: 'text-orange-400', badge: 'bg-orange-500/20 border-orange-500/50 text-orange-300' },
        { label: language === 'pt' ? '½× Resistente' : '½× Resistant', mult: 0.5, bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/15 border-blue-500/40 text-blue-300' },
        { label: language === 'pt' ? '¼× Muito Resistente' : '¼× Very Resistant', mult: 0.25, bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', badge: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' },
        { label: language === 'pt' ? '0× Imune' : '0× Immune', mult: 0, bg: 'bg-surface-raised/60', border: 'border-border', text: 'text-muted', badge: 'bg-surface-raised border-border text-muted' },
    ];
    const defGroups = defTiers
        .map((tier) => ({ ...tier, types: Object.entries(typeDefenses).filter(([, m]) => m === tier.mult).map(([t]) => t) }))
        .filter((g) => g.types.length > 0);
    const neutralTypes = Object.entries(typeDefenses).filter(([, m]) => m === 1).map(([t]) => t);

    return (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm h-[100vh] flex items-center justify-center z-50 p-3 sm:p-6" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="pokemon-detail-title"
                tabIndex={-1}
                className="relative flex w-full max-w-3xl max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-surface-raised bg-surface shadow-2xl animate-scale-in focus:outline-none sm:max-h-[90vh] font-mono"
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
                    aria-label={t('modals.pokedexCloseDetailsAria', { name: pokemon.name })}
                    className="absolute top-4 right-4 z-10 text-muted hover:text-fg hover:rotate-90 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
                >
                    <CloseIcon />
                </button>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-5 sm:px-5 sm:pt-5">
                    {/* ── Sprite + Stats two-column row (matches PokedexView Data tab) ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1.3fr] gap-4 items-stretch">
                        {/* Profile Card */}
                        <div className="text-center p-4 bg-bg rounded-xl border border-border flex flex-col justify-between items-center">
                            <div className="w-full flex-1 flex flex-col justify-center items-center py-2">
                                <div className="relative inline-block">
                                    <img
                                        src={spriteToShow || POKEBALL_PLACEHOLDER_URL}
                                        alt={pokemon.name}
                                        className="mx-auto h-24 w-24 sm:h-28 sm:w-28 image-pixelated hover:scale-105 transition-transform duration-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowShiny((value) => !value)}
                                        className={`absolute -bottom-2 -right-4 rounded-full p-1.5 transition-all duration-200 hover:scale-110 active:scale-95 border ${showShiny ? 'bg-accent text-bg border-accent' : 'bg-surface-raised text-fg border-border'}`}
                                        title={t('modals.pokedexToggleShinyAria')}
                                    >
                                        <SparklesIcon className="w-4 h-4" />
                                    </button>
                                    {onToggleFavorite && (
                                        <button
                                            type="button"
                                            onClick={() => onToggleFavorite(pokemon.id)}
                                            className={`absolute -bottom-2 -left-4 rounded-full p-1.5 transition-all duration-200 hover:scale-110 active:scale-95 border ${isFavorite ? 'bg-accent-soft text-accent border-accent-soft' : 'bg-surface-raised text-muted border-border'}`}
                                            title={isFavorite ? t('modals.pokedexRemoveFromFavoritesAria') : t('modals.pokedexAddToFavoritesAria')}
                                        >
                                            <StarIcon className="w-5 h-5" isFavorite={isFavorite} color="currentColor" />
                                        </button>
                                    )}
                                </div>
                                <h2 id="pokemon-detail-title" className="mt-3.5 text-xl font-extrabold capitalize text-fg tracking-tight">
                                    {pokemon.name} <span className="text-muted font-normal text-base">#{pokemon.id}</span>
                                </h2>
                                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                                    {pokemon.types.map((type) => <TypeBadge key={type} type={type} colors={colors} />)}
                                </div>
                            </div>
                        </div>

                        {/* Base Stats Card */}
                        <div className="rounded-xl bg-bg p-4 border border-border flex flex-col justify-between">
                            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted">{t('pokedex.baseStats')}</h4>
                            <div className="space-y-2 flex-1 flex flex-col justify-center">
                                {pokemon.stats?.map((stat) => (
                                    <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Evolution Line ── */}
                    {evolutionDetails.length > 1 && (
                        <div className="rounded-xl bg-bg p-4 border border-border mt-4">
                            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted">{language === 'pt' ? 'Linha Evolutiva' : 'Evolution Line'}</h4>
                            <div className="overflow-x-auto custom-scrollbar pb-1">
                                <div className="flex min-w-max items-center gap-2 px-1 justify-center">
                                    {evolutionDetails.map((evo, index) => (
                                        <React.Fragment key={evo.name}>
                                            <button
                                                type="button"
                                                onClick={() => { onClose(); showPokemonDetails(evo); }}
                                                className={`min-w-[5.5rem] text-center p-2 rounded-xl transition-all border ${pokemon.id === evo.id ? 'bg-primary-soft border-primary' : 'bg-surface-raised border-border hover:border-primary'}`}
                                            >
                                                <img src={evo.sprite || POKEBALL_PLACEHOLDER_URL} alt={evo.name} className="h-12 w-12 mx-auto image-pixelated" />
                                                <p className="text-xs font-bold text-fg capitalize mt-1 truncate max-w-[80px]">{evo.name}</p>
                                            </button>
                                            {index < evolutionDetails.length - 1 && <span className="text-muted text-base">➔</span>}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Two-column: Pokédex Data + Type Defenses ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {/* Pokédex Data card */}
                        <div className="rounded-xl bg-bg p-4 border border-border">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 pb-2 mb-2 border-b border-border">
                                <Database className="w-3.5 h-3.5 text-primary" />
                                <span>{language === 'pt' ? 'Dados da Pokédex' : 'Pokédex Data'}</span>
                            </h4>
                            <table className="w-full text-xs text-fg">
                                <tbody>
                                    <tr className="border-b border-border/40 py-2.5 flex justify-between items-center">
                                        <td className="text-muted">{language === 'pt' ? 'Nº Nacional' : 'National ID'}</td>
                                        <td className="font-mono font-bold">#{String(pokemon.id).padStart(4, '0')}</td>
                                    </tr>
                                    <tr className="border-b border-border/40 py-2.5 flex justify-between items-center">
                                        <td className="text-muted">{t('pokedex.typesFilterLabel')}</td>
                                        <td className="flex gap-1">
                                            {pokemon.types?.map((type) => <TypeBadge key={type} type={type} colors={colors} />)}
                                        </td>
                                    </tr>
                                    <tr className="py-2.5 flex justify-between items-start">
                                        <td className="text-muted py-1">{t('pokedex.abilities')}</td>
                                        <td className="font-bold text-right flex flex-col items-end space-y-1">
                                            {pokemon.abilities?.map((ab, idx) => {
                                                const isHidden = ab.is_hidden;
                                                return (
                                                    <div key={idx} className="capitalize text-xs">
                                                        {isHidden ? (
                                                            <span className="text-muted font-normal text-[11px] inline-flex items-center gap-1">
                                                                <AbilityChip ability={ab} /> <span className="text-[10px] text-muted">{language === 'pt' ? '(oculta)' : '(hidden)'}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block">
                                                                <AbilityChip ability={ab} />
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => { onClose(); navigate(`/pokedex?pokemon=${pokemon.id}`); }}
                                    className="text-[11px] flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface-raised hover:border-primary hover:text-primary transition-all text-muted font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    {t('modals.pokedexViewLocations')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { onClose(); navigate(`/pokemon/${pokemon.id}`); }}
                                    className="text-[11px] flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface-raised hover:border-primary hover:text-primary transition-all text-muted font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    {t('pdetail.viewFullPage')}
                                </button>
                            </div>
                        </div>

                        {/* Type Defenses card */}
                        <div className="rounded-xl bg-bg p-4 border border-border">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 pb-2 mb-2 border-b border-border">
                                <Sparkles className="w-3.5 h-3.5 text-primary" />
                                <span>{t('pokedex.typeEffectivenessTitle')}</span>
                            </h4>
                            <p className="text-[11px] text-muted mb-3">{t('pokedex.typeEffectivenessSubtitle')}</p>
                            <div className="space-y-2">
                                {defGroups.map((g) => (
                                    <div key={g.mult} className={`rounded-lg border ${g.border} ${g.bg} px-3 py-2`}>
                                        <span className={`text-[10px] font-extrabold uppercase tracking-widest ${g.text} block mb-1.5`}>{g.label}</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {g.types.map((tName) => (
                                                <span key={tName} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${g.badge}`}>
                                                    <img src={typeIcons[tName]} alt={tName} className="h-3.5 w-3.5 shrink-0" />
                                                    {tName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {neutralTypes.length > 0 && (
                                    <details className="group">
                                        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-muted/60 hover:text-muted transition-colors select-none list-none flex items-center gap-1.5 py-1">
                                            <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                                            {neutralTypes.length} {language === 'pt' ? 'tipos neutros' : 'neutral types'} (1×)
                                        </summary>
                                        <div className="flex flex-wrap gap-1.5 pt-2 pl-1">
                                            {neutralTypes.map((tName) => (
                                                <span key={tName} className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-surface-raised/40 px-2 py-0.5 text-[11px] font-semibold capitalize text-muted/70">
                                                    <img src={typeIcons[tName]} alt={tName} className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                                    {tName}
                                                </span>
                                            ))}
                                        </div>
                                    </details>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Form picker (for Megas / alternate forms) ── */}
                    {forms.length > 0 && onAdd && (
                        <div className="rounded-xl bg-bg p-4 border border-border mt-4">
                            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted">{t('modals.detailModalFormToAdd')}</h4>
                            <div className="flex flex-wrap justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedFormId(null)}
                                    className={`flex items-center gap-2 rounded-xl border p-2 pr-3 transition-all ${!selectedFormId ? 'border-primary bg-primary-soft' : 'border-border bg-surface-raised hover:border-primary'}`}
                                >
                                    <img src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL} alt={pokemon.name} className="h-9 w-9 image-pixelated" />
                                    <span className="text-xs font-bold capitalize text-fg">{pokemon.name}</span>
                                </button>
                                {forms.map((form) => (
                                    <button
                                        key={form.id}
                                        type="button"
                                        onClick={() => setSelectedFormId(form.id)}
                                        title={form.displayName}
                                        className={`flex items-center gap-2 rounded-xl border p-2 pr-3 transition-all ${selectedFormId === form.id ? 'border-primary bg-primary-soft' : 'border-border bg-surface-raised hover:border-primary'}`}
                                    >
                                        <img src={form.sprite || POKEBALL_PLACEHOLDER_URL} alt={form.displayName} className="h-9 w-9 image-pixelated" />
                                        <span className="text-left">
                                            <span className="block text-xs font-bold capitalize text-fg leading-tight">{form.displayName}</span>
                                            {form.types?.length > 0 && (
                                                <span className="mt-1 flex gap-1">
                                                    {form.types.map((type) => <TypeBadge key={type} type={type} colors={colors} />)}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Add to Team button ── */}
                {!isAlreadyOnTeam && onAdd && (
                    <div className="shrink-0 border-t border-surface-raised px-4 py-3 sm:px-5">
                        <div className="flex justify-center">
                            <button onClick={() => { onAdd(entityToAdd); onClose(); }} className="w-full sm:w-auto bg-primary hover:opacity-90 text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-opacity active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-fg">
                                <PlusIcon /> {selectedForm ? t('modals.detailModalAddFormTeam', { name: selectedForm.displayName }) : t('modals.detailModalAddTeam')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}