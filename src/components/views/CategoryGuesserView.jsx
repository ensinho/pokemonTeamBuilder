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
// Direct, not through the modals barrel (which drags every dialog along).
import { QuizCelebrationModal } from '../modals/QuizCelebrationModal';
import { GameHistoryDialog } from '../GameHistoryDialog';
import { Loader } from '../Loader';
import { useDeferredDelete } from '../../hooks/useDeferredDelete';
import { toast } from '../../store/useToastStore';

const MAX_AUTOCOMPLETE_SUGGESTIONS = 5;
const MIN_AUTOCOMPLETE_CHARACTERS = 5;

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

const renderCategoryIcon = (iconName, className = 'w-5 h-5 text-primary') => {
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
    const prefix = displayName.slice(0, Math.max(2, Math.ceil(displayName.length * 0.33)));
    return language === 'pt'
        ? `Dica: '${prefix}…' (${displayName.length} letras)!`
        : `Tip: '${prefix}…' (${displayName.length} letters)!`;
};

export function CategoryGuesserView({ showDetails }) {
    const inputRef = useRef(null);
    const detailCacheRef = useRef({});
    const { t, language } = useTranslation();

    useDocumentMeta({
        title: 'Quiz por categoria',
        description: 'Adivinhe Pokémon baseados em características, atributos e temas oficiais.',
        path: '/quiz?tab=categories',
    });

    const [pokemonIndex, setPokemonIndex] = useState([]);
    const [isLoadingIndex, setIsLoadingIndex] = useState(true);
    const [answerInput, setAnswerInput] = useState('');
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [manualHint, setManualHint] = useState('');
    const [hintsUsed, setHintsUsed] = useState(0);
    const [feedback, setFeedback] = useState({ tone: 'muted', message: language === 'pt' ? 'Adivinhe os Pokémon da lista!' : 'Guess the Pokémon in the category!' });
    const [newlyFoundId, setNewlyFoundId] = useState(null);
    const [loadingDetailId, setLoadingDetailId] = useState(null);
    const [gridFilter, setGridFilter] = useState('all');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [visibleHistoryLimit, setVisibleHistoryLimit] = useState(10);
    const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
    const [celebrationPokemon, setCelebrationPokemon] = useState(null);
    const runDeletes = useDeferredDelete();
    const celebrateTimerRef = useRef(0);
    useEffect(() => () => clearTimeout(celebrateTimerRef.current), []);

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

    // Older runs appear as the list nears its end — at once, they are local.
    const handleHistoryScroll = useCallback((e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 40 && visibleHistoryLimit < quizRuns.length) {
            setVisibleHistoryLimit((prev) => Math.min(prev + 10, quizRuns.length));
        }
    }, [visibleHistoryLimit, quizRuns.length]);

    useEffect(() => {
        if (!isHistoryOpen) {
            setVisibleHistoryLimit(10);
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

    const activeFoundNames = activeRun?.foundNames;
    const foundNames = useMemo(() => new Set(activeFoundNames || []), [activeFoundNames]);

    const foundCount = foundNames.size;
    const totalCount = activePokemonList.length;
    const remainingCount = Math.max(0, totalCount - foundCount);

    const accuracyPercent = useMemo(() => {
        if (!activeRun) return 100;
        const invalid = activeRun.invalidGuesses || 0;
        const totalAttempts = foundCount + invalid;
        return totalAttempts > 0 ? Math.round((foundCount / totalAttempts) * 100) : 100;
    }, [activeRun, foundCount]);

    // Hints earned: 1 hint credit per 20% of total (e.g. 4 catches for 20 pokemon)
    const hintInterval = Math.max(1, Math.round(totalCount * 0.2));
    const availableHints = Math.max(0, Math.floor(foundCount / hintInterval) - hintsUsed);

    // Dynamic reactive hint: clear hint automatically when a guess is made or challenge changes
    useEffect(() => {
        setManualHint('');
        if (foundCount === 0) {
            setHintsUsed(0);
        }
    }, [foundCount, activeRunId]);

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

    // The last correct guess ends the run: celebrate from that event. The old
    // effect on `isComplete` also opened for a run that loaded finished.
    const celebrate = useCallback(() => {
        setFeedback({
            tone: 'success',
            message: language === 'pt' ? 'Quiz concluído! Todos os Pokémon desta lista foram encontrados.' : 'Quiz complete! Every Pokémon in this category has been found.',
        });
        if (activePokemonList.length > 0) {
            const randomPokemon = activePokemonList[Math.floor(Math.random() * activePokemonList.length)];
            setCelebrationPokemon({ id: randomPokemon.id, displayName: randomPokemon.displayName, spriteUrl: randomPokemon.artworkUrl });
        }
        clearTimeout(celebrateTimerRef.current);
        celebrateTimerRef.current = window.setTimeout(() => setIsCelebrationOpen(true), 750);
    }, [activePokemonList, language]);

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
        if (nextFoundArray.length === activeRun.totalCount) celebrate();
    }, [answerLookup, foundNames, normalizedInput, activeRun, pokemonById, updateActiveRunProgress, language, celebrate]);

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
        if (nextFoundArray.length === activeRun.totalCount) celebrate();
    }, [activeRun, foundNames, pokemonById, updateActiveRunProgress, language, celebrate]);

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

    // A new challenge is reversible: the run it replaces stays in the store
    // (runs are keyed by list), so Undo simply makes it the active one again.
    // It used to sit next to Hint, twice on the page, with no way back.
    const handleRerollChallenge = useCallback(({ undoable = true } = {}) => {
        const previousId = activeRun?.id || null;
        const previousHadProgress = (activeRun?.foundNames?.length || 0) > 0;
        const nextId = getRandomUnplayedListId();
        const nextObj = categoryListMap.get(nextId) || CATEGORY_LISTS[0];
        startNewRun(nextObj.id, nextObj.pokemonNames);
        setAnswerInput('');
        setManualHint('');
        setHintsUsed(0);
        const title = language === 'pt' ? nextObj.title.pt : nextObj.title.en;
        setFeedback({ tone: 'info', message: t('games.challengeDrawn', { title }) });
        if (undoable && previousId && previousHadProgress) {
            toast.info(t('games.challengeDrawn', { title }), {
                key: 'pokequiz-reroll',
                actions: [{ label: t('toast.undo'), onClick: () => resumeRun(previousId) }],
            });
        }
    }, [activeRun, getRandomUnplayedListId, categoryListMap, startNewRun, resumeRun, language, t]);

    const handleManualHint = useCallback(() => {
        if (availableHints <= 0 || remainingPokemon.length === 0) return;
        const randomPokemon = remainingPokemon[Math.floor(Math.random() * remainingPokemon.length)];
        setManualHint(buildQuizHintText(randomPokemon.name, language));
        setHintsUsed((count) => count + 1);
    }, [availableHints, remainingPokemon, language]);

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

    const visibleEntries = useMemo(() => {
        if (gridFilter === 'guessed') return activePokemonList.filter((p) => foundNames.has(p.name));
        if (gridFilter === 'missing') return activePokemonList.filter((p) => !foundNames.has(p.name));
        return activePokemonList;
    }, [activePokemonList, gridFilter, foundNames]);

    const gridFilterOptions = [
        { key: 'all', icon: <LayoutGrid aria-hidden="true" />, label: language === 'pt' ? 'Todos' : 'All', count: totalCount },
        { key: 'guessed', icon: <CheckCircle2 aria-hidden="true" />, label: language === 'pt' ? 'Adivinhados' : 'Guessed', count: foundCount },
        { key: 'missing', icon: <HelpCircle aria-hidden="true" />, label: language === 'pt' ? 'Faltando' : 'Missing', count: remainingCount },
    ];

    const lastFindName = activeRun?.foundOrder?.[activeRun.foundOrder.length - 1];
    const lastFind = lastFindName ? pokemonByName.get(lastFindName) : null;

    const visibleRuns = quizRuns.filter((run) => !runDeletes.hidden.has(run.id));

    const deleteRunWithUndo = (run) => {
        runDeletes.schedule(run.id, () => deleteRun(run.id));
        toast.info(t('games.runDeleted'), {
            key: `pokequiz-delete-${run.id}`,
            actions: [{ label: t('toast.undo'), onClick: () => runDeletes.undo(run.id) }],
        });
    };

    return (
        <main className="category-guesser">
            <section className="category-guesser__panel" aria-labelledby="category-guesser-title">
                {/* One header for the page: the category, its count, the grid
                    filter, and the two page actions — at every width. History
                    used to live in a top banner that phones hid outright, and
                    "New challenge" appeared twice, once right beside Hint. */}
                <div className="category-guesser__panel-header">
                    <div className="category-guesser__panel-title-group">
                        {renderCategoryIcon(activeCategory.iconName, 'w-5 h-5 text-primary flex-shrink-0')}
                        <div className="category-guesser__title-stack">
                            <h2 id="category-guesser-title" className="category-guesser__title">
                                {language === 'pt' ? activeCategory.title.pt : activeCategory.title.en}
                            </h2>
                            <p className="category-guesser__intro">{t('games.guesserIntro')}</p>
                        </div>
                        <span className="team-builder-panel__meta team-builder-panel__meta--compact">
                            {foundCount}/{totalCount}
                        </span>
                    </div>

                    <div className="generation-quiz__grid-filters segmented segmented--sm" role="group" aria-label={language === 'pt' ? 'Filtrar a grade' : 'Filter the grid'}>
                        {gridFilterOptions.map(({ key, icon, label, count }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setGridFilter(key)}
                                className="segmented__item touch-target touch-target--y"
                                aria-pressed={gridFilter === key}
                            >
                                {icon}
                                <span>{label}</span>
                                <span className="count-badge">{count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="category-guesser__page-actions">
                        <button
                            type="button"
                            onClick={() => handleRerollChallenge()}
                            className="btn btn-ghost btn-sm"
                            aria-label={t('games.newChallenge')}
                            title={language === 'pt' ? 'Sortear outro desafio' : 'Draw another challenge'}
                        >
                            <RefreshCw aria-hidden="true" />
                            <span className="category-guesser__action-label">{t('games.newChallenge')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsHistoryOpen(true)}
                            className="btn btn-secondary btn-sm btn-icon"
                            aria-label={t('games.guesserHistory')}
                            title={t('games.guesserHistory')}
                        >
                            <History aria-hidden="true" />
                        </button>
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
                                        <img src={getPokemonFrontSpriteUrl(lastFind.id)} alt={lastFind.name} width="36" height="36" className="image-pixelated" />
                                    ) : (
                                        <PokeballIcon />
                                    )}
                                </div>
                                <div className="category-guesser__last-find-meta">
                                    <span className="category-guesser__last-find-label">{t('games.lastFound')}</span>
                                    <span className="category-guesser__last-find-name">
                                        {lastFind ? formatPokemonDisplayName(lastFind.name) : '---'}
                                    </span>
                                    {lastFind && <span className="text-xs text-muted">#{lastFind.id}</span>}
                                </div>
                            </div>

                            {/* Category Official Description Box */}
                            <div className="category-guesser__hint-box">
                                <div className="category-guesser__hint-head">
                                    <span className="category-guesser__hint-label">
                                        <Lightbulb className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                                        {t('games.categoryHint')}
                                    </span>
                                    {activeCategory.wikiRef && (
                                        <a
                                            href={activeCategory.wikiRef}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="category-guesser__wiki-link"
                                        >
                                            <span>Bulbapedia</span>
                                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                        </a>
                                    )}
                                </div>
                                <p className="category-guesser__hint-text">
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
                                    <HelpCircle className="w-4 h-4 text-accent" aria-hidden="true" />
                                    <span className="generation-quiz__tip-text">{manualHint}</span>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleManualHint}
                                className="btn btn-secondary btn-block"
                                disabled={availableHints <= 0 || remainingPokemon.length === 0 || isComplete}
                                title={t('games.hintEarn', { count: hintInterval })}
                            >
                                <Sparkles className="text-accent" aria-hidden="true" />
                                <span>{language === 'pt' ? 'Dica' : 'Hint'}</span>
                                <span className="count-badge">{availableHints}</span>
                            </button>
                        </section>
                    </aside>

                    {/* Right Column: Cards Grid */}
                    <div className="category-guesser__grid-wrapper">
                        {isLoadingIndex ? (
                            <div className="category-guesser__loading-state">
                                <Loader />
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
                    onPlayAgain={() => handleRerollChallenge({ undoable: false })}
                    playAgainText={t('games.newChallenge')}
                    mode="category"
                    categoryLabel={language === 'pt' ? activeCategory.title.pt : activeCategory.title.en}
                    totalCount={totalCount}
                    accuracy={accuracyPercent}
                    pokemon={celebrationPokemon}
                />
            )}

            {isHistoryOpen && (
                <GameHistoryDialog
                    title={t('games.guesserHistory')}
                    onClose={() => setIsHistoryOpen(false)}
                    onScroll={handleHistoryScroll}
                >
                    {visibleRuns.length === 0 ? (
                        <div className="game-history__empty">
                            <HistoryIcon />
                            <p className="m-0">
                                {language === 'pt'
                                    ? 'Nenhuma partida gravada ainda. Jogue um desafio para registrar seu histórico!'
                                    : 'No quiz runs recorded yet. Play a challenge to record your history!'}
                            </p>
                        </div>
                    ) : (
                        <ul className="game-history__list">
                            {visibleRuns
                                .slice()
                                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                                .slice(0, visibleHistoryLimit)
                                .map((run) => {
                                    const cat = categoryListMap.get(run.listId);
                                    const titleStr = cat ? (language === 'pt' ? cat.title.pt : cat.title.en) : run.listId;
                                    const isRunComplete = run.isComplete || (run.foundNames && run.foundNames.length === run.totalCount);
                                    const runAccuracy = run.bestAccuracy !== undefined ? run.bestAccuracy : 100;

                                    return (
                                        <li key={run.id} className="game-history__item game-history__item--wrap">
                                            <div className="game-history__main">
                                                <div className="game-history__heading">
                                                    <span className="game-history__title">{titleStr}</span>
                                                    <span className={`game-history__badge ${isRunComplete ? 'is-complete' : 'is-progress'}`}>
                                                        {isRunComplete ? t('games.statusCompleted') : t('games.statusInProgress')}
                                                    </span>
                                                </div>
                                                <span className="game-history__meta">
                                                    {run.foundNames ? run.foundNames.length : 0}/{run.totalCount} · {runAccuracy}%
                                                    {run.bestFound > 0 && ` · ${language === 'pt' ? 'Melhor' : 'Best'} ${run.bestFound}/${run.totalCount}`}
                                                </span>
                                            </div>
                                            <div className="game-history__actions">
                                                {!isRunComplete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            resumeRun(run.id);
                                                            setIsHistoryOpen(false);
                                                            setFeedback({ tone: 'info', message: language === 'pt' ? 'Partida retomada. Boa sorte!' : 'Run resumed. Good luck!' });
                                                        }}
                                                        className="btn btn-secondary btn-sm"
                                                    >
                                                        {t('games.continue')}
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
                                                    className="btn btn-ghost btn-sm"
                                                >
                                                    {isRunComplete ? t('games.playAgain') : t('games.restart')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteRunWithUndo(run)}
                                                    className="btn btn-ghost btn-muted btn-sm btn-icon"
                                                    aria-label={t('games.deleteRun')}
                                                    title={t('games.deleteRun')}
                                                >
                                                    <CloseIcon />
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                        </ul>
                    )}
                </GameHistoryDialog>
            )}
        </main>
    );
}
