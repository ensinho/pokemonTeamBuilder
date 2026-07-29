import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
    Activity,
    Anchor,
    Award,
    Box,
    Bug,
    CheckCircle2,
    Compass,
    Crown,
    Dna,
    Droplets,
    ExternalLink,
    Eye,
    Feather,
    Fish,
    Flame,
    Ghost,
    Globe,
    Heart,
    HelpCircle,
    History,
    Info,
    LayoutGrid,
    Leaf,
    Lightbulb,
    Moon,
    RefreshCw,
    Shield,
    Skull,
    Sparkles,
    Swords,
    Target,
    Zap,
} from 'lucide-react';
import '../../styles/category-guesser-view.css';
import '../../styles/generation-quiz-view.css';

import { CATEGORY_LISTS } from '../../data/categoryListsData';
import { useCategoryGuesser } from '../../hooks/useCategoryGuesser';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import {
    buildPokemonQuizNameAliases,
    getPokemonApiData,
    getPokemonSpeciesData,
    loadPokemonIndex,
    normalizePokemonQuizInput,
} from '../../services/pokemonDataCache';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { PokemonGenerationQuizAutocomplete } from '../PokemonGenerationQuizAutocomplete';
import { PokemonGenerationQuizCard } from '../PokemonGenerationQuizCard';
import { CloseIcon, PokeballIcon } from '../icons';
import { QuizCelebrationModal } from '../modals';

const MAX_AUTOCOMPLETE_SUGGESTIONS = 5;
const MIN_AUTOCOMPLETE_CHARACTERS = 3;

const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1em', height: '1em' }}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const LUCIDE_ICONS = {
    Activity,
    Anchor,
    Award,
    Box,
    Bug,
    Compass,
    Crown,
    Dna,
    Droplets,
    Eye,
    Feather,
    Fish,
    Flame,
    Ghost,
    Globe,
    Heart,
    Leaf,
    Moon,
    Shield,
    Skull,
    Sparkles,
    Swords,
    Target,
    Zap,
};

const renderCategoryIcon = (iconName, className = 'w-5 h-5 text-indigo-400') => {
    const IconComponent = LUCIDE_ICONS[iconName] || Sparkles;
    return <IconComponent className={className} aria-hidden="true" />;
};

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
    'tapu-koko': 'Tapu Koko',
    'tapu-lele': 'Tapu Lele',
    'tapu-bulu': 'Tapu Bulu',
    'tapu-fini': 'Tapu Fini',
    'great-tusk': 'Great Tusk',
    'scream-tail': 'Scream Tail',
    'brute-bonnet': 'Brute Bonnet',
    'flutter-mane': 'Flutter Mane',
    'slither-wing': 'Slither Wing',
    'sandy-shocks': 'Sandy Shocks',
    'roaring-moon': 'Roaring Moon',
    'iron-treads': 'Iron Treads',
    'iron-bundle': 'Iron Bundle',
    'iron-hands': 'Iron Hands',
    'iron-jugulis': 'Iron Jugulis',
    'iron-moth': 'Iron Moth',
    'iron-thorns': 'Iron Thorns',
    'iron-valiant': 'Iron Valiant',
    'wo-chien': 'Wo-Chien',
    'chien-pao': 'Chien-Pao',
    'ting-lu': 'Ting-Lu',
    'chi-yu': 'Chi-Yu',
});

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

const buildQuizHintText = (name, language) => {
    const displayName = formatPokemonDisplayName(name);
    const prefix = displayName.slice(0, Math.max(2, Math.ceil(displayName.length * 0.35)));
    return language === 'pt'
        ? `Dica: '${prefix}…' (${displayName.length} letras)!`
        : `Tip: '${prefix}…' (${displayName.length} letters)!`;
};

