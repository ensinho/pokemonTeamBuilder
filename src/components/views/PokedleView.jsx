import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useToastStore } from '../../store/useToastStore';
import { useThemeStore } from '../../store/useThemeStore';
import {
    loadPokemonIndex,
    getPokemonApiData,
    getPokemonSpeciesData,
    normalizePokemonQuizInput
} from '../../services/pokemonDataCache';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { PokeballIcon, StarsIcon, SparklesIcon, RefreshIcon } from '../icons';
import { Lock, PartyPopper, Frown, Sparkles, Award, FileText, Layers, Image, Delete, CornerDownLeft, Share2 } from 'lucide-react';
import '../../styles/pokedle-view.css';

// Constants
const MAX_ATTEMPTS = 8;
const ALLOWED_MAX_ID = 1025; // National Dex standard pool

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

// Helper to blank out the Pokémon name in its pokedex entry description
const hidePokemonName = (text, name) => {
    if (!text || !name) return '';
    const normalizedName = normalizeNameForGame(name);
    // Escape target name for regex
    const escaped = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex1 = new RegExp(`\\b${escaped}(s)?\\b`, 'gi');
    let cleanedText = text.replace(regex1, '______');

    // Also catch normalized matches just in case
    if (normalizedName && normalizedName.length > 2) {
        const regex2 = new RegExp(`\\b${normalizedName}(s)?\\b`, 'gi');
        cleanedText = cleanedText.replace(regex2, '______');
    }
    return cleanedText;
};

