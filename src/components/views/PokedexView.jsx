import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import {
    MapPin,
    Search,
    Star,
    X,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Compass,
    Footprints,
    Waves,
    Fish,
    Gift,
    Music,
    Hammer,
    Activity,
    AlertCircle,
    Info
} from 'lucide-react';

import '../../styles/team-builder-view.css';
import '../../styles/locations-view.css';
import { typeColors, typeIcons } from '../../constants/types';
import { EmptyState } from '../EmptyState';
import { PokemonCard } from '../PokemonCard';
import { AbilityChip } from '../AbilityChip';
import { StatBar } from '../StatBar';
import { TypeBadge } from '../TypeBadge';
import { WeaknessBadge, getPokemonWeaknessEntries } from '../modals/pokemonModalShared';
import {
    getPokemonEncountersData,
    getStaticPokemonDetail,
    getPokemonApiData,
    getEvolutionChainData,
} from '../../services/pokemonDataCache';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';

const METHOD_ICON_MAP = {
    'walk': Footprints,
    'surf': Waves,
    'old-rod': Fish,
    'good-rod': Fish,
    'super-rod': Fish,
    'gift': Gift,
    'headbutt': Compass,
    'rock-smash': Hammer,
    'pokeflute': Music,
};

const VERSION_CONFIG = {
    'red': { label: 'Red', color: '#ef4444' },
    'blue': { label: 'Blue', color: '#3b82f6' },
    'yellow': { label: 'Yellow', color: '#eab308' },
    'gold': { label: 'Gold', color: '#d97706' },
    'silver': { label: 'Silver', color: '#9ca3af' },
    'crystal': { label: 'Crystal', color: '#22d3ee' },
    'ruby': { label: 'Ruby', color: '#b91c1c' },
    'sapphire': { label: 'Sapphire', color: '#1d4ed8' },
    'emerald': { label: 'Emerald', color: '#059669' },
    'firered': { label: 'FireRed', color: '#ea580c' },
    'leafgreen': { label: 'LeafGreen', color: '#16a34a' },
    'diamond': { label: 'Diamond', color: '#60a5fa' },
    'pearl': { label: 'Pearl', color: '#f472b6' },
    'platinum': { label: 'Platinum', color: '#9ca3af' },
    'heartgold': { label: 'HeartGold', color: '#d97706' },
    'soulsilver': { label: 'SoulSilver', color: '#9ca3af' },
    'black': { label: 'Black', color: '#1f2937' },
    'white': { label: 'White', color: '#7f8c8d', textDark: true },
    'black-2': { label: 'Black 2', color: '#111827' },
    'white-2': { label: 'White 2', color: '#bdc3c7', textDark: true },
    'x': { label: 'X', color: '#2563eb' },
    'y': { label: 'Y', color: '#dc2626' },
    'omega-ruby': { label: 'Omega Ruby', color: '#b91c1c' },
    'alpha-sapphire': { label: 'Alpha Sapphire', color: '#1d4ed8' },
    'sun': { label: 'Sun', color: '#f97316' },
    'moon': { label: 'Moon', color: '#6366f1' },
    'ultra-sun': { label: 'Ultra Sun', color: '#ea580c' },
    'ultra-moon': { label: 'Ultra Moon', color: '#4f46e5' },
    'lets-go-pikachu': { label: 'Let\'s Go Pikachu', color: '#eab308' },
    'lets-go-eevee': { label: 'Let\'s Go Eevee', color: '#b45309' },
    'sword': { label: 'Sword', color: '#06b6d4' },
    'shield': { label: 'Shield', color: '#db2777' },
    'brilliant-diamond': { label: 'Brilliant Diamond', color: '#60a5fa' },
    'shining-pearl': { label: 'Shining Pearl', color: '#f472b6' },
    'legends-arceus': { label: 'Legends: Arceus', color: '#1e3a8a' },
    'scarlet': { label: 'Scarlet', color: '#be123c' },
    'violet': { label: 'Violet', color: '#6d28d9' }
};

