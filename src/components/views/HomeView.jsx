import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useForumStore } from '../../store/useForumStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { useFirestoreTeamsStore } from '../../store/useFirestoreTeamsStore';
import { useToastStore } from '../../store/useToastStore';
import { AnchoredPopover } from '../AnchoredPopover';
import { MessageIcon, PlusIcon, ClipIcon } from '../icons';
import { doc, getDoc } from 'firebase/firestore';
import { useTranslation } from '../../hooks/useTranslation';
import { TRANSLATIONS } from '../../constants/translations';

import '../../styles/home-view.css';
import '../../styles/forum-view.css';
import { getDailyPokemonIndex } from '../../utils/pokePuzzle';


import { DEFAULT_BACKGROUND_ID, SHARE_BACKGROUNDS, getBackgroundById } from '../../assets/backgrounds';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeColors, typeIcons } from '../../constants/types';
import { POKEMON_TIPS } from '../../constants/pokemon';
import { getPokemonApiData, getStaticPokemonDetail, loadPokemonIndex } from '../../services/pokemonDataCache';
import { getPokemonDisplaySprite, getTeamPokemonDisplaySprite, getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { EmptyState } from '../EmptyState';
import { HomeDashboard } from '../HomeDashboard';
import { UserProfileModal } from '../modals/UserProfileModal';
import {
    AccountIcon,
    CloseIcon,
    DiceIcon,
    EditIcon,
    PokeballIcon,
    StarIcon,
    SuccessToastIcon,
    SwordsIcon,
} from '../icons';
import { Download, Edit, Award, Puzzle, GitBranch, GitCommit, FileText, Sparkles, BookOpen, Flame, Folder, User, Palette } from 'lucide-react';

const DEFAULT_GREETING_POKEMON = {
    morning: { id: 196, name: 'espeon' },
    afternoon: { id: 25, name: 'pikachu' },
    night: { id: 197, name: 'umbreon' },
};

const getDayOfYear = () => {
    const today = new Date();
    return Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
};

const getDefaultHeroBackgroundId = () =>
    SHARE_BACKGROUNDS[getDayOfYear() % SHARE_BACKGROUNDS.length]?.id || DEFAULT_BACKGROUND_ID;

const toGreetingPokemonData = (pokemonData) => {
    if (!pokemonData) return null;

    if (pokemonData.sprite && pokemonData.types) {
        return pokemonData;
    }

    return {
        id: pokemonData.id,
        name: pokemonData.name,
        types: pokemonData.types?.map((typeEntry) => typeEntry.type?.name).filter(Boolean) || [],
        sprite: pokemonData.sprites?.other?.['official-artwork']?.front_default || pokemonData.sprites?.front_default || POKEBALL_PLACEHOLDER_URL,
        shinySprite: pokemonData.sprites?.other?.['official-artwork']?.front_shiny || pokemonData.sprites?.front_shiny || POKEBALL_PLACEHOLDER_URL,
        animatedSprite: pokemonData.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default || pokemonData.sprites?.front_default || POKEBALL_PLACEHOLDER_URL,
        animatedShinySprite: pokemonData.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_shiny || pokemonData.sprites?.front_shiny || POKEBALL_PLACEHOLDER_URL,
    };
};

const formatRelativeTime = (isoString, language = 'en') => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) {
        return language === 'pt' ? 'agora há pouco' : 'just now';
    }
    if (diffMin < 60) {
        return language === 'pt' ? `há ${diffMin} min` : `${diffMin}m ago`;
    }
    if (diffHr < 24) {
        return language === 'pt' ? `há ${diffHr} h` : `${diffHr}h ago`;
    }
    if (diffDays === 1) {
        return language === 'pt' ? 'ontem' : 'yesterday';
    }
    return language === 'pt' ? `há ${diffDays} dias` : `${diffDays}d ago`;
};

const CollapsiblePanel = ({ title, eyebrow, children, defaultExpanded = false, className = "home-panel p-4" }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    return (
        <section className={className}>
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="home-collapsible-trigger w-full text-left flex justify-between items-center focus:outline-none"
            >
                <div>
                    {eyebrow && <p className="home-panel__eyebrow">{eyebrow}</p>}
                    <h3 className="home-panel__section-title mt-0.5">{title}</h3>
                </div>
                <span className="text-muted text-xs font-bold transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                    ▶
                </span>
            </button>
            {isExpanded && <div className="mt-3 animate-fade-in-up">{children}</div>}
        </section>
    );
};

