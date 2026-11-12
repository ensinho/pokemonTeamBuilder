import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, HelpCircle, LayoutGrid, Swords } from 'lucide-react';

import '../../styles/generation-quiz-view.css';

import { GENERATION_RANGES } from '../../constants/pokemon';
import { typeColors } from '../../constants/types';
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
import { EmptyState } from '../EmptyState';
import { PokemonGenerationQuizAutocomplete } from '../PokemonGenerationQuizAutocomplete';
import { PokemonGenerationQuizCard } from '../PokemonGenerationQuizCard';
import {
    CloseIcon,
    PokeballIcon,
    RefreshIcon,
    SparklesIcon,
} from '../icons';
// Direct, not through the modals barrel (which drags every dialog along).
import { QuizCelebrationModal } from '../modals/QuizCelebrationModal';
import { GameHistoryDialog } from '../GameHistoryDialog';
import { useQuizRuns } from '../../hooks/useQuizRuns';
import { useTrainerBadges } from '../../hooks/useTrainerBadges';
import { useDeferredDelete } from '../../hooks/useDeferredDelete';
import { Loader } from '../Loader';
import { MascotCompanion } from '../MascotCompanion';
import { useMascotBeat } from '../../hooks/useMascotBeat';
import { feedbackBeat } from '../../utils/mascot/assistant';
import { toast } from '../../store/useToastStore';
import { track } from '../../services/analytics';
import { useSearchParams } from 'react-router-dom';
import { decodeQuizDuel, encodeQuizDuel } from '../../utils/resultShareCode';
import { shareLink } from '../../utils/forumShare';
import { QuizDuelBanner } from '../QuizDuelBanner';
import { nudgeSupport, cancelSupportNudge } from '../../services/supportNudge';
import { QUIZ_MODES, SPRINT_SECONDS, formatClock, modeOfRun, nextStarGoal, runIdFor, sprintSecondsLeft, starsFor } from '../../utils/quizProgress';

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

// Each generation is a region, shown by its three starters (2026-11-12).
const REGIONS = Object.freeze({
    'generation-i': { name: 'Kanto', starters: [1, 4, 7] },
    'generation-ii': { name: 'Johto', starters: [152, 155, 158] },
    'generation-iii': { name: 'Hoenn', starters: [252, 255, 258] },
    'generation-iv': { name: 'Sinnoh', starters: [387, 390, 393] },
    'generation-v': { name: 'Unova', starters: [495, 498, 501] },
    'generation-vi': { name: 'Kalos', starters: [650, 653, 656] },
    'generation-vii': { name: 'Alola', starters: [722, 725, 728] },
    'generation-viii': { name: 'Galar', starters: [810, 813, 816] },
    'generation-ix': { name: 'Paldea', starters: [906, 909, 912] },
});

// Every region's starters are grass, fire and water, in that order: each
// stands on a battle platform in its own type colour (2026-11-12).
const STARTER_TYPES = ['grass', 'fire', 'water'];

// Three stars: half the region, four fifths, all of it (utils/quizProgress.js).
function Stars({ count, label }) {
    return (
        <span className="quiz-stars" role="img" aria-label={label}>
            {[1, 2, 3].map((n) => <i key={n} className={n <= count ? 'is-earned' : undefined} />)}
        </span>
    );
}

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