const VERSION_GROUPS = [
    { id: 'red-blue-yellow', name: 'Gen I (Red / Blue / Yellow)', versions: ['red', 'blue', 'yellow'] },
    { id: 'gold-silver-crystal', name: 'Gen II (Gold / Silver / Crystal)', versions: ['gold', 'silver', 'crystal'] },
    { id: 'ruby-sapphire-emerald', name: 'Gen III (Ruby / Sapphire / Emerald)', versions: ['ruby', 'sapphire', 'emerald'] },
    { id: 'firered-leafgreen', name: 'Gen III (FireRed / LeafGreen)', versions: ['firered', 'leafgreen'] },
    { id: 'diamond-pearl-platinum', name: 'Gen IV (Diamond / Pearl / Platinum)', versions: ['diamond', 'pearl', 'platinum'] },
    { id: 'heartgold-soulsilver', name: 'Gen IV (HeartGold / SoulSilver)', versions: ['heartgold', 'soulsilver'] },
    { id: 'black-white', name: 'Gen V (Black / White / Black 2 / White 2)', versions: ['black', 'white', 'black-2', 'white-2'] },
    { id: 'x-y', name: 'Gen VI (X / Y)', versions: ['x', 'y'] },
    { id: 'omega-ruby-alpha-sapphire', name: 'Gen VI (Omega Ruby / Alpha Sapphire)', versions: ['omega-ruby', 'alpha-sapphire'] },
    { id: 'sun-moon-ultra-sun-ultra-moon', name: 'Gen VII (Sun / Moon / Ultra Sun / Ultra Moon)', versions: ['sun', 'moon', 'ultra-sun', 'ultra-moon'] },
    { id: 'lets-go', name: 'Gen VII (Let\'s Go Pikachu / Eevee)', versions: ['lets-go-pikachu', 'lets-go-eevee'] },
    { id: 'sword-shield', name: 'Gen VIII (Sword / Shield)', versions: ['sword', 'shield'] },
    { id: 'brilliant-diamond-shining-pearl', name: 'Gen VIII (Brilliant Diamond / Shining Pearl)', versions: ['brilliant-diamond', 'shining-pearl'] },
    { id: 'legends-arceus', name: 'Gen VIII (Legends: Arceus)', versions: ['legends-arceus'] },
    { id: 'scarlet-violet', name: 'Gen IX (Scarlet / Violet)', versions: ['scarlet', 'violet'] }
];