const TrainerStatsEmptyState = ({ onBrowsePokedex }) => {
    const { t, language } = useTranslation();
    const previewStats = [
        { label: t('home.statTeams'), value: '0' },
        { label: t('home.statPinned'), value: '0' },
        { label: language === 'pt' ? 'Tipo' : 'Type', value: '--' },
    ];

    return (
        <div className="home-empty-state">
            <div className="flex items-start gap-3">
                <div className="home-empty-state__icon" aria-hidden="true">
                    <AccountIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <p className="home-empty-state__title">
                        {t('home.emptyStatsTitle')}
                    </p>
                    <p className="home-empty-state__copy">
                        {t('home.emptyStatsDesc')}
                    </p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden="true">
                {previewStats.map(({ label, value }) => (
                    <div key={label} className="home-empty-state__stat">
                        <p className="home-empty-state__stat-value">
                            {value}
                        </p>
                        <p className="home-empty-state__stat-label">
                            {label}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex flex-col gap-2">

                <button
                    type="button"
                    onClick={onBrowsePokedex}
                    className="home-button home-button--secondary home-button--full"
                >
                    <PokeballIcon />
                    {t('home.shortcutPokedexTitle')}
                </button>
            </div>
        </div>
    );
};

const ALLOWED_MAX_ID = 1025;
// Seeded daily index selector is now imported from '../../utils/pokePuzzle'

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

export function HomeView({
    colors,
    navigate,
    savedTeams,
    favoritePokemons,
    allPokemons,
    showDetails,
    onToggleFavoritePokemon,
    handleEditTeam,
    greetingPokemonId,
    greetingPokemonIsShiny,
    heroBackgroundId,
    onChangeHeroBackground,
    onOpenPokemonSelector,
    db,
    activeTeamId,
    setActiveTeamId,
}) {
    const { t, language } = useTranslation();

    // Setup forum states on Home
    const {
        messages,
        currentTopicId,
        setCurrentTopicId,
        initTopicsListener,
        sendMessage,
    } = useForumStore();

    const { userId, isAnonymous, displayName, streak, userEmail } = useAuthStore();
    const resolvedDisplayName = displayName || userEmail?.split('@')[0] || 'Trainer';
    const resolvedUsername = displayName
        ? displayName.toLowerCase().replace(/\s+/g, '')
        : (userEmail ? userEmail.split('@')[0].toLowerCase().replace(/\s+/g, '') : 'trainer');
    const { currentTeam: activeRoster, teamName: activeRosterName, setCurrentTeam, setTeamName, setEditingTeamId } = useActiveTeamStore();

    const [replyText, setReplyText] = useState('');
    const [attachedTeam, setAttachedTeam] = useState(null);
    const [isAttachDropdownOpen, setIsAttachDropdownOpen] = useState(false);
    const [hoveredSlot, setHoveredSlot] = useState(null);
    const [selectedProfile, setSelectedProfile] = useState(null);

    // Setup Daily PokéPuzzle states for HomeView
    const [dailyPokePuzzleSummary, setDailyPokePuzzleSummary] = useState(null);
    const [dailyPokePuzzleTarget, setDailyPokePuzzleTarget] = useState(null);
    const [teaserSilhouetteId, setTeaserSilhouetteId] = useState(1);
    const [isDailyPokePuzzleLoading, setIsDailyPokePuzzleLoading] = useState(true);

    useEffect(() => {
        const loadDailyPokePuzzleData = async () => {
            setIsDailyPokePuzzleLoading(true);
            try {
                const now = new Date();
                const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
                let summary = null;

                // 1. Try Firestore if logged in
                if (db && userId) {
                    try {
                        const docRef = doc(db, `artifacts/pokemonTeamBuilder/users/${userId}/pokepuzzle`, `daily_${dateString}`);
                        const snap = await getDoc(docRef);
                        if (snap.exists()) {
                            const data = snap.data();
                            summary = {
                                solved: data.gameStatus === 'WON',
                                attempts: data.guesses?.length || 0,
                                date: dateString
                            };
                        }
                    } catch (e) {
                        console.error("Failed to load daily pokepuzzle summary from Firestore:", e);
                    }
                }

                // 2. Fall back to LocalStorage
                if (!summary) {
                    // Per-account key — must match PokePuzzleView's ppKey() namespacing
                    // so a signed-out user never inherits a previous account's summary.
                    const savedSummary = localStorage.getItem(`ptb:pokepuzzle:${userId || 'anon'}:daily:summary`);
                    if (savedSummary) {
                        const parsed = JSON.parse(savedSummary);
                        if (parsed.date === dateString) {
                            summary = parsed;
                        }
                    }
                }

                if (summary) {
                    setDailyPokePuzzleSummary(summary);
                } else {
                    setDailyPokePuzzleSummary(null);
                }

                // Compute daily target
                const index = await loadPokemonIndex();
                const filtered = index.filter(p => p.id <= ALLOWED_MAX_ID);
                if (filtered.length > 0) {
                    const dailyIdx = getDailyPokemonIndex(dateString, filtered);
                    setDailyPokePuzzleTarget(filtered[dailyIdx]);

                    // Pick a random pokemon ID from the pool for the silhouette (to confuse the user)
                    const randomSilhouetteIdx = Math.floor(Math.random() * filtered.length);
                    setTeaserSilhouetteId(filtered[randomSilhouetteIdx].id);
                }
            } catch (err) {
                console.error("Failed to load daily pokepuzzle data on home:", err);
            } finally {
                setIsDailyPokePuzzleLoading(false);
            }
        };

        loadDailyPokePuzzleData();
    }, [userId]);

    const popoverRef = useRef(null);
    const messageListRef = useRef(null);
    const messageListEndRef = useRef(null);
    const prevMessagesLengthRef = useRef(messages.length);

    useEffect(() => {
        initTopicsListener();
        setCurrentTopicId('general');
    }, [initTopicsListener, setCurrentTopicId]);

    // Auto-scroll messages container to bottom conditionally (WITHOUT scrolling the screen)
    useEffect(() => {
        const container = messageListRef.current;
        if (container && messages.length > 0) {
            const hasNewMessage = messages.length > prevMessagesLengthRef.current;
            const isInitialLoad = prevMessagesLengthRef.current === 0;

            const lastMessage = messages[messages.length - 1];
            const sentByMe = lastMessage && lastMessage.createdBy === userId;

            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;

            if (isInitialLoad || sentByMe || (hasNewMessage && isAtBottom)) {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages, currentTopicId, userId]);

    const handleSendMessageSubmit = async (e) => {
        e.preventDefault();
        if (!replyText.trim() && !attachedTeam) return;

        const success = await sendMessage('general', replyText, attachedTeam);
        if (success) {
            setReplyText('');
            setAttachedTeam(null);
        }
    };

    const handleImportTeam = (sharedTeam) => {
        if (!sharedTeam || !sharedTeam.pokemons) return;
        setCurrentTeam(sharedTeam.pokemons);
        setTeamName(sharedTeam.name || 'Imported Team');
        setEditingTeamId(null);
        useToastStore.getState().showToast(
            language === 'pt'
                ? `Time "${sharedTeam.name}" importado!`
                : `Team "${sharedTeam.name}" imported!`,
            "success"
        );
        navigate('/builder');
    };

    const popoverAnchor = useMemo(() => {
        return { current: hoveredSlot?.ref || null };
    }, [hoveredSlot]);

    const [greetingPokemonData, setGreetingPokemonData] = useState(null);
    const [isTipDismissed, setIsTipDismissed] = useState(() => {
        try {
            return localStorage.getItem('homeTipDismissed') === 'true';
        } catch {
            return false;
        }
    });

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            return { text: t('home.greetingMorning'), emoji: '☀️', pokemon: 'espeon', period: 'morning' };
        }
        if (hour >= 12 && hour < 18) {
            return { text: t('home.greetingAfternoon'), emoji: '🌤️', pokemon: 'pikachu', period: 'afternoon' };
        }
        return { text: t('home.greetingEvening'), emoji: '🌙', pokemon: 'umbreon', period: 'night' };
    };

    const greeting = getGreeting();

    useEffect(() => {
        let cancelled = false;

        const getFallbackGreetingPokemon = async (period) => {
            const fallbackConfig = DEFAULT_GREETING_POKEMON[period];
            if (!fallbackConfig) return null;

            const loadedPokemon = allPokemons.find(
                (pokemon) => pokemon.id === fallbackConfig.id || pokemon.name === fallbackConfig.name,
            );
            if (loadedPokemon) return loadedPokemon;

            const staticPokemon = await getStaticPokemonDetail(fallbackConfig.id);
            if (staticPokemon) return staticPokemon;

            const apiPokemon = await getPokemonApiData(fallbackConfig.id);
            return toGreetingPokemonData(apiPokemon);
        };

        const fetchGreetingPokemon = async () => {
            if (!greetingPokemonId) {
                const fallbackPokemon = await getFallbackGreetingPokemon(greeting.period);
                if (!cancelled) {
                    setGreetingPokemonData(fallbackPokemon || null);
                }
                return;
            }

            try {
                if (db) {
                    const docRef = doc(db, 'artifacts/pokemonTeamBuilder/pokemons', String(greetingPokemonId));
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        if (!cancelled) {
                            setGreetingPokemonData(docSnap.data());
                        }
                        return;
                    }
                }

                const loadedGreetingPokemon = allPokemons.find((pokemon) => pokemon.id === greetingPokemonId);
                if (loadedGreetingPokemon) {
                    if (!cancelled) {
                        setGreetingPokemonData(loadedGreetingPokemon);
                    }
                    return;
                }

                const staticGreetingPokemon = await getStaticPokemonDetail(greetingPokemonId);
                const apiGreetingPokemon = staticGreetingPokemon ? null : await getPokemonApiData(greetingPokemonId);
                if (!cancelled) {
                    setGreetingPokemonData(staticGreetingPokemon || toGreetingPokemonData(apiGreetingPokemon) || await getFallbackGreetingPokemon(greeting.period) || null);
                }
            } catch (error) {
                console.error('Error fetching greeting Pokemon:', error);

                const loadedGreetingPokemon = allPokemons.find((pokemon) => pokemon.id === greetingPokemonId);
                const fallbackPokemon = loadedGreetingPokemon
                    || await getStaticPokemonDetail(greetingPokemonId)
                    || toGreetingPokemonData(await getPokemonApiData(greetingPokemonId))
                    || await getFallbackGreetingPokemon(greeting.period);

                if (!cancelled) {
                    setGreetingPokemonData(fallbackPokemon || null);
                }
            }
        };

        fetchGreetingPokemon();

        return () => {
            cancelled = true;
        };
    }, [db, greetingPokemonId, allPokemons, greeting.period]);



    const tipOfTheDay = useMemo(() => {
        const dayOfYear = getDayOfYear();
        return POKEMON_TIPS[dayOfYear % POKEMON_TIPS.length];
    }, []);

    const stats = useMemo(() => {
        const allPokemonsInTeams = savedTeams.flatMap((team) => team.pokemons || []);
        const typeCounts = {};

        allPokemonsInTeams.forEach((teamPokemon) => {
            const pokemon = allPokemons.find((candidate) => candidate.id === teamPokemon.id);
            if (pokemon?.types) {
                pokemon.types.forEach((type) => {
                    typeCounts[type] = (typeCounts[type] || 0) + 1;
                });
            }
        });

        const favoriteType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

        return {
            totalTeams: savedTeams.length,
            totalFavoritePokemons: favoritePokemons.size,
            favoriteType: favoriteType ? favoriteType[0] : null,
        };
    }, [allPokemons, favoritePokemons, savedTeams]);

    const featuredFavorites = useMemo(
        () => allPokemons.filter((pokemon) => favoritePokemons.has(pokemon.id)).slice(0, 3),
        [allPokemons, favoritePokemons],
    );

    const activeTeam = useMemo(() => {
        if (!savedTeams || savedTeams.length === 0) return null;
        return savedTeams.find(t => t.id === activeTeamId) || savedTeams[0];
    }, [savedTeams, activeTeamId]);

    const motivationalMessages = useMemo(() => {
        return TRANSLATIONS[language]?.home?.motos || TRANSLATIONS['en']?.home?.motos || [];
    }, [language]);

    const randomMessage = useMemo(() => {
        const today = new Date();
        const seed = today.getDate() + today.getMonth();
        return motivationalMessages[seed % motivationalMessages.length] || '';
    }, [motivationalMessages]);

    const resolvedHeroBackgroundId = heroBackgroundId || getDefaultHeroBackgroundId();
    const heroBackground = getBackgroundById(resolvedHeroBackgroundId);
    const heroAccent = heroBackground?.accent || colors.primary;
    const heroAccentSoft = heroBackground?.accentSoft || `${colors.primary}18`;
    const heroAccentBorder = heroBackground?.border || `${colors.primary}40`;
    const heroSurface = heroBackground?.surface || 'rgba(17, 24, 39, 0.58)';
    const heroSurfaceBorder = heroBackground?.surfaceBorder || `${colors.primary}30`;

    const handleCycleHeroBackground = () => {
        if (SHARE_BACKGROUNDS.length < 2 || !onChangeHeroBackground) return;

        const currentIndex = SHARE_BACKGROUNDS.findIndex((background) => background.id === resolvedHeroBackgroundId);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % SHARE_BACKGROUNDS.length : 0;
        onChangeHeroBackground(SHARE_BACKGROUNDS[nextIndex]?.id || DEFAULT_BACKGROUND_ID);
    };

    const quickActions = [
        {
            label: t('home.shortcutBuilderTitle'),
            description: t('home.shortcutBuilderDesc'),
            path: '/builder',
            icon: <SwordsIcon />,
        },
        {
            label: t('home.shortcutPokedexTitle'),
            description: t('home.shortcutPokedexDesc'),
            path: '/pokedex',
            icon: <PokeballIcon />,
        },
        {
            label: t('home.shortcutQuizTitle'),
            description: t('home.shortcutQuizDesc'),
            path: '/quiz',
            icon: <SuccessToastIcon className="w-5 h-5" color="currentColor" />,
        },
        {
            label: t('pokepuzzle.title'),
            description: t('pokepuzzle.subtitle'),
            path: '/pokepuzzle',
            icon: <Puzzle className="w-5 h-5 shrink-0" />,
        },
    ];

    const activeTeamMeta = activeTeam
        ? [
            { label: language === 'pt' ? 'Integrantes' : 'Slots', value: `${(activeTeam.pokemons || []).length}/6` },
            { label: language === 'pt' ? 'Favorito' : 'Favorite', value: activeTeam.isFavorite ? t('common.yes') : t('common.no') },
        ]
        : [];

    return (
        <main className="home-view pb-6 pt-2">
            <div className="home-github-layout grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1.62fr)_minmax(280px,0.84fr)]">

                {/* Left Column: Feed, README, Pinned Items */}
                <div className="home-main-col flex flex-col gap-4 md:gap-6 min-w-0">

                    {/* 1. owner / README.md Card (Greeting & Partner) */}
                    <section
                        className="home-panel home-readme-panel p-0"
                        style={{
                            backgroundImage: `linear-gradient(to bottom, rgba(17, 17, 19, 0.62), rgba(17, 17, 19, 0.7)), url(${heroBackground?.url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            borderColor: heroAccentBorder,
                        }}
                    >
                        <div className="home-readme-header flex items-center justify-between px-4 py-2 border-b border-border bg-surface-raised/40 text-xs text-muted font-mono">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>{userId ? resolvedUsername : 'guest'} / </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {onChangeHeroBackground && (
                                    <button
                                        type="button"
                                        onClick={handleCycleHeroBackground}
                                        className="text-[10px] text-muted hover:text-fg font-semibold cursor-pointer bg-black/60 rounded px-1.5 py-0.5 bg-surface/50 transition-colors flex items-center gap-1"
                                        title={language === 'pt' ? 'Mudar Fundo' : 'Change Background'}
                                    >
                                        <Palette className="w-3 h-3 shrink-0" />
                                        <span>{language === 'pt' ? 'Fundo' : 'Theme'}</span>
                                    </button>
                                )}
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                    <span className="text-[10px] uppercase tracking-wider font-semibold">Active</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="space-y-2 flex-1 min-w-0">
                                <h1 className="text-xl md:text-2xl font-bold text-fg leading-tight">
                                    {greeting.text}.
                                </h1>
                                <p className="home-readme-description text-sm text-muted max-w-lg leading-relaxed font-medium">
                                    {randomMessage}
                                </p>
                                <div className="flex items-center gap-2 pt-1.5">
                                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface border border-border text-[10px] text-muted font-bold font-mono">
                                        <Flame className="w-3 h-3 text-warning shrink-0" />
                                        {streak?.count || 0} {language === 'pt' ? 'Dias Seguidos' : 'Days Streak'}
                                    </span>
                                    <span className="text-[10px] text-muted-more font-mono">
                                        Longest: {streak?.longest || 0}d
                                    </span>
                                </div>
                            </div>

                            {greetingPokemonData && (
                                <div
                                    className="home-partner-card glass-card shadow-lg shrink-0 self-center md:self-auto"
                                    style={{
                                        '--partner-type-color': typeColors[greetingPokemonData.types?.[0]] || 'var(--color-primary)',
                                        '--partner-type-glow': `${typeColors[greetingPokemonData.types?.[0]] || 'var(--color-primary)'}22`
                                    }}
                                >
                                    <div className="home-partner-card__actions">
                                        <button
                                            onClick={onOpenPokemonSelector}
                                            type="button"
                                            aria-label={t('profile.changeAvatarBtn')}
                                            className="home-partner-card__action-btn"
                                            title={t('profile.changeAvatarBtn')}
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="home-partner-card__sprite-container">
                                        <img
                                            src={getPokemonDisplaySprite(greetingPokemonData, { shiny: greetingPokemonIsShiny, animated: true })}
                                            alt={greetingPokemonData.name}
                                            className="home-partner-card__sprite sprite-fade"
                                            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                        />
                                    </div>

                                    <div className="home-partner-card__info">
                                        <div className="home-partner-card__meta">
                                            <span className="home-partner-card__badge">{t('home.partner')}</span>
                                            {greetingPokemonData.types && (
                                                <div className="home-partner-card__types">
                                                    {greetingPokemonData.types.map((type) => (
                                                        <img
                                                            key={type}
                                                            src={typeIcons[type]}
                                                            alt={type}
                                                            className="h-4 w-4"
                                                            title={type}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="home-partner-card__name capitalize">
                                            {greetingPokemonData.name}
                                        </h3>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 2. Pinned Item: Active Team Card */}
                    {activeTeam ? (
                        <section
                            className="home-panel home-panel--pinned-repo p-0 cursor-pointer xl:hidden"
                            onClick={() => handleEditTeam(activeTeam)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleEditTeam(activeTeam);
                                }
                            }}
                            aria-label={`Continue editing team ${activeTeam.name}`}
                        >
                            <div className="pinned-repo-header flex items-center justify-between px-4 py-2 border-b border-border bg-surface-raised">
                                <div className="flex items-center gap-2 text-xs font-bold text-fg">
                                    <Folder className="w-4 h-4 text-primary shrink-0" />
                                    <span>active</span>
                                    {savedTeams.length > 1 ? (
                                        <div className="relative inline-block ml-2" onClick={(e) => e.stopPropagation()}>
                                            <div className="home-active-team-select-wrapper">
                                                <select
                                                    value={activeTeam.id}
                                                    onChange={(e) => setActiveTeamId(e.target.value)}
                                                    className="home-active-team-select text-xs font-bold bg-transparent border-0 border-b border-dashed border-muted hover:border-fg focus:outline-none pr-5 cursor-pointer max-w-[200px] truncate"
                                                >
                                                    {savedTeams.map((team) => (
                                                        <option key={team.id} value={team.id} className="bg-surface text-fg">
                                                            {team.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <span className="home-active-team-name-mobile text-muted">/ {activeTeam.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-muted ml-1">/ {activeTeam.name}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        onClick={() => handleEditTeam(activeTeam)}
                                        className="home-active-header-btn home-active-header-btn--primary"
                                        title={t('home.editActiveTeam')}
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/builder')}
                                        className="home-active-header-btn"
                                        title={t('home.startNewTeam')}
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 space-y-3">

                                <div className="home-team-slots">
                                    {Array.from({ length: 6 }).map((_, index) => {
                                        const pokemon = activeTeam.pokemons?.[index];
                                        return (
                                            <div key={index} className="home-team-slot">
                                                {pokemon ? (
                                                    <img
                                                        src={getTeamPokemonDisplaySprite(pokemon)}
                                                        alt={pokemon.name}
                                                        className="home-team-slot__sprite sprite-fade"
                                                        title={pokemon.name}
                                                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                                    />
                                                ) : (
                                                    <div className="home-team-slot__empty">
                                                        <PokeballIcon className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="pinned-repo-footer flex items-center justify-between border-t border-border pt-3 mt-1 text-[10px] text-muted font-semibold font-mono">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className="home-type-dot" style={{ backgroundColor: activeTeam.isFavorite ? 'var(--color-accent)' : 'var(--color-primary)' }} />
                                            <span>{activeTeam.isFavorite ? 'Favorite' : 'Team'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <GitCommit className="w-3.5 h-3.5" />
                                            <span>{activeTeam.pokemons?.length || 0}/6</span>
                                        </div>
                                    </div>
                                    <span>Updated recently</span>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="home-panel home-panel--pinned-repo p-0 xl:hidden">
                            <div className="pinned-repo-header flex items-center gap-2 px-4 py-2 border-b border-border bg-surface-raised text-xs font-bold text-fg">
                                <Folder className="w-4 h-4 text-primary shrink-0" />
                                <span>team</span>
                            </div>
                            <div className="p-4 flex flex-col justify-between min-h-[140px]">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-fg">{t('home.buildFirstTeam')}</h3>
                                    <p className="text-xs text-muted leading-relaxed">
                                        {t('home.buildFirstTeamDesc')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/builder')}
                                    className="home-button home-button--primary mt-3 text-xs w-full justify-center"
                                >
                                    <SwordsIcon />
                                    {t('home.createFirstTeam')}
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Dashboard hub: quick access, popular-in-tournaments, recent teams */}
                    <HomeDashboard navigate={navigate} />

                </div>

                {/* Right column: trainer widgets up top, activity feed in the bottom half */}
                <aside className="home-sidebar flex flex-col gap-4 md:gap-7">
                    {/* Trainer widgets (profile + daily) */}
                    <div className="home-desktop-widgets-grid">
                        {/* 1. Trainer Profile Sidebar Card (GitHub Style) */}
                        <section className="home-profile-sidebar-card">
                            <div className="home-profile-card-header flex items-center gap-3 w-full">
                                <div className="home-profile-avatar-container shrink-0">
                                    <img
                                        src={greetingPokemonData ? getPokemonDisplaySprite(greetingPokemonData, { shiny: greetingPokemonIsShiny, animated: true }) : POKEBALL_PLACEHOLDER_URL}
                                        alt="Trainer Avatar"
                                        className="home-profile-avatar"
                                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                        style={{ imageRendering: 'pixelated' }}
                                    />
                                    <button
                                        onClick={onOpenPokemonSelector}
                                        className="home-profile-avatar-edit-btn"
                                        title={t('profile.changeAvatarBtn')}
                                    >
                                        <Edit className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="home-profile-names min-w-0 flex-1 text-left">
                                    <h2 className="home-profile-fullname truncate text-fg font-bold leading-tight">{userId ? resolvedDisplayName : 'Guest Trainer'}</h2>
                                    <p className="home-profile-username truncate text-muted text-xs font-mono">@{userId ? resolvedUsername : 'guest'}</p>
                                </div>

                                <button
                                    onClick={() => navigate('/profile')}
                                    className="home-profile-edit-btn shrink-0 flex items-center justify-center p-1.5 border border-border bg-surface-raised rounded hover:bg-surface transition-colors"
                                    title={t('profile.trainerProfile')}
                                    style={{ width: 'auto', height: 'auto', display: 'inline-flex' }}
                                >
                                    <Edit className="w-3.5 h-3.5 text-muted hover:text-fg" />
                                </button>
                            </div>

                            <div className="home-profile-meta-list mt-3 pt-3 border-t border-border w-full">
                                <div className="home-profile-meta-grid">
                                    <div className="flex items-center gap-1.5 text-xs text-muted">
                                        <Folder className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                        <span className="truncate">{stats.totalTeams} {t('home.statTeamsMuted')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted">
                                        <StarIcon className="w-3.5 h-3.5 shrink-0 opacity-70" isFavorite={true} />
                                        <span className="truncate">{stats.totalFavoritePokemons} {t('home.statPinnedMuted')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted">
                                        <Flame className="w-3.5 h-3.5 shrink-0 text-warning opacity-90" />
                                        <span className="truncate">{streak?.count || 0} {language === 'pt' ? 'dias' : 'days'}</span>
                                    </div>
                                    {stats.favoriteType && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted">
                                            <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0" aria-hidden="true">
                                                <span className="home-type-dot border border-border" style={{ backgroundColor: typeColors[stats.favoriteType] || '#A8A77A', width: '0.45rem', height: '0.45rem', shrink: 0 }} />
                                            </div>
                                            <span className="capitalize truncate">{t(`types.${stats.favoriteType}`)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* 2. Daily Challenge Card */}
                        {isDailyPokePuzzleLoading ? (
                            <div className="home-sidebar-section home-sidebar-section--daily p-4 animate-pulse space-y-2">
                                <div className="home-skeleton home-skeleton--short"></div>
                                <div className="home-skeleton home-skeleton--title"></div>
                            </div>
                        ) : dailyPokePuzzleTarget ? (
                            <div
                                className="home-sidebar-section--daily cursor-pointer flex items-center gap-3 p-4"
                                onClick={() => navigate('/pokepuzzle')}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        navigate('/pokepuzzle');
                                    }
                                }}
                                aria-label="Play daily Pokemon guess challenge"
                            >
                                <div className="home-daily__sprite-container h-12 w-12 shrink-0 bg-surface border border-border rounded-md flex items-center justify-center overflow-hidden">
                                    <img
                                        src={getPokemonArtworkSpriteUrl(dailyPokePuzzleSummary?.solved ? dailyPokePuzzleTarget.id : teaserSilhouetteId)}
                                        alt="Mystery daily Pokemon"
                                        className={`home-daily__sprite h-10 w-10 object-contain ${dailyPokePuzzleSummary?.solved ? '' : 'pokepuzzle-silhouette'}`}
                                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                    />
                                </div>

                                <div className="min-w-0 flex-1 flex flex-col justify-between h-12">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="home-panel__eyebrow text-[9px] leading-none">{t('pokepuzzle.homeTeaserTitle')}</p>
                                            <h3 className="home-panel__title home-panel__title--daily capitalize text-xs font-semibold truncate mt-1">
                                                {dailyPokePuzzleSummary?.solved ? formatPokemonDisplayName(dailyPokePuzzleTarget.name) : '??????'}
                                            </h3>
                                        </div>
                                        {dailyPokePuzzleSummary?.solved ? (
                                            <span className="badge badge-success text-[8px] py-0.5 px-1.5 shrink-0 flex items-center gap-0.5">
                                                <Award className="w-3.5 h-3.5 text-white" />
                                                {t('pokepuzzle.dailySolvedBadge')}
                                            </span>
                                        ) : (
                                            <span className="home-daily__number text-[9px] font-semibold text-muted">
                                                #{String(dailyPokePuzzleTarget.id).padStart(3, '0')}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-muted truncate mr-2">
                                            {dailyPokePuzzleSummary?.solved
                                                ? t('pokepuzzle.homeTeaserSolved', { attempts: dailyPokePuzzleSummary.attempts })
                                                : t('pokepuzzle.homeTeaserSubtitle')
                                            }
                                        </span>
                                        <span className="text-primary font-bold hover:underline shrink-0">
                                            {dailyPokePuzzleSummary?.solved ? t('common.yes') : t('pokepuzzle.homeTeaserPlay')} →
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                    </div>

                    {/* Activity feed — bottom half of the right column */}
                    <div className="home-forum-chat-card-wrapper home-forum-chat-card p-0">
                        <div className="home-forum-chat-header px-4 py-3 border-b border-border flex items-center justify-between">
                            <h3 className="home-forum-chat-title text-sm font-bold text-fg flex items-center gap-2 w-full">
                                <MessageIcon className="w-4 h-4 text-primary shrink-0" />
                                {language === 'pt' ? 'Linha do Tempo' : 'Timeline'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => navigate('/feed')}
                                className="home-button home-button--inline text-[10px] py-0.5 px-2"
                            >
                                <span className="home-forum-chat-header-btn-desktop">
                                    {language === 'pt' ? 'Ver Fórum →' : 'View Forum →'}
                                </span>
                                <span className="home-forum-chat-header-btn-mobile">
                                    {language === 'pt' ? 'Fórum →' : 'Forum →'}
                                </span>
                            </button>
                        </div>

                        <div ref={messageListRef} className="home-forum-chat-messages home-timeline-container custom-scrollbar px-4 py-4">
                            {messages.length === 0 ? (
                                <div className="text-center py-12 text-muted text-xs font-mono">
                                    {language === 'pt' ? 'Nenhuma atividade registrada.' : 'No activity logged.'}
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const isMsgAdmin = message.createdBy === 'system' || message.userEmail === 'enzopo625@gmail.com' || (message.creatorName === 'Professor Oak');

                                    return (
                                        <div key={message.id} className="home-timeline-item">
                                            {/* Timeline axis point & avatar */}
                                            <div className="home-timeline-avatar-wrap">
                                                <div
                                                    className="home-timeline-avatar cursor-pointer"
                                                    onClick={() => setSelectedProfile({
                                                        userId: message.createdBy,
                                                        name: message.creatorName,
                                                        avatar: message.creatorAvatar,
                                                        isShiny: message.creatorAvatarIsShiny
                                                    })}
                                                >
                                                    {message.creatorAvatar ? (
                                                        <img
                                                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${message.creatorAvatarIsShiny ? 'shiny/' : ''}${message.creatorAvatar}.png`}
                                                            alt=""
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <PokeballIcon className="w-4 h-4 text-muted opacity-50" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Speech bubble or PR Card */}
                                            <div className="home-timeline-content-wrap">
                                                {message.sharedTeam ? (
                                                    /* Pull Request Styled Merge Card */
                                                    <div className="github-pr-card">
                                                        <div className="github-pr-header flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-xs text-muted flex-wrap">
                                                                <GitBranch className="w-3.5 h-3.5 text-success shrink-0" />
                                                                <span
                                                                    className="font-bold text-fg cursor-pointer hover:underline"
                                                                    onClick={() => setSelectedProfile({
                                                                        userId: message.createdBy,
                                                                        name: message.creatorName,
                                                                        avatar: message.creatorAvatar,
                                                                        isShiny: message.creatorAvatarIsShiny
                                                                    })}
                                                                >
                                                                    @{message.creatorName}
                                                                </span>
                                                                <span>merged team:</span>
                                                                <span className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border text-primary font-bold">{message.sharedTeam.name}</span>
                                                            </div>
                                                            <span className="text-[9px] text-muted-more shrink-0">{formatRelativeTime(message.createdAt, language)}</span>
                                                        </div>
                                                        <div className="github-pr-body mt-2.5 flex items-center justify-between gap-4 flex-wrap">
                                                            <div className="flex gap-[1px] flex-wrap">
                                                                {Array.from({ length: 6 }).map((_, slotIdx) => {
                                                                    const pk = message.sharedTeam.pokemons?.[slotIdx];
                                                                    const spriteUrl = pk ? (pk.customization?.isShiny ? pk.shinySprite : pk.sprite) : null;
                                                                    return (
                                                                        <div
                                                                            key={slotIdx}
                                                                            className="github-pr-slot border border-border bg-surface-raised rounded-md p-1 h-9 w-9 flex items-center justify-center cursor-pointer"
                                                                            onMouseEnter={(e) => pk && setHoveredSlot({
                                                                                messageId: message.id,
                                                                                slotIndex: slotIdx,
                                                                                pokemon: pk,
                                                                                ref: e.currentTarget
                                                                            })}
                                                                            onMouseLeave={() => setHoveredSlot(null)}
                                                                        >
                                                                            {spriteUrl ? (
                                                                                <img
                                                                                    src={spriteUrl}
                                                                                    alt={pk.name}
                                                                                    className="h-8 w-8 object-contain"
                                                                                    onError={(e) => { e.currentTarget.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'; }}
                                                                                />
                                                                            ) : (
                                                                                <span className="opacity-25"><PokeballIcon className="w-3.5 h-3.5" /></span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleImportTeam(message.sharedTeam)}
                                                                className="github-pr-merge-btn py-1 px-3 rounded-md text-xs font-bold flex items-center gap-1"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                                <span>{language === 'pt' ? 'Importar' : 'Import'}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Talk bubble styled timeline comment */
                                                    <div className="github-comment-bubble">
                                                        <div className="github-comment-header flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-xs text-muted flex-wrap">
                                                                <span
                                                                    className="font-bold text-fg cursor-pointer hover:underline"
                                                                    onClick={() => setSelectedProfile({
                                                                        userId: message.createdBy,
                                                                        name: message.creatorName,
                                                                        avatar: message.creatorAvatar,
                                                                        isShiny: message.creatorAvatarIsShiny
                                                                    })}
                                                                >
                                                                    @{message.creatorName}
                                                                </span>
                                                                {isMsgAdmin && (
                                                                    <span className="github-comment-admin-badge text-[8px] uppercase tracking-wider px-1 border border-primary/45 rounded bg-primary-soft text-primary font-bold">
                                                                        {message.creatorName === 'Professor Oak' ? 'System' : 'Admin'}
                                                                    </span>
                                                                )}
                                                                <span>commented:</span>
                                                            </div>
                                                            <span className="text-[9px] text-muted-more shrink-0">{formatRelativeTime(message.createdAt, language)}</span>
                                                        </div>
                                                        <div className="github-comment-body p-3">
                                                            <p className="text-xs text-fg leading-relaxed">{message.text}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messageListEndRef} />
                        </div>

                        <form onSubmit={handleSendMessageSubmit} className="forum-editor px-4 py-3 border-t border-border">
                            {attachedTeam && (
                                <div className="forum-attached-team-preview py-1.5 px-2.5 text-[11px] gap-1.5 flex items-center mb-2 bg-surface-raised border border-border rounded-lg">
                                    <ClipIcon className="w-3 h-3 text-success shrink-0" />
                                    <span className="truncate">{attachedTeam.name}</span>
                                    <button type="button" onClick={() => setAttachedTeam(null)} className="ml-auto hover:text-danger text-muted">
                                        <CloseIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            <div className="forum-chat-input-wrapper">
                                <div className="relative shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsAttachDropdownOpen(!isAttachDropdownOpen)}
                                        className="forum-chat-attach-btn"
                                        title={language === 'pt' ? 'Anexar Time' : 'Attach Team'}
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                    </button>
                                    {isAttachDropdownOpen && (
                                        <div className="absolute left-0 bottom-full mb-2 z-50 w-64 bg-surface border border-border rounded-lg shadow-xl p-2 max-h-48 overflow-y-auto">
                                            <p className="text-[10px] text-muted font-bold px-2 py-1 uppercase tracking-wider border-b border-border mb-1">
                                                {language === 'pt' ? 'Seus Times Salvos' : 'Your Saved Teams'}
                                            </p>
                                            {activeRoster.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAttachedTeam({ name: activeRosterName || 'Active Team', pokemons: activeRoster });
                                                        setIsAttachDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left text-xs px-2 py-1.5 hover:bg-surface-raised rounded text-primary font-bold truncate flex items-center gap-1.5"
                                                >
                                                    <StarIcon className="w-3.5 h-3.5 text-accent shrink-0" isFavorite={true} />
                                                    {language === 'pt' ? 'Time Ativo Construtor' : 'Active Team in Builder'}
                                                </button>
                                            )}
                                            {savedTeams.map(team => (
                                                <button
                                                    type="button"
                                                    key={team.id}
                                                    onClick={() => {
                                                        setAttachedTeam(team);
                                                        setIsAttachDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left text-xs px-2 py-1.5 hover:bg-surface-raised rounded text-fg truncate block"
                                                >
                                                    {team.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={language === 'pt' ? "Comente na linha do tempo..." : "Post to the timeline..."}
                                    className="forum-chat-input-field text-xs"
                                />

                                <button
                                    type="submit"
                                    disabled={!replyText.trim() && !attachedTeam}
                                    className="forum-chat-send-btn bg-primary text-white hover:opacity-95"
                                    title={language === 'pt' ? 'Enviar' : 'Send'}
                                >
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </div>
                </aside>
            </div>

            {/* Popover for hovering pokemon details in chat */}
            <AnchoredPopover
                isOpen={!!hoveredSlot}
                anchorRef={popoverAnchor}
                popoverRef={popoverRef}
                className="bg-surface border border-border rounded-lg shadow-xl p-3 text-xs w-48 space-y-1.5 z-50 elevation-3"
                arrowStyle={{ backgroundColor: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', borderTop: '1px solid var(--color-border)' }}
            >
                {hoveredSlot && (
                    <div>
                        <h4 className="font-bold text-fg capitalize mb-1">{hoveredSlot.pokemon.name}</h4>
                        {hoveredSlot.pokemon.customization?.ability && (
                            <p><span className="text-muted">{t('builder.ability')}:</span> <span className="font-semibold text-fg capitalize">{hoveredSlot.pokemon.customization.ability.replace(/-/g, ' ')}</span></p>
                        )}
                        {hoveredSlot.pokemon.customization?.item && (
                            <p><span className="text-muted">{t('builder.item')}:</span> <span className="font-semibold text-fg capitalize">{hoveredSlot.pokemon.customization.item.replace(/-/g, ' ')}</span></p>
                        )}
                        {hoveredSlot.pokemon.customization?.nature && (
                            <p><span className="text-muted">{t('builder.nature')}:</span> <span className="font-semibold text-fg capitalize">{hoveredSlot.pokemon.customization.nature}</span></p>
                        )}
                        {hoveredSlot.pokemon.customization?.moves?.length > 0 && (
                            <div className="mt-1 border-t border-border pt-1">
                                <span className="text-muted font-bold block mb-0.5">{t('builder.moves')}:</span>
                                <ul className="list-disc pl-3 space-y-0.5">
                                    {hoveredSlot.pokemon.customization.moves.filter(Boolean).map(m => (
                                        <li key={m} className="capitalize text-fg">{m.replace(/-/g, ' ')}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </AnchoredPopover>

            <UserProfileModal
                isOpen={!!selectedProfile}
                profile={selectedProfile}
                onClose={() => setSelectedProfile(null)}
                messages={messages}
                handleImportTeam={handleImportTeam}
                language={language}
            />
        </main>
    );
}