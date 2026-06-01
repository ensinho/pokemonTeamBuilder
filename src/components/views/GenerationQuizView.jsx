import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

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
    PokeballIcon,
    RefreshIcon,
    SparklesIcon,
    SuccessToastIcon,
} from '../icons';

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
    const inputRef = useRef(null);
    const detailCacheRef = useRef({});

    const [pokemonIndex, setPokemonIndex] = useState([]);
    const [isLoadingIndex, setIsLoadingIndex] = useState(true);
    const [selectedGenerationKeys, setSelectedGenerationKeys] = useState(() => new Set(['generation-i']));
    const [activeGenerationKeys, setActiveGenerationKeys] = useState([]);
    const [quizStarted, setQuizStarted] = useState(false);
    const [answerInput, setAnswerInput] = useState('');
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [foundIds, setFoundIds] = useState(new Set());
    const [foundOrder, setFoundOrder] = useState([]);
    const [invalidGuesses, setInvalidGuesses] = useState(0);
    const [feedback, setFeedback] = useState({ tone: 'muted', message: 'Choose generations.' });
    const [announcement, setAnnouncement] = useState('');
    const [newlyFoundId, setNewlyFoundId] = useState(null);
    const [loadingDetailId, setLoadingDetailId] = useState(null);
    const [bestRun, setBestRun] = useState(null);

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
    const generationListForStats = quizStarted ? activeGenerationList : selectedGenerationList;

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

    const generationStats = useMemo(() => generationListForStats.map((generationKey) => {
        const total = generationCounts.get(generationKey) || 0;
        const found = quizStarted
            ? activeEntries.filter((pokemon) => pokemon.generationKey === generationKey && foundIds.has(pokemon.id)).length
            : 0;
        return {
            generationKey,
            label: GENERATION_LABELS[generationKey],
            total,
            found,
            complete: total > 0 && found === total,
        };
    }), [activeEntries, foundIds, generationCounts, generationListForStats, quizStarted]);

    const selectionSignature = useMemo(
        () => buildSelectionSignature(quizStarted ? activeGenerationList : selectedGenerationList),
        [quizStarted, activeGenerationList, selectedGenerationList]
    );

    useEffect(() => {
        if (selectionSignature === 'empty' || typeof window === 'undefined') {
            setBestRun(null);
            return;
        }

        try {
            const rawValue = window.localStorage.getItem(`${BEST_RUN_STORAGE_PREFIX}:${selectionSignature}`);
            setBestRun(rawValue ? JSON.parse(rawValue) : null);
        } catch (_) {
            setBestRun(null);
        }
    }, [selectionSignature]);

    useEffect(() => {
        if (!quizStarted || selectionSignature === 'empty' || totalCount === 0 || typeof window === 'undefined') {
            return;
        }

        const nextBestRun = !bestRun || foundCount > (bestRun.bestFound || 0)
            ? {
                bestFound: foundCount,
                totalCount,
                accuracyPercent,
                updatedAt: Date.now(),
            }
            : bestRun;

        if (nextBestRun !== bestRun) {
            setBestRun(nextBestRun);
        }

        try {
            window.localStorage.setItem(`${BEST_RUN_STORAGE_PREFIX}:${selectionSignature}`, JSON.stringify(nextBestRun));
        } catch (_) {
            // Ignore storage failures.
        }
    }, [accuracyPercent, bestRun, foundCount, quizStarted, selectionSignature, totalCount]);

    useEffect(() => {
        if (!quizStarted || !normalizedAnswerInput) return;

        const matchedPokemonId = answerLookup.get(normalizedAnswerInput);
        if (!matchedPokemonId || foundIds.has(matchedPokemonId)) return;

        const matchedPokemon = pokemonById.get(matchedPokemonId);
        if (!matchedPokemon) return;

        const nextFoundIds = new Set(foundIds);
        nextFoundIds.add(matchedPokemonId);
        setFoundIds(nextFoundIds);
        setFoundOrder((current) => [...current, matchedPokemonId]);
        setNewlyFoundId(matchedPokemonId);
        setAnnouncement(`${matchedPokemon.displayName} found. ${nextFoundIds.size} of ${totalCount}.`);
        setFeedback({
            tone: 'success',
            message: `${matchedPokemon.displayName} registered. ${Math.max(0, totalCount - nextFoundIds.size)} remaining.`,
        });
        setAnswerInput('');
        setActiveSuggestionIndex(0);
    }, [answerLookup, foundIds, normalizedAnswerInput, pokemonById, quizStarted, totalCount]);

    useEffect(() => {
        if (!quizStarted) return;

        if (isComplete) {
            setAnnouncement('Generation Quiz complete.');
            setFeedback({ tone: 'success', message: 'Quiz complete. Every selected Pokémon has been found.' });
            showToast?.('Generation Quiz complete!', 'success');
        }
    }, [isComplete, quizStarted, showToast]);

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

        setQuizStarted(true);
        setActiveGenerationKeys(selectedGenerationList);
        setFoundIds(new Set());
        setFoundOrder([]);
        setInvalidGuesses(0);
        setAnswerInput('');
        setActiveSuggestionIndex(0);
        setAnnouncement('New Generation Quiz started.');
        setFeedback({ tone: 'info', message: `${previewEntries.length} Pokémon ready.` });
    }, [previewEntries.length, selectedGenerationList]);

    const commitFoundPokemon = useCallback((pokemonId) => {
        const pokemon = pokemonById.get(pokemonId);
        if (!pokemon || foundIds.has(pokemonId)) return;

        const nextFoundIds = new Set(foundIds);
        nextFoundIds.add(pokemonId);
        setFoundIds(nextFoundIds);
        setFoundOrder((current) => [...current, pokemonId]);
        setNewlyFoundId(pokemonId);
        setAnnouncement(`${pokemon.displayName} found. ${nextFoundIds.size} of ${totalCount}.`);
        setFeedback({
            tone: 'success',
            message: `${pokemon.displayName} registered. ${Math.max(0, totalCount - nextFoundIds.size)} remaining.`,
        });
        setAnswerInput('');
        setActiveSuggestionIndex(0);
    }, [foundIds, pokemonById, totalCount]);

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
                setInvalidGuesses((current) => current + 1);
                setFeedback({ tone: 'danger', message: 'No Pokémon match that guess yet.' });
            }
        }
    }, [activeSuggestionIndex, answerInput, answerLookup, foundIds, handleSelectSuggestion, suggestions]);

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
        ? 'Every selected Pokémon has been found.'
        : `Suggestions after ${MIN_AUTOCOMPLETE_CHARACTERS}+ characters.`;

    const allGenerationsSelected = selectedGenerationList.length === QUIZ_GENERATION_KEYS.length;
    const hasPendingSelectionChanges = quizStarted
        && buildSelectionSignature(selectedGenerationList) !== buildSelectionSignature(activeGenerationList);

    return (
        <main className="generation-quiz">
            <section className="generation-quiz__hero team-builder-panel">
                <div className="generation-quiz__hero-copy">
                    <span className="generation-quiz__eyebrow">
                        <SparklesIcon />
                        Generation Quiz
                    </span>
                    <h2 className="generation-quiz__title">Guess the selected Pokémon.</h2>
                    <p className="generation-quiz__lead">Pick generations and type names.</p>
                </div>

                <div className="generation-quiz__hero-stats">
                    <article className="generation-quiz__hero-stat">
                        <span className="generation-quiz__hero-stat-label">Selected pool</span>
                        <strong className="generation-quiz__hero-stat-value">{previewEntries.length}</strong>
                    </article>
                    <article className="generation-quiz__hero-stat">
                        <span className="generation-quiz__hero-stat-label">Best run</span>
                        <strong className="generation-quiz__hero-stat-value">
                            {bestRun ? `${bestRun.bestFound}/${bestRun.totalCount}` : 'No runs'}
                        </strong>
                    </article>
                </div>
            </section>

            <section className="generation-quiz__layout">
                <div className="generation-quiz__stack">
                    <section className="generation-quiz__panel team-builder-panel">
                        <div className="generation-quiz__panel-header">
                            <div>
                                <p className="generation-quiz__panel-eyebrow">Setup</p>
                                <h3 className="generation-quiz__panel-title">Choose generations</h3>
                            </div>
                            <button
                                type="button"
                                onClick={toggleAllGenerations}
                                className={`generation-quiz__generation-chip generation-quiz__generation-chip--all ${allGenerationsSelected ? 'is-active' : ''}`}
                                aria-pressed={allGenerationsSelected}
                            >
                                All gens
                            </button>
                        </div>

                        <div className="generation-quiz__generation-grid" role="group" aria-label="Select generations">
                            {QUIZ_GENERATION_KEYS.map((generationKey) => (
                                <button
                                    key={generationKey}
                                    type="button"
                                    onClick={() => toggleGeneration(generationKey)}
                                    className={`generation-quiz__generation-chip ${selectedGenerationKeys.has(generationKey) ? 'is-active' : ''}`}
                                    aria-pressed={selectedGenerationKeys.has(generationKey)}
                                >
                                    <span>{GENERATION_LABELS[generationKey]}</span>
                                    <span className="generation-quiz__generation-chip-count">
                                        {generationCounts.get(generationKey) || 0}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="generation-quiz__actions-row">
                            <div className="generation-quiz__selection-summary">
                                <span className="generation-quiz__selection-label">Pool</span>
                                <strong className="generation-quiz__selection-value">{previewEntries.length} Pokémon</strong>
                            </div>
                            <button
                                type="button"
                                onClick={startQuiz}
                                disabled={isLoadingIndex || previewEntries.length === 0}
                                className="generation-quiz__primary-action"
                            >
                                <PokeballIcon />
                                {quizStarted ? 'New run' : 'Start'}
                            </button>
                        </div>

                        {hasPendingSelectionChanges && (
                            <p className="generation-quiz__pending-note">
                                Start a new run to use the new selection.
                            </p>
                        )}
                    </section>

                    <section className="generation-quiz__panel team-builder-panel">
                        <div className="generation-quiz__panel-header">
                            <div>
                                <p className="generation-quiz__panel-eyebrow">Play</p>
                                <h3 className="generation-quiz__panel-title">Answer</h3>
                            </div>
                            {quizStarted && (
                                <button type="button" onClick={startQuiz} className="generation-quiz__secondary-action">
                                    <RefreshIcon />
                                    Reset
                                </button>
                            )}
                        </div>

                        {!quizStarted ? (
                            <EmptyState
                                compact
                                title="Choose and start"
                                message="Pick generations, then start."
                            />
                        ) : (
                            <>
                                <PokemonGenerationQuizAutocomplete
                                    value={answerInput}
                                    onChange={setAnswerInput}
                                    onKeyDown={handleInputKeyDown}
                                    suggestions={suggestions}
                                    activeIndex={activeSuggestionIndex}
                                    onSelectSuggestion={handleSelectSuggestion}
                                    disabled={isComplete}
                                    inputRef={inputRef}
                                    helperText={helperText}
                                    minCharacters={MIN_AUTOCOMPLETE_CHARACTERS}
                                />

                                <div className="generation-quiz__feedback-row">
                                    <p className={`generation-quiz__feedback generation-quiz__feedback--${feedback.tone}`}>
                                        {feedback.message}
                                    </p>
                                    <span className="generation-quiz__accuracy">Accuracy {accuracyPercent}%</span>
                                </div>

                                <div className="generation-quiz__metrics-grid" aria-label="Quiz progress">
                                    <article className="generation-quiz__metric-card">
                                        <span className="generation-quiz__metric-label">Found</span>
                                        <strong className="generation-quiz__metric-value">{foundCount}</strong>
                                    </article>
                                    <article className="generation-quiz__metric-card">
                                        <span className="generation-quiz__metric-label">Left</span>
                                        <strong className="generation-quiz__metric-value">{remainingCount}</strong>
                                    </article>
                                    <article className="generation-quiz__metric-card">
                                        <span className="generation-quiz__metric-label">Done</span>
                                        <strong className="generation-quiz__metric-value">{completionPercent}%</strong>
                                    </article>
                                </div>

                                <div className="generation-quiz__progress-block" aria-hidden="true">
                                    <div className="generation-quiz__progress-bar">
                                        <span className="generation-quiz__progress-fill" style={{ width: `${completionPercent}%` }} />
                                    </div>
                                </div>

                                <div className="generation-quiz__generation-status-list">
                                    {generationStats.map((generation) => (
                                        <div
                                            key={generation.generationKey}
                                            className={`generation-quiz__generation-status ${generation.complete ? 'is-complete' : ''}`}
                                        >
                                            <span className="generation-quiz__generation-status-label">{generation.label}</span>
                                            <span className="generation-quiz__generation-status-value">
                                                {generation.found}/{generation.total}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {recentFinds.length > 0 && (
                                    <div className="generation-quiz__recent-findings">
                                        <div className="generation-quiz__recent-findings-header">
                                            <ChartColumnIcon />
                                            Recent
                                        </div>
                                        <div className="generation-quiz__recent-findings-list">
                                            {recentFinds.map((pokemon) => (
                                                <span key={pokemon.id} className="generation-quiz__recent-findings-chip">
                                                    {pokemon.displayName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {isComplete && (
                                    <div className="generation-quiz__celebration">
                                        <SuccessToastIcon />
                                        <div>
                                            <strong>Done.</strong>
                                            <p>{accuracyPercent}% accuracy.</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </div>

                <section className="generation-quiz__panel team-builder-panel generation-quiz__grid-panel">
                    <div className="generation-quiz__panel-header">
                        <div>
                            <p className="generation-quiz__panel-eyebrow">Grid</p>
                            <h3 className="generation-quiz__panel-title">Pokémon roster</h3>
                        </div>
                        {quizStarted && (
                            <span className="generation-quiz__grid-meta">{totalCount} total cards</span>
                        )}
                    </div>

                    {isLoadingIndex ? (
                        <div className="generation-quiz__loading-state">
                            <div className="team-builder-spinner" aria-hidden="true"></div>
                        </div>
                    ) : !quizStarted ? (
                        <EmptyState
                            compact
                            title="Grid locked"
                            message="Start a quiz to reveal the roster placeholders and begin guessing."
                        />
                    ) : (
                        <div className="generation-quiz__grid" role="list" aria-label="Pokémon quiz grid">
                            {activeEntries.map((pokemon) => (
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
            </section>

            <div className="sr-only" aria-live="polite">{announcement}</div>
        </main>
    );
}