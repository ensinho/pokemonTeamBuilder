import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged,
    signInWithCustomToken,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    EmailAuthProvider,
    linkWithCredential,
    signOut,
} from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, onSnapshot, deleteDoc, query, orderBy, limit, startAfter, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

// Extracted modules
import { PATCH_NOTES_VERSION, POKEBALL_PLACEHOLDER_URL, THEMES, applyTheme } from './constants/theme';
import { typeColors, typeIcons, typeChart } from './constants/types';
import { firebaseConfig, appId, ADMIN_EMAILS } from './constants/firebase';
import { GENERATION_RANGES, LEGENDARY_IDS, NATURES_LIST } from './constants/pokemon';
import {
    getEvolutionChainData,
    getMoveDetails,
    getPokemonApiData,
    getPokemonSpeciesData,
    getStaticPokemonDetail,
    loadPokemonReferenceData,
} from './services/pokemonDataCache';
import { useDebounce } from './hooks/useDebounce';
import {
    GithubIcon, LinkedinIcon, StarsIcon, StarIcon, TrashIcon, ClearIcon, SaveIcon,
    PlusIcon, MenuIcon, CloseIcon, InfoIcon, PokeballIcon, SavedTeamsIcon,
    CollapseLeftIcon, CollapseRightIcon, ShareIcon,
    SuccessToastIcon, ErrorToastIcon, WarningToastIcon, SunIcon, MoonIcon,
    SwordsIcon, EditIcon, SparklesIcon, ShowdownIcon, DiceIcon,
    HomeIcon, RefreshIcon, ArrowUpDownIcon, ChartColumnIcon, HouseIcon, AccountIcon
} from './components/icons';
import { TypeBadge } from './components/TypeBadge';
import { StatBar } from './components/StatBar';
import { AbilityChip } from './components/AbilityChip';
import { SkeletonCard } from './components/SkeletonCard';
import { PokemonCard } from './components/PokemonCard';
import { Sprite } from './components/Sprite';
import { EmptyState } from './components/EmptyState';
import { TeamIdentitySummary } from './components/TeamIdentitySummary';
import { FooterFeedback } from './components/FooterFeedback';
import { AuthModal, GreetingPokemonSelectorModal, PatchNotesModal, ShareSnippetModal, SyncPromptModal } from './components/modals';
import {
    AdminDashboardView,
    AllTeamsView,
    FavoritePokemonsView,
    HomeView,
    PokedexView,
    ProfileView,
    RandomGeneratorView,
    TeamBuilderView,
} from './components/views';
import { AnchoredPopover } from './components/AnchoredPopover';
import { useModalA11y } from './hooks/useModalA11y';

// Shared trainer avatar helper
const TrainerAvatar = ({ pokemonId, size = 24, color = 'currentColor', className = '' }) => {
    if (pokemonId) {
        return (
            <span
                className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${className}`}
                style={{ width: size, height: size, backgroundColor: 'var(--color-primary-soft)' }}
                aria-hidden="true"
            >
                <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`}
                    alt=""
                    className="image-pixelated"
                    style={{ width: size + 8, height: size, objectFit: 'contain', marginTop: 2 }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
            </span>
        );
    }
    return <AccountIcon color={color} className={`shrink-0 ${className}`} />;
};

