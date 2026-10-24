import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSessionGame } from '../../hooks/useSessionGame';
import { usePokePuzzleHistory } from '../../hooks/usePokePuzzleHistory';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useDeferredDelete } from '../../hooks/useDeferredDelete';
import { useToastStore, toast } from '../../store/useToastStore';
import { loadPokemonIndex } from '../../services/pokemonDataCache';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { RefreshIcon, CloseIcon } from '../icons';
import { Lock, Frown, Award, Image, Delete, CornerDownLeft, Share2, MessageSquare } from 'lucide-react';
import QRCode from 'qrcode';
import { useAuthStore } from '../../store/useAuthStore';
import { db } from '../../services/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useTrainerBadges } from '../../hooks/useTrainerBadges';
import '../../styles/pokepuzzle-view.css';
import { getDailyPokemonIndex, checkLetters, getDaysSinceLaunch } from '../../utils/pokePuzzle';
import { buildPuzzleShare, puzzleShareScore, puzzleShareToEmoji } from '../../utils/pokePuzzleShare';
import { encodePuzzleResult } from '../../utils/resultShareCode';
import { localizePath } from '../../utils/localePath';
import { deployBase } from '../../services/localeHistory';
import { useForumStore } from '../../store/useForumStore';
import { Loader } from '../Loader';
import { DecryptText } from '../DecryptText';
import { TypeChip } from '../TypeChip';
import { GameHistoryDialog } from '../GameHistoryDialog';
import { ReminderOffer } from '../ReminderOffer';

// Constants
const MAX_ATTEMPTS = 8;
// How long a just-won result stays on screen before a badge it earned may open.
const BADGE_AFTER_SEEN_MS = 2400;
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

