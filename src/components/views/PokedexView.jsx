import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useTranslation } from '../../hooks/useTranslation';
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
    Info,
    Swords,
    Image as ImageIcon,
    Database,
    Zap,
    HandFist
} from 'lucide-react';

import '../../styles/team-builder-view.css';
import '../../styles/locations-view.css';
import { typeColors, typeIcons } from '../../constants/types';
import { EmptyState } from '../EmptyState';
import { PokemonCard } from '../PokemonCard';
import { Sprite } from '../Sprite';
import { StarIcon } from '../icons';
import { AbilityChip } from '../AbilityChip';
import { StatBar } from '../StatBar';
import { TypeBadge } from '../TypeBadge';

import {
    getPokemonEncountersData,
    getStaticPokemonDetail,
    getPokemonApiData,
    getEvolutionChainData,
    getPokemonSpeciesData,
    getMoveDetails,
    getMachineDetails,
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

const PhysicalIcon = () => (
    <svg className="w-5 h-4 inline-block text-[#ef4444]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l1.5 4.5 4.5-1.5-1.5 4.5 4.5 1.5-4.5 1.5 1.5 4.5-4.5-1.5-1.5 4.5-1.5-4.5-4.5 1.5 1.5-4.5-4.5-1.5 4.5-1.5-1.5-4.5 4.5 1.5z" />
    </svg>
);

const SpecialIcon = () => (
    <svg className="w-5 h-4 inline-block text-[#3b82f6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
);

const StatusIcon = () => (
    <svg className="w-5 h-4 inline-block text-[#9ca3af]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4a8 8 0 0 1 0 16" fill="currentColor" opacity="0.3" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
);

const formatTmName = (tmName) => {
    if (!tmName) return '—';
    const match = tmName.match(/^(tm|hm|tr)(\d+)$/i);
    if (match) {
        const [_, type, num] = match;
        if (type.toLowerCase() === 'tm') return num;
        return `${type.toUpperCase()}${num}`;
    }
    return tmName.toUpperCase();
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

const POKEDEX_NAME_MAP = {
    'national': 'National',
    'kanto': 'Red/Blue/Yellow',
    'original-johto': 'Gold/Silver/Crystal',
    'hoenn': 'Ruby/Sapphire/Emerald',
    'updated-hoenn': 'Omega Ruby/Alpha Sapphire',
    'original-sinnoh': 'Diamond/Pearl/Platinum',
    'extended-sinnoh': 'Platinum',
    'updated-sinnoh': 'Brilliant Diamond/Shining Pearl',
    'original-unova': 'Black/White',
    'updated-unova': 'Black 2/White 2',
    'kalos-central': 'X/Y — Central Kalos',
    'kalos-coastal': 'X/Y — Coastal Kalos',
    'kalos-mountain': 'X/Y — Mountain Kalos',
    'original-alola': 'Sun/Moon',
    'updated-alola': 'Ultra Sun/Ultra Moon',
    'original-melemele': 'Sun/Moon (Melemele)',
    'original-akala': 'Sun/Moon (Akala)',
    'original-ulaula': 'Sun/Moon (Ula\'ula)',
    'original-poni': 'Sun/Moon (Poni)',
    'updated-melemele': 'Ultra Sun/Ultra Moon (Melemele)',
    'updated-akala': 'Ultra Sun/Ultra Moon (Akala)',
    'updated-ulaula': 'Ultra Sun/Ultra Moon (Ula\'ula)',
    'updated-poni': 'Ultra Sun/Ultra Moon (Poni)',
    'letsgo-kanto': 'Let\'s Go Pikachu/Eevee',
    'galar': 'Sword/Shield',
    'isle-of-armor': 'The Isle of Armor',
    'crown-tundra': 'The Crown Tundra',
    'hisui': 'Legends: Arceus',
    'paldea': 'Scarlet/Violet',
    'kitakami': 'The Teal Mask',
    'blueberry': 'The Indigo Disk'
};

const MobilePokedexPokemonCard = ({
    pokemon,
    onCardClick,
    isFavorite,
    onToggleFavorite,
    lastRef,
}) => {
    const { t, language } = useTranslation();
    const handleCardClick = () => {
        onCardClick?.(pokemon);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onCardClick?.(pokemon);
        }
    };

    const handleFavoriteClick = (event) => {
        event.stopPropagation();
        onToggleFavorite?.(pokemon.id);
    };

    return (
        <article
            ref={lastRef}
            role="button"
            tabIndex={0}
            aria-label={`View details for ${pokemon.name}`}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            className="team-builder-mobile-card"
        >
            <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                    {pokemon.types.map((type) => (
                        <img
                            key={type}
                            src={typeIcons[type]}
                            alt={type}
                            className="h-4 w-4 rounded-full"
                        />
                    ))}
                </div>
                <button
                    onClick={handleFavoriteClick}
                    className={`team-builder-mobile-card__favorite ${isFavorite ? 'is-active' : ''}`}
                    aria-label={isFavorite ? `Remove ${pokemon.name} from favorites` : `Add ${pokemon.name} to favorites`}
                    title={isFavorite ? t('common.remove') : (language === 'pt' ? 'Adicionar aos favoritos' : 'Add to favorites')}
                >
                    <StarIcon className="w-3.5 h-3.5" isFavorite={isFavorite} color="currentColor" />
                </button>
            </div>

            <div className="team-builder-mobile-card__media">
                <div className="mx-auto aspect-square w-full max-w-[84px]">
                    <Sprite src={pokemon.sprite} alt={pokemon.name} className="h-full w-full" />
                </div>
            </div>

            <div className="mt-0">
                <p className="team-builder-mobile-card__name font-bold capitalize">
                    {pokemon.name}
                </p>
            </div>
        </article>
    );
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
    const { t, language } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const pokemonQueryParam = searchParams.get('pokemon');

    const [selectedPokemon, setSelectedPokemon] = useState(null);
    const [selectedPokemonDetails, setSelectedPokemonDetails] = useState(null);
    const [fullApiData, setFullApiData] = useState(null);
    const [speciesData, setSpeciesData] = useState(null);
    const [encounters, setEncounters] = useState([]);
    const [isEncountersLoading, setIsEncountersLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('data'); // 'data' | 'locations' | 'moves' | 'sprites'
    const [locationsVersionFilter, setLocationsVersionFilter] = useState('all');
    const [showShiny, setShowShiny] = useState(false);
    const [evolutionDetails, setEvolutionDetails] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    // Moves State
    const [resolvedMoves, setResolvedMoves] = useState({ levelUp: [], machine: [] });
    const [selectedMoveVersion, setSelectedMoveVersion] = useState('');
    const [isMovesLoading, setIsMovesLoading] = useState(false);

    // Sprite customization state
    const [customSelectedSprite, setCustomSelectedSprite] = useState(null);

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
            setFullApiData(null);
            setSpeciesData(null);
            setEvolutionDetails([]);
            setEncounters([]);
            setCustomSelectedSprite(null);
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
            setFullApiData(null);
            setSpeciesData(null);
            setCustomSelectedSprite(null);
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

                // Load Full API Data
                const apiData = await getPokemonApiData(selectedPokemon.id);
                if (cancelled) return;
                setFullApiData(apiData);

                // Load Species Data
                const specData = await getPokemonSpeciesData(selectedPokemon.id);
                if (cancelled) return;
                setSpeciesData(specData);

                // Load Encounters
                const encounterData = await getPokemonEncountersData(selectedPokemon.id);
                if (cancelled) return;
                setEncounters(encounterData || []);
            } catch (err) {
                console.error('Failed to load details and encounters data', err);
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

    // List of unique version groups available for this Pokémon's moves
    const availableMoveVersions = useMemo(() => {
        if (!fullApiData || !fullApiData.moves) return [];
        const versions = new Set();
        fullApiData.moves.forEach((m) => {
            m.version_group_details.forEach((vgd) => {
                versions.add(vgd.version_group.name);
            });
        });
        return Array.from(versions).sort();
    }, [fullApiData]);

    // Set default version group for moves
    useEffect(() => {
        if (availableMoveVersions.length > 0) {
            const preferred = ['scarlet-violet', 'legends-arceus', 'sword-shield', 'sun-moon', 'x-y', 'black-white', 'heartgold-soulsilver', 'platinum'];
            const found = preferred.find((p) => availableMoveVersions.includes(p));
            setSelectedMoveVersion(found || availableMoveVersions[availableMoveVersions.length - 1]);
        } else {
            setSelectedMoveVersion('');
        }
    }, [availableMoveVersions]);

    // Fetch details for filtered moves
    useEffect(() => {
        if (!fullApiData || !selectedMoveVersion) {
            setResolvedMoves({ levelUp: [], machine: [] });
            return;
        }

        let cancelled = false;
        const resolveMoves = async () => {
            setIsMovesLoading(true);
            try {
                const filteredMoves = [];
                fullApiData.moves.forEach((m) => {
                    const detail = m.version_group_details.find((vgd) => vgd.version_group.name === selectedMoveVersion);
                    if (detail) {
                        filteredMoves.push({
                            name: m.move.name,
                            url: m.move.url,
                            learnMethod: detail.move_learn_method.name,
                            level: detail.level_learned_at,
                        });
                    }
                });

                const promises = filteredMoves.map(async (fm) => {
                    const moveDetails = await getMoveDetails(fm.url, fm.name);
                    let tmName = '';
                    if (fm.learnMethod === 'machine' && moveDetails?.machines) {
                        const machEntry = moveDetails.machines.find(
                            (mach) => mach.version_group.name === selectedMoveVersion
                        );
                        if (machEntry?.machine?.url) {
                            try {
                                const machDetails = await getMachineDetails(machEntry.machine.url);
                                tmName = machDetails?.item?.name || '';
                            } catch (e) {
                                console.error('Failed to load machine details', e);
                            }
                        }
                    }
                    return {
                        ...fm,
                        type: moveDetails?.type || 'normal',
                        power: moveDetails?.power,
                        accuracy: moveDetails?.accuracy,
                        damageClass: moveDetails?.damage_class || 'physical',
                        pp: moveDetails?.pp,
                        tmName,
                    };
                });

                const resolved = await Promise.all(promises);
                if (cancelled) return;

                const levelUp = resolved
                    .filter((m) => m.learnMethod === 'level-up')
                    .sort((a, b) => a.level - b.level);

                const machine = resolved
                    .filter((m) => m.learnMethod === 'machine')
                    .sort((a, b) => a.name.localeCompare(b.name));

                setResolvedMoves({ levelUp, machine });
            } catch (err) {
                console.error('Failed to resolve moves', err);
            } finally {
                if (!cancelled) {
                    setIsMovesLoading(false);
                }
            }
        };

        resolveMoves();

        return () => {
            cancelled = true;
        };
    }, [fullApiData, selectedMoveVersion]);

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


    // Type effectiveness map (all 18 types defenses)
    const typeDefenses = useMemo(() => {
        if (!selectedPokemonDetails) return {};
        const defendingTypes = selectedPokemonDetails.types || [];
        const effectiveness = {};
        const ALL_TYPES = [
            'normal', 'fire', 'water', 'electric', 'grass', 'ice',
            'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
            'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
        ];
        const typeChart = {
            normal: { damageTaken: { Fighting: 2, Ghost: 0 } },
            fire: { damageTaken: { Fire: 0.5, Water: 2, Electric: 1, Grass: 0.5, Ice: 0.5, Fighting: 1, Poison: 1, Ground: 2, Flying: 1, Psychic: 1, Bug: 0.5, Rock: 2, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 0.5 } },
            water: { damageTaken: { Fire: 0.5, Water: 0.5, Electric: 2, Grass: 2, Ice: 0.5, Fighting: 1, Poison: 1, Ground: 1, Flying: 1, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 1 } },
            electric: { damageTaken: { Fire: 1, Water: 1, Electric: 0.5, Grass: 1, Ice: 1, Fighting: 1, Poison: 1, Ground: 2, Flying: 0.5, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 1 } },
            grass: { damageTaken: { Fire: 2, Water: 0.5, Electric: 0.5, Grass: 0.5, Ice: 2, Fighting: 1, Poison: 2, Ground: 0.5, Flying: 2, Psychic: 1, Bug: 2, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 1 } },
            ice: { damageTaken: { Fire: 2, Water: 1, Electric: 1, Grass: 1, Ice: 0.5, Fighting: 2, Poison: 1, Ground: 1, Flying: 1, Psychic: 1, Bug: 1, Rock: 2, Ghost: 1, Dragon: 1, Dark: 1, Steel: 2, Fairy: 1 } },
            fighting: { damageTaken: { Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 1, Poison: 1, Ground: 1, Flying: 2, Psychic: 2, Bug: 0.5, Rock: 0.5, Ghost: 1, Dragon: 1, Dark: 0.5, Steel: 1, Fairy: 2 } },
            poison: { damageTaken: { Fire: 1, Water: 1, Electric: 1, Grass: 0.5, Ice: 1, Fighting: 0.5, Poison: 0.5, Ground: 2, Flying: 1, Psychic: 2, Bug: 0.5, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 0.5 } },
            ground: { damageTaken: { Fire: 1, Water: 2, Electric: 0, Grass: 2, Ice: 2, Fighting: 1, Poison: 0.5, Ground: 1, Flying: 1, Psychic: 1, Bug: 1, Rock: 0.5, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 1 } },
            flying: { damageTaken: { Fire: 1, Water: 1, Electric: 2, Grass: 0.5, Ice: 2, Fighting: 0.5, Poison: 1, Ground: 0, Flying: 1, Psychic: 1, Bug: 0.5, Rock: 2, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 1 } },
            psychic: { damageTaken: { Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 0.5, Poison: 1, Ground: 1, Flying: 1, Psychic: 0.5, Bug: 2, Rock: 1, Ghost: 2, Dragon: 1, Dark: 2, Steel: 1, Fairy: 1 } },
            bug: { damageTaken: { Fire: 2, Water: 1, Electric: 1, Grass: 0.5, Ice: 1, Fighting: 0.5, Poison: 1, Ground: 0.5, Flying: 2, Psychic: 1, Bug: 1, Rock: 2, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 1 } },
            rock: { damageTaken: { Fire: 0.5, Water: 2, Electric: 1, Grass: 2, Ice: 1, Fighting: 2, Poison: 0.5, Ground: 2, Flying: 0.5, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 2, Fairy: 1 } },
            ghost: { damageTaken: { Normal: 0, Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 0, Poison: 0.5, Ground: 1, Flying: 1, Psychic: 1, Bug: 0.5, Rock: 1, Ghost: 2, Dragon: 1, Dark: 2, Steel: 1, Fairy: 1 } },
            dragon: { damageTaken: { Fire: 0.5, Water: 0.5, Electric: 0.5, Grass: 0.5, Ice: 2, Fighting: 1, Poison: 1, Ground: 1, Flying: 1, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 2, Dark: 1, Steel: 1, Fairy: 2 } },
            dark: { damageTaken: { Fighting: 2, Psychic: 0, Bug: 2, Ghost: 0.5, Dragon: 1, Dark: 0.5, Fairy: 2 } },
            steel: { damageTaken: { Normal: 0.5, Fire: 2, Water: 1, Electric: 1, Grass: 0.5, Ice: 0.5, Fighting: 2, Poison: 0, Ground: 2, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 0.5, Ghost: 1, Dragon: 0.5, Dark: 1, Steel: 0.5, Fairy: 0.5 } },
            fairy: { damageTaken: { Fighting: 0.5, Poison: 2, Bug: 0.5, Dragon: 0, Dark: 0.5, Steel: 2 } }
        };

        ALL_TYPES.forEach((attackType) => {
            const multiplier = defendingTypes.reduce((product, defendingType) => {
                const damageTaken = typeChart[defendingType]?.damageTaken;
                const toChartKey = (t) => t.charAt(0).toUpperCase() + t.slice(1);
                return product * (damageTaken?.[toChartKey(attackType)] ?? 1);
            }, 1);
            effectiveness[attackType] = multiplier;
        });

        return effectiveness;
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

    // Gen-by-Gen Sprites list mapping
    const pokemonGenerationSprites = useMemo(() => {
        if (!fullApiData || !fullApiData.sprites) return [];
        const versions = fullApiData.sprites.versions;
        if (!versions) return [];

        const genList = [
            {
                name: 'Generation 1',
                normal: versions['generation-i']?.['red-blue']?.front_default,
                shiny: null
            },
            {
                name: 'Generation 2',
                normal: versions['generation-ii']?.['crystal']?.front_default || versions['generation-ii']?.['gold']?.front_default,
                shiny: versions['generation-ii']?.['crystal']?.front_shiny || versions['generation-ii']?.['gold']?.front_shiny
            },
            {
                name: 'Generation 3',
                normal: versions['generation-iii']?.['emerald']?.front_default || versions['generation-iii']?.['ruby-sapphire']?.front_default,
                shiny: versions['generation-iii']?.['emerald']?.front_shiny || versions['generation-iii']?.['ruby-sapphire']?.front_shiny
            },
            {
                name: 'Generation 4',
                normal: versions['generation-iv']?.['platinum']?.front_default || versions['generation-iv']?.['diamond-pearl']?.front_default,
                shiny: versions['generation-iv']?.['platinum']?.front_shiny || versions['generation-iv']?.['diamond-pearl']?.front_shiny
            },
            {
                name: 'Generation 5',
                normal: versions['generation-v']?.['black-white']?.animated?.front_default || versions['generation-v']?.['black-white']?.front_default,
                shiny: versions['generation-v']?.['black-white']?.animated?.front_shiny || versions['generation-v']?.['black-white']?.front_shiny
            },
            {
                name: 'Generation 6',
                normal: versions['generation-vi']?.['x-y']?.front_default || versions['generation-vi']?.['omega-ruby-alpha-sapphire']?.front_default,
                shiny: versions['generation-vi']?.['x-y']?.front_shiny || versions['generation-vi']?.['omega-ruby-alpha-sapphire']?.front_shiny
            },
            {
                name: 'Generation 7',
                normal: versions['generation-vii']?.['ultra-sun-ultra-moon']?.front_default || versions['generation-vii']?.['icons']?.front_default,
                shiny: versions['generation-vii']?.['ultra-sun-ultra-moon']?.front_shiny
            },
            {
                name: 'Generation 8',
                normal: versions['generation-viii']?.['brilliant-diamond-shining-pearl']?.front_default || versions['generation-viii']?.['icons']?.front_default,
                shiny: null
            },
            {
                name: 'Generation 9',
                normal: versions['generation-ix']?.['scarlet-violet']?.front_default,
                shiny: null
            }
        ];

        return genList.filter((g) => g.normal);
    }, [fullApiData]);

    const spriteToShow = useMemo(() => {
        if (customSelectedSprite) return customSelectedSprite;
        if (!selectedPokemonDetails) return POKEBALL_PLACEHOLDER_URL;
        return showShiny
            ? (selectedPokemonDetails.animatedShinySprite || selectedPokemonDetails.shinySprite || selectedPokemonDetails.sprite)
            : (selectedPokemonDetails.animatedSprite || selectedPokemonDetails.sprite);
    }, [selectedPokemonDetails, showShiny, customSelectedSprite]);

    // Data parsing for Pokedex Data sections
    const formattedId = useMemo(() => {
        if (!selectedPokemonDetails?.id) return '';
        return String(selectedPokemonDetails.id).padStart(4, '0');
    }, [selectedPokemonDetails]);

    const pokemonGenus = useMemo(() => {
        return speciesData?.genera?.find((g) => g.language.name === 'en')?.genus || '';
    }, [speciesData]);

    const heightInM = useMemo(() => {
        const hVal = selectedPokemonDetails?.height || fullApiData?.height;
        return hVal ? hVal / 10 : 0;
    }, [selectedPokemonDetails, fullApiData]);

    const heightInFt = useMemo(() => {
        if (!heightInM) return '';
        const ftTotal = heightInM * 3.28084;
        const ft = Math.floor(ftTotal);
        const inches = Math.round((ftTotal % 1) * 12);
        return `${ft}′${inches.toString().padStart(2, '0')}″`;
    }, [heightInM]);

    const weightInKg = useMemo(() => {
        const wVal = selectedPokemonDetails?.weight || fullApiData?.weight;
        return wVal ? wVal / 10 : 0;
    }, [selectedPokemonDetails, fullApiData]);

    const weightInLbs = useMemo(() => {
        return weightInKg ? (weightInKg * 2.20462).toFixed(1) : '';
    }, [weightInKg]);

    const evYield = useMemo(() => {
        if (!fullApiData?.stats) return 'None';
        const evs = [];
        const STAT_MAP = {
            'hp': 'HP',
            'attack': 'Atk',
            'defense': 'Def',
            'special-attack': 'Sp. Atk',
            'special-defense': 'Sp. Def',
            'speed': 'Speed'
        };
        fullApiData.stats.forEach((s) => {
            if (s.effort > 0) {
                evs.push(`${s.effort} ${STAT_MAP[s.stat.name] || s.stat.name}`);
            }
        });
        return evs.join(', ') || 'None';
    }, [fullApiData]);

    const genderRate = speciesData?.gender_rate;
    const genderText = useMemo(() => {
        if (genderRate === undefined) return '';
        if (genderRate === -1) return 'Genderless';
        const femalePercent = (genderRate / 8) * 100;
        const malePercent = 100 - femalePercent;
        return `${malePercent}% male, ${femalePercent}% female`;
    }, [genderRate]);

    const eggGroups = useMemo(() => {
        return speciesData?.egg_groups?.map((g) => g.name).join(', ') || 'Unknown';
    }, [speciesData]);


    const baseFriendshipText = useMemo(() => {
        if (speciesData?.base_happiness === undefined) return '';
        const val = speciesData.base_happiness;
        let label = 'normal';
        if (val < 50) label = 'lower than normal';
        else if (val >= 100) label = 'higher than normal';
        return `${val} (${label})`;
    }, [speciesData]);

    const growthRateText = useMemo(() => {
        if (!speciesData?.growth_rate?.name) return '';
        return speciesData.growth_rate.name
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }, [speciesData]);

    const eggCyclesText = useMemo(() => {
        if (speciesData?.hatch_counter === undefined) return '';
        const cycles = speciesData.hatch_counter;
        const minSteps = cycles * 244;
        const maxSteps = cycles * 257;
        return `${cycles} (${minSteps.toLocaleString()}-${maxSteps.toLocaleString()} steps)`;
    }, [speciesData]);

    const catchRateText = useMemo(() => {
        if (speciesData?.capture_rate === undefined) return '';
        const rate = speciesData.capture_rate;
        const percent = ((rate / 765) * 100).toFixed(1);
        return `${rate} (${percent}% with PokéBall, full HP)`;
    }, [speciesData]);

    // Render detailed content (Data, Locations, Moves, or Sprites tabs)
    const renderDetailsContent = () => {
        if (!selectedPokemonDetails) return null;

        if (activeTab === 'data') {
            return (
                <div className="flex-1 flex flex-col space-y-5 animate-scale-in">
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
                                        title={language === 'pt' ? 'Alternar Brilhante' : 'Toggle Shiny'}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </button>
                                    {onToggleFavoritePokemon && (
                                        <button
                                            type="button"
                                            onClick={() => onToggleFavoritePokemon(selectedPokemonDetails.id)}
                                            className={`absolute -bottom-2 -left-4 rounded-full p-1.5 transition-all duration-200 hover:scale-110 active:scale-95 border ${favoritePokemons.has(selectedPokemonDetails.id) ? 'bg-accent-soft text-accent border-accent-soft' : 'bg-surface-raised text-muted border-border'}`}
                                            title={favoritePokemons.has(selectedPokemonDetails.id) ? t('common.remove') : (language === 'pt' ? 'Adicionar aos favoritos' : 'Add to favorites')}
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
                        </div>

                        {/* Base Stats Card */}
                        <div className="rounded-xl bg-surface p-4 border border-border flex flex-col justify-between">
                            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted">{t('pokedex.baseStats')}</h4>
                            <div className="space-y-2 flex-1 flex flex-col justify-center">
                                {selectedPokemonDetails.stats?.map((stat) => (
                                    <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Evolution Line — shown early for quick context */}
                    {evolutionDetails.length > 1 && (
                        <div className="rounded-xl bg-surface p-4 border border-border">
                            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted">{language === 'pt' ? 'Linha Evolutiva' : 'Evolution Line'}</h4>
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

                    {/* Two-column data grid: Left = Pokédex Data + Training | Right = Type Defenses + Breeding */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

                        {/* ── LEFT COLUMN ── */}
                        <div className="flex flex-col gap-4">

                            {/* Pokédex Data card */}
                            <div className="rounded-xl bg-surface p-4 border border-border">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 pb-2 mb-2 border-b border-border">
                                    <Database className="w-3.5 h-3.5 text-primary" />
                                    <span>{language === 'pt' ? 'Dados da Pokédex' : 'Pokédex Data'}</span>
                                </h4>
                                <table className="w-full text-xs text-fg">
                                    <tbody>
                                        <tr className="border-b border-border/40 py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{language === 'pt' ? 'Nº Nacional' : 'National ID'}</td>
                                            <td className="font-mono font-bold">#{formattedId || '----'}</td>
                                        </tr>
                                        <tr className="border-b border-border/40 py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{t('pokedex.typesFilterLabel')}</td>
                                            <td className="flex gap-1">
                                                {selectedPokemonDetails.types?.map((type) => (
                                                    <TypeBadge key={type} type={type} colors={colors} />
                                                ))}
                                            </td>
                                        </tr>
                                        <tr className="border-b border-border/40 py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{language === 'pt' ? 'Espécie' : 'Species'}</td>
                                            <td className="font-bold capitalize">{pokemonGenus || t('common.loading')}</td>
                                        </tr>
                                        <tr className="border-b border-border/40 py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{t('pokedex.height')}</td>
                                            <td className="font-bold font-mono">
                                                {heightInM ? `${heightInM} m` : t('common.loading')} {heightInFt && <span className="text-muted font-normal text-[11px] font-sans">({heightInFt})</span>}
                                            </td>
                                        </tr>
                                        <tr className="border-b border-border/40 py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{t('pokedex.weight')}</td>
                                            <td className="font-bold font-mono">
                                                {weightInKg ? `${weightInKg} kg` : t('common.loading')} {weightInLbs && <span className="text-muted font-normal text-[11px] font-sans">({weightInLbs} lbs)</span>}
                                            </td>
                                        </tr>
                                        <tr className="py-2.5 flex justify-between items-start">
                                            <td className="text-muted py-1">{t('pokedex.abilities')}</td>
                                            <td className="font-bold text-right flex flex-col items-end space-y-1">
                                                {selectedPokemonDetails.abilities?.map((ab, idx) => {
                                                    const isHidden = ab.is_hidden;
                                                    return (
                                                        <div key={idx} className="capitalize text-xs">
                                                            {isHidden ? (
                                                                <span className="text-muted font-normal text-[11px] inline-flex items-center gap-1">
                                                                    <AbilityChip ability={ab} /> <span className="text-[10px] text-muted-foreground">{language === 'pt' ? '(oculta)' : '(hidden)'}</span>
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
                            </div>

                            {/* Training card */}
                            <div className="rounded-xl bg-surface p-4 border border-border">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 pb-2 mb-2 border-b border-border">
                                    <Zap className="w-3.5 h-3.5 text-primary" />
                                    <span>{language === 'pt' ? 'Treinamento' : 'Training'}</span>
                                </h4>
                                <table className="w-full text-xs text-fg">
                                    <tbody>
                                        <tr className="border-b border-border/40 py-2 flex justify-between items-center">
                                            <td className="text-muted">{language === 'pt' ? 'Pontos de EV' : 'EV Yield'}</td>
                                            <td className="font-bold font-mono text-right truncate max-w-[200px]">{evYield}</td>
                                        </tr>
                                        <tr className="border-b border-border/40 py-2 flex justify-between items-center">
                                            <td className="text-muted">{language === 'pt' ? 'Taxa de Captura' : 'Catch Rate'}</td>
                                            <td className="font-bold font-mono text-right">{catchRateText || t('common.loading')}</td>
                                        </tr>
                                        <tr className="border-b border-border/40 py-2 flex justify-between items-center">
                                            <td className="text-muted">{language === 'pt' ? 'Amizade Base' : 'Base Friendship'}</td>
                                            <td className="font-bold font-mono text-right">{baseFriendshipText || t('common.loading')}</td>
                                        </tr>
                                        <tr className="border-b border-border/40 py-2 flex justify-between items-center">
                                            <td className="text-muted">{language === 'pt' ? 'Exp. Base' : 'Base Exp.'}</td>
                                            <td className="font-mono font-bold text-right">{fullApiData?.base_experience ?? t('common.loading')}</td>
                                        </tr>
                                        <tr className="py-2 flex justify-between items-center">
                                            <td className="text-muted">{language === 'pt' ? 'Crescimento' : 'Growth Rate'}</td>
                                            <td className="font-bold text-right">{growthRateText || t('common.loading')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ── RIGHT COLUMN ── */}
                        <div className="flex flex-col gap-4">

                            {/* Type Defenses card */}
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
                                    const groups = tiers.map(tier => ({
                                        ...tier,
                                        types: Object.entries(typeDefenses).filter(([, m]) => m === tier.mult).map(([t]) => t),
                                    })).filter(g => g.types.length > 0);
                                    const neutralTypes = Object.entries(typeDefenses).filter(([, m]) => m === 1).map(([t]) => t);
                                    return (
                                        <div className="space-y-2.5">
                                            {groups.map(g => (
                                                <div key={g.mult} className={`rounded-lg border ${g.border} ${g.bg} px-3 py-2.5`}>
                                                    <span className={`text-[10px] font-extrabold uppercase tracking-widest ${g.text} block mb-2`}>{g.label}</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {g.types.map(tName => (
                                                            <span key={tName} className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold capitalize ${g.badge}`}>
                                                                <img src={typeIcons[tName]} alt={tName} className="h-4 w-4 shrink-0" />
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
                                                        {neutralTypes.map(tName => (
                                                            <span key={tName} className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-surface-raised/40 px-2 py-1 text-xs font-semibold capitalize text-muted/70">
                                                                <img src={typeIcons[tName]} alt={tName} className="h-4 w-4 shrink-0 opacity-60" />
                                                                {tName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </details>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Breeding card */}
                            <div className="rounded-xl bg-surface p-4 border border-border">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 pb-2 mb-2 border-b border-border">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    <span>{language === 'pt' ? 'Cruzamento' : 'Breeding'}</span>
                                </h4>
                                <table className="w-full text-xs text-fg">
                                    <tbody>
                                        <tr className="border-b border-border/40 py-2 flex justify-between items-center">
                                            <td className="text-muted">{language === 'pt' ? 'Grupos de Ovos' : 'Egg Groups'}</td>
                                            <td className="font-bold text-right capitalize">{eggGroups}</td>
                                        </tr>
                                        <tr className="border-b border-border/40 py-2 flex justify-between items-center">
                                            <td className="text-muted">{language === 'pt' ? 'Gênero' : 'Gender Ratio'}</td>
                                            <td className="font-bold font-mono text-right">{genderText || t('common.loading')}</td>
                                        </tr>
                                        <tr className="py-2 flex justify-between items-center">
                                            <td className="text-muted">{language === 'pt' ? 'Ciclos de Ovo' : 'Egg Cycles'}</td>
                                            <td className="font-bold font-mono text-right">{eggCyclesText || t('common.loading')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Catch Locations Tab
        if (activeTab === 'locations') {
            return (
                <div className="flex-1 flex flex-col space-y-4 animate-scale-in">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        <h4 className="text-base font-bold text-fg">{t('pokedex.locationsTitle')}</h4>
                    </div>

                    {availableVersions.length > 0 && (
                        <div className="flex items-center justify-between gap-4 bg-surface p-3 rounded-xl border border-border">
                            <label htmlFor="locations-version-filter" className="text-xs font-bold text-muted uppercase tracking-wider">
                                {t('pokedex.locationsVersionFilter')}:
                            </label>
                            <div className="relative min-w-[150px]">
                                <select
                                    id="locations-version-filter"
                                    value={locationsVersionFilter}
                                    onChange={(e) => setLocationsVersionFilter(e.target.value)}
                                    className="team-builder-field team-builder-field--compact team-builder-select w-full"
                                >
                                    <option value="all">{language === 'pt' ? 'Todos os Jogos' : 'All Games'}</option>
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
                                                        const borderVal = `${conf.color}55`;
                                                        const bgVal = `${conf.color}18`;
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
                                                                        <span className="text-[10px] font-mono font-semibold bg-bg px-2 py-0.5 rounded border border-border text-muted">
                                                                            {detail.minLevel === detail.maxLevel ? `Lv. ${detail.minLevel}` : `Lv. ${detail.minLevel}-${detail.maxLevel}`}
                                                                        </span>
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
                            <p className="text-xs text-muted max-w-sm mx-auto">
                                {t('pokedex.locationsEmpty')}
                            </p>
                        </div>
                    )}
                </div>
            );
        }

        // Moves learned Tab (inspired by 2nd image)
        if (activeTab === 'moves') {
            return (
                <div className="flex-1 flex flex-col space-y-4 animate-scale-in">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                            <Swords className="w-4 h-4 text-primary" />
                            <span>{t('pokedex.movesTitle')}</span>
                        </h4>

                        {/* Game Version Selector for Moves */}
                        {availableMoveVersions.length > 0 && (
                            <div className="relative min-w-[170px]">
                                <select
                                    value={selectedMoveVersion}
                                    onChange={(e) => setSelectedMoveVersion(e.target.value)}
                                    className="team-builder-field team-builder-field--compact team-builder-select w-full"
                                >
                                    {availableMoveVersions.map((vName) => {
                                        const label = vName.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                                        return (
                                            <option key={vName} value={vName}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}
                    </div>

                    {isMovesLoading ? (
                        <div className="flex-1 flex items-center justify-center py-20">
                            <div className="team-builder-spinner" aria-hidden="true"></div>
                        </div>
                    ) : (resolvedMoves.levelUp.length > 0 || resolvedMoves.machine.length > 0) ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                            {/* Level Up Moves */}
                            <div className="rounded-xl bg-surface p-4 border border-border">
                                <h5 className="text-xs font-extrabold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5 pb-2 border-b border-border">
                                    <ChevronRight className="w-3.5 h-3.5 text-primary" />
                                    <span>{t('pokedex.movesLevelUp')}</span>
                                </h5>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse pokedex-moves-table">
                                        <thead>
                                            <tr className="border-b border-border/80 text-muted">
                                                <th className="pb-2 font-bold w-12">{t('pokedex.movesHeaderLevel')}</th>
                                                <th className="pb-2 font-bold">{t('pokedex.movesHeaderName')}</th>
                                                <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderType')}</th>
                                                <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderClass')}</th>
                                                <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderPower')}</th>
                                                <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderAcc')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resolvedMoves.levelUp.map((m, idx) => {
                                                return (
                                                    <tr key={idx} className="border-b border-border/40 hover:bg-bg/10">
                                                        <td className="py-2.5 font-bold font-mono text-muted">{m.level}</td>
                                                        <td className="py-2.5 font-bold capitalize text-fg">{m.name.replace('-', ' ')}</td>
                                                        <td className="py-2.5 text-center">
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider text-white" style={{ backgroundColor: typeColors[m.type] }}>
                                                                {m.type.slice(0, 3)}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 text-center">
                                                            <span title={m.damageClass} className="inline-flex items-center justify-center">
                                                                {m.damageClass === 'physical' ? (
                                                                    <PhysicalIcon />
                                                                ) : m.damageClass === 'special' ? (
                                                                    <SpecialIcon />
                                                                ) : (
                                                                    <StatusIcon />
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 text-center font-bold font-mono text-fg">{m.power ?? '—'}</td>
                                                        <td className="py-2.5 text-center font-bold font-mono text-fg">{m.accuracy ? `${m.accuracy}%` : '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* TM Moves */}
                            <div className="rounded-xl bg-surface p-4 border border-border">
                                <h5 className="text-xs font-extrabold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5 pb-2 border-b border-border">
                                    <ChevronRight className="w-3.5 h-3.5 text-primary" />
                                    <span>{t('pokedex.movesMachine')}</span>
                                </h5>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse pokedex-moves-table">
                                        <thead>
                                            <tr className="border-b border-border/80 text-muted">
                                                <th className="pb-2 font-bold w-12">{t('pokedex.movesHeaderTm')}</th>
                                                <th className="pb-2 font-bold">{t('pokedex.movesHeaderName')}</th>
                                                <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderType')}</th>
                                                <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderClass')}</th>
                                                <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderPower')}</th>
                                                <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderAcc')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resolvedMoves.machine.map((m, idx) => {
                                                return (
                                                    <tr key={idx} className="border-b border-border/40 hover:bg-bg/10">
                                                        <td className="py-2.5 font-mono text-primary font-bold">
                                                            {m.tmName ? formatTmName(m.tmName) : '—'}
                                                        </td>
                                                        <td className="py-2.5 font-bold capitalize text-fg">{m.name.replace('-', ' ')}</td>
                                                        <td className="py-2.5 text-center">
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider text-white" style={{ backgroundColor: typeColors[m.type] }}>
                                                                {m.type.slice(0, 3)}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 text-center">
                                                            <span title={m.damageClass} className="inline-flex items-center justify-center">
                                                                {m.damageClass === 'physical' ? (
                                                                    <PhysicalIcon />
                                                                ) : m.damageClass === 'special' ? (
                                                                    <SpecialIcon />
                                                                ) : (
                                                                    <StatusIcon />
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 text-center font-bold font-mono text-fg">{m.power ?? '—'}</td>
                                                        <td className="py-2.5 text-center font-bold font-mono text-fg">{m.accuracy ? `${m.accuracy}%` : '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 bg-surface border border-border rounded-xl text-center px-4">
                            <AlertCircle className="w-10 h-10 text-muted mx-auto mb-3" />
                            <h5 className="font-bold text-fg mb-1">{language === 'pt' ? 'Nenhum movimento encontrado' : 'No Moves Found'}</h5>
                            <p className="text-xs text-muted max-w-sm mx-auto">
                                {t('pokedex.movesEmpty')}
                            </p>
                        </div>
                    )}
                </div>
            );
        }

        // Historical Sprites Tab (inspired by 1st image)
        if (activeTab === 'sprites') {
            return (
                <div className="flex-1 flex flex-col space-y-4 animate-scale-in">
                    <div className="bg-surface p-3 rounded-xl border border-border">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-primary" />
                            <span>{t('pokedex.spritesTitle')}</span>
                        </h4>
                        <p className="text-[10px] text-muted mt-1.5">
                            {t('pokedex.spritesPreviewTitle')}
                        </p>
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
                                                    <img
                                                        src={g.normal}
                                                        alt={`${selectedPokemonDetails.name} ${g.name} normal`}
                                                        onClick={() => setCustomSelectedSprite(g.normal)}
                                                        className={`h-11 w-11 image-pixelated cursor-pointer hover:scale-110 active:scale-90 transition-transform ${customSelectedSprite === g.normal ? 'ring-2 ring-primary rounded-lg bg-primary/10' : ''}`}
                                                        title={language === 'pt' ? 'Pré-visualizar Sprite Normal' : 'Preview Normal Sprite'}
                                                    />
                                                    <span className="text-[9px] text-muted font-bold mt-1">Normal</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted text-[10px]">—</span>
                                            )}
                                            {g.shiny ? (
                                                <div className="flex flex-col items-center">
                                                    <img
                                                        src={g.shiny}
                                                        alt={`${selectedPokemonDetails.name} ${g.name} shiny`}
                                                        onClick={() => setCustomSelectedSprite(g.shiny)}
                                                        className={`h-11 w-11 image-pixelated cursor-pointer hover:scale-110 active:scale-90 transition-transform ${customSelectedSprite === g.shiny ? 'ring-2 ring-primary rounded-lg bg-primary/10' : ''}`}
                                                        title={language === 'pt' ? 'Pré-visualizar Sprite Brilhante' : 'Preview Shiny Sprite'}
                                                    />
                                                    <span className="text-[9px] text-muted font-bold mt-1">Shiny</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted text-[10px]">—</span>
                                            )}
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
                                                {pokemonGenerationSprites.map((g) => (
                                                    <th key={g.name} className="p-3 font-bold text-muted min-w-[90px]">
                                                        {g.name}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {/* Normal Sprites */}
                                            <tr>
                                                <td className="p-3 font-bold text-muted text-left border-r border-border">Normal</td>
                                                {pokemonGenerationSprites.map((g) => (
                                                    <td key={g.name} className="p-2 border-r border-border/40 hover:bg-bg/25 transition-colors">
                                                        {g.normal ? (
                                                            <img
                                                                src={g.normal}
                                                                alt={`${selectedPokemonDetails.name} ${g.name} normal`}
                                                                onClick={() => setCustomSelectedSprite(g.normal)}
                                                                className={`h-12 w-12 mx-auto image-pixelated cursor-pointer hover:scale-110 active:scale-90 transition-transform ${customSelectedSprite === g.normal ? 'ring-2 ring-primary rounded-lg bg-primary/10' : ''}`}
                                                                title={language === 'pt' ? 'Pré-visualizar Sprite Normal' : 'Preview Normal Sprite'}
                                                            />
                                                        ) : (
                                                            <span className="text-muted text-[10px]">➔</span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Shiny Sprites */}
                                            <tr>
                                                <td className="p-3 font-bold text-muted text-left border-r border-border">{language === 'pt' ? 'Brilhante' : 'Shiny'}</td>
                                                {pokemonGenerationSprites.map((g) => (
                                                    <td key={g.name} className="p-2 border-r border-border/40 hover:bg-bg/25 transition-colors">
                                                        {g.shiny ? (
                                                            <img
                                                                src={g.shiny}
                                                                alt={`${selectedPokemonDetails.name} ${g.name} shiny`}
                                                                onClick={() => setCustomSelectedSprite(g.shiny)}
                                                                className={`h-12 w-12 mx-auto image-pixelated cursor-pointer hover:scale-110 active:scale-90 transition-transform ${customSelectedSprite === g.shiny ? 'ring-2 ring-primary rounded-lg bg-primary/10' : ''}`}
                                                                title={language === 'pt' ? 'Pré-visualizar Sprite Brilhante' : 'Preview Shiny Sprite'}
                                                            />
                                                        ) : (
                                                            <span className="text-muted text-[10px]">—</span>
                                                        )}
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
                            <p className="text-xs text-muted max-w-sm mx-auto">
                                {language === 'pt' ? 'Sprites específicos de geração não estão disponíveis para este Pokémon.' : 'Generation-specific sprites are not available for this Pokémon.'}
                            </p>
                        </div>
                    )}
                </div>
            );
        }
    };
    // --- MOBILE VIEW TEMPLATE ---
    if (isMobile && selectedPokemon) {
        return (
            <div
                className="fixed inset-0 z-50 flex flex-col bg-bg font-mono"
                style={{ width: '100vw', height: '100dvh', maxWidth: '100vw', overflowX: 'hidden' }}
            >
                {/* Mobile Navigation Header */}
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border bg-surface shadow-sm shrink-0">
                    <button
                        type="button"
                        onClick={handleCloseDetails}
                        className="flex items-center justify-center p-2 rounded-xl bg-surface-raised border border-border hover:bg-surface-raised/85 text-muted hover:text-fg transition-colors shrink-0"
                        title={t('common.close')}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex-1 text-center min-w-0">
                        <h2 className="text-sm font-extrabold capitalize text-fg truncate">
                            {selectedPokemonDetails?.name || selectedPokemon?.name || ''}
                            <span className="text-muted font-normal text-xs ml-1.5">
                                #{String(selectedPokemonDetails?.id || selectedPokemon?.id || '').padStart(4, '0')}
                            </span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={handlePrevPokemon}
                            className="p-2 rounded-xl bg-surface-raised border border-border hover:bg-surface-raised/85 hover:text-fg text-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={activeIndex <= 0 && selectedPokemonDetails?.id <= 1}
                            title={t('common.previous')}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleNextPokemon}
                            className="p-2 rounded-xl bg-surface-raised border border-border hover:bg-surface-raised/85 hover:text-fg text-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={activeIndex !== -1 && activeIndex >= displayedPokemons.length - 1}
                            title={t('common.next')}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Sub-tabs nav */}
                <div className="flex border-b border-border overflow-x-auto whitespace-nowrap scrollbar-none shrink-0 bg-surface px-2">
                    {[
                        { key: 'data', icon: <Activity className="w-4 h-4" />, label: t('pokedex.dataTab') },
                        { key: 'locations', icon: <MapPin className="w-4 h-4" />, label: t('pokedex.locationsTab') },
                        { key: 'moves', icon: <Swords className="w-4 h-4" />, label: t('pokedex.movesTab') },
                        { key: 'sprites', icon: <ImageIcon className="w-4 h-4" />, label: t('pokedex.spritesTab') },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`pb-2.5 pt-2 px-3 text-center font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg'}`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-4 pb-8 w-full box-border">
                    {renderDetailsContent()}
                </div>
            </div>
        );
    }

    // --- MOBILE PICKER VIEW TEMPLATE (Mobile with NO selected Pokémon) ---
    if (isMobile && !selectedPokemon) {
        return (
            <div className="team-builder-mobile space-y-4 font-mono">
                <section className="team-builder-panel p-4">
                    <div className="pokedex-mobile-filters">
                        {/* Search row */}
                        <div className="pokedex-mobile-filter-full">
                            <div className="relative w-full">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none flex items-center">
                                    <Search className="w-4 h-4" />
                                </span>
                                <input
                                    type="text"
                                    placeholder={t('pokedex.searchPlaceholder')}
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="team-builder-field w-full pl-9 pr-8"
                                    style={{ boxShadow: 'none' }}
                                />
                                {searchInput && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchInput('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
                                        aria-label={t('common.clear')}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Gen Dropdown */}
                        <div className="relative w-full">
                            <select
                                value={selectedGeneration}
                                onChange={(e) => setSelectedGeneration(e.target.value)}
                                className="team-builder-field team-builder-select w-full pr-8 appearance-none capitalize"
                                aria-label={t('pokedex.genFilterLabel')}
                                style={{ background: 'none' }}
                            >
                                <option value="all">Gen: {language === 'pt' ? 'Todas' : 'All'}</option>
                                {generations.map((generation) => (
                                    <option key={generation} value={generation} className="capitalize">
                                        {generation.replace('generation-', '').replace('-', ' ').toUpperCase()}
                                    </option>
                                ))}
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-[10px]">▼</span>
                        </div>

                        {/* Favorites Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                            className={`w-full rounded-md border transition-all flex items-center justify-center ${showOnlyFavorites ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface-raised text-muted'}`}
                            aria-pressed={showOnlyFavorites}
                            title={showOnlyFavorites ? t('pokedex.favoritesOnly') : t('common.all')}
                        >
                            <Star className={`w-4 h-4 ${showOnlyFavorites ? 'fill-[#FBBF24] text-[#FBBF24]' : ''}`} />
                        </button>
                    </div>

                    {/* Horizontally scrolling type badges */}
                    <div className="pokedex-mobile-types-container pt-2 mt-2">
                        <div className="pokedex-mobile-types">
                            {Object.keys(typeColors).map((type) => {
                                const isActive = selectedTypes.has(type);
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => handleTypeSelection(type)}
                                        className={`pokedex-mobile-type-badge ${isActive ? 'is-active' : ''}`}
                                        style={{
                                            '--type-color': typeColors[type],
                                            backgroundColor: isActive ? typeColors[type] : 'var(--color-surface-raised)',
                                            borderColor: isActive ? typeColors[type] : 'var(--color-border)',
                                            color: isActive ? '#fff' : 'var(--color-fg)'
                                        }}
                                        title={type}
                                    >
                                        <img src={typeIcons[type]} alt={type} className="w-3.5 h-3.5 object-contain" />
                                        <span className="text-[10px] font-bold capitalize select-none">{type}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="team-builder-panel p-4">
                    {isInitialLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="team-builder-spinner" aria-hidden="true"></div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                {displayedPokemons.map((pokemon, index) => (
                                    <MobilePokedexPokemonCard
                                        key={pokemon.id}
                                        pokemon={pokemon}
                                        onCardClick={handleSelectPokemon}
                                        lastRef={index === displayedPokemons.length - 1 ? lastPokemonElementRef : null}
                                        isFavorite={favoritePokemons.has(pokemon.id)}
                                        onToggleFavorite={onToggleFavoritePokemon}
                                    />
                                ))}
                            </div>

                            {isFetchingMore && (
                                <div className="flex items-center justify-center py-4">
                                    <div className="team-builder-spinner team-builder-spinner--small" aria-hidden="true"></div>
                                </div>
                            )}

                            {displayedPokemons.length === 0 && (
                                <div className="py-12 text-center">
                                    <EmptyState
                                        compact
                                        title={showOnlyFavorites ? t('favorites.noMatchesTitle') : t('pokedex.noPokemonFound')}
                                        message={showOnlyFavorites ? t('favorites.noMatchesDesc') : t('favorites.noMatchesDesc')}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        );
    }

    // --- DESKTOP VIEW TEMPLATE (Width >= 1024px, or Mobile with NO selection) ---
    return (
        <main className="team-builder grid grid-cols-1 relative">
            <div className={`grid gap-5 ${selectedPokemon ? 'grid-cols-1 lg:grid-cols-[0.9fr_2.1fr]' : 'grid-cols-1'}`}>
                {/* Left Side: Standard Pokédex Picker Grid */}
                <section className="team-builder-panel team-builder-panel--picker p-4">
                    <div className="team-builder-panel__header team-builder-panel__header--picker team-builder-panel__header--compact">
                        <div className="team-builder-picker-heading-row team-builder-picker-heading-row--compact min-w-0">
                            <h2 className="team-builder-panel__title team-builder-panel__title--compact">{t('nav.pokedex')}</h2>
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
                        <span className="team-builder-picker-summary">{selectedTypeCount === 0 ? t('pokedex.allTypes') : t('pokedex.selectedTypes', { count: selectedTypeCount })}</span>
                    </div>

                    <div className="team-builder-unified-toolbar mt-3">
                        <div className="team-builder-search-wrap">
                            <span className="team-builder-search-icon" aria-hidden="true">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                placeholder={t('pokedex.searchPlaceholder')}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="team-builder-field team-builder-field--compact team-builder-search-input"
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={() => setSearchInput('')}
                                    className="team-builder-search-clear"
                                    aria-label={t('common.clear')}
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
                                aria-label={t('pokedex.genFilterLabel')}
                            >
                                <option value="all">{t('pokedex.allGens')}</option>
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
                            <span>{showOnlyFavorites ? t('pokedex.favoritesOnly') : t('common.all')}</span>
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
                                            title={showOnlyFavorites ? t('favorites.noMatchesTitle') : t('pokedex.noPokemonFound')}
                                            message={showOnlyFavorites ? t('favorites.noMatchesDesc') : t('favorites.noMatchesDesc')}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* Right Side: Split details view (Desktop only, displayed when selectedPokemon is set) */}
                {selectedPokemon && (
                    <section className="team-builder-panel p-5 md:p-6 relative flex flex-col min-h-[400px] font-mono">
                        <button
                            onClick={handleCloseDetails}
                            type="button"
                            aria-label={t('common.close')}
                            className="absolute top-4 right-4 text-muted hover:text-fg hover:rotate-90 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex border-b border-border mb-4 overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('data')}
                                className={`pb-2.5 px-3 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-2 shrink-0 ${activeTab === 'data' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted hover:text-fg'}`}
                            >
                                <Activity className="w-4 h-4" />
                                <span>{t('pokedex.dataTab')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('locations')}
                                className={`pb-2.5 px-3 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-2 shrink-0 ${activeTab === 'locations' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted hover:text-fg'}`}
                            >
                                <MapPin className="w-4 h-4" />
                                <span>{t('pokedex.locationsTab')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('moves')}
                                className={`pb-2.5 px-3 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-2 shrink-0 ${activeTab === 'moves' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted hover:text-fg'}`}
                            >
                                <Swords className="w-4 h-4" />
                                <span>{t('pokedex.movesTab')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('sprites')}
                                className={`pb-2.5 px-3 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-2 shrink-0 ${activeTab === 'sprites' ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted hover:text-fg'}`}
                            >
                                <ImageIcon className="w-4 h-4" />
                                <span>{t('pokedex.spritesTab')}</span>
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