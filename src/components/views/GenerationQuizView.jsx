import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import '../../styles/generation-quiz-view.css';

import { GENERATION_RANGES } from '../../constants/pokemon';
import { useTranslation } from '../../hooks/useTranslation';
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

const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1em', height: '1em' }}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

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
    const { t, language } = useTranslation();

    const [pokemonIndex, setPokemonIndex] = useState([]);
    const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
    const [celebrationPokemon, setCelebrationPokemon] = useState(null);
    const [isLoadingIndex, setIsLoadingIndex] = useState(true);
    const [selectedGenerationKeys, setSelectedGenerationKeys] = useState(() => new Set(['generation-i']));
    const [answerInput, setAnswerInput] = useState('');
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [currentTip, setCurrentTip] = useState('');
    const [feedback, setFeedback] = useState({ tone: 'muted', message: language === 'pt' ? 'Escolha as gerações.' : 'Choose generations.' });
    const [announcement, setAnnouncement] = useState('');
    const [newlyFoundId, setNewlyFoundId] = useState(null);
    const [loadingDetailId, setLoadingDetailId] = useState(null);
    const [gridFilter, setGridFilter] = useState('all'); // 'all', 'guessed', 'missing'

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [visibleHistoryLimit, setVisibleHistoryLimit] = useState(5);
    const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);

    useEffect(() => {
        if (feedback.message === 'Choose generations.' || feedback.message === 'Escolha as gerações.') {
            setFeedback({ tone: 'muted', message: language === 'pt' ? 'Escolha as gerações.' : 'Choose generations.' });
        }
    }, [language]);

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

    const handleHistoryScroll = useCallback((e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop - clientHeight < 20) {
            if (!isHistoryLoadingMore && visibleHistoryLimit < quizRuns.length) {
                setIsHistoryLoadingMore(true);
                setTimeout(() => {
                    setVisibleHistoryLimit((prev) => Math.min(prev + 5, quizRuns.length));
                    setIsHistoryLoadingMore(false);
                }, 400);
            }
        }
    }, [isHistoryLoadingMore, visibleHistoryLimit, quizRuns.length]);

    useEffect(() => {
        if (!isHistoryOpen) {
            setVisibleHistoryLimit(5);
        }
    }, [isHistoryOpen]);

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
                    setFeedback({ tone: 'danger', message: language === 'pt' ? 'Não foi possível carregar os dados do quiz agora.' : 'Could not load the quiz data right now.' });
                }
                showToast?.(language === 'pt' ? 'Não foi possível carregar o Quiz de Gerações.' : 'Could not load the Generation Quiz.', 'error');
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
    }, [showToast, language]);

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
            generationLabel: generationKey ? GENERATION_LABELS[generationKey] : (language === 'pt' ? 'Desconhecido' : 'Unknown'),
            displayName: formatPokemonDisplayName(pokemon.name),
            spriteUrl: getPokemonFrontSpriteUrl(pokemon.id),
            aliases: buildPokemonQuizNameAliases(pokemon.name),
        };
    }), [pokemonIndex, language]);

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
                setCurrentTip(language === 'pt' 
                    ? `Tente adivinhar um Pokémon da ${genLabel} começando com '${firstLetter}' (${nameLength} letras)!`
                    : `Try guessing a ${genLabel} Pokémon starting with '${firstLetter}' (${nameLength} letters)!`);
            }
        } else if (consecutiveMisses === 0) {
            setCurrentTip('');
        }
    }, [consecutiveMisses, remainingEntries, language]);

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

        setAnnouncement(language === 'pt' 
            ? `${matchedPokemon.displayName} encontrado. ${nextFoundIdsArray.length} de ${totalCount}.`
            : `${matchedPokemon.displayName} found. ${nextFoundIdsArray.length} of ${totalCount}.`);
        setFeedback({
            tone: 'success',
            message: language === 'pt' 
                ? `${matchedPokemon.displayName} registrado. Restam ${Math.max(0, totalCount - nextFoundIdsArray.length)}.`
                : `${matchedPokemon.displayName} registered. ${Math.max(0, totalCount - nextFoundIdsArray.length)} remaining.`,
        });
        setAnswerInput('');
        setActiveSuggestionIndex(0);
    }, [answerLookup, foundIds, normalizedAnswerInput, pokemonById, quizStarted, totalCount, activeRun, updateActiveRunProgress, language]);

    useEffect(() => {
        if (!quizStarted) return;

        if (isComplete) {
            setAnnouncement(language === 'pt' ? 'Quiz de Gerações concluído.' : 'Generation Quiz complete.');
            setFeedback({ tone: 'success', message: language === 'pt' ? 'Quiz concluído. Todos os Pokémon selecionados foram encontrados!' : 'Quiz complete. Every selected Pokémon has been found.' });
            showToast?.(language === 'pt' ? 'Quiz de Gerações concluído!' : 'Generation Quiz complete!', 'success');

            if (activeEntries.length > 0) {
                const randomIndex = Math.floor(Math.random() * activeEntries.length);
                setCelebrationPokemon(activeEntries[randomIndex]);
            } else {
                setCelebrationPokemon(null);
            }
            setIsCelebrationOpen(true);
        }
    }, [isComplete, quizStarted, showToast, activeEntries, language]);

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
        setSelectedGenerationKeys(new Set([generationKey]));
    }, []);

    const toggleAllGenerations = useCallback(() => {
        setSelectedGenerationKeys((current) => {
            if (current.size === QUIZ_GENERATION_KEYS.length) {
                return new Set(['generation-i']);
            }
            return new Set(QUIZ_GENERATION_KEYS);
        });
    }, []);

    const startQuiz = useCallback(() => {
        if (selectedGenerationList.length === 0) {
            setFeedback({ tone: 'warning', message: language === 'pt' ? 'Selecione pelo menos uma geração.' : 'Select at least one generation.' });
            return;
        }

        startNewRun(selectedGenerationList, previewEntries.length);
        setAnswerInput('');
        setGridFilter('all');
        setActiveSuggestionIndex(0);
        setAnnouncement(language === 'pt' ? 'Novo Quiz de Gerações iniciado.' : 'New Generation Quiz started.');
        setFeedback({ tone: 'info', message: language === 'pt' ? `${previewEntries.length} Pokémon prontos.` : `${previewEntries.length} Pokémon ready.` });
    }, [previewEntries.length, selectedGenerationList, startNewRun, language]);

    const commitFoundPokemon = useCallback((pokemonId) => {
        const pokemon = pokemonById.get(pokemonId);
        if (!pokemon || !activeRun || foundIds.has(pokemonId)) return;

        const nextFoundIdsArray = [...activeRun.foundIds, pokemonId];
        const nextFoundOrder = [...activeRun.foundOrder, pokemonId];
        setNewlyFoundId(pokemonId);

        updateActiveRunProgress(nextFoundIdsArray, nextFoundOrder, activeRun.invalidGuesses, 0);

        setAnnouncement(language === 'pt' 
            ? `${pokemon.displayName} encontrado. ${nextFoundIdsArray.length} de ${totalCount}.`
            : `${pokemon.displayName} found. ${nextFoundIdsArray.length} of ${totalCount}.`);
        setFeedback({
            tone: 'success',
            message: language === 'pt' 
                ? `${pokemon.displayName} registrado. Restam ${Math.max(0, totalCount - nextFoundIdsArray.length)}.`
                : `${pokemon.displayName} registered. ${Math.max(0, totalCount - nextFoundIdsArray.length)} remaining.`,
        });
        setAnswerInput('');
        setActiveSuggestionIndex(0);
    }, [activeRun, foundIds, pokemonById, totalCount, updateActiveRunProgress, language]);

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
                setFeedback({ tone: 'warning', message: language === 'pt' ? 'Esse Pokémon já está na sua lista de encontrados.' : 'That Pokémon is already on your found list.' });
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
                setFeedback({ tone: 'danger', message: language === 'pt' ? 'Nenhum Pokémon corresponde a esse palpite.' : 'No Pokémon match that guess yet.' });
            }
        }
    }, [activeSuggestionIndex, answerInput, answerLookup, foundIds, handleSelectSuggestion, suggestions, activeRun, updateActiveRunProgress, language]);

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
            showToast?.(language === 'pt' ? `Não foi possível carregar os detalhes de ${pokemon.displayName}.` : `Could not load details for ${pokemon.displayName}.`, 'error');
        } finally {
            setLoadingDetailId(null);
        }
    }, [loadingDetailId, showDetails, showToast, language]);

    const helperText = isComplete
        ? (language === 'pt' ? 'Todos os Pokémon selecionados foram encontrados!' : 'All selected Pokémon found!')
        : (language === 'pt' ? `Digite para adivinhar (mínimo de ${MIN_AUTOCOMPLETE_CHARACTERS} letras para sugestões)` : `Type to guess (${MIN_AUTOCOMPLETE_CHARACTERS}+ chars for suggestions)`);

    const allGenerationsSelected = selectedGenerationList.length === QUIZ_GENERATION_KEYS.length;
    const hasPendingSelectionChanges = quizStarted
        && buildSelectionSignature(selectedGenerationList) !== buildSelectionSignature(activeGenerationList);

    return (
        <main className={`generation-quiz ${quizStarted ? 'generation-quiz--running' : ''}`}>
            <section className="generation-quiz__panel team-builder-panel generation-quiz__grid-panel">
                <div className="generation-quiz__panel-header">
                    <div className="flex items-center gap-2">
                        <h2 className="team-builder-panel__title team-builder-panel__title--compact">{language === 'pt' ? 'Lista de Pokémon' : 'Pokémon Roster'}</h2>
                        {quizStarted && (
                            <span className="team-builder-panel__meta team-builder-panel__meta--compact">
                                {foundCount}/{totalCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                        {quizStarted && (
                            <div className="generation-quiz__grid-filters">
                                <button
                                    type="button"
                                    onClick={() => setGridFilter('all')}
                                    className={`generation-quiz__filter-btn ${gridFilter === 'all' ? 'is-active' : ''}`}
                                >
                                    {language === 'pt' ? 'Todos' : 'All'} ({totalCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGridFilter('guessed')}
                                    className={`generation-quiz__filter-btn ${gridFilter === 'guessed' ? 'is-active' : ''}`}
                                >
                                    {language === 'pt' ? 'Adivinhados' : 'Guessed'} ({foundCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGridFilter('missing')}
                                    className={`generation-quiz__filter-btn ${gridFilter === 'missing' ? 'is-active' : ''}`}
                                >
                                    {language === 'pt' ? 'Faltando' : 'Missing'} ({remainingCount})
                                </button>
                            </div>
                        )}
                        {quizStarted && (
                            <span className="generation-quiz__grid-meta hidden md:inline">{visibleEntries.length} {language === 'pt' ? 'exibidos' : 'shown'}</span>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsHistoryOpen(true)}
                            className="generation-quiz__history-toggle"
                            title={language === 'pt' ? 'Ver Histórico de Partidas' : 'View Quiz Run History'}
                        >
                            <HistoryIcon />
                            <span>{language === 'pt' ? 'Histórico' : 'History'}</span>
                            {quizRuns.length > 0 && (
                                <span className="generation-quiz__history-toggle-badge">
                                    {quizRuns.length}
                                </span>
                            )}
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
                                helperText={quizStarted ? helperText : (language === 'pt' ? 'Selecione as gerações acima e clique em Começar para iniciar.' : 'Select generations above and click Start to begin.')}
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
                                            <span className="generation-quiz__metric-label">{language === 'pt' ? 'Progresso:' : 'Progress:'}</span>
                                            <strong className="generation-quiz__metric-value">{foundCount}/{totalCount} ({completionPercent}%)</strong>
                                        </span>
                                        <span className="generation-quiz__metric-item">
                                            <span className="generation-quiz__metric-label">{language === 'pt' ? 'Precisão:' : 'Accuracy:'}</span>
                                            <strong className="generation-quiz__metric-value">{accuracyPercent}%</strong>
                                        </span>
                                    </div>

                                    {recentFinds.length > 0 && (
                                        <div className="generation-quiz__progress-recent">
                                            <span className="generation-quiz__recent-label">{language === 'pt' ? 'Recentes:' : 'Recent:'}</span>
                                            <div className="generation-quiz__recent-chips">
                                                {recentFinds.map((pokemon) => (
                                                    <span key={pokemon.id} className="generation-quiz__recent-chip">
                                                        {pokemon.displayName}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button type="button" onClick={startQuiz} className="generation-quiz__compact-reset-btn">
                                            <RefreshIcon /> {language === 'pt' ? 'Recomeçar' : 'Restart'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveRunId(null)}
                                            className="generation-quiz__compact-reset-btn"
                                            title={language === 'pt' ? 'Retornar à tela inicial para mudar as gerações' : 'Return to start screen to change generations'}
                                        >
                                            {language === 'pt' ? 'Mudar Gerações' : 'Change Gens'}
                                        </button>
                                    </div>
                                </div>

                                {isComplete && (
                                    <div className="generation-quiz__celebration mt-3">
                                        <SuccessToastIcon />
                                        <div>
                                            <strong>{language === 'pt' ? 'Parabéns!' : 'Congratulations!'}</strong>
                                            <p>{language === 'pt' ? `Você adivinhou todos os Pokémon selecionados com ${accuracyPercent}% de precisão.` : `You guessed every selected Pokémon with ${accuracyPercent}% accuracy.`}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="generation-quiz__compact-progress-row is-idle mt-3">
                                <span className="generation-quiz__idle-note">
                                    {language === 'pt' ? 'Melhor Partida:' : 'Best Run:'} <strong>{bestRun ? `${bestRun.bestFound}/${bestRun.totalCount} (${bestRun.accuracyPercent}% ${language === 'pt' ? 'de precisão' : 'accuracy'})` : (language === 'pt' ? 'Nenhuma partida ainda' : 'No runs yet')}</strong>
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
                    <div className="generation-quiz__start-card">
                        <div className="generation-quiz__start-icon-wrap">
                            <img
                                src={import.meta.env.BASE_URL + "LogoCuteGengarRounded.png"}
                                alt=""
                                aria-hidden="true"
                                className="generation-quiz__start-icon select-none"
                            />
                        </div>
                        <h3 className="generation-quiz__start-title">{t('quiz.title')}</h3>
                        <p className="generation-quiz__start-subtitle">
                            {language === 'pt' ? 'Selecione uma geração abaixo para testar sua memória. Seu objetivo é nomear todos os Pokémon da região!' : 'Select a generation below to test your memory. Your goal is to name all Pokémon in that region!'}
                        </p>

                        {bestRun && (
                            <div className="generation-quiz__start-best-run-pill">
                                <span>{language === 'pt' ? 'Melhor Partida:' : 'Best Run:'}</span>
                                <strong>{bestRun.bestFound}/{bestRun.totalCount} ({bestRun.accuracyPercent}% {language === 'pt' ? 'de precisão' : 'accuracy'})</strong>
                            </div>
                        )}

                        <div className="generation-quiz__start-selector mt-4">
                            <span className="generation-quiz__start-selector-label">{language === 'pt' ? 'SELECIONAR GERAÇÃO' : 'SELECT GENERATION'}</span>
                            <div className="generation-quiz__start-selector-pills mt-3" role="group" aria-label={language === 'pt' ? 'Selecionar geração' : 'Select generation'}>
                                <button
                                    type="button"
                                    onClick={toggleAllGenerations}
                                    className={`generation-quiz__selector-pill generation-quiz__selector-pill--all ${allGenerationsSelected ? 'is-active' : ''}`}
                                    aria-pressed={allGenerationsSelected}
                                >
                                    {language === 'pt' ? 'Todas' : 'All Gens'}
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
                        </div>

                        <button
                            type="button"
                            onClick={startQuiz}
                            disabled={isLoadingIndex || previewEntries.length === 0}
                            className="generation-quiz__start-card-btn mt-6"
                        >
                            <PokeballIcon />
                            {language === 'pt' ? `Começar Quiz (${previewEntries.length} Pokémon)` : `Start Quiz (${previewEntries.length} Pokémon)`}
                        </button>
                    </div>
                ) : (
                    <div className="generation-quiz__grid" role="list" aria-label={language === 'pt' ? 'Grade de Pokémon do quiz' : 'Pokémon quiz grid'}>
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
            {/* History Drawer Overlay */}
            <div
                className={`generation-quiz__history-overlay ${isHistoryOpen ? 'is-open' : ''}`}
                onClick={() => setIsHistoryOpen(false)}
            />

            {/* History Drawer Sidebar */}
            <div className={`generation-quiz__history-sidebar ${isHistoryOpen ? 'is-open' : ''}`}>
                <div className="generation-quiz__history-sidebar-header">
                    <h3 className="generation-quiz__history-sidebar-title">
                        <HistoryIcon /> {language === 'pt' ? 'Histórico do Quiz' : 'Quiz History'}
                    </h3>
                    <button
                        type="button"
                        className="generation-quiz__history-sidebar-close"
                        onClick={() => setIsHistoryOpen(false)}
                        title={language === 'pt' ? 'Fechar Histórico' : 'Close History'}
                    >
                        <CloseIcon />
                    </button>
                </div>

                <div
                    className="generation-quiz__history-sidebar-scroll"
                    onScroll={handleHistoryScroll}
                >
                    {quizRuns.length === 0 ? (
                        <div className="generation-quiz__history-sidebar-empty">
                            <div className="generation-quiz__history-sidebar-empty-icon">
                                <HistoryIcon />
                            </div>
                            <p className="generation-quiz__history-sidebar-empty-text">
                                {language === 'pt' ? (
                                    <>
                                        Nenhuma partida gravada ainda.<br />
                                        Selecione uma geração acima e comece a jogar!
                                    </>
                                ) : (
                                    <>
                                        No quiz runs recorded yet.<br />
                                        Select a generation above and start playing!
                                    </>
                                )}
                            </p>
                        </div>
                    ) : (
                        <>
                            {quizRuns
                                .slice()
                                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                                .slice(0, visibleHistoryLimit)
                                .map((run) => {
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
                                                    <span>{language === 'pt' ? 'Progresso:' : 'Progress:'} <strong>{run.foundIds.length}/{run.totalCount}</strong></span>
                                                    <span>{language === 'pt' ? 'Precisão:' : 'Accuracy:'} <strong>{runAccuracy}%</strong></span>
                                                    {run.bestFound > 0 && (
                                                        <span>{language === 'pt' ? 'Melhor:' : 'Best:'} <strong>{run.bestFound}/{run.totalCount}</strong></span>
                                                    )}
                                                    <span className={`generation-quiz-history__badge ${isRunComplete ? 'generation-quiz-history__badge--complete' : 'generation-quiz-history__badge--progress'}`}>
                                                        {isRunComplete ? (language === 'pt' ? 'Concluído' : 'Completed') : (language === 'pt' ? 'Em Progresso' : 'In Progress')}
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
                                                            setIsHistoryOpen(false);
                                                        }}
                                                        className="generation-quiz-history__btn generation-quiz-history__btn--continue"
                                                    >
                                                        {language === 'pt' ? 'Continuar' : 'Continue'}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedGenerationKeys(new Set(run.generationKeys));
                                                        rerunRun(run.id);
                                                        setIsHistoryOpen(false);
                                                    }}
                                                    className="generation-quiz-history__btn generation-quiz-history__btn--rerun"
                                                >
                                                    {isRunComplete ? (language === 'pt' ? 'Jogar Novamente' : 'Play Again') : (language === 'pt' ? 'Recomeçar' : 'Restart')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (window.confirm(language === 'pt' ? 'Tem certeza que quer deletar o progresso desta partida?' : "Are you sure you want to delete this run's progress?")) {
                                                            deleteRun(run.id);
                                                        }
                                                    }}
                                                    className="generation-quiz-history__btn generation-quiz-history__btn--delete"
                                                    title={language === 'pt' ? 'Deletar Partida' : 'Delete Run'}
                                                >
                                                    <CloseIcon />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                            {isHistoryLoadingMore && (
                                <div className="generation-quiz__history-loading">
                                    <div className="generation-quiz__history-loading-spinner" />
                                    <span>{language === 'pt' ? 'Carregando partidas antigas...' : 'Loading older runs...'}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}