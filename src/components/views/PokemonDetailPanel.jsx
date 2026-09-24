import React, { useEffect, useState } from 'react';
import {
    MapPin, Star, Sparkles, ChevronRight, Compass, Footprints, Waves, Fish, Gift, Music,
    Hammer, Activity, AlertCircle, Swords, Image as ImageIcon, Database, Zap, HandFist, Plus, ChevronLeft, Trophy, ScrollText,
} from 'lucide-react';

import '../../styles/team-builder-view.css';
import '../../styles/locations-view.css';
import { typeColors, typeIcons } from '../../constants/types';
import { TypeBadge } from '../TypeBadge';
import { StatBar } from '../StatBar';
import { AbilityChip } from '../AbilityChip';
import { useTranslation } from '../../hooks/useTranslation';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { usePokemonDetailData } from '../../hooks/usePokemonDetailData';
import { VERSION_CONFIG, formatTmName } from '../../constants/pokemonVersions';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { SmogonCompetitivePanel } from './SmogonCompetitivePanel';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { Loader } from '../Loader';

const METHOD_ICON_MAP = {
    walk: Footprints, surf: Waves, 'old-rod': Fish, 'good-rod': Fish, 'super-rod': Fish,
    gift: Gift, headbutt: Compass, 'rock-smash': Hammer, pokeflute: Music,
};

const PhysicalIcon = () => (
    <svg className="w-5 h-4 inline-block text-[#ef4444]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l1.5 4.5 4.5-1.5-1.5 4.5 4.5 1.5-4.5 1.5 1.5 4.5-4.5-1.5-1.5 4.5-1.5-4.5-4.5 1.5 1.5-4.5-4.5-1.5 4.5-1.5-1.5-4.5 4.5 1.5z" />
    </svg>
);
const SpecialIcon = () => (
    <svg className="w-5 h-4 inline-block text-[#3b82f6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
);
const StatusIcon = () => (
    <svg className="w-5 h-4 inline-block text-[#9ca3af]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16" fill="currentColor" opacity="0.3" /><circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
);

/**
 * The full Pokédex detail experience (Data / Locations / Moves / Sprites tabs),
 * self-contained: give it a `pokemonId` and it loads everything itself. This is
 * the **desktop** surface — below 1024px PokemonDetailView renders
 * MobilePokemonDetailView instead, and both read the same data through
 * `usePokemonDetailData`.
 */
