import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { appId } from '../../constants/firebase';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { GENERATION_RANGES, LEGENDARY_IDS, NATURES_LIST } from '../../constants/pokemon';
import { typeColors } from '../../constants/types';
import {
    getEvolutionChainData,
    getPokemonApiData,
    getPokemonSpeciesData,
    getStaticPokemonDetail,
} from '../../services/pokemonDataCache';
import { useModalA11y } from '../../hooks/useModalA11y';
import { EmptyState } from '../EmptyState';
import {
    ChartColumnIcon,
    CloseIcon,
    CollapseRightIcon,
    DiceIcon,
    InfoIcon,
    RefreshIcon,
} from '../icons';

const RANDOM_GENERATOR_INTRO_STORAGE_PREFIX = 'randomGeneratorIntroSeen';
const RANDOM_GENERATOR_GUIDE_LAYOUT_STORAGE_PREFIX = 'randomGeneratorGuideLayoutExpanded';
const RANDOM_GENERATOR_FILTERS_LAYOUT_STORAGE_PREFIX = 'randomGeneratorFiltersLayoutExpanded';

const RandomGeneratorIntroModal = ({ onClose, colors }) => {
    const dialogRef = useModalA11y(onClose);

    const steps = [
        {
            title: 'Roll one or more Pokemon',
            description: 'Pick your filters, choose the amount, and generate a fresh round in seconds.',
        },
        {
            title: 'Keep the answers with you',
            description: 'One player sees the result on the phone while everyone else starts asking yes or no questions.',
        },
        {
            title: 'Reveal at the end',
            description: 'Play one card at a time or use multiple rolls for a longer guessing session.',
        },
    ];

    const questionIdeas = [
        'Is it a legendary?',
        'Is it from Johto?',
        'Does it evolve?',
        'Is one of its types Water?',
    ];

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="random-generator-intro-title"
                tabIndex={-1}
                className="w-full max-w-xl max-h-[min(88vh,42rem)] sm:max-h-[min(86vh,44rem)] rounded-[1.75rem] overflow-hidden shadow-2xl animate-scale-in focus:outline-none flex flex-col"
                style={{ backgroundColor: colors.card, border: `1px solid ${colors.primary}33` }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="relative px-4 py-4 sm:px-6 sm:py-5 shrink-0"
                    style={{
                        background: `linear-gradient(135deg, ${colors.primary}22 0%, ${colors.card} 72%)`,
                        borderBottom: `1px solid ${colors.primary}22`,
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close random generator guide"
                        className="absolute top-3 right-3 p-2 rounded-xl transition-colors hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        style={{ color: colors.textMuted, backgroundColor: colors.cardLight }}
                    >
                        <CloseIcon />
                    </button>

                    <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em]"
                        style={{ backgroundColor: colors.primary + '1F', color: colors.primary }}
                    >
                        <DiceIcon />
                        Guessing game mode
                    </div>

                    <h2 id="random-generator-intro-title" className="mt-3 pr-10 text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: colors.text }}>
                        Turn this screen into a Pokemon party game
                    </h2>
                    <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed" style={{ color: colors.textMuted }}>
                        Use the Random Generator as a quick yes-or-no challenge. You keep the rolled Pokemon on screen, your friends ask questions, and the reveal happens only when someone gets the answer right.
                    </p>
                </div>

                <div
                    className="px-4 py-4 sm:px-6 sm:py-5 space-y-4 overflow-y-auto custom-scrollbar"
                    style={{ '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {steps.map((step, index) => (
                            <div
                                key={step.title}
                                className="rounded-2xl p-3"
                                style={{ backgroundColor: colors.background, border: `1px solid ${colors.cardLight}` }}
                            >
                                <span
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-extrabold mb-2.5"
                                    style={{ backgroundColor: colors.primary + '1A', color: colors.primary }}
                                >
                                    {index + 1}
                                </span>
                                <p className="text-xs sm:text-sm font-bold" style={{ color: colors.text }}>
                                    {step.title}
                                </p>
                                <p className="mt-1.5 text-[11px] sm:text-xs leading-relaxed" style={{ color: colors.textMuted }}>
                                    {step.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl p-3" style={{ backgroundColor: colors.background }}>
                        <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: colors.primary }}>
                            Good first questions
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {questionIdeas.map((idea) => (
                                <span
                                    key={idea}
                                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                    style={{ backgroundColor: colors.cardLight, color: colors.text }}
                                >
                                    {idea}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-[11px] sm:text-xs leading-relaxed" style={{ color: colors.textMuted }}>
                            This guide shows automatically only the first time for this trainer profile.
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                            style={{ backgroundColor: colors.primary }}
                        >
                            <DiceIcon />
                            Start playing
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export function RandomGeneratorView({ colors, generations, db, userId }) {
    const [generatedPokemon, setGeneratedPokemon] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingAllIds, setIsLoadingAllIds] = useState(false);
    const [allPokemonIds, setAllPokemonIds] = useState([]);
    const [pokemonCount, setPokemonCount] = useState(3);
    const [selectedRegion, setSelectedRegion] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [legendaryFilter, setLegendaryFilter] = useState('all');
    const [fullyEvolvedFilter, setFullyEvolvedFilter] = useState('all');
    const [formsFilter, setFormsFilter] = useState('all');
    const evolutionCacheRef = useRef({});
    const [showIntroModal, setShowIntroModal] = useState(false);
    const [isGuideLayoutExpanded, setIsGuideLayoutExpanded] = useState(true);
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
    const [generationSummary, setGenerationSummary] = useState({ requested: 3, generated: 0, exhausted: false });
    const pokemonDataCacheRef = useRef({});
    const introStorageKey = useMemo(() => `${RANDOM_GENERATOR_INTRO_STORAGE_PREFIX}:${userId || 'guest'}`, [userId]);
    const guideLayoutStorageKey = useMemo(() => `${RANDOM_GENERATOR_GUIDE_LAYOUT_STORAGE_PREFIX}:${userId || 'guest'}`, [userId]);
    const filtersLayoutStorageKey = useMemo(() => `${RANDOM_GENERATOR_FILTERS_LAYOUT_STORAGE_PREFIX}:${userId || 'guest'}`, [userId]);
    const regionOptions = useMemo(
        () => (Array.isArray(generations) && generations.length > 0
            ? generations
            : Object.keys(GENERATION_RANGES).filter((generation) => generation !== 'all')),
        [generations]
    );
    const filterSummaryChips = useMemo(() => {
        const chips = [
            { key: 'count', label: 'Count', value: String(pokemonCount) },
            {
                key: 'region',
                label: 'Region',
                value: selectedRegion === 'all'
                    ? 'All regions'
                    : selectedRegion.replace('generation-', 'Gen ').replace('-', ' '),
            },
        ];

        if (selectedType !== 'all') {
            chips.push({
                key: 'type',
                label: 'Type',
                value: selectedType.charAt(0).toUpperCase() + selectedType.slice(1),
            });
        }

        if (legendaryFilter === 'legendary') {
            chips.push({ key: 'legendary', label: 'Rarity', value: 'Legendary' });
        } else if (legendaryFilter === 'non-legendary') {
            chips.push({ key: 'legendary', label: 'Rarity', value: 'No legends' });
        }

        if (fullyEvolvedFilter === 'fully-evolved') {
            chips.push({ key: 'evolution', label: 'Stage', value: 'Final stage' });
        } else if (fullyEvolvedFilter === 'not-fully-evolved') {
            chips.push({ key: 'evolution', label: 'Stage', value: 'Can evolve' });
        }

        if (formsFilter === 'with-forms') {
            chips.push({ key: 'forms', label: 'Forms', value: 'Alt forms' });
        } else if (formsFilter === 'no-forms') {
            chips.push({ key: 'forms', label: 'Forms', value: 'No forms' });
        }

        return chips;
    }, [pokemonCount, selectedRegion, selectedType, legendaryFilter, fullyEvolvedFilter, formsFilter]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(guideLayoutStorageKey);
            setIsGuideLayoutExpanded(saved !== '0');
        } catch (_) {
            setIsGuideLayoutExpanded(true);
        }
    }, [guideLayoutStorageKey]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(filtersLayoutStorageKey);
            setIsFiltersExpanded(saved !== '0');
        } catch (_) {
            setIsFiltersExpanded(true);
        }
    }, [filtersLayoutStorageKey]);

    useEffect(() => {
        let cancelled = false;

        try {
            if (localStorage.getItem(introStorageKey) === '1') {
                setShowIntroModal(false);
                return () => {
                    cancelled = true;
                };
            }
        } catch (_) {
            // Ignore storage availability issues and fall back to Firestore.
        }

        if (!db || !userId) {
            setShowIntroModal(true);
            return () => {
                cancelled = true;
            };
        }

        (async () => {
            try {
                const prefRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'preferences');
                const snap = await getDoc(prefRef);
                if (cancelled) return;

                const seen = snap.exists() && snap.data()?.randomGeneratorIntroSeen === true;
                if (seen) {
                    try { localStorage.setItem(introStorageKey, '1'); } catch (_) { /* ignore */ }
                }
                setShowIntroModal(!seen);
            } catch (_) {
                if (!cancelled) {
                    setShowIntroModal(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [db, userId, introStorageKey]);

    const handleCloseIntroModal = useCallback(() => {
        setShowIntroModal(false);
        try { localStorage.setItem(introStorageKey, '1'); } catch (_) { /* ignore */ }

        if (!db || !userId) return;

        const prefRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'preferences');
        setDoc(prefRef, { randomGeneratorIntroSeen: true, updatedAt: Date.now() }, { merge: true }).catch(() => {
            // Best effort only.
        });
    }, [db, userId, introStorageKey]);

    const handleToggleFiltersLayout = useCallback(() => {
        setIsFiltersExpanded((prev) => {
            const next = !prev;
            try { localStorage.setItem(filtersLayoutStorageKey, next ? '1' : '0'); } catch (_) { /* ignore */ }
            return next;
        });
    }, [filtersLayoutStorageKey]);

    const getGenerationName = (id) => {
        for (const [gen, range] of Object.entries(GENERATION_RANGES)) {
            if (gen !== 'all' && id >= range.start && id <= range.end) {
                return gen.replace('generation-', 'Gen ').toUpperCase();
            }
        }
        return 'Unknown';
    };

    const fetchEvolutionChain = useCallback(async (evolutionChainUrl, targetPokemonId = null) => {
        try {
            const cacheKey = targetPokemonId ? `${evolutionChainUrl}_${targetPokemonId}` : evolutionChainUrl;

            if (evolutionCacheRef.current[cacheKey]) {
                return evolutionCacheRef.current[cacheKey];
            }

            const evoData = await getEvolutionChainData(evolutionChainUrl);
            const EEVEE_FAMILY = [133, 134, 135, 136, 196, 197, 470, 471, 700];
            const evolutions = [];
            const isEeveeFamily = targetPokemonId && EEVEE_FAMILY.includes(parseInt(targetPokemonId, 10));

            if (isEeveeFamily) {
                const findPathToTarget = (chain, targetId, path = []) => {
                    const speciesId = chain.species.url.split('/').filter(Boolean).pop();
                    const currentPath = [...path, {
                        name: chain.species.name,
                        id: speciesId,
                        chain,
                    }];

                    if (parseInt(speciesId, 10) === parseInt(targetId, 10)) {
                        return currentPath;
                    }

                    if (chain.evolves_to && chain.evolves_to.length > 0) {
                        for (const evo of chain.evolves_to) {
                            const result = findPathToTarget(evo, targetId, currentPath);
                            if (result) return result;
                        }
                    }

                    return null;
                };

                const pathToTarget = findPathToTarget(evoData.chain, targetPokemonId);

                if (pathToTarget) {
                    pathToTarget.forEach((node, index) => {
                        const id = parseInt(node.id, 10);
                        let genIntroduced = 'Unknown';

                        for (const [gen, range] of Object.entries(GENERATION_RANGES)) {
                            if (gen !== 'all' && id >= range.start && id <= range.end) {
                                genIntroduced = gen.replace('generation-', 'Gen ').toUpperCase();
                                break;
                            }
                        }

                        evolutions.push({
                            name: node.name,
                            id: node.id,
                            stage: index + 1,
                            genIntroduced,
                            evolutionDetails: node.chain.evolution_details?.[0] || null,
                        });
                    });
                }
            } else {
                const processChain = (chain, stage = 1) => {
                    const speciesId = chain.species.url.split('/').filter(Boolean).pop();
                    const id = parseInt(speciesId, 10);
                    let genIntroduced = 'Unknown';

                    for (const [gen, range] of Object.entries(GENERATION_RANGES)) {
                        if (gen !== 'all' && id >= range.start && id <= range.end) {
                            genIntroduced = gen.replace('generation-', 'Gen ').toUpperCase();
                            break;
                        }
                    }

                    evolutions.push({
                        name: chain.species.name,
                        id: speciesId,
                        stage,
                        genIntroduced,
                        evolutionDetails: chain.evolution_details?.[0] || null,
                    });

                    if (chain.evolves_to && chain.evolves_to.length > 0) {
                        chain.evolves_to.forEach((evo) => processChain(evo, stage + 1));
                    }
                };

                processChain(evoData.chain);
            }

            evolutionCacheRef.current[cacheKey] = evolutions;

            return evolutions;
        } catch (error) {
            console.error('Error fetching evolution chain:', error);
            return [];
        }
    }, []);

    const fetchPokemonForms = useCallback(async (speciesData) => {
        try {
            const forms = await Promise.all(
                (speciesData?.varieties || [])
                    .filter((variety) => !variety.is_default)
                    .slice(0, 5)
                    .map(async (variety) => {
                        try {
                            const formData = await getPokemonApiData(variety.pokemon.url);
                            return {
                                name: variety.pokemon.name,
                                sprite: formData.sprites.front_default || formData.sprites.other?.['official-artwork']?.front_default,
                            };
                        } catch {
                            return null;
                        }
                    })
            );

            return forms.filter(Boolean);
        } catch (error) {
            console.error('Error fetching forms:', error);
            return [];
        }
    }, []);

    const fetchFullPokemonData = useCallback(async (pokemonId) => {
        if (pokemonDataCacheRef.current[pokemonId]) {
            return pokemonDataCacheRef.current[pokemonId];
        }

        try {
            const randomNature = NATURES_LIST[Math.floor(Math.random() * NATURES_LIST.length)];
            const getRandomGender = (genderRate) => {
                if (genderRate === 0) return 'Male';
                if (genderRate === 8) return 'Female';
                if (genderRate !== -1 && Number.isInteger(genderRate)) {
                    return Math.random() < (genderRate / 8) ? 'Female' : 'Male';
                }
                return 'Genderless';
            };

            const staticPokemonData = await getStaticPokemonDetail(pokemonId);
            if (staticPokemonData?.evolutions) {
                const fullPokemon = {
                    ...staticPokemonData,
                    generation: getGenerationName(staticPokemonData.id),
                    abilities: (staticPokemonData.abilities || []).map((ability) => typeof ability === 'string' ? ability : ability.name).filter(Boolean),
                    habitat: staticPokemonData.habitat || 'Unknown',
                    growthRate: staticPokemonData.growthRate || 'Unknown',
                    nature: randomNature,
                    gender: getRandomGender(staticPokemonData.genderRate),
                };
                pokemonDataCacheRef.current[pokemonId] = fullPokemon;
                return fullPokemon;
            }

            const [pokemonData, speciesData] = await Promise.all([
                getPokemonApiData(pokemonId),
                getPokemonSpeciesData(pokemonId),
            ]);

            if (!pokemonData || !speciesData) return null;

            const evolutions = speciesData.evolution_chain?.url
                ? await fetchEvolutionChain(speciesData.evolution_chain.url, pokemonId)
                : [];
            const forms = await fetchPokemonForms(speciesData);
            const currentEvo = evolutions.find((evolution) => parseInt(evolution.id, 10) === pokemonId);
            const evolutionStage = currentEvo?.stage || 1;
            const isFullyEvolved = !evolutions.some((evolution) => evolution.stage > evolutionStage);

            const fullPokemon = {
                id: pokemonData.id,
                name: pokemonData.name,
                types: pokemonData.types.map((typeEntry) => typeEntry.type.name),
                sprite: pokemonData.sprites.other?.['official-artwork']?.front_default || pokemonData.sprites.front_default,
                shinySprite: pokemonData.sprites.other?.['official-artwork']?.front_shiny || pokemonData.sprites.front_shiny,
                height: pokemonData.height / 10,
                weight: pokemonData.weight / 10,
                generation: getGenerationName(pokemonData.id),
                stats: pokemonData.stats.map((statEntry) => ({ name: statEntry.stat.name, base_stat: statEntry.base_stat })),
                abilities: pokemonData.abilities.map((abilityEntry) => abilityEntry.ability.name),
                evolutions,
                evolutionStage,
                isFullyEvolved,
                forms,
                isLegendary: speciesData.is_legendary,
                isMythical: speciesData.is_mythical,
                habitat: speciesData.habitat?.name || 'Unknown',
                nature: randomNature,
                gender: getRandomGender(speciesData.gender_rate),
                baseHappiness: speciesData.base_happiness,
                captureRate: speciesData.capture_rate,
                growthRate: speciesData.growth_rate?.name || 'Unknown',
            };

            pokemonDataCacheRef.current[pokemonId] = fullPokemon;
            return fullPokemon;
        } catch (error) {
            console.error(`Error fetching Pokemon ${pokemonId}:`, error);
            return null;
        }
    }, [fetchEvolutionChain, fetchPokemonForms]);

    const loadAllPokemonIds = useCallback(async () => {
        if (allPokemonIds.length > 0) return allPokemonIds;

        setIsLoadingAllIds(true);
        try {
            const maxNationalDexId = GENERATION_RANGES.all.end;
            const ids = Array.from({ length: maxNationalDexId }, (_, index) => index + 1);
            setAllPokemonIds(ids);
            return ids;
        } catch (error) {
            console.error('Error loading national dex index:', error);
            return [];
        } finally {
            setIsLoadingAllIds(false);
        }
    }, [allPokemonIds]);

    const matchesPokemonFilters = useCallback((pokemon) => {
        if (!pokemon) return false;
        if (selectedType !== 'all' && !pokemon.types.includes(selectedType)) return false;
        if (legendaryFilter === 'legendary' && !LEGENDARY_IDS.has(pokemon.id)) return false;
        if (legendaryFilter === 'non-legendary' && LEGENDARY_IDS.has(pokemon.id)) return false;
        if (fullyEvolvedFilter === 'fully-evolved' && !pokemon.isFullyEvolved) return false;
        if (fullyEvolvedFilter === 'not-fully-evolved' && pokemon.isFullyEvolved) return false;
        if (formsFilter === 'with-forms' && (!pokemon.forms || pokemon.forms.length === 0)) return false;
        if (formsFilter === 'no-forms' && (pokemon.forms?.length || 0) > 0) return false;
        return true;
    }, [selectedType, legendaryFilter, fullyEvolvedFilter, formsFilter]);

    const generateRandomPokemon = useCallback(async () => {
        const requestedCount = Math.max(1, Number(pokemonCount) || 1);
        setIsLoading(true);
        setGeneratedPokemon([]);
        setGenerationSummary({ requested: requestedCount, generated: 0, exhausted: false });

        try {
            let validIds = [];
            if (selectedRegion === 'all') {
                validIds = await loadAllPokemonIds();
            } else {
                const range = GENERATION_RANGES[selectedRegion] || GENERATION_RANGES.all;
                validIds = Array.from({ length: range.end - range.start + 1 }, (_, index) => range.start + index);
            }

            if (legendaryFilter === 'legendary') {
                validIds = validIds.filter((id) => LEGENDARY_IDS.has(id));
            } else if (legendaryFilter === 'non-legendary') {
                validIds = validIds.filter((id) => !LEGENDARY_IDS.has(id));
            }

            if (validIds.length === 0) {
                setGenerationSummary({ requested: requestedCount, generated: 0, exhausted: true });
                return;
            }

            const shuffledIds = [...validIds];
            for (let index = shuffledIds.length - 1; index > 0; index -= 1) {
                const randomIndex = Math.floor(Math.random() * (index + 1));
                [shuffledIds[index], shuffledIds[randomIndex]] = [shuffledIds[randomIndex], shuffledIds[index]];
            }

            const results = [];
            const seenIds = new Set();
            const batchSize = Math.min(Math.max(requestedCount * 4, 12), 36);
            let cursor = 0;

            while (results.length < requestedCount && cursor < shuffledIds.length) {
                const batchIds = shuffledIds.slice(cursor, cursor + batchSize);
                cursor += batchSize;
                const batchResults = await Promise.all(batchIds.map((id) => fetchFullPokemonData(id)));

                for (const pokemon of batchResults) {
                    if (!pokemon || seenIds.has(pokemon.id) || !matchesPokemonFilters(pokemon)) {
                        continue;
                    }

                    seenIds.add(pokemon.id);
                    results.push(pokemon);

                    if (results.length === requestedCount) {
                        break;
                    }
                }
            }

            const finalResults = results.slice(0, requestedCount);
            setGeneratedPokemon(finalResults);
            setGenerationSummary({
                requested: requestedCount,
                generated: finalResults.length,
                exhausted: finalResults.length < requestedCount,
            });
        } catch (error) {
            console.error('Error generating Pokemon:', error);
            setGenerationSummary({ requested: requestedCount, generated: 0, exhausted: true });
        } finally {
            setIsLoading(false);
        }
    }, [pokemonCount, selectedRegion, legendaryFilter, loadAllPokemonIds, fetchFullPokemonData, matchesPokemonFilters]);

    useEffect(() => {
        generateRandomPokemon();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const PokemonDetailCard = ({ pokemon, roundNumber }) => {
        const [evoSprites, setEvoSprites] = useState({});
        const [loadingSprites, setLoadingSprites] = useState(true);
        const evolutionChain = useMemo(() => Array.isArray(pokemon.evolutions) ? pokemon.evolutions : [], [pokemon.evolutions]);
        const hasEvolutionLine = evolutionChain.length > 1;

        useEffect(() => {
            const fetchEvoSprites = async () => {
                if (!hasEvolutionLine) {
                    setLoadingSprites(false);
                    return;
                }

                setLoadingSprites(true);
                const sprites = {};

                try {
                    await Promise.all(
                        evolutionChain.map(async (evo) => {
                            try {
                                const data = await getPokemonApiData(evo.id);
                                sprites[evo.id] = data.sprites.front_default;
                            } catch {
                                sprites[evo.id] = null;
                            }
                        })
                    );
                } catch (error) {
                    console.error('Error fetching evo sprites:', error);
                }

                setEvoSprites(sprites);
                setLoadingSprites(false);
            };

            fetchEvoSprites();
        }, [evolutionChain, hasEvolutionLine]);

        const primaryType = pokemon.types[0];

        const EvolutionSprite = ({ evo, isCurrent = false }) => {
            const spriteSrc = isCurrent ? (pokemon.sprite || POKEBALL_PLACEHOLDER_URL) : (evoSprites[evo.id] || POKEBALL_PLACEHOLDER_URL);

            return (
                <div className="flex flex-col items-center min-w-[68px]">
                    <div
                        className="rounded-2xl p-1.5"
                        style={{
                            backgroundColor: isCurrent ? typeColors[primaryType] + '1F' : colors.card,
                            border: isCurrent ? `2px solid ${typeColors[primaryType]}` : `1px solid ${colors.cardLight}`,
                            opacity: isCurrent ? 1 : 0.78,
                        }}
                    >
                        {loadingSprites ? (
                            <div className={`rounded-xl animate-pulse ${isCurrent ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-14 sm:h-14'}`} style={{ backgroundColor: colors.cardLight }} />
                        ) : (
                            <img
                                src={spriteSrc}
                                alt={evo.name}
                                className={`${isCurrent ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-14 sm:h-14'} object-contain`}
                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                            />
                        )}
                    </div>
                    <p
                        className={`mt-1 text-center capitalize font-semibold leading-tight ${isCurrent ? 'text-xs sm:text-sm max-w-[84px]' : 'text-[10px] sm:text-[11px] max-w-[68px]'}`}
                        style={{ color: isCurrent ? colors.text : colors.textMuted }}
                    >
                        {evo.name.replace(/-/g, ' ')}
                    </p>
                </div>
            );
        };

        return (
            <article
                className="rounded-3xl overflow-hidden h-full"
                style={{
                    backgroundColor: colors.card,
                    border: `2px solid ${typeColors[primaryType]}44`,
                }}
            >
                <div
                    className="px-4 pt-4 pb-4 sm:px-5 sm:pt-5"
                    style={{ background: `linear-gradient(135deg, ${typeColors[primaryType]}18 0%, ${colors.card} 80%)` }}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ backgroundColor: colors.card, color: colors.primary }}>
                                Round {roundNumber}
                            </span>
                            <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ backgroundColor: colors.card, color: colors.textMuted }}>
                                #{String(pokemon.id).padStart(3, '0')}
                            </span>
                        </div>
                        <span className="rounded-full px-3 py-1 text-[10px] font-semibold" style={{ backgroundColor: typeColors[primaryType] + '1A', color: typeColors[primaryType] }}>
                            {pokemon.generation}
                        </span>
                    </div>

                    <div className="mt-4 flex flex-col items-center text-center">
                        <div
                            className="rounded-[1.5rem] p-3"
                            style={{
                                backgroundColor: typeColors[primaryType] + '1A',
                                border: `2px solid ${typeColors[primaryType]}`,
                            }}
                        >
                            <img
                                src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL}
                                alt={pokemon.name}
                                className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                            />
                        </div>
                        <h3 className="mt-3 text-xl sm:text-2xl font-extrabold capitalize tracking-tight" style={{ color: colors.text }}>
                            {pokemon.name.replace(/-/g, ' ')}
                        </h3>
                        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                            {pokemon.types.map((type) => (
                                <span
                                    key={type}
                                    className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase"
                                    style={{ backgroundColor: typeColors[type] }}
                                >
                                    {type}
                                </span>
                            ))}
                        </div>
                    </div>

                    {hasEvolutionLine && (
                        <div className="mt-4 rounded-2xl p-3" style={{ backgroundColor: colors.cardLight }}>
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: colors.primary }}>
                                    Evolution line
                                </p>
                                <span className="text-[10px] font-semibold" style={{ color: colors.textMuted }}>
                                    {pokemon.isFullyEvolved ? 'Final stage' : `Stage ${pokemon.evolutionStage}`}
                                </span>
                            </div>
                            <div
                                className="overflow-x-auto custom-scrollbar pb-1"
                                style={{ '--scrollbar-track-color': colors.cardLight, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.cardLight }}
                            >
                                <div className="flex items-center gap-1.5 min-w-max">
                                    {evolutionChain.map((evo, index) => {
                                        const isCurrent = parseInt(evo.id, 10) === pokemon.id;
                                        return (
                                            <React.Fragment key={evo.id}>
                                                <EvolutionSprite evo={evo} isCurrent={isCurrent} />
                                                {index < evolutionChain.length - 1 && (
                                                    <span className="text-base sm:text-lg" style={{ color: colors.textMuted }}>→</span>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: colors.cardLight }}>
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: colors.textMuted }}>Height</p>
                            <p className="mt-1 text-base font-bold" style={{ color: colors.text }}>{pokemon.height}m</p>
                        </div>
                        <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: colors.cardLight }}>
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: colors.textMuted }}>Weight</p>
                            <p className="mt-1 text-base font-bold" style={{ color: colors.text }}>{pokemon.weight}kg</p>
                        </div>
                        <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: colors.cardLight }}>
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: colors.textMuted }}>Habitat</p>
                            <p className="mt-1 text-sm font-bold capitalize" style={{ color: colors.text }}>{pokemon.habitat?.replace(/-/g, ' ') || 'Unknown'}</p>
                        </div>
                        <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: colors.cardLight }}>
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: colors.textMuted }}>Status</p>
                            <p className="mt-1 text-sm font-bold" style={{ color: pokemon.isLegendary ? '#FFD700' : pokemon.isMythical ? '#DA70D6' : colors.text }}>
                                {pokemon.isLegendary ? 'Legendary' : pokemon.isMythical ? 'Mythical' : 'Regular'}
                            </p>
                        </div>
                    </div>

                    {pokemon.forms && pokemon.forms.length > 0 && formsFilter !== 'no-forms' && (
                        <div className="rounded-2xl p-3" style={{ backgroundColor: colors.cardLight }}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: colors.textMuted }}>
                                    Alternate forms
                                </p>
                                <span className="text-[10px] font-semibold" style={{ color: colors.primary }}>
                                    {pokemon.forms.length}
                                </span>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                {pokemon.forms.slice(0, 4).map((form) => (
                                    <div key={form.name} className="text-center max-w-[60px]">
                                        {form.sprite && (
                                            <img src={form.sprite} alt={form.name} className="w-10 h-10 mx-auto" />
                                        )}
                                        <p className="mt-1 text-[9px] capitalize leading-tight" style={{ color: colors.text }}>
                                            {form.name.replace(pokemon.name + '-', '').replace(/-/g, ' ')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="rounded-2xl p-3" style={{ backgroundColor: colors.cardLight }}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-center mb-2" style={{ color: colors.textMuted }}>
                            Abilities
                        </p>
                        <div className="flex flex-wrap justify-center gap-1.5">
                            {pokemon.abilities.map((ability, index) => (
                                <span
                                    key={ability}
                                    className="text-[11px] px-2.5 py-1 rounded-full capitalize font-semibold"
                                    style={{
                                        backgroundColor: index === 0 ? typeColors[primaryType] : colors.card,
                                        color: index === 0 ? 'white' : colors.text,
                                    }}
                                >
                                    {ability.replace(/-/g, ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </article>
        );
    };

    return (
        <main className="space-y-4 sm:space-y-6 pb-8">
            {showIntroModal && <RandomGeneratorIntroModal onClose={handleCloseIntroModal} colors={colors} />}

            <section className="rounded-3xl shadow-lg p-3 sm:p-5" style={{ backgroundColor: colors.card }}>
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3.5">
                    <div className="max-w-2xl flex-1 min-w-0">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em]"
                                style={{ backgroundColor: colors.primary + '1A', color: colors.primary }}
                            >
                                <DiceIcon />
                                Random Generator
                            </div>
                            <h2 className="mt-2 text-lg sm:text-2xl font-extrabold tracking-tight" style={{ color: colors.text }}>
                                Build fast Pokemon guessing rounds
                            </h2>
                            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed" style={{ color: colors.textMuted }}>
                                Roll the secret Pokemon, keep the phone with the player who knows the answer, and let the rest of the group narrow it down with yes or no questions.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-row lg:justify-end lg:min-w-[18rem]">
                        <button
                            type="button"
                            onClick={() => setShowIntroModal(true)}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{ backgroundColor: colors.cardLight, color: colors.text }}
                        >
                            <InfoIcon />
                            How to play
                        </button>
                        <button
                            type="button"
                            onClick={generateRandomPokemon}
                            disabled={isLoading || isLoadingAllIds}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold text-white transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                            style={{ backgroundColor: colors.primary }}
                        >
                            <RefreshIcon />
                            {isLoading ? 'Generating...' : isLoadingAllIds ? 'Preparing pool...' : 'Generate round'}
                        </button>
                    </div>
                </div>

                <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-1 gap-2.5">
                        <button
                            type="button"
                            onClick={handleToggleFiltersLayout}
                            className="w-full rounded-2xl p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{ backgroundColor: colors.background, color: colors.text }}
                            aria-expanded={isFiltersExpanded}
                            aria-controls="random-generator-filters-panel"
                        >
                            <span className="flex items-center justify-between gap-3">
                                <span className="min-w-0">
                                    <span className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: colors.text }}>
                                        <ChartColumnIcon className="w-4 h-4" />
                                        Filters
                                    </span>
                                    <span className="mt-1 block text-[11px] sm:text-xs leading-relaxed" style={{ color: colors.textMuted }}>
                                        {isFiltersExpanded
                                            ? 'Hide the inputs and keep a compact chip summary.'
                                            : `${filterSummaryChips.length} compact filter chip${filterSummaryChips.length !== 1 ? 's' : ''} visible.`}
                                    </span>
                                </span>
                                <span
                                    className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl transition-transform duration-300 ${isFiltersExpanded ? '-rotate-90' : 'rotate-90'}`}
                                    style={{ backgroundColor: colors.primary + '14', color: colors.primary }}
                                    aria-hidden="true"
                                >
                                    <CollapseRightIcon />
                                </span>
                            </span>
                        </button>
                    </div>

                    <div
                        id="random-generator-guide-panel"
                        className="overflow-hidden transition-all duration-300 ease-out"
                        style={{
                            maxHeight: isGuideLayoutExpanded ? '24rem' : '0px',
                            opacity: isGuideLayoutExpanded ? 1 : 0,
                            transform: isGuideLayoutExpanded ? 'translateY(0)' : 'translateY(-8px)',
                            pointerEvents: isGuideLayoutExpanded ? 'auto' : 'none',
                        }}
                        aria-hidden={!isGuideLayoutExpanded}
                    >
                        <div
                            className="rounded-2xl p-3 sm:p-4"
                            style={{ backgroundColor: colors.background, border: `1px solid ${colors.cardLight}` }}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {[
                                    { title: '1. Roll', text: 'Choose how many Pokemon you want in the round.' },
                                    { title: '2. Ask', text: 'Friends narrow it down with yes or no questions only.' },
                                    { title: '3. Reveal', text: 'Open the answer after the best guess or final clue.' },
                                ].map((step) => (
                                    <div key={step.title} className="rounded-xl p-2.5" style={{ backgroundColor: colors.card }}>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: colors.primary }}>
                                            {step.title}
                                        </p>
                                        <p className="mt-1 text-[11px] sm:text-xs leading-relaxed" style={{ color: colors.textMuted }}>
                                            {step.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {!isFiltersExpanded && (
                        <div className="flex flex-wrap gap-1.5">
                            {filterSummaryChips.map((chip) => (
                                <span
                                    key={chip.key}
                                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                    style={{ backgroundColor: colors.cardLight, color: colors.text }}
                                >
                                    <span style={{ color: colors.textMuted }}>{chip.label}</span>
                                    <span>{chip.value}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    <div
                        id="random-generator-filters-panel"
                        className="overflow-hidden transition-all duration-300 ease-out"
                        style={{
                            maxHeight: isFiltersExpanded ? '40rem' : '0px',
                            opacity: isFiltersExpanded ? 1 : 0,
                            transform: isFiltersExpanded ? 'translateY(0)' : 'translateY(-8px)',
                            pointerEvents: isFiltersExpanded ? 'auto' : 'none',
                        }}
                        aria-hidden={!isFiltersExpanded}
                    >
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5 pt-0.5">
                            <label className="block">
                                <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: colors.textMuted }}>
                                    Pokemon count
                                </span>
                                <select
                                    value={pokemonCount}
                                    onChange={(e) => setPokemonCount(parseInt(e.target.value, 10))}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    style={{ backgroundColor: colors.cardLight, color: colors.text }}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map((count) => (
                                        <option key={count} value={count}>{count}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: colors.textMuted }}>
                                    Region pool
                                </span>
                                <select
                                    value={selectedRegion}
                                    onChange={(e) => setSelectedRegion(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    style={{ backgroundColor: colors.cardLight, color: colors.text }}
                                >
                                    <option value="all">All regions</option>
                                    {regionOptions.map((generation) => (
                                        <option key={generation} value={generation} className="capitalize">
                                            {generation.replace('generation-', 'Gen ').replace('-', ' ')}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: colors.textMuted }}>
                                    Type filter
                                </span>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    style={{ backgroundColor: colors.cardLight, color: colors.text }}
                                >
                                    <option value="all">All types</option>
                                    {Object.keys(typeColors).map((type) => (
                                        <option key={type} value={type} className="capitalize">{type}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: colors.textMuted }}>
                                    Legendary pool
                                </span>
                                <select
                                    value={legendaryFilter}
                                    onChange={(e) => setLegendaryFilter(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    style={{ backgroundColor: colors.cardLight, color: colors.text }}
                                >
                                    <option value="all">Any rarity</option>
                                    <option value="legendary">Legendary only</option>
                                    <option value="non-legendary">Exclude legendaries</option>
                                </select>
                            </label>

                            <label className="block">
                                <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: colors.textMuted }}>
                                    Evolution stage
                                </span>
                                <select
                                    value={fullyEvolvedFilter}
                                    onChange={(e) => setFullyEvolvedFilter(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    style={{ backgroundColor: colors.cardLight, color: colors.text }}
                                >
                                    <option value="all">Any stage</option>
                                    <option value="fully-evolved">Fully evolved only</option>
                                    <option value="not-fully-evolved">Not fully evolved</option>
                                </select>
                            </label>

                            <label className="block">
                                <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: colors.textMuted }}>
                                    Form filter
                                </span>
                                <select
                                    value={formsFilter}
                                    onChange={(e) => setFormsFilter(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    style={{ backgroundColor: colors.cardLight, color: colors.text }}
                                >
                                    <option value="all">Any form pool</option>
                                    <option value="with-forms">Only Pokemon with alt forms</option>
                                    <option value="no-forms">Only Pokemon without alt forms</option>
                                </select>
                            </label>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl shadow-lg p-4 sm:p-6" style={{ backgroundColor: colors.card }}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                    <div>
                        <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.text }}>
                            Current roll
                        </h3>
                        <p className="mt-1 text-sm" style={{ color: colors.textMuted }}>
                            {generationSummary.generated} of {generationSummary.requested} Pokemon ready for this round.
                        </p>
                        {generationSummary.exhausted && generationSummary.generated < generationSummary.requested && (
                            <p className="mt-2 text-xs leading-relaxed" style={{ color: colors.textMuted }}>
                                Only {generationSummary.generated} Pokemon matched the current filters. Loosen one or two parameters to fill the full round.
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={generateRandomPokemon}
                        disabled={isLoading || isLoadingAllIds}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                    >
                        <RefreshIcon />
                        Reroll
                    </button>
                </div>

                {isLoading ? (
                    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
                        {Array.from({ length: pokemonCount }).map((_, index) => (
                            <div key={index} className="rounded-3xl overflow-hidden animate-pulse" style={{ backgroundColor: colors.cardLight }}>
                                <div className="h-56 relative" style={{ backgroundColor: colors.card }}>
                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="h-5 rounded w-2/3 mx-auto" style={{ backgroundColor: colors.card }}></div>
                                    <div className="flex gap-2 justify-center">
                                        <div className="h-6 w-16 rounded-full" style={{ backgroundColor: colors.card }}></div>
                                        <div className="h-6 w-16 rounded-full" style={{ backgroundColor: colors.card }}></div>
                                    </div>
                                    <div className="h-24 rounded-2xl" style={{ backgroundColor: colors.card }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : generatedPokemon.length > 0 ? (
                    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
                        {generatedPokemon.map((pokemon, index) => (
                            <PokemonDetailCard key={`${pokemon.id}-${index}`} pokemon={pokemon} roundNumber={index + 1} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        compact
                        title="Nothing rolled"
                        message="No Pokemon match the selected filters. Try loosening them."
                    />
                )}
            </section>
        </main>
    );
}