const formatLocationName = (name) => {
    if (!name) return '';
    return name
        .replace(/-area$/i, '')
        .split('-')
        .map((word) => {
            const lower = word.toLowerCase();
            if (lower === '1f') return '1F';
            if (lower === '2f') return '2F';
            if (lower === '3f') return '3F';
            if (lower === '4f') return '4F';
            if (lower === '5f') return '5F';
            if (lower === 'b1f') return 'B1F';
            if (lower === 'b2f') return 'B2F';
            if (lower === 'b3f') return 'B3F';
            if (lower === 'b4f') return 'B4F';
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
};

export function PokedexView({
    pokemons,
    lastPokemonElementRef,
    isFetchingMore,
    searchInput,
    setSearchInput,
    selectedTypes,
    handleTypeSelection,
    selectedGeneration,
    setSelectedGeneration,
    generations,
    isInitialLoading,
    colors,
    favoritePokemons,
    onToggleFavoritePokemon,
    showOnlyFavorites,
    setShowOnlyFavorites,
    db,
    pokemonDetailsCache = {},
    setPokemonDetailsCache,
}) {
    const [searchParams, setSearchParams] = useSearchParams();
    const pokemonQueryParam = searchParams.get('pokemon');

    const [selectedPokemon, setSelectedPokemon] = useState(null);
    const [selectedPokemonDetails, setSelectedPokemonDetails] = useState(null);
    const [encounters, setEncounters] = useState([]);
    const [isEncountersLoading, setIsEncountersLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('data'); // 'data' | 'locations'
    const [locationsVersionFilter, setLocationsVersionFilter] = useState('all');
    const [showShiny, setShowShiny] = useState(false);
    const [evolutionDetails, setEvolutionDetails] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    const displayedPokemons = useMemo(() => {
        return showOnlyFavorites
            ? pokemons.filter((pokemon) => favoritePokemons.has(pokemon.id))
            : pokemons;
    }, [pokemons, showOnlyFavorites, favoritePokemons]);

    const selectedTypeCount = selectedTypes.size;

    // Detect mobile view size
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sync deep-linked Pokémon
    useEffect(() => {
        if (!pokemonQueryParam || pokemons.length === 0) return;

        let cancelled = false;
        const loadParamPokemon = async () => {
            const id = Number.parseInt(pokemonQueryParam, 10);
            let found = null;
            if (Number.isInteger(id)) {
                found = pokemons.find((p) => p.id === id);
            } else {
                found = pokemons.find((p) => p.name.toLowerCase() === pokemonQueryParam.toLowerCase());
            }

            if (found) {
                setSelectedPokemon(found);
                return;
            }

            // Fetch detail dynamically if not preloaded in list yet
            try {
                let details = null;
                if (Number.isInteger(id)) {
                    details = await getStaticPokemonDetail(id);
                    if (!details) {
                        const apiData = await getPokemonApiData(id);
                        if (apiData) {
                            details = {
                                id: apiData.id,
                                name: apiData.name,
                                types: apiData.types?.map((t) => t.type?.name) || [],
                                sprite: apiData.sprites?.other?.['official-artwork']?.front_default || apiData.sprites?.front_default,
                            };
                        }
                    }
                } else {
                    const apiData = await getPokemonApiData(pokemonQueryParam.toLowerCase());
                    if (apiData) {
                        details = {
                            id: apiData.id,
                            name: apiData.name,
                            types: apiData.types?.map((t) => t.type?.name) || [],
                            sprite: apiData.sprites?.other?.['official-artwork']?.front_default || apiData.sprites?.front_default,
                        };
                    }
                }

                if (cancelled) return;
                if (details) {
                    setSelectedPokemon(details);
                }
            } catch (err) {
                console.error('Failed to load deep-linked pokemon', err);
            }
        };

        loadParamPokemon();
        return () => {
            cancelled = true;
        };
    }, [pokemonQueryParam, pokemons]);

    // Close details panel when query parameter is cleared
    useEffect(() => {
        if (!pokemonQueryParam) {
            setSelectedPokemon(null);
            setSelectedPokemonDetails(null);
            setEvolutionDetails([]);
            setEncounters([]);
        }
    }, [pokemonQueryParam]);

    // Load encounters and full details for selected Pokémon
    useEffect(() => {
        if (!selectedPokemon) return;

        let cancelled = false;
        const loadDetailsAndEncounters = async () => {
            setIsEncountersLoading(true);
            setEncounters([]);
            setEvolutionDetails([]);
            setLocationsVersionFilter('all');

            try {
                let details = null;
                if (pokemonDetailsCache && pokemonDetailsCache[selectedPokemon.id]) {
                    details = pokemonDetailsCache[selectedPokemon.id];
                } else if (selectedPokemon.stats && selectedPokemon.abilities) {
                    details = selectedPokemon;
                    setPokemonDetailsCache?.((prev) => ({ ...prev, [selectedPokemon.id]: selectedPokemon }));
                } else {
                    if (db) {
                        const docRef = doc(db, 'artifacts/pokemonTeamBuilder/pokemons', String(selectedPokemon.id));
                        const docSnap = await getDoc(docRef);
                        if (docSnap.exists()) {
                            details = docSnap.data();
                        }
                    }
                    if (!details) {
                        details = await getStaticPokemonDetail(selectedPokemon.id);
                    }
                    if (!details) {
                        const apiData = await getPokemonApiData(selectedPokemon.id);
                        if (apiData) {
                            details = {
                                id: apiData.id,
                                name: apiData.name,
                                types: apiData.types?.map((t) => t.type?.name) || [],
                                sprite: apiData.sprites?.other?.['official-artwork']?.front_default || apiData.sprites?.front_default,
                            };
                        }
                    }
                    if (details) {
                        setPokemonDetailsCache?.((prev) => ({ ...prev, [selectedPokemon.id]: details }));
                    }
                }

                if (cancelled) return;
                setSelectedPokemonDetails(details || selectedPokemon);

                const encounterData = await getPokemonEncountersData(selectedPokemon.id);
                if (cancelled) return;
                setEncounters(encounterData || []);
            } catch (err) {
                console.error('Failed to load encounters data', err);
            } finally {
                if (!cancelled) {
                    setIsEncountersLoading(false);
                }
            }
        };

        loadDetailsAndEncounters();

        return () => {
            cancelled = true;
        };
    }, [selectedPokemon, db, pokemonDetailsCache, setPokemonDetailsCache]);

    // Load evolution chain details
    useEffect(() => {
        if (!selectedPokemonDetails || !selectedPokemonDetails.evolution_chain_url) {
            setEvolutionDetails([]);
            return undefined;
        }

        let cancelled = false;

        const fetchEvolutionChain = async () => {
            try {
                const data = await getEvolutionChainData(selectedPokemonDetails.evolution_chain_url);
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
                    if (pokemonDetailsCache && pokemonDetailsCache[id]) {
                        return pokemonDetailsCache[id];
                    }

                    const staticDetail = await getStaticPokemonDetail(id);
                    if (staticDetail) {
                        setPokemonDetailsCache?.((prev) => ({ ...prev, [id]: staticDetail }));
                        return staticDetail;
                    }

                    if (!db) return { name: evo.name, id: Number(id), sprite: POKEBALL_PLACEHOLDER_URL };

                    const docRef = doc(db, 'artifacts/pokemonTeamBuilder/pokemons', id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const detail = docSnap.data();
                        setPokemonDetailsCache?.((prev) => ({ ...prev, [id]: detail }));
                        return detail;
                    }

                    return { name: evo.name, id: Number(id), sprite: POKEBALL_PLACEHOLDER_URL };
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
    }, [selectedPokemonDetails, db, pokemonDetailsCache, setPokemonDetailsCache]);

    const handleSelectPokemon = (pokemon) => {
        setSelectedPokemon(pokemon);
        setSearchParams({ pokemon: String(pokemon.id) });
    };

    const handleCloseDetails = () => {
        setSelectedPokemon(null);
        setSelectedPokemonDetails(null);
        setSearchParams({});
    };

    const activeIndex = useMemo(() => {
        if (!selectedPokemon) return -1;
        return displayedPokemons.findIndex((p) => p.id === selectedPokemon.id);
    }, [selectedPokemon, displayedPokemons]);

    const handlePrevPokemon = () => {
        if (activeIndex > 0) {
            handleSelectPokemon(displayedPokemons[activeIndex - 1]);
        } else if (selectedPokemonDetails && selectedPokemonDetails.id > 1) {
            handleSelectPokemon({ id: selectedPokemonDetails.id - 1 });
        }
    };

    const handleNextPokemon = () => {
        if (activeIndex !== -1 && activeIndex < displayedPokemons.length - 1) {
            handleSelectPokemon(displayedPokemons[activeIndex + 1]);
        } else if (selectedPokemonDetails) {
            handleSelectPokemon({ id: selectedPokemonDetails.id + 1 });
        }
    };

    // Calculate weaknesses
    const pokemonWeaknesses = useMemo(() => {
        return getPokemonWeaknessEntries(selectedPokemonDetails?.types || []);
    }, [selectedPokemonDetails]);

    // Group encounters by Generation / Version Group
    const groupedEncounters = useMemo(() => {
        if (!encounters || encounters.length === 0) return [];

        const groups = VERSION_GROUPS.map((vg) => ({
            ...vg,
            items: [],
        }));
        const otherGroup = { id: 'other', name: 'Other Versions', versions: [], items: [] };

        encounters.forEach((encounterItem) => {
            const locationName = formatLocationName(encounterItem.location_area.name);

            encounterItem.version_details.forEach((vd) => {
                const versionName = vd.version.name;
                const matchGroup = groups.find((g) => g.versions.includes(versionName));

                const details = vd.encounter_details.map((ed) => {
                    return {
                        method: ed.method.name.replace('-', ' '),
                        methodKey: ed.method.name,
                        chance: ed.chance,
                        minLevel: ed.min_level,
                        maxLevel: ed.max_level,
                    };
                });

                const encounterEntry = {
                    location: locationName,
                    version: versionName,
                    details: details,
                };

                if (matchGroup) {
                    matchGroup.items.push(encounterEntry);
                } else {
                    otherGroup.items.push(encounterEntry);
                }
            });
        });

        const activeGroups = groups.filter((g) => g.items.length > 0);
        if (otherGroup.items.length > 0) {
            activeGroups.push(otherGroup);
        }

        return activeGroups.map((group) => {
            const aggregated = [];
            group.items.forEach((item) => {
                const existing = aggregated.find((agg) => agg.location === item.location);
                if (existing) {
                    const existingVer = existing.versions.find((v) => v.name === item.version);
                    if (!existingVer) {
                        existing.versions.push({ name: item.version, details: item.details });
                    }
                } else {
                    aggregated.push({
                        location: item.location,
                        versions: [{ name: item.version, details: item.details }],
                    });
                }
            });

            return {
                ...group,
                locations: aggregated,
            };
        });
    }, [encounters]);

    // Unique version names available for this Pokémon's catch locations
    const availableVersions = useMemo(() => {
        if (!encounters || encounters.length === 0) return [];
        const versionsSet = new Set();
        encounters.forEach((item) => {
            item.version_details.forEach((vd) => {
                versionsSet.add(vd.version.name);
            });
        });
        return Array.from(versionsSet).sort();
    }, [encounters]);

    // Filtered Grouped Encounters by locationsVersionFilter
    const filteredGroupedEncounters = useMemo(() => {
        if (locationsVersionFilter === 'all') return groupedEncounters;

        return groupedEncounters
            .map((group) => {
                const filteredLocations = group.locations
                    .map((loc) => {
                        const filteredVersions = loc.versions.filter((v) => v.name === locationsVersionFilter);
                        return {
                            ...loc,
                            versions: filteredVersions,
                        };
                    })
                    .filter((loc) => loc.versions.length > 0);

                return {
                    ...group,
                    locations: filteredLocations,
                };
            })
            .filter((group) => group.locations.length > 0);
    }, [groupedEncounters, locationsVersionFilter]);

    const spriteToShow = useMemo(() => {
        if (!selectedPokemonDetails) return POKEBALL_PLACEHOLDER_URL;
        return showShiny
            ? (selectedPokemonDetails.animatedShinySprite || selectedPokemonDetails.shinySprite || selectedPokemonDetails.sprite)
            : (selectedPokemonDetails.animatedSprite || selectedPokemonDetails.sprite);
    }, [selectedPokemonDetails, showShiny]);

    // Render detailed content (Data or Locations tabs)
    const renderDetailsContent = () => {
        if (!selectedPokemonDetails) return null;

        if (activeTab === 'data') {
            return (
                <div className="flex-1 flex flex-col space-y-4 animate-scale-in">
                    {/* Sprite & Stats Layout - Side-by-side row on desktop, stacked on mobile */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.3fr] gap-4 items-stretch">
                        {/* Profile Card */}
                        <div className="text-center p-4 bg-surface rounded-xl border border-border flex flex-col justify-between items-center">
                            <div className="w-full flex-1 flex flex-col justify-center items-center py-2">
                                <div className="relative inline-block">
                                    <img
                                        src={spriteToShow}
                                        alt={selectedPokemonDetails.name}
                                        className="mx-auto h-24 w-24 sm:h-28 sm:w-28 image-pixelated hover:scale-105 transition-transform duration-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowShiny((value) => !value)}
                                        className={`absolute -bottom-2 -right-4 rounded-full p-1.5 transition-all duration-200 hover:scale-110 active:scale-95 border ${showShiny ? 'bg-accent text-bg border-accent' : 'bg-surface-raised text-fg border-border'}`}
                                        title="Toggle Shiny"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </button>
                                    {onToggleFavoritePokemon && (
                                        <button
                                            type="button"
                                            onClick={() => onToggleFavoritePokemon(selectedPokemonDetails.id)}
                                            className={`absolute -bottom-2 -left-4 rounded-full p-1.5 transition-all duration-200 hover:scale-110 active:scale-95 border ${favoritePokemons.has(selectedPokemonDetails.id) ? 'bg-accent-soft text-accent border-accent-soft' : 'bg-surface-raised text-muted border-border'}`}
                                            title={favoritePokemons.has(selectedPokemonDetails.id) ? 'Remove from favorites' : 'Add to favorites'}
                                        >
                                            <Star className={`w-4.5 h-4.5 ${favoritePokemons.has(selectedPokemonDetails.id) ? 'fill-[#FBBF24] text-[#FBBF24]' : 'text-muted'}`} />
                                        </button>
                                    )}
                                </div>
                                <h3 className="mt-3.5 text-xl font-extrabold capitalize text-fg tracking-tight">
                                    {selectedPokemonDetails.name} <span className="text-muted font-normal text-base">#{selectedPokemonDetails.id}</span>
                                </h3>
                                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                                    {selectedPokemonDetails.types?.map((type) => (
                                        <TypeBadge key={type} type={type} colors={colors} />
                                    ))}
                                </div>
                            </div>
                            
                            <div className="mt-4 w-full border-t border-border pt-3">
                                <h4 className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted">Abilities</h4>
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {selectedPokemonDetails.abilities?.map((ability, idx) => (
                                        <AbilityChip key={idx} ability={ability} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Base Stats Card */}
                        <div className="rounded-xl bg-surface p-4 border border-border flex flex-col justify-between">
                            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted">Base Stats</h4>
                            <div className="space-y-2 flex-1 flex flex-col justify-center">
                                {selectedPokemonDetails.stats?.map((stat) => (
                                    <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Weaknesses Card */}
                    <div className="rounded-xl bg-surface p-4 border border-border">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Weaknesses</h4>
                            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted border border-border">
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
                            <p className="text-center text-xs text-muted sm:text-left">No major weaknesses.</p>
                        )}
                    </div>

                    {/* Evolution Line Card */}
                    {evolutionDetails.length > 1 && (
                        <div className="rounded-xl bg-surface p-4 border border-border">
                            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted">Evolution Line</h4>
                            <div className="overflow-x-auto custom-scrollbar pb-1">
                                <div className="flex min-w-max items-center gap-2 px-1 justify-center">
                                    {evolutionDetails.map((evo, index) => (
                                        <React.Fragment key={evo.name}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelectPokemon(evo)}
                                                className={`min-w-[5.5rem] text-center p-2 rounded-xl transition-all border ${selectedPokemonDetails.id === evo.id ? 'bg-primary-soft border-primary' : 'bg-surface-raised border-border hover:bg-surface-raised/80 hover:border-border'}`}
                                            >
                                                <img
                                                    src={evo.sprite || POKEBALL_PLACEHOLDER_URL}
                                                    alt={evo.name}
                                                    className="h-12 w-12 mx-auto image-pixelated"
                                                />
                                                <p className="text-xs font-bold text-fg capitalize mt-1 truncate max-w-[80px]">
                                                    {evo.name}
                                                </p>
                                            </button>
                                            {index < evolutionDetails.length - 1 && <span className="text-muted text-base">➔</span>}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Locations Tab
        return (
            <div className="flex-1 flex flex-col space-y-4 animate-scale-in">
                {/* Header Title */}
                <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h4 className="text-base font-bold text-fg">Where to Catch</h4>
                </div>

                {/* Game Version Filter Selector */}
                {availableVersions.length > 0 && (
                    <div className="flex items-center justify-between gap-4 bg-surface p-3 rounded-xl border border-border">
                        <label htmlFor="locations-version-filter" className="text-xs font-bold text-muted uppercase tracking-wider">
                            Filter by Game:
                        </label>
                        <div className="relative min-w-[150px]">
                            <select
                                id="locations-version-filter"
                                value={locationsVersionFilter}
                                onChange={(e) => setLocationsVersionFilter(e.target.value)}
                                className="team-builder-field team-builder-field--compact team-builder-select w-full"
                            >
                                <option value="all">All Games</option>
                                {availableVersions.map((vName) => {
                                    const conf = VERSION_CONFIG[vName] || { label: vName.replace('-', ' ') };
                                    return (
                                        <option key={vName} value={vName}>
                                            {conf.label}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>
                )}

                {isEncountersLoading ? (
                    <div className="flex-1 flex items-center justify-center py-16">
                        <div className="team-builder-spinner" aria-hidden="true"></div>
                    </div>
                ) : filteredGroupedEncounters.length > 0 ? (
                    <div className="custom-scrollbar overflow-y-auto pr-1 flex-1 max-h-[60vh] space-y-3">
                        {filteredGroupedEncounters.map((group) => (
                            <div key={group.id} className="locations-version-group border border-border bg-surface p-4 rounded-2xl">
                                <h5 className="locations-version-group__title text-xs font-extrabold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-3">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>{group.name}</span>
                                </h5>
                                
                                {/* 2-COLUMN GRID FOR LOCATIONS */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                    {group.locations.map((loc, idx) => (
                                        <div key={idx} className="locations-item border border-border p-3.5 rounded-xl bg-bg">
                                            {/* Location header */}
                                            <div className="flex items-center gap-2 border-b border-border pb-2 mb-3">
                                                <MapPin className="w-4 h-4 text-primary shrink-0" />
                                                <span className="font-extrabold text-fg text-sm truncate">{loc.location}</span>
                                            </div>

                                            {/* Version row list */}
                                            <div className="space-y-2">
                                                {loc.versions.map((ver) => {
                                                    const conf = VERSION_CONFIG[ver.name] || { label: ver.name.replace('-', ' '), color: '#7f8c8d' };
                                                    const borderVal = `${conf.color}55`; // ~33% opacity
                                                    const bgVal = `${conf.color}18`; // ~10% opacity
                                                    const textVal = conf.color;

                                                    const distinctDetails = ver.details.reduce((acc, current) => {
                                                        const key = `${current.methodKey}-${current.minLevel}-${current.maxLevel}`;
                                                        if (!acc.has(key)) {
                                                            acc.set(key, current);
                                                        }
                                                        return acc;
                                                    }, new Map()).values();

                                                    return Array.from(distinctDetails).map((detail, dIdx) => {
                                                        const IconComp = METHOD_ICON_MAP[detail.methodKey] || Compass;
                                                        return (
                                                            <div key={`${ver.name}-${dIdx}`} className="flex flex-wrap items-center justify-between gap-3 py-1.5 px-3 rounded-lg bg-surface border border-border transition-colors">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <span
                                                                        className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border shrink-0 text-center"
                                                                        style={{
                                                                            borderColor: borderVal,
                                                                            backgroundColor: bgVal,
                                                                            color: textVal
                                                                        }}
                                                                    >
                                                                        {conf.label}
                                                                    </span>
                                                                    <span className="flex items-center gap-1.5 text-xs text-muted truncate">
                                                                        <IconComp className="w-3.5 h-3.5 text-muted shrink-0" />
                                                                        <span className="capitalize">{detail.method}</span>
                                                                    </span>
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className="text-[10px] font-semibold bg-bg px-2 py-0.5 rounded border border-border text-muted">
                                                                        {detail.minLevel === detail.maxLevel ? `Lv. ${detail.minLevel}` : `Lv. ${detail.minLevel}-${detail.maxLevel}`}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-primary">{detail.chance}%</span>
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
                        <h5 className="font-bold text-fg mb-1">Not Found in the Wild</h5>
                        <p className="text-xs text-muted max-w-sm mx-auto">
                            This Pokémon cannot be encountered in the wild. It may be a starter, a gift, an evolution-only form, a legendary, or a transfer-only Pokémon.
                        </p>
                    </div>
                )}
            </div>
        );
    };

    // --- MOBILE VIEW TEMPLATE ---
    if (isMobile && selectedPokemon) {
        return (
            <main className="team-builder bg-surface min-h-screen flex flex-col relative pb-10">
                {/* Mobile Navigation Header */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface sticky top-0 z-10 shadow-sm">
                    <button
                        type="button"
                        onClick={handleCloseDetails}
                        className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg transition-colors px-3 py-2 rounded-xl bg-surface-raised border border-border"
                    >
                        <ChevronLeft className="w-4 h-4 text-muted" />
                        <span>Exit</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrevPokemon}
                            className="p-2.5 rounded-xl bg-surface-raised border border-border hover:bg-surface-raised/85 hover:text-fg text-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={activeIndex <= 0 && selectedPokemonDetails?.id <= 1}
                            title="Previous Pokémon"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-muted bg-surface-raised border border-border px-3 py-2 rounded-xl min-w-[70px] text-center">
                            {activeIndex !== -1 ? `${activeIndex + 1}/${displayedPokemons.length}` : `#${selectedPokemonDetails?.id || ''}`}
                        </span>
                        <button
                            type="button"
                            onClick={handleNextPokemon}
                            className="p-2.5 rounded-xl bg-surface-raised border border-border hover:bg-surface-raised/85 hover:text-fg text-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={activeIndex !== -1 && activeIndex >= displayedPokemons.length - 1}
                            title="Next Pokémon"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Sub-tabs system */}
                <div className="px-4 pt-4 flex-1 flex flex-col">
                    <div className="flex border-b border-border mb-4">
                        <button
                            type="button"
                            onClick={() => setActiveTab('data')}
                            className={`flex-1 pb-2.5 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'data' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg'}`}
                        >
                            <Activity className="w-4 h-4" />
                            <span>Stats & Data</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('locations')}
                            className={`flex-1 pb-2.5 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'locations' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg'}`}
                        >
                            <MapPin className="w-4 h-4" />
                            <span>Catch Locations</span>
                        </button>
                    </div>

                    <div className="flex-1 pb-6 overflow-y-auto">
                        {renderDetailsContent()}
                    </div>
                </div>
            </main>
        );
    }

    // --- DESKTOP VIEW TEMPLATE (Width >= 1024px, or Mobile with NO selection) ---
    return (
        <main className="team-builder grid grid-cols-1 relative">
            <div className={`grid gap-5 ${selectedPokemon ? 'grid-cols-1 lg:grid-cols-[1.35fr_1.65fr]' : 'grid-cols-1'}`}>
                {/* Left Side: Standard Pokédex Picker Grid */}
                <section className="team-builder-panel team-builder-panel--picker p-4">
                    <div className="team-builder-panel__header team-builder-panel__header--picker team-builder-panel__header--compact">
                        <div className="team-builder-picker-heading-row team-builder-picker-heading-row--compact min-w-0">
                            <h2 className="team-builder-panel__title team-builder-panel__title--compact">Pokédex</h2>
                            <span className="team-builder-panel__meta team-builder-panel__meta--compact">{displayedPokemons.length}</span>
                        </div>
                    </div>

                    <div className="team-builder-picker-toolbar team-builder-picker-toolbar--compact mt-3">
                        <div className="team-builder-picker-focus" role="group" aria-label="Type focus">
                            <div className="team-builder-type-grid team-builder-type-grid--compact">
                                {Object.keys(typeColors).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => handleTypeSelection(type)}
                                        className={`team-builder-type-button team-builder-type-button--compact ${selectedTypes.has(type) ? 'is-active' : ''}`}
                                        title={type}
                                        aria-pressed={selectedTypes.has(type)}
                                    >
                                        <img src={typeIcons[type]} alt={type} className="w-full h-full object-contain" />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <span className="team-builder-picker-summary">{selectedTypeCount === 0 ? 'All types' : `${selectedTypeCount} active`}</span>
                    </div>

                    <div className="team-builder-unified-toolbar mt-3">
                        <div className="team-builder-search-wrap">
                            <span className="team-builder-search-icon" aria-hidden="true">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="team-builder-field team-builder-field--compact team-builder-search-input"
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={() => setSearchInput('')}
                                    className="team-builder-search-clear"
                                    aria-label="Clear search"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="team-builder-select-wrap">
                            <select
                                value={selectedGeneration}
                                onChange={(e) => setSelectedGeneration(e.target.value)}
                                className="team-builder-field team-builder-field--compact team-builder-select"
                                aria-label="Generation filter"
                            >
                                <option value="all">All generations</option>
                                {generations.map((generation) => (
                                    <option key={generation} value={generation} className="capitalize">
                                        {generation.replace('-', ' ')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                            className={`team-builder-toggle team-builder-toggle--compact ${showOnlyFavorites ? 'is-active' : ''}`}
                            aria-pressed={showOnlyFavorites}
                        >
                            <Star className={`w-4 h-4 ${showOnlyFavorites ? 'fill-[#FBBF24] text-[#FBBF24]' : 'text-muted'}`} />
                            <span>{showOnlyFavorites ? 'Favorites' : 'All'}</span>
                        </button>
                    </div>

                    <div className="team-builder-results mt-4">
                        {isInitialLoading ? (
                            <div className="team-builder-spinner-wrap h-full">
                                <div className="team-builder-spinner" aria-hidden="true"></div>
                            </div>
                        ) : (
                            <div className="team-builder-results__scroll custom-scrollbar">
                                <div className={`team-builder-results__grid grid gap-4 p-1 py-4 ${selectedPokemon ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8'}`}>
                                    {displayedPokemons.map((pokemon, index) => (
                                        <PokemonCard
                                            key={pokemon.id}
                                            details={pokemon}
                                            onCardClick={handleSelectPokemon}
                                            lastRef={index === displayedPokemons.length - 1 ? lastPokemonElementRef : null}
                                            colors={colors}
                                            isFavorite={favoritePokemons.has(pokemon.id)}
                                            onToggleFavorite={onToggleFavoritePokemon}
                                            isSelected={selectedPokemon?.id === pokemon.id}
                                        />
                                    ))}
                                </div>

                                {isFetchingMore && (
                                    <div className="team-builder-spinner-wrap py-4">
                                        <div className="team-builder-spinner team-builder-spinner--small" aria-hidden="true"></div>
                                    </div>
                                )}

                                {displayedPokemons.length === 0 && !isInitialLoading && (
                                    <div className="px-2 pb-4">
                                        <EmptyState
                                            compact
                                            title={showOnlyFavorites ? 'No favorites match' : 'No Pokémon found'}
                                            message={showOnlyFavorites ? 'Try clearing filters or favoriting more Pokémon.' : 'Try a different search, generation, or type.'}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* Right Side: Split details view (Desktop only, displayed when selectedPokemon is set) */}
                {selectedPokemon && (
                    <section className="team-builder-panel p-5 md:p-6 relative flex flex-col min-h-[400px]">
                        <button
                            onClick={handleCloseDetails}
                            type="button"
                            aria-label="Close details panel"
                            className="absolute top-4 right-4 text-muted hover:text-fg hover:rotate-90 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex border-b border-border mb-4">
                            <button
                                type="button"
                                onClick={() => setActiveTab('data')}
                                className={`flex-1 pb-2.5 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'data' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted hover:text-fg'}`}
                            >
                                <Activity className="w-4 h-4" />
                                <span>Stats & Data</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('locations')}
                                className={`flex-1 pb-2.5 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'locations' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted hover:text-fg'}`}
                            >
                                <MapPin className="w-4 h-4" />
                                <span>Catch Locations</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[75vh]">
                            {renderDetailsContent()}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}