export function PokemonDetailPanel({
    pokemonId,
    colors,
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
    const { goToMove } = useEntityNavigate();

    const [activeTab, setActiveTab] = useState('data'); // 'data' | 'competitive' | 'locations' | 'moves' | 'sprites'
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1024);
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

    // A new Pokémon always opens on Data — the previous one's Moves tab is not
    // where anyone wants to land.
    useEffect(() => { setActiveTab('data'); }, [pokemonId]);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const handleSelectPokemon = (pokemon) => { if (pokemon?.id != null) onNavigate?.(pokemon.id); };

    const isOnTeam = selectedPokemonDetails && currentTeam.some((m) => m.id === selectedPokemonDetails.id);
    // The favourites Set is numeric (the store normalises it), so the id has to
    // be too — a detail loaded from a route param or a Firestore doc can arrive
    // as a string, and `Set.has('6')` is quietly false for `6`.
    const favoriteId = selectedPokemonDetails ? Number(selectedPokemonDetails.id) : null;
    const isFavorite = Boolean(favoritePokemons?.has?.(favoriteId));

    // ── Tab content (copied from PokedexView's renderDetailsContent) ───────────
    const renderDetailsContent = () => {
        // Competitive only needs the species id, so it renders even while the rest
        // of the Pokédex details are still loading.
        if (activeTab === 'competitive') {
            return <SmogonCompetitivePanel pokemonId={selectedPokemon?.id || pokemonId} />;
        }

        if (!selectedPokemonDetails) return null;

        if (activeTab === 'data') {
            return (
                <div className="flex-1 flex flex-col space-y-5 animate-scale-in">
                    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.3fr] gap-4 items-stretch">
                        <div className="text-center p-3.5 sm:p-4 bg-surface rounded-xl border border-border flex flex-col justify-between items-center">
                            <div className="w-full flex-1 flex flex-col justify-center items-center py-1 sm:py-2">
                                <div className="relative inline-block">
                                    <img src={spriteToShow} alt={selectedPokemonDetails.name} className="mx-auto h-24 w-24 sm:h-36 sm:w-36 image-pixelated hover:scale-105 transition-transform duration-300" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!showShiny) shinyBurst.fire();
                                            setShowShiny((value) => !value);
                                        }}
                                        aria-pressed={showShiny}
                                        className={`absolute -bottom-2 -right-4 rounded-full p-1.5 transition-colors duration-150 active:scale-95 border ${showShiny ? 'bg-accent text-bg border-accent' : 'bg-surface-raised text-fg border-border'} ${shinyBurst.isBursting ? 'is-bursting' : ''}`}
                                        title={language === 'pt' ? 'Alternar Brilhante' : 'Toggle Shiny'}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {shinyBurst.burst}
                                    </button>
                                    {onToggleFavoritePokemon && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!isFavorite) favoriteBurst.fire();
                                                onToggleFavoritePokemon(favoriteId);
                                            }}
                                            aria-pressed={isFavorite}
                                            className={`absolute -bottom-2 -left-4 rounded-full p-1.5 transition-colors duration-150 active:scale-95 border ${isFavorite ? 'bg-accent-soft text-accent border-accent-soft' : 'bg-surface-raised text-muted border-border'} ${favoriteBurst.isBursting ? 'is-bursting' : ''}`}
                                            title={isFavorite ? t('common.remove') : (language === 'pt' ? 'Adicionar aos favoritos' : 'Add to favorites')}
                                        >
                                            <Star className={`w-4 h-4 ${isFavorite ? 'fill-current text-warning' : 'text-muted'}`} />
                                            {favoriteBurst.burst}
                                        </button>
                                    )}
                                </div>
                                <h3 className="mt-2 sm:mt-3.5 text-xl font-extrabold capitalize text-fg tracking-tight">
                                    {selectedPokemonDetails.name} <span className="text-muted font-normal text-base">#{selectedPokemonDetails.id}</span>
                                </h3>
                                {pokemonGenus && <p className="mt-0.5 text-sm text-muted">{pokemonGenus}</p>}
                                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                                    {selectedPokemonDetails.types?.map((type) => <TypeBadge key={type} type={type} colors={colors} />)}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl bg-surface p-4 border border-border flex flex-col justify-between">
                            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted">{t('pokedex.baseStats')}</h4>
                            <div className="space-y-2 flex-1 flex flex-col justify-center">
                                {selectedPokemonDetails.stats?.map((stat) => <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />)}
                            </div>
                        </div>
                    </div>

                    {(() => {
                        const hasEvolution = evolutionDetails.length > 1;
                        const hasForms = forms.length > 0;

                        const evolutionBlock = hasEvolution ? (
                            <div className="rounded-xl bg-surface p-4 border border-border h-full flex flex-col">
                                <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted">{language === 'pt' ? 'Linha Evolutiva' : 'Evolution Line'}</h4>
                                <div className="overflow-x-auto custom-scrollbar pb-1 flex-1 flex items-center">
                                    <div className="flex min-w-max items-center gap-2 px-1 justify-center mx-auto">
                                        {evolutionDetails.map((evo, index) => (
                                            <React.Fragment key={evo.name}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectPokemon(evo)}
                                                    className={`min-w-[5.5rem] text-center p-2 rounded-xl transition-all border ${selectedPokemonDetails.id === evo.id ? 'bg-primary-soft border-primary' : 'bg-surface-raised border-border hover:bg-surface-raised/80 hover:border-border'}`}
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
                        ) : null;

                        const formsBlock = hasForms ? (
                            <div className="rounded-xl bg-surface p-4 border border-border h-full flex flex-col">
                                <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted">{language === 'pt' ? 'Formas & Megas' : 'Forms & Megas'}</h4>
                                <div className="overflow-x-auto custom-scrollbar pb-1 flex-1 flex items-center">
                                    <div className="flex min-w-max items-stretch gap-2 px-1 justify-center mx-auto">
                                        {forms.map((form) => (
                                            <button
                                                key={form.id}
                                                type="button"
                                                onClick={() => handleSelectPokemon({ id: form.id })}
                                                title={form.displayName}
                                                className="w-[6.5rem] text-center p-2 rounded-xl transition-all border bg-surface-raised border-border hover:border-primary hover:bg-primary-soft"
                                            >
                                                <img src={form.sprite || POKEBALL_PLACEHOLDER_URL} alt={form.displayName} className="h-14 w-14 mx-auto image-pixelated" />
                                                <p className="text-[11px] font-bold text-fg capitalize mt-1 leading-tight line-clamp-2">{form.displayName}</p>
                                                {form.types?.length > 0 && (
                                                    <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                                                        {(form.types || []).map((type) => <TypeBadge key={type} type={type} colors={colors} />)}
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : null;

                        const descriptionBlock = pokedexDescription ? (
                            <div className="rounded-xl bg-surface p-4 border border-border h-full flex flex-col">
                                <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted flex items-center justify-center gap-1.5">
                                    <ScrollText className="w-3.5 h-3.5 text-primary" />
                                    <span>{language === 'pt' ? 'Descrição da Pokédex' : 'Pokédex Entry'}</span>
                                </h4>
                                <p className="flex-1 flex items-center text-center justify-center text-sm text-fg leading-relaxed">{pokedexDescription}</p>
                            </div>
                        ) : null;

                        // Both evolution and forms exist → the Pokédex entry leads as its
                        // own full-width row, then evolution & forms share a two-column row.
                        if (hasEvolution && hasForms) {
                            return (
                                <>
                                    {descriptionBlock}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                                        {evolutionBlock}
                                        {formsBlock}
                                    </div>
                                </>
                            );
                        }

                        // Exactly one of them exists → the Pokédex entry leads the two-column
                        // row (or the block takes the full width if there's no entry).
                        const single = evolutionBlock || formsBlock;
                        if (single) {
                            return descriptionBlock ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                                    {descriptionBlock}
                                    {single}
                                </div>
                            ) : single;
                        }

                        // Neither exists → the Pokédex entry occupies the whole row.
                        return descriptionBlock;
                    })()}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                        <div className="flex flex-col gap-4">
                            <div className="rounded-xl bg-surface p-4 border border-border">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 pb-2 mb-2 border-b border-border">
                                    <Database className="w-3.5 h-3.5 text-primary" />
                                    <span>{language === 'pt' ? 'Dados da Pokédex' : 'Pokédex Data'}</span>
                                </h4>
                                <table className="w-full text-xs text-fg">
                                    <tbody>
                                        <tr className="border-b border-border py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{language === 'pt' ? 'Nº Nacional' : 'National ID'}</td>
                                            <td className="font-mono font-bold">#{formattedId || '----'}</td>
                                        </tr>
                                        <tr className="border-b border-border py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{t('pokedex.typesFilterLabel')}</td>
                                            <td className="flex gap-1">{selectedPokemonDetails.types?.map((type) => <TypeBadge key={type} type={type} colors={colors} />)}</td>
                                        </tr>
                                        <tr className="border-b border-border py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{language === 'pt' ? 'Espécie' : 'Species'}</td>
                                            <td className="font-bold capitalize">{pokemonGenus || t('common.loading')}</td>
                                        </tr>
                                        <tr className="border-b border-border py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{t('pokedex.height')}</td>
                                            <td className="font-bold font-mono">{heightInM ? `${heightInM} m` : t('common.loading')} {heightInFt && <span className="text-muted font-normal text-[11px] font-sans">({heightInFt})</span>}</td>
                                        </tr>
                                        <tr className="border-b border-border py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{t('pokedex.weight')}</td>
                                            <td className="font-bold font-mono">{weightInKg ? `${weightInKg} kg` : t('common.loading')} {weightInLbs && <span className="text-muted font-normal text-[11px] font-sans">({weightInLbs} lbs)</span>}</td>
                                        </tr>
                                        <tr className="py-2.5 flex justify-between items-start">
                                            <td className="text-muted py-1">{t('pokedex.abilities')}</td>
                                            <td className="font-bold text-right flex flex-col items-end space-y-1">
                                                {selectedPokemonDetails.abilities?.map((ab, idx) => (
                                                    <div key={idx} className="capitalize text-xs">
                                                        {ab.is_hidden ? (
                                                            <span className="text-muted font-normal text-[11px] inline-flex items-center gap-1">
                                                                <AbilityChip ability={ab} /> <span className="text-[10px] text-muted">{language === 'pt' ? '(oculta)' : '(hidden)'}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block"><AbilityChip ability={ab} /></span>
                                                        )}
                                                    </div>
                                                ))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="rounded-xl bg-surface p-4 border border-border">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 pb-2 mb-2 border-b border-border">
                                    <Zap className="w-3.5 h-3.5 text-primary" />
                                    <span>{language === 'pt' ? 'Treinamento' : 'Training'}</span>
                                </h4>
                                <table className="w-full text-xs text-fg">
                                    <tbody>
                                        <tr className="border-b border-border py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Pontos de EV' : 'EV Yield'}</td><td className="font-bold font-mono text-right truncate max-w-[200px]">{evYield}</td></tr>
                                        <tr className="border-b border-border py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Taxa de Captura' : 'Catch Rate'}</td><td className="font-bold font-mono text-right">{catchRateText || t('common.loading')}</td></tr>
                                        <tr className="border-b border-border py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Amizade Base' : 'Base Friendship'}</td><td className="font-bold font-mono text-right">{baseFriendshipText || t('common.loading')}</td></tr>
                                        <tr className="border-b border-border py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Exp. Base' : 'Base Exp.'}</td><td className="font-mono font-bold text-right">{fullApiData?.base_experience ?? t('common.loading')}</td></tr>
                                        <tr className="py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Crescimento' : 'Growth Rate'}</td><td className="font-bold text-right">{growthRateText || t('common.loading')}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="rounded-xl bg-surface p-4 border border-border">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 pb-2 mb-2 border-b border-border">
                                    <HandFist className="w-3.5 h-3.5 text-primary" />
                                    <span>{t('pokedex.typeEffectivenessTitle')}</span>
                                </h4>
                                <p className="text-[11px] text-muted mb-4">{t('pokedex.typeEffectivenessSubtitle')}</p>
                                {(() => {
                                    const tiers = [
                                        { label: language === 'pt' ? '4×  Muito Fraco' : '4×  Super Weak', mult: 4, bg: 'bg-red-500/15', border: 'border-red-500/40', text: 'text-red-400', badge: 'bg-red-500/20 border-red-500/50 text-red-300' },
                                        { label: language === 'pt' ? '2×  Fraco' : '2×  Weak', mult: 2, bg: 'bg-orange-500/10', border: 'border-orange-500/35', text: 'text-orange-400', badge: 'bg-orange-500/20 border-orange-500/50 text-orange-300' },
                                        { label: language === 'pt' ? '½×  Resistente' : '½×  Resistant', mult: 0.5, bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/15 border-blue-500/40 text-blue-300' },
                                        { label: language === 'pt' ? '¼×  Muito Resistente' : '¼×  Very Resistant', mult: 0.25, bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', badge: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' },
                                        { label: language === 'pt' ? '0×  Imune' : '0×  Immune', mult: 0, bg: 'bg-surface-raised/60', border: 'border-border', text: 'text-muted', badge: 'bg-surface-raised border-border text-muted' },
                                    ];
                                    const groups = tiers.map((tier) => ({ ...tier, types: Object.entries(typeDefenses).filter(([, m]) => m === tier.mult).map(([ty]) => ty) })).filter((g) => g.types.length > 0);
                                    const neutralTypes = Object.entries(typeDefenses).filter(([, m]) => m === 1).map(([ty]) => ty);
                                    return (
                                        <div className="space-y-2.5">
                                            {groups.map((g) => (
                                                <div key={g.mult} className={`rounded-lg border ${g.border} ${g.bg} px-3 py-2.5`}>
                                                    <span className={`text-[10px] font-extrabold uppercase tracking-widest ${g.text} block mb-2`}>{g.label}</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(g.types || []).map((tName) => (
                                                            <span key={tName} className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold capitalize ${g.badge}`}>
                                                                <img src={typeIcons[tName]} alt={tName} className="h-4 w-4 shrink-0" />{tName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            {neutralTypes.length > 0 && (
                                                <details className="group">
                                                    <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-muted hover:text-muted transition-colors select-none list-none flex items-center gap-1.5 py-1">
                                                        <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                                                        {neutralTypes.length} {language === 'pt' ? 'tipos neutros' : 'neutral types'} (1×)
                                                    </summary>
                                                    <div className="flex flex-wrap gap-1.5 pt-2 pl-1">
                                                        {neutralTypes.map((tName) => (
                                                            <span key={tName} className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised/40 px-2 py-1 text-xs font-semibold capitalize text-muted">
                                                                <img src={typeIcons[tName]} alt={tName} className="h-4 w-4 shrink-0 opacity-60" />{tName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </details>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="rounded-xl bg-surface p-4 border border-border">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 pb-2 mb-2 border-b border-border">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    <span>{language === 'pt' ? 'Cruzamento' : 'Breeding'}</span>
                                </h4>
                                <table className="w-full text-xs text-fg">
                                    <tbody>
                                        <tr className="border-b border-border py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Grupos de Ovos' : 'Egg Groups'}</td><td className="font-bold text-right capitalize">{eggGroups}</td></tr>
                                        <tr className="border-b border-border py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Gênero' : 'Gender Ratio'}</td><td className="font-bold font-mono text-right">{genderText || t('common.loading')}</td></tr>
                                        <tr className="py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Ciclos de Ovo' : 'Egg Cycles'}</td><td className="font-bold font-mono text-right">{eggCyclesText || t('common.loading')}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeTab === 'locations') {
            return (
                <div className="flex-1 flex flex-col space-y-4 animate-scale-in">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        <h4 className="text-base font-bold text-fg">{t('pokedex.locationsTitle')}</h4>
                    </div>

                    {availableVersions.length > 0 && (
                        <div className="flex items-center justify-between gap-4 bg-surface p-3 rounded-xl border border-border">
                            <label htmlFor="pdp-locations-version-filter" className="text-xs font-bold text-muted uppercase tracking-wider">{t('pokedex.locationsVersionFilter')}:</label>
                            <div className="relative min-w-[150px]">
                                <select id="pdp-locations-version-filter" value={locationsVersionFilter} onChange={(e) => setLocationsVersionFilter(e.target.value)} className="team-builder-field team-builder-field--compact team-builder-select w-full">
                                    <option value="all">{language === 'pt' ? 'Todos os Jogos' : 'All Games'}</option>
                                    {availableVersions.map((vName) => {
                                        const conf = VERSION_CONFIG[vName] || { label: vName.replace('-', ' ') };
                                        return <option key={vName} value={vName}>{conf.label}</option>;
                                    })}
                                </select>
                            </div>
                        </div>
                    )}

                    {isEncountersLoading ? (
                        <div className="flex-1 flex items-center justify-center py-16"><Loader /></div>
                    ) : filteredGroupedEncounters.length > 0 ? (
                        <div className="custom-scrollbar overflow-y-auto pr-1 flex-1 space-y-3">
                            {filteredGroupedEncounters.map((group) => (
                                <div key={group.id} className="locations-version-group border border-border bg-surface p-4 rounded-2xl">
                                    <h5 className="locations-version-group__title text-xs font-extrabold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-3">
                                        <MapPin className="w-3.5 h-3.5" /><span>{group.name}</span>
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                        {group.locations.map((loc, idx) => (
                                            <div key={idx} className="locations-item border border-border p-3.5 rounded-xl bg-bg">
                                                <div className="flex items-center gap-2 border-b border-border pb-2 mb-3">
                                                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                                                    <span className="font-extrabold text-fg text-sm truncate">{loc.location}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {loc.versions.map((ver) => {
                                                        const conf = VERSION_CONFIG[ver.name] || { label: ver.name.replace('-', ' '), color: '#7f8c8d' };
                                                        const distinctDetails = ver.details.reduce((acc, current) => {
                                                            const key = `${current.methodKey}-${current.minLevel}-${current.maxLevel}`;
                                                            if (!acc.has(key)) acc.set(key, current);
                                                            return acc;
                                                        }, new Map()).values();
                                                        return Array.from(distinctDetails).map((detail, dIdx) => {
                                                            const IconComp = METHOD_ICON_MAP[detail.methodKey] || Compass;
                                                            return (
                                                                <div key={`${ver.name}-${dIdx}`} className="flex flex-wrap items-center justify-between gap-3 py-1.5 px-3 rounded-lg bg-surface transition-colors">
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border shrink-0 text-center" style={{ borderColor: `${conf.color}55`, backgroundColor: `${conf.color}18`, color: conf.color }}>{conf.label}</span>
                                                                        <span className="flex items-center gap-1.5 text-xs text-muted truncate">
                                                                            <IconComp className="w-3.5 h-3.5 text-muted shrink-0" /><span className="capitalize">{detail.method}</span>
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <span className="text-[10px] font-mono font-semibold bg-bg px-2 py-0.5 rounded border border-border text-muted">{detail.minLevel === detail.maxLevel ? `Lv. ${detail.minLevel}` : `Lv. ${detail.minLevel}-${detail.maxLevel}`}</span>
                                                                        <span className="text-xs font-bold font-mono text-primary">{detail.chance}%</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 bg-surface border border-border rounded-xl text-center px-4">
                            <AlertCircle className="w-10 h-10 text-muted mx-auto mb-3" />
                            <h5 className="font-bold text-fg mb-1">{language === 'pt' ? 'Não Encontrado na Natureza' : 'Not Found in the Wild'}</h5>
                            <p className="text-xs text-muted max-w-sm mx-auto">{t('pokedex.locationsEmpty')}</p>
                        </div>
                    )}
                </div>
            );
        }

        if (activeTab === 'moves') {
            return (
                <div className="flex-1 flex flex-col space-y-4 animate-scale-in">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2"><Swords className="w-4 h-4 text-primary" /><span>{t('pokedex.movesTitle')}</span></h4>
                        {availableMoveVersions.length > 0 && (
                            <div className="relative min-w-[170px]">
                                <select value={selectedMoveVersion} onChange={(e) => setSelectedMoveVersion(e.target.value)} className="team-builder-field team-builder-field--compact team-builder-select w-full">
                                    {availableMoveVersions.map((vName) => <option key={vName} value={vName}>{vName.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {isMovesLoading ? (
                        <div className="flex-1 flex items-center justify-center py-20"><Loader /></div>
                    ) : (resolvedMoves.levelUp.length > 0 || resolvedMoves.machine.length > 0 || (resolvedMoves.other?.length > 0)) ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                            {[{ key: 'levelUp', title: t('pokedex.movesLevelUp'), col: t('pokedex.movesHeaderLevel'), rows: resolvedMoves.levelUp },
                            { key: 'machine', title: t('pokedex.movesMachine'), col: t('pokedex.movesHeaderTm'), rows: resolvedMoves.machine },
                            { key: 'other', title: language === 'pt' ? 'Outros Movimentos' : 'Other Moves', col: language === 'pt' ? 'Método' : 'Method', rows: resolvedMoves.other || [] }].filter((block) => block.rows.length > 0).map((block) => (
                                <div key={block.key} className="rounded-xl bg-surface p-4 border border-border">
                                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5 pb-2 border-b border-border"><ChevronRight className="w-3.5 h-3.5 text-primary" /><span>{block.title}</span></h5>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse pokedex-moves-table">
                                            <thead>
                                                <tr className="border-b border-border text-muted">
                                                    <th className="pb-2 font-bold w-12">{block.col}</th>
                                                    <th className="pb-2 font-bold">{t('pokedex.movesHeaderName')}</th>
                                                    <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderType')}</th>
                                                    <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderClass')}</th>
                                                    <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderPower')}</th>
                                                    <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderAcc')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {block.rows.map((m, idx) => (
                                                    <tr key={idx} className="border-b border-border hover:bg-bg/10">
                                                        <td className="py-2.5 font-bold font-mono text-muted">{block.key === 'levelUp' ? m.level : block.key === 'machine' ? (m.tmName ? formatTmName(m.tmName) : '—') : (m.learnMethod ? m.learnMethod.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—')}</td>
                                                        <td className="py-2.5 font-bold capitalize text-fg">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => goToMove(m.name, e)}
                                                                className="capitalize font-bold text-fg transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                                                            >
                                                                {m.name.replace(/-/g, ' ')}
                                                            </button>
                                                        </td>
                                                        <td className="py-2.5 text-center"><span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider text-white" style={{ backgroundColor: typeColors[m.type] }}>{m.type.slice(0, 3)}</span></td>
                                                        <td className="py-2 text-center"><span title={m.damageClass} className="inline-flex items-center justify-center">{m.damageClass === 'physical' ? <PhysicalIcon /> : m.damageClass === 'special' ? <SpecialIcon /> : <StatusIcon />}</span></td>
                                                        <td className="py-2.5 text-center font-bold font-mono text-fg">{m.power ?? '—'}</td>
                                                        <td className="py-2.5 text-center font-bold font-mono text-fg">{m.accuracy ? `${m.accuracy}%` : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 bg-surface border border-border rounded-xl text-center px-4">
                            <AlertCircle className="w-10 h-10 text-muted mx-auto mb-3" />
                            <h5 className="font-bold text-fg mb-1">{language === 'pt' ? 'Nenhum movimento encontrado' : 'No Moves Found'}</h5>
                            <p className="text-xs text-muted max-w-sm mx-auto">{t('pokedex.movesEmpty')}</p>
                        </div>
                    )}
                </div>
            );
        }

        if (activeTab === 'sprites') {
            return (
                <div className="flex-1 flex flex-col space-y-4 animate-scale-in">
                    <div className="bg-surface p-3 rounded-xl border border-border">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /><span>{t('pokedex.spritesTitle')}</span></h4>
                        <p className="text-[10px] text-muted mt-1.5">{t('pokedex.spritesPreviewTitle')}</p>
                    </div>

                    {pokemonGenerationSprites.length > 0 ? (
                        isMobile ? (
                            <div className="pokedex-sprites-grid">
                                {pokemonGenerationSprites.map((g) => (
                                    <div key={g.name} className="pokedex-sprite-gen-card">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2.5 block">{g.name}</span>
                                        <div className="flex items-center justify-center gap-3">
                                            {g.normal ? (
                                                <div className="flex flex-col items-center">
                                                    <img src={g.normal} alt={`${selectedPokemonDetails.name} ${g.name} normal`} onClick={() => setCustomSelectedSprite(g.normal)} className={`h-11 w-11 image-pixelated cursor-pointer hover:scale-110 active:scale-90 transition-transform ${customSelectedSprite === g.normal ? 'ring-2 ring-primary rounded-lg bg-primary/10' : ''}`} title={language === 'pt' ? 'Pré-visualizar Sprite Normal' : 'Preview Normal Sprite'} />
                                                    <span className="text-[9px] text-muted font-bold mt-1">Normal</span>
                                                </div>
                                            ) : <span className="text-muted text-[10px]">—</span>}
                                            {g.shiny ? (
                                                <div className="flex flex-col items-center">
                                                    <img src={g.shiny} alt={`${selectedPokemonDetails.name} ${g.name} shiny`} onClick={() => setCustomSelectedSprite(g.shiny)} className={`h-11 w-11 image-pixelated cursor-pointer hover:scale-110 active:scale-90 transition-transform ${customSelectedSprite === g.shiny ? 'ring-2 ring-primary rounded-lg bg-primary/10' : ''}`} title={language === 'pt' ? 'Pré-visualizar Sprite Brilhante' : 'Preview Shiny Sprite'} />
                                                    <span className="text-[9px] text-muted font-bold mt-1">Shiny</span>
                                                </div>
                                            ) : <span className="text-muted text-[10px]">—</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-border bg-surface overflow-hidden">
                                <div className="overflow-x-auto custom-scrollbar pb-1">
                                    <table className="w-full text-center border-collapse text-xs">
                                        <thead>
                                            <tr className="border-b border-border bg-surface-raised">
                                                <th className="p-3 font-bold text-muted text-left">{t('pokedex.typesFilterLabel')}</th>
                                                {pokemonGenerationSprites.map((g) => <th key={g.name} className="p-3 font-bold text-muted min-w-[90px]">{g.name}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            <tr>
                                                <td className="p-3 font-bold text-muted text-left border-r border-border">Normal</td>
                                                {pokemonGenerationSprites.map((g) => (
                                                    <td key={g.name} className="p-2 border-r border-border hover:bg-bg/25 transition-colors">
                                                        {g.normal ? <img src={g.normal} alt={`${selectedPokemonDetails.name} ${g.name} normal`} onClick={() => setCustomSelectedSprite(g.normal)} className={`h-12 w-12 mx-auto image-pixelated cursor-pointer hover:scale-110 active:scale-90 transition-transform ${customSelectedSprite === g.normal ? 'ring-2 ring-primary rounded-lg bg-primary/10' : ''}`} title={language === 'pt' ? 'Pré-visualizar Sprite Normal' : 'Preview Normal Sprite'} /> : <span className="text-muted text-[10px]">➔</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-bold text-muted text-left border-r border-border">{language === 'pt' ? 'Brilhante' : 'Shiny'}</td>
                                                {pokemonGenerationSprites.map((g) => (
                                                    <td key={g.name} className="p-2 border-r border-border hover:bg-bg/25 transition-colors">
                                                        {g.shiny ? <img src={g.shiny} alt={`${selectedPokemonDetails.name} ${g.name} shiny`} onClick={() => setCustomSelectedSprite(g.shiny)} className={`h-12 w-12 mx-auto image-pixelated cursor-pointer hover:scale-110 active:scale-90 transition-transform ${customSelectedSprite === g.shiny ? 'ring-2 ring-primary rounded-lg bg-primary/10' : ''}`} title={language === 'pt' ? 'Pré-visualizar Sprite Brilhante' : 'Preview Shiny Sprite'} /> : <span className="text-muted text-[10px]">—</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="py-12 bg-surface border border-border rounded-xl text-center px-4">
                            <AlertCircle className="w-10 h-10 text-muted mx-auto mb-3" />
                            <h5 className="font-bold text-fg mb-1">{language === 'pt' ? 'Nenhum Sprite Registrado' : 'No Sprites Recorded'}</h5>
                            <p className="text-xs text-muted max-w-sm mx-auto">{language === 'pt' ? 'Sprites específicos de geração não estão disponíveis para este Pokémon.' : 'Generation-specific sprites are not available for this Pokémon.'}</p>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <section className="team-builder-panel p-5 md:p-6 relative flex flex-col font-mono">
            <div className="flex border-b border-border mb-4 overflow-x-auto whitespace-nowrap scrollbar-none gap-2 items-stretch">
                {onBack && (
                    <>
                        <button
                            type="button"
                            onClick={onBack}
                            className="pb-2.5 px-3 flex items-center gap-1.5 font-bold text-sm text-muted hover:text-primary transition-colors shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4 shrink-0" />
                            {/* Full contextual label on desktop; just "Voltar" on mobile so
                                the long "…à Pokédex" suffix doesn't crowd the tab row. */}
                            <span className="hidden sm:inline">{backLabel}</span>
                            <span className="sm:hidden">{language === 'pt' ? 'Voltar' : 'Back'}</span>
                        </button>
                        <div className="w-px bg-border self-stretch mb-2.5 shrink-0" />
                    </>
                )}
                {[
                    { key: 'data', icon: <Activity className="w-4 h-4" />, label: t('pokedex.dataTab') },
                    { key: 'competitive', icon: <Trophy className="w-4 h-4" />, label: language === 'pt' ? 'Competitivo' : 'Competitive' },
                    { key: 'locations', icon: <MapPin className="w-4 h-4" />, label: t('pokedex.locationsTab') },
                    { key: 'moves', icon: <Swords className="w-4 h-4" />, label: t('pokedex.movesTab') },
                    { key: 'sprites', icon: <ImageIcon className="w-4 h-4" />, label: t('pokedex.spritesTab') },
                ].map((tb) => (
                    <button
                        key={tb.key}
                        type="button"
                        onClick={() => setActiveTab(tb.key)}
                        className={`pb-2.5 px-3 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-2 shrink-0 ${activeTab === tb.key ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted hover:text-fg'}`}
                    >
                        {tb.icon}<span>{tb.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1">{renderDetailsContent()}</div>
        </section>
    );
}
