import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import '../../styles/generation-quiz-view.css';

import { GENERATION_RANGES } from '../../constants/pokemon';
import {
    buildPokemonQuizNameAliases,
    getPokemonApiData,
    getPokemonSpeciesData,
    loadPokemonIndex,
    normalizePokemonQuizInput,
} from '../../services/pokemonDataCache';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { EmptyState } from '../EmptyState';
import { PokemonGenerationQuizAutocomplete } from '../PokemonGenerationQuizAutocomplete';
import { PokemonGenerationQuizCard } from '../PokemonGenerationQuizCard';
import {
    ChartColumnIcon,
    CloseIcon,
    PokeballIcon,
    RefreshIcon,
    SparklesIcon,
    SuccessToastIcon,
} from '../icons';
import { QuizCelebrationModal } from '../modals';
import { useQuizRuns } from '../../hooks/useQuizRuns';

const QUIZ_GENERATION_KEYS = Object.keys(GENERATION_RANGES).filter((key) => key !== 'all');
const MAX_AUTOCOMPLETE_SUGGESTIONS = 5;
const MIN_AUTOCOMPLETE_CHARACTERS = 5;
const BEST_RUN_STORAGE_PREFIX = 'generationQuizBest';

const GENERATION_LABELS = Object.freeze({
    'generation-i': 'Gen I',
    'generation-ii': 'Gen II',
    'generation-iii': 'Gen III',
    'generation-iv': 'Gen IV',
    'generation-v': 'Gen V',
    'generation-vi': 'Gen VI',
    'generation-vii': 'Gen VII',
    'generation-viii': 'Gen VIII',
    'generation-ix': 'Gen IX',
});

const DISPLAY_NAME_OVERRIDES = Object.freeze({
    farfetchd: "Farfetch'd",
    sirfetchd: "Sirfetch'd",
    'mr-mime': 'Mr. Mime',
    'mime-jr': 'Mime Jr.',
    'mr-rime': 'Mr. Rime',
    'type-null': 'Type: Null',
    'porygon-z': 'Porygon-Z',
    'ho-oh': 'Ho-Oh',
    flabebe: 'Flabebe',
});

const sortGenerationKeys = (keys) => QUIZ_GENERATION_KEYS.filter((key) => keys.includes(key));

const formatPokemonDisplayName = (name = '') => {
    if (DISPLAY_NAME_OVERRIDES[name]) {
        return DISPLAY_NAME_OVERRIDES[name];
    }

    return name
        .split('-')
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
};

const getGenerationKeyForPokemon = (pokemonId) => QUIZ_GENERATION_KEYS.find((generationKey) => {
    const range = GENERATION_RANGES[generationKey];
    return pokemonId >= range.start && pokemonId <= range.end;
}) || null;

const buildSelectionSignature = (generationKeys) => {
    if (!generationKeys.length) return 'empty';
    return generationKeys.length === QUIZ_GENERATION_KEYS.length
        ? 'all'
        : generationKeys.join('|');
};

