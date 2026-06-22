import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSessionGame } from '../../hooks/useSessionGame';
import { usePokePuzzleHistory } from '../../hooks/usePokePuzzleHistory';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useToastStore } from '../../store/useToastStore';
import { useThemeStore } from '../../store/useThemeStore';
import { loadPokemonIndex } from '../../services/pokemonDataCache';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { PokeballIcon, StarsIcon, SparklesIcon, RefreshIcon, CloseIcon } from '../icons';
import { Lock, PartyPopper, Frown, Sparkles, Award, FileText, Layers, Image, Delete, CornerDownLeft, Share2, Lightbulb } from 'lucide-react';
import QRCode from 'qrcode';
import { useAuthStore } from '../../store/useAuthStore';
import { db } from '../../services/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import '../../styles/pokepuzzle-view.css';
import { typeColors } from '../../constants/types';

// Constants
const MAX_ATTEMPTS = 8;
const ALLOWED_MAX_ID = 1025; // National Dex standard pool

// PokePuzzle progress is per-account. localStorage is global to the browser,
// so we namespace every key by userId — otherwise after signing out a fresh
// anonymous user would inherit the previous account's wins from localStorage.
// `anon` is a safe fallback before auth resolves (Firestore is the real store).
const ppKey = (userId, suffix) => `ptb:pokepuzzle:${userId || 'anon'}:${suffix}`;

// Keyboard rows QWERTY
const KEYBOARD_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace']
];

// Helper to normalize strings for game comparisons (only letters a-z)
const normalizeNameForGame = (name) => {
    if (!name) return '';
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z]/g, ""); // keep only letters
};

// Helper to determine Pokémon generation based on National Pokedex ID
const getGenerationByPokemonId = (id) => {
    if (!id) return 0;
    if (id <= 151) return 1;
    if (id <= 251) return 2;
    if (id <= 386) return 3;
    if (id <= 493) return 4;
    if (id <= 649) return 5;
    if (id <= 721) return 6;
    if (id <= 809) return 7;
    if (id <= 905) return 8; // Gen 8 (including Hisui)
    if (id <= 1025) return 9; // Gen 9
    return 9;
};

// Helper to format Pokémon name nicely for display
const formatPokemonDisplayName = (name = '') => {
    const overrides = {
        farfetchd: "Farfetch'd",
        sirfetchd: "Sirfetch'd",
        'mr-mime': 'Mr. Mime',
        'mime-jr': 'Mime Jr.',
        'mr-rime': 'Mr. Rime',
        'type-null': 'Type: Null',
        'porygon-z': 'Porygon-Z',
        'ho-oh': 'Ho-Oh',
        flabebe: 'Flabebe',
    };
    if (overrides[name]) return overrides[name];
    return name
        .split('-')
        .filter(Boolean)
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
};

// Seeded daily index selector with historical overrides
const getDailyPokemonIndex = (dateString, allowedPool) => {
    if (!allowedPool || allowedPool.length === 0) return 0;

    // Explicit absolute overrides for past daily puzzles
    const overrides = {
        '2026-6-18': 'golurk',
        '2026-06-18': 'golurk',
        '2026-6-17': 'pawniard',
        '2026-06-17': 'pawniard',
        '2026-6-16': 'bisharp',
        '2026-06-16': 'bisharp'
    };

    const targetName = overrides[dateString];
    if (targetName) {
        const idx = allowedPool.findIndex(p => p.name.toLowerCase() === targetName);
        if (idx !== -1) return idx;
    }

    // Default to hashing algorithm
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % allowedPool.length;
};

// Helper to get today's date string in YYYY-MM-DD format
const getTodayDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
};

// The day PokéPuzzle went live. Daily history lists every day from here up to
// yesterday — there are no playable puzzles before this date. (Month is
// 0-indexed: 5 = June.)
const PUZZLE_LAUNCH_DATE = new Date(2026, 5, 16);