export function CategoryGuesserView({ showDetails, showToast }) {
    const inputRef = useRef(null);
    const detailCacheRef = useRef({});
    const { t, language } = useTranslation();

    useDocumentMeta({
        title: 'PokéQuiz - Adivinhe o Tema',
        description: 'Adivinhe Pokémon baseados em características, atributos e temas oficiais.',
        path: '/guesser',
    });

    const [pokemonIndex, setPokemonIndex] = useState([]);
    const [isLoadingIndex, setIsLoadingIndex] = useState(true);
    const [answerInput, setAnswerInput] = useState('');
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [manualHint, setManualHint] = useState('');
    const [hintTargetName, setHintTargetName] = useState(null);
    const [feedback, setFeedback] = useState({ tone: 'muted', message: language === 'pt' ? 'Adivinhe os Pokémon da lista!' : 'Guess the Pokémon in the category!' });
    const [newlyFoundId, setNewlyFoundId] = useState(null);
    const [loadingDetailId, setLoadingDetailId] = useState(null);
    const [gridFilter, setGridFilter] = useState('all');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [visibleHistoryLimit, setVisibleHistoryLimit] = useState(5);
    const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);
    const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
    const [celebrationPokemon, setCelebrationPokemon] = useState(null);

    const {
        quizRuns,
        activeRun,
        activeRunId,
        getRandomUnplayedListId,
        startNewRun,
        resumeRun,
        updateActiveRunProgress,
        deleteRun,
        rerunRun,
    } = useCategoryGuesser();

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

    const categoryListMap = useMemo(() => {
        return new Map(CATEGORY_LISTS.map((item) => [item.id, item]));
    }, []);

    const activeCategory = useMemo(() => {
        if (!activeRunId || !categoryListMap.has(activeRunId)) {
            return CATEGORY_LISTS[0];
        }
        return categoryListMap.get(activeRunId);
    }, [activeRunId, categoryListMap]);

    useEffect(() => {
        let cancelled = false;
        const loadData = async () => {
            setIsLoadingIndex(true);
            try {
                const index = await loadPokemonIndex();
                if (!cancelled) setPokemonIndex(index);
            } catch (err) {
                console.error('Failed to load Pokémon index for PokéQuiz:', err);
                if (!cancelled) setPokemonIndex([]);
            } finally {
                if (!cancelled) setIsLoadingIndex(false);
            }
        };
        loadData();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!isLoadingIndex && pokemonIndex.length > 0 && !activeRun) {
            const initialListId = getRandomUnplayedListId();
            const listObj = categoryListMap.get(initialListId) || CATEGORY_LISTS[0];
            startNewRun(listObj.id, listObj.pokemonNames);
        }
    }, [isLoadingIndex, pokemonIndex, activeRun, getRandomUnplayedListId, categoryListMap, startNewRun]);

    const pokemonByName = useMemo(() => {
        const map = new Map();
        pokemonIndex.forEach((p) => {
            map.set(p.name, p);
            const baseName = p.name.replace(/-(normal|altered|incarnate|ordinary|standard|shield|amped|disguised|solo|curly|two-segment|full-belly|male|female|red-striped|ice|zero|green-plumage|land|single-strike|aria|average)$/, '');
            if (baseName && !map.has(baseName)) {
                map.set(baseName, p);
            }
        });
        return map;
    }, [pokemonIndex]);

    const activePokemonNames = useMemo(() => {
        if (activeRun && Array.isArray(activeRun.sampledPokemonNames) && activeRun.sampledPokemonNames.length > 0) {
            return activeRun.sampledPokemonNames;
        }
        return activeCategory ? activeCategory.pokemonNames.slice(0, 20) : [];
    }, [activeRun, activeCategory]);

    const activePokemonList = useMemo(() => {
        return activePokemonNames
            .map((name) => {
                const match = pokemonByName.get(name) || pokemonByName.get(name.toLowerCase());
                if (!match) {
                    console.warn(`[PokéQuiz] Could not resolve Pokémon for name: "${name}"`);
                    return null;
                }
                const id = match.id;
                return {
                    id,
                    name,
                    displayName: formatPokemonDisplayName(name),
                    spriteUrl: getPokemonFrontSpriteUrl(id),
                    artworkUrl: getPokemonArtworkSpriteUrl(id),
                };
            })
            .filter((p) => p && p.id > 0);
    }, [activePokemonNames, pokemonByName]);

    const pokemonById = useMemo(() => {
        return new Map(activePokemonList.map((p) => [p.id, p]));
    }, [activePokemonList]);

    const foundNames = useMemo(() => {
        return new Set(activeRun ? activeRun.foundNames : []);
    }, [activeRun?.foundNames]);

    // Dynamic reactive hint: clear hint automatically when a guess is made or challenge changes
    useEffect(() => {
        setManualHint('');
        setHintTargetName(null);
    }, [foundNames.size, activeRunId]);

    const foundIds = useMemo(() => {
        const ids = new Set();
        foundNames.forEach((name) => {
            const match = pokemonByName.get(name);
            if (match) ids.add(match.id);
        });
        return ids;
    }, [foundNames, pokemonByName]);

    const isComplete = activeRun && activeRun.totalCount > 0 && foundNames.size === activeRun.totalCount;

    const answerLookup = useMemo(() => {
        const lookup = new Map();
        activePokemonList.forEach((pokemon) => {
            const aliases = buildPokemonQuizNameAliases(pokemon.name);
            aliases.forEach((alias) => {
                if (!lookup.has(alias)) {
                    lookup.set(alias, pokemon.id);
                }
            });
        });
        return lookup;
    }, [activePokemonList]);

    const remainingPokemon = useMemo(() => {
        return activePokemonList.filter((pokemon) => !foundNames.has(pokemon.name));
    }, [activePokemonList, foundNames]);

    const deferredInput = useDeferredValue(answerInput);
    const normalizedInput = useMemo(() => normalizePokemonQuizInput(deferredInput), [deferredInput]);

    useEffect(() => {
        if (!activeRun || !normalizedInput) return;

        const matchedId = answerLookup.get(normalizedInput);
        if (!matchedId) return;

        const matchedPokemon = pokemonById.get(matchedId);
        if (!matchedPokemon || foundNames.has(matchedPokemon.name)) return;

        const nextFoundArray = [...activeRun.foundNames, matchedPokemon.name];
        const nextOrderArray = [...(activeRun.foundOrder || []), matchedPokemon.name];
        setNewlyFoundId(matchedPokemon.id);

        updateActiveRunProgress(nextFoundArray, nextOrderArray, activeRun.invalidGuesses, 0);

        setFeedback({
            tone: 'success',
            message: language === 'pt'
                ? `${matchedPokemon.displayName} registrado. Restam ${Math.max(0, activeRun.totalCount - nextFoundArray.length)}.`
                : `${matchedPokemon.displayName} registered. ${Math.max(0, activeRun.totalCount - nextFoundArray.length)} remaining.`,
        });
        setAnswerInput('');
        setActiveSuggestionIndex(0);
    }, [answerLookup, foundNames, normalizedInput, activeRun, pokemonById, updateActiveRunProgress, language]);

    useEffect(() => {
        if (!isComplete) return undefined;

        setFeedback({
            tone: 'success',
            message: language === 'pt' ? 'Quiz concluído! Todos os Pokémon desta lista foram encontrados.' : 'Quiz complete! Every Pokémon in this category has been found.',
        });

        if (activePokemonList.length > 0) {
            const randomPokemon = activePokemonList[Math.floor(Math.random() * activePokemonList.length)];
            setCelebrationPokemon({
                id: randomPokemon.id,
                displayName: randomPokemon.displayName,
                spriteUrl: randomPokemon.artworkUrl,
            });
        }

        const timer = setTimeout(() => setIsCelebrationOpen(true), 750);
        return () => clearTimeout(timer);
    }, [isComplete, activePokemonList, language]);

    const suggestions = useMemo(() => {
        if (!normalizedInput || normalizedInput.length < MIN_AUTOCOMPLETE_CHARACTERS) return [];

        return remainingPokemon
            .map((pokemon) => {
                const aliases = buildPokemonQuizNameAliases(pokemon.name);
                const startsWithMatch = aliases.some((alias) => alias.startsWith(normalizedInput));
                const includesMatch = startsWithMatch || aliases.some((alias) => alias.includes(normalizedInput));

                if (!includesMatch) return null;

                return {
                    id: pokemon.id,
                    displayName: pokemon.displayName,
                    sortScore: startsWithMatch ? 0 : 1,
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.sortScore - b.sortScore)
            .slice(0, MAX_AUTOCOMPLETE_SUGGESTIONS);
    }, [normalizedInput, remainingPokemon]);

    const commitFoundPokemon = useCallback((pokemonId) => {
        const pokemon = pokemonById.get(pokemonId);
        if (!pokemon || !activeRun || foundNames.has(pokemon.name)) return;

        const nextFoundArray = [...activeRun.foundNames, pokemon.name];
        const nextOrderArray = [...(activeRun.foundOrder || []), pokemon.name];
        setNewlyFoundId(pokemon.id);

        updateActiveRunProgress(nextFoundArray, nextOrderArray, activeRun.invalidGuesses, 0);

        setFeedback({
            tone: 'success',
            message: language === 'pt'
                ? `${pokemon.displayName} registrado. Restam ${Math.max(0, activeRun.totalCount - nextFoundArray.length)}.`
                : `${pokemon.displayName} registered. ${Math.max(0, activeRun.totalCount - nextFoundArray.length)} remaining.`,
        });
        setAnswerInput('');
        setActiveSuggestionIndex(0);
    }, [activeRun, foundNames, pokemonById, updateActiveRunProgress, language]);

    const handleSelectSuggestion = useCallback((pokemonId) => {
        commitFoundPokemon(pokemonId);
        inputRef.current?.focus();
    }, [commitFoundPokemon]);

    const handleInputKeyDown = useCallback((e) => {
        if (e.key === 'ArrowDown' && suggestions.length > 0) {
            e.preventDefault();
            setActiveSuggestionIndex((curr) => (curr + 1) % suggestions.length);
            return;
        }
        if (e.key === 'ArrowUp' && suggestions.length > 0) {
            e.preventDefault();
            setActiveSuggestionIndex((curr) => (curr - 1 + suggestions.length) % suggestions.length);
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();

            const selectedSuggestion = suggestions[activeSuggestionIndex];
            if (selectedSuggestion) {
                handleSelectSuggestion(selectedSuggestion.id);
                return;
            }

            const normalizedValue = normalizePokemonQuizInput(answerInput);
            if (!normalizedValue) return;

            const matchedId = answerLookup.get(normalizedValue);
            if (matchedId) {
                const p = pokemonById.get(matchedId);
                if (p && foundNames.has(p.name)) {
                    setFeedback({ tone: 'warning', message: language === 'pt' ? 'Esse Pokémon já está na sua lista de encontrados.' : 'That Pokémon is already on your found list.' });
                    return;
                }
            }

            if (!matchedId && activeRun) {
                updateActiveRunProgress(activeRun.foundNames, activeRun.foundOrder || [], activeRun.invalidGuesses + 1, activeRun.consecutiveMisses + 1);
                setFeedback({ tone: 'danger', message: language === 'pt' ? 'Nenhum Pokémon dessa lista corresponde a esse palpite.' : 'No Pokémon in this category matches that guess.' });
            }
        }
    }, [suggestions, activeSuggestionIndex, answerInput, answerLookup, foundNames, handleSelectSuggestion, activeRun, pokemonById, updateActiveRunProgress, language]);

    const handleRerollChallenge = useCallback(() => {
        const nextId = getRandomUnplayedListId();
        const nextObj = categoryListMap.get(nextId) || CATEGORY_LISTS[0];
        startNewRun(nextObj.id, nextObj.pokemonNames);
        setAnswerInput('');
        setManualHint('');
        setHintTargetName(null);
        setFeedback({ tone: 'info', message: language === 'pt' ? `Novo desafio: ${nextObj.title.pt}` : `New challenge: ${nextObj.title.en}` });
        if (showToast) {
            showToast(language === 'pt' ? 'Novo desafio sorteado!' : 'New challenge drawn!', 'info');
        }
    }, [getRandomUnplayedListId, categoryListMap, startNewRun, showToast, language]);

    const handleManualHint = useCallback(() => {
        if (remainingPokemon.length === 0) return;
        const randomPokemon = remainingPokemon[Math.floor(Math.random() * remainingPokemon.length)];
        setManualHint(buildQuizHintText(randomPokemon.name, language));
        setHintTargetName(randomPokemon.name);
    }, [remainingPokemon, language]);

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
            if (pokemonData && speciesData) {
                const detailPayload = {
                    id: pokemonData.id,
                    name: pokemonData.name,
                    types: pokemonData.types.map((e) => e.type.name),
                    abilities: pokemonData.abilities.map((e) => e.ability),
                    stats: pokemonData.stats.map((e) => ({ name: e.stat.name, base_stat: e.base_stat })),
                    sprite: getPokemonArtworkSpriteUrl(pokemonData.id),
                    shinySprite: getPokemonArtworkSpriteUrl(pokemonData.id, { shiny: true }),
                    animatedSprite: getPokemonFrontSpriteUrl(pokemonData.id),
                    evolution_chain_url: speciesData.evolution_chain?.url || null,
                };
                detailCacheRef.current[pokemon.id] = detailPayload;
                showDetails(detailPayload);
            }
        } catch (error) {
            console.error('Failed to inspect pokemon:', error);
        } finally {
            setLoadingDetailId(null);
        }
    }, [loadingDetailId, showDetails]);

    const foundCount = foundNames.size;
    const totalCount = activePokemonList.length;
    const remainingCount = Math.max(0, totalCount - foundCount);

    const visibleEntries = useMemo(() => {
        if (gridFilter === 'guessed') return activePokemonList.filter((p) => foundNames.has(p.name));
        if (gridFilter === 'missing') return activePokemonList.filter((p) => !foundNames.has(p.name));
        return activePokemonList;
    }, [activePokemonList, gridFilter, foundNames]);

    const gridFilterOptions = [
        { key: 'all', Icon: LayoutGrid, label: language === 'pt' ? 'Todos' : 'All', count: totalCount },
        { key: 'guessed', Icon: CheckCircle2, label: language === 'pt' ? 'Adivinhados' : 'Guessed', count: foundCount },
        { key: 'missing', Icon: HelpCircle, label: language === 'pt' ? 'Faltando' : 'Missing', count: remainingCount },
    ];

    const lastFindName = activeRun?.foundOrder?.[activeRun.foundOrder.length - 1];
    const lastFind = lastFindName ? pokemonByName.get(lastFindName) : null;

    return (
        <main className="category-guesser">
            {/* View Title & Quick Actions */}
            <div className="category-guesser__header">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2 m-0 leading-snug">
                            PokéQuiz
                        </h1>
                        <p className="text-xs text-slate-400 m-0">
                            {language === 'pt'
                                ? 'Adivinhe os 20 Pokémon sorteados nesta característica oficial!'
                                : 'Guess the 20 drawn Pokémon of this official characteristic!'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleRerollChallenge}
                        className="generation-quiz__compact-reset-btn"
                        title={language === 'pt' ? 'Sortear outro desafio' : 'Draw another challenge'}
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>{language === 'pt' ? 'Novo Desafio' : 'New Challenge'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsHistoryOpen(true)}
                        className="category-guesser__history-toggle"
                    >
                        <History className="w-4 h-4" />
                        <span>{language === 'pt' ? 'Histórico' : 'History'}</span>
                        {quizRuns.length > 0 && (
                            <span className="category-guesser__history-toggle-badge">{quizRuns.length}</span>
                        )}
                    </button>
                </div>
            </div>

            <section className="category-guesser__panel">
                <div className="category-guesser__panel-header">
                    <div className="category-guesser__panel-title-group">
                        {renderCategoryIcon(activeCategory.iconName, 'w-5 h-5 text-indigo-400 flex-shrink-0')}
                        <h2 className="category-guesser__title">
                            {language === 'pt' ? activeCategory.title.pt : activeCategory.title.en}
                        </h2>
                        <span className="team-builder-panel__meta team-builder-panel__meta--compact">
                            {foundCount}/{totalCount}
                        </span>
                    </div>

                    <div className="generation-quiz__grid-filters">
                        {gridFilterOptions.map(({ key, Icon, label, count }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setGridFilter(key)}
                                className={`generation-quiz__filter-btn ${gridFilter === key ? 'is-active' : ''}`}
                                aria-pressed={gridFilter === key}
                            >
                                <Icon className="generation-quiz__filter-icon" aria-hidden="true" />
                                <span>{label}</span>
                                <span className="generation-quiz__filter-count">{count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="category-guesser__divider" />

                {/* 2-COLUMN LAYOUT WRAPPER */}
                <div className="category-guesser__columns">
                    {/* Left Column: Sidebar / Console Box */}
                    <aside className="category-guesser__sidebar">
                        <section className="category-guesser__console-box">
                            {/* Last found indicator */}
                            <div className="category-guesser__last-find-bar" key={lastFind ? lastFind.id : 'empty'}>
                                <div className="category-guesser__last-find-thumb" title={lastFind ? formatPokemonDisplayName(lastFind.name) : undefined}>
                                    {lastFind ? (
                                        <img src={getPokemonFrontSpriteUrl(lastFind.id)} alt={lastFind.name} className="image-pixelated" />
                                    ) : (
                                        <PokeballIcon />
                                    )}
                                </div>
                                <div className="category-guesser__last-find-meta">
                                    <span className="category-guesser__last-find-label">
                                        {language === 'pt' ? 'ÚLTIMO ENCONTRADO' : 'LAST FOUND'}
                                    </span>
                                    <span className="category-guesser__last-find-name">
                                        {lastFind ? formatPokemonDisplayName(lastFind.name) : '---'}
                                    </span>
                                    {lastFind && <span className="text-xs text-slate-400">#{lastFind.id}</span>}
                                </div>
                            </div>

                            {/* Category Official Description Box */}
                            <div className="category-guesser__hint-box">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                                        <span>{language === 'pt' ? 'Dica da Categoria' : 'Category Hint'}</span>
                                    </span>
                                    {activeCategory.wikiRef && (
                                        <a
                                            href={activeCategory.wikiRef}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                        >
                                            <span>Bulbapedia</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                                <p className="text-xs text-slate-300 m-0 leading-relaxed">
                                    {language === 'pt' ? activeCategory.hint.pt : activeCategory.hint.en}
                                </p>
                            </div>

                            {/* Autocomplete Search Input */}
                            <div className="w-full">
                                <PokemonGenerationQuizAutocomplete
                                    value={answerInput}
                                    onChange={setAnswerInput}
                                    onKeyDown={handleInputKeyDown}
                                    suggestions={suggestions}
                                    activeIndex={activeSuggestionIndex}
                                    onSelectSuggestion={handleSelectSuggestion}
                                    disabled={isComplete}
                                    inputRef={inputRef}
                                    placeholder={language === 'pt' ? 'Digite o nome do Pokémon...' : 'Type a Pokémon name...'}
                                    minCharacters={MIN_AUTOCOMPLETE_CHARACTERS}
                                />
                            </div>

                            {/* Console Feedback */}
                            <div className="w-full">
                                <p className={`generation-quiz__feedback generation-quiz__feedback--${feedback.tone}`}>
                                    {feedback.message}
                                </p>
                            </div>

                            {manualHint && (
                                <div className="generation-quiz__tip-banner">
                                    <HelpCircle className="w-4 h-4 text-amber-400" />
                                    <span className="generation-quiz__tip-text">{manualHint}</span>
                                </div>
                            )}

                            {/* Symmetrical Action Buttons (50% / 50%) */}
                            <div className="category-guesser__console-actions">
                                <button
                                    type="button"
                                    onClick={handleRerollChallenge}
                                    className="category-guesser__action-btn"
                                    title={language === 'pt' ? 'Sortear outro desafio' : 'Draw another challenge'}
                                >
                                    <RefreshCw className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                    <span>{language === 'pt' ? 'Novo Desafio' : 'New Challenge'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleManualHint}
                                    className="category-guesser__action-btn"
                                    disabled={remainingPokemon.length === 0}
                                    title={language === 'pt' ? 'Pedir uma dica' : 'Get a hint'}
                                >
                                    <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                    <span>{language === 'pt' ? 'Dica' : 'Hint'}</span>
                                </button>
                            </div>
                        </section>
                    </aside>

                    {/* Right Column: Cards Grid */}
                    <div className="category-guesser__grid-wrapper">
                        {isLoadingIndex ? (
                            <div className="category-guesser__loading-state">
                                <div className="team-builder-spinner" aria-hidden="true" />
                            </div>
                        ) : (
                            <div className="category-guesser__grid">
                                {visibleEntries.map((pokemon) => (
                                    <PokemonGenerationQuizCard
                                        key={pokemon.id}
                                        pokemon={pokemon}
                                        isFound={foundIds.has(pokemon.id)}
                                        isNew={pokemon.id === newlyFoundId}
                                        isLoading={loadingDetailId === pokemon.id}
                                        isInteractable={true}
                                        onInspect={inspectPokemon}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Celebration Modal */}
            {isCelebrationOpen && (
                <QuizCelebrationModal
                    isOpen={isCelebrationOpen}
                    onClose={() => setIsCelebrationOpen(false)}
                    onPlayAgain={() => {
                        setIsCelebrationOpen(false);
                        handleRerollChallenge();
                    }}
                    generationLabel={language === 'pt' ? activeCategory.title.pt : activeCategory.title.en}
                    totalCount={totalCount}
                    accuracyPercent={activeRun ? activeRun.bestAccuracy : 100}
                    pokemon={celebrationPokemon}
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
                        <HistoryIcon /> {language === 'pt' ? 'Histórico do PokéQuiz' : 'PokéQuiz History'}
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
                                        Jogue um desafio para registrar seu histórico!
                                    </>
                                ) : (
                                    <>
                                        No quiz runs recorded yet.<br />
                                        Play a challenge to record your history!
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
                                    const cat = categoryListMap.get(run.listId);
                                    const titleStr = cat ? (language === 'pt' ? cat.title.pt : cat.title.en) : run.listId;
                                    const isRunComplete = run.isComplete || (run.foundNames && run.foundNames.length === run.totalCount);
                                    const runAccuracy = run.bestAccuracy !== undefined ? run.bestAccuracy : 100;

                                    return (
                                        <div key={run.id} className="generation-quiz-history__item">
                                            <div className="generation-quiz-history__info">
                                                <span className="generation-quiz-history__gens">{titleStr}</span>
                                                <div className="generation-quiz-history__stats">
                                                    <span>{language === 'pt' ? 'Progresso:' : 'Progress:'} <strong>{run.foundNames ? run.foundNames.length : 0}/{run.totalCount}</strong></span>
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
                                                            resumeRun(run.id);
                                                            setIsHistoryOpen(false);
                                                            setFeedback({ tone: 'info', message: language === 'pt' ? 'Partida retomada. Boa sorte!' : 'Run resumed. Good luck!' });
                                                        }}
                                                        className="generation-quiz-history__btn generation-quiz-history__btn--continue"
                                                    >
                                                        {language === 'pt' ? 'Continuar' : 'Continue'}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const catObj = categoryListMap.get(run.listId);
                                                        rerunRun(run.id, catObj ? catObj.pokemonNames : []);
                                                        setIsHistoryOpen(false);
                                                        setFeedback({ tone: 'info', message: language === 'pt' ? 'Partida reiniciada do zero.' : 'Run restarted from scratch.' });
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

