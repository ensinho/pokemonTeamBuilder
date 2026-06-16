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


import { DEFAULT_BACKGROUND_ID, SHARE_BACKGROUNDS, getBackgroundById } from '../../assets/backgrounds';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeColors, typeIcons } from '../../constants/types';
import { POKEMON_TIPS } from '../../constants/pokemon';
import { getPokemonApiData, getStaticPokemonDetail } from '../../services/pokemonDataCache';
import { getPokemonDisplaySprite, getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { EmptyState } from '../EmptyState';
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
import { Download, Edit } from 'lucide-react';

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

    const { userId } = useAuthStore();
    const { currentTeam: activeRoster, teamName: activeRosterName, setCurrentTeam, setTeamName, setEditingTeamId } = useActiveTeamStore();

    const [replyText, setReplyText] = useState('');
    const [attachedTeam, setAttachedTeam] = useState(null);
    const [isAttachDropdownOpen, setIsAttachDropdownOpen] = useState(false);
    const [hoveredSlot, setHoveredSlot] = useState(null);
    const [selectedProfile, setSelectedProfile] = useState(null);

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
    const [isDailyPokemonLoading, setIsDailyPokemonLoading] = useState(true);
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

    const pokemonOfTheDay = useMemo(() => {
        if (!allPokemons || allPokemons.length === 0) {
            return null;
        }

        const dayOfYear = getDayOfYear();
        const seed = dayOfYear;
        const random = ((seed * 9301 + 49297) % 233280) / 233280;
        const index = Math.floor(random * allPokemons.length);

        return allPokemons[index] || allPokemons[0];
    }, [allPokemons]);

    useEffect(() => {
        setIsDailyPokemonLoading(!(allPokemons && allPokemons.length > 0));
    }, [allPokemons]);

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
            label: t('home.shortcutGuesserTitle'),
            description: t('home.shortcutGuesserDesc'),
            path: '/generator',
            icon: <DiceIcon />,
        },
    ];

    const activeTeamMeta = activeTeam
        ? [
            { label: language === 'pt' ? 'Integrantes' : 'Slots', value: `${(activeTeam.pokemons || []).length}/6` },
            { label: language === 'pt' ? 'Favorito' : 'Favorite', value: activeTeam.isFavorite ? t('common.yes') : t('common.no') },
        ]
        : [];

    return (
        <main className="home-view space-y-3 pb-6">
            <section className="grid gap-3.5 xl:grid-cols-[minmax(0,1.62fr)_minmax(280px,0.84fr)]">
                <section
                    className="home-panel home-panel--hero p-4"
                    style={{
                        '--home-hero-accent': heroAccent,
                        '--home-hero-accent-soft': heroAccentSoft,
                        '--home-hero-accent-border': heroAccentBorder,
                        '--home-hero-surface': heroSurface,
                        '--home-hero-surface-border': heroSurfaceBorder,
                        '--home-hero-wallpaper-image': heroBackground ? `url(${heroBackground.url})` : 'none',
                    }}
                    aria-label="Trainer overview"
                >
                    {/* Wallpaper button — top-right of the hero card */}
                    <button
                        onClick={handleCycleHeroBackground}
                        type="button"
                        aria-label={`Change hero wallpaper. Current wallpaper: ${heroBackground?.name ?? 'default'}`}
                        className="home-hero__wallpaper-btn"
                        title={`Change wallpaper${heroBackground ? ` (${heroBackground.name})` : ''}`}
                    >
                        <DiceIcon />
                    </button>
                    <div className="home-hero__content">
                        <div className="home-hero__lead">
                            <h1 className="home-panel__title home-panel__title--hero">
                                {greeting.text}, {language === 'pt' ? 'Treinador' : 'Trainer'}.
                            </h1>
                            <p className="home-panel__description">
                                {randomMessage}
                            </p>
                        </div>

                        {greetingPokemonData && (
                            <div className="home-partner-card glass-card">
                                <div className="home-partner-card__actions">
                                    <button
                                        onClick={onOpenPokemonSelector}
                                        type="button"
                                        aria-label={t('profile.changeAvatarBtn')}
                                        className="home-partner-card__action-btn"
                                        title={t('profile.changeAvatarBtn')}
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
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

                {/* Mobile Shortcuts (only visible on mobile via CSS) */}
                <div className="home-mobile-shortcuts-section">
                    <div className="home-shortcuts-container">
                        {quickActions.map((shortcut) => (
                            <button
                                key={shortcut.path}
                                type="button"
                                onClick={() => navigate(shortcut.path)}
                                className="home-list-button p-1 text-left flex items-center gap-2 w-full border-0 bg-transparent cursor-pointer"
                            >
                                <span className="home-list-button__icon w-4 h-4 flex-shrink-0 flex items-center justify-center text-muted" aria-hidden="true">
                                    {shortcut.icon}
                                </span>
                                <span className="home-list-button__title text-xs truncate font-medium text-fg">{shortcut.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {activeTeam ? (
                    <section
                        className="home-panel home-panel--feature home-panel--interactive flex min-h-[195px] cursor-pointer flex-col justify-between p-4"
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
                        <div className="space-y-3.5 min-w-0 w-full">
                            <div className="flex items-start justify-between gap-4 w-full">
                                <div className="min-w-0 flex-1">
                                    <p className="home-panel__eyebrow">
                                        {t('home.activeTeam')}
                                    </p>
                                    {savedTeams.length > 1 ? (
                                        <div className="relative inline-block w-full mt-1.5" onClick={(e) => e.stopPropagation()}>
                                            <select
                                                value={activeTeam.id}
                                                onChange={(e) => setActiveTeamId(e.target.value)}
                                                className="home-active-team-select text-lg font-bold bg-transparent border-0 border-b border-dashed border-muted hover:border-fg focus:outline-none pr-6 cursor-pointer max-w-[280px] truncate"
                                            >
                                                {savedTeams.map((team) => (
                                                    <option key={team.id} value={team.id} className="bg-surface text-fg">
                                                        {team.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <h2 className="home-panel__title home-panel__title--feature truncate">
                                            {activeTeam.name}
                                        </h2>
                                    )}
                                    <p className="home-panel__description max-w-lg mt-1.5">
                                        {t('home.activeTeamDesc')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 self-start" onClick={(e) => e.stopPropagation()}>
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

                            <dl className="home-inline-meta">
                                {activeTeamMeta.map(({ label, value }) => (
                                    <div key={label}>
                                        <dt>{label}</dt>
                                        <dd>{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>


                    </section>
                ) : (
                    <section className="home-panel home-panel--feature flex min-h-[200px] flex-col justify-between p-4">
                        <div className="space-y-3">
                            <div>
                                <p className="home-panel__eyebrow">
                                    {t('home.firstSteps')}
                                </p>
                                <h2 className="home-panel__title home-panel__title--feature">
                                    {t('home.buildFirstTeam')}
                                </h2>
                            </div>
                            <p className="home-panel__description max-w-lg">
                                {t('home.buildFirstTeamDesc')}
                            </p>
                        </div>
                        <div className="home-action-row mt-8">
                            <button
                                type="button"
                                onClick={() => navigate('/builder')}
                                className="home-button home-button--primary w-full"
                            >
                                <SwordsIcon />
                                {t('home.createFirstTeam')}
                            </button>
                        </div>
                    </section>
                )}
            </section>

            <section className="home-dashboard">
                {/* Left Column: Compact General Chat Feed */}
                <div className="home-forum-chat-card-wrapper home-forum-chat-card">
                    <div className="home-forum-chat-header border-b border-border">
                        <h3 className="home-forum-chat-title w-full">
                            <MessageIcon className="w-5 h-5 text-primary shrink-0" />
                            {language === 'pt' ? 'Chat e Times' : 'Chat & Teams'}
                        </h3>
                        <button
                            type="button"
                            onClick={() => navigate('/feed')}
                            className="home-button home-button--inline"
                        >
                            <span className="home-forum-chat-header-btn-desktop">
                                {language === 'pt' ? 'Ver Fórum Completo →' : 'View Full Forum →'}
                            </span>
                            <span className="home-forum-chat-header-btn-mobile">
                                {language === 'pt' ? 'Fórum →' : 'Forum →'}
                            </span>
                        </button>
                    </div>

                    <div ref={messageListRef} className="home-forum-chat-messages custom-scrollbar">
                        {messages.length === 0 ? (
                            <div className="text-center py-12 text-muted text-xs">
                                {language === 'pt' ? 'Nenhuma mensagem escrita no chat geral.' : 'No messages posted in general chat.'}
                            </div>
                        ) : (
                            messages.map((message) => {
                                const isMsgAdmin = message.createdBy === 'system' || message.userEmail === 'enzopo625@gmail.com' || (message.creatorName === 'Professor Oak');
                                return (
                                    <div key={message.id} className="forum-message-item">
                                        <div className="forum-message-avatar-wrap">
                                            <div
                                                className="forum-message-avatar cursor-pointer"
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

                                        <div className="forum-message-bubble">
                                            <div className="forum-message-header">
                                                <div>
                                                    <span
                                                        className="forum-message-author text-xs cursor-pointer hover:underline"
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
                                                        <span className="forum-message-author-badge text-[9px]">
                                                            {message.creatorName === 'Professor Oak' ? 'System' : 'Admin'}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="forum-message-time text-[9px]">
                                                    {formatRelativeTime(message.createdAt, language)}
                                                </span>
                                            </div>

                                            {message.text && (
                                                <p className="forum-message-text text-xs">{message.text}</p>
                                            )}

                                            {message.sharedTeam && (
                                                <div className="forum-team-share-card compact-row mt-1.5">
                                                    <div className="forum-team-share-left">
                                                        <h5 className="forum-team-share-title text-[10px] font-bold flex items-center gap-1">
                                                            <PokeballIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                                            <span className="truncate max-w-[80px]">{message.sharedTeam.name}</span>
                                                        </h5>
                                                        <div className="forum-team-share-slots p-1 gap-1">
                                                            {Array.from({ length: 6 }).map((_, slotIdx) => {
                                                                const pk = message.sharedTeam.pokemons?.[slotIdx];
                                                                const spriteUrl = pk ? (pk.customization?.isShiny ? pk.shinySprite : pk.sprite) : null;

                                                                return (
                                                                    <div
                                                                        key={slotIdx}
                                                                        className="forum-team-share-slot"
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
                                                                                className="forum-team-share-sprite"
                                                                                onError={(e) => { e.currentTarget.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'; }}
                                                                            />
                                                                        ) : (
                                                                            <span className="forum-team-share-empty">
                                                                                <PokeballIcon className="w-3 h-3" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleImportTeam(message.sharedTeam)}
                                                        className="btn btn-primary import-btn-compact py-0.5 px-2 h-6 text-[10px] font-bold flex items-center gap-0.5 shrink-0"
                                                    >
                                                        <Download />
                                                        {language === 'pt' ? 'Importar' : 'Import'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messageListEndRef} />
                    </div>

                    <form onSubmit={handleSendMessageSubmit} className="forum-editor p-2">
                        {attachedTeam && (
                            <div className="forum-attached-team-preview py-1 px-2 text-[11px] gap-1 flex items-center mb-2">
                                <ClipIcon className="w-3 h-3 text-success shrink-0" />
                                <span className="truncate">{attachedTeam.name}</span>
                                <button type="button" onClick={() => setAttachedTeam(null)}>
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
                                placeholder={language === 'pt' ? "Conversar..." : "Chat..."}
                                className="forum-chat-input-field"
                            />

                            <button
                                type="submit"
                                disabled={!replyText.trim() && !attachedTeam}
                                className="forum-chat-send-btn"
                                title={language === 'pt' ? 'Enviar' : 'Send'}
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Column: Compacted Sidebar */}
                <aside className="home-sidebar">
                    {/* 1. Daily Pokémon section (always visible, GitHub-like compact) */}
                    {isDailyPokemonLoading ? (
                        <section className="home-sidebar-section py-3 px-1 animate-pulse">
                            <div className="home-skeleton home-skeleton--short"></div>
                            <div className="mt-2 home-skeleton home-skeleton--title"></div>
                        </section>
                    ) : pokemonOfTheDay ? (
                        <section
                            className="home-sidebar-section home-sidebar-section--daily cursor-pointer py-3.5 px-1 flex items-center gap-3 hover:text-primary transition-colors"
                            onClick={() => showDetails(pokemonOfTheDay)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    showDetails(pokemonOfTheDay);
                                }
                            }}
                            aria-label={`Open details for ${pokemonOfTheDay.name}`}
                        >
                            <div className="home-daily__sprite-container h-14 w-14 shrink-0 bg-surface border border-border rounded-md flex items-center justify-center">
                                <img
                                    src={pokemonOfTheDay.animatedSprite || pokemonOfTheDay.sprite || POKEBALL_PLACEHOLDER_URL}
                                    alt={pokemonOfTheDay.name}
                                    className="home-daily__sprite h-13 w-13 object-contain"
                                    onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                />
                            </div>

                            <div className="min-w-0 flex-1 flex flex-col justify-between h-14">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="home-panel__eyebrow text-[9px] leading-none">{t('home.dailyPokemon')}</p>
                                        <h3 className="home-panel__title home-panel__title--daily capitalize text-xs font-semibold truncate mt-1">
                                            {pokemonOfTheDay.name}
                                        </h3>
                                    </div>
                                    <span className="home-daily__number text-[9px] font-semibold text-muted">
                                        #{String(pokemonOfTheDay.id).padStart(3, '0')}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="flex flex-wrap gap-1">
                                        {pokemonOfTheDay.types?.map((type) => (
                                            <span
                                                key={type}
                                                className="home-type-pill capitalize text-[9px] py-0 px-1.5 leading-none border rounded"
                                                style={{
                                                    backgroundColor: `${typeColors[type]}12`,
                                                    borderColor: `${typeColors[type]}24`,
                                                    color: typeColors[type],
                                                }}
                                            >
                                                {type}
                                            </span>
                                        ))}
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleFavoritePokemon(pokemonOfTheDay.id);
                                        }}
                                        className="home-daily__fav-btn w-6 h-6 flex items-center justify-center rounded border border-border bg-surface-raised text-muted hover:text-accent"
                                        type="button"
                                    >
                                        <StarIcon
                                            className="w-3.5 h-3.5"
                                            isFavorite={favoritePokemons.has(pokemonOfTheDay.id)}
                                            color="currentColor"
                                        />
                                    </button>
                                </div>
                            </div>
                        </section>
                    ) : null}

                    {/* 2. Trainer Stats Section */}
                    <CollapsiblePanel
                        title={t('home.statsTitle')}
                        eyebrow={t('home.trainerCard')}
                        className="home-sidebar-section home-trainer-stats-section py-3 px-1"
                    >
                        {stats.totalTeams > 0 ? (
                            <div className="home-stat-grid gap-1">
                                <div className="home-stat-card p-1">
                                    <span className="home-stat-card__label text-[9px]">{t('home.statTeams')}</span>
                                    <strong className="home-stat-card__value text-xs font-bold">{stats.totalTeams}</strong>
                                </div>
                                <div className="home-stat-card p-1">
                                    <span className="home-stat-card__label text-[9px]">{t('home.statPinned')}</span>
                                    <strong className="home-stat-card__value text-xs font-bold">{stats.totalFavoritePokemons}</strong>
                                </div>
                                <div className="home-stat-card home-stat-card--type p-1">
                                    <span className="home-stat-card__label text-[9px]">{t('home.statFavType')}</span>
                                    {stats.favoriteType ? (
                                        <span className="home-type-pill capitalize text-[9px] py-1 px-1 mt-1 justify-center w-full" style={{ backgroundColor: `${typeColors[stats.favoriteType]}12`, borderColor: `${typeColors[stats.favoriteType]}24`, color: typeColors[stats.favoriteType] }}>
                                            {stats.favoriteType}
                                        </span>
                                    ) : (
                                        <strong className="home-stat-card__value text-xs font-bold mt-1">--</strong>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <TrainerStatsEmptyState
                                onBrowsePokedex={() => navigate('/pokedex')}
                            />
                        )}
                    </CollapsiblePanel>

                    {/* 3. Shortcuts Section */}
                    <CollapsiblePanel
                        title={t('home.shortcuts')}
                        eyebrow={language === 'pt' ? 'Navegação' : 'Navigation'}
                        className="home-sidebar-section home-shortcuts-sidebar-section py-3 px-1"
                    >
                        <div className="home-shortcuts-container">
                            {quickActions.map((shortcut) => (
                                <button
                                    key={shortcut.path}
                                    type="button"
                                    onClick={() => navigate(shortcut.path)}
                                    className="home-list-button p-1 text-left flex items-center gap-2 w-full border-0 bg-transparent cursor-pointer"
                                >
                                    <span className="home-list-button__icon w-4 h-4 flex-shrink-0 flex items-center justify-center text-muted" aria-hidden="true">
                                        {shortcut.icon}
                                    </span>
                                    <span className="home-list-button__title text-xs truncate font-medium text-fg">{shortcut.label}</span>
                                </button>
                            ))}
                        </div>
                    </CollapsiblePanel>

                    {/* 4. Did You Know? Section */}
                    {!isTipDismissed && (
                        <CollapsiblePanel
                            title={t('home.didYouKnow')}
                            eyebrow={t('home.todaysNote')}
                            className="home-sidebar-section py-3 px-1"
                        >
                            <p className="text-xs text-muted leading-relaxed">{tipOfTheDay}</p>
                        </CollapsiblePanel>
                    )}

                    {/* 5. Pinned Favorites */}
                    {featuredFavorites.length > 0 && (
                        <section className="home-sidebar-section py-3 px-1">
                            <div className="flex items-center justify-between gap-3">
                                <div className="w-full">
                                    <p className="home-panel__eyebrow text-[9px]">{t('home.pinnedRoster')}</p>
                                    <h3 className="home-panel__section-title mt-0.5">{t('home.yourFavorites')}</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/favorites')}
                                    className="home-button home-button--inline text-[10px] py-0.5 px-1.5"
                                >
                                    {t('home.seeAll')}
                                </button>
                            </div>

                            <div className="home-favorite-grid home-favorite-grid--sidebar mt-2.5">
                                {featuredFavorites.map((pokemon) => (
                                    <div
                                        key={pokemon.id}
                                        onClick={() => showDetails(pokemon)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                showDetails(pokemon);
                                            }
                                        }}
                                        className="home-favorite-card home-favorite-card--compact p-1"
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Open details for ${pokemon.name}`}
                                    >
                                        <img
                                            src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL}
                                            alt={pokemon.name}
                                            className="home-favorite-card__sprite h-6 w-6"
                                            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                        />
                                        <p className="home-favorite-card__name home-favorite-name-desktop capitalize text-[9px]">
                                            {pokemon.name}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </aside>

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
            </section>
        </main>
    );
}