// All past daily-puzzle dates, newest first, from yesterday back to launch.
const getPastDates = () => {
    const dates = [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 1); // start at yesterday (today is the live puzzle)
    while (d >= PUZZLE_LAUNCH_DATE) {
        dates.push(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
        d.setDate(d.getDate() - 1);
    }
    return dates;
};

// Wordle duplicate letter checking algorithm
const checkLetters = (guess, target) => {
    const result = Array(guess.length).fill('absent');
    const targetLetterCounts = {};

    // Find exact matches (Green) first
    for (let i = 0; i < guess.length; i++) {
        const gl = guess[i];
        const tl = target[i];
        if (gl === tl) {
            result[i] = 'correct';
        } else {
            targetLetterCounts[tl] = (targetLetterCounts[tl] || 0) + 1;
        }
    }

    // Find matching letters in incorrect spots (Yellow)
    for (let i = 0; i < guess.length; i++) {
        if (result[i] === 'correct') continue;
        const gl = guess[i];
        if (targetLetterCounts[gl] > 0) {
            result[i] = 'present';
            targetLetterCounts[gl]--;
        }
    }

    return result;
};

// A "session" is one playable game, identified by a sessionKey:
//   - `daily:YYYY-M-D`  (today or any archived date)
//   - `ongoing`         (the free-play game)
// The full session lifecycle (load/save/details) lives in useSessionGame.
const dailyKey = (dateString) => `daily:${dateString}`;
const ONGOING_KEY = 'ongoing';

const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1em', height: '1em' }}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

export default function PokePuzzleView() {
    const { t, language } = useTranslation();
    const showToast = useToastStore(state => state.showToast);
    const { colors } = useThemeStore();
    const navigate = useNavigate();
    const { userId, pokePuzzleMigrationTick, bumpPokePuzzleStreak } = useAuthStore();

    const [selectedDate, setSelectedDate] = useState(() => getTodayDateString());
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [visibleHistoryLimit, setVisibleHistoryLimit] = useState(5);
    const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);
    // Bumped to force the anonymous (localStorage) history fallback to re-read,
    // e.g. after a local delete. Logged-in users update via the Firestore listener.
    const [historyRefresh, setHistoryRefresh] = useState(0);

    // Mode: 'daily' or 'ongoing'. selectedDate + mode describe WHAT the user
    // wants to view; sessionKey is the single derived identity of that game.
    const [mode, setMode] = useState('daily');
    const sessionKey = mode === 'daily' ? dailyKey(selectedDate) : ONGOING_KEY;

    // Game data pools
    const [pokemonIndex, setPokemonIndex] = useState([]);
    const [allowedPool, setAllowedPool] = useState([]); // Filtered to standard pokemon (IDs 1-1025)
    const [isLoadingIndex, setIsLoadingIndex] = useState(true);

    // ── The entire game lifecycle (load / save / details) lives in this hook.
    //    Loading is an explicit command (loadSession) — no derived-key effect
    //    chain, so load and save can never fight over the same target.
    const {
        session,
        loadSession,
        startRandomOngoing,
        addGuess,
        setStatus,
        unlockTip,
    } = useSessionGame({ userId, allowedPool, language, getDailyIndex: getDailyPokemonIndex });

    // Aliases so the render tree below reads naturally.
    const { target: targetPokemon, guesses, gameStatus, unlockedTips } = session;
    const targetDetails = session.details || { types: [], description: '', image: '', id: 0 };
    const isLoadingDetails = session.detailsLoading;

    // Past daily dates available in the History drawer.
    const pastDates = useMemo(() => getPastDates(), []);

    // Reactive, per-account daily history. Logged in → live Firestore listener
    // (syncs across devices); anonymous → localStorage. `revision` re-reads the
    // local fallback after each save (session) / migration.
    const historyByDate = usePokePuzzleHistory({
        userId,
        dates: pastDates,
        revision: `${session.guesses.length}:${session.gameStatus}:${pokePuzzleMigrationTick}:${historyRefresh}`,
    });

    // Active tip tab: 'description', 'types', 'silhouette'
    const [activeTipTab, setActiveTipTab] = useState('description');

    // Input autocomplete suggestions
    const [inputValue, setInputValue] = useState('');
    const [selectedCharIdx, setSelectedCharIdx] = useState(0);
    const currentGuessLetters = useMemo(() => inputValue.split(''), [inputValue]);
    const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);
    const autocompleteContainerRef = useRef(null);
    const inputRef = useRef(null);

    // Sync text input selection cursor with selectedCharIdx
    useEffect(() => {
        if (inputRef.current && document.activeElement === inputRef.current) {
            inputRef.current.setSelectionRange(selectedCharIdx, selectedCharIdx + 1);
        }
    }, [selectedCharIdx, inputValue]);

    // Countdown state for next daily
    const [nextDailyCountdown, setNextDailyCountdown] = useState('');
    const [loadedDailyDate, setLoadedDailyDate] = useState('');

    // One-time sweep of legacy un-namespaced keys (pre per-account scoping).
    // They're never read anymore; removing them prevents stale cross-account
    // data from lingering in the browser.
    useEffect(() => {
        ['ptb:pokepuzzle:ongoing', 'ptb:pokepuzzle:daily:summary'].forEach(k => {
            try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
        });
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                // Legacy daily keys: "ptb:pokepuzzle:daily:<date>" (no userId segment).
                if (k && /^ptb:pokepuzzle:daily:/.test(k)) localStorage.removeItem(k);
            }
        } catch (e) { /* ignore */ }
    }, []);

    // Fetch Pokémon Index on Mount
    useEffect(() => {
        const fetchIndex = async () => {
            setIsLoadingIndex(true);
            try {
                const index = await loadPokemonIndex();
                setPokemonIndex(index);
                // Pool of standard Pokémon up to ID 1025
                const filtered = index.filter(p => p.id <= ALLOWED_MAX_ID);
                setAllowedPool(filtered);
            } catch (err) {
                console.error("Failed to load PokePuzzle Pokémon list:", err);
                showToast("Failed to load Pokémon list", "error");
            } finally {
                setIsLoadingIndex(false);
            }
        };
        fetchIndex();
    }, [showToast]);

    // ── LOAD TRIGGER ──────────────────────────────────────────────────────
    //  The ONLY place that kicks off a load. Whenever the user's intent
    //  (sessionKey), the data pool, the account, or a post-login migration
    //  changes, ask the hook to load that key. The hook handles staleness,
    //  saving, and details internally, so this is a one-line command — there
    //  is no save logic here to race against.
    useEffect(() => {
        if (allowedPool.length === 0) return;
        loadSession(sessionKey);
    }, [sessionKey, allowedPool, userId, pokePuzzleMigrationTick, loadSession]);

    // Reset the input cursor whenever a new target is loaded.
    useEffect(() => {
        if (!targetPokemon) return;
        setInputValue(' '.repeat(normalizeNameForGame(targetPokemon.name).length));
        setSelectedCharIdx(0);
    }, [targetPokemon]);

    // Track today's loaded date for the midnight-rollover check.
    useEffect(() => {
        if (mode === 'daily' && selectedDate === getTodayDateString()) {
            setLoadedDailyDate(selectedDate);
        } else {
            setLoadedDailyDate('');
        }
    }, [mode, selectedDate]);

    // Auto-select unlocked tip tab
    useEffect(() => {
        if (guesses.length >= 7) {
            setActiveTipTab('silhouette');
        } else if (guesses.length >= 5) {
            setActiveTipTab('types');
        } else if (guesses.length >= 3) {
            setActiveTipTab('description');
        } else {
            setActiveTipTab('description');
        }
    }, [guesses.length]);

    // Ongoing mode "Play Again": pick a new random Pokémon and start clean.
    const startRandomOngoingGame = useCallback(() => {
        startRandomOngoing();
    }, [startRandomOngoing]);

    // Trigger local push notification when Daily challenge resets
    const triggerResetNotification = useCallback(() => {
        if (typeof window === 'undefined' || !("Notification" in window)) return;

        const showNotif = () => {
            const title = t('pokepuzzle.notificationTitle');
            const body = t('pokepuzzle.notificationBody');

            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, {
                        body: body,
                        icon: '/pwa-192x192.png',
                        vibrate: [200, 100, 200],
                        tag: 'pokepuzzle-daily-reset'
                    });
                });
            } else {
                new Notification(title, {
                    body: body,
                    icon: '/pwa-192x192.png'
                });
            }
        };

        if (Notification.permission === "granted") {
            showNotif();
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    showNotif();
                }
            });
        }
    }, [t]);

    // Handle Daily challenge transition when the day rolls over at midnight.
    // Just point selectedDate at the new day — the load effect reloads the
    // session atomically (Firestore → localStorage → fresh), no manual poking.
    const handleDailyReset = useCallback(() => {
        if (allowedPool.length === 0) return;
        const now = new Date();
        const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        setSelectedDate(dateString); // triggers the load effect
        triggerResetNotification();
    }, [allowedPool, triggerResetNotification]);

    // Request notification permission on mount for daily mode
    useEffect(() => {
        if (mode === 'daily' && typeof window !== 'undefined' && "Notification" in window) {
            if (Notification.permission === "default") {
                // Politeness delay
                const permTimer = setTimeout(() => {
                    Notification.requestPermission();
                }, 3000);
                return () => clearTimeout(permTimer);
            }
        }
    }, [mode]);

    // Daily countdown updater
    useEffect(() => {
        if (mode !== 'daily') return;

        const updateCountdown = () => {
            const now = new Date();
            const currentDailyDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

            // Only the live "today" puzzle can roll over. If the user is viewing
            // an archived date, never auto-reset — let them play it freely.
            if (selectedDate !== getTodayDateString()) return;

            // Day rolled over while viewing today's puzzle → load the new day.
            if (loadedDailyDate && currentDailyDate !== loadedDailyDate) {
                handleDailyReset();
                return;
            }

            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const diffMs = tomorrow - now;

            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

            setNextDailyCountdown(
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            );
        };

        updateCountdown();
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [mode, loadedDailyDate, handleDailyReset, selectedDate]);

    // How many past daily puzzles the account has touched (badge count).
    const playedHistoryCount = useMemo(() => {
        let count = 0;
        pastDates.forEach(dateStr => {
            const entry = historyByDate.get(dateStr);
            if (entry?.guesses?.length > 0) count++;
        });
        return count;
    }, [pastDates, historyByDate]);

    // Delete history run progress
    const deleteHistoryRun = async (dateStr) => {
        if (window.confirm(language === 'pt' ? `Tem certeza que quer deletar o progresso do dia ${dateStr}?` : `Are you sure you want to delete the progress for ${dateStr}?`)) {
            localStorage.removeItem(ppKey(userId, `daily:${dateStr}`));
            if (db && userId) {
                try {
                    const docRef = doc(db, `artifacts/pokemonTeamBuilder/users/${userId}/pokepuzzle`, `daily_${dateStr}`);
                    await deleteDoc(docRef);
                } catch (e) {
                    console.error("Failed to delete from Firestore:", e);
                }
            }
            // Logged-in users update via the Firestore listener; nudge the
            // anonymous localStorage fallback to re-read.
            setHistoryRefresh(n => n + 1);
            // If we just deleted the session we're currently viewing, reload it
            // cleanly (it'll fall back to a fresh game).
            if (selectedDate === dateStr && mode === 'daily') {
                loadSession(dailyKey(dateStr));
            }
            showToast(language === 'pt' ? 'Progresso deletado!' : 'Progress deleted!', 'success');
        }
    };

    const handleHistoryScroll = useCallback((e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop - clientHeight < 20) {
            if (!isHistoryLoadingMore && visibleHistoryLimit < pastDates.length) {
                setIsHistoryLoadingMore(true);
                setTimeout(() => {
                    setVisibleHistoryLimit((prev) => Math.min(prev + 5, pastDates.length));
                    setIsHistoryLoadingMore(false);
                }, 400);
            }
        }
    }, [isHistoryLoadingMore, visibleHistoryLimit, pastDates.length]);

    useEffect(() => {
        if (!isHistoryOpen) {
            setVisibleHistoryLimit(5);
        }
    }, [isHistoryOpen]);

    // Target name normalized & its length
    const targetNormalized = useMemo(() => {
        if (!targetPokemon) return '';
        return normalizeNameForGame(targetPokemon.name);
    }, [targetPokemon]);

    const targetLength = targetNormalized.length;

    // Suggestions matching character-by-character against non-empty slots in inputValue
    const suggestions = useMemo(() => {
        if (!targetPokemon || allowedPool.length === 0) return [];
        const chars = inputValue.split('');
        const filledCount = chars.filter(c => c !== ' ').length;

        // Do not show autocomplete unless at least 80% of the name is typed
        if (filledCount < targetLength * 0.5) {
            return [];
        }

        return allowedPool
            .map(p => ({
                ...p,
                normalized: normalizeNameForGame(p.name),
                displayName: formatPokemonDisplayName(p.name)
            }))
            .filter(p => {
                // Must be of same normalized length
                if (p.normalized.length !== targetLength) return false;

                // Compare character-by-character
                for (let i = 0; i < targetLength; i++) {
                    const typedChar = chars[i];
                    if (typedChar !== ' ' && p.normalized[i] !== typedChar) {
                        return false;
                    }
                }
                return true;
            })
            .slice(0, 10);
    }, [allowedPool, targetPokemon, inputValue, targetLength]);

    // Handle suggestion keyboard index reset
    useEffect(() => {
        setActiveSuggestionIdx(0);
    }, [inputValue]);

    // Virtual Keyboard status analyzer (Correct > Present > Absent)
    const keyboardStatusMap = useMemo(() => {
        const statuses = {};
        if (!targetNormalized) return statuses;

        guesses.forEach(guess => {
            const guessNorm = normalizeNameForGame(guess);
            for (let i = 0; i < guessNorm.length; i++) {
                const letter = guessNorm[i];
                const targetLetter = targetNormalized[i];

                if (letter === targetLetter) {
                    statuses[letter] = 'correct';
                } else if (targetNormalized.includes(letter)) {
                    // Only upgrade to present if not already correct
                    if (statuses[letter] !== 'correct') {
                        statuses[letter] = 'present';
                    }
                } else {
                    if (statuses[letter] !== 'correct' && statuses[letter] !== 'present') {
                        statuses[letter] = 'absent';
                    }
                }
            }
        });
        return statuses;
    }, [guesses, targetNormalized]);

    // Virtual keyboard key click handler
    const handleKeyClick = useCallback((key) => {
        if (gameStatus !== 'IN_PROGRESS') return;

        if (key === 'backspace') {
            setInputValue(prev => {
                const chars = prev.split('');
                if (chars[selectedCharIdx] !== ' ') {
                    chars[selectedCharIdx] = ' ';
                    return chars.join('');
                } else {
                    const prevIdx = Math.max(0, selectedCharIdx - 1);
                    chars[prevIdx] = ' ';
                    setSelectedCharIdx(prevIdx);
                    return chars.join('');
                }
            });
        } else if (key === 'enter') {
            submitCurrentGuess();
        } else {
            // Type a letter
            const char = key.toLowerCase();
            setInputValue(prev => {
                const chars = prev.split('');
                chars[selectedCharIdx] = char;
                return chars.join('');
            });
            setSelectedCharIdx(prev => Math.min(targetLength - 1, prev + 1));
        }
    }, [targetLength, gameStatus, selectedCharIdx]);

    // A guess on TODAY's daily counts as "played today" → advance the trainer
    // streak (idempotent per day; only the daily mode for the live date counts).
    const registerDailyPlay = useCallback(() => {
        if (mode === 'daily' && selectedDate === getTodayDateString()) {
            bumpPokePuzzleStreak();
        }
    }, [mode, selectedDate, bumpPokePuzzleStreak]);

    // Submission check & processing
    const submitCurrentGuess = () => {
        if (gameStatus !== 'IN_PROGRESS') return;

        const guessStr = inputValue.replace(/\s/g, '');
        if (guessStr.length !== targetLength) {
            showToast(t('pokepuzzle.guessNotValidLength', { length: targetLength }), 'warning');
            return;
        }

        // Find the matched Pokémon in our allowed pool
        const matched = allowedPool.find(p => {
            const norm = normalizeNameForGame(p.name);
            return norm === guessStr;
        });

        if (!matched) {
            showToast(t('pokepuzzle.guessNotValidPokemon'), 'warning');
            return;
        }

        addGuess(matched.name);
        registerDailyPlay();
        const nextCount = guesses.length + 1;
        setInputValue(' '.repeat(targetLength));
        setSelectedCharIdx(0);

        // Check Win
        if (guessStr === targetNormalized) {
            setStatus('WON');
            showToast(t('pokepuzzle.winTitle'), 'success');
            return;
        }

        // Check Lose
        if (nextCount >= MAX_ATTEMPTS) {
            setStatus('LOST');
            showToast(t('pokepuzzle.loseTitle'), 'error');
        }
    };

    // Auto-scroll inside suggestion dropdown to keep selection visible
    useEffect(() => {
        if (autocompleteContainerRef.current) {
            const activeEl = autocompleteContainerRef.current.querySelector('.is-active');
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [activeSuggestionIdx]);

    // Handle physical hardware keyboard events
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameStatus !== 'IN_PROGRESS') return;

            const key = e.key;
            const lowerKey = key.toLowerCase();

            // Navigation
            if (key === 'ArrowLeft') {
                e.preventDefault();
                setSelectedCharIdx(prev => Math.max(0, prev - 1));
                return;
            }
            if (key === 'ArrowRight') {
                e.preventDefault();
                setSelectedCharIdx(prev => Math.min(targetLength - 1, prev + 1));
                return;
            }

            // Typing letters
            if (/^[a-zA-Z]$/.test(key)) {
                e.preventDefault();
                const char = lowerKey;
                setInputValue(prev => {
                    const chars = prev.split('');
                    chars[selectedCharIdx] = char;
                    return chars.join('');
                });
                setSelectedCharIdx(prev => Math.min(targetLength - 1, prev + 1));
                return;
            }

            if (key === 'Backspace') {
                e.preventDefault();
                setInputValue(prev => {
                    const chars = prev.split('');
                    if (chars[selectedCharIdx] !== ' ') {
                        chars[selectedCharIdx] = ' ';
                        return chars.join('');
                    } else {
                        const prevIdx = Math.max(0, selectedCharIdx - 1);
                        chars[prevIdx] = ' ';
                        setSelectedCharIdx(prevIdx);
                        return chars.join('');
                    }
                });
                return;
            }

            if (key === 'Enter') {
                e.preventDefault();
                // If autocomplete list is active, pick active suggestion
                if (suggestions.length > 0) {
                    const selected = suggestions[activeSuggestionIdx];
                    if (selected) {
                        handleSelectSuggestion(selected);
                    }
                } else {
                    submitCurrentGuess();
                }
                return;
            }

            // Arrow keys for autocomplete suggestions navigation
            if (key === 'ArrowDown' && suggestions.length > 0) {
                e.preventDefault();
                setActiveSuggestionIdx(prev => (prev + 1) % suggestions.length);
            }
            if (key === 'ArrowUp' && suggestions.length > 0) {
                e.preventDefault();
                setActiveSuggestionIdx(prev => (prev - 1 + suggestions.length) % suggestions.length);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [inputValue, targetLength, gameStatus, suggestions, activeSuggestionIdx, guesses, targetNormalized, allowedPool, showToast, t, selectedCharIdx]);

    // Click suggestion callback
    const handleSelectSuggestion = (pokemon) => {
        if (gameStatus !== 'IN_PROGRESS') return;
        const norm = normalizeNameForGame(pokemon.name);

        addGuess(pokemon.name);
        registerDailyPlay();
        const nextCount = guesses.length + 1;
        setInputValue(' '.repeat(targetLength));
        setSelectedCharIdx(0);

        if (norm === targetNormalized) {
            setStatus('WON');
            showToast(t('pokepuzzle.winTitle'), 'success');
        } else if (nextCount >= MAX_ATTEMPTS) {
            setStatus('LOST');
            showToast(t('pokepuzzle.loseTitle'), 'error');
        }
    };

    // Calculate dynamic rows on PokePuzzle grid
    const gridRows = useMemo(() => {
        const rows = [];
        // Add already submitted guesses
        guesses.forEach(guess => {
            const norm = normalizeNameForGame(guess);
            const letterStatuses = checkLetters(norm, targetNormalized);
            rows.push({
                letters: norm.split(''),
                statuses: letterStatuses,
                submitted: true
            });
        });

        // Add active typing row if in progress
        if (gameStatus === 'IN_PROGRESS' && rows.length < MAX_ATTEMPTS) {
            const activeRowLetters = currentGuessLetters.map(l => l === ' ' ? '' : l);
            // Fill remaining blanks
            while (activeRowLetters.length < targetLength) {
                activeRowLetters.push('');
            }
            rows.push({
                letters: activeRowLetters,
                statuses: Array(targetLength).fill('empty'),
                submitted: false
            });
        }

        return rows;
    }, [guesses, currentGuessLetters, targetLength, targetNormalized, gameStatus]);


    // Progressive tip unlock status flags
    const showPokedexEntry = guesses.length >= 3 || gameStatus !== 'IN_PROGRESS' || unlockedTips.description;
    const showTypes = guesses.length >= 5 || gameStatus !== 'IN_PROGRESS' || unlockedTips.types;
    const showSilhouette = guesses.length >= 7 || gameStatus !== 'IN_PROGRESS' || unlockedTips.silhouette;


    const host = typeof window !== 'undefined' ? window.location.host : 'poketeambuilder.com';
    const primaryType = targetDetails.types?.[0] || 'normal';
    const typeColor = typeColors[primaryType] || '#71717a';
    const typeGlowColor = `${typeColor}40`; // 25% opacity for hex glow

    const generateShareText = () => {
        const modeTitle = mode === 'daily'
            ? `${language === 'pt' ? 'PokePuzzle Diário' : 'Daily PokePuzzle'}`
            : `${language === 'pt' ? 'PokePuzzle Livre' : 'Ongoing PokePuzzle'}`;

        const emojiGrid = guesses.map(guess => {
            const norm = normalizeNameForGame(guess);
            const letterStatuses = checkLetters(norm, targetNormalized);
            return letterStatuses.map(status => {
                if (status === 'correct') return '🟩';
                if (status === 'present') return '🟨';
                return '⬛';
            }).join('');
        }).join('\n');

        const shareUrl = typeof window !== 'undefined' ? window.location.origin + '/pokepuzzle' : 'https://poketeambuilder.com/pokepuzzle';

        return `PokePuzzle - ${modeTitle} ${guesses.length}/${MAX_ATTEMPTS}\n\n${emojiGrid}\n\nPlay here: ${shareUrl}`;
    };

    const handleShare = () => {
        const text = generateShareText();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    showToast(language === 'pt' ? 'Resultados copiados!' : 'Results copied!', 'success');
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    showToast(language === 'pt' ? 'Erro ao copiar resultados' : 'Failed to copy results', 'error');
                });
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showToast(language === 'pt' ? 'Resultados copiados!' : 'Results copied!', 'success');
            } catch (err) {
                showToast(language === 'pt' ? 'Erro ao copiar resultados' : 'Failed to copy results', 'error');
            }
            document.body.removeChild(textArea);
        }
    };

    const handleShareImage = async () => {
        showToast(language === 'pt' ? 'Gerando imagem...' : 'Generating image...', 'info');

        try {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 640;
            const ctx = canvas.getContext('2d');

            // 1. Background (sleek deep purple)
            ctx.fillStyle = '#0f0b21'; // Deep midnight purple
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw a subtle radial glow in the center matching target type
            const grad = ctx.createRadialGradient(200, 240, 20, 200, 240, 250);
            grad.addColorStop(0, '#7c3aed40'); // violet-600 with 25% opacity
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw purple border
            ctx.strokeStyle = '#7c3aed';
            ctx.lineWidth = 4;
            ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

            // 2. Title Header
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('POKÉPUZZLE', 200, 50);

            ctx.fillStyle = '#c084fc'; // Light purple subtitle
            ctx.font = '14px sans-serif';
            const modeText = mode === 'daily'
                ? (language === 'pt' ? 'Desafio Diário' : 'Daily Challenge')
                : (language === 'pt' ? 'Modo Livre' : 'Ongoing Mode');
            ctx.fillText(`${modeText} • ${guesses.length}/${MAX_ATTEMPTS} ${language === 'pt' ? 'tentativas' : 'tries'}`, 200, 75);

            // Load brand logo (Gengar) instead of target Pokémon artwork to not reveal it
            const getRuntimeBaseURL = () => {
                const path = window.location.pathname;
                if (path.includes('/pokemonTeamBuilder')) {
                    return '/pokemonTeamBuilder/';
                }
                return '/';
            };

            const logoUrl = `${window.location.origin}${getRuntimeBaseURL()}LogoCuteGengarRounded.png`.replace(/([^:]\/)\/+/g, "$1");
            const loadImg = (url) => new Promise((resolve, reject) => {
                if (!url) return reject(new Error('URL is empty'));
                const img = new Image();
                // Only enable CORS for external cross-origin URLs
                const isExternal = url.startsWith('http') && !url.startsWith(window.location.origin);
                if (isExternal) {
                    img.crossOrigin = 'anonymous';
                }
                img.onload = () => resolve(img);
                img.onerror = (e) => reject(new Error('Failed to load image: ' + url));
                img.src = url;
            });

            let logoImg;
            const logoDomImg = document.querySelector('img[src*="LogoCuteGengar"]');
            if (logoDomImg && logoDomImg.complete && logoDomImg.naturalWidth > 0) {
                logoImg = logoDomImg;
            } else {
                try {
                    logoImg = await loadImg(logoUrl);
                } catch (err) {
                    console.error("Could not load logo for canvas share", err);
                }
            }

            if (logoImg) {
                // Draw a nice container box background for logo (sleek indigo/purple theme)
                ctx.fillStyle = '#1e1b4b'; // Deep indigo/purple
                ctx.beginPath();
                ctx.roundRect(125, 100, 150, 150, 20);
                ctx.fill();
                ctx.strokeStyle = '#4c1d95'; // Dark violet border
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw logo
                ctx.drawImage(logoImg, 135, 110, 130, 130);
            }

            // 3. Riddle Title (Who's That Pokémon?)
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(language === 'pt' ? 'Quem é esse Pokémon?' : "Who's That Pokémon?", 200, 290);

            // Result Message
            ctx.fillStyle = '#c084fc';
            ctx.font = '14px sans-serif';
            const msg = gameStatus === 'WON'
                ? (language === 'pt' ? `Acertou em ${guesses.length} tentativas!` : `Guessed correctly in ${guesses.length} attempts!`)
                : (language === 'pt' ? `Não foi dessa vez!` : `Could not solve this time!`);
            ctx.fillText(msg, 200, 320);

            // 4. Attempts Grid
            const squareSize = 16;
            const gap = 5;
            const rowWidth = targetLength * squareSize + (targetLength - 1) * gap;
            const startX = (canvas.width - rowWidth) / 2;
            let startY = 350;

            guesses.forEach((guess) => {
                const norm = normalizeNameForGame(guess);
                const letterStatuses = checkLetters(norm, targetNormalized);
                letterStatuses.forEach((status, colIdx) => {
                    const x = startX + colIdx * (squareSize + gap);
                    if (status === 'correct') {
                        ctx.fillStyle = '#10b981';
                    } else if (status === 'present') {
                        ctx.fillStyle = '#f59e0b';
                    } else {
                        ctx.fillStyle = '#3b3954'; // Sleek dark purple/gray
                    }

                    ctx.beginPath();
                    ctx.roundRect(x, startY, squareSize, squareSize, 3);
                    ctx.fill();
                });
                startY += squareSize + gap;
            });

            // 5. QR Code and Link footer
            const footerY = 520;
            ctx.strokeStyle = '#3b3954';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(30, footerY);
            ctx.lineTo(370, footerY);
            ctx.stroke();

            const qrTarget = `${window.location.origin}${getRuntimeBaseURL()}pokepuzzle`.replace(/([^:]\/)\/+/g, "$1");
            let qrCanvas;
            try {
                qrCanvas = await QRCode.toCanvas(qrTarget, {
                    margin: 1,
                    width: 70,
                    color: { dark: '#000000', light: '#ffffff' }
                });
            } catch (err) {
                console.error("Failed to generate QR code for canvas", err);
            }

            if (qrCanvas) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.roundRect(50, footerY + 15, 80, 80, 8);
                ctx.fill();
                ctx.drawImage(qrCanvas, 55, footerY + 20, 70, 70);
            }

            ctx.textAlign = 'left';
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(language === 'pt' ? 'ESCANEIE PARA JOGAR' : 'SCAN TO PLAY', 150, footerY + 45);

            ctx.fillStyle = '#a78bfa';
            ctx.font = 'bold 14px sans-serif';
            const displayUrl = (host + getRuntimeBaseURL() + 'pokepuzzle').replace(/\/{2,}/g, '/');
            ctx.fillText(displayUrl, 150, footerY + 65);

            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error('Canvas toBlob failed');
                const file = new File([blob], 'pokepuzzle-result.png', { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'PokePuzzle Results',
                            text: language === 'pt' ? 'Confira meu resultado no PokePuzzle!' : 'Check out my PokePuzzle result!',
                        });
                        showToast(language === 'pt' ? 'Compartilhado com sucesso!' : 'Shared successfully!', 'success');
                        return;
                    } catch (shareErr) {
                        if (shareErr.name === 'AbortError') return;
                        console.error('Error sharing image, falling back to download', shareErr);
                    }
                }

                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `pokepuzzle-result-${guesses.length}.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast(language === 'pt' ? 'Imagem baixada!' : 'Image downloaded!', 'success');
            }, 'image/png');

        } catch (err) {
            console.error("Failed to generate and share results image:", err);
            showToast(language === 'pt' ? 'Erro ao gerar imagem de compartilhamento' : 'Failed to generate share image', 'error');
        }
    };

    return (
        <>
            <main className={`pokepuzzle-view ${gameStatus !== 'IN_PROGRESS' ? 'has-ended' : ''} ${selectedDate !== getTodayDateString() ? 'is-archive-mode' : ''}`}>
            {/* Header Area with Tabs and History button */}
            <div className="pokepuzzle-header-row">
                <div className="pokepuzzle-tabs">
                    <button
                        onClick={() => setMode('daily')}
                        className={`pokepuzzle-tab-btn ${mode === 'daily' ? 'is-active' : ''}`}
                    >
                        {t('pokepuzzle.dailyTab')}
                    </button>
                    <button
                        onClick={() => setMode('ongoing')}
                        className={`pokepuzzle-tab-btn ${mode === 'ongoing' ? 'is-active' : ''}`}
                    >
                        {t('pokepuzzle.ongoingTab')}
                    </button>
                </div>

                {mode === 'daily' && (
                    <button
                        type="button"
                        onClick={() => setIsHistoryOpen(true)}
                        className="pokepuzzle-history-toggle"
                        title={language === 'pt' ? 'Ver Histórico de Puzzles' : 'View Puzzle History'}
                    >
                        <HistoryIcon />
                        <span className="pokepuzzle-history-toggle-label">{language === 'pt' ? 'Histórico' : 'History'}</span>
                        {playedHistoryCount > 0 && (
                            <span className="pokepuzzle-history-toggle-badge">
                                {playedHistoryCount}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* Previous Puzzle Indicator Banner */}
            {mode === 'daily' && selectedDate !== getTodayDateString() && (
                <div className="pokepuzzle-history-active-banner animate-fade-in">
                    <HistoryIcon />
                    <div className="flex-1">
                        {language === 'pt' ? (
                            <span>Você está jogando o PokéPuzzle de <strong>{selectedDate}</strong> (Histórico)</span>
                        ) : (
                            <span>You are playing the PokéPuzzle from <strong>{selectedDate}</strong> (History)</span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedDate(getTodayDateString())}
                        className="pokepuzzle-history-exit-btn"
                        title={language === 'pt' ? 'Voltar para o desafio de hoje' : 'Return to today\'s challenge'}
                    >
                        {language === 'pt' ? 'Voltar para Hoje' : 'Exit to Today'}
                    </button>
                </div>
            )}

            {/* Header countdown timer for Daily challenge */}
            {mode === 'daily' && gameStatus !== 'IN_PROGRESS' && (
                <div className="pokepuzzle-header-countdown animate-fade-in">
                    <span className="pokepuzzle-header-countdown-label">
                        {language === 'pt' ? 'PRÓXIMO EM' : 'NEXT IN'}
                    </span>
                    <span className="pokepuzzle-header-countdown-time">{nextDailyCountdown}</span>
                </div>
            )}

            {/* Load State Indicator */}
            {isLoadingIndex && (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="team-builder-spinner" aria-hidden="true"></div>
                    <p className="text-xs text-muted mt-3">{t('common.loading')}</p>
                </div>
            )}

            {!isLoadingIndex && targetPokemon && (
                <div className={`pokepuzzle-game-container ${gameStatus !== 'IN_PROGRESS' ? 'has-ended' : ''}`}>
                    <div className="pokepuzzle-game-main">
                        {/* Tips / Clues Section */}
                        <section className="pokepuzzle-tips-container">
                            <div className="pokepuzzle-tips-header">
                                <h3 className="pokepuzzle-tips-title">
                                    <Lightbulb className="w-4 h-4 text-accent" />
                                    <span>{language === 'pt' ? 'Serviço de Dicas' : 'Tips Service'}</span>
                                </h3>
                                <div className="flex gap-2 items-center">
                                    <span className="text-[10px] uppercase font-bold text-accent bg-accent/10 border border-accent px-2 py-0.5 rounded">
                                        {language === 'pt' ? `Geração ${getGenerationByPokemonId(targetPokemon.id)}` : `Gen ${getGenerationByPokemonId(targetPokemon.id)}`}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-muted bg-surface-raised border border-border px-2 py-0.5 rounded">
                                        {guesses.length} / {MAX_ATTEMPTS} {language === 'pt' ? 'tentativas' : 'tries'}
                                    </span>
                                </div>
                            </div>
                            {/* Horizontal tabs for tips */}
                            <div className="pokepuzzle-tip-tabs">
                                <button
                                    type="button"
                                    onClick={() => setActiveTipTab('description')}
                                    className={`pokepuzzle-tip-tab-trigger ${activeTipTab === 'description' ? 'is-active' : ''} ${!showPokedexEntry ? 'is-locked' : ''}`}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>{language === 'pt' ? 'Descrição' : 'Description'}</span>
                                    {!showPokedexEntry && <Lock className="w-3 h-3 text-muted shrink-0" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTipTab('types')}
                                    className={`pokepuzzle-tip-tab-trigger ${activeTipTab === 'types' ? 'is-active' : ''} ${!showTypes ? 'is-locked' : ''}`}
                                >
                                    <Layers className="w-3.5 h-3.5" />
                                    <span>{language === 'pt' ? 'Tipos' : 'Types'}</span>
                                    {!showTypes && <Lock className="w-3 h-3 text-muted shrink-0" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTipTab('silhouette')}
                                    className={`pokepuzzle-tip-tab-trigger ${activeTipTab === 'silhouette' ? 'is-active' : ''} ${!showSilhouette ? 'is-locked' : ''}`}
                                >
                                    <Image className="w-3.5 h-3.5" />
                                    <span>{language === 'pt' ? 'Silhueta' : 'Silhouette'}</span>
                                    {!showSilhouette && <Lock className="w-3 h-3 text-muted shrink-0" />}
                                </button>
                            </div>

                            {/* Active tip card content */}
                            <div className="pokepuzzle-tip-card-wrapper w-full">
                                {activeTipTab === 'description' && (
                                    <div className={`pokepuzzle-tip-card ${!showPokedexEntry ? 'is-locked' : ''}`}>
                                        <span className="pokepuzzle-tip-label">{t('pokepuzzle.tipEntry')}</span>
                                        {showPokedexEntry ? (
                                            <div className="pokepuzzle-tip-content pokepuzzle-tip-description-text custom-scrollbar">
                                                {isLoadingDetails ? '...' : targetDetails.description || 'No description found.'}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                                                <span className="text-xs text-muted font-medium flex items-center gap-1.5 justify-center">
                                                    <Lock className="w-3.5 h-3.5" /> {t('pokepuzzle.tipLocked')}
                                                </span>
                                                <span className="text-[10px] text-muted opacity-75">
                                                    {language === 'pt' ? 'Desbloqueia na 3ª tentativa' : 'Unlocks at 3 attempts'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => unlockTip('description')}
                                                    className="pokepuzzle-unlock-btn"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                                    <span>{language === 'pt' ? 'Revelar Dica Cedo' : 'Reveal Tip Early'}</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTipTab === 'types' && (
                                    <div className={`pokepuzzle-tip-card ${!showTypes ? 'is-locked' : ''}`}>
                                        <span className="pokepuzzle-tip-label">{t('pokepuzzle.tipTypes')}</span>
                                        {showTypes ? (
                                            <div className="pokepuzzle-tip-content pokepuzzle-clue-types">
                                                {isLoadingDetails ? '...' : targetDetails.types.map(type => (
                                                    <span
                                                        key={type}
                                                        className="home-type-pill capitalize text-[10px] py-0.5 px-2.5 font-bold border rounded"
                                                        style={{
                                                            backgroundColor: `${typeColors[type]}18`,
                                                            borderColor: `${typeColors[type]}35`,
                                                            color: typeColors[type],
                                                        }}
                                                    >
                                                        {type}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                                                <span className="text-xs text-muted font-medium flex items-center gap-1.5 justify-center">
                                                    <Lock className="w-3.5 h-3.5" /> {t('pokepuzzle.tipLocked')}
                                                </span>
                                                <span className="text-[10px] text-muted opacity-75">
                                                    {language === 'pt' ? 'Desbloqueia na 5ª tentativa' : 'Unlocks at 5 attempts'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => unlockTip('types')}
                                                    className="pokepuzzle-unlock-btn"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                                    <span>{language === 'pt' ? 'Revelar Dica Cedo' : 'Reveal Tip Early'}</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTipTab === 'silhouette' && (
                                    <div className={`pokepuzzle-tip-card ${!showSilhouette ? 'is-locked' : ''}`}>
                                        <span className="pokepuzzle-tip-label">{t('pokepuzzle.tipSilhouette')}</span>
                                        {showSilhouette ? (
                                            <div className="pokepuzzle-tip-content flex justify-center">
                                                {isLoadingDetails ? '...' : (
                                                    <img
                                                        src={targetDetails.image || getPokemonArtworkSpriteUrl(targetDetails.id)}
                                                        alt="Silhouette tip"
                                                        className="w-12 h-12 object-contain pokepuzzle-silhouette animate-pulse"
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                                                <span className="text-xs text-muted font-medium flex items-center gap-1.5 justify-center">
                                                    <Lock className="w-3.5 h-3.5" /> {t('pokepuzzle.tipLocked')}
                                                </span>
                                                <span className="text-[10px] text-muted opacity-75">
                                                    {language === 'pt' ? 'Desbloqueia na 7ª tentativa' : 'Unlocks at 7 attempts'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => unlockTip('silhouette')}
                                                    className="pokepuzzle-unlock-btn"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                                    <span>{language === 'pt' ? 'Revelar Dica Cedo' : 'Reveal Tip Early'}</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Game Letter Board Grid */}
                        <section
                            className="pokepuzzle-grid"
                            style={{ '--length': targetLength }}
                            role="grid"
                            aria-label="Wordle guess board"
                        >
                            {gridRows.map((row, rowIdx) => (
                                <div
                                    key={rowIdx}
                                    className="pokepuzzle-row"
                                    style={{ gridTemplateColumns: `repeat(${targetLength}, minmax(0, 1fr))` }}
                                    role="row"
                                >
                                    {row.letters.map((letter, letterIdx) => {
                                        const status = row.statuses[letterIdx];
                                        const hasLtr = letter !== '' && letter !== ' ';
                                        const isSelected = !row.submitted && letterIdx === selectedCharIdx;

                                        return (
                                            <div
                                                key={letterIdx}
                                                className={`pokepuzzle-tile ${hasLtr ? 'has-letter' : ''} ${row.submitted && status === 'correct' ? 'is-correct' :
                                                    row.submitted && status === 'present' ? 'is-present' :
                                                        row.submitted && status === 'absent' ? 'is-absent' : ''
                                                    } ${isSelected ? 'is-selected-cell' : ''} ${!row.submitted ? 'is-active-row' : ''}`}
                                                role="gridcell"
                                                onClick={() => {
                                                    if (!row.submitted) {
                                                        setSelectedCharIdx(letterIdx);
                                                        inputRef.current?.focus();
                                                    }
                                                }}
                                            >
                                                {letter}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </section>

                        {/* Color Status Guide */}
                        {gameStatus === 'IN_PROGRESS' && (
                            <div className="pokepuzzle-guide-box">
                                <div className="pokepuzzle-guide-item">
                                    <span className="pokepuzzle-guide-dot correct" />
                                    <span>{t('pokepuzzle.letterCorrect')}</span>
                                </div>
                                <div className="pokepuzzle-guide-item">
                                    <span className="pokepuzzle-guide-dot present" />
                                    <span>{t('pokepuzzle.letterPresent')}</span>
                                </div>
                                <div className="pokepuzzle-guide-item">
                                    <span className="pokepuzzle-guide-dot absent" />
                                    <span>{t('pokepuzzle.letterAbsent')}</span>
                                </div>
                            </div>
                        )}

                        {/* Autocomplete Input Panel */}
                        {gameStatus === 'IN_PROGRESS' && (
                            <div className="pokepuzzle-input-container mt-4">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => {
                                        const val = e.target.value.toLowerCase();
                                        let clean = val.replace(/[^a-z ]/g, '');
                                        if (clean.length > targetLength) {
                                            clean = clean.slice(0, targetLength);
                                        } else {
                                            clean = clean.padEnd(targetLength, ' ');
                                        }
                                        setInputValue(clean);
                                        setSelectedCharIdx(prev => Math.min(targetLength - 1, prev + 1));
                                    }}
                                    onMouseDown={(e) => {
                                        // Focus the input, but prevent clicking from changing the text selection cursor position
                                        e.preventDefault();
                                        inputRef.current?.focus();
                                        inputRef.current?.setSelectionRange(selectedCharIdx, selectedCharIdx + 1);
                                    }}
                                    placeholder={t('pokepuzzle.guessPlaceholder')}
                                    className="input-clean"
                                    aria-label="Type Pokémon name"
                                />

                                {/* Dropdown list */}
                                {inputValue.trim() && suggestions.length > 0 && (
                                    <div className="pokepuzzle-autocomplete-list custom-scrollbar" ref={autocompleteContainerRef}>
                                        {suggestions.map((p, idx) => (
                                            <div
                                                key={p.id}
                                                onClick={() => handleSelectSuggestion(p)}
                                                className={`pokepuzzle-autocomplete-item ${idx === activeSuggestionIdx ? 'is-active' : ''}`}
                                            >
                                                <span className="capitalize">{p.displayName}</span>
                                                <span className="text-[10px] text-muted uppercase font-bold">
                                                    #{String(p.id).padStart(3, '0')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Virtual QWERTY Keyboard */}
                        {gameStatus === 'IN_PROGRESS' && (
                            <section className="pokepuzzle-keyboard" aria-label="Virtual keyboard">
                                {KEYBOARD_ROWS.map((row, rowIdx) => (
                                    <div key={rowIdx} className="pokepuzzle-keyboard-row">
                                        {row.map(key => {
                                            const status = keyboardStatusMap[key];
                                            const isWide = key === 'enter' || key === 'backspace';
                                            const label = key === 'backspace'
                                                ? <Delete className="w-4 h-4" />
                                                : key === 'enter'
                                                    ? <CornerDownLeft className="w-4 h-4" />
                                                    : key;

                                            return (
                                                <button
                                                    type="button"
                                                    key={key}
                                                    onClick={() => handleKeyClick(key)}
                                                    className={`pokepuzzle-key ${isWide ? 'is-wide' : ''} ${status === 'correct' ? 'is-correct' :
                                                        status === 'present' ? 'is-present' :
                                                            status === 'absent' ? 'is-absent' : ''
                                                        }`}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </section>
                        )}
                    </div>

                    {/* Sidebar congrats panel */}
                    {gameStatus !== 'IN_PROGRESS' && (
                        <div className="pokepuzzle-game-sidebar">
                            {mode === 'daily' ? (
                                <section
                                    className="pokepuzzle-result-card"
                                    style={{
                                        '--type-color': typeColor,
                                        '--type-glow-color': typeGlowColor
                                    }}
                                >
                                    <div className="pokepuzzle-result-badge-wrapper">
                                        {gameStatus === 'WON' ? (
                                            <div className="pokepuzzle-badge-success-glow">
                                                <Award className="w-6 h-6 text-success" />
                                            </div>
                                        ) : (
                                            <div className="pokepuzzle-badge-danger-glow">
                                                <Frown className="w-6 h-6 text-danger" />
                                            </div>
                                        )}
                                    </div>

                                    <h2 className={`pokepuzzle-result-title ${gameStatus === 'WON' ? 'is-win' : 'is-lose'}`}>
                                        {gameStatus === 'WON' ? t('pokepuzzle.winTitle') : t('pokepuzzle.loseTitle')}
                                    </h2>

                                    <div className="pokepuzzle-result-sprite-box">
                                        <img
                                            src={targetDetails.image || getPokemonArtworkSpriteUrl(targetPokemon.id)}
                                            alt={targetPokemon.name}
                                            className="pokepuzzle-result-sprite pokepuzzle-revealed sprite-fade"
                                            onError={(e) => { e.currentTarget.src = getPokemonFrontSpriteUrl(targetPokemon.id); }}
                                        />
                                    </div>

                                    <h3 className="pokepuzzle-result-pokemon-name">{formatPokemonDisplayName(targetPokemon.name)}</h3>

                                    <div className="pokepuzzle-result-types mt-0.5">
                                        {isLoadingDetails ? '...' : targetDetails.types.map(type => (
                                            <span
                                                key={type}
                                                className="home-type-pill capitalize text-[10px] py-0.5 px-2.5 font-bold border rounded mr-1 inline-block"
                                                style={{
                                                    backgroundColor: `${typeColors[type]}18`,
                                                    borderColor: `${typeColors[type]}35`,
                                                    color: typeColors[type],
                                                }}
                                            >
                                                {type}
                                            </span>
                                        ))}
                                    </div>

                                    <p className="pokepuzzle-result-text mt-1">
                                        {gameStatus === 'WON'
                                            ? t('pokepuzzle.winMessage', { name: formatPokemonDisplayName(targetPokemon.name), attempts: guesses.length })
                                            : t('pokepuzzle.loseMessage', { name: formatPokemonDisplayName(targetPokemon.name) })
                                        }
                                    </p>

                                    {/* Mini attempt preview grid */}
                                    <div className="pokepuzzle-share-preview mt-2 w-full">
                                        <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-2 block">
                                            {language === 'pt' ? 'Resumo das Tentativas' : 'Attempts Summary'}
                                        </span>
                                        <div className="flex flex-col gap-1 items-center justify-center">
                                            {guesses.map((guess, idx) => {
                                                const norm = normalizeNameForGame(guess);
                                                const letterStatuses = checkLetters(norm, targetNormalized);
                                                return (
                                                    <div key={idx} className="pokepuzzle-share-preview-row">
                                                        {letterStatuses.map((status, sIdx) => (
                                                            <span
                                                                key={sIdx}
                                                                className={`pokepuzzle-share-preview-tile is-${status}`}
                                                            />
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Share Actions Row */}
                                    <div className="pokepuzzle-share-actions-container w-full mt-2 flex flex-col gap-2">
                                        <button
                                            onClick={handleShare}
                                            className="btn btn-accent px-4 py-2 flex items-center justify-center gap-2 w-full font-bold text-xs"
                                        >
                                            <Share2 className="w-3.5 h-3.5" />
                                            <span>{language === 'pt' ? 'Copiar Texto' : 'Copy Text'}</span>
                                        </button>
                                        <button
                                            onClick={handleShareImage}
                                            className="btn btn-secondary px-4 py-2 flex items-center justify-center gap-2 w-full font-bold text-xs"
                                        >
                                            <Image className="w-3.5 h-3.5" />
                                            <span>{language === 'pt' ? 'Compartilhar Imagem' : 'Share Image'}</span>
                                        </button>
                                    </div>
                                </section>
                            ) : (
                                <section
                                    className="pokepuzzle-result-card"
                                    style={{
                                        '--type-color': typeColor,
                                        '--type-glow-color': typeGlowColor
                                    }}
                                >
                                    <div className="pokepuzzle-result-badge-wrapper">
                                        {gameStatus === 'WON' ? (
                                            <div className="pokepuzzle-badge-success-glow">
                                                <Award className="w-6 h-6 text-success" />
                                            </div>
                                        ) : (
                                            <div className="pokepuzzle-badge-danger-glow">
                                                <Frown className="w-6 h-6 text-danger" />
                                            </div>
                                        )}
                                    </div>

                                    <h2 className={`pokepuzzle-result-title ${gameStatus === 'WON' ? 'is-win' : 'is-lose'}`}>
                                        {gameStatus === 'WON' ? t('pokepuzzle.winTitle') : t('pokepuzzle.loseTitle')}
                                    </h2>

                                    <div className="pokepuzzle-result-sprite-box">
                                        <img
                                            src={targetDetails.image || getPokemonArtworkSpriteUrl(targetPokemon.id)}
                                            alt={targetPokemon.name}
                                            className="pokepuzzle-result-sprite pokepuzzle-revealed sprite-fade"
                                            onError={(e) => { e.currentTarget.src = getPokemonFrontSpriteUrl(targetPokemon.id); }}
                                        />
                                    </div>

                                    <h3 className="pokepuzzle-result-pokemon-name">{formatPokemonDisplayName(targetPokemon.name)}</h3>

                                    <div className="pokepuzzle-result-types mt-0.5">
                                        {isLoadingDetails ? '...' : targetDetails.types.map(type => (
                                            <span
                                                key={type}
                                                className="home-type-pill capitalize text-[10px] py-0.5 px-2.5 font-bold border rounded mr-1 inline-block"
                                                style={{
                                                    backgroundColor: `${typeColors[type]}18`,
                                                    borderColor: `${typeColors[type]}35`,
                                                    color: typeColors[type],
                                                }}
                                            >
                                                {type}
                                            </span>
                                        ))}
                                    </div>

                                    <p className="pokepuzzle-result-text mt-1">
                                        {gameStatus === 'WON'
                                            ? t('pokepuzzle.winMessage', { name: formatPokemonDisplayName(targetPokemon.name), attempts: guesses.length })
                                            : t('pokepuzzle.loseMessage', { name: formatPokemonDisplayName(targetPokemon.name) })
                                        }
                                    </p>

                                    <button
                                        onClick={startRandomOngoingGame}
                                        className="btn btn-primary px-8 py-3 flex items-center justify-center gap-2 w-full font-bold text-sm shadow-md mt-4"
                                    >
                                        <RefreshIcon className="w-4 h-4" />
                                        <span>{t('pokepuzzle.playAgain')}</span>
                                    </button>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            )}
        </main>

        {/* History Drawer Overlay */}
        <div
            className={`pokepuzzle-history-overlay ${isHistoryOpen ? 'is-open' : ''}`}
            onClick={() => setIsHistoryOpen(false)}
        />

        {/* History Drawer Sidebar */}
        <div className={`pokepuzzle-history-sidebar ${isHistoryOpen ? 'is-open' : ''}`}>
            <div className="pokepuzzle-history-sidebar-header">
                <h3 className="pokepuzzle-history-sidebar-title">
                    <HistoryIcon /> {language === 'pt' ? 'Histórico do PokéPuzzle' : 'PokéPuzzle History'}
                </h3>
                <button
                    type="button"
                    className="pokepuzzle-history-sidebar-close"
                    onClick={() => setIsHistoryOpen(false)}
                    title={language === 'pt' ? 'Fechar Histórico' : 'Close History'}
                >
                    <CloseIcon />
                </button>
            </div>

            <div
                className="pokepuzzle-history-sidebar-scroll"
                onScroll={handleHistoryScroll}
            >
                {allowedPool.length === 0 ? (
                    <div className="pokepuzzle-history-loading">
                        <div className="pokepuzzle-history-loading-spinner" />
                        <span>{language === 'pt' ? 'Carregando dados...' : 'Loading data...'}</span>
                    </div>
                ) : (
                    <>
                        {pastDates
                            .slice(0, visibleHistoryLimit)
                            .map((dateStr) => {
                                const saved = historyByDate.get(dateStr) || null;
                                const itemStatus = saved?.gameStatus || 'NOT_PLAYED'; // NOT_PLAYED, IN_PROGRESS, WON, LOST

                                // Identify corresponding target pokemon for spoiler/reveal info
                                const pokemonIdx = getDailyPokemonIndex(dateStr, allowedPool);
                                const pokemon = allowedPool[pokemonIdx];
                                const isCompleted = itemStatus === 'WON' || itemStatus === 'LOST';

                                return (
                                    <div key={dateStr} className="pokepuzzle-history__item">
                                        <div className="pokepuzzle-history__info">
                                            <div className="pokepuzzle-history__date-row">
                                                <span className="pokepuzzle-history__date">{dateStr}</span>
                                                {saved && (
                                                    <span className={`pokepuzzle-history__badge ${isCompleted ? 'pokepuzzle-history__badge--complete' : 'pokepuzzle-history__badge--progress'}`}>
                                                        {itemStatus === 'WON' 
                                                            ? (language === 'pt' ? 'Acertou' : 'Solved')
                                                            : itemStatus === 'LOST'
                                                                ? (language === 'pt' ? 'Esgotado' : 'Failed')
                                                                : (language === 'pt' ? 'Em Progresso' : 'In Progress')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Visually show if completed (reveal sprite and name) or if not completed (obscured) */}
                                        <div className="pokepuzzle-history__item-detail">
                                            <img
                                                src={isCompleted 
                                                    ? getPokemonArtworkSpriteUrl(pokemon.id) 
                                                    : getPokemonFrontSpriteUrl(pokemon.id)
                                                }
                                                alt="Pokémon preview"
                                                className={`pokepuzzle-history__pokemon-sprite ${!isCompleted ? 'is-mystery' : ''}`}
                                                onError={(e) => { e.currentTarget.src = getPokemonFrontSpriteUrl(pokemon.id); }}
                                            />
                                            <div className="pokepuzzle-history__pokemon-info">
                                                <span className="pokepuzzle-history__pokemon-name">
                                                    {isCompleted 
                                                        ? formatPokemonDisplayName(pokemon.name) 
                                                        : '???'
                                                    }
                                                </span>
                                                <span className="pokepuzzle-history__pokemon-meta">
                                                    {isCompleted 
                                                        ? `#${String(pokemon.id).padStart(3, '0')}` 
                                                        : (language === 'pt' 
                                                            ? `Tamanho: ${normalizeNameForGame(pokemon.name).length} letras` 
                                                            : `Length: ${normalizeNameForGame(pokemon.name).length} letters`)
                                                    }
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pokepuzzle-history__actions">
                                            {itemStatus === 'IN_PROGRESS' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMode('daily');
                                                        setSelectedDate(dateStr);
                                                        setIsHistoryOpen(false);
                                                    }}
                                                    className="pokepuzzle-history__btn pokepuzzle-history__btn--continue"
                                                >
                                                    {language === 'pt' ? 'Continuar' : 'Continue'}
                                                </button>
                                            ) : isCompleted ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMode('daily');
                                                        setSelectedDate(dateStr);
                                                        setIsHistoryOpen(false);
                                                    }}
                                                    className="pokepuzzle-history__btn pokepuzzle-history__btn--play"
                                                >
                                                    {language === 'pt' ? 'Ver Resultado' : 'View Result'}
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMode('daily');
                                                        setSelectedDate(dateStr);
                                                        setIsHistoryOpen(false);
                                                    }}
                                                    className="pokepuzzle-history__btn pokepuzzle-history__btn--play"
                                                >
                                                    {language === 'pt' ? 'Jogar' : 'Play'}
                                                </button>
                                            )}

                                            {saved && (
                                                <button
                                                    type="button"
                                                    onClick={() => deleteHistoryRun(dateStr)}
                                                    className="pokepuzzle-history__btn--delete"
                                                    title={language === 'pt' ? 'Deletar Progresso' : 'Delete Progress'}
                                                >
                                                    <CloseIcon />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                        {isHistoryLoadingMore && (
                            <div className="pokepuzzle-history-loading">
                                <div className="pokepuzzle-history-loading-spinner" />
                                <span>{language === 'pt' ? 'Carregando mais dias...' : 'Loading older days...'}</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
        </>
    );
}
