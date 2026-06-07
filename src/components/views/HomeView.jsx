import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import '../../styles/home-view.css';

import { DEFAULT_BACKGROUND_ID, SHARE_BACKGROUNDS, getBackgroundById } from '../../assets/backgrounds';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeColors, typeIcons } from '../../constants/types';
import { POKEMON_TIPS } from '../../constants/pokemon';
import { getPokemonApiData, getStaticPokemonDetail } from '../../services/pokemonDataCache';
import { getPokemonDisplaySprite, getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { EmptyState } from '../EmptyState';
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

const TrainerStatsEmptyState = ({ onBrowsePokedex }) => {
    const previewStats = [
        { label: 'Teams', value: '0' },
        { label: 'Pinned', value: '0' },
        { label: 'Type', value: '--' },
    ];

    return (
        <div className="home-empty-state">
            <div className="flex items-start gap-3">
                <div className="home-empty-state__icon" aria-hidden="true">
                    <AccountIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <p className="home-empty-state__title">
                        Your trainer card starts here
                    </p>
                    <p className="home-empty-state__copy">
                        Save 1 team to unlock your stats.
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
                    Browse Pokédex
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
    recentTeams,
    showDetails,
    onToggleFavoritePokemon,
    handleEditTeam,
    greetingPokemonId,
    greetingPokemonIsShiny,
    heroBackgroundId,
    onChangeHeroBackground,
    onOpenPokemonSelector,
    db,
}) {
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
            return { text: 'Good morning', emoji: '☀️', pokemon: 'espeon', period: 'morning' };
        }
        if (hour >= 12 && hour < 18) {
            return { text: 'Good afternoon', emoji: '🌤️', pokemon: 'pikachu', period: 'afternoon' };
        }
        return { text: 'Good evening', emoji: '🌙', pokemon: 'umbreon', period: 'night' };
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
        const allPokemonsInTeams = savedTeams.flatMap((team) => team.pokemons);
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

    const lastEditedTeam = recentTeams[0];

    const motivationalMessages = useMemo(
        () => [
            'Ready to be the very best!',
            'Your journey awaits, Trainer!',
            "Let's catch 'em all today!",
            'Adventure is out there!',
            'Time to build your dream team!',
            'Every Pokémon is unique!',
            "Gotta catch 'em all!",
            'Explore new possibilities!',
        ],
        [],
    );

    const randomMessage = useMemo(() => {
        const today = new Date();
        const seed = today.getDate() + today.getMonth();
        return motivationalMessages[seed % motivationalMessages.length];
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
            label: 'Team Builder',
            description: 'Create or refine a roster.',
            path: '/builder',
            icon: <SwordsIcon />,
        },
        {
            label: 'Browse Pokédex',
            description: 'Compare picks before locking a slot.',
            path: '/pokedex',
            icon: <PokeballIcon />,
        },
        {
            label: 'Quiz',
            description: 'Challenge your Pokemon knowledge.',
            path: '/quiz',
            icon: <SuccessToastIcon className="w-5 h-5" color="currentColor" />,
        },
        {
            label: 'Guesser',
            description: 'Try a guessing game between friends.',
            path: '/generator',
            icon: <DiceIcon />,
        },
    ];

    const latestTeamMeta = lastEditedTeam
        ? [
            { label: 'Slots', value: `${lastEditedTeam.pokemons.length}/6` },
            { label: 'Favorite', value: lastEditedTeam.isFavorite ? 'Yes' : 'No' },
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
                    <div className="home-hero__content">
                        <div className="home-hero__lead">
                            <h1 className="home-panel__title home-panel__title--hero">
                                {greeting.text}, Trainer.
                            </h1>
                            <p className="home-panel__description">
                                {randomMessage}
                            </p>
                        </div>

                        {greetingPokemonData && (
                            <div className="home-partner-card glass-card">
                                <div className="home-partner-card__actions">
                                    <button
                                        onClick={handleCycleHeroBackground}
                                        type="button"
                                        aria-label={`Change hero wallpaper. Current wallpaper: ${heroBackground?.name ?? 'default'}`}
                                        className="home-partner-card__action-btn"
                                        title={`Change wallpaper${heroBackground ? ` (${heroBackground.name})` : ''}`}
                                    >
                                        <DiceIcon />
                                    </button>

                                    <button
                                        onClick={onOpenPokemonSelector}
                                        type="button"
                                        aria-label="Change partner Pokémon"
                                        className="home-partner-card__action-btn"
                                        title="Change partner Pokémon"
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
                                        <span className="home-partner-card__badge">Partner</span>
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

                {lastEditedTeam ? (
                    <section
                        className="home-panel home-panel--feature home-panel--interactive flex min-h-[195px] cursor-pointer flex-col justify-between p-4"
                        onClick={() => handleEditTeam(lastEditedTeam)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleEditTeam(lastEditedTeam);
                            }
                        }}
                        aria-label={`Continue editing team ${lastEditedTeam.name}`}
                    >
                        <div className="space-y-3.5 min-w-0">
                            <div>
                                <p className="home-panel__eyebrow">
                                    Continue building
                                </p>
                                <h2 className="home-panel__title home-panel__title--feature truncate">
                                    {lastEditedTeam.name}
                                </h2>
                                <p className="home-panel__description max-w-lg">
                                    Jump back into your latest team and keep tuning the details.
                                </p>
                            </div>

                            <div className="home-team-slots">
                                {Array.from({ length: 6 }).map((_, index) => {
                                    const pokemon = lastEditedTeam.pokemons[index];
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
                                {latestTeamMeta.map(({ label, value }) => (
                                    <div key={label}>
                                        <dt>{label}</dt>
                                        <dd>{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>

                        <div className="home-action-row">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleEditTeam(lastEditedTeam); }}
                                className="home-button home-button--primary"
                                aria-label={`Continue editing ${lastEditedTeam.name}`}
                            >
                                <EditIcon />
                                Continue editing
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); navigate('/builder'); }}
                                className="home-button home-button--secondary"
                            >
                                <SwordsIcon />
                                Start new
                            </button>
                        </div>
                    </section>
                ) : (
                    <section className="home-panel home-panel--feature flex min-h-[200px] flex-col justify-between p-4">
                        <div className="space-y-3">
                            <div>
                                <p className="home-panel__eyebrow">
                                    First steps
                                </p>
                                <h2 className="home-panel__title home-panel__title--feature">
                                    Build your first team
                                </h2>
                            </div>
                            <p className="home-panel__description max-w-lg">
                                Pick six Pokémon, shape their movesets, and save a lineup worth revisiting.
                            </p>
                        </div>
                        <div className="home-action-row mt-8">
                            <button
                                type="button"
                                onClick={() => navigate('/builder')}
                                className="home-button home-button--primary w-full"
                            >
                                <SwordsIcon />
                                Create your first team
                            </button>
                        </div>
                    </section>
                )}
            </section>

            <section className="home-dashboard">
                <div className="space-y-4">
                    <div className="home-story-grid">
                        {isDailyPokemonLoading ? (
                            <section className="home-panel p-4 animate-pulse">
                                <div className="home-skeleton home-skeleton--short"></div>
                                <div className="mt-4 home-skeleton home-skeleton--title"></div>
                                <div className="mt-3 home-skeleton home-skeleton--meta"></div>
                                <div className="mt-6 flex gap-2">
                                    <div className="home-skeleton home-skeleton--pill"></div>
                                    <div className="home-skeleton home-skeleton--pill"></div>
                                </div>
                            </section>
                        ) : pokemonOfTheDay ? (
                            <section
                                className="home-panel home-panel--daily home-panel--interactive cursor-pointer p-4"
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
                                <div className="home-daily__header">
                                    <div>
                                        <p className="home-panel__eyebrow">Daily Pokémon</p>
                                        <h3 className="home-panel__title home-panel__title--daily capitalize">
                                            {pokemonOfTheDay.name}
                                        </h3>
                                    </div>
                                    <span className="home-daily__number">
                                        #{String(pokemonOfTheDay.id).padStart(3, '0')}
                                    </span>
                                </div>

                                <div className="home-daily__content">
                                    <div className="home-daily__sprite-container">
                                        <img
                                            src={pokemonOfTheDay.animatedSprite || pokemonOfTheDay.sprite || POKEBALL_PLACEHOLDER_URL}
                                            alt={pokemonOfTheDay.name}
                                            className="home-daily__sprite sprite-fade"
                                            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                        />
                                    </div>

                                    <div className="home-daily__footer">
                                        <div className="flex flex-wrap gap-1.5">
                                            {pokemonOfTheDay.types?.map((type) => (
                                                <span
                                                    key={type}
                                                    className="home-type-pill capitalize"
                                                    style={{
                                                        backgroundColor: `${typeColors[type]}18`,
                                                        borderColor: `${typeColors[type]}33`,
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
                                            className="home-daily__fav-btn"
                                            type="button"
                                            aria-label={favoritePokemons.has(pokemonOfTheDay.id) ? 'Remove from favorites' : 'Add to favorites'}
                                            style={favoritePokemons.has(pokemonOfTheDay.id)
                                                ? {
                                                    backgroundColor: `${colors.accent}18`,
                                                    borderColor: `${colors.accent}33`,
                                                    color: colors.accent,
                                                }
                                                : undefined}
                                        >
                                            <StarIcon
                                                className="w-4 h-4"
                                                isFavorite={favoritePokemons.has(pokemonOfTheDay.id)}
                                                color="currentColor"
                                            />
                                        </button>
                                    </div>
                                </div>
                            </section>
                        ) : null}

                        {!isTipDismissed && (
                            <section className="home-panel home-panel--note relative p-4 pr-10">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsTipDismissed(true);
                                        try {
                                            localStorage.setItem('homeTipDismissed', 'true');
                                        } catch (_) {
                                            // Ignore storage access errors
                                        }
                                    }}
                                    className="absolute top-3 right-3 text-muted hover:text-fg p-1.5 rounded-lg hover:bg-surface-raised transition-colors cursor-pointer"
                                    aria-label="Dismiss note"
                                >
                                    <CloseIcon className="w-4.5 h-4.5" />
                                </button>
                                <p className="home-panel__eyebrow">Today&apos;s note</p>
                                <h3 className="home-panel__section-title">Did you know?</h3>
                                <p className="home-panel__description mt-3">{tipOfTheDay}</p>
                            </section>
                        )}
                    </div>

                    <section className="home-panel p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="home-panel__eyebrow">Shortcuts</p>
                            </div>
                        </div>

                        <div className="home-quick-grid mt-4">
                            {quickActions.map((shortcut) => (
                                <button
                                    key={shortcut.path}
                                    type="button"
                                    onClick={() => navigate(shortcut.path)}
                                    className="home-list-button"
                                >
                                    <span className="home-list-button__icon" aria-hidden="true">
                                        {shortcut.icon}
                                    </span>
                                    <span className="home-list-button__body">
                                        <span className="home-list-button__title">{shortcut.label}</span>
                                        <span className="home-list-button__description">{shortcut.description}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="home-sidebar">
                    <section className="home-panel home-panel--stats p-4">
                        <div className="home-trainer-card__header">
                            <div>
                                <p className="home-panel__eyebrow">TRAINER CARD</p>
                                <h3 className="home-panel__section-title">Stats & Identity</h3>
                            </div>
                            <div className="home-trainer-card__barcode" aria-hidden="true" />
                        </div>

                        {stats.totalTeams > 0 ? (
                            <div className="home-stat-grid mt-4">
                                <div className="home-stat-card">
                                    <span className="home-stat-card__icon">
                                        <SwordsIcon />
                                    </span>
                                    <span className="home-stat-card__label">Teams</span>
                                    <strong className="home-stat-card__value">{stats.totalTeams}</strong>
                                </div>
                                <div className="home-stat-card">
                                    <span className="home-stat-card__icon">
                                        <StarIcon isFavorite={true} color="currentColor" />
                                    </span>
                                    <span className="home-stat-card__label">Pinned</span>
                                    <strong className="home-stat-card__value">{stats.totalFavoritePokemons}</strong>
                                </div>
                                <div className="home-stat-card home-stat-card--type">
                                    {stats.favoriteType ? (
                                        <>
                                            <span
                                                className="home-stat-card__icon"
                                                style={{
                                                    backgroundColor: `${typeColors[stats.favoriteType]}18`,
                                                    color: typeColors[stats.favoriteType],
                                                }}
                                            >
                                                <img
                                                    src={typeIcons[stats.favoriteType]}
                                                    alt={stats.favoriteType}
                                                    className="w-5 h-5 object-contain"
                                                />
                                            </span>
                                            <span className="home-stat-card__label">Favorite Type</span>
                                            <span
                                                className="home-type-pill capitalize mt-1.5 justify-center"
                                                style={{
                                                    backgroundColor: `${typeColors[stats.favoriteType]}18`,
                                                    borderColor: `${typeColors[stats.favoriteType]}33`,
                                                    color: typeColors[stats.favoriteType],
                                                    width: '100%'
                                                }}
                                            >
                                                {stats.favoriteType}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="home-stat-card__icon">
                                                <PokeballIcon />
                                            </span>
                                            <span className="home-stat-card__label">Favorite Type</span>
                                            <strong className="home-stat-card__value mt-1.5">--</strong>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4">
                                <TrainerStatsEmptyState
                                    onCreateTeam={() => navigate('/builder')}
                                    onBrowsePokedex={() => navigate('/pokedex')}
                                />
                            </div>
                        )}
                    </section>

                    {featuredFavorites.length > 0 ? (
                        <section className="home-panel p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="home-panel__eyebrow">Pinned roster</p>
                                    <h3 className="home-panel__section-title">Your favorites</h3>
                                </div>
                                {featuredFavorites.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => navigate('/favorites')}
                                        className="home-button home-button--inline"
                                    >
                                        See all
                                    </button>
                                )}
                            </div>

                            {featuredFavorites.length > 0 ? (
                                <div className="home-favorite-grid home-favorite-grid--sidebar mt-4">
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
                                            className="home-favorite-card home-favorite-card--compact"
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`Open details for ${pokemon.name}`}
                                        >
                                            <img
                                                src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL}
                                                alt={pokemon.name}
                                                className="home-favorite-card__sprite sprite-fade"
                                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                            />
                                            <p className="home-favorite-card__name capitalize">
                                                {pokemon.name}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-4">
                                    <EmptyState
                                        compact
                                        title="No favorites yet!"
                                        message="Tap the star on any Pokémon card to pin it here."
                                        action={{ label: 'Browse Pokédex', onClick: () => navigate('/pokedex') }}
                                    />
                                </div>
                            )}
                        </section>
                    ) : ("")
                    }
                </aside>
            </section>
        </main>
    );
}