import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import '../../styles/random-generator-view.css';
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
import { AnchoredPopover } from '../AnchoredPopover';
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

const RANDOM_GENERATOR_STAT_LABELS = Object.freeze({
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
});

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

const formatPokemonStatLabel = (statName = '') => RANDOM_GENERATOR_STAT_LABELS[statName] || statName.replace(/-/g, ' ');

const getStrongestStat = (stats = []) => {
    if (!Array.isArray(stats) || stats.length === 0) return null;
    return stats.reduce((best, stat) => (!best || stat.base_stat > best.base_stat ? stat : best), null);
};

const getPokemonStatusMeta = (pokemon, colors) => {
    if (pokemon.isLegendary) {
        return {
            label: 'Legendary',
            tone: colors.warning,
            hint: 'Rare, high-impact roster pull.',
        };
    }

    if (pokemon.isMythical) {
        return {
            label: 'Mythical',
            tone: colors.primary,
            hint: 'Event-tier and unusually rare.',
        };
    }

    return {
        label: 'Regular',
        tone: colors.text,
        hint: 'Standard encounter pool.',
    };
};

const StatusInfoCard = ({ pokemon, colors }) => {
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef(null);
    const popoverRef = useRef(null);
    const closeTimerRef = useRef(null);

    const statusMeta = useMemo(() => getPokemonStatusMeta(pokemon, colors), [pokemon, colors]);
    const strongestStat = useMemo(() => getStrongestStat(pokemon.stats), [pokemon.stats]);

    const clearCloseTimer = useCallback(() => {
        if (typeof window === 'undefined' || !closeTimerRef.current) return;
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
    }, []);

    const openPopover = useCallback(() => {
        clearCloseTimer();
        setIsOpen(true);
    }, [clearCloseTimer]);

    const scheduleClose = useCallback(() => {
        if (typeof window === 'undefined') return;
        clearCloseTimer();
        closeTimerRef.current = window.setTimeout(() => {
            setIsOpen(false);
            closeTimerRef.current = null;
        }, 90);
    }, [clearCloseTimer]);

    useEffect(() => () => {
        if (typeof window !== 'undefined' && closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handlePointerDown = (event) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
            setIsOpen(false);
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                className="random-generator-meta-card random-generator-status-card"
                style={{ '--random-generator-status-tone': statusMeta.tone }}
                aria-expanded={isOpen}
                aria-label={`Status details for ${pokemon.name}`}
                onClick={() => {
                    clearCloseTimer();
                    setIsOpen((prev) => !prev);
                }}
                onMouseEnter={openPopover}
                onMouseLeave={scheduleClose}
            >
                <span className="random-generator-status-card__meta">
                    <span className="random-generator-meta-card__label">Status</span>
                    <span className="random-generator-meta-card__value random-generator-status-card__value">
                        {statusMeta.label}
                    </span>
                </span>
                <span className="random-generator-status-card__icon" aria-hidden="true">
                    <InfoIcon />
                </span>
            </button>

            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={anchorRef}
                popoverRef={popoverRef}
                className="random-generator-status-popover"
                style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                }}
                arrowStyle={{
                    backgroundColor: colors.card,
                    borderTop: `1px solid ${colors.border}`,
                    borderLeft: `1px solid ${colors.border}`,
                }}
                placement="top"
                role="tooltip"
                ariaLabel={`${pokemon.name} status details`}
            >
                <div
                    className="random-generator-status-popover__body"
                    onMouseEnter={openPopover}
                    onMouseLeave={scheduleClose}
                >
                    <p className="random-generator-status-popover__eyebrow">Card info</p>
                    <div className="random-generator-status-popover__row">
                        <span>Status</span>
                        <strong style={{ color: statusMeta.tone }}>{statusMeta.label}</strong>
                    </div>
                    <div className="random-generator-status-popover__row">
                        <span>Strongest stat</span>
                        <strong>
                            {strongestStat
                                ? `${formatPokemonStatLabel(strongestStat.name)} ${strongestStat.base_stat}`
                                : 'Unknown'}
                        </strong>
                    </div>
                    <p className="random-generator-status-popover__hint">{statusMeta.hint}</p>
                </div>
            </AnchoredPopover>
        </>
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
        const primaryTypeColor = typeColors[primaryType] || colors.primary;

        const EvolutionSprite = ({ evo, isCurrent = false }) => {
            const spriteSrc = isCurrent ? (pokemon.sprite || POKEBALL_PLACEHOLDER_URL) : (evoSprites[evo.id] || POKEBALL_PLACEHOLDER_URL);

            return (
                <div className={`random-generator-evolution-node ${isCurrent ? 'is-current' : ''}`}>
                    <div
                        className="random-generator-evolution-node__art"
                        style={{
                            backgroundColor: isCurrent ? typeColors[primaryType] + '14' : colors.background,
                            borderColor: isCurrent ? typeColors[primaryType] : colors.border,
                        }}
                    >
                        {loadingSprites ? (
                            <div
                                className={`random-generator-evolution-node__skeleton ${isCurrent ? 'is-current' : ''} animate-pulse`}
                                style={{ backgroundColor: colors.cardLight }}
                            />
                        ) : (
                            <img
                                src={spriteSrc}
                                alt={evo.name}
                                className={`random-generator-evolution-node__image ${isCurrent ? 'is-current' : ''}`}
                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                            />
                        )}
                    </div>
                    <p
                        className={`random-generator-evolution-node__name ${isCurrent ? 'is-current' : ''}`}
                        style={{ color: isCurrent ? colors.text : colors.textMuted }}
                    >
                        {evo.name.replace(/-/g, ' ')}
                    </p>
                </div>
            );
        };

        return (
            <article
                className="random-generator-card"
                style={{
                    '--random-generator-type-color': primaryTypeColor,
                    '--random-generator-type-soft': `${primaryTypeColor}18`,
                    '--random-generator-type-border': `${primaryTypeColor}44`,
                }}
            >
                <div className="random-generator-card__hero">
                    <div className="random-generator-card__top">
                        <div className="random-generator-card__chip-row">
                            <span className="random-generator-card__chip" style={{ color: colors.primary }}>
                                Round {roundNumber}
                            </span>
                            <span className="random-generator-card__chip" style={{ color: colors.textMuted }}>
                                #{String(pokemon.id).padStart(3, '0')}
                            </span>
                        </div>
                        <span className="random-generator-card__chip" style={{ backgroundColor: `${primaryTypeColor}1A`, color: primaryTypeColor }}>
                            {pokemon.generation}
                        </span>
                    </div>

                    <div className="random-generator-card__hero-body">
                        <div
                            className="random-generator-card__art"
                            style={{
                                backgroundColor: `${primaryTypeColor}1A`,
                                borderColor: primaryTypeColor,
                            }}
                        >
                            <img
                                src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL}
                                alt={pokemon.name}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                            />
                        </div>
                        <div className="random-generator-card__identity">
                            <h3 className="random-generator-card__title">
                                {pokemon.name.replace(/-/g, ' ')}
                            </h3>
                            <div className="random-generator-card__taxonomy">
                                <div className="random-generator-card__type-list">
                                    {pokemon.types.map((type) => (
                                        <span
                                            key={type}
                                            className="random-generator-card__type-pill"
                                            style={{ backgroundColor: typeColors[type] }}
                                        >
                                            {type}
                                        </span>
                                    ))}
                                </div>
                                {pokemon.abilities?.length > 0 && (
                                    <div className="random-generator-card__ability-group">
                                        <span className="random-generator-card__ability-label">Abilities</span>
                                        <div className="random-generator-card__ability-list">
                                            {pokemon.abilities.map((ability, index) => (
                                                <span
                                                    key={ability}
                                                    className={`random-generator-card__ability-pill ${index === 0 ? 'is-primary' : ''} capitalize`}
                                                >
                                                    {ability.replace(/-/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="random-generator-card__body">
                    <div className="random-generator-meta-grid">
                        <div className="random-generator-meta-card">
                            <p className="random-generator-meta-card__label">Height</p>
                            <p className="random-generator-meta-card__value">{pokemon.height}m</p>
                        </div>
                        <div className="random-generator-meta-card">
                            <p className="random-generator-meta-card__label">Weight</p>
                            <p className="random-generator-meta-card__value">{pokemon.weight}kg</p>
                        </div>
                        <div className="random-generator-meta-card">
                            <p className="random-generator-meta-card__label">Habitat</p>
                            <p className="random-generator-meta-card__value random-generator-meta-card__value--small capitalize">
                                {pokemon.habitat?.replace(/-/g, ' ') || 'Unknown'}
                            </p>
                        </div>
                        <StatusInfoCard pokemon={pokemon} colors={colors} />
                    </div>

                    {hasEvolutionLine && (
                        <div className="random-generator-section random-generator-section--compact random-generator-section--centered">
                            <div className="random-generator-section__header random-generator-section__header--centered">
                                <p className="random-generator-section__label" style={{ color: colors.primary }}>
                                    Evolution line
                                </p>
                                <span className="random-generator-section__meta" style={{ color: colors.textMuted }}>
                                    {pokemon.isFullyEvolved ? 'Final stage' : `Stage ${pokemon.evolutionStage}`}
                                </span>
                            </div>
                            <div
                                className="random-generator-evolution-strip overflow-x-auto custom-scrollbar"
                                style={{ '--scrollbar-track-color': colors.cardLight, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.cardLight }}
                            >
                                <div className="random-generator-evolution-strip__track">
                                    {evolutionChain.map((evo, index) => {
                                        const isCurrent = parseInt(evo.id, 10) === pokemon.id;
                                        return (
                                            <React.Fragment key={evo.id}>
                                                <EvolutionSprite evo={evo} isCurrent={isCurrent} />
                                                {index < evolutionChain.length - 1 && (
                                                    <span className="random-generator-evolution-separator" style={{ color: colors.textMuted }}>→</span>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {pokemon.forms && pokemon.forms.length > 0 && formsFilter !== 'no-forms' && (
                        <div className="random-generator-section random-generator-section--compact">
                            <div className="random-generator-section__header">
                                <p className="random-generator-section__label">
                                    Alternate forms
                                </p>
                                <span className="random-generator-section__meta">
                                    {pokemon.forms.length}
                                </span>
                            </div>
                            <div className="random-generator-forms-grid">
                                {pokemon.forms.slice(0, 4).map((form) => (
                                    <div key={form.name} className="random-generator-form">
                                        {form.sprite && (
                                            <img src={form.sprite} alt={form.name} className="w-10 h-10 mx-auto" />
                                        )}
                                        <p className="random-generator-form__name">
                                            {form.name.replace(pokemon.name + '-', '').replace(/-/g, ' ')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </article>
        );
    };

    return (
        <main className="random-generator-view">
            {showIntroModal && <RandomGeneratorIntroModal onClose={handleCloseIntroModal} colors={colors} />}

            <section className="random-generator-panel random-generator-panel--hero">
                <div className="random-generator-panel__header">
                    <div className="random-generator-panel__summary">
                        <div className="random-generator-panel__eyebrow">
                            <DiceIcon />
                            Random Generator
                        </div>
                        <h2 className="random-generator-panel__title">Build fast Pokemon guessing rounds</h2>
                        <p className="random-generator-panel__description">
                            Roll the secret Pokemon, keep the phone with the player who knows the answer, and let the rest of the group narrow it down with yes or no questions.
                        </p>
                    </div>

                    <div className="random-generator-panel__actions">
                        <button
                            type="button"
                            onClick={() => setShowIntroModal(true)}
                            className="random-generator-action random-generator-action--ghost"
                        >
                            <InfoIcon />
                            How to play
                        </button>
                        <button
                            type="button"
                            onClick={generateRandomPokemon}
                            disabled={isLoading || isLoadingAllIds}
                            className="random-generator-action random-generator-action--primary"
                        >
                            <RefreshIcon />
                            {isLoading ? 'Generating...' : isLoadingAllIds ? 'Preparing pool...' : 'Generate round'}
                        </button>
                    </div>
                </div>

                <div className="random-generator-filters">
                    <button
                        type="button"
                        onClick={handleToggleFiltersLayout}
                        className="random-generator-filters__toggle"
                        aria-expanded={isFiltersExpanded}
                        aria-controls="random-generator-filters-panel"
                    >
                        <span className="flex items-center justify-between gap-3">
                            <span className="min-w-0 flex items-center gap-2 text-sm font-bold text-fg">
                                <span className="inline-flex items-center gap-2 text-sm font-bold text-fg">
                                    <ChartColumnIcon className="w-4 h-4" />
                                    Filters
                                </span>
                                <span className="random-generator-filters__toggle-copy">
                                    {isFiltersExpanded
                                        ? 'Hide the inputs and keep a compact chip summary.'
                                        : `${filterSummaryChips.length} compact filter chip${filterSummaryChips.length !== 1 ? 's' : ''} visible.`}
                                </span>
                            </span>
                            <span className={`random-generator-filters__toggle-icon ${isFiltersExpanded ? 'is-expanded' : ''}`} aria-hidden="true">
                                <CollapseRightIcon />
                            </span>
                        </span>
                    </button>

                    {!isFiltersExpanded && (
                        <div className="random-generator-filters__summary">
                            {filterSummaryChips.map((chip) => (
                                <span key={chip.key} className="random-generator-filters__chip">
                                    <span className="text-muted">{chip.label}</span>
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
                        <div className="random-generator-filters__grid">
                            <label className="random-generator-field">
                                <span className="random-generator-field__label">Pokemon count</span>
                                <select
                                    value={pokemonCount}
                                    onChange={(e) => setPokemonCount(parseInt(e.target.value, 10))}
                                    className="random-generator-select"
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map((count) => (
                                        <option key={count} value={count}>{count}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="random-generator-field">
                                <span className="random-generator-field__label">Region pool</span>
                                <select
                                    value={selectedRegion}
                                    onChange={(e) => setSelectedRegion(e.target.value)}
                                    className="random-generator-select capitalize"
                                >
                                    <option value="all">All regions</option>
                                    {regionOptions.map((generation) => (
                                        <option key={generation} value={generation} className="capitalize">
                                            {generation.replace('generation-', 'Gen ').replace('-', ' ')}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="random-generator-field">
                                <span className="random-generator-field__label">Type filter</span>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="random-generator-select capitalize"
                                >
                                    <option value="all">All types</option>
                                    {Object.keys(typeColors).map((type) => (
                                        <option key={type} value={type} className="capitalize">{type}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="random-generator-field">
                                <span className="random-generator-field__label">Legendary pool</span>
                                <select
                                    value={legendaryFilter}
                                    onChange={(e) => setLegendaryFilter(e.target.value)}
                                    className="random-generator-select"
                                >
                                    <option value="all">Any rarity</option>
                                    <option value="legendary">Legendary only</option>
                                    <option value="non-legendary">Exclude legendaries</option>
                                </select>
                            </label>

                            <label className="random-generator-field">
                                <span className="random-generator-field__label">Evolution stage</span>
                                <select
                                    value={fullyEvolvedFilter}
                                    onChange={(e) => setFullyEvolvedFilter(e.target.value)}
                                    className="random-generator-select"
                                >
                                    <option value="all">Any stage</option>
                                    <option value="fully-evolved">Fully evolved only</option>
                                    <option value="not-fully-evolved">Not fully evolved</option>
                                </select>
                            </label>

                            <label className="random-generator-field">
                                <span className="random-generator-field__label">Form filter</span>
                                <select
                                    value={formsFilter}
                                    onChange={(e) => setFormsFilter(e.target.value)}
                                    className="random-generator-select"
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

            <section className="random-generator-panel random-generator-panel--results">
                <div className="random-generator-results__header">
                    <div>
                        <h3 className="random-generator-results__title">Current roll</h3>
                        <p className="random-generator-results__copy">
                            {generationSummary.generated} of {generationSummary.requested} Pokemon ready for this round.
                        </p>
                        {generationSummary.exhausted && generationSummary.generated < generationSummary.requested && (
                            <p className="random-generator-results__hint">
                                Only {generationSummary.generated} Pokemon matched the current filters. Loosen one or two parameters to fill the full round.
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={generateRandomPokemon}
                        disabled={isLoading || isLoadingAllIds}
                        className="random-generator-action random-generator-action--ghost"
                    >
                        <RefreshIcon />
                        Reroll
                    </button>
                </div>

                {isLoading ? (
                    <div className="random-generator-results__grid">
                        {Array.from({ length: pokemonCount }).map((_, index) => (
                            <div key={index} className="rounded-2xl overflow-hidden border border-border bg-surface-raised animate-pulse">
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
                    <div className="random-generator-results__grid">
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