// Hint reveals the first ~20% of the name (min 2 chars) — roughly the first
// syllable — instead of a single letter.
const buildQuizHintText = (pokemon, language) => {
    const name = pokemon.displayName;
    const prefix = name.slice(0, Math.max(2, Math.ceil(name.length * 0.33)));
    return language === 'pt'
        ? `Dica para você: '${prefix}…' (${name.length})!`
        : `Tip to you:'${prefix}…' (${name.length})!`;
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

// One empty list for "no run yet", so memos keyed on it stay put between renders.
const NO_ITEMS = Object.freeze([]);

export function GenerationQuizView({ showDetails, showToast }) {
    const inputRef = useRef(null);
    const consoleCellRef = useRef(null);
    const [consoleWidth, setConsoleWidth] = useState(0);
    const detailCacheRef = useRef({});
    const { t, language } = useTranslation();
    const { checkBadgeCelebration } = useTrainerBadges();
    // A badge earned by finishing waits for the celebration to close (it used
    // to open on top of it); by then the stats have moved on, so call the
    // latest check rather than the one captured at completion.
    const checkBadgeRef = useRef(checkBadgeCelebration);
    useEffect(() => { checkBadgeRef.current = checkBadgeCelebration; }, [checkBadgeCelebration]);
    useDocumentMeta({
        title: 'Generation Quiz',
        description: 'Guess which generation a Pokémon is from and test your Pokédex knowledge.',
        path: '/quiz',
    });

    const [pokemonIndex, setPokemonIndex] = useState([]);
    const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
    const [celebrationPokemon, setCelebrationPokemon] = useState(null);
    const [isLoadingIndex, setIsLoadingIndex] = useState(true);
    // A duel link (`?duel=`, social-heart D3) picks the same generations and
    // carries the mark to beat.
    const [searchParams] = useSearchParams();
    const duel = useMemo(() => decodeQuizDuel(searchParams.get('duel')), [searchParams]);
    const [selectedGenerationKeys, setSelectedGenerationKeys] = useState(() => new Set(duel ? duel.generations : ['generation-i']));
    const [answerInput, setAnswerInput] = useState('');
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [currentTip, setCurrentTip] = useState('');
    const [manualHint, setManualHint] = useState('');
    const [hintsUsed, setHintsUsed] = useState(0);
    const [feedback, setFeedback] = useState({ tone: 'muted', message: language === 'pt' ? 'Escolha as gerações.' : 'Choose generations.' });
    const [announcement, setAnnouncement] = useState('');
    const [newlyFoundId, setNewlyFoundId] = useState(null);
    const [loadingDetailId, setLoadingDetailId] = useState(null);
    const [gridFilter, setGridFilter] = useState('all'); // 'all', 'guessed', 'missing'
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    // How the next run is played, and the live parts of one in progress: the
    // run of right answers, a Sprint's clock, and how a Sprint or Flawless
    // run ended. None of it is saved — only the run's best mark is.
    const [mode, setMode] = useState('classic');
    const [combo, setCombo] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(SPRINT_SECONDS);
    const [modeOver, setModeOver] = useState(null);
    const sprintDeadlineRef = useRef(0);
    const sessionRunRef = useRef(null);
    const [visibleHistoryLimit, setVisibleHistoryLimit] = useState(10);
    const runDeletes = useDeferredDelete();
    const celebrateTimerRef = useRef(0);
    // The mascot reads the feedback line (2026-11-11): each new line is a beat
    // — a find hops (a streak climbs), a miss shakes his head, the last one wins.
    const [mascotBeat, emitBeat] = useMascotBeat();
    const wonRef = useRef(false);
    useEffect(() => {
        const kind = feedbackBeat(feedback.tone, { complete: wonRef.current });
        wonRef.current = false;
        if (kind) emitBeat(kind);
    }, [feedback, emitBeat]);
    useEffect(() => () => clearTimeout(celebrateTimerRef.current), []);

    useEffect(() => {
        setFeedback((current) => (
            current.message === 'Choose generations.' || current.message === 'Escolha as gerações.'
                ? { tone: 'muted', message: language === 'pt' ? 'Escolha as gerações.' : 'Choose generations.' }
                : current
        ));
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

    const quizStarted = activeRun !== null;
    const isComplete = quizStarted && activeRun.totalCount > 0 && activeRun.foundIds.length === activeRun.totalCount;

    // Back to the generation picker. The run is kept and listed in History,
    // so there is nothing to confirm (the old dialog said exactly that).
    const handleExitQuizClick = useCallback(() => {
        setActiveRunId(null);
        setModeOver(null);
        setCombo(0);
        sessionRunRef.current = null;
    }, [setActiveRunId]);

    const runMode = modeOfRun(activeRun);
    const activeRunKey = activeRun?.id || null;
    // A Sprint or Flawless run lives for one sitting: its clock and its rule
    // are not saved, so one found active after a reload goes back to the
    // picker (its best mark stays).
    useEffect(() => {
        if (activeRunKey && runMode !== 'classic' && sessionRunRef.current !== activeRunKey) {
            setActiveRunId(null);
        }
    }, [activeRunKey, runMode, setActiveRunId]);

    useEffect(() => {
        if (!quizStarted) return undefined;

        const measureWidth = () => {
            const spacerEl = document.querySelector('.generation-quiz__console-spacer');
            if (spacerEl) {
                setConsoleWidth(spacerEl.getBoundingClientRect().width);
            }
        };

        // Measure initially
        measureWidth();

        // Measure on window resize
        window.addEventListener('resize', measureWidth);

        // Also measure using ResizeObserver to be reactive to grid container changes
        let resizeObserver;
        const spacerEl = document.querySelector('.generation-quiz__console-spacer');
        if (spacerEl && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(measureWidth);
            resizeObserver.observe(spacerEl);
        }

        return () => {
            window.removeEventListener('resize', measureWidth);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };
    }, [quizStarted, gridFilter]);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (quizStarted && !isComplete) {
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [quizStarted, isComplete]);

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

    const foundOrder = activeRun ? activeRun.foundOrder : NO_ITEMS;
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

    const activeFoundIds = activeRun?.foundIds;
    const foundIds = useMemo(() => new Set(activeFoundIds || []), [activeFoundIds]);

    const activeGenerationKeys = activeRun ? activeRun.generationKeys : NO_ITEMS;

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
                setCurrentTip(buildQuizHintText(randomPokemon, language));
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

    // The last correct guess ends the run: celebrate from that event, not
    // from an effect watching `isComplete` — that one also fired for a run
    // that loaded already finished, and re-ran (re-opening the dialog) every
    // time the badge stats or the language changed.
    const celebrate = useCallback(() => {
        wonRef.current = true;
        setAnnouncement(language === 'pt' ? 'Quiz de Gerações concluído.' : 'Generation Quiz complete.');
        setFeedback({ tone: 'success', message: language === 'pt' ? 'Quiz concluído. Todos os Pokémon selecionados foram encontrados!' : 'Quiz complete. Every selected Pokémon has been found.' });
        setCelebrationPokemon(activeEntries.length > 0
            ? activeEntries[Math.floor(Math.random() * activeEntries.length)]
            : null);
        // A beat of delay: the last guess commits while the user is still
        // typing, and their trailing Enter must not land on the dialog.
        clearTimeout(celebrateTimerRef.current);
        celebrateTimerRef.current = window.setTimeout(() => setIsCelebrationOpen(true), 750);
    }, [activeEntries, language]);

    useEffect(() => {
        if (!quizStarted || !normalizedAnswerInput || !activeRun || modeOver) return;

        const matchedPokemonId = answerLookup.get(normalizedAnswerInput);
        if (!matchedPokemonId || foundIds.has(matchedPokemonId)) return;

        const matchedPokemon = pokemonById.get(matchedPokemonId);
        if (!matchedPokemon) return;

        const nextFoundIdsArray = [...activeRun.foundIds, matchedPokemonId];
        const nextFoundOrder = [...activeRun.foundOrder, matchedPokemonId];
        setNewlyFoundId(matchedPokemonId);
        setCombo((value) => value + 1);

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
        if (nextFoundIdsArray.length === activeRun.totalCount) celebrate();
    }, [answerLookup, foundIds, normalizedAnswerInput, pokemonById, quizStarted, totalCount, activeRun, updateActiveRunProgress, language, celebrate, modeOver]);

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
        () => foundOrder.slice(-4).reverse().map((pokemonId) => pokemonById.get(pokemonId)).filter(Boolean),
        [foundOrder, pokemonById]
    );

    // Manual hints: 1 credit earned per 10 catches. A fresh/restarted run
    // (foundCount back to 0) resets spent credits; a new catch clears the
    // last manual hint so it doesn't linger after being solved.
    useEffect(() => {
        setManualHint('');
        if (foundCount === 0) {
            setHintsUsed(0);
        }
    }, [foundCount, activeRun?.id]);

    const availableHints = Math.max(0, Math.floor(foundCount / 10) - hintsUsed);

    const handleManualHint = useCallback(() => {
        if (availableHints <= 0 || remainingEntries.length === 0) return;
        const randomPokemon = remainingEntries[Math.floor(Math.random() * remainingEntries.length)];
        setManualHint(buildQuizHintText(randomPokemon, language));
        setHintsUsed((value) => value + 1);
    }, [availableHints, remainingEntries, language]);

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

        sessionRunRef.current = runIdFor(buildSelectionSignature(selectedGenerationList), mode);
        startNewRun(selectedGenerationList, previewEntries.length, mode);
        setCombo(0);
        setModeOver(null);
        sprintDeadlineRef.current = mode === 'sprint' ? Date.now() + SPRINT_SECONDS * 1000 : 0;
        setSecondsLeft(SPRINT_SECONDS);
        setAnswerInput('');
        setGridFilter('all');
        setActiveSuggestionIndex(0);
        setAnnouncement(language === 'pt' ? 'Novo Quiz de Gerações iniciado.' : 'New Generation Quiz started.');
        setFeedback({ tone: 'info', message: language === 'pt' ? `${previewEntries.length} Pokémon prontos.` : `${previewEntries.length} Pokémon ready.` });
    }, [previewEntries.length, selectedGenerationList, startNewRun, language, mode]);

    // Restart is reversible: it happens at once, and the toast can put every
    // catch back (the store keeps the run's id, so undo re-applies its progress).
    const restartRun = useCallback(() => {
        if (!activeRun) return;
        const snapshot = {
            id: activeRun.id,
            foundIds: activeRun.foundIds,
            foundOrder: activeRun.foundOrder,
            invalidGuesses: activeRun.invalidGuesses,
            consecutiveMisses: activeRun.consecutiveMisses,
        };
        rerunRun(activeRun.id);
        setCombo(0);
        setModeOver(null);
        if (modeOfRun(activeRun) === 'sprint') {
            sprintDeadlineRef.current = Date.now() + SPRINT_SECONDS * 1000;
            setSecondsLeft(SPRINT_SECONDS);
        }
        setAnswerInput('');
        setGridFilter('all');
        setActiveSuggestionIndex(0);
        setFeedback({ tone: 'info', message: language === 'pt' ? 'Partida reiniciada do zero.' : 'Run restarted from scratch.' });
        inputRef.current?.focus();
        // A Sprint or Flawless run starts over for real: putting the catches
        // back would also put back a clock that has run out.
        if (snapshot.foundIds.length === 0 || modeOfRun(activeRun) !== 'classic') return;
        toast.info(t('games.runRestarted'), {
            key: `quiz-restart-${snapshot.id}`,
            actions: [{
                label: t('toast.undo'),
                onClick: () => {
                    resumeRun(snapshot.id);
                    updateActiveRunProgress(snapshot.foundIds, snapshot.foundOrder, snapshot.invalidGuesses, snapshot.consecutiveMisses);
                },
            }],
        });
    }, [activeRun, rerunRun, resumeRun, updateActiveRunProgress, language, t]);

    // Badge first; the nudge a beat later, so the badge dialog (if any) is up
    // and the nudge waits for it (services/supportNudge). Never after
    // "Play again": the user is already in the next run.
    const nudgeTimerRef = useRef(0);
    useEffect(() => () => {
        window.clearTimeout(nudgeTimerRef.current);
        cancelSupportNudge();
    }, []);
    const closeCelebration = useCallback((options) => {
        setIsCelebrationOpen(false);
        checkBadgeRef.current?.();
        window.clearTimeout(nudgeTimerRef.current);
        if (options?.playAgain === true) return;
        nudgeTimerRef.current = window.setTimeout(() => nudgeSupport('quiz_generation'), 400);
    }, []);

    const commitFoundPokemon = useCallback((pokemonId) => {
        const pokemon = pokemonById.get(pokemonId);
        if (!pokemon || !activeRun || foundIds.has(pokemonId)) return;

        const nextFoundIdsArray = [...activeRun.foundIds, pokemonId];
        const nextFoundOrder = [...activeRun.foundOrder, pokemonId];
        setNewlyFoundId(pokemonId);
        setCombo((value) => value + 1);

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
        if (nextFoundIdsArray.length === activeRun.totalCount) celebrate();
    }, [activeRun, foundIds, pokemonById, totalCount, updateActiveRunProgress, language, celebrate]);

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
                setCombo(0);
                if (runMode === 'flawless') {
                    setModeOver({ reason: 'miss', found: activeRun?.foundIds.length || 0 });
                    setFeedback({ tone: 'danger', message: language === 'pt' ? 'Um erro encerra o modo Sem erros.' : 'One miss ends a Flawless run.' });
                    return;
                }
                setFeedback({ tone: 'danger', message: language === 'pt' ? 'Nenhum Pokémon corresponde a esse palpite.' : 'No Pokémon match that guess yet.' });
            }
        }
    }, [activeSuggestionIndex, answerInput, answerLookup, foundIds, handleSelectSuggestion, suggestions, activeRun, updateActiveRunProgress, language, runMode]);

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

    const allGenerationsSelected = selectedGenerationList.length === QUIZ_GENERATION_KEYS.length;

    // A Sprint's clock. The deadline is the truth; the tick only redraws it.
    const runFoundCount = activeRun?.foundIds.length || 0;
    const sprintRunning = quizStarted && runMode === 'sprint' && !modeOver && !isComplete;
    useEffect(() => {
        if (!sprintRunning) return undefined;
        const tick = () => {
            const left = sprintSecondsLeft(sprintDeadlineRef.current);
            setSecondsLeft(left);
            if (left <= 0) {
                setModeOver({ reason: 'time', found: runFoundCount });
                setFeedback({ tone: 'info', message: language === 'pt' ? 'Tempo esgotado.' : 'Time is up.' });
            }
        };
        tick();
        const timer = window.setInterval(tick, 250);
        return () => window.clearInterval(timer);
    }, [sprintRunning, runFoundCount, language]);

    // The picker's reading of the runs already saved: each region's best mark
    // (its stars), and the selection's best in each mode.
    const bestOf = (generationKeys, runModeKey = 'classic') => {
        const run = quizRuns.find((r) => r.id === runIdFor(buildSelectionSignature(generationKeys), runModeKey));
        return run && run.bestFound > 0 ? run : null;
    };
    const regionCards = QUIZ_GENERATION_KEYS.map((generationKey) => {
        const total = generationCounts.get(generationKey) || 0;
        const best = bestOf([generationKey]);
        const found = Math.min(best?.bestFound || 0, total);
        return { key: generationKey, ...REGIONS[generationKey], total, found, stars: starsFor(found, total) };
    });
    const namedTotal = regionCards.reduce((sum, region) => sum + region.found, 0);
    const catalogTotal = regionCards.reduce((sum, region) => sum + region.total, 0);
    const allBest = bestOf(QUIZ_GENERATION_KEYS);
    const selectionTotal = previewEntries.length;
    const selectionBest = Math.min(bestRun?.bestFound || 0, selectionTotal);
    const selectionGoal = nextStarGoal(selectionBest, selectionTotal);
    const selectedRegion = selectedGenerationList.length === 1 ? REGIONS[selectedGenerationList[0]] : null;
    const selectionName = allGenerationsSelected
        ? (language === 'pt' ? 'Todas as regiões' : 'Every region')
        : selectedRegion?.name || (language === 'pt' ? `${selectedGenerationList.length} gerações` : `${selectedGenerationList.length} generations`);
    const selectionEyebrow = allGenerationsSelected
        ? (language === 'pt' ? 'A maratona' : 'The marathon')
        : selectedGenerationList.map((key) => GENERATION_LABELS[key]).join(' · ');
    const MODE_COPY = {
        classic: { label: language === 'pt' ? 'Clássico' : 'Classic', hint: language === 'pt' ? 'Sem relógio. O progresso fica salvo e você continua depois.' : 'No clock. Your progress is saved and you can come back.' },
        sprint: { label: 'Sprint 60s', hint: language === 'pt' ? 'Quantos nomes você acerta em um minuto.' : 'How many you can name in one minute.' },
        flawless: { label: language === 'pt' ? 'Sem erros' : 'Flawless', hint: language === 'pt' ? 'A partida acaba no primeiro palpite errado.' : 'The run ends on the first wrong guess.' },
    };
    const starsLabel = (count) => (language === 'pt' ? `${count} de 3 estrelas` : `${count} of 3 stars`);
    const lastFind = recentFinds[0] || null;
    const previousFinds = recentFinds.slice(1);

    const gridFilterOptions = [
        { key: 'all', icon: <LayoutGrid aria-hidden="true" />, label: language === 'pt' ? 'Todos' : 'All', count: totalCount },
        { key: 'guessed', icon: <CheckCircle2 aria-hidden="true" />, label: language === 'pt' ? 'Adivinhados' : 'Guessed', count: foundCount },
        { key: 'missing', icon: <HelpCircle aria-hidden="true" />, label: language === 'pt' ? 'Faltando' : 'Missing', count: remainingCount },
    ];

    // History lists what can be resumed; a Sprint or Flawless run cannot (its
    // best mark shows in the picker instead).
    const visibleRuns = quizRuns.filter((run) => !runDeletes.hidden.has(run.id) && modeOfRun(run) === 'classic');

    const historyButton = (
        <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="btn btn-secondary btn-sm generation-quiz__history-toggle"
            aria-label={t('games.quizHistory')}
            title={t('games.quizHistory')}
        >
            <HistoryIcon />
            <span className="generation-quiz__history-toggle-label">{t('games.history')}</span>
            {visibleRuns.length > 0 && (
                <span className="count-badge">{visibleRuns.length}</span>
            )}
        </button>
    );

    const deleteRunWithUndo = (run) => {
        runDeletes.schedule(run.id, () => deleteRun(run.id));
        toast.info(t('games.runDeleted'), {
            key: `quiz-delete-${run.id}`,
            actions: [{ label: t('toast.undo'), onClick: () => runDeletes.undo(run.id) }],
        });
    };

    // Challenge a friend to this exact quiz, with my mark to beat.
    const shareDuel = async () => {
        const code = encodeQuizDuel({ generations: activeRun?.generationKeys || [...selectedGenerationKeys], found: foundCount, total: totalCount });
        if (!code) return;
        const url = `${window.location.origin}${window.location.pathname}?duel=${code}`;
        const outcome = await shareLink({ title: t('quiz.duel.shareTitle'), text: t('quiz.duel.shareText', { found: foundCount, total: totalCount }), url });
        if (outcome === 'copied') toast.success(t('quiz.duel.copied'));
        if (outcome === 'shared' || outcome === 'copied') track('quiz_duel_share', { found: foundCount, total: totalCount });
    };

    return (
        <main className={`generation-quiz ${quizStarted ? 'generation-quiz--running' : ''}`}>
            {duel && <QuizDuelBanner duel={duel} found={quizStarted ? foundCount : null} t={t} />}
            {!quizStarted ? (
                <section className="generation-quiz__panel team-builder-panel generation-quiz__grid-panel" aria-labelledby="generation-quiz-title">
                    {/* The shell's header already names the page; the panel says
                        what to do instead of repeating "Quiz" a second and third
                        time (with a decorative logo between them). */}
                    <div className="generation-quiz__panel-header">
                        <h2 id="generation-quiz-title" className="sr-only">{t('quiz.title')}</h2>
                        <p className="generation-quiz__start-subtitle">{t('games.quizIntro')}</p>
                        {!isLoadingIndex && catalogTotal > 0 && (
                            <span className="quiz-picker__total" title={language === 'pt' ? 'Soma do seu recorde em cada região' : 'Your best in each region, added up'}>
                                <strong>{namedTotal}</strong> / {catalogTotal} {language === 'pt' ? 'nomeados' : 'named'}
                            </span>
                        )}
                        {historyButton}
                    </div>

                    {isLoadingIndex ? (
                        <div className="generation-quiz__loading-state">
                            <Loader scene="think" />
                        </div>
                    ) : (
                        <div className="quiz-picker">
                            <div className="quiz-picker__regions" role="group" aria-label={language === 'pt' ? 'Escolher região' : 'Choose a region'}>
                                {regionCards.map((region) => {
                                    const active = !allGenerationsSelected && selectedGenerationKeys.has(region.key);
                                    return (
                                        <button
                                            key={region.key}
                                            type="button"
                                            onClick={() => toggleGeneration(region.key)}
                                            aria-pressed={active}
                                            className={`quiz-region ${active ? 'is-active' : ''} ${region.found === 0 ? 'is-unknown' : ''}`}
                                        >
                                            {/* Never played: the starters are silhouettes — "who's that Pokémon?". */}
                                            <span className="quiz-region__starters" aria-hidden="true">
                                                {region.starters.map((id, i) => (
                                                    <span key={id} className="quiz-region__starter" style={{ '--type': typeColors[STARTER_TYPES[i]] }}>
                                                        <img src={pokemonById.get(id)?.spriteUrl} alt="" className="image-pixelated" loading="lazy" />
                                                    </span>
                                                ))}
                                            </span>
                                            <span className="quiz-region__head">
                                                <span className="quiz-region__name">{region.name}</span>
                                                <Stars count={region.stars} label={starsLabel(region.stars)} />
                                            </span>
                                            <span className={`quiz-region__bar ${region.stars >= 2 ? 'is-gold' : ''}`} aria-hidden="true">
                                                <i style={{ width: `${region.total ? Math.round((region.found / region.total) * 100) : 0}%` }} />
                                            </span>
                                            <span className="quiz-region__figure">
                                                {region.found > 0 ? region.found : '—'} / {region.total} · {GENERATION_LABELS[region.key]}
                                            </span>
                                        </button>
                                    );
                                })}
                                <button
                                    type="button"
                                    onClick={toggleAllGenerations}
                                    aria-pressed={allGenerationsSelected}
                                    className={`quiz-region quiz-region--all ${allGenerationsSelected ? 'is-active' : ''}`}
                                >
                                    <span className="quiz-region__all" aria-hidden="true">{catalogTotal}</span>
                                    <span className="quiz-region__head">
                                        <span className="quiz-region__name">{language === 'pt' ? 'Todas' : 'All'}</span>
                                        <Stars count={starsFor(allBest?.bestFound || 0, catalogTotal)} label={starsLabel(starsFor(allBest?.bestFound || 0, catalogTotal))} />
                                    </span>
                                    <span className="quiz-region__figure">{language === 'pt' ? 'a maratona' : 'the marathon'}</span>
                                </button>
                            </div>

                            <aside className="quiz-picker__panel" aria-live="polite">
                                <div>
                                    <span className="quiz-picker__eyebrow">{selectionEyebrow}</span>
                                    <h3 className="quiz-picker__name">{selectionName}</h3>
                                </div>
                                <dl className="quiz-picker__facts">
                                    <div>
                                        <dd>{selectionBest > 0 ? selectionBest : '—'}<span> / {selectionTotal}</span></dd>
                                        <dt>{language === 'pt' ? 'seu recorde' : 'your best'}</dt>
                                    </div>
                                    {bestRun && (
                                        <div>
                                            <dd>{bestRun.accuracyPercent}%</dd>
                                            <dt>{language === 'pt' ? 'precisão' : 'accuracy'}</dt>
                                        </div>
                                    )}
                                    {selectionGoal && (
                                        <div>
                                            <dd>{selectionGoal.missing}</dd>
                                            <dt>{language === 'pt' ? `para a ${selectionGoal.star}ª estrela` : `to star ${selectionGoal.star}`}</dt>
                                        </div>
                                    )}
                                </dl>
                                <div className="segmented segmented--quiet segmented--block" role="group" aria-label={language === 'pt' ? 'Modo de jogo' : 'Game mode'}>
                                    {QUIZ_MODES.map((key) => (
                                        <button key={key} type="button" className="segmented__item" aria-pressed={mode === key} onClick={() => setMode(key)}>
                                            {MODE_COPY[key].label}
                                        </button>
                                    ))}
                                </div>
                                <p className="quiz-picker__hint">
                                    {MODE_COPY[mode].hint}
                                    {mode !== 'classic' && bestOf(selectedGenerationList, mode) && (
                                        <> {language === 'pt' ? 'Seu melhor:' : 'Your best:'} <strong>{bestOf(selectedGenerationList, mode).bestFound}</strong>.</>
                                    )}
                                </p>
                                <button
                                    type="button"
                                    onClick={startQuiz}
                                    disabled={isLoadingIndex || selectionTotal === 0}
                                    className="btn btn-primary btn-lg quiz-picker__start"
                                >
                                    <PokeballIcon />
                                    {language === 'pt' ? `Começar · ${selectionTotal} Pokémon` : `Start · ${selectionTotal} Pokémon`}
                                </button>
                            </aside>
                        </div>
                    )}
                </section>
            ) : (
                <section className="generation-quiz__panel team-builder-panel generation-quiz__grid-panel">
                    <div className="generation-quiz__panel-header">
                        <div className="generation-quiz__panel-title-group">
                            <h2 className="team-builder-panel__title team-builder-panel__title--compact">{language === 'pt' ? 'Lista de Pokémon' : 'Pokémon Roster'}</h2>
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
                        {historyButton}
                    </div>

                    <div className="generation-quiz-divider mt-2 mb-1" />

                    <div className="generation-quiz__layout-container">
                        {/* Console occupies the top-left cells; cards flow beside and below it */}
                        <div
                            ref={consoleCellRef}
                            className="generation-quiz__console-cell"
                            role="presentation"
                            style={{ '--console-width': consoleWidth ? `${consoleWidth}px` : 'auto' }}
                        >
                            <section className="team-builder-panel generation-quiz__console">
                                <div className="generation-quiz__console-main">
                                    <div className="generation-quiz__last-find" key={lastFind ? lastFind.id : 'empty'}>
                                        <div className="generation-quiz__last-find-media" title={lastFind ? lastFind.displayName : undefined}>
                                            {lastFind ? (
                                                <img src={lastFind.spriteUrl} alt={lastFind.displayName} className="image-pixelated" />
                                            ) : (
                                                <PokeballIcon />
                                            )}
                                        </div>
                                        <div className="generation-quiz__last-find-info">
                                            <span className="generation-quiz__last-find-eyebrow">{language === 'pt' ? 'Último acerto' : 'Last catch'}</span>
                                            <span className="generation-quiz__last-find-name">{lastFind ? lastFind.displayName : '???'}</span>
                                            <span className="generation-quiz__last-find-id">
                                                {lastFind ? `#${lastFind.id} · ${lastFind.generationLabel}` : (language === 'pt' ? 'Digite o primeiro nome!' : 'Type your first guess!')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="generation-quiz__console-input">
                                        <PokemonGenerationQuizAutocomplete
                                            value={answerInput}
                                            onChange={setAnswerInput}
                                            onKeyDown={handleInputKeyDown}
                                            suggestions={suggestions}
                                            activeIndex={activeSuggestionIndex}
                                            onSelectSuggestion={handleSelectSuggestion}
                                            disabled={!quizStarted || isComplete || Boolean(modeOver)}
                                            inputRef={inputRef}
                                            placeholder={language === 'pt' ? 'Digite para adivinhar…' : 'Type to guess…'}
                                            minCharacters={MIN_AUTOCOMPLETE_CHARACTERS}
                                        />
                                    </div>
                                </div>

                                <div className="generation-quiz__progress-bar" aria-hidden="true">
                                    <span className="generation-quiz__progress-fill" style={{ width: `${completionPercent}%` }} />
                                </div>

                                <div className="generation-quiz__console-status">
                                    <MascotCompanion beat={mascotBeat} rest="determinado" size="md" className="quiz-companion" />
                                    <p className={`generation-quiz__feedback generation-quiz__feedback--${feedback.tone}`}>
                                        {feedback.message}
                                    </p>
                                    {/* The run of right answers: it climbs with each one and a
                                        wrong guess clears it. Gold from five — a streak is earned. */}
                                    {combo >= 2 && (
                                        <span className={`quiz-combo ${combo >= 5 ? 'is-hot' : ''}`} key={combo} aria-label={language === 'pt' ? `${combo} acertos seguidos` : `${combo} in a row`}>
                                            ×{combo}
                                        </span>
                                    )}
                                    {runMode === 'sprint' && (
                                        <span className={`quiz-clock ${secondsLeft <= 10 ? 'is-low' : ''}`} role="timer" aria-label={language === 'pt' ? 'Tempo restante' : 'Time left'}>
                                            {formatClock(secondsLeft)}
                                        </span>
                                    )}
                                    <span className="generation-quiz__console-inline-metrics">
                                        {foundCount}/{totalCount} · {accuracyPercent}%
                                    </span>
                                </div>

                                {modeOver && (
                                    <div className="quiz-over" role="status">
                                        <div>
                                            <strong>{modeOver.found}</strong>
                                            <span>
                                                {modeOver.reason === 'time'
                                                    ? (language === 'pt' ? 'nomes em 60 segundos' : 'names in 60 seconds')
                                                    : (language === 'pt' ? 'nomes sem errar' : 'names without a miss')}
                                                {activeRun && modeOver.found > 0 && modeOver.found >= activeRun.bestFound
                                                    ? (language === 'pt' ? ' · novo recorde' : ' · new best') : ''}
                                            </span>
                                        </div>
                                        <button type="button" className="btn btn-primary btn-sm" onClick={restartRun}>
                                            <RefreshIcon /> {language === 'pt' ? 'De novo' : 'Again'}
                                        </button>
                                    </div>
                                )}

                                <div className="generation-quiz__console-metrics">
                                    <div className="generation-quiz__console-stat">
                                        <strong>{foundCount}/{totalCount}</strong>
                                        <span>{language === 'pt' ? 'Encontrados' : 'Found'}</span>
                                    </div>
                                    <div className="generation-quiz__console-stat">
                                        <strong>{completionPercent}%</strong>
                                        <span>{language === 'pt' ? 'Completo' : 'Complete'}</span>
                                    </div>
                                    <div className="generation-quiz__console-stat">
                                        <strong>{accuracyPercent}%</strong>
                                        <span>{language === 'pt' ? 'Precisão' : 'Accuracy'}</span>
                                    </div>
                                </div>

                                {previousFinds.length > 0 && (
                                    <div className="generation-quiz__progress-recent">
                                        <span className="generation-quiz__recent-label">{language === 'pt' ? 'Recentes:' : 'Recent:'}</span>
                                        <div className="generation-quiz__recent-chips">
                                            {previousFinds.map((pokemon) => (
                                                <span key={pokemon.id} className="generation-quiz__recent-chip">
                                                    {pokemon.displayName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(manualHint || (consecutiveMisses >= 3 && currentTip)) && (
                                    <div className="generation-quiz__tip-banner">
                                        <SparklesIcon />
                                        <span className="generation-quiz__tip-text">{manualHint || currentTip}</span>
                                    </div>
                                )}

                                <div className="generation-quiz__console-actions">
                                    <button
                                        type="button"
                                        onClick={handleManualHint}
                                        disabled={availableHints <= 0 || isComplete}
                                        className="generation-quiz__compact-reset-btn generation-quiz__hint-btn"
                                        title={language === 'pt' ? 'Ganhe 1 dica a cada 10 acertos' : 'Earn 1 hint every 10 catches'}
                                    >
                                        <SparklesIcon /> {language === 'pt' ? 'Dica' : 'Hint'}
                                        <span className="generation-quiz__hint-count">{availableHints}</span>
                                    </button>
                                    <button type="button" onClick={restartRun} className="generation-quiz__compact-reset-btn">
                                        <RefreshIcon /> {t('games.restart')}
                                    </button>
                                    {foundCount > 0 && (
                                        <button type="button" onClick={shareDuel} className="generation-quiz__compact-reset-btn">
                                            <Swords aria-hidden="true" /> {t('quiz.duel.share')}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleExitQuizClick}
                                        className="generation-quiz__compact-reset-btn"
                                        title={t('games.changeGensTitle')}
                                    >
                                        {t('games.changeGens')}
                                    </button>
                                </div>
                            </section>
                        </div>

                        <div className="generation-quiz__grid" role="list" aria-label={language === 'pt' ? 'Grade de Pokémon do quiz' : 'Pokémon quiz grid'}>
                            <div className="generation-quiz__console-spacer" />
                            {visibleEntries.length === 0 ? (
                                <p className="team-builder-empty-note generation-quiz__grid-empty">{language === 'pt' ? 'Nenhum Pokémon neste filtro.' : 'No Pokémon in this filter.'}</p>
                            ) : (
                                visibleEntries.map((pokemon) => (
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
                                ))
                            )}
                        </div>
                    </div>
                </section>
            )}

            <div className="sr-only" aria-live="polite">{announcement}</div>

            {isCelebrationOpen && (
                <QuizCelebrationModal
                    isOpen={isCelebrationOpen}
                    onClose={closeCelebration}
                    // Same generations, from zero, at once — the old "Try
                    // another" dropped the user back on the setup screen.
                    onPlayAgain={() => {
                        if (!activeRun) return;
                        rerunRun(activeRun.id);
                        setAnswerInput('');
                        setGridFilter('all');
                        setFeedback({ tone: 'info', message: language === 'pt' ? `${totalCount} Pokémon prontos.` : `${totalCount} Pokémon ready.` });
                        window.setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    playAgainText={t('games.playAgain')}
                    pokemon={celebrationPokemon}
                    accuracy={accuracyPercent}
                    totalCount={totalCount}
                />
            )}

            {isHistoryOpen && (
                <GameHistoryDialog
                    title={t('games.quizHistory')}
                    onClose={() => setIsHistoryOpen(false)}
                    onScroll={handleHistoryScroll}
                >
                    {visibleRuns.length === 0 ? (
                        <div className="game-history__empty">
                            <HistoryIcon />
                            <p className="m-0">
                                {language === 'pt'
                                    ? 'Nenhuma partida gravada ainda. Escolha uma geração e comece a jogar!'
                                    : 'No quiz runs recorded yet. Pick a generation and start playing!'}
                            </p>
                        </div>
                    ) : (
                        <ul className="game-history__list">
                            {visibleRuns
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
                                        <li key={run.id} className="game-history__item game-history__item--wrap">
                                            <div className="game-history__main">
                                                <div className="game-history__heading">
                                                    <span className="game-history__title">{runGens}</span>
                                                    <span className={`game-history__badge ${isRunComplete ? 'is-complete' : 'is-progress'}`}>
                                                        {isRunComplete ? t('games.statusCompleted') : t('games.statusInProgress')}
                                                    </span>
                                                </div>
                                                <span className="game-history__meta">
                                                    {run.foundIds.length}/{run.totalCount} · {runAccuracy}%
                                                    {run.bestFound > 0 && ` · ${language === 'pt' ? 'Melhor' : 'Best'} ${run.bestFound}/${run.totalCount}`}
                                                </span>
                                            </div>
                                            <div className="game-history__actions">
                                                {!isRunComplete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedGenerationKeys(new Set(run.generationKeys));
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
                                                        setSelectedGenerationKeys(new Set(run.generationKeys));
                                                        rerunRun(run.id);
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