export function GenerationQuizView({ showDetails, showToast }) {
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const detailCacheRef = useRef({});

    const [pokemonIndex, setPokemonIndex] = useState([]);
    const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
    const [celebrationPokemon, setCelebrationPokemon] = useState(null);
    const [isLoadingIndex, setIsLoadingIndex] = useState(true);
    const [selectedGenerationKeys, setSelectedGenerationKeys] = useState(() => new Set(['generation-i']));
    const [answerInput, setAnswerInput] = useState('');
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [currentTip, setCurrentTip] = useState('');
    const [feedback, setFeedback] = useState({ tone: 'muted', message: 'Choose generations.' });
    const [announcement, setAnnouncement] = useState('');
    const [newlyFoundId, setNewlyFoundId] = useState(null);
    const [loadingDetailId, setLoadingDetailId] = useState(null);
    const [gridFilter, setGridFilter] = useState('all'); // 'all', 'guessed', 'missing'

    const {
        quizRuns,
        activeRun,
        startNewRun,
        resumeRun,
        rerunRun,
        updateActiveRunProgress,
        deleteRun,
        setActiveRunId
    } = useQuizRuns();

    const quizStarted = activeRun !== null;
    const activeGenerationKeys = activeRun ? activeRun.generationKeys : [];
    
    const foundIds = useMemo(() => {
        return new Set(activeRun ? activeRun.foundIds : []);
    }, [activeRun?.foundIds]);

    const foundOrder = activeRun ? activeRun.foundOrder : [];
    const invalidGuesses = activeRun ? activeRun.invalidGuesses : 0;
    const consecutiveMisses = activeRun ? activeRun.consecutiveMisses : 0;

    const deferredAnswerInput = useDeferredValue(answerInput);

    useEffect(() => {
        let cancelled = false;

        const loadIndexData = async () => {
            setIsLoadingIndex(true);

            try {
                const index = await loadPokemonIndex();
                if (!cancelled) {
                    setPokemonIndex(index);
                }
            } catch (error) {
                console.error('Failed to load Pokémon quiz index:', error);
                if (!cancelled) {
                    setPokemonIndex([]);
                    setFeedback({ tone: 'danger', message: 'Could not load the quiz data right now.' });
                }
                showToast?.('Could not load the Generation Quiz.', 'error');
            } finally {
                if (!cancelled) {
                    setIsLoadingIndex(false);
                }
            }
        };

        loadIndexData();

        return () => {
            cancelled = true;
        };
    }, [showToast]);

    useEffect(() => {
        if (!newlyFoundId || typeof window === 'undefined') return undefined;

        const timer = window.setTimeout(() => {
            setNewlyFoundId(null);
        }, 1500);

        return () => window.clearTimeout(timer);
    }, [newlyFoundId]);

    const catalog = useMemo(() => pokemonIndex.map((pokemon) => {
        const generationKey = getGenerationKeyForPokemon(pokemon.id);
        return {
            ...pokemon,
            generationKey,
            generationLabel: generationKey ? GENERATION_LABELS[generationKey] : 'Unknown',
            displayName: formatPokemonDisplayName(pokemon.name),
            spriteUrl: getPokemonFrontSpriteUrl(pokemon.id),
            aliases: buildPokemonQuizNameAliases(pokemon.name),
        };
    }), [pokemonIndex]);

    const pokemonById = useMemo(() => new Map(catalog.map((pokemon) => [pokemon.id, pokemon])), [catalog]);

    const selectedGenerationList = useMemo(
        () => sortGenerationKeys(Array.from(selectedGenerationKeys)),
        [selectedGenerationKeys]
    );
    const activeGenerationList = useMemo(
        () => sortGenerationKeys(activeGenerationKeys),
        [activeGenerationKeys]
    );

    const generationCounts = useMemo(() => {
        const counts = new Map(QUIZ_GENERATION_KEYS.map((generationKey) => [generationKey, 0]));
        catalog.forEach((pokemon) => {
            if (pokemon.generationKey) {
                counts.set(pokemon.generationKey, (counts.get(pokemon.generationKey) || 0) + 1);
            }
        });
        return counts;
    }, [catalog]);

    const previewEntries = useMemo(() => {
        if (selectedGenerationList.length === 0) return [];
        const selectionSet = new Set(selectedGenerationList);
        return catalog.filter((pokemon) => selectionSet.has(pokemon.generationKey));
    }, [catalog, selectedGenerationList]);

    const activeEntries = useMemo(() => {
        if (!quizStarted || activeGenerationList.length === 0) return [];
        const selectionSet = new Set(activeGenerationList);
        return catalog.filter((pokemon) => selectionSet.has(pokemon.generationKey));
    }, [catalog, quizStarted, activeGenerationList]);

    const answerLookup = useMemo(() => {
        const lookup = new Map();
        activeEntries.forEach((pokemon) => {
            pokemon.aliases.forEach((alias) => {
                if (!lookup.has(alias)) {
                    lookup.set(alias, pokemon.id);
                }
            });
        });
        return lookup;
    }, [activeEntries]);

    const remainingEntries = useMemo(
        () => activeEntries.filter((pokemon) => !foundIds.has(pokemon.id)),
        [activeEntries, foundIds]
    );

    useEffect(() => {
        if (consecutiveMisses >= 3 && remainingEntries.length > 0) {
            const randomIndex = Math.floor(Math.random() * remainingEntries.length);
            const randomPokemon = remainingEntries[randomIndex];
            if (randomPokemon) {
                const firstLetter = randomPokemon.displayName.charAt(0).toUpperCase();
                const nameLength = randomPokemon.displayName.length;
                const genLabel = randomPokemon.generationLabel;
                setCurrentTip(`Try guessing a ${genLabel} Pokémon starting with '${firstLetter}' (${nameLength} letters)!`);
            }
        } else if (consecutiveMisses === 0) {
            setCurrentTip('');
        }
    }, [consecutiveMisses, remainingEntries]);

    const visibleEntries = useMemo(() => {
        if (!quizStarted) return [];
        if (gridFilter === 'guessed') {
            return activeEntries.filter((pokemon) => foundIds.has(pokemon.id));
        }
        if (gridFilter === 'missing') {
            return activeEntries.filter((pokemon) => !foundIds.has(pokemon.id));
        }
        return activeEntries;
    }, [activeEntries, gridFilter, foundIds, quizStarted]);

    const foundCount = foundIds.size;
    const totalCount = activeEntries.length;
    const remainingCount = Math.max(0, totalCount - foundCount);
    const completionPercent = totalCount > 0 ? Math.round((foundCount / totalCount) * 100) : 0;
    const accuracyPercent = foundCount + invalidGuesses > 0
        ? Math.round((foundCount / (foundCount + invalidGuesses)) * 100)
        : 100;
    const isComplete = quizStarted && totalCount > 0 && foundCount === totalCount;

    const normalizedAnswerInput = useMemo(
        () => normalizePokemonQuizInput(deferredAnswerInput),
        [deferredAnswerInput]
    );
    const hasAutocompleteAccess = quizStarted && answerInput.trim().length >= MIN_AUTOCOMPLETE_CHARACTERS;


    const selectionSignature = useMemo(
        () => buildSelectionSignature(quizStarted ? activeGenerationList : selectedGenerationList),
        [quizStarted, activeGenerationList, selectedGenerationList]
    );

    const bestRun = useMemo(() => {
        const run = quizRuns.find((r) => r.id === selectionSignature);
        if (run && run.bestFound > 0) {
            return {
                bestFound: run.bestFound,
                totalCount: run.totalCount,
                accuracyPercent: run.bestAccuracy,
            };
        }
        return null;
    }, [quizRuns, selectionSignature]);

    useEffect(() => {
        if (!quizStarted || !normalizedAnswerInput || !activeRun) return;

        const matchedPokemonId = answerLookup.get(normalizedAnswerInput);
        if (!matchedPokemonId || foundIds.has(matchedPokemonId)) return;

        const matchedPokemon = pokemonById.get(matchedPokemonId);
        if (!matchedPokemon) return;

        const nextFoundIdsArray = [...activeRun.foundIds, matchedPokemonId];
        const nextFoundOrder = [...activeRun.foundOrder, matchedPokemonId];
        setNewlyFoundId(matchedPokemonId);
        
        updateActiveRunProgress(nextFoundIdsArray, nextFoundOrder, activeRun.invalidGuesses, 0);

        setAnnouncement(`${matchedPokemon.displayName} found. ${nextFoundIdsArray.length} of ${totalCount}.`);
        setFeedback({
            tone: 'success',
            message: `${matchedPokemon.displayName} registered. ${Math.max(0, totalCount - nextFoundIdsArray.length)} remaining.`,
        });
        setAnswerInput('');
        setActiveSuggestionIndex(0);
    }, [answerLookup, foundIds, normalizedAnswerInput, pokemonById, quizStarted, totalCount, activeRun, updateActiveRunProgress]);

    useEffect(() => {
        if (!quizStarted) return;

        if (isComplete) {
            setAnnouncement('Generation Quiz complete.');
            setFeedback({ tone: 'success', message: 'Quiz complete. Every selected Pokémon has been found.' });
            showToast?.('Generation Quiz complete!', 'success');

            if (activeEntries.length > 0) {
                const randomIndex = Math.floor(Math.random() * activeEntries.length);
                setCelebrationPokemon(activeEntries[randomIndex]);
            } else {
                setCelebrationPokemon(null);
            }
            setIsCelebrationOpen(true);
        }
    }, [isComplete, quizStarted, showToast, activeEntries]);

    useEffect(() => {
        if (!quizStarted) return;
        inputRef.current?.focus();
    }, [quizStarted]);

    const suggestions = useMemo(() => {
        if (!hasAutocompleteAccess || normalizedAnswerInput.length < MIN_AUTOCOMPLETE_CHARACTERS) return [];

        return remainingEntries
            .map((pokemon) => {
                const startsWithMatch = pokemon.aliases.some((alias) => alias.startsWith(normalizedAnswerInput));
                const includesMatch = startsWithMatch || pokemon.aliases.some((alias) => alias.includes(normalizedAnswerInput));

                if (!includesMatch) return null;

                return {
                    ...pokemon,
                    sortScore: startsWithMatch ? 0 : 1,
                };
            })
            .filter(Boolean)
            .sort((left, right) => {
                if (left.sortScore !== right.sortScore) return left.sortScore - right.sortScore;
                return left.id - right.id;
            })
            .slice(0, MAX_AUTOCOMPLETE_SUGGESTIONS);
    }, [hasAutocompleteAccess, normalizedAnswerInput, remainingEntries]);

    useEffect(() => {
        setActiveSuggestionIndex(0);
    }, [normalizedAnswerInput]);

    const recentFinds = useMemo(
        () => foundOrder.slice(-6).reverse().map((pokemonId) => pokemonById.get(pokemonId)).filter(Boolean),
        [foundOrder, pokemonById]
    );

    const toggleGeneration = useCallback((generationKey) => {
        setSelectedGenerationKeys((current) => {
            const next = new Set(current);
            if (next.has(generationKey)) {
                next.delete(generationKey);
            } else {
                next.add(generationKey);
            }
            return next;
        });
    }, []);

    const toggleAllGenerations = useCallback(() => {
        setSelectedGenerationKeys((current) => {
            if (current.size === QUIZ_GENERATION_KEYS.length) {
                return new Set();
            }
            return new Set(QUIZ_GENERATION_KEYS);
        });
    }, []);

    const startQuiz = useCallback(() => {
        if (selectedGenerationList.length === 0) {
            setFeedback({ tone: 'warning', message: 'Select at least one generation.' });
            return;
        }

        startNewRun(selectedGenerationList, previewEntries.length);
        setAnswerInput('');
        setGridFilter('all');
        setActiveSuggestionIndex(0);
        setAnnouncement('New Generation Quiz started.');
        setFeedback({ tone: 'info', message: `${previewEntries.length} Pokémon ready.` });
    }, [previewEntries.length, selectedGenerationList, startNewRun]);

    const commitFoundPokemon = useCallback((pokemonId) => {
        const pokemon = pokemonById.get(pokemonId);
        if (!pokemon || !activeRun || foundIds.has(pokemonId)) return;

        const nextFoundIdsArray = [...activeRun.foundIds, pokemonId];
        const nextFoundOrder = [...activeRun.foundOrder, pokemonId];
        setNewlyFoundId(pokemonId);

        updateActiveRunProgress(nextFoundIdsArray, nextFoundOrder, activeRun.invalidGuesses, 0);

        setAnnouncement(`${pokemon.displayName} found. ${nextFoundIdsArray.length} of ${totalCount}.`);
        setFeedback({
            tone: 'success',
            message: `${pokemon.displayName} registered. ${Math.max(0, totalCount - nextFoundIdsArray.length)} remaining.`,
        });
        setAnswerInput('');
        setActiveSuggestionIndex(0);
    }, [activeRun, foundIds, pokemonById, totalCount, updateActiveRunProgress]);

    const handleSelectSuggestion = useCallback((pokemonId) => {
        commitFoundPokemon(pokemonId);
        inputRef.current?.focus();
    }, [commitFoundPokemon]);

    const handleInputKeyDown = useCallback((event) => {
        if (event.key === 'ArrowDown' && suggestions.length > 0) {
            event.preventDefault();
            setActiveSuggestionIndex((current) => (current + 1) % suggestions.length);
            return;
        }

        if (event.key === 'ArrowUp' && suggestions.length > 0) {
            event.preventDefault();
            setActiveSuggestionIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();

            const selectedSuggestion = suggestions[activeSuggestionIndex];
            if (selectedSuggestion) {
                handleSelectSuggestion(selectedSuggestion.id);
                return;
            }

            const normalizedValue = normalizePokemonQuizInput(answerInput);
            if (!normalizedValue) return;

            const matchedPokemonId = answerLookup.get(normalizedValue);
            if (matchedPokemonId && foundIds.has(matchedPokemonId)) {
                setFeedback({ tone: 'warning', message: 'That Pokémon is already on your found list.' });
                return;
            }

            if (!matchedPokemonId) {
                if (activeRun) {
                    updateActiveRunProgress(
                        activeRun.foundIds,
                        activeRun.foundOrder,
                        activeRun.invalidGuesses + 1,
                        activeRun.consecutiveMisses + 1
                    );
                }
                setFeedback({ tone: 'danger', message: 'No Pokémon match that guess yet.' });
            }
        }
    }, [activeSuggestionIndex, answerInput, answerLookup, foundIds, handleSelectSuggestion, suggestions, activeRun, updateActiveRunProgress]);

    const inspectPokemon = useCallback(async (pokemon) => {
        if (!pokemon || loadingDetailId) return;

        const cachedDetail = detailCacheRef.current[pokemon.id];
        if (cachedDetail) {
            showDetails(cachedDetail);
            return;
        }

        setLoadingDetailId(pokemon.id);

        try {
            const [pokemonData, speciesData] = await Promise.all([
                getPokemonApiData(pokemon.id),
                getPokemonSpeciesData(pokemon.id),
            ]);

            if (!pokemonData || !speciesData) {
                throw new Error('Missing Pokémon detail payload.');
            }

            const detailPayload = {
                id: pokemonData.id,
                name: pokemonData.name,
                types: pokemonData.types.map((entry) => entry.type.name),
                abilities: pokemonData.abilities.map((entry) => entry.ability),
                stats: pokemonData.stats.map((entry) => ({ name: entry.stat.name, base_stat: entry.base_stat })),
                sprite: getPokemonArtworkSpriteUrl(pokemonData.id),
                shinySprite: getPokemonArtworkSpriteUrl(pokemonData.id, { shiny: true }),
                animatedSprite: pokemonData.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default || getPokemonFrontSpriteUrl(pokemonData.id),
                animatedShinySprite: pokemonData.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_shiny || getPokemonFrontSpriteUrl(pokemonData.id, { shiny: true }),
                evolution_chain_url: speciesData.evolution_chain?.url || null,
            };

            detailCacheRef.current[pokemon.id] = detailPayload;
            showDetails(detailPayload);
        } catch (error) {
            console.error(`Failed to load detail for Pokémon ${pokemon.id}:`, error);
            showToast?.(`Could not load details for ${pokemon.displayName}.`, 'error');
        } finally {
            setLoadingDetailId(null);
        }
    }, [loadingDetailId, showDetails, showToast]);

    const helperText = isComplete
        ? 'All selected Pokémon found!'
        : `Type to guess (${MIN_AUTOCOMPLETE_CHARACTERS}+ chars for suggestions)`;

    const allGenerationsSelected = selectedGenerationList.length === QUIZ_GENERATION_KEYS.length;
    const hasPendingSelectionChanges = quizStarted
        && buildSelectionSignature(selectedGenerationList) !== buildSelectionSignature(activeGenerationList);

    return (
        <main className={`generation-quiz ${quizStarted ? 'generation-quiz--running' : ''}`}>
            <section className="generation-quiz__panel team-builder-panel generation-quiz__grid-panel">
                <div className="generation-quiz__panel-header">
                    <div className="flex items-center gap-2">
                        <h2 className="team-builder-panel__title team-builder-panel__title--compact">Pokémon Roster</h2>
                        {quizStarted && (
                            <span className="team-builder-panel__meta team-builder-panel__meta--compact">
                                {foundCount}/{totalCount}
                            </span>
                        )}
                    </div>
                    {quizStarted && (
                        <div className="generation-quiz__grid-filters">
                            <button
                                type="button"
                                onClick={() => setGridFilter('all')}
                                className={`generation-quiz__filter-btn ${gridFilter === 'all' ? 'is-active' : ''}`}
                            >
                                All ({totalCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setGridFilter('guessed')}
                                className={`generation-quiz__filter-btn ${gridFilter === 'guessed' ? 'is-active' : ''}`}
                            >
                                Guessed ({foundCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setGridFilter('missing')}
                                className={`generation-quiz__filter-btn ${gridFilter === 'missing' ? 'is-active' : ''}`}
                            >
                                Missing ({remainingCount})
                            </button>
                        </div>
                    )}
                    {quizStarted && (
                        <span className="generation-quiz__grid-meta">{visibleEntries.length} shown</span>
                    )}
                </div>

                {/* Generation Selector Row */}
                <div className="generation-quiz__selector-bar mt-3">
                    <div className="generation-quiz__selector-header">
                        <span className="generation-quiz__selector-label">Generations</span>
                        {hasPendingSelectionChanges && (
                            <span className="generation-quiz__pending-note">
                                (Restart to apply selection)
                            </span>
                        )}
                    </div>
                    <div className="generation-quiz__selector-body mt-2">
                        <div className="generation-quiz__selector-pills" role="group" aria-label="Select generations">
                            <button
                                type="button"
                                onClick={toggleAllGenerations}
                                className={`generation-quiz__selector-pill generation-quiz__selector-pill--all ${allGenerationsSelected ? 'is-active' : ''}`}
                                aria-pressed={allGenerationsSelected}
                            >
                                All Gens
                            </button>
                            {QUIZ_GENERATION_KEYS.map((generationKey) => (
                                <button
                                    key={generationKey}
                                    type="button"
                                    onClick={() => toggleGeneration(generationKey)}
                                    className={`generation-quiz__selector-pill ${selectedGenerationKeys.has(generationKey) ? 'is-active' : ''}`}
                                    aria-pressed={selectedGenerationKeys.has(generationKey)}
                                >
                                    <span>{GENERATION_LABELS[generationKey]}</span>
                                    <span className="generation-quiz__selector-pill-count">
                                        {generationCounts.get(generationKey) || 0}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={startQuiz}
                            disabled={isLoadingIndex || previewEntries.length === 0}
                            className="generation-quiz__selector-start-btn"
                        >
                            <PokeballIcon />
                            {quizStarted ? 'Restart' : `Start (${previewEntries.length})`}
                        </button>
                    </div>
                </div>

                {/* Sticky Controls Wrapper for mobile */}
                {quizStarted && (
                    <div className="generation-quiz__sticky-controls">
                        {/* Main Input Field */}
                        <div className="generation-quiz__main-input-row mt-3">
                            <PokemonGenerationQuizAutocomplete
                                value={answerInput}
                                onChange={setAnswerInput}
                                onKeyDown={handleInputKeyDown}
                                suggestions={suggestions}
                                activeIndex={activeSuggestionIndex}
                                onSelectSuggestion={handleSelectSuggestion}
                                disabled={!quizStarted || isComplete}
                                inputRef={inputRef}
                                helperText={quizStarted ? helperText : "Select generations above and click Start to begin."}
                                minCharacters={MIN_AUTOCOMPLETE_CHARACTERS}
                            />
                            {feedback.message && (
                                <p className={`generation-quiz__feedback generation-quiz__feedback--${feedback.tone}`}>
                                    {feedback.message}
                                </p>
                            )}
                        </div>

                        {/* Hint/Tip Banner */}
                        {consecutiveMisses >= 3 && currentTip && (
                            <div className="generation-quiz__tip-banner mt-3">
                                <SparklesIcon />
                                <span className="generation-quiz__tip-text">{currentTip}</span>
                            </div>
                        )}

                        {/* Compact Progress Area */}
                        {quizStarted ? (
                            <div className="generation-quiz__compact-progress-row mt-3">
                                <div className="generation-quiz__progress-bar-container">
                                    <div className="generation-quiz__progress-bar" aria-hidden="true">
                                        <span className="generation-quiz__progress-fill" style={{ width: `${completionPercent}%` }} />
                                    </div>
                                </div>
                                <div className="generation-quiz__progress-details mt-2">
                                    <div className="generation-quiz__progress-metrics">
                                        <span className="generation-quiz__metric-item">
                                            <span className="generation-quiz__metric-label">Progress:</span>
                                            <strong className="generation-quiz__metric-value">{foundCount}/{totalCount} ({completionPercent}%)</strong>
                                        </span>
                                        <span className="generation-quiz__metric-item">
                                            <span className="generation-quiz__metric-label">Accuracy:</span>
                                            <strong className="generation-quiz__metric-value">{accuracyPercent}%</strong>
                                        </span>
                                    </div>

                                    {recentFinds.length > 0 && (
                                        <div className="generation-quiz__progress-recent">
                                            <span className="generation-quiz__recent-label">Recent:</span>
                                            <div className="generation-quiz__recent-chips">
                                                {recentFinds.map((pokemon) => (
                                                    <span key={pokemon.id} className="generation-quiz__recent-chip">
                                                        {pokemon.displayName}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <button type="button" onClick={startQuiz} className="generation-quiz__compact-reset-btn">
                                        <RefreshIcon /> Restart
                                    </button>
                                </div>

                                {isComplete && (
                                    <div className="generation-quiz__celebration mt-3">
                                        <SuccessToastIcon />
                                        <div>
                                            <strong>Congratulations!</strong>
                                            <p>You guessed every selected Pokémon with {accuracyPercent}% accuracy.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="generation-quiz__compact-progress-row is-idle mt-3">
                                <span className="generation-quiz__idle-note">
                                    Best Run: <strong>{bestRun ? `${bestRun.bestFound}/${bestRun.totalCount} (${bestRun.accuracyPercent}% accuracy)` : 'No runs yet'}</strong>
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {quizStarted && <div className="generation-quiz-divider mt-2 mb-1" />}

                {isLoadingIndex ? (
                    <div className="generation-quiz__loading-state">
                        <div className="team-builder-spinner" aria-hidden="true"></div>
                    </div>
                ) : !quizStarted ? (
                    <div className="flex flex-col gap-6">
                        <EmptyState
                            compact
                            title="Let's start a quiz!"
                            spriteSrc="/LogoCuteGengarRounded.png"
                            message={
                                bestRun
                                    ? `Select a generation and try to guess all pokémons from that! Your current best run is ${bestRun.bestFound}/${bestRun.totalCount} (${bestRun.accuracyPercent}% accuracy).`
                                    : "Select a generation and try to guess all pokémons from that!"
                            }
                            action={{
                                label: `Start Quiz (${previewEntries.length} Pokémon)`,
                                onClick: startQuiz
                            }}
                        />
                        {quizRuns.length > 0 && (
                            <div className="generation-quiz-history">
                                <h3 className="generation-quiz-history__title">
                                    <SuccessToastIcon /> Your Quiz Runs
                                </h3>
                                <div className="generation-quiz-history__list">
                                    {quizRuns.map((run) => {
                                        const runGens = run.generationKeys.map((k) => GENERATION_LABELS[k] || k).join(', ');
                                        const isRunComplete = run.isComplete || run.foundIds.length === run.totalCount;
                                        const runAccuracy = run.foundIds.length + run.invalidGuesses > 0
                                            ? Math.round((run.foundIds.length / (run.foundIds.length + run.invalidGuesses)) * 100)
                                            : 100;
                                        
                                        return (
                                            <div key={run.id} className="generation-quiz-history__item">
                                                <div className="generation-quiz-history__info">
                                                    <span className="generation-quiz-history__gens">{runGens}</span>
                                                    <div className="generation-quiz-history__stats">
                                                        <span>Progress: <strong>{run.foundIds.length}/{run.totalCount}</strong></span>
                                                        <span>Accuracy: <strong>{runAccuracy}%</strong></span>
                                                        {run.bestFound > 0 && (
                                                            <span>Best: <strong>{run.bestFound}/{run.totalCount}</strong></span>
                                                        )}
                                                        <span className={`generation-quiz-history__badge ${isRunComplete ? 'generation-quiz-history__badge--complete' : 'generation-quiz-history__badge--progress'}`}>
                                                            {isRunComplete ? 'Completed' : 'In Progress'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="generation-quiz-history__actions">
                                                    {!isRunComplete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedGenerationKeys(new Set(run.generationKeys));
                                                                resumeRun(run.id);
                                                            }}
                                                            className="generation-quiz-history__btn generation-quiz-history__btn--continue"
                                                        >
                                                            Continue
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedGenerationKeys(new Set(run.generationKeys));
                                                            rerunRun(run.id);
                                                        }}
                                                        className="generation-quiz-history__btn generation-quiz-history__btn--rerun"
                                                    >
                                                        {isRunComplete ? 'Play Again' : 'Restart'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (window.confirm("Are you sure you want to delete this run's progress?")) {
                                                                deleteRun(run.id);
                                                            }
                                                        }}
                                                        className="generation-quiz-history__btn generation-quiz-history__btn--delete"
                                                        title="Delete Run"
                                                    >
                                                        <CloseIcon />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="generation-quiz__grid" role="list" aria-label="Pokémon quiz grid">
                        {visibleEntries.map((pokemon) => (
                            <div key={pokemon.id} role="listitem">
                                <PokemonGenerationQuizCard
                                    pokemon={pokemon}
                                    isFound={foundIds.has(pokemon.id)}
                                    isNew={newlyFoundId === pokemon.id}
                                    isLoading={loadingDetailId === pokemon.id}
                                    isInteractable={isComplete}
                                    onInspect={inspectPokemon}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <div className="sr-only" aria-live="polite">{announcement}</div>

            {isCelebrationOpen && (
                <QuizCelebrationModal
                    isOpen={isCelebrationOpen}
                    onClose={() => setIsCelebrationOpen(false)}
                    onTryAnother={() => {
                        setActiveRunId(null);
                        setIsCelebrationOpen(false);
                    }}
                    onCloseQuiz={() => {
                        setActiveRunId(null);
                        setIsCelebrationOpen(false);
                        navigate('/');
                    }}
                    pokemon={celebrationPokemon}
                    accuracy={accuracyPercent}
                    totalCount={totalCount}
                />
            )}
        </main>
    );
}