// Seeded daily index selector
const getDailyPokemonIndex = (poolLength) => {
    if (poolLength <= 0) return 0;
    const now = new Date();
    const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % poolLength;
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

export default function PokedleView() {
    const { t, language } = useTranslation();
    const showToast = useToastStore(state => state.showToast);
    const { colors } = useThemeStore();
    const navigate = useNavigate();

    // Mode: 'daily' or 'ongoing'
    const [mode, setMode] = useState('daily');

    // Active tip tab: 'description', 'types', 'silhouette'
    const [activeTipTab, setActiveTipTab] = useState('description');

    // Game data pools
    const [pokemonIndex, setPokemonIndex] = useState([]);
    const [allowedPool, setAllowedPool] = useState([]); // Filtered to standard pokemon (IDs 1-1025)
    const [isLoadingIndex, setIsLoadingIndex] = useState(true);

    // Active target details
    const [targetPokemon, setTargetPokemon] = useState(null);
    const [targetDetails, setTargetDetails] = useState({ types: [], description: '', image: '', id: 0 });
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Current Game Progress states
    const [guesses, setGuesses] = useState([]); // Normalized guesses strings
    const [gameStatus, setGameStatus] = useState('IN_PROGRESS'); // IN_PROGRESS, WON, LOST

    // Input autocomplete suggestions
    const [inputValue, setInputValue] = useState('');
    const currentGuessLetters = useMemo(() => inputValue.split(''), [inputValue]);
    const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);
    const autocompleteContainerRef = useRef(null);

    // Countdown state for next daily
    const [nextDailyCountdown, setNextDailyCountdown] = useState('');

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
                console.error("Failed to load Pokedle Pokémon list:", err);
                showToast("Failed to load Pokémon list", "error");
            } finally {
                setIsLoadingIndex(false);
            }
        };
        fetchIndex();
    }, [showToast]);

    // Handle game mode changes & initialize games
    useEffect(() => {
        if (allowedPool.length === 0) return;

        if (mode === 'daily') {
            const now = new Date();
            const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
            const dailyIdx = getDailyPokemonIndex(allowedPool.length);
            const dailyPokemon = allowedPool[dailyIdx];

            // Load Daily state from localStorage
            const savedState = localStorage.getItem(`ptb:pokedle:daily:${dateString}`);
            if (savedState) {
                try {
                    const parsed = JSON.parse(savedState);
                    setTargetPokemon(dailyPokemon);
                    setGuesses(parsed.guesses || []);
                    setGameStatus(parsed.gameStatus || 'IN_PROGRESS');
                    setInputValue('');
                } catch (e) {
                    console.error("Failed to parse daily state:", e);
                    initNewGame(dailyPokemon);
                }
            } else {
                initNewGame(dailyPokemon);
            }
        } else {
            // Ongoing mode load from localStorage
            const savedState = localStorage.getItem('ptb:pokedle:ongoing');
            if (savedState) {
                try {
                    const parsed = JSON.parse(savedState);
                    const foundTarget = allowedPool.find(p => p.id === parsed.targetId);
                    if (foundTarget) {
                        setTargetPokemon(foundTarget);
                        setGuesses(parsed.guesses || []);
                        setGameStatus(parsed.gameStatus || 'IN_PROGRESS');
                        setInputValue('');
                        return;
                    }
                } catch (e) {
                    console.error("Failed to parse ongoing state:", e);
                }
            }
            // If no saved state, start random
            startRandomOngoingGame();
        }
    }, [mode, allowedPool]);

    // Save state changes to LocalStorage
    useEffect(() => {
        if (!targetPokemon) return;

        if (mode === 'daily') {
            const now = new Date();
            const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
            const stateToSave = {
                guesses,
                gameStatus,
                targetId: targetPokemon.id
            };
            localStorage.setItem(`ptb:pokedle:daily:${dateString}`, JSON.stringify(stateToSave));

            // Also broadcast state back to HomeView so it stays in sync
            localStorage.setItem(`ptb:pokedle:daily:summary`, JSON.stringify({
                solved: gameStatus === 'WON',
                attempts: guesses.length,
                date: dateString
            }));
        } else {
            const stateToSave = {
                guesses,
                gameStatus,
                targetId: targetPokemon.id
            };
            localStorage.setItem('ptb:pokedle:ongoing', JSON.stringify(stateToSave));
        }
    }, [guesses, gameStatus, targetPokemon, mode]);

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

    // Fetch Details for target Pokémon (Pokedex entry & Types) when guess progresses
    useEffect(() => {
        if (!targetPokemon) return;

        const fetchTargetDetails = async () => {
            setIsLoadingDetails(true);
            try {
                const [apiData, speciesData] = await Promise.all([
                    getPokemonApiData(targetPokemon.id),
                    getPokemonSpeciesData(targetPokemon.id)
                ]);

                if (apiData && speciesData) {
                    const types = apiData.types.map(t => t.type.name);
                    const descriptionEntry = speciesData.flavor_text_entries?.find(
                        entry => entry.language?.name === language
                    ) || speciesData.flavor_text_entries?.find(
                        entry => entry.language?.name === 'en'
                    );

                    const rawDesc = descriptionEntry?.flavor_text || '';
                    const cleanedDesc = rawDesc.replace(/[\n\f\r]/g, ' ');

                    setTargetDetails({
                        types,
                        description: hidePokemonName(cleanedDesc, targetPokemon.name),
                        image: getPokemonArtworkSpriteUrl(targetPokemon.id),
                        id: targetPokemon.id
                    });
                }
            } catch (err) {
                console.error("Failed to fetch target details:", err);
            } finally {
                setIsLoadingDetails(false);
            }
        };

        fetchTargetDetails();
    }, [targetPokemon, language]);

    // Daily countdown updater
    useEffect(() => {
        const updateCountdown = () => {
            const now = new Date();
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
    }, []);

    // Initializer for a clean game
    const initNewGame = (pokemon) => {
        setTargetPokemon(pokemon);
        setGuesses([]);
        setGameStatus('IN_PROGRESS');
        setInputValue('');
    };

    // Ongoing mode: Pick random Pokémon and start
    const startRandomOngoingGame = () => {
        if (allowedPool.length === 0) return;
        const randomIdx = Math.floor(Math.random() * allowedPool.length);
        initNewGame(allowedPool[randomIdx]);
    };

    // Target name normalized & its length
    const targetNormalized = useMemo(() => {
        if (!targetPokemon) return '';
        return normalizeNameForGame(targetPokemon.name);
    }, [targetPokemon]);

    const targetLength = targetNormalized.length;

    // Suggestions matching target length & prefix
    const suggestions = useMemo(() => {
        if (!targetPokemon || allowedPool.length === 0) return [];
        const prefix = normalizePokemonQuizInput(inputValue);

        // Do not show autocomplete unless at least 80% of the name is typed
        if (prefix.length < targetLength * 0.8) {
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
                // Prefix check if input has text
                if (prefix) {
                    return p.name.toLowerCase().startsWith(prefix) || p.normalized.startsWith(prefix);
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
            setInputValue(prev => prev.slice(0, -1));
        } else if (key === 'enter') {
            submitCurrentGuess();
        } else {
            // Type a letter
            if (inputValue.length < targetLength) {
                const char = key.toLowerCase();
                setInputValue(prev => prev + char);
            }
        }
    }, [inputValue, targetLength, gameStatus]);

    // Submission check & processing
    const submitCurrentGuess = () => {
        if (gameStatus !== 'IN_PROGRESS') return;

        const guessStr = inputValue;
        if (guessStr.length !== targetLength) {
            showToast(t('pokedle.guessNotValidLength', { length: targetLength }), 'warning');
            return;
        }

        // Find the matched Pokémon in our allowed pool
        const matched = allowedPool.find(p => {
            const norm = normalizeNameForGame(p.name);
            return norm === guessStr;
        });

        if (!matched) {
            showToast(t('pokedle.guessNotValidPokemon'), 'warning');
            return;
        }

        const nextGuesses = [...guesses, matched.name];
        setGuesses(nextGuesses);
        setInputValue('');

        // Check Win
        if (guessStr === targetNormalized) {
            setGameStatus('WON');
            showToast(t('pokedle.winTitle'), 'success');
            return;
        }

        // Check Lose
        if (nextGuesses.length >= MAX_ATTEMPTS) {
            setGameStatus('LOST');
            showToast(t('pokedle.loseTitle'), 'error');
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

            const isInputFocused = e.target.tagName === 'INPUT';
            const key = e.key.toLowerCase();

            // Typing letters
            if (/^[a-z]$/.test(key)) {
                if (isInputFocused) return; // Native input handles typing
                if (currentGuessLetters.length < targetLength) {
                    setInputValue(prev => prev + key);
                }
                return;
            }

            if (e.key === 'Backspace') {
                if (isInputFocused) return; // Native input handles backspace
                setInputValue(prev => prev.slice(0, -1));
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                // If autocomplete list is active, pick active suggestion
                if (suggestions.length > 0) {
                    const selected = suggestions[activeSuggestionIdx];
                    if (selected) {
                        const norm = normalizeNameForGame(selected.name);
                        setInputValue(norm);
                        // Clear autocomplete state by submitting
                        setTimeout(() => {
                            const nextGuesses = [...guesses, selected.name];
                            setGuesses(nextGuesses);
                            setInputValue('');
                            if (norm === targetNormalized) {
                                setGameStatus('WON');
                                showToast(t('pokedle.winTitle'), 'success');
                            } else if (nextGuesses.length >= MAX_ATTEMPTS) {
                                setGameStatus('LOST');
                                showToast(t('pokedle.loseTitle'), 'error');
                            }
                        }, 50);
                    }
                } else {
                    submitCurrentGuess();
                }
                return;
            }

            // Arrow keys for autocomplete suggestions navigation
            if (e.key === 'ArrowDown' && suggestions.length > 0) {
                e.preventDefault();
                setActiveSuggestionIdx(prev => (prev + 1) % suggestions.length);
            }
            if (e.key === 'ArrowUp' && suggestions.length > 0) {
                e.preventDefault();
                setActiveSuggestionIdx(prev => (prev - 1 + suggestions.length) % suggestions.length);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [inputValue, targetLength, gameStatus, suggestions, activeSuggestionIdx, guesses, targetNormalized, allowedPool, showToast, t]);

    // Click suggestion callback
    const handleSelectSuggestion = (pokemon) => {
        const norm = normalizeNameForGame(pokemon.name);
        setInputValue(norm);

        // Submit
        setTimeout(() => {
            const nextGuesses = [...guesses, pokemon.name];
            setGuesses(nextGuesses);
            setInputValue('');

            if (norm === targetNormalized) {
                setGameStatus('WON');
                showToast(t('pokedle.winTitle'), 'success');
            } else if (nextGuesses.length >= MAX_ATTEMPTS) {
                setGameStatus('LOST');
                showToast(t('pokedle.loseTitle'), 'error');
            }
        }, 50);
    };

    // Calculate dynamic rows on Pokedle grid
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
            const activeRowLetters = [...currentGuessLetters];
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
    const showPokedexEntry = guesses.length >= 3 || gameStatus !== 'IN_PROGRESS';
    const showTypes = guesses.length >= 5 || gameStatus !== 'IN_PROGRESS';
    const showSilhouette = guesses.length >= 7 || gameStatus !== 'IN_PROGRESS';

    // Renders custom Type badges
    const typeColors = {
        normal: '#A8A77A',
        fire: '#EE8130',
        water: '#6390F0',
        electric: '#F7D02C',
        grass: '#7AC74C',
        ice: '#96D9D6',
        fighting: '#C22E28',
        poison: '#A33EA1',
        ground: '#E2BF65',
        flying: '#A98FF3',
        psychic: '#F95587',
        bug: '#A6B91A',
        rock: '#B6A136',
        ghost: '#735797',
        dragon: '#6F35FC',
        dark: '#705746',
        steel: '#B7B7D0',
        fairy: '#D685AD',
    };

    const host = typeof window !== 'undefined' ? window.location.host : 'poketeambuilder.com';
    const primaryType = targetDetails.types?.[0] || 'normal';
    const typeColor = typeColors[primaryType] || '#71717a';
    const typeGlowColor = `${typeColor}40`; // 25% opacity for hex glow

    const generateShareText = () => {
        const modeTitle = mode === 'daily' 
            ? `${language === 'pt' ? 'Pokedle Diário' : 'Daily Pokedle'}` 
            : `${language === 'pt' ? 'Pokedle Livre' : 'Ongoing Pokedle'}`;
        
        const emojiGrid = guesses.map(guess => {
            const norm = normalizeNameForGame(guess);
            const letterStatuses = checkLetters(norm, targetNormalized);
            return letterStatuses.map(status => {
                if (status === 'correct') return '🟩';
                if (status === 'present') return '🟨';
                return '⬛';
            }).join('');
        }).join('\n');

        const shareUrl = typeof window !== 'undefined' ? window.location.origin + '/pokedle' : 'https://poketeambuilder.com/pokedle';
        
        return `Pokedle - ${modeTitle} ${guesses.length}/${MAX_ATTEMPTS}\n\n${emojiGrid}\n\nPlay here: ${shareUrl}`;
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
            
            // 1. Background
            ctx.fillStyle = '#121214';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw a subtle radial glow in the center matching target type
            const grad = ctx.createRadialGradient(200, 240, 20, 200, 240, 200);
            grad.addColorStop(0, typeGlowColor);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw border
            ctx.strokeStyle = typeColor;
            ctx.lineWidth = 4;
            ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
            
            // 2. Title Header
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('POKEDLE', 200, 50);
            
            ctx.fillStyle = '#8f93a2';
            ctx.font = '14px sans-serif';
            const modeText = mode === 'daily' 
                ? (language === 'pt' ? 'Desafio Diário' : 'Daily Challenge')
                : (language === 'pt' ? 'Modo Livre' : 'Ongoing Mode');
            ctx.fillText(`${modeText} • ${guesses.length}/${MAX_ATTEMPTS} ${language === 'pt' ? 'tentativas' : 'tries'}`, 200, 75);
            
            // Load and draw target Pokémon artwork
            const artworkUrl = targetDetails.image || getPokemonArtworkSpriteUrl(targetPokemon.id);
            const loadImg = (url) => new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Failed to load image: ' + url));
                img.src = url;
            });
            
            let artworkImg;
            try {
                artworkImg = await loadImg(artworkUrl);
            } catch (err) {
                try {
                    artworkImg = await loadImg(getPokemonFrontSpriteUrl(targetPokemon.id));
                } catch (e) {
                    console.error("Could not load artwork for canvas share", e);
                }
            }
            
            if (artworkImg) {
                // Draw a nice container box background for artwork
                ctx.fillStyle = '#1e1e24';
                ctx.beginPath();
                ctx.roundRect(125, 100, 150, 150, 20);
                ctx.fill();
                ctx.strokeStyle = '#2d2d34';
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // Draw artwork
                ctx.drawImage(artworkImg, 135, 110, 130, 130);
            }
            
            // 3. Pokémon Name
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText(formatPokemonDisplayName(targetPokemon.name), 200, 285);
            
            // Target Type caps text
            ctx.fillStyle = typeColor;
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(targetDetails.types.join(' / ').toUpperCase(), 200, 310);
            
            // Result Message
            ctx.fillStyle = '#a6accd';
            ctx.font = '13px sans-serif';
            const msg = gameStatus === 'WON' 
                ? (language === 'pt' ? `Acertou em ${guesses.length} tentativas!` : `Guessed correctly in ${guesses.length} attempts!`)
                : (language === 'pt' ? `Não foi dessa vez!` : `Could not solve this time!`);
            ctx.fillText(msg, 200, 335);
            
            // 4. Attempts Grid
            const squareSize = 16;
            const gap = 5;
            const rowWidth = targetLength * squareSize + (targetLength - 1) * gap;
            const startX = (canvas.width - rowWidth) / 2;
            let startY = 365;
            
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
                        ctx.fillStyle = '#2d2d34';
                    }
                    
                    ctx.beginPath();
                    ctx.roundRect(x, startY, squareSize, squareSize, 3);
                    ctx.fill();
                });
                startY += squareSize + gap;
            });
            
            // 5. QR Code and Link footer
            const footerY = 520;
            ctx.strokeStyle = '#2d2d34';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(30, footerY);
            ctx.lineTo(370, footerY);
            ctx.stroke();
            
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin + '/pokedle')}`;
            let qrImg;
            try {
                qrImg = await loadImg(qrUrl);
            } catch (err) {
                console.error("Failed to load QR code for canvas", err);
            }
            
            if (qrImg) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.roundRect(50, footerY + 15, 80, 80, 8);
                ctx.fill();
                ctx.drawImage(qrImg, 55, footerY + 20, 70, 70);
            }
            
            ctx.textAlign = 'left';
            ctx.fillStyle = '#8f93a2';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(language === 'pt' ? 'ESCANEIE PARA JOGAR' : 'SCAN TO PLAY', 150, footerY + 45);
            
            ctx.fillStyle = '#7c3aed';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(host + '/pokedle', 150, footerY + 65);
            
            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error('Canvas toBlob failed');
                const file = new File([blob], 'pokedle-result.png', { type: 'image/png' });
                
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'Pokedle Results',
                            text: language === 'pt' ? 'Confira meu resultado no Pokedle!' : 'Check out my Pokedle result!',
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
                link.download = `pokedle-${targetPokemon.name}-${guesses.length}.png`;
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
        <main className={`pokedle-view ${gameStatus !== 'IN_PROGRESS' ? 'has-ended' : ''}`}>
            {/* Mode Switcher Tabs */}
            <div className="pokedle-tabs">
                <button
                    onClick={() => setMode('daily')}
                    className={`pokedle-tab-btn ${mode === 'daily' ? 'is-active' : ''}`}
                >
                    {t('pokedle.dailyTab')}
                </button>
                <button
                    onClick={() => setMode('ongoing')}
                    className={`pokedle-tab-btn ${mode === 'ongoing' ? 'is-active' : ''}`}
                >
                    {t('pokedle.ongoingTab')}
                </button>
            </div>

            {/* Header countdown timer for Daily challenge */}
            {mode === 'daily' && gameStatus !== 'IN_PROGRESS' && (
                <div className="pokedle-header-countdown animate-fade-in">
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                        {language === 'pt' ? 'PRÓXIMO POKÉMON EM' : 'NEXT DAILY POKÉMON IN'}
                    </span>
                    <span className="pokedle-header-countdown-time">{nextDailyCountdown}</span>
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
                <div className={`pokedle-game-container ${gameStatus !== 'IN_PROGRESS' ? 'has-ended' : ''}`}>
                    <div className="pokedle-game-main">
                        {/* Tips / Clues Section */}
                        <section className="pokedle-tips-container">
                            <div className="pokedle-tips-header">
                                <h3 className="pokedle-tips-title">
                                    <SparklesIcon className="w-4 h-4 text-accent" />
                                    <span>{language === 'pt' ? 'Serviço de Dicas' : 'Tips Service'}</span>
                                </h3>
                                <span className="text-[10px] uppercase font-bold text-muted bg-surface-raised border border-border px-2 py-0.5 rounded">
                                    {guesses.length} / {MAX_ATTEMPTS} {language === 'pt' ? 'tentativas' : 'tries'}
                                </span>
                            </div>
                            {/* Horizontal tabs for tips */}
                            <div className="pokedle-tip-tabs">
                                <button
                                    type="button"
                                    onClick={() => showPokedexEntry && setActiveTipTab('description')}
                                    className={`pokedle-tip-tab-trigger ${activeTipTab === 'description' ? 'is-active' : ''} ${!showPokedexEntry ? 'is-locked' : ''}`}
                                    disabled={!showPokedexEntry}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>{language === 'pt' ? 'Descrição' : 'Description'}</span>
                                    {!showPokedexEntry && <Lock className="w-3 h-3 text-muted shrink-0" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => showTypes && setActiveTipTab('types')}
                                    className={`pokedle-tip-tab-trigger ${activeTipTab === 'types' ? 'is-active' : ''} ${!showTypes ? 'is-locked' : ''}`}
                                    disabled={!showTypes}
                                >
                                    <Layers className="w-3.5 h-3.5" />
                                    <span>{language === 'pt' ? 'Tipos' : 'Types'}</span>
                                    {!showTypes && <Lock className="w-3 h-3 text-muted shrink-0" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => showSilhouette && setActiveTipTab('silhouette')}
                                    className={`pokedle-tip-tab-trigger ${activeTipTab === 'silhouette' ? 'is-active' : ''} ${!showSilhouette ? 'is-locked' : ''}`}
                                    disabled={!showSilhouette}
                                >
                                    <Image className="w-3.5 h-3.5" />
                                    <span>{language === 'pt' ? 'Silhueta' : 'Silhouette'}</span>
                                    {!showSilhouette && <Lock className="w-3 h-3 text-muted shrink-0" />}
                                </button>
                            </div>

                            {/* Active tip card content */}
                            <div className="pokedle-tip-card-wrapper w-full">
                                {activeTipTab === 'description' && (
                                    <div className={`pokedle-tip-card ${!showPokedexEntry ? 'is-locked' : ''}`}>
                                        <span className="pokedle-tip-label">{t('pokedle.tipEntry')}</span>
                                        {showPokedexEntry ? (
                                            <div className="pokedle-tip-content pokedle-tip-description-text custom-scrollbar">
                                                {isLoadingDetails ? '...' : targetDetails.description || 'No description found.'}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted font-medium flex items-center gap-1.5 justify-center">
                                                <Lock className="w-3.5 h-3.5" /> {t('pokedle.tipLocked')}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {activeTipTab === 'types' && (
                                    <div className={`pokedle-tip-card ${!showTypes ? 'is-locked' : ''}`}>
                                        <span className="pokedle-tip-label">{t('pokedle.tipTypes')}</span>
                                        {showTypes ? (
                                            <div className="pokedle-tip-content pokedle-clue-types">
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
                                            <span className="text-xs text-muted font-medium flex items-center gap-1.5 justify-center">
                                                <Lock className="w-3.5 h-3.5" /> {t('pokedle.tipLocked')}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {activeTipTab === 'silhouette' && (
                                    <div className={`pokedle-tip-card ${!showSilhouette ? 'is-locked' : ''}`}>
                                        <span className="pokedle-tip-label">{t('pokedle.tipSilhouette')}</span>
                                        {showSilhouette ? (
                                            <div className="pokedle-tip-content flex justify-center">
                                                {isLoadingDetails ? '...' : (
                                                    <img
                                                        src={targetDetails.image || getPokemonArtworkSpriteUrl(targetDetails.id)}
                                                        alt="Silhouette tip"
                                                        className="w-12 h-12 object-contain pokedle-silhouette animate-pulse"
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted font-medium flex items-center gap-1.5 justify-center">
                                                <Lock className="w-3.5 h-3.5" /> {t('pokedle.tipLocked')}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Game Letter Board Grid */}
                        <section
                            className="pokedle-grid"
                            style={{ '--length': targetLength }}
                            role="grid"
                            aria-label="Wordle guess board"
                        >
                            {gridRows.map((row, rowIdx) => (
                                <div
                                    key={rowIdx}
                                    className="pokedle-row"
                                    style={{ gridTemplateColumns: `repeat(${targetLength}, minmax(0, 1fr))` }}
                                    role="row"
                                >
                                    {row.letters.map((letter, letterIdx) => {
                                        const status = row.statuses[letterIdx];
                                        const hasLtr = letter !== '';

                                        return (
                                            <div
                                                key={letterIdx}
                                                className={`pokedle-tile ${hasLtr ? 'has-letter' : ''} ${
                                                    row.submitted && status === 'correct' ? 'is-correct' :
                                                    row.submitted && status === 'present' ? 'is-present' :
                                                    row.submitted && status === 'absent' ? 'is-absent' : ''
                                                }`}
                                                role="gridcell"
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
                            <div className="pokedle-guide-box">
                                <div className="pokedle-guide-item">
                                    <span className="pokedle-guide-dot correct" />
                                    <span>{t('pokedle.letterCorrect')}</span>
                                </div>
                                <div className="pokedle-guide-item">
                                    <span className="pokedle-guide-dot present" />
                                    <span>{t('pokedle.letterPresent')}</span>
                                </div>
                                <div className="pokedle-guide-item">
                                    <span className="pokedle-guide-dot absent" />
                                    <span>{t('pokedle.letterAbsent')}</span>
                                </div>
                            </div>
                        )}

                        {/* Autocomplete Input Panel */}
                        {gameStatus === 'IN_PROGRESS' && (
                            <div className="pokedle-input-container mt-4">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => {
                                        const clean = e.target.value.toLowerCase().replace(/[^a-z]/g, '');
                                        if (clean.length <= targetLength) {
                                            setInputValue(clean);
                                        }
                                    }}
                                    placeholder={t('pokedle.guessPlaceholder')}
                                    className="input-clean"
                                    aria-label="Type Pokémon name"
                                />

                                {/* Dropdown list */}
                                {inputValue.trim() && suggestions.length > 0 && (
                                    <div className="pokedle-autocomplete-list custom-scrollbar" ref={autocompleteContainerRef}>
                                        {suggestions.map((p, idx) => (
                                            <div
                                                key={p.id}
                                                onClick={() => handleSelectSuggestion(p)}
                                                className={`pokedle-autocomplete-item ${idx === activeSuggestionIdx ? 'is-active' : ''}`}
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
                            <section className="pokedle-keyboard" aria-label="Virtual keyboard">
                                {KEYBOARD_ROWS.map((row, rowIdx) => (
                                    <div key={rowIdx} className="pokedle-keyboard-row">
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
                                                    className={`pokedle-key ${isWide ? 'is-wide' : ''} ${
                                                        status === 'correct' ? 'is-correct' :
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
                        <div className="pokedle-game-sidebar">
                            <section
                                className="pokedle-result-card"
                                style={{
                                    '--type-color': typeColor,
                                    '--type-glow-color': typeGlowColor
                                }}
                            >
                                <div className="pokedle-result-badge-wrapper">
                                    {gameStatus === 'WON' ? (
                                        <div className="pokedle-badge-success-glow">
                                            <Award className="w-6 h-6 text-success" />
                                        </div>
                                    ) : (
                                        <div className="pokedle-badge-danger-glow">
                                            <Frown className="w-6 h-6 text-danger" />
                                        </div>
                                    )}
                                </div>

                                <h2 className={`pokedle-result-title ${gameStatus === 'WON' ? 'is-win' : 'is-lose'}`}>
                                    {gameStatus === 'WON' ? t('pokedle.winTitle') : t('pokedle.loseTitle')}
                                </h2>

                                <div className="pokedle-result-sprite-box">
                                    <img
                                        src={targetDetails.image || getPokemonArtworkSpriteUrl(targetPokemon.id)}
                                        alt={targetPokemon.name}
                                        className="pokedle-result-sprite pokedle-revealed sprite-fade"
                                        onError={(e) => { e.currentTarget.src = getPokemonFrontSpriteUrl(targetPokemon.id); }}
                                    />
                                </div>

                                <h3 className="pokedle-result-pokemon-name">{formatPokemonDisplayName(targetPokemon.name)}</h3>

                                <div className="pokedle-result-types mt-0.5">
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

                                <p className="pokedle-result-text mt-1">
                                    {gameStatus === 'WON'
                                        ? t('pokedle.winMessage', { name: formatPokemonDisplayName(targetPokemon.name), attempts: guesses.length })
                                        : t('pokedle.loseMessage', { name: formatPokemonDisplayName(targetPokemon.name) })
                                    }
                                </p>

                                {/* Mini attempt preview grid */}
                                <div className="pokedle-share-preview mt-2 w-full">
                                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-2 block">
                                        {language === 'pt' ? 'Resumo das Tentativas' : 'Attempts Summary'}
                                    </span>
                                    <div className="flex flex-col gap-1 items-center justify-center">
                                        {guesses.map((guess, idx) => {
                                            const norm = normalizeNameForGame(guess);
                                            const letterStatuses = checkLetters(norm, targetNormalized);
                                            return (
                                                <div key={idx} className="pokedle-share-preview-row">
                                                    {letterStatuses.map((status, sIdx) => (
                                                        <span
                                                            key={sIdx}
                                                            className={`pokedle-share-preview-tile is-${status}`}
                                                        />
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Share Actions Row */}
                                <div className="pokedle-share-actions-container w-full mt-2 flex flex-col gap-2">
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

                                {/* Actions by Mode */}
                                {mode === 'ongoing' && (
                                    <button
                                        onClick={startRandomOngoingGame}
                                        className="btn btn-primary px-6 mt-1.5 flex items-center justify-center gap-2 w-full text-xs"
                                    >
                                        <RefreshIcon className="w-3.5 h-3.5" />
                                        <span>{t('pokedle.playAgain')}</span>
                                    </button>
                                )}
                            </section>
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