// Seeded daily index selector is now imported from '../../utils/pokePuzzle'

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
    useDocumentMeta({
        title: 'PokéPuzzle',
        description: 'A daily sliding Pokémon sprite puzzle.',
        path: '/pokepuzzle',
    });
    const showToast = useToastStore(state => state.showToast);
    const { userId, pokePuzzleMigrationTick, bumpPokePuzzleStreak } = useAuthStore(useShallow((s) => ({
        userId: s.userId,
        pokePuzzleMigrationTick: s.pokePuzzleMigrationTick,
        bumpPokePuzzleStreak: s.bumpPokePuzzleStreak,
    })));
    const { checkBadgeCelebration } = useTrainerBadges();
    // The badge check runs seconds after the win (see the effect near the
    // result card), by which time the stats it reads have moved on — call the
    // latest one, not the one captured when the timer was set.
    const checkBadgeRef = useRef(checkBadgeCelebration);
    useEffect(() => { checkBadgeRef.current = checkBadgeCelebration; }, [checkBadgeCelebration]);

    const [selectedDate, setSelectedDate] = useState(() => getTodayDateString());
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [visibleHistoryLimit, setVisibleHistoryLimit] = useState(10);
    // Bumped to force the anonymous (localStorage) history fallback to re-read,
    // e.g. after a local delete. Logged-in users update via the Firestore listener.
    const [historyRefresh, setHistoryRefresh] = useState(0);

    // Mode: 'daily' or 'ongoing'. selectedDate + mode describe WHAT the user
    // wants to view; sessionKey is the single derived identity of that game.
    const [mode, setMode] = useState('daily');
    const sessionKey = mode === 'daily' ? dailyKey(selectedDate) : ONGOING_KEY;

    // Game data pool
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

    // True only between the user's own winning guess and the next target: the
    // result card decrypts the name for a win that just happened, and shows it
    // still for a day that was already solved (a reward is never replayed).
    const [solvedNow, setSolvedNow] = useState(false);
    useEffect(() => { setSolvedNow(false); }, [targetPokemon?.id]);

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

    // Active tip tab: 'types', 'description', 'silhouette'
    // Types is always visible from the start — it's the first clue, not a tip.
    const [activeTipTab, setActiveTipTab] = useState('types');

    // Input autocomplete suggestions
    const [inputValue, setInputValue] = useState('');
    const [selectedCharIdx, setSelectedCharIdx] = useState(0);
    const currentGuessLetters = useMemo(() => inputValue.split(''), [inputValue]);
    const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);
    const autocompleteContainerRef = useRef(null);
    const inputRef = useRef(null);
    const viewRef = useRef(null);
    const trayRef = useRef(null);
    const activeRowRef = useRef(null);
    const resultRef = useRef(null);

    // A rejected guess is answered where the user is looking — a line above
    // the keyboard and a shake of the row they typed — not by a toast.
    const [invalidMessage, setInvalidMessage] = useState('');
    // Bumped by each accepted guess: the new active row scrolls into view.
    const [submitTick, setSubmitTick] = useState(0);
    // True only when the game ended by the user's own guess in this visit (a
    // finished day opened from History is not an ending to scroll to).
    const [endedNow, setEndedNow] = useState(false);
    useEffect(() => { setEndedNow(false); setInvalidMessage(''); }, [targetPokemon?.id]);

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

    // Auto-select unlocked tip tab (types is always shown, so it's the default)
    useEffect(() => {
        if (guesses.length >= 7) {
            setActiveTipTab('silhouette');
        } else if (guesses.length >= 3) {
            setActiveTipTab('description');
        } else {
            setActiveTipTab('types');
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

    // Deleting a day is reversible: it disappears at once and is only really
    // removed when the undo toast has had its chance (useDeferredDelete). The
    // commit is what the old confirm dialog guarded.
    const historyDeletes = useDeferredDelete();
    const commitHistoryDelete = useCallback(async (dateStr) => {
        try { localStorage.removeItem(ppKey(userId, `daily:${dateStr}`)); } catch (e) { /* ignore */ }
        // Logged-in users update via the Firestore listener; nudge the
        // anonymous localStorage fallback to re-read.
        setHistoryRefresh(n => n + 1);
        if (selectedDate === dateStr && mode === 'daily') {
            loadSession(dailyKey(dateStr));
        }
        if (db && userId) {
            try {
                await deleteDoc(doc(db, `artifacts/pokemonTeamBuilder/users/${userId}/pokepuzzle`, `daily_${dateStr}`));
            } catch (e) {
                console.error("Failed to delete from Firestore:", e);
            }
        }
    }, [userId, selectedDate, mode, loadSession]);

    const deleteHistoryRun = (dateStr) => {
        historyDeletes.schedule(dateStr, () => commitHistoryDelete(dateStr));
        toast.info(t('games.progressDeleted', { date: dateStr }), {
            key: `pokepuzzle-delete-${dateStr}`,
            actions: [{ label: t('toast.undo'), onClick: () => historyDeletes.undo(dateStr) }],
        });
    };

    // Reveal older days as the list nears its end. Instant: the data is
    // already here, so a spinner in front of it was a wait made up.
    const handleHistoryScroll = useCallback((e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 40 && visibleHistoryLimit < pastDates.length) {
            setVisibleHistoryLimit((prev) => Math.min(prev + 10, pastDates.length));
        }
    }, [visibleHistoryLimit, pastDates.length]);

    useEffect(() => {
        if (!isHistoryOpen) {
            setVisibleHistoryLimit(10);
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

    // ── Input ────────────────────────────────────────────────────────────
    // One set of handlers for the on-screen keys, the physical keyboard and
    // the suggestion list. They are plain functions, rebuilt every render, so
    // each one reads the guess as it is *now*. (The on-screen Enter used to be
    // a useCallback that never re-ran after the last letter — the cursor stops
    // moving there — and submitted the guess one letter short.)
    const typeLetter = (char) => {
        if (gameStatus !== 'IN_PROGRESS' || !targetLength) return;
        const chars = inputValue.padEnd(targetLength, ' ').split('');
        chars[selectedCharIdx] = char;
        setInputValue(chars.join(''));
        setSelectedCharIdx(Math.min(targetLength - 1, selectedCharIdx + 1));
        setInvalidMessage('');
    };

    const eraseLetter = () => {
        if (gameStatus !== 'IN_PROGRESS' || !targetLength) return;
        const chars = inputValue.padEnd(targetLength, ' ').split('');
        if (chars[selectedCharIdx] !== ' ') {
            chars[selectedCharIdx] = ' ';
        } else {
            const prevIdx = Math.max(0, selectedCharIdx - 1);
            chars[prevIdx] = ' ';
            setSelectedCharIdx(prevIdx);
        }
        setInputValue(chars.join(''));
        setInvalidMessage('');
    };

    // A guess on TODAY's daily counts as "played today" → advance the trainer
    // streak (idempotent per day; only the daily mode for the live date counts).
    const registerDailyPlay = useCallback(() => {
        if (mode === 'daily' && selectedDate === getTodayDateString()) {
            bumpPokePuzzleStreak();
        }
    }, [mode, selectedDate, bumpPokePuzzleStreak]);

    // The active row shakes once: transform only, 150ms, and not at all
    // under reduced motion (the message above the keyboard still says why).
    const rejectGuess = (message) => {
        setInvalidMessage(message);
        const row = activeRowRef.current;
        if (!row?.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        const easing = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim() || 'linear';
        row.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-0.375rem)' },
            { transform: 'translateX(0.375rem)' },
            { transform: 'translateX(-0.1875rem)' },
            { transform: 'translateX(0)' },
        ], { duration: 150, easing: easing.startsWith('linear(') ? 'linear' : easing });
    };

    // Accept a guess (typed or picked from the suggestions). The result card
    // announces a win or a loss, so neither gets a toast of its own.
    const commitGuess = (pokemon) => {
        if (gameStatus !== 'IN_PROGRESS') return;
        const norm = normalizeNameForGame(pokemon.name);
        addGuess(pokemon.name);
        registerDailyPlay();
        const nextCount = guesses.length + 1;
        setInputValue(' '.repeat(targetLength));
        setSelectedCharIdx(0);
        setInvalidMessage('');
        setSubmitTick((n) => n + 1);

        if (norm === targetNormalized) {
            setSolvedNow(true);
            setEndedNow(true);
            setStatus('WON');
        } else if (nextCount >= MAX_ATTEMPTS) {
            setEndedNow(true);
            setStatus('LOST');
        }
    };

    const submitCurrentGuess = () => {
        if (gameStatus !== 'IN_PROGRESS') return;
        const guessStr = inputValue.replace(/\s/g, '');
        if (guessStr.length !== targetLength) {
            rejectGuess(t('pokepuzzle.guessNotValidLength', { length: targetLength }));
            return;
        }
        const matched = allowedPool.find(p => normalizeNameForGame(p.name) === guessStr);
        if (!matched) {
            rejectGuess(t('pokepuzzle.guessNotValidPokemon'));
            return;
        }
        commitGuess(matched);
    };

    // Enter, from either keyboard: a complete guess is submitted as typed; a
    // partial one takes the highlighted suggestion when there is one.
    const handleEnter = () => {
        const isComplete = inputValue.replace(/\s/g, '').length === targetLength;
        if (!isComplete && suggestions.length > 0 && suggestions[activeSuggestionIdx]) {
            commitGuess(suggestions[activeSuggestionIdx]);
            return;
        }
        submitCurrentGuess();
    };

    const handleKeyClick = (key) => {
        if (key === 'backspace') eraseLetter();
        else if (key === 'enter') handleEnter();
        else typeLetter(key.toLowerCase());
    };

    const handleSelectSuggestion = (pokemon) => commitGuess(pokemon);

    // Auto-scroll inside suggestion dropdown to keep selection visible
    useEffect(() => {
        if (autocompleteContainerRef.current) {
            const activeEl = autocompleteContainerRef.current.querySelector('.is-active');
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [activeSuggestionIdx]);

    // Physical keyboard. Listens on window so typing works without focusing
    // anything — which is exactly why it has to know when a key is *not* its
    // business: a modifier chord (⌘K / Ctrl+K opens the global search), any
    // other text field (that search, the forum composer), anything inside a
    // dialog, or Enter/Space on a focused button or link. Swallowing those
    // made the whole app unusable from the keyboard while this page was open.
    const handleWindowKeyDown = (e) => {
        if (gameStatus !== 'IN_PROGRESS') return;
        if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;

        const target = e.target instanceof Element ? e.target : null;
        const isPuzzleInput = target && target === inputRef.current;
        if (target && !isPuzzleInput) {
            if (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], [role="combobox"]')) return;
            if (target.closest('[role="dialog"], .modal-panel')) return;
            if ((e.key === 'Enter' || e.key === ' ') && target.closest('button, a, [role="button"], [role="tab"], [role="option"]')) return;
        }
        // A dialog that is open but does not hold focus still owns the keys.
        if (document.querySelector('[aria-modal="true"]')) return;

        const key = e.key;
        if (key === 'ArrowLeft') {
            e.preventDefault();
            setSelectedCharIdx(prev => Math.max(0, prev - 1));
        } else if (key === 'ArrowRight') {
            e.preventDefault();
            setSelectedCharIdx(prev => Math.min(targetLength - 1, prev + 1));
        } else if (/^[a-zA-Z]$/.test(key)) {
            e.preventDefault();
            typeLetter(key.toLowerCase());
        } else if (key === 'Backspace') {
            e.preventDefault();
            eraseLetter();
        } else if (key === 'Enter') {
            e.preventDefault();
            handleEnter();
        } else if (key === 'ArrowDown' && suggestions.length > 0) {
            e.preventDefault();
            setActiveSuggestionIdx(prev => (prev + 1) % suggestions.length);
        } else if (key === 'ArrowUp' && suggestions.length > 0) {
            e.preventDefault();
            setActiveSuggestionIdx(prev => (prev - 1 + suggestions.length) % suggestions.length);
        }
    };

    // Subscribe once; the ref always points at this render's handler, so the
    // listener can never hold a stale guess.
    const windowKeyDownRef = useRef(handleWindowKeyDown);
    useLayoutEffect(() => { windowKeyDownRef.current = handleWindowKeyDown; });
    useEffect(() => {
        const onKeyDown = (e) => windowKeyDownRef.current(e);
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

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

    // The keyboard tray is sticky over the board; publish its height so the
    // row being typed can keep itself clear of it (scroll-margin-bottom).
    useEffect(() => {
        const tray = trayRef.current;
        const view = viewRef.current;
        if (!tray || !view || typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver(([entry]) => {
            view.style.setProperty('--pp-tray-h', `${Math.round(entry.borderBoxSize?.[0]?.blockSize ?? tray.offsetHeight)}px`);
        });
        ro.observe(tray);
        return () => ro.disconnect();
    }, [gameStatus, targetPokemon?.id]);

    // After each accepted guess the next row may have dropped under the tray
    // (or below the fold on a laptop): bring it back, by the least distance.
    useEffect(() => {
        if (!submitTick || gameStatus !== 'IN_PROGRESS') return;
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        activeRowRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    }, [submitTick, gameStatus]);

    // A game that just ended: on a phone the result card lands below the
    // board, out of sight — take the user to it.
    useEffect(() => {
        if (!endedNow || gameStatus === 'IN_PROGRESS') return;
        if (!window.matchMedia?.('(max-width: 1023px)').matches) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const id = requestAnimationFrame(() => {
            resultRef.current?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
        });
        return () => cancelAnimationFrame(id);
    }, [endedNow, gameStatus]);

    // A badge earned by this win waits until the result has been seen: the
    // card has to be on screen, then BADGE_AFTER_SEEN_MS for the name to
    // decrypt (≤ 900ms) and the score to be read. It used to open 500ms after
    // the last guess, on top of the result it was celebrating.
    useEffect(() => {
        if (!solvedNow || gameStatus !== 'WON') return undefined;
        const card = resultRef.current;
        if (!card) return undefined;
        let timer = 0;
        const fire = () => { timer = window.setTimeout(() => checkBadgeRef.current?.(), BADGE_AFTER_SEEN_MS); };
        if (typeof IntersectionObserver === 'undefined') { fire(); return () => clearTimeout(timer); }
        const io = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                io.disconnect();
                fire();
            }
        }, { threshold: 0.5 });
        io.observe(card);
        return () => { io.disconnect(); clearTimeout(timer); };
    }, [solvedNow, gameStatus]);


    // Progressive tip unlock status flags (types is always visible)
    const showPokedexEntry = guesses.length >= 3 || gameStatus !== 'IN_PROGRESS' || unlockedTips.description;
    const showSilhouette = guesses.length >= 7 || gameStatus !== 'IN_PROGRESS' || unlockedTips.silhouette;


    const host = typeof window !== 'undefined' ? window.location.host : 'poketeambuilder.com';

    // The link carries the board (`?r=`, utils/resultShareCode.js — the shape
    // of the attempt, never the answer), so where it is pasted it unfurls as
    // this result, drawn by api/og.js, rather than the game's generic card.
    const generateShareText = () => {
        const modeTitle = mode === 'daily'
            ? `${language === 'pt' ? 'PokePuzzle Diário' : 'Daily PokePuzzle'}`
            : `${language === 'pt' ? 'PokePuzzle Livre' : 'Ongoing PokePuzzle'}`;

        const share = buildPuzzleShare({
            guesses: guesses.map(normalizeNameForGame),
            target: targetNormalized,
            maxAttempts: MAX_ATTEMPTS,
            won: gameStatus === 'WON',
            mode: mode === 'daily' ? 'daily' : 'free',
            puzzleNumber: mode === 'daily' ? getDaysSinceLaunch(selectedDate) + 1 : null,
        });
        const code = encodePuzzleResult(share);
        const shareUrl = `${window.location.origin}${localizePath('/pokepuzzle', language, deployBase())}${code ? `?r=${code}` : ''}`;

        return `PokePuzzle - ${modeTitle} ${puzzleShareScore(share)}\n\n${puzzleShareToEmoji(share)}\n\n${language === 'pt' ? 'Jogue aqui' : 'Play here'}: ${shareUrl}`;
    };

    const copyShareText = (text) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => showToast(t('games.resultCopied'), 'success'))
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    showToast(t('games.copyFailed'), 'error');
                });
            return;
        }
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast(t('games.resultCopied'), 'success');
        } catch (err) {
            showToast(t('games.copyFailed'), 'error');
        }
        document.body.removeChild(textArea);
    };

    // One Share button. On a touch device the OS share sheet is where the
    // result is going anyway (a chat, a story); on a desktop that sheet is a
    // detour, and a copied grid pastes anywhere — so there it copies.
    const handleShare = async () => {
        const text = generateShareText();
        const isTouch = window.matchMedia?.('(pointer: coarse)').matches;
        if (isTouch && navigator.share) {
            try {
                await navigator.share({ text });
                return;
            } catch (err) {
                if (err?.name === 'AbortError') return;
            }
        }
        copyShareText(text);
    };

    // Post the finished board to the forum. The payload is built by
    // `buildPuzzleShare`, which by construction carries no answer and no
    // guesses — the day's Pokémon never leaves this screen.
    const handleShareToForum = async () => {
        const share = buildPuzzleShare({
            guesses,
            target: targetNormalized,
            maxAttempts: MAX_ATTEMPTS,
            won: gameStatus === 'WON',
            mode: mode === 'daily' ? 'daily' : 'free',
            // Day 1 is launch day, so the count is 1-based for a human label.
            puzzleNumber: mode === 'daily' ? getDaysSinceLaunch(selectedDate) + 1 : null,
        });
        if (!share) return;

        // The card already names the puzzle and shows the score, so the message
        // carries no text: a body repeating its own attachment word for word was
        // the ugliest thing about the first version of this.
        // Same topic resolution the team share uses: aim at the general thread,
        // fall back to the well-known id rather than guessing.
        const topics = useForumStore.getState().topics;
        const generalTopic = topics.find((topic) => topic.category === 'general')
            || topics.find((topic) => /general/i.test(topic.title || ''));
        const topicId = generalTopic ? generalTopic.id : 'general';

        const ok = await useForumStore.getState().sendMessage(topicId, '', null, null, { sharedPuzzle: share });
        if (ok) {
            showToast(t('toast.puzzleShared'), 'success');
        } else {
            showToast(t('toast.puzzleShareError'), 'error');
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

            const logoUrl = `${window.location.origin}${getRuntimeBaseURL()}logo-mark.webp`.replace(/([^:]\/)\/+/g, "$1");
            const loadImg = (url) => new Promise((resolve, reject) => {
                if (!url) return reject(new Error('URL is empty'));
                const img = new Image();
                // Only enable CORS for external cross-origin URLs
                const isExternal = url.startsWith('http') && !url.startsWith(window.location.origin);
                if (isExternal) {
                    img.crossOrigin = 'anonymous';
                }
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Failed to load image: ' + url));
                img.src = url;
            });

            let logoImg;
            const logoDomImg = document.querySelector('img[src*="logo-mark"]');
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

    const isArchive = selectedDate !== getTodayDateString();
    const isWon = gameStatus === 'WON';
    const targetTypes = targetDetails.types || [];
    const tipTabs = [
        { id: 'types', label: t('pokepuzzle.tipTypes'), locked: false },
        { id: 'description', label: t('pokepuzzle.tipEntry'), locked: !showPokedexEntry, unlockAt: 3 },
        { id: 'silhouette', label: t('pokepuzzle.tipSilhouette'), locked: !showSilhouette, unlockAt: 7 },
    ];

    const renderLockedTip = (tip) => (
        <div className="pokepuzzle-tip-card is-locked">
            <span className="pokepuzzle-tip-locked">
                <Lock aria-hidden="true" />
                {t('games.unlocksAt', { count: tip.unlockAt })}
            </span>
            <button type="button" onClick={() => unlockTip(tip.id)} className="btn btn-outline btn-sm">
                {t('games.revealEarly')}
            </button>
        </div>
    );

    return (
        <>
            <main
                ref={viewRef}
                className={`pokepuzzle-view ${gameStatus !== 'IN_PROGRESS' ? 'has-ended' : ''} ${isArchive ? 'is-archive-mode' : ''}`}
            >
                {/* Header Area with Tabs and History button */}
                <div className="pokepuzzle-header-row">
                    <div className="pokepuzzle-tabs segmented segmented--lg segmented--block" role="tablist" aria-label="PokéPuzzle">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={mode === 'daily'}
                            onClick={() => setMode('daily')}
                            className="segmented__item"
                        >
                            {t('pokepuzzle.dailyTab')}
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={mode === 'ongoing'}
                            onClick={() => setMode('ongoing')}
                            className="segmented__item"
                        >
                            {t('pokepuzzle.ongoingTab')}
                        </button>
                    </div>

                    {mode === 'daily' && (
                        <button
                            type="button"
                            onClick={() => setIsHistoryOpen(true)}
                            className="btn btn-secondary pokepuzzle-history-toggle"
                            aria-label={t('games.puzzleHistory')}
                            title={t('games.puzzleHistory')}
                        >
                            <HistoryIcon />
                            <span className="pokepuzzle-history-toggle-label">{t('games.history')}</span>
                            {playedHistoryCount > 0 && (
                                <span className="count-badge">{playedHistoryCount}</span>
                            )}
                        </button>
                    )}
                </div>

                {/* Previous Puzzle Indicator Banner */}
                {mode === 'daily' && isArchive && (
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
                        <span className="pokepuzzle-header-countdown-label">{t('games.nextIn')}</span>
                        <span className="pokepuzzle-header-countdown-time">{nextDailyCountdown}</span>
                    </div>
                )}

                {/* Load State Indicator */}
                {isLoadingIndex && <Loader block />}

                {!isLoadingIndex && targetPokemon && (
                    <div className={`pokepuzzle-game-container ${gameStatus !== 'IN_PROGRESS' ? 'has-ended' : ''}`}>
                        <div className="pokepuzzle-game-main">
                            {/* Hints: three tabs, with the generation and the tries
                                used folded into the same row — the separate
                                "Dicas" header above them was a fourth line saying
                                nothing the tabs did not. */}
                            <section className="pokepuzzle-tips-container" aria-label={t('games.hints')}>
                                <div className="pokepuzzle-tip-row">
                                    <div className="tabs pokepuzzle-tip-tabs" role="tablist" aria-label={t('games.hints')}>
                                        {tipTabs.map((tab) => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                role="tab"
                                                aria-selected={activeTipTab === tab.id}
                                                onClick={() => setActiveTipTab(tab.id)}
                                                className={`tabs__item pokepuzzle-tip-tab ${tab.locked ? 'is-locked' : ''}`}
                                            >
                                                {tab.label}
                                                {tab.locked && <Lock aria-hidden="true" />}
                                            </button>
                                        ))}
                                    </div>
                                    <span className="pokepuzzle-tip-meta">
                                        <span>{t('games.genShort', { gen: getGenerationByPokemonId(targetPokemon.id) })}</span>
                                        <span aria-hidden="true">·</span>
                                        <span
                                            aria-label={t('games.triesAria', { count: guesses.length, max: MAX_ATTEMPTS })}
                                            className="pokepuzzle-tip-tries"
                                        >
                                            {guesses.length}/{MAX_ATTEMPTS}
                                        </span>
                                    </span>
                                </div>

                                <div className="pokepuzzle-tip-panel" role="tabpanel">
                                    {activeTipTab === 'types' && (
                                        <div className="pokepuzzle-tip-card">
                                            <div className="pokepuzzle-clue-types">
                                                {isLoadingDetails
                                                    ? <span className="pokepuzzle-tip-pending">…</span>
                                                    : targetTypes.map(type => <TypeChip key={type} type={type} />)}
                                            </div>
                                        </div>
                                    )}

                                    {activeTipTab === 'description' && (showPokedexEntry ? (
                                        <div className="pokepuzzle-tip-card">
                                            <p className="pokepuzzle-tip-description-text custom-scrollbar">
                                                {isLoadingDetails ? '…' : (targetDetails.description || t('games.noDescription'))}
                                            </p>
                                        </div>
                                    ) : renderLockedTip(tipTabs[1]))}

                                    {activeTipTab === 'silhouette' && (showSilhouette ? (
                                        <div className="pokepuzzle-tip-card">
                                            {isLoadingDetails ? <span className="pokepuzzle-tip-pending">…</span> : (
                                                <img
                                                    src={targetDetails.image || getPokemonArtworkSpriteUrl(targetDetails.id)}
                                                    alt=""
                                                    width="48"
                                                    height="48"
                                                    className="pokepuzzle-tip-silhouette pokepuzzle-silhouette"
                                                />
                                            )}
                                        </div>
                                    ) : renderLockedTip(tipTabs[2]))}
                                </div>
                            </section>

                            {/* Game Letter Board Grid */}
                            <section
                                className="pokepuzzle-grid"
                                style={{ '--length': targetLength }}
                                role="grid"
                                aria-label={t('games.board')}
                            >
                                {gridRows.map((row, rowIdx) => (
                                    <div
                                        key={rowIdx}
                                        ref={row.submitted ? undefined : activeRowRef}
                                        className={`pokepuzzle-row ${row.submitted ? '' : 'is-active'}`}
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
                                                    className={`pokepuzzle-tile ${hasLtr ? 'has-letter' : ''}  ${row.submitted && status === 'correct' ? 'is-correct' :
                                                        row.submitted && status === 'present' ? 'is-present' :
                                                            row.submitted && status === 'absent' ? 'is-absent' : ''
                                                        }  ${isSelected ? 'is-selected-cell' : ''}  ${!row.submitted ? 'is-active-row' : ''}`}
                                                    role="gridcell"
                                                    onClick={() => {
                                                        if (!row.submitted) {
                                                            setSelectedCharIdx(letterIdx);
                                                            // inputMode="none" keeps the phone's own
                                                            // keyboard shut: the tray below is the keyboard.
                                                            inputRef.current?.focus({ preventScroll: true });
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

                            {/* Colour legend: needed to read the first result, noise after it. */}
                            {gameStatus === 'IN_PROGRESS' && guesses.length === 0 && (
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

                            {/* Keyboard tray: sticky over the board, so it never sinks
                                under the dock or below the fold as guesses pile up.
                                The tiles are the display; the input only exists for
                                focus and assistive tech, so it is visually hidden. */}
                            {gameStatus === 'IN_PROGRESS' && (
                                <div className="pokepuzzle-tray" ref={trayRef}>
                                    <div className="pokepuzzle-tray-pop">
                                        <p className="pokepuzzle-tray-message" role="status" aria-live="polite">{invalidMessage}</p>
                                        {inputValue.trim() && suggestions.length > 0 && (
                                            <div
                                                className="pokepuzzle-autocomplete-list custom-scrollbar"
                                                ref={autocompleteContainerRef}
                                                role="listbox"
                                                aria-label={t('games.guessInput')}
                                            >
                                                {suggestions.map((p, idx) => (
                                                    <button
                                                        type="button"
                                                        role="option"
                                                        aria-selected={idx === activeSuggestionIdx}
                                                        key={p.id}
                                                        onClick={() => handleSelectSuggestion(p)}
                                                        className={`pokepuzzle-autocomplete-item ${idx === activeSuggestionIdx ? 'is-active' : ''}`}
                                                    >
                                                        <span>{p.displayName}</span>
                                                        <span className="pokepuzzle-autocomplete-id">#{String(p.id).padStart(3, '0')}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <input
                                        ref={inputRef}
                                        type="text"
                                        inputMode="none"
                                        autoComplete="off"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        value={inputValue}
                                        onChange={(e) => {
                                            const val = e.target.value.toLowerCase();
                                            let clean = val.replace(/[^a-z ]/g, '');
                                            clean = clean.length > targetLength
                                                ? clean.slice(0, targetLength)
                                                : clean.padEnd(targetLength, ' ');
                                            setInputValue(clean);
                                            setSelectedCharIdx(prev => Math.min(targetLength - 1, prev + 1));
                                        }}
                                        className="sr-only"
                                        aria-label={t('games.guessInput')}
                                    />

                                    <section className="pokepuzzle-keyboard" aria-label={t('games.keyboard')}>
                                        {KEYBOARD_ROWS.map((row, rowIdx) => (
                                            <div key={rowIdx} className="pokepuzzle-keyboard-row">
                                                {row.map(key => {
                                                    const status = keyboardStatusMap[key];
                                                    const isWide = key === 'enter' || key === 'backspace';
                                                    const label = key === 'backspace'
                                                        ? <Delete aria-hidden="true" />
                                                        : key === 'enter'
                                                            ? <CornerDownLeft aria-hidden="true" />
                                                            : key;

                                                    return (
                                                        <button
                                                            type="button"
                                                            key={key}
                                                            onClick={() => handleKeyClick(key)}
                                                            aria-label={key === 'enter' ? t('games.enterKey') : key === 'backspace' ? t('games.backspaceKey') : undefined}
                                                            className={`pokepuzzle-key ${isWide ? 'is-wide' : ''}  ${status === 'correct' ? 'is-correct' :
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
                                </div>
                            )}
                        </div>

                        {/* Result: one next step, one share. */}
                        {gameStatus !== 'IN_PROGRESS' && (
                            <div className="pokepuzzle-game-sidebar">
                                <section ref={resultRef} className="pokepuzzle-result-card" aria-labelledby="pokepuzzle-result-title">
                                    <div className={`pokepuzzle-result-badge ${isWon ? 'is-win' : 'is-lose'}`} aria-hidden="true">
                                        {isWon ? <Award /> : <Frown />}
                                    </div>

                                    <h2 id="pokepuzzle-result-title" className={`pokepuzzle-result-title ${isWon ? 'is-win' : 'is-lose'}`}>
                                        {isWon ? t('pokepuzzle.winTitle') : t('pokepuzzle.loseTitle')}
                                    </h2>

                                    <div className="pokepuzzle-result-sprite-box">
                                        <img
                                            src={targetDetails.image || getPokemonArtworkSpriteUrl(targetPokemon.id)}
                                            alt={formatPokemonDisplayName(targetPokemon.name)}
                                            width="85"
                                            height="85"
                                            className="pokepuzzle-result-sprite pokepuzzle-revealed sprite-fade"
                                            onError={(e) => { e.currentTarget.src = getPokemonFrontSpriteUrl(targetPokemon.id); }}
                                        />
                                    </div>

                                    <h3 className="pokepuzzle-result-pokemon-name">
                                        <DecryptText text={formatPokemonDisplayName(targetPokemon.name)} play={solvedNow && isWon} />
                                    </h3>

                                    {!isLoadingDetails && targetTypes.length > 0 && (
                                        <div className="pokepuzzle-result-types">
                                            {targetTypes.map(type => <TypeChip key={type} type={type} size="sm" />)}
                                        </div>
                                    )}

                                    <p className="pokepuzzle-result-text">
                                        {isWon
                                            ? t('pokepuzzle.winMessage', { name: formatPokemonDisplayName(targetPokemon.name), attempts: guesses.length })
                                            : t('pokepuzzle.loseMessage', { name: formatPokemonDisplayName(targetPokemon.name) })
                                        }
                                    </p>

                                    {mode === 'daily' && guesses.length > 0 && (
                                        <div className="pokepuzzle-share-preview">
                                            <span className="pokepuzzle-share-preview-label">{t('games.yourGuesses')}</span>
                                            <div className="pokepuzzle-share-preview-rows">
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
                                    )}

                                    {/* After a daily win: the one moment "come back tomorrow" is worth asking. */}
                                    <ReminderOffer topic="puzzle" active={mode === 'daily' && isWon} />

                                    {/* Sharing leads (2026-10-24, Enzo): the forum post is the
                                        one action, the link and the image sit under it as equals,
                                        and playing on comes last. Same order in both modes. */}
                                    <div className="pokepuzzle-result-actions">
                                        <button type="button" onClick={handleShareToForum} className="btn btn-primary btn-lg btn-block">
                                            <MessageSquare aria-hidden="true" />
                                            {t('games.postToForum')}
                                        </button>
                                        <div className="pokepuzzle-result-pair">
                                            <button type="button" onClick={handleShare} className="btn btn-secondary">
                                                <Share2 aria-hidden="true" />
                                                {t('games.share')}
                                            </button>
                                            <button type="button" onClick={handleShareImage} className="btn btn-secondary">
                                                <Image aria-hidden="true" />
                                                {t('games.shareImage')}
                                            </button>
                                        </div>
                                        {mode === 'daily' ? (
                                            <button type="button" onClick={() => setMode('ongoing')} className="btn btn-ghost btn-block">
                                                <RefreshIcon />
                                                {t('games.playFreeMode')}
                                            </button>
                                        ) : (
                                            <button type="button" onClick={startRandomOngoingGame} className="btn btn-ghost btn-block">
                                                <RefreshIcon />
                                                {t('pokepuzzle.playAgain')}
                                            </button>
                                        )}
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {isHistoryOpen && (
                <GameHistoryDialog
                    title={t('games.puzzleHistory')}
                    onClose={() => setIsHistoryOpen(false)}
                    onScroll={handleHistoryScroll}
                >
                    {allowedPool.length === 0 ? (
                        <Loader size="sm" label={t('games.loadingData')} block />
                    ) : (
                        <ul className="game-history__list">
                            {pastDates
                                .filter((dateStr) => !historyDeletes.hidden.has(dateStr))
                                .slice(0, visibleHistoryLimit)
                                .map((dateStr) => {
                                    const saved = historyByDate.get(dateStr) || null;
                                    const itemStatus = saved?.gameStatus || 'NOT_PLAYED'; // NOT_PLAYED, IN_PROGRESS, WON, LOST
                                    const pokemon = allowedPool[getDailyPokemonIndex(dateStr, allowedPool)];
                                    const isCompleted = itemStatus === 'WON' || itemStatus === 'LOST';
                                    const openDay = () => {
                                        setMode('daily');
                                        setSelectedDate(dateStr);
                                        setIsHistoryOpen(false);
                                    };

                                    return (
                                        <li key={dateStr} className="game-history__item">
                                            <img
                                                src={isCompleted
                                                    ? getPokemonArtworkSpriteUrl(pokemon.id)
                                                    : getPokemonFrontSpriteUrl(pokemon.id)
                                                }
                                                alt=""
                                                width="40"
                                                height="40"
                                                loading="lazy"
                                                className={`game-history__sprite ${!isCompleted ? 'is-mystery' : ''}`}
                                                onError={(e) => { e.currentTarget.src = getPokemonFrontSpriteUrl(pokemon.id); }}
                                            />
                                            <div className="game-history__main">
                                                <div className="game-history__heading">
                                                    <span className="game-history__title">{dateStr}</span>
                                                    {saved && (
                                                        <span className={`game-history__badge ${isCompleted ? 'is-complete' : 'is-progress'}`}>
                                                            {itemStatus === 'WON'
                                                                ? t('games.statusSolved')
                                                                : itemStatus === 'LOST'
                                                                    ? t('games.statusFailed')
                                                                    : t('games.statusInProgress')}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="game-history__meta">
                                                    {isCompleted
                                                        ? `${formatPokemonDisplayName(pokemon.name)} · #${String(pokemon.id).padStart(3, '0')}`
                                                        : `??? · ${t('games.letters', { count: normalizeNameForGame(pokemon.name).length })}`}
                                                </span>
                                            </div>
                                            <div className="game-history__actions">
                                                <button type="button" onClick={openDay} className="btn btn-secondary btn-sm">
                                                    {itemStatus === 'IN_PROGRESS'
                                                        ? t('games.continue')
                                                        : isCompleted ? t('games.viewResult') : t('games.play')}
                                                </button>
                                                {saved && (
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteHistoryRun(dateStr)}
                                                        className="btn btn-ghost btn-muted btn-sm btn-icon"
                                                        aria-label={t('games.deleteProgress')}
                                                        title={t('games.deleteProgress')}
                                                    >
                                                        <CloseIcon />
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                        </ul>
                    )}
                </GameHistoryDialog>
            )}
        </>
    );
}