// ——————————————————————————————————————————————
// PageGuide — small i button that opens a contextual tip popover.
// ——————————————————————————————————————————————
const PAGE_GUIDE_TIPS = {
    home: {
        title: 'Home',
        tips: [
            'Your journey starts here — every great team has a story. What\'s yours today?',
            'The Pokémon of the Day is different every 24h. Some days it\'ll surprise you.',
            'The little companion in the greeting? That can be yours. Make it personal.',
        ],
    },
    builder: {
        title: 'Team Builder',
        tips: [
            'A team isn\'t six random picks — it\'s a statement. Feel the synergy as you build.',
            'Dig into each slot. Moves, item, nature — that\'s where good teams become great ones.',
            'Watch the summary bar shift as you add Pokémon. A well-balanced team has its own rhythm.',
        ],
    },
    allTeams: {
        title: 'Saved Teams',
        tips: [
            'Every team here was a moment of inspiration. Revisit them — past-you had good taste.',
            'Star the ones that feel special. Some teams deserve to be remembered.',
            '🎮 Rate your teams 1–6 in your head, then edit the worst one until it earns a higher spot.',
        ],
    },
    pokedex: {
        title: 'Pokédex',
        tips: [
            'Over a thousand Pokémon, and you only need six. The fun is in the choosing.',
            'Open any card and let the stats tell a story — sometimes the underdog surprises you.',
            'Star the ones that catch your eye. Your favourites say a lot about your style.',
        ],
    },
    favorites: {
        title: 'Favourite Pokémon',
        tips: [
            'This is your taste — unfiltered. Every star you gave meant something.',
            'Scroll through and notice a pattern. Your favourite type might be more obvious than you think.',
            'See someone here you\'ve never actually used? Maybe it\'s time.',
        ],
    },
    randomGenerator: {
        title: 'Random Generator',
        tips: [
            'Let go of the plan. Some of the best teams happen by accident.',
            'That Pokémon you\'d never pick yourself? Give it a chance — it might be your next favourite.',
            '🎮 Nuzlocke Draft: generate 12, pick only 6 — and never reroll. Play with what fate gives you.',
        ],
    },
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const PageGuide = ({ colors, pageKey, db, userId, userEmail, displayName, showToast }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [suggestionEmail, setSuggestionEmail] = useState(userEmail || '');
    const [suggestionText, setSuggestionText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const guide = PAGE_GUIDE_TIPS[pageKey];

    useEffect(() => {
        if (!isOpen) return;
        setSuggestionEmail(userEmail || '');
        setSuggestionText('');
        setSent(false);
        const handleOutside = (e) => {
            if (triggerRef.current?.contains(e.target) || popoverRef.current?.contains(e.target)) {
                return;
            }
            if (triggerRef.current || popoverRef.current) {
                setIsOpen(false);
            }
        };
        const handleEsc = (e) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('touchstart', handleOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('touchstart', handleOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, userEmail]);

    const handleSendSuggestion = useCallback(async (e) => {
        e.preventDefault();
        const text = suggestionText.trim();
        const normalizedEmail = suggestionEmail.trim().toLowerCase();
        if (!db || !userId || !text || isSending) return;
        if (!isValidEmail(normalizedEmail)) {
            showToast?.('Add a valid email so I can reply.', 'warning');
            return;
        }
        setIsSending(true);
        try {
            const normalizedDisplayName = displayName?.trim() || null;
            await addDoc(collection(db, `artifacts/${appId}/suggestions`), {
                userId,
                userEmail: normalizedEmail,
                contactEmail: normalizedEmail,
                authEmail: userEmail || null,
                displayName: normalizedDisplayName,
                source: 'pageGuide',
                author: {
                    userId,
                    email: normalizedEmail,
                    authEmail: userEmail || null,
                    displayName: normalizedDisplayName,
                },
                text,
                page: pageKey,
                pageTitle: guide?.title ?? pageKey,
                createdAt: serverTimestamp(),
            });
            setSent(true);
            setSuggestionText('');
            showToast?.('Thanks for your feedback!', 'success');
        } catch (err) {
            console.error('Failed to submit page suggestion:', err);
            showToast?.('Could not send your suggestion. Try again.', 'error');
        } finally {
            setIsSending(false);
        }
    }, [db, userId, userEmail, displayName, suggestionEmail, suggestionText, isSending, pageKey, guide, showToast]);

    if (!guide) return null;

    const isSuggestionEmailValid = isValidEmail(suggestionEmail);

    return (
        <div className="inline-flex items-center">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(v => !v)}
                aria-label={`Guide for ${guide.title}`}
                aria-expanded={isOpen}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{
                    color: isOpen ? colors.primary : colors.textMuted,
                    backgroundColor: isOpen ? colors.primary + '1A' : 'transparent',
                }}
            >
                <InfoIcon />
            </button>

            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={triggerRef}
                popoverRef={popoverRef}
                className="w-[min(20rem,calc(100vw-1.5rem))] rounded-xl shadow-2xl flex flex-col"
                style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.primary}40`,
                }}
                role="dialog"
                ariaLabel={`${guide.title} guide`}
                viewportPadding={12}
                arrowStyle={{
                    backgroundColor: colors.card,
                    borderTop: `1px solid ${colors.primary}40`,
                    borderLeft: `1px solid ${colors.primary}40`,
                }}
            >
                    {/* Tips */}
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded-md shrink-0"
                                style={{ color: colors.primary, backgroundColor: colors.primary + '1A' }}
                                aria-hidden="true"
                            >
                                <InfoIcon />
                            </span>
                            <h4 className="font-bold text-sm" style={{ color: colors.primary }}>
                                {guide.title} Guide
                            </h4>
                        </div>
                        <ul className="space-y-2">
                            {guide.tips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm leading-snug" style={{ color: colors.text }}>
                                    <span className="mt-0.5 shrink-0 text-[10px] font-extrabold" style={{ color: colors.primary }}>✦</span>
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Suggestion footer */}
                    <div
                        className="px-4 py-3 rounded-b-xl border-t"
                        style={{ borderColor: colors.cardLight, backgroundColor: colors.background + '99' }}
                    >
                        {sent ? (
                            <p className="text-xs text-center font-semibold" style={{ color: colors.primary }}>
                                ✓ Thanks for your feedback!
                            </p>
                        ) : (
                            <>
                                <p className="text-[11px] mb-2" style={{ color: colors.textMuted }}>
                                    Have a suggestion about this page?
                                </p>
                                <form onSubmit={handleSendSuggestion} className="flex flex-col gap-2">
                                    <input
                                        type="email"
                                        value={suggestionEmail}
                                        onChange={(e) => setSuggestionEmail(e.target.value.slice(0, 254))}
                                        placeholder="Your email"
                                        autoComplete="email"
                                        maxLength={254}
                                        className="w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={suggestionText}
                                            onChange={(e) => setSuggestionText(e.target.value.slice(0, 500))}
                                            placeholder="Your idea..."
                                            maxLength={500}
                                            className="flex-1 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            style={{ backgroundColor: colors.cardLight, color: colors.text }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!suggestionText.trim() || !isSuggestionEmailValid || isSending || !db || !userId}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            style={{ backgroundColor: colors.primary }}
                                        >
                                            {isSending ? '...' : 'Send'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
            </AnchoredPopover>
        </div>
    );
};

const PokemonDetailModal = ({ pokemon, onClose, onAdd, currentTeam, colors, showPokemonDetails, db, pokemonDetailsCache = {}, setPokemonDetailsCache, isFavorite, onToggleFavorite }) => {
    const dialogRef = useModalA11y(onClose);
    const [showShiny, setShowShiny] = useState(false);
    const [evolutionDetails, setEvolutionDetails] = useState([]);
    const pokemonWeaknesses = useMemo(() => getPokemonWeaknessEntries(pokemon?.types || []), [pokemon]);

    useEffect(() => {
        if (!pokemon || !pokemon.evolution_chain_url) return;

        const fetchEvolutionChain = async () => {
            try {
                const data = await getEvolutionChainData(pokemon.evolution_chain_url);
                const chain = [];
                let evoData = data.chain;
                do {
                    chain.push({
                        name: evoData.species.name,
                        url: evoData.species.url,
                    });
                    evoData = evoData.evolves_to[0];
                } while (!!evoData && Object.prototype.hasOwnProperty.call(evoData, 'evolves_to'));

                const detailsPromises = chain.map(async (evo) => {
                    const id = evo.url.split('/').filter(Boolean).pop();
                    if (pokemonDetailsCache[id]) {
                        return pokemonDetailsCache[id];
                    }
                    const staticDetail = await getStaticPokemonDetail(id);
                    if (staticDetail) {
                        setPokemonDetailsCache?.(prev => ({ ...prev, [id]: staticDetail }));
                        return staticDetail;
                    }
                    if (!db) return { name: evo.name, sprite: POKEBALL_PLACEHOLDER_URL };
                    const docRef = doc(db, 'artifacts/pokemonTeamBuilder/pokemons', id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const detail = docSnap.data();
                        setPokemonDetailsCache?.(prev => ({ ...prev, [id]: detail }));
                        return detail;
                    }
                    return { name: evo.name, sprite: POKEBALL_PLACEHOLDER_URL };
                });

                const resolvedDetails = await Promise.all(detailsPromises);
                setEvolutionDetails(resolvedDetails);
            } catch (error) {
                console.error('Failed to fetch evolution chain', error);
            }
        };

        fetchEvolutionChain();
    }, [pokemon, db, pokemonDetailsCache, setPokemonDetailsCache]);

    const handleEvolutionClick = (pokeData) => {
        onClose();
        showPokemonDetails(pokeData);
    };

    if (!pokemon) return null;

    const isAlreadyOnTeam = currentTeam.some(p => p.id === pokemon.id);
    const spriteToShow = showShiny ? (pokemon.animatedShinySprite || pokemon.shinySprite) : (pokemon.animatedSprite || pokemon.sprite);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm h-[100vh] flex items-center justify-center z-50 p-3 sm:p-6" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="pokemon-detail-title"
                tabIndex={-1}
                className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] flex flex-col relative animate-scale-in focus:outline-none overflow-hidden"
                style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.cardLight}`,
                    '--scrollbar-track-color': colors.card,
                    '--scrollbar-thumb-color': colors.primary,
                    '--scrollbar-thumb-border-color': colors.card,
                }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} type="button" aria-label={`Close ${pokemon.name} details`} className="absolute top-4 right-4 text-muted hover:text-fg hover:rotate-90 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"><CloseIcon /></button>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-5 sm:px-5 sm:pt-5">
                    <div className="text-center">
                        <div className="relative inline-block">
                            <img src={spriteToShow || POKEBALL_PLACEHOLDER_URL} alt={pokemon.name} className="mx-auto h-24 w-24 sm:h-32 sm:w-32 image-pixelated hover:scale-110 transition-transform duration-300" />
                            <button
                                onClick={() => setShowShiny(!showShiny)}
                                className={`absolute -bottom-2 -right-5 p-1 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${showShiny ? 'bg-yellow-500' : 'bg-gray-700'}`}
                                style={{ color: 'white' }}
                                title="Toggle Shiny"
                            >
                                <SparklesIcon className="w-4 h-4" />
                            </button>
                            {onToggleFavorite && (
                                <button
                                    onClick={() => onToggleFavorite(pokemon.id)}
                                    className="absolute -bottom-2 -left-5 p-1 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
                                    style={{ backgroundColor: isFavorite ? 'rgba(251, 191, 36, 0.3)' : 'rgba(107, 114, 128, 0.7)', color: 'white' }}
                                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                    <StarIcon className="w-5 h-5" isFavorite={isFavorite} color="white" />
                                </button>
                            )}
                        </div>
                        <h2 id="pokemon-detail-title" className="text-2xl sm:text-3xl font-bold capitalize mt-2" style={{ color: colors.text }}>{pokemon.name} <span style={{ color: colors.textMuted }}>#{pokemon.id}</span></h2>
                        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                            {pokemon.types.map(type => <TypeBadge key={type} type={type} colors={colors} />)}
                        </div>
                    </div>

                    <div className="mt-4 sm:hidden">
                        <h3 className="text-lg font-bold mb-2 text-center" style={{ color: colors.text }}>Base Stats</h3>
                        <div className="space-y-1.5 rounded-xl p-3" style={{ backgroundColor: colors.background }}>
                            {pokemon.stats?.map((stat) => (
                                <CompactStatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />
                            ))}
                        </div>
                    </div>

                    <div className="mt-5 hidden sm:block">
                        <h3 className="text-xl font-bold mb-3 text-center" style={{ color: colors.text }}>Base Stats</h3>
                        <div className="space-y-2">
                            {pokemon.stats?.map(stat => <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />)}
                        </div>
                    </div>

                    <div className="mt-4 rounded-xl p-3 sm:p-4" style={{ backgroundColor: colors.background }}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <h3 className="text-base sm:text-lg font-bold" style={{ color: colors.text }}>Weaknesses</h3>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ backgroundColor: colors.cardLight, color: colors.textMuted }}>
                                {pokemonWeaknesses.length}
                            </span>
                        </div>
                        {pokemonWeaknesses.length > 0 ? (
                            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                                {pokemonWeaknesses.map(({ type, multiplier }) => (
                                    <WeaknessBadge key={type} type={type} multiplier={multiplier} colors={colors} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs sm:text-sm text-center sm:text-left" style={{ color: colors.textMuted }}>
                                No major weaknesses.
                            </p>
                        )}
                    </div>

                    {evolutionDetails.length > 1 && (
                        <div className="mt-4">
                            <h3 className="text-lg sm:text-xl font-bold text-center mb-2" style={{ color: colors.text }}>Evolution Line</h3>
                            <div className="overflow-x-auto custom-scrollbar pb-1">
                                <div className="flex min-w-max items-center gap-1 sm:gap-2 px-1 sm:justify-center">
                                    {evolutionDetails.map((evo, index) => (
                                        <React.Fragment key={evo.name}>
                                            <button type="button" onClick={() => handleEvolutionClick(evo)} className="min-w-[4.75rem] sm:min-w-[6rem] text-center cursor-pointer p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-purple-500/30">
                                                <img src={evo.sprite || POKEBALL_PLACEHOLDER_URL} alt={evo.name} className="h-14 w-14 sm:h-20 sm:w-20 mx-auto" />
                                                <p className="text-xs sm:text-sm capitalize leading-tight" style={{ color: colors.text }}>{evo.name}</p>
                                            </button>
                                            {index < evolutionDetails.length - 1 && <span className="text-lg sm:text-2xl px-1" style={{ color: colors.textMuted }}>→</span>}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 sm:mt-5">
                        <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-center" style={{ color: colors.text }}>Abilities</h3>
                        <div className="flex flex-wrap justify-center gap-2">
                            {pokemon.abilities?.map((ability, index) => <AbilityChip key={index} ability={ability} />)}
                        </div>
                    </div>
                </div>

                {!isAlreadyOnTeam && onAdd && (
                    <div className="shrink-0 border-t px-4 py-3 sm:px-5" style={{ borderColor: colors.cardLight }}>
                        <div className="flex justify-center">
                            <button onClick={() => { onAdd(pokemon); onClose(); }} className="w-full sm:w-auto bg-primary hover:bg-purple-500/30 text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95">
                                <PlusIcon /> Add to Team
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TeamPokemonEditorModal = ({ pokemon, onClose, onSave, colors, items, natures, moveDetailsCache = {}, setMoveDetailsCache = () => {} }) => {
    const [customization, setCustomization] = useState(pokemon.customization);
    const [remainingEVs, setRemainingEVs] = useState(510);
    const [moveSearch, setMoveSearch] = useState('');
    const [activeTab, setActiveTab] = useState('loadout');
    const dialogRef = useRef(null);
    const previouslyFocusedRef = useRef(null);
    const statNames = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    const pokemonWeaknesses = useMemo(() => getPokemonWeaknessEntries(pokemon?.types || []), [pokemon]);

    const fetchMoveDetails = useCallback(async (moveUrl, moveName) => {
        if (moveDetailsCache[moveName] !== undefined) {
            return moveDetailsCache[moveName];
        }
        try {
            const moveData = await getMoveDetails(moveUrl, moveName);
            setMoveDetailsCache(prev => ({...prev, [moveName]: moveData || null}));
            return moveData;
        } catch (error) {
            console.error(`Failed to fetch details for move: ${moveName}`, error);
            return null;
        }
    }, [moveDetailsCache, setMoveDetailsCache]);

    useEffect(() => {
        const totalEVs = Object.values(customization.evs).reduce((sum, ev) => sum + ev, 0);
        setRemainingEVs(510 - totalEVs);
    }, [customization.evs]);

    // Focus trap + Esc handler + restore focus on close (a11y)
    useEffect(() => {
        previouslyFocusedRef.current = document.activeElement;
        const node = dialogRef.current;
        if (node) {
            const focusable = node.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            (focusable || node).focus?.();
        }
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            if (previouslyFocusedRef.current && previouslyFocusedRef.current.focus) {
                previouslyFocusedRef.current.focus();
            }
        };
    }, [onClose]);

    const handleEvChange = (stat, value) => {
        const numericValue = Number(value);
        const currentEvs = { ...customization.evs };
        const oldVal = currentEvs[stat];
        const diff = numericValue - oldVal;

        if (numericValue > 252) return;
        if (remainingEVs - diff < 0) return;

        setCustomization(prev => ({
            ...prev,
            evs: { ...prev.evs, [stat]: numericValue }
        }));
    };

    const handleCustomizationChange = (field, value) => {
        setCustomization(prev => ({...prev, [field]: value}));
    }

    const handleMoveToggle = (moveName) => {
        setCustomization(prev => {
            const currentMoves = prev.moves;
            const newMoves = currentMoves.includes(moveName)
                ? currentMoves.filter(m => m !== moveName)
                : [...currentMoves, moveName];
            
            if (newMoves.length > 4) return prev; 
            return { ...prev, moves: newMoves };
        });
    };
    
    const handleSaveChanges = () => {
        onSave(pokemon.instanceId, customization);
        onClose();
    };

    const calculateStat = (base, ev, statName) => {
        if (statName === 'hp') {
            return Math.floor(base * 2 + 31 + Math.floor(ev / 4)) + 110;
        }
        return Math.floor((Math.floor(base * 2 + 31 + Math.floor(ev / 4)) + 5));
    };

    const filteredMoves = useMemo(() => {
        if (!moveSearch) return pokemon.moves;
        return pokemon.moves.filter(m => m.name.toLowerCase().includes(moveSearch.toLowerCase()));
    }, [moveSearch, pokemon.moves]);

    useEffect(() => {
        filteredMoves.slice(0, 20).forEach(m => {
            if (moveDetailsCache[m.name] === undefined) {
                fetchMoveDetails(m.url, m.name);
            }
        });
    }, [filteredMoves, moveDetailsCache, fetchMoveDetails]);

    if (!pokemon) return null;

    const tabs = [
        { id: 'loadout', label: 'Loadout' },
        { id: 'stats', label: 'Stats & EVs' },
        { id: 'moves', label: `Moves (${customization.moves.length}/4)` },
    ];

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-3 sm:p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="team-editor-title"
                tabIndex={-1}
                className="rounded-2xl shadow-xl w-full max-w-4xl max-h-[88vh] sm:max-h-[90vh] flex flex-col relative animate-fade-in focus:outline-none"
                style={{backgroundColor: colors.card}}
                onClick={e => e.stopPropagation()}
            >
                {/* Sticky header: title + tabs + close */}
                <header className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b" style={{ borderColor: colors.cardLight }}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <img
                                src={customization.isShiny ? (pokemon.animatedShinySprite || pokemon.shinySprite) : (pokemon.animatedSprite || pokemon.sprite)}
                                alt={pokemon.name}
                                className="h-12 w-12 sm:h-14 sm:w-14 image-pixelated flex-shrink-0"
                            />
                            <div className="min-w-0">
                                <h2 id="team-editor-title" className="text-lg sm:text-xl md:text-2xl font-bold capitalize truncate" style={{color: colors.text}}>{pokemon.name}</h2>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {pokemon.types.map(type => <TypeBadge key={type} type={type} colors={colors} />)}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: colors.textMuted }}>
                                        Weak vs
                                    </span>
                                    {pokemonWeaknesses.length > 0 ? pokemonWeaknesses.slice(0, 4).map(({ type, multiplier }) => (
                                        <WeaknessBadge key={type} type={type} multiplier={multiplier} colors={colors} />
                                    )) : (
                                        <span className="text-xs" style={{ color: colors.textMuted }}>None</span>
                                    )}
                                    {pokemonWeaknesses.length > 4 && (
                                        <span
                                            className="rounded-full px-2 py-1 text-[10px] font-bold"
                                            style={{ backgroundColor: colors.cardLight, color: colors.textMuted }}
                                        >
                                            +{pokemonWeaknesses.length - 4}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            type="button"
                            className="p-2 rounded-lg text-muted hover:text-fg hover:bg-surface-raised transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label="Close editor"
                        >
                            <CloseIcon />
                        </button>
                    </div>

                    <div role="tablist" aria-label="Editor sections" className="mt-4 flex gap-1 border-b -mb-3" style={{ borderColor: 'transparent' }}>
                        {tabs.map(t => (
                            <button
                                key={t.id}
                                role="tab"
                                type="button"
                                id={`tab-${t.id}`}
                                aria-selected={activeTab === t.id}
                                aria-controls={`panel-${t.id}`}
                                onClick={() => setActiveTab(t.id)}
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeTab === t.id ? 'border-b-2' : 'opacity-70 hover:opacity-100'}`}
                                style={{
                                    color: activeTab === t.id ? colors.primary : colors.textMuted,
                                    borderColor: activeTab === t.id ? colors.primary : 'transparent',
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Scrollable body */}
                <div
                    className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6"
                    style={{'--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card}}
                >
                    {activeTab === 'loadout' && (
                        <div role="tabpanel" id="panel-loadout" aria-labelledby="tab-loadout" className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="editor-item" className="block text-sm font-bold mb-1" style={{color: colors.text}}>Item</label>
                                    <select id="editor-item" value={customization.item} onChange={(e) => handleCustomizationChange('item', e.target.value)} className="w-full p-2 rounded-lg border-2 capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}>
                                        <option value="">None</option>
                                        {items.map(item => <option key={item.name} value={item.name} className="capitalize">{item.name.replace(/-/g, ' ')}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="editor-nature" className="block text-sm font-bold mb-1" style={{color: colors.text}}>Nature</label>
                                    <select id="editor-nature" value={customization.nature} onChange={(e) => handleCustomizationChange('nature', e.target.value)} className="w-full p-2 rounded-lg border-2 capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}>
                                        {natures.map(n => <option key={n.name} value={n.name} className="capitalize">{n.name.replace(/-/g, ' ')}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="editor-tera" className="block text-sm font-bold mb-1" style={{color: colors.text}}>Tera Type</label>
                                    <select id="editor-tera" value={customization.teraType} onChange={(e) => handleCustomizationChange('teraType', e.target.value)} className="w-full p-2 rounded-lg border-2 capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}>
                                        {Object.keys(typeColors).map(type => <option key={type} value={type} className="capitalize">{type}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    {/* Accessible switch (role=switch, keyboard, focus-visible) */}
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={customization.isShiny}
                                        onClick={() => handleCustomizationChange('isShiny', !customization.isShiny)}
                                        className="inline-flex items-center gap-3 group focus:outline-none"
                                    >
                                        <span
                                            className={`relative inline-block w-11 h-6 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary ${customization.isShiny ? 'bg-success' : 'bg-surface-raised'}`}
                                            aria-hidden="true"
                                        >
                                            <span
                                                className={`absolute top-0.5 left-0.5 inline-block w-5 h-5 bg-white rounded-full shadow transition-transform ${customization.isShiny ? 'translate-x-5' : 'translate-x-0'}`}
                                            />
                                        </span>
                                        <span className="text-sm font-bold" style={{color: colors.text}}>Shiny ✨</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="editor-ability" className="block text-base font-bold mb-2" style={{color: colors.text}}>Ability</label>
                                <select id="editor-ability" value={customization.ability} onChange={(e) => handleCustomizationChange('ability', e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary capitalize" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}>
                                    {pokemon.abilities.map((ability) => (
                                        <option key={ability.name} value={ability.name} className="capitalize">{ability.name.replace(/-/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <h3 className="text-base font-bold mb-2" style={{color: colors.text}}>Base Stats</h3>
                                <div className="space-y-1.5">
                                    {pokemon.stats?.map(stat => <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />)}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div role="tabpanel" id="panel-stats" aria-labelledby="tab-stats">
                            <div className="flex items-baseline justify-between mb-3">
                                <h3 className="text-lg font-bold" style={{color: colors.text}}>Effort Values</h3>
                                <p className="text-sm" style={{color: colors.textMuted}}>
                                    Remaining: <span className="font-bold text-lg" style={{color: remainingEVs === 0 ? colors.success : colors.primary}}>{remainingEVs}</span> / 510
                                </p>
                            </div>
                            {/* Total EV progress ring substitute: a visible bar */}
                            <div className="h-2 w-full rounded-full overflow-hidden mb-5" style={{backgroundColor: colors.cardLight}}>
                                <div
                                    className="h-full transition-all"
                                    style={{ width: `${((510 - remainingEVs) / 510) * 100}%`, backgroundColor: colors.primary }}
                                />
                            </div>

                            <div className="space-y-3">
                                {statNames.map((statName, i) => {
                                    const baseStat = pokemon.stats[i].base_stat;
                                    const ev = customization.evs[statName];
                                    const totalStat = calculateStat(baseStat, ev, statName);
                                    return (
                                    <div key={statName}>
                                        <div className="flex justify-between items-center capitalize text-sm">
                                            <span style={{color: colors.text}}>{statName.replace(/-/g, ' ')}</span>
                                            <span style={{color: colors.textMuted}}>EV {ev} · stat {totalStat}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="252"
                                            value={ev}
                                            step="4"
                                            onChange={(e) => handleEvChange(statName, e.target.value)}
                                            className="w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            style={{backgroundColor: colors.cardLight}}
                                            aria-label={`${statName.replace(/-/g, ' ')} EV`}
                                        />
                                    </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'moves' && (
                        <div role="tabpanel" id="panel-moves" aria-labelledby="tab-moves">
                            <div className="grid grid-cols-2 gap-2 min-h-[80px] mb-4 p-2 rounded-lg" style={{backgroundColor: colors.background}}>
                                {customization.moves.map(moveName => {
                                    const moveType = moveDetailsCache[moveName]?.type;
                                    return (
                                        <div key={moveName} className="p-2 rounded-lg text-center text-sm capitalize text-white" style={{ backgroundColor: moveType ? typeColors[moveType] : colors.cardLight }}>
                                            {moveName.replace(/-/g, ' ')}
                                        </div>
                                    )
                                })}
                                {Array.from({ length: 4 - customization.moves.length }).map((_, i) => (
                                    <div key={i} className="p-2 rounded-lg flex items-center justify-center" style={{backgroundColor: colors.cardLight, opacity: 0.5}}>
                                        <div className="w-8 h-1 rounded-full" style={{backgroundColor: colors.background}}></div>
                                    </div>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder="Search moves..."
                                value={moveSearch}
                                onChange={(e) => setMoveSearch(e.target.value)}
                                className="w-full p-2 rounded-lg mb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                style={{backgroundColor: colors.cardLight, color: colors.text}}
                                aria-label="Search moves"
                            />
                            <div className="grid grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto custom-scrollbar pr-2" style={{'--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card}}>
                                {filteredMoves.map((move) => {
                                    const moveType = moveDetailsCache[move.name]?.type;
                                    const isSelected = customization.moves.includes(move.name);
                                    const style = isSelected
                                      ? { backgroundColor: moveType ? typeColors[moveType] : colors.primary, color: 'white' }
                                      : { backgroundColor: colors.cardLight, color: colors.text };
                                    return (
                                        <button
                                            key={move.name}
                                            type="button"
                                            onClick={() => handleMoveToggle(move.name)}
                                            aria-pressed={isSelected}
                                            className={`p-2 rounded-lg text-sm capitalize transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${!isSelected && 'hover:opacity-80'}`}
                                            style={style}
                                            >
                                            {move.name.replace(/-/g, ' ')}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky footer with Cancel + Save — always visible */}
                <footer className="px-6 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: colors.cardLight }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveChanges}
                        className="bg-primary hover:opacity-90 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                    >
                        <SaveIcon /> Save changes
                    </button>
                </footer>
            </div>
        </div>
    )
};


const AUTH_SPLASH_MESSAGES = [
    'Checking if you are who you say you are',
    'Verifying trainer credentials',
    'Confirming your identity with Professor Oak',
    'Making sure this trainer card is yours',
    'Securing your team data before we start',
];

export default function App() {
    // React Router hooks
    const navigate = useNavigate();
    const location = useLocation();
    
    // Theme State — initialize from localStorage synchronously so the JS
    // `colors` object matches the CSS vars set by main.jsx on first render.
    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined') return 'dark';
        try {
            const saved = localStorage.getItem('theme');
            return saved && THEMES[saved] ? saved : 'dark';
        } catch (_) {
            return 'dark';
        }
    });
    const colors = THEMES[theme];
    
    // Greeting Pokemon State
    const [greetingPokemonId, setGreetingPokemonId] = useState(null);
    const [showGreetingPokemonSelector, setShowGreetingPokemonSelector] = useState(false);

    // Profile preferences (synced to Firestore via the same `preferences` doc).
    const [displayName, setDisplayName] = useState('');
    // Trainer streak — { count, longest, lastVisit (YYYY-MM-DD) }
    const [streak, setStreak] = useState(() => {
        if (typeof window === 'undefined') return { count: 0, longest: 0, lastVisit: null };
        try {
            const raw = localStorage.getItem('trainerStreak');
            if (raw) return JSON.parse(raw);
        } catch (_) { /* ignore */ }
        return { count: 0, longest: 0, lastVisit: null };
    });

    // Firebase States
    const [userId, setUserId] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [userEmail, setUserEmail] = useState(null);
    const initialBootTimeRef = useRef(Date.now());
    const [showInitialAuthSplash, setShowInitialAuthSplash] = useState(true);
    const [authSplashProgress, setAuthSplashProgress] = useState(0);
    const [authSplashMessage, setAuthSplashMessage] = useState(AUTH_SPLASH_MESSAGES[0]);

    // Auth UI state
    const [authModal, setAuthModal] = useState({ open: false, mode: 'signIn' });
    const [showSyncPrompt, setShowSyncPrompt] = useState(false);
    const syncPromptShownRef = useRef(false);
    const isAdmin = useMemo(() => {
        const normalizedEmail = (userEmail || '').trim().toLowerCase();
        return Boolean(normalizedEmail && ADMIN_EMAILS.includes(normalizedEmail));
    }, [userEmail]);
    
    // --- ESTADOS REVISADOS PARA BUSCA NO FIRESTORE ---
    const [pokemons, setPokemons] = useState([]); // Lista de pokémons visíveis
    const [lastVisibleDoc, setLastVisibleDoc] = useState(null); // Cursor para paginação do Firestore
    const [hasMore, setHasMore] = useState(true); // Indica se há mais pokémons para carregar
    
    // Caches para dados secundários que ainda podem vir da API ou para otimização
    const [pokemonDetailsCache, setPokemonDetailsCache] = useState({});
    const [moveDetailsCache, setMoveDetailsCache] = useState({});
    
    // Estados de dados que não mudam (Items, Natures)
    const [items, setItems] = useState([]);
    const [natures, setNatures] = useState([]);
    const [generations, setGenerations] = useState([]);
    
    // --- ESTADOS DE FILTRO (Mantidos para cada view) ---
    // Filtros do Team Builder
    const [selectedGeneration, setSelectedGeneration] = useState('all');
    const [selectedTypes, setSelectedTypes] = useState(new Set());
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearchTerm = useDebounce(searchInput, 300);
    
    // Filtros do Pokédex
    const [pokedexSelectedGeneration, setPokedexSelectedGeneration] = useState('all');
    const [pokedexSelectedTypes, setPokedexSelectedTypes] = useState(new Set());
    const [pokedexSearchInput, setPokedexSearchInput] = useState('');
    const debouncedPokedexSearchTerm = useDebounce(pokedexSearchInput, 300);
    const selectedTypesList = useMemo(() => Array.from(selectedTypes), [selectedTypes]);
    const pokedexSelectedTypesList = useMemo(() => Array.from(pokedexSelectedTypes), [pokedexSelectedTypes]);

    // Team States (permanecem os mesmos)
    const [currentTeam, setCurrentTeam] = useState([]);
    const [savedTeams, setSavedTeams] = useState([]);
    const [teamName, setTeamName] = useState('');
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [teamAnalysis, setTeamAnalysis] = useState({ strengths: new Set(), weaknesses: {} });
    
    // Favorite Pokemons State
    const [favoritePokemons, setFavoritePokemons] = useState(new Set());
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const [pokedexShowOnlyFavorites, setPokedexShowOnlyFavorites] = useState(false);
    
    // UI States (revisados para nova lógica de loading)
    const [isLoading, setIsLoading] = useState(true); // Loading inicial ou de filtro
    const [isFetchingMore, setIsFetchingMore] = useState(false); // Loading do scroll infinito
    const [toasts, setToasts] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    const [modalPokemon, setModalPokemon] = useState(null);
    const [editingTeamMember, setEditingTeamMember] = useState(null);
    const maxToasts = 3;
    const [suggestedPokemonIds, setSuggestedPokemonIds] = useState(new Set());
    const [sharedTeamLoaded, setSharedTeamLoaded] = useState(false);
    const [showPatchNotes, setShowPatchNotes] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, teamId: null, teamName: '' });
    const [shareModal, setShareModal] = useState({ isOpen: false, shareUrl: '', pokemons: [], defaultTitle: '' });
    
    // Check if patch notes should be shown (only once per version)
    useEffect(() => {
        const seenVersion = localStorage.getItem('patchNotesVersion');
        if (seenVersion !== PATCH_NOTES_VERSION) {
            setShowPatchNotes(true);
        }
    }, []);

    const handleClosePatchNotes = useCallback(() => {
        localStorage.setItem('patchNotesVersion', PATCH_NOTES_VERSION);
        setShowPatchNotes(false);
    }, []);
    
    // Derive currentPage from URL path for backward compatibility
    const currentPage = useMemo(() => {
        const path = location.pathname;
        if (path.includes('/pokedex')) return 'pokedex';
        if (path.includes('/teams')) return 'allTeams';
        if (path.includes('/generator')) return 'randomGenerator';
        if (path.includes('/favorites')) return 'favorites';
        if (path.includes('/builder')) return 'builder';
        if (path.includes('/profile')) return 'profile';
        if (path.includes('/admin')) return 'admin';
        return 'home';
    }, [location.pathname]);

    // Get page title and subtitle based on current route
    const pageInfo = useMemo(() => {
        const pages = {
            'home': { title: 'Home', icon: '', subtitle: 'Welcome back, Trainer!' },
            'builder': { title: 'Pokémon Team Builder', icon: '', subtitle: 'Build your perfect team' },
            'pokedex': { title: 'Pokédex', icon: '', subtitle: 'Explore all Pokémon' },
            'allTeams': { title: 'Saved Teams', icon: '', subtitle: 'Your team collection' },
            'randomGenerator': { title: 'Random Generator', icon: '', subtitle: 'Discover new Pokémon' },
            'favorites': { title: 'Favorite Pokémon', icon: '', subtitle: 'Your favorite collection' },
            'profile': { title: 'Profile', icon: '', subtitle: 'Trainer card & preferences' },
            'admin': { title: 'Admin Dashboard', icon: '', subtitle: 'Suggestions and replies' }
        };
        return pages[currentPage] || pages['home'];
    }, [currentPage]);

    const showToast = useCallback((message, type = 'info', options = {}) => {
        const id = Date.now() + Math.random();
        const { spriteUrl = null, duration = 3000 } = options || {};
        setToasts(prevToasts => [...prevToasts, { id, message, type, spriteUrl }]);
        setTimeout(() => setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id)), duration);
    }, []);

    useEffect(() => {
        if (!db || !userId) return;

        const teamsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/teams`);
        const q = query(teamsCollectionRef, orderBy('updatedAt', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const teamsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedTeams(teamsData);
        }, (error) => {
            console.error("Error listening to saved teams:", error);
            showToast("Could not fetch saved teams.", "error");
        });

        // Cleanup a subscription quando o componente desmontar
        return () => unsubscribe();

    }, [db, userId, showToast]);    

    // Listener para Pokémons favoritos
    useEffect(() => {
        if (!db || !userId) return;

        const favoritesDocRef = doc(db, `artifacts/${appId}/users/${userId}/favorites`, 'pokemons');

        const unsubscribe = onSnapshot(favoritesDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setFavoritePokemons(new Set(data.ids || []));
            } else {
                setFavoritePokemons(new Set());
            }
        }, (error) => {
            console.error("Error listening to favorite pokemons:", error);
        });

        return () => unsubscribe();

    }, [db, userId]);    

    // Busca dados estáticos (gens, items, natures) uma vez no início
    useEffect(() => {
        let cancelled = false;
        const fetchStaticData = async () => {
             try {
                const referenceData = await loadPokemonReferenceData();
                if (cancelled) return;
                setGenerations(referenceData.generations);
                setItems(referenceData.items);
                setNatures(referenceData.natures);
             } catch (e) {
                if (cancelled) return;
                showToast("Failed to load filter data.", "error");
             }
        }
        fetchStaticData();
        return () => { cancelled = true; };
    }, [showToast]);

useEffect(() => {
    const teamDetails = currentTeam; 

    if (teamDetails.length === 0) {
        setTeamAnalysis({ strengths: new Set(), weaknesses: {} });
        setSuggestedPokemonIds(new Set());
        return;
    }
    
    const teamWeaknessCounts = {};
    const offensiveCoverage = new Set();
    
    teamDetails.flatMap(d => d.types).forEach(type => {
        Object.entries(typeChart[type]?.damageDealt || {}).forEach(([vs, mult]) => {
            if (mult > 1) offensiveCoverage.add(vs.toLowerCase());
        });
    });

    Object.keys(typeChart).forEach(attackingType => {
        const capitalizedAttackingType = attackingType.charAt(0).toUpperCase() + attackingType.slice(1);
        let weakCount = 0;
        let resistanceCount = 0;

        teamDetails.forEach(pokemon => {
            const multiplier = pokemon.types.reduce((acc, pokemonType) => {
                return acc * (typeChart[pokemonType]?.damageTaken[capitalizedAttackingType] ?? 1);
            }, 1);

            if (multiplier > 1) {
                weakCount++;
            } else if (multiplier < 1) {
                resistanceCount++;
            }
        });
        
        if (weakCount > 0 && weakCount >= teamDetails.length / 2 && weakCount > resistanceCount) {
            teamWeaknessCounts[attackingType] = weakCount;
        }
    });
    setTeamAnalysis({ strengths: offensiveCoverage, weaknesses: teamWeaknessCounts });

    const weaknessTypes = Object.keys(teamWeaknessCounts);
    if (weaknessTypes.length > 0 && pokemons.length > 0) {
        const potentialSuggestions = pokemons.filter(p => {
            const details = p; 
            if (!details.types) return false;

            return weaknessTypes.some(weakType => {
                const capitalizedWeakType = weakType.charAt(0).toUpperCase() + weakType.slice(1);
                const typeMultiplier = details.types.reduce((multiplier, pokemonType) => {
                    return multiplier * (typeChart[pokemonType]?.damageTaken[capitalizedWeakType] ?? 1);
                }, 1);
                return typeMultiplier < 1; // É resistente ao tipo que é uma fraqueza do time
            });
        });
        setSuggestedPokemonIds(new Set(potentialSuggestions.map(p => p.id).slice(0, 10)));
    } else {
        setSuggestedPokemonIds(new Set());
    }

}, [currentTeam, pokemons]); 

     const availablePokemons = useMemo(() => {
        const teamIds = new Set(currentTeam.map(p => p.id));
        const available = pokemons.filter(p => !teamIds.has(p.id));
        
        return available.sort((a, b) => {
            const aIsSuggested = suggestedPokemonIds.has(a.id);
            const bIsSuggested = suggestedPokemonIds.has(b.id);
            if (aIsSuggested && !bIsSuggested) return -1;
            if (!aIsSuggested && bIsSuggested) return 1;
            return a.id - b.id;
        });
    }, [pokemons, currentTeam, suggestedPokemonIds]);

     const recentTeams = useMemo(() =>
        savedTeams.sort((a,b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0,3),
    [savedTeams]);
    
     const fetchPokemonDetails = useCallback(async (pokemonId) => {
        if (pokemonDetailsCache[pokemonId]) {
            return pokemonDetailsCache[pokemonId];
        }

        try {
            const staticDetail = await getStaticPokemonDetail(pokemonId);
            if (staticDetail) {
                setPokemonDetailsCache(prev => ({ ...prev, [pokemonId]: staticDetail }));
                return staticDetail;
            }

            if (!db) return null;

            const docRef = doc(db, 'artifacts/pokemonTeamBuilder/pokemons', String(pokemonId));
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const pokemonData = docSnap.data();
                setPokemonDetailsCache(prev => ({ ...prev, [pokemonId]: pokemonData }));
                return pokemonData;
            }
            return null;
        } catch (error) {
            console.error("Failed to fetch Pokémon details:", error);
            showToast(`Could not load details for Pokémon ID: ${pokemonId}`, "error");
            return null;
        }
    }, [db, pokemonDetailsCache, showToast]);

    const fetchAndSetSharedTeam = useCallback(async (teamId) => {
        if(!db || sharedTeamLoaded) return;
        setSharedTeamLoaded(true);
        showToast("Loading shared team...", "info");
        const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams`, teamId);
        try {
            const teamDoc = await getDoc(teamDocRef);
            if (teamDoc.exists()) {
                const teamData = teamDoc.data();
                const detailsPromises = teamData.pokemons.map(p => fetchPokemonDetails(p.id));
                const teamPokemonDetails = await Promise.all(detailsPromises);
                
                const customizedTeam = teamPokemonDetails.map((detail, i) => {
                    if (!detail) return null;
                    const savedPokemonData = teamData.pokemons[i] || {};
                    // Provide defaults so older shared teams (without per-pokemon
                    // customization) still load without throwing in the editor.
                    const defaultCustomization = {
                        item: '',
                        nature: 'serious',
                        teraType: detail.types[0],
                        isShiny: false,
                        ability: detail.abilities[0].name,
                        moves: detail.moves.slice(0, 4).map(m => m.name),
                        evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
                        ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
                    };
                    return {
                        ...detail,
                        instanceId: savedPokemonData.instanceId || `${detail.id}-${Date.now()}-${i}`,
                        customization: { ...defaultCustomization, ...(savedPokemonData.customization || {}) },
                    };
                });

                setCurrentTeam(customizedTeam.filter(Boolean));
                setTeamName(teamData.name);
                setEditingTeamId(null);
                showToast(`Loaded team: ${teamData.name}`, "success");

                // Drop them straight into the builder so they can tweak/save
                // the team they just received. Strip the ?team= query param so
                // a refresh doesn't re-trigger the loader.
                navigate('/builder');
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('team');
                    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
                } catch { /* ignore history failures */ }
            } else {
                showToast("Shared team not found.", "error");
            }
        } catch (error) {
            showToast("Failed to load shared team.", "error");
        }
    }, [db, showToast, sharedTeamLoaded, navigate, fetchPokemonDetails]);

    useEffect(() => {
        if (!db || isLoading || !isAuthReady) return;
        const urlParams = new URLSearchParams(window.location.search);
        const teamId = urlParams.get('team');
        if (teamId) {
            fetchAndSetSharedTeam(teamId);
        }
    }, [db, isLoading, isAuthReady, fetchAndSetSharedTeam]);

    // Efeito para autenticação e inicialização do Firebase
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            setAuth(authInstance);
            setDb(getFirestore(app));

            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    setIsAnonymous(!!user.isAnonymous);
                    setUserEmail(user.email || null);
                    setIsAuthReady(true);
                } else {
                    try {
                        const token = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;
                        if (token) {
                            await signInWithCustomToken(authInstance, token);
                        } else {
                            await signInAnonymously(authInstance);
                        }
                        setUserId(authInstance.currentUser.uid);
                        setIsAnonymous(!!authInstance.currentUser.isAnonymous);
                        setUserEmail(authInstance.currentUser.email || null);
                    } catch (error) {
                        showToast("Authentication failed. Please refresh.", "error");
                    } finally {
                        setIsAuthReady(true);
                    }
                }
            });
            return () => unsubscribe();
        } catch (e) {
            showToast("Failed to connect to services.", "error");
            setIsAuthReady(true);
        }
    }, [showToast]);

    useEffect(() => {
        if (!isAuthReady || !showInitialAuthSplash) return;
        const elapsedMs = Date.now() - initialBootTimeRef.current;
        const remainingMs = Math.max(0, 900 - elapsedMs);
        const timer = setTimeout(() => {
            setShowInitialAuthSplash(false);
        }, remainingMs);
        return () => clearTimeout(timer);
    }, [isAuthReady, showInitialAuthSplash]);

    useEffect(() => {
        if (!showInitialAuthSplash) return;
        setAuthSplashProgress(0);
        const timer = setTimeout(() => setAuthSplashProgress(100), 30);
        return () => clearTimeout(timer);
    }, [showInitialAuthSplash]);

    useEffect(() => {
        if (!showInitialAuthSplash) return;

        const pickMessage = (current) => {
            if (AUTH_SPLASH_MESSAGES.length <= 1) return AUTH_SPLASH_MESSAGES[0] || '';
            let next = current;
            while (next === current) {
                next = AUTH_SPLASH_MESSAGES[Math.floor(Math.random() * AUTH_SPLASH_MESSAGES.length)];
            }
            return next;
        };

        setAuthSplashMessage(prev => pickMessage(prev));

        let timerId;
        const scheduleNext = () => {
            const randomDelay = 700 + Math.floor(Math.random() * 1100);
            timerId = setTimeout(() => {
                setAuthSplashMessage(prev => pickMessage(prev));
                scheduleNext();
            }, randomDelay);
        };

        scheduleNext();
        return () => clearTimeout(timerId);
    }, [showInitialAuthSplash]);

    // Função para construir a query do Firestore dinamicamente
   const buildPokemonQuery = useCallback((isLoadMore = false, cursor = null) => {
        const genToUse = currentPage === 'pokedex' ? pokedexSelectedGeneration : selectedGeneration;
        const searchToUse = (currentPage === 'pokedex' ? debouncedPokedexSearchTerm : debouncedSearchTerm).toLowerCase();
       const typesToUse = currentPage === 'pokedex' ? pokedexSelectedTypesList : selectedTypesList;

        let q = collection(db, 'artifacts/pokemonTeamBuilder/pokemons');
        const constraints = [];

        if (genToUse !== 'all') {
            constraints.push(where('generation', '==', genToUse));
        }
        if (typesToUse.length > 0) {
            constraints.push(where('types', 'array-contains-any', typesToUse));
        }
        
        if (searchToUse) {
            constraints.push(orderBy('name'));
            constraints.push(where('name', '>=', searchToUse));
            constraints.push(where('name', '<=', searchToUse + '\uf8ff'));
        } else {
            constraints.push(orderBy('id'));
        }

        if (isLoadMore && cursor) {
            constraints.push(startAfter(cursor));
        }

        constraints.push(limit(50));
        
        return query(q, ...constraints);
    }, [db, currentPage, pokedexSelectedGeneration, selectedGeneration, debouncedPokedexSearchTerm, debouncedSearchTerm, pokedexSelectedTypesList, selectedTypesList]);

    // Efeito para buscar pokémons quando os filtros mudam
    useEffect(() => {
        if (!db || !isAuthReady) return;

        const fetchInitial = async () => {
            setIsLoading(true);
            setHasMore(true);
            const q = buildPokemonQuery(false);
            try {
                const documentSnapshots = await getDocs(q);
                const firstBatch = documentSnapshots.docs.map(doc => doc.data());
                const lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
                setPokemons(firstBatch);
                setLastVisibleDoc(lastVisible);
                if (documentSnapshots.docs.length < 50) setHasMore(false);
            } catch (error) {
                console.error("Error fetching pokemons:", error);
                showToast("Error loading Pokémon list. You may need to create a composite index in Firestore.", "error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitial();
    }, [db, isAuthReady, buildPokemonQuery, showToast]);

    const fetchMorePokemons = useCallback(async () => {
        if (isFetchingMore || !hasMore || !db || !lastVisibleDoc) return;

        setIsFetchingMore(true);
        const q = buildPokemonQuery(true, lastVisibleDoc);
        try {
            const documentSnapshots = await getDocs(q);
            const newBatch = documentSnapshots.docs.map(doc => doc.data());
            const lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
            
            setPokemons(prev => [...prev, ...newBatch]);
            setLastVisibleDoc(lastVisible);
            
            if (documentSnapshots.docs.length < 50) setHasMore(false);
        } catch (error) {
            console.error("Error fetching more pokemons:", error);
            showToast("Failed to load more Pokémon.", "error");
        } finally {
            setIsFetchingMore(false);
        }
    }, [isFetchingMore, hasMore, db, lastVisibleDoc, buildPokemonQuery, showToast]);

    // Observer para o scroll infinito.
    //
    // Both the desktop (`hidden lg:grid`) and mobile (`lg:hidden`) builders
    // mount their own picker grids at the same time — only one is visible
    // via CSS. The previous implementation stored a single observed node, so
    // whichever component rendered last (desktop) would overwrite the mobile
    // sentinel with a `display:none` element that never intersects the
    // viewport — breaking infinite scroll on mobile after the first batch.
    //
    // We now track every currently-mounted "last card" node in a Set and
    // observe all of them. Whichever one is actually visible triggers the
    // fetch; hidden ones simply never report `isIntersecting`.
    const observer = useRef(null);
    const observedNodes = useRef(new Set());
    // Keep the latest fetchMorePokemons in a ref so the IntersectionObserver
    // (created once) never invokes a stale closure with an outdated
    // `lastVisibleDoc`. Using a stale closure causes Firestore to startAfter
    // the same doc repeatedly, returning the same 50 Pokémon and producing
    // duplicate React keys (e.g. 99, 100, ...).
    const fetchMoreRef = useRef(fetchMorePokemons);
    useEffect(() => {
        fetchMoreRef.current = fetchMorePokemons;
    }, [fetchMorePokemons]);

    const lastPokemonElementRef = useCallback((node) => {
        if (!observer.current) {
            observer.current = new IntersectionObserver((entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    fetchMoreRef.current?.();
                }
            }, { rootMargin: '200px' });
        }

        // Drop nodes that React detached so we don't keep observing stale refs.
        observedNodes.current.forEach((tracked) => {
            if (!tracked.isConnected) {
                observer.current.unobserve(tracked);
                observedNodes.current.delete(tracked);
            }
        });

        if (node && !observedNodes.current.has(node)) {
            observedNodes.current.add(node);
            observer.current.observe(node);
        }
    }, []);

    useEffect(() => () => {
        if (observer.current) observer.current.disconnect();
        observedNodes.current.clear();
    }, []);

     const handleAddPokemonToTeam = useCallback((pokemon) => {
        if (currentTeam.length >= 6) return showToast("Your team is full (6 Pokémon)!", 'warning');
        
        const newMember = {
            ...pokemon,
            instanceId: `${pokemon.id}-${Date.now()}`,
            customization: {
                item: '',
                nature: 'serious', 
                teraType: pokemon.types[0],
                isShiny: false,
                ability: pokemon.abilities[0].name,
                moves: pokemon.moves.slice(0, 4).map(m => m.name),
                evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
                ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 }
            }
        };
        setCurrentTeam(prev => [...prev, newMember]);
    }, [currentTeam, showToast]);

    const handleRemoveFromTeam = useCallback((instanceId) => {
        setCurrentTeam(prev => prev.filter(p => p.instanceId !== instanceId));
    }, []);

    // Reorder a team slot. Pure index-based swap so UI drag and keyboard
    // controls share the same code path.
    const handleReorderTeam = useCallback((fromIndex, toIndex) => {
        setCurrentTeam(prev => {
            if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return prev;
            if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
            const next = prev.slice();
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });
    }, []);

    const handleClearTeam = useCallback(() => {
        setCurrentTeam([]);
        setTeamName('');
        setEditingTeamId(null);
    }, []);
    
        const handleSaveTeam = useCallback(async () => {
        if (!db || !userId) return showToast("Database connection not ready.", 'error');
        if (currentTeam.length === 0) return showToast("Your team is empty!", 'warning');
        if (!teamName.trim()) return showToast("Please name your team.", 'warning');
        
        if (savedTeams.some(team => team.name === teamName && team.id !== editingTeamId)) {
            return showToast("A team with this name already exists.", "warning");
        }

        const teamId = editingTeamId || doc(collection(db, `artifacts/${appId}/users/${userId}/teams`)).id;
        const existingTeam = savedTeams.find(t => t.id === editingTeamId);
        const teamData = { 
            name: teamName, 
            pokemons: currentTeam.map(p => ({
                id: p.id,
                name: p.name,
                sprite: p.sprite,
                instanceId: p.instanceId,
                customization: p.customization
            })), 
            isFavorite: existingTeam?.isFavorite || false, 
            createdAt: existingTeam?.createdAt || new Date().toISOString(), 
            updatedAt: new Date().toISOString() 
        };
        
        try {
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId), teamData);
            showToast(`Team "${teamName}" saved!`, 'success');
            handleClearTeam();
        } catch (e) { showToast("Error saving team.", 'error'); }
    }, [db, userId, currentTeam, teamName, editingTeamId, savedTeams, showToast, handleClearTeam]);

    const formatShowdownCase = useCallback(
        (str = '') => str.split('-').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        []
    );

    const getDefaultCustomizationForExport = useCallback((pokemonData = {}) => ({
        item: '',
        nature: 'serious',
        teraType: pokemonData.types?.[0] || 'normal',
        isShiny: false,
        ability: pokemonData.abilities?.[0]?.name || 'unknown',
        moves: [],
        evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
        ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
    }), []);

    const buildShowdownExportText = useCallback((teamMembers = []) => {
        const statMap = { hp: 'HP', attack: 'Atk', defense: 'Def', 'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe' };

        return teamMembers.map((member) => {
            const baseCustomization = getDefaultCustomizationForExport(member);
            const savedCustomization = member.customization || {};
            const customization = {
                ...baseCustomization,
                ...savedCustomization,
                evs: { ...baseCustomization.evs, ...(savedCustomization.evs || {}) },
                ivs: { ...baseCustomization.ivs, ...(savedCustomization.ivs || {}) },
                moves: Array.isArray(savedCustomization.moves) ? savedCustomization.moves : baseCustomization.moves,
            };

            const evsString = Object.entries(customization.evs)
                .filter(([, val]) => Number(val) > 0)
                .map(([key, val]) => `${val} ${statMap[key]}`)
                .join(' / ');
            const ivsString = Number(customization.ivs.attack) === 0 ? 'IVs: 0 Atk' : '';

            return [
                `${formatShowdownCase(member.name || 'Unknown Pokemon')} @ ${formatShowdownCase(customization.item || 'Nothing')}`,
                `Ability: ${formatShowdownCase(customization.ability || 'Unknown')}`,
                'Level: 50',
                customization.isShiny ? 'Shiny: Yes' : null,
                `Tera Type: ${formatShowdownCase(customization.teraType || 'normal')}`,
                evsString ? `EVs: ${evsString}` : null,
                `${formatShowdownCase(customization.nature || 'serious')} Nature`,
                ivsString || null,
                ...customization.moves.filter(Boolean).map((move) => `- ${formatShowdownCase(move)}`),
            ].filter(Boolean).join('\n');
        }).join('\n\n');
    }, [formatShowdownCase, getDefaultCustomizationForExport]);

    const copyTextToClipboard = useCallback(async (text, successMessage) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast(successMessage, 'success');
        } catch {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                showToast(successMessage, 'success');
            } catch {
                showToast('Failed to copy team.', 'error');
            }
        }
    }, [showToast]);

    const shareTeamByData = useCallback(async (teamMembers = [], providedName = 'Unnamed Team') => {
        if (!db || !isAuthReady) return showToast('Database not ready.', 'error');
        if (teamMembers.length === 0) return showToast('Cannot share an empty team!', 'warning');

        const safeName = providedName || 'Unnamed Team';
        const snippetPokemons = teamMembers.map((member) => ({
            id: member.id,
            name: member.name,
            sprite: member.sprite || '',
        }));

        setShareModal({ isOpen: true, shareUrl: '', pokemons: snippetPokemons, defaultTitle: safeName });

        const teamId = doc(collection(db, `artifacts/${appId}/public/data/teams`)).id;
        const teamData = {
            name: safeName,
            pokemons: teamMembers.map((member) => ({
                id: member.id,
                name: member.name,
                sprite: member.sprite || '',
                instanceId: member.instanceId,
                customization: member.customization,
            })),
            createdAt: new Date().toISOString(),
        };

        try {
            await setDoc(doc(db, `artifacts/${appId}/public/data/teams`, teamId), teamData);
            const basePath = `${import.meta.env.BASE_URL || '/'}`.replace(/\/$/, '');
            const builderPath = `${basePath}/builder`.replace(/\/{2,}/g, '/');
            const shareUrl = new URL(builderPath, window.location.origin);
            shareUrl.searchParams.set('team', teamId);
            setShareModal(prev => prev.isOpen ? { ...prev, shareUrl: shareUrl.toString() } : prev);
        } catch {
            setShareModal({ isOpen: false, shareUrl: '', pokemons: [], defaultTitle: '' });
            showToast('Could not generate share link.', 'error');
        }
    }, [db, isAuthReady, showToast]);

    const handleShareTeam = useCallback(async () => {
        await shareTeamByData(currentTeam, teamName || 'Unnamed Team');
    }, [shareTeamByData, currentTeam, teamName]);

    const handleShareSavedTeam = useCallback(async (team) => {
        await shareTeamByData(team?.pokemons || [], team?.name || 'Unnamed Team');
    }, [shareTeamByData]);

    const handleExportToShowdown = useCallback(async () => {
        if (currentTeam.length === 0) return showToast('Your team is empty!', 'warning');
        const exportText = buildShowdownExportText(currentTeam);
        await copyTextToClipboard(exportText, 'Copied for Pokémon Showdown!');
    }, [currentTeam, showToast, buildShowdownExportText, copyTextToClipboard]);

    const handleExportSavedTeamToShowdown = useCallback(async (team) => {
        const teamMembers = team?.pokemons || [];
        if (teamMembers.length === 0) return showToast('This saved team is empty!', 'warning');
        const exportText = buildShowdownExportText(teamMembers);
        await copyTextToClipboard(exportText, 'Copied for Pokémon Showdown!');
    }, [showToast, buildShowdownExportText, copyTextToClipboard]);

        const handleEditTeam = useCallback(async (team) => {
        showToast(`Loading team: ${team.name}...`, 'info');
        
        const teamPokemonDetailsPromises = team.pokemons.map(p => fetchPokemonDetails(p.id));
        const teamPokemonDetails = await Promise.all(teamPokemonDetailsPromises);

        const customizedTeam = teamPokemonDetails.map((detail, i) => {
            if (!detail) return null; // Handle case where a Pokémon couldn't be fetched

            const savedPokemonData = team.pokemons[i];
            const defaultCustomization = {
                item: '', nature: 'serious', teraType: detail.types[0], isShiny: false,
                ability: detail.abilities[0].name,
                moves: detail.moves.slice(0, 4).map(m => m.name),
                evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
                ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 }
            };
            
            return {
                ...detail,
                instanceId: savedPokemonData.instanceId,
                customization: { ...defaultCustomization, ...savedPokemonData.customization }
            };
        }).filter(Boolean); // Filtra qualquer resultado nulo

        setCurrentTeam(customizedTeam);
        setTeamName(team.name);
        setEditingTeamId(team.id);
        navigate('/builder');
        setIsSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [fetchPokemonDetails, showToast, navigate]);

    // Request delete confirmation
    const requestDeleteTeam = useCallback((teamId, teamName) => {
        setDeleteConfirmation({ isOpen: true, teamId, teamName });
    }, []);

    // Actually delete the team (called after confirmation)
    const handleDeleteTeam = useCallback(async (teamId) => {
        if (!db || !userId) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId));
            if (editingTeamId === teamId) handleClearTeam();
            showToast("Team deleted.", 'info');
        } catch (e) { showToast("Error deleting team.", 'error'); }
    }, [db, userId, editingTeamId, handleClearTeam, showToast]);

    const handleToggleFavorite = useCallback(async (team) => {
        if (!db || !userId) return;
        try { await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, team.id), { ...team, isFavorite: !team.isFavorite }, { merge: true }); }
        catch (e) { showToast("Could not update favorite status.", 'error'); }
    }, [db, userId, showToast]);

    const handleToggleFavoritePokemon = useCallback(async (pokemonId) => {
        if (!db || !userId) return;
        
        const favoritesDocRef = doc(db, `artifacts/${appId}/users/${userId}/favorites`, 'pokemons');
        
        try {
            const newFavorites = new Set(favoritePokemons);
            if (newFavorites.has(pokemonId)) {
                newFavorites.delete(pokemonId);
                showToast("Removed from favorites!", "info");
            } else {
                newFavorites.add(pokemonId);
                showToast("Added to favorites!", "success");
            }
            
            await setDoc(favoritesDocRef, { 
                ids: Array.from(newFavorites),
                updatedAt: new Date().toISOString()
            });
        } catch (e) { 
            console.error("Error toggling favorite pokemon:", e);
            showToast("Could not update favorite status.", 'error'); 
        }
    }, [db, userId, favoritePokemons, showToast]);

    const handleTypeSelection = useCallback((type) => {
        const typeStateSetter = currentPage === 'pokedex' ? setPokedexSelectedTypes : setSelectedTypes;
        typeStateSetter(prev => {
            const newTypes = new Set(prev);
            newTypes.has(type) ? newTypes.delete(type) : newTypes.add(type);
            return newTypes;
        });
    }, [currentPage]);

    const handleNavigateWithTypeFilter = useCallback((type) => {
        setPokedexSelectedTypes(new Set([type]));
        // Navigate to pokedex
        navigate('/pokedex');
    }, [navigate]);
    
    const showDetails = useCallback((pokemon) => {
        setModalPokemon(pokemon);
    }, []);

    const handleEditTeamMember = useCallback((pokemon) => {
        setEditingTeamMember(pokemon);
    }, []);

    const handleUpdateTeamMember = useCallback((instanceId, newCustomization) => {
        setCurrentTeam(prevTeam => prevTeam.map(member => 
            member.instanceId === instanceId ? { ...member, customization: newCustomization } : member
        ));
    }, []);
    
    const toggleTheme = useCallback(() => {
        // Cycle through all themes registered in THEMES so the header toggle
        // exposes the new options (midnight, sakura) without extra UI.
        // The Profile screen still offers explicit per-theme buttons.
        setTheme(prevTheme => {
            const ids = Object.keys(THEMES);
            const idx = ids.indexOf(prevTheme);
            const newTheme = ids[(idx + 1) % ids.length] || 'dark';
            try { localStorage.setItem('theme', newTheme); } catch (_) { /* ignore */ }
            applyTheme(newTheme);
            return newTheme;
        });
    }, []);

    // Profile-level setter for the theme picker. Validates against THEMES
    // so an unknown id can never put the app in an inconsistent state.
    const changeTheme = useCallback((nextTheme) => {
        if (!THEMES[nextTheme]) return;
        setTheme(nextTheme);
        applyTheme(nextTheme);
        try { localStorage.setItem('theme', nextTheme); } catch (_) { /* ignore */ }
    }, []);

    const handleResetSyncPrompt = useCallback(() => {
        try { localStorage.removeItem('syncPromptDismissed'); } catch (_) { /* ignore */ }
        syncPromptShownRef.current = false;
        showToast('Reminders re-enabled.', 'info');
    }, [showToast]);

    // ---------------------------------------------------------------
    // Auth — sign up / sign in / sign out helpers.
    // Sign up uses linkWithCredential when the user is currently
    // anonymous so existing teams/favorites are preserved on the
    // same uid. Otherwise it falls back to createUserWithEmailAndPassword.
    // Sign out re-creates an anonymous session so the app keeps working.
    // ---------------------------------------------------------------
    const handleSignUp = useCallback(async (email, password) => {
        if (!auth) throw new Error('Auth not ready');
        const current = auth.currentUser;
        if (current && current.isAnonymous) {
            const credential = EmailAuthProvider.credential(email, password);
            const result = await linkWithCredential(current, credential);
            setIsAnonymous(false);
            setUserEmail(result.user.email || email);
            showToast(`Account created — your data is now synced as ${result.user.email || email}.`, 'success');
        } else {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            setIsAnonymous(false);
            setUserEmail(result.user.email || email);
            showToast(`Welcome, ${result.user.email || email}!`, 'success');
        }
        setShowSyncPrompt(false);
        syncPromptShownRef.current = true;
    }, [auth, showToast]);

    const handleSignIn = useCallback(async (email, password) => {
        if (!auth) throw new Error('Auth not ready');
        const result = await signInWithEmailAndPassword(auth, email, password);
        setIsAnonymous(false);
        setUserEmail(result.user.email || email);
        showToast(`Signed in as ${result.user.email || email}.`, 'success');
        setShowSyncPrompt(false);
        syncPromptShownRef.current = true;
    }, [auth, showToast]);

    const handleSignOut = useCallback(async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            // onAuthStateChanged will fire with null and re-sign-in anonymously.
            showToast('Signed out.', 'info');
        } catch (e) {
            showToast('Could not sign out. Try again.', 'error');
        }
    }, [auth, showToast]);

    // ---------------------------------------------------------------
    // Theme preference sync — persists the user's theme choice on the
    // profile doc so it follows them across devices once signed in.
    // The same `preferences` doc also stores the trainer profile fields
    // (displayName, greetingPokemonId, streak) so all settings are
    // multi-platform once the user has signed in.
    // ---------------------------------------------------------------
    const themeHydratedFromProfile = useRef(false);
    const profileHydratedFromFirestore = useRef(false);

    // Load preferences from Firestore when the user becomes known.
    useEffect(() => {
        if (!db || !userId) return;
        let cancelled = false;
        (async () => {
            try {
                const prefRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'preferences');
                const snap = await getDoc(prefRef);
                if (cancelled) return;
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.theme && THEMES[data.theme]) {
                        setTheme(data.theme);
                        applyTheme(data.theme);
                        localStorage.setItem('theme', data.theme);
                    }
                    if (typeof data.displayName === 'string') {
                        setDisplayName(data.displayName);
                    }
                    if (Number.isInteger(data.greetingPokemonId)) {
                        setGreetingPokemonId(data.greetingPokemonId);
                        try { localStorage.setItem('greetingPokemon', String(data.greetingPokemonId)); } catch (_) { /* ignore */ }
                    }
                    if (data.streak && typeof data.streak === 'object') {
                        // Prefer the higher of local vs remote so users don't lose
                        // a streak when they sign in from a fresh device.
                        setStreak(prev => {
                            const remote = data.streak;
                            const merged = {
                                count: Math.max(prev.count || 0, remote.count || 0),
                                longest: Math.max(prev.longest || 0, remote.longest || 0, prev.count || 0, remote.count || 0),
                                lastVisit: remote.lastVisit || prev.lastVisit || null,
                            };
                            try { localStorage.setItem('trainerStreak', JSON.stringify(merged)); } catch (_) { /* ignore */ }
                            return merged;
                        });
                    }
                }
            } catch (e) {
                // Non-fatal: keep local theme.
            } finally {
                themeHydratedFromProfile.current = true;
                profileHydratedFromFirestore.current = true;
            }
        })();
        return () => { cancelled = true; };
    }, [db, userId]);

    // Persist theme to Firestore whenever it changes (after hydration).
    useEffect(() => {
        if (!db || !userId || !themeHydratedFromProfile.current) return;
        const prefRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'preferences');
        setDoc(prefRef, { theme, updatedAt: Date.now() }, { merge: true }).catch(() => {
            // Best-effort; ignore failures.
        });
    }, [db, userId, theme]);

    // Persist displayName / greetingPokemonId / streak together when any change.
    useEffect(() => {
        if (!db || !userId || !profileHydratedFromFirestore.current) return;
        const prefRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'preferences');
        setDoc(
            prefRef,
            { displayName, greetingPokemonId, streak, email: userEmail || null, isAnonymous, updatedAt: Date.now() },
            { merge: true }
        ).catch(() => { /* best-effort */ });
    }, [db, userId, displayName, greetingPokemonId, streak, userEmail, isAnonymous]);

    // ---------------------------------------------------------------
    // Trainer streak — increments once per calendar day when the user
    // opens the app. Resets if more than 1 day has passed since the
    // last visit. Stored locally for guests and synced to Firestore
    // for signed-in users via the preferences effect above.
    // ---------------------------------------------------------------
    const streakBumpedRef = useRef(false);
    useEffect(() => {
        if (streakBumpedRef.current) return;
        // Defer until profile is hydrated for signed-in users so we don't
        // overwrite a higher remote streak with a fresh local one.
        if (db && userId && !profileHydratedFromFirestore.current) return;
        streakBumpedRef.current = true;

        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

        setStreak(prev => {
            if (prev.lastVisit === todayStr) return prev; // already counted today
            let nextCount;
            if (!prev.lastVisit) {
                nextCount = 1;
            } else {
                const last = new Date(prev.lastVisit + 'T00:00:00');
                const diffDays = Math.round((today.setHours(0,0,0,0) - last.getTime()) / 86400000);
                nextCount = diffDays === 1 ? (prev.count || 0) + 1 : 1;
            }
            const next = {
                count: nextCount,
                longest: Math.max(prev.longest || 0, nextCount),
                lastVisit: todayStr,
            };
            try { localStorage.setItem('trainerStreak', JSON.stringify(next)); } catch (_) { /* ignore */ }
            return next;
        });
    }, [db, userId, isAuthReady]);

    // ---------------------------------------------------------------
    // Sync nudge — after 30 seconds, prompt anonymous users to create
    // an account so their data follows them across devices. Only fires
    // once per browser (dismissal is remembered in localStorage).
    // ---------------------------------------------------------------
    useEffect(() => {
        if (!isAuthReady) return;
        if (!isAnonymous) return;
        if (syncPromptShownRef.current) return;
        // Don't nudge while the user is already engaged with the auth flow —
        // the sign-in/sign-up modal is open, so a redundant prompt would
        // overlap and look spammy. Timer restarts when the modal closes.
        if (authModal.open) return;
        if (localStorage.getItem('syncPromptDismissed') === '1') return;

        const timer = setTimeout(() => {
            // Re-check at fire time to avoid racing with sign-in / modal open.
            if (!syncPromptShownRef.current && isAnonymous && !authModal.open) {
                syncPromptShownRef.current = true;
                setShowSyncPrompt(true);
            }
        }, 30000);
        return () => clearTimeout(timer);
    }, [isAuthReady, isAnonymous, authModal.open]);

    const handleDismissSyncPrompt = useCallback(() => {
        setShowSyncPrompt(false);
        try { localStorage.setItem('syncPromptDismissed', '1'); } catch (_) { /* ignore */ }
    }, []);
    
    const setGreetingPokemon = useCallback((pokemonId) => {
        setGreetingPokemonId(pokemonId);
        if (pokemonId) {
            localStorage.setItem('greetingPokemon', pokemonId.toString());
        } else {
            localStorage.removeItem('greetingPokemon');
        }
        setShowGreetingPokemonSelector(false);
    }, []);
    
    useEffect(() => {
        // Theme is already hydrated from localStorage in the useState
        // initializer above and applied by main.jsx before first paint.
        // Re-apply here defensively in case main.jsx hadn't run (SSR/tests).
        applyTheme(theme);

        const savedGreetingPokemon = localStorage.getItem('greetingPokemon');
        if (savedGreetingPokemon) {
            setGreetingPokemonId(parseInt(savedGreetingPokemon, 10));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderRoutes = () => {
        return (
            <Routes>
                <Route path="/teams" element={
                    <AllTeamsView 
                        teams={savedTeams} 
                        onEdit={handleEditTeam} 
                        onExport={handleExportSavedTeamToShowdown}
                        onShare={handleShareSavedTeam}
                        requestDelete={requestDeleteTeam} 
                        onToggleFavorite={handleToggleFavorite} 
                        searchTerm={teamSearchTerm} 
                        setSearchTerm={setTeamSearchTerm} 
                        colors={colors} 
                    />
                } />
                <Route path="/pokedex" element={
                    <PokedexView 
                        pokemons={pokemons}
                        lastPokemonElementRef={lastPokemonElementRef}
                        isFetchingMore={isFetchingMore}
                        searchInput={pokedexSearchInput}
                        setSearchInput={setPokedexSearchInput}
                        selectedTypes={pokedexSelectedTypes}
                        handleTypeSelection={handleTypeSelection}
                        selectedGeneration={pokedexSelectedGeneration}
                        setSelectedGeneration={setPokedexSelectedGeneration}
                        generations={generations}
                        isInitialLoading={isLoading}
                        colors={colors}
                        showDetails={showDetails}
                        favoritePokemons={favoritePokemons}
                        onToggleFavoritePokemon={handleToggleFavoritePokemon}
                        showOnlyFavorites={pokedexShowOnlyFavorites}
                        setShowOnlyFavorites={setPokedexShowOnlyFavorites}
                    />
                } />
                <Route path="/favorites" element={
                    <FavoritePokemonsView 
                        allPokemons={pokemons}
                        favoritePokemons={favoritePokemons}
                        onToggleFavoritePokemon={handleToggleFavoritePokemon}
                        showDetails={showDetails}
                        colors={colors}
                        onAddToTeam={handleAddPokemonToTeam}
                        isLoading={isLoading}
                    />
                } />
                <Route path="/generator" element={
                    <RandomGeneratorView 
                        colors={colors}
                        generations={generations}
                        db={db}
                        userId={userId}
                    />
                } />
                <Route path="/admin" element={
                    isAdmin ? (
                        <AdminDashboardView
                            db={db}
                            auth={auth}
                            isAdmin={isAdmin}
                            colors={colors}
                            showToast={showToast}
                        />
                    ) : <Navigate to="/" replace />
                } />
                <Route path="/builder" element={
                    <TeamBuilderView
                        currentTeam={currentTeam}
                        teamName={teamName}
                        setTeamName={setTeamName}
                        handleRemoveFromTeam={handleRemoveFromTeam}
                        handleReorderTeam={handleReorderTeam}
                        handleSaveTeam={handleSaveTeam}
                        editingTeamId={editingTeamId}
                        handleClearTeam={handleClearTeam}
                        recentTeams={recentTeams}
                        onNavigateToTeams={() => navigate('/teams')}
                        handleToggleFavorite={handleToggleFavorite}
                        handleEditTeam={handleEditTeam}
                        requestDeleteTeam={requestDeleteTeam}
                        handleShareTeam={handleShareTeam}
                        handleExportToShowdown={handleExportToShowdown}
                        teamAnalysis={teamAnalysis}
                        searchInput={searchInput}
                        setSearchInput={setSearchInput}
                        selectedGeneration={selectedGeneration}
                        setSelectedGeneration={setSelectedGeneration}
                        generations={generations}
                        isInitialLoading={isLoading}
                        availablePokemons={availablePokemons}
                        handleAddPokemonToTeam={handleAddPokemonToTeam}
                        lastPokemonElementRef={lastPokemonElementRef}
                        isFetchingMore={isFetchingMore}
                        selectedTypes={selectedTypes}
                        handleTypeSelection={handleTypeSelection}
                        showDetails={showDetails}
                        suggestedPokemonIds={suggestedPokemonIds}
                        colors={colors}
                        onEditTeamPokemon={handleEditTeamMember}
                        favoritePokemons={favoritePokemons}
                        onToggleFavoritePokemon={handleToggleFavoritePokemon}
                        showOnlyFavorites={showOnlyFavorites}
                        setShowOnlyFavorites={setShowOnlyFavorites}
                    />
                } />
                <Route path="/" element={
                    <HomeView
                        colors={colors}
                        navigate={navigate}
                        savedTeams={savedTeams}
                        favoritePokemons={favoritePokemons}
                        allPokemons={pokemons}
                        recentTeams={recentTeams}
                        showDetails={showDetails}
                        onToggleFavoritePokemon={handleToggleFavoritePokemon}
                        handleEditTeam={handleEditTeam}
                        greetingPokemonId={greetingPokemonId}
                        onOpenPokemonSelector={() => setShowGreetingPokemonSelector(true)}
                        db={db}
                        theme={theme}
                        onNavigateWithTypeFilter={handleNavigateWithTypeFilter}
                    />
                } />
                <Route path="/profile" element={
                    <ProfileView
                        userEmail={userEmail}
                        userId={userId}
                        isAnonymous={isAnonymous}
                        theme={theme}
                        onChangeTheme={changeTheme}
                        displayName={displayName}
                        onChangeDisplayName={setDisplayName}
                        greetingPokemonId={greetingPokemonId}
                        onOpenPokemonSelector={() => setShowGreetingPokemonSelector(true)}
                        streak={streak}
                        savedTeamsCount={savedTeams.length}
                        favoritePokemonsCount={favoritePokemons.size}
                        onOpenSignIn={() => setAuthModal({ open: true, mode: 'signIn' })}
                        onOpenSignUp={() => setAuthModal({ open: true, mode: 'signUp' })}
                        onSignOut={handleSignOut}
                        onResetSyncPrompt={handleResetSyncPrompt}
                        onClearLocalGreeting={() => setGreetingPokemon(null)}
                        db={db}
                    />
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        );
    };

    if (showInitialAuthSplash) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: colors.background }}>
                <div className="w-full max-w-xs text-center">
                    <img
                        src={import.meta.env.BASE_URL + 'LogoCuteGengarRounded.png'}
                        alt="Pokémon Team Builder"
                        className="mx-auto w-28 h-auto"
                    />
                    <div
                        className="mt-5 h-1 w-full overflow-hidden rounded-full"
                        style={{ backgroundColor: colors.cardLight }}
                        aria-hidden="true"
                    >
                        <span
                            className="block h-full rounded-full"
                            style={{
                                width: `${authSplashProgress}%`,
                                backgroundColor: '#7c3aed',
                                transition: 'width 0.9s ease-out',
                            }}
                        />
                    </div>
                    <p className="mt-3 text-xs" style={{ color: colors.textMuted }}>
                        {authSplashMessage}
                    </p>
                </div>
            </div>
        );
    }
    
    return (
      <div className="min-h-screen font-sans" style={{ backgroundColor: colors.background, color: colors.text }}>
        {modalPokemon && <PokemonDetailModal pokemon={modalPokemon} onClose={() => setModalPokemon(null)} onAdd={currentPage === 'builder' ? handleAddPokemonToTeam : null} currentTeam={currentTeam} colors={colors} showPokemonDetails={showDetails} pokemonDetailsCache={pokemonDetailsCache} setPokemonDetailsCache={setPokemonDetailsCache} db={db} isFavorite={favoritePokemons.has(modalPokemon.id)} onToggleFavorite={handleToggleFavoritePokemon} />}
        {editingTeamMember && <TeamPokemonEditorModal pokemon={editingTeamMember} onClose={() => setEditingTeamMember(null)} onSave={handleUpdateTeamMember} colors={colors} items={items} natures={natures} moveDetailsCache={moveDetailsCache} setMoveDetailsCache={setMoveDetailsCache}/>}
        {showPatchNotes && <PatchNotesModal onClose={handleClosePatchNotes} colors={colors} />}
        {showGreetingPokemonSelector && <GreetingPokemonSelectorModal onClose={() => setShowGreetingPokemonSelector(false)} onSelect={setGreetingPokemon} allPokemons={pokemons} currentPokemonId={greetingPokemonId} colors={colors} db={db} />}

        {/* Share snippet modal — image preview + native share / link copy */}
        <ShareSnippetModal
            isOpen={shareModal.isOpen}
            onClose={() => setShareModal({ isOpen: false, shareUrl: '', pokemons: [], defaultTitle: '' })}
            pokemons={shareModal.pokemons}
            defaultTitle={shareModal.defaultTitle}
            shareUrl={shareModal.shareUrl}
            colors={colors}
            showToast={showToast}
        />

        {/* Auth modal — sign in / sign up */}
        {authModal.open && (
            <AuthModal
                mode={authModal.mode}
                canLink={isAnonymous}
                onSignIn={handleSignIn}
                onSignUp={handleSignUp}
                onClose={() => setAuthModal({ open: false, mode: authModal.mode })}
                colors={colors}
            />
        )}

        {/* Optional sync nudge after ~30s of anonymous use */}
        {showSyncPrompt && isAnonymous && (
            <SyncPromptModal
                colors={colors}
                onSignUp={() => { setShowSyncPrompt(false); setAuthModal({ open: true, mode: 'signUp' }); }}
                onSignIn={() => { setShowSyncPrompt(false); setAuthModal({ open: true, mode: 'signIn' }); }}
                onDismiss={handleDismissSyncPrompt}
            />
        )}
        
        {/* Delete Confirmation Dialog */}
        <ConfirmDialog 
            isOpen={deleteConfirmation.isOpen}
            onClose={() => setDeleteConfirmation({ isOpen: false, teamId: null, teamName: '' })}
            onConfirm={() => handleDeleteTeam(deleteConfirmation.teamId)}
            title="Erase the Team? 😢"
            message={`Are you sure you want to delete "${deleteConfirmation.teamName}"? They could be so great...`}
            confirmText="Yeah don't care"
            colors={colors}
        />
        
        <div className="fixed top-5 right-5 z-50 space-y-2">{toasts.slice(0, maxToasts).map(toast => ( <div key={toast.id} className={`flex items-center justify-between gap-3 px-4 py-2 rounded-lg shadow-lg text-white animate-fade-in-out min-w-[260px] ${toast.type === 'success' ? 'bg-success' : toast.type === 'warning' ? 'bg-warning' : toast.type === 'info' ? 'bg-info' : 'bg-danger'}`}><div className="flex items-center gap-2 min-w-0">{!toast.spriteUrl && (<>{toast.type === 'success' && <SuccessToastIcon />}{toast.type === 'error' && <ErrorToastIcon />}{toast.type === 'warning' && <WarningToastIcon />}</>)}<span className="truncate">{toast.message}</span></div>{toast.spriteUrl && <img src={toast.spriteUrl} alt="" aria-hidden="true" className="w-16 h-16 image-pixelated -my-1 shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}</div> ))}</div>
        <div className="flex h-screen overflow-hidden">
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 lg:hidden z-30 transition-opacity duration-300" 
                    onClick={() => setIsSidebarOpen(false)}
                    role="presentation"
                    aria-label="Close sidebar"
                />
            )}
            <aside 
                className={`fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out lg:h-screen overflow-y-auto custom-scrollbar ${isSidebarCollapsed ? 'lg:w-20' : 'w-64'} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} 
                style={{
                    backgroundColor: colors.card,
                    borderRight: theme === 'light' ? `1px solid ${colors.border}` : 'none'
                }}
            >
                <div className="flex flex-col h-full">
                  <div className={`flex flex-row items-center justify-between gap-3 px-3.5 py-2 transition-all duration-300 `}>
                    <img 
                      src={import.meta.env.BASE_URL + 'LogoCuteGengarRounded.png'} 
                      alt="Pokémon Team Builder Logo" 
                      className={`transition-all duration-300 shrink-0 ${isSidebarCollapsed ? 'w-12' : 'w-12'}`}
                      style={{ height: 'auto' }}
                    />
                    <div className={`hidden lg:flex items-center flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                      <h2 className="text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{color: colors.primary}}>Menu</h2>
                    </div>
                    {!isSidebarCollapsed && (
                      <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} type="button" aria-label="Collapse sidebar" className="hidden lg:block p-1 rounded-lg transition-colors hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0" style={{color: colors.textMuted}}><CollapseLeftIcon /></button>
                    )}
                    <button onClick={() => setIsSidebarOpen(false)} type="button" aria-label="Close sidebar" className="lg:hidden p-1 rounded-lg transition-colors hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0" style={{color: colors.textMuted}}><CloseIcon /></button>
                  </div>
                  {isSidebarCollapsed && (
                    <div className="hidden lg:flex justify-center px-4 py-2 border-b" style={{borderColor: colors.cardLight}}>
                      <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} type="button" aria-label="Expand sidebar" aria-expanded={!isSidebarCollapsed} className="p-2 rounded-lg transition-colors hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{color: colors.textMuted}}><CollapseRightIcon /></button>
                    </div>
                  )}
                  <nav className="px-4 flex-grow">
                    <ul>
                      <li>
                                                <button onClick={() => { navigate('/'); setIsSidebarOpen(false); }} aria-current={currentPage === 'home' ? 'page' : undefined} className={`nav-item w-full p-3 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'home' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'home' ? 'white' : colors.text}}>
                          <span className="nav-icon"><HomeIcon /></span>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Home</span>
                        </button>
                      </li>
                      <li className="mt-2">
                                                <button onClick={() => { navigate('/builder'); setIsSidebarOpen(false); }} aria-current={currentPage === 'builder' ? 'page' : undefined} className={`nav-item w-full p-3 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'builder' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'builder' ? 'white' : colors.text}}>
                          <span className="nav-icon"><SwordsIcon /></span>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Team Builder</span>
                        </button>
                      </li>
                       <li className="mt-2">
                        <button onClick={() => { navigate('/pokedex'); setIsSidebarOpen(false); }} aria-current={currentPage === 'pokedex' ? 'page' : undefined} className={`nav-item w-full p-3 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'pokedex' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'pokedex' ? 'white' : colors.text}}>
                            <span className="nav-icon"><PokeballIcon /></span>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Pokédex</span>
                        </button>
                      </li>
                      <li className="mt-2">
                                                <button onClick={() => { navigate('/generator'); setIsSidebarOpen(false); }} aria-current={currentPage === 'randomGenerator' ? 'page' : undefined} className={`nav-item w-full p-3 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'randomGenerator' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'randomGenerator' ? 'white' : colors.text}}>
                            <span className="nav-icon"><DiceIcon /></span>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Random Generator</span>
                        </button>
                      </li>
                      <li className="mt-2">
                                                <button onClick={() => { navigate('/favorites'); setIsSidebarOpen(false); }} aria-current={currentPage === 'favorites' ? 'page' : undefined} className={`nav-item w-full p-3 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'favorites' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'favorites' ? 'white' : colors.text}}>
                            <span className="nav-icon"><StarsIcon className="w-6 h-6 shrink-0" isFavorite={true} color={currentPage === 'favorites' ? 'white' : colors.text} /></span>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Favorites</span>
                        </button>
                      </li>
                      <li className="mt-2">
                                                <button onClick={() => { navigate('/teams'); setIsSidebarOpen(false); }} aria-current={currentPage === 'allTeams' ? 'page' : undefined} className={`nav-item w-full p-3 mt-2 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'allTeams' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'allTeams' ? 'white' : colors.text}}>
                          <span className="nav-icon"><SavedTeamsIcon/></span>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Saved Teams</span>
                        </button>
                      </li>
                      <li className="mt-2">
                                                <button onClick={() => { navigate('/profile'); setIsSidebarOpen(false); }} aria-current={currentPage === 'profile' ? 'page' : undefined} className={`nav-item w-full p-3 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'profile' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'profile' ? 'white' : colors.text}}>
                          <span className="nav-icon"><TrainerAvatar pokemonId={greetingPokemonId} color={currentPage === 'profile' ? 'white' : colors.text} /></span>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Profile</span>
                        </button>
                      </li>
                                            {isAdmin && (
                                                <li className="mt-2">
                                                    <button onClick={() => { navigate('/admin'); setIsSidebarOpen(false); }} aria-current={currentPage === 'admin' ? 'page' : undefined} className={`nav-item w-full p-3 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'admin' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'admin' ? 'white' : colors.text}}>
                                                        <span className="nav-icon"><ChartColumnIcon className="w-6 h-6" /></span>
                                                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Admin</span>
                                                    </button>
                                                </li>
                                            )}
                    </ul>
                  </nav>
                  {/* Sidebar account footer — login is optional but lives here so users can find it. */}
                  <div
                    className="mt-auto p-3 border-t"
                    style={{ borderColor: colors.cardLight }}
                  >
                    {isAnonymous ? (
                        <button
                            type="button"
                            onClick={() => setAuthModal({ open: true, mode: 'signIn' })}
                            aria-label="Sign in or create an account"
                            title="Sign in"
                            className={`nav-item w-full rounded-lg font-bold flex items-center transition-colors p-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                            style={{ color: colors.text, backgroundColor: colors.cardLight }}
                        >
                            <span className="nav-icon"><AccountIcon color={colors.text} /></span>
                            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>
                                Sign in
                            </span>
                        </button>
                    ) : (
                        <div className={`rounded-lg p-2 ${isSidebarCollapsed ? 'flex justify-center' : ''}`} style={{ backgroundColor: colors.cardLight }}>
                            {isSidebarCollapsed ? (
                                <button
                                    type="button"
                                    onClick={() => navigate('/profile')}
                                    aria-label={`Signed in as ${userEmail || 'user'}. Open profile`}
                                    title={`${userEmail || 'Signed in'} — open profile`}
                                    className="p-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    style={{ color: colors.text }}
                                >
                                    <TrainerAvatar pokemonId={greetingPokemonId} color={colors.primary} />
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/profile')}
                                        aria-label="Open profile"
                                        title="Open profile"
                                        className="flex items-center gap-2 min-w-0 flex-1 text-left rounded p-1 -m-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        <span style={{ color: colors.primary }}><TrainerAvatar pokemonId={greetingPokemonId} color={colors.primary} /></span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.textMuted }}>Signed in</p>
                                            <p className="text-xs font-semibold truncate" title={userEmail || ''} style={{ color: colors.text }}>
                                                {userEmail || 'Account'}
                                            </p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSignOut}
                                        className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        style={{ color: colors.textMuted, border: `1px solid ${colors.border}` }}
                                    >
                                        Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                  </div>
                </div>
            </aside>
            <div className="flex-1 min-w-0 h-screen overflow-y-auto custom-scrollbar">
                <header 
                    className="relative flex items-center justify-between pt-4 px-4 h-24"
                    style={{
                        borderBottom: theme === 'light' ? `1px solid ${colors.border}` : 'none'
                    }}
                >
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    type="button"
                    aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    aria-expanded={isSidebarOpen}
                    className="lg:hidden p-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{ backgroundColor: colors.cardLight, color: colors.text }}
                >
                    {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
                </button>

                <div className="flex-1 text-center px-2 marginLeft">
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-xl sm:text-2xl lg:text-3xl">{pageInfo.icon}</span>
                        <h1
                        className="font-display text-[10px] sm:text-sm lg:text-xl tracking-wider truncate"
                        style={{ color: colors.primary }}
                        >
                        {pageInfo.title}
                        </h1>
                        {PAGE_GUIDE_TIPS[currentPage] && (
                            <PageGuide
                                colors={colors}
                                pageKey={currentPage}
                                db={db}
                                userId={userId}
                                userEmail={userEmail}
                                displayName={displayName}
                                showToast={showToast}
                            />
                        )}
                    </div>
                    <p
                    className="text-[10px] sm:text-xs md:text-sm mt-1 truncate opacity-70"
                    style={{ color: colors.textMuted }}
                    >
                    {pageInfo.subtitle}
                    </p>
                </div>

                <div className="flex items-center gap-2 lg:mr-4 sm:mr-0">
                    <button onClick={toggleTheme} type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} className="p-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{ backgroundColor: colors.cardLight, color: colors.text }}>
                        {theme === 'dark' ? <SunIcon color={colors.text} /> : <MoonIcon color={colors.text} />}
                    </button>
                </div>

                </header>
                <div className="p-4 sm:p-6 lg:p-8 lg:py-4">{renderRoutes()}</div>
                <footer className="text-center mt-8 py-6 border-t" style={{borderColor: colors.cardLight}}>
                    <p className="text-sm inline-flex items-center flex-wrap justify-center gap-x-1" style={{color: colors.textMuted}}>
                        <span>
                            Developed and built by <a href="https://github.com/ensinho" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" style={{color: colors.text}}>Enzo Esmeraldo</a>
                        </span>
                        <FooterFeedback db={db} userId={userId} userEmail={userEmail} displayName={displayName} colors={colors} showToast={showToast} />
                    </p>

                <div className="flex justify-center gap-4 mt-4">
                        <a href="https://github.com/ensinho/pokemonTeamBuilder" target="_blank" rel="noopener noreferrer" className="hover:opacity-80" style={{color: colors.textMuted}}><GithubIcon color={colors.textMuted} /></a>
                        <a href="https://www.linkedin.com/in/enzoesmeraldo/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80" style={{color: colors.textMuted}}><LinkedinIcon color={colors.textMuted} /></a>
                    </div>
                    <p className="text-xs mt-2" style={{color: colors.textMuted}}>Using the <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" style={{color: colors.text}}>PokéAPI</a>. Pokémon and their names are trademarks of Nintendo.</p>
                </footer>
            </div>
        </div>
        <style>{` 
            @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); 
            
            .custom-scrollbar::-webkit-scrollbar { width: 12px; } 
            .custom-scrollbar::-webkit-scrollbar-track { background: var(--scrollbar-track-color); } 
            .custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--scrollbar-thumb-color); border-radius: 20px; border: 3px solid var(--scrollbar-thumb-border-color); } 
            
            @keyframes fade-in { 
                from { opacity: 0; transform: scale(0.95); } 
                to { opacity: 1; transform: scale(1); } 
            } 
            
            @keyframes scale-in { 
                from { opacity: 0; transform: scale(0.9); } 
                to { opacity: 1; transform: scale(1); } 
            }
            
            @keyframes slide-up { 
                from { opacity: 0; transform: translateY(20px); } 
                to { opacity: 1; transform: translateY(0); } 
            }
            
            @keyframes shimmer {
                100% { transform: translateX(100%); }
            }
            
            .animate-fade-in { animation: fade-in 0.2s ease-out forwards; } 
            .animate-scale-in { animation: scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
            
            .image-pixelated { image-rendering: pixelated; } 
            .bg-primary { background-color: ${colors.primary}; } 
            
            input[type="checkbox"]:checked + div + div { transform: translateX(100%); background-color: ${colors.primary}; }
            
            /* Glassmorphism card effect */
            .glass-card {
                background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            /* Button hover effects */
            .btn-interactive {
                transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .btn-interactive:hover {
                transform: scale(1.03);
            }
            .btn-interactive:active {
                transform: scale(0.97);
            }

        `}</style>
      </div>
    );
}
