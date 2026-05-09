import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeColors, typeIcons } from '../../constants/types';
import { POKEMON_TIPS } from '../../constants/pokemon';
import { EmptyState } from '../EmptyState';
import {
    AccountIcon,
    DiceIcon,
    EditIcon,
    PokeballIcon,
    StarIcon,
    SwordsIcon,
} from '../icons';

const TrainerStatsEmptyState = ({ colors, onCreateTeam, onBrowsePokedex }) => {
    const previewStats = [
        { label: 'Teams', value: '0' },
        { label: 'Stars', value: '0' },
        { label: 'Type', value: '--' },
    ];

    return (
        <div
            className="rounded-2xl border border-dashed p-4"
            style={{ backgroundColor: colors.background, borderColor: colors.cardLight }}
        >
            <div className="flex items-start gap-3">
                <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: colors.primary + '1A', color: colors.primary }}
                    aria-hidden="true"
                >
                    <AccountIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold" style={{ color: colors.text }}>
                        Your trainer card starts here
                    </p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: colors.textMuted }}>
                        Save 1 team to unlock your stats.
                    </p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden="true">
                {previewStats.map(({ label, value }) => (
                    <div
                        key={label}
                        className="rounded-xl border border-dashed px-2 py-3 text-center"
                        style={{ backgroundColor: colors.card, borderColor: colors.cardLight }}
                    >
                        <p className="text-lg font-bold" style={{ color: colors.textMuted }}>
                            {value}
                        </p>
                        <p
                            className="text-[10px] font-bold uppercase tracking-[0.14em]"
                            style={{ color: colors.textMuted }}
                        >
                            {label}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex flex-col gap-2">
                <button
                    type="button"
                    onClick={onCreateTeam}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                    style={{ backgroundColor: colors.primary }}
                >
                    <SwordsIcon />
                    Create first team
                </button>
                <button
                    type="button"
                    onClick={onBrowsePokedex}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{ backgroundColor: colors.card, color: colors.text }}
                >
                    <PokeballIcon />
                    Browse Pokedex
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
    onOpenPokemonSelector,
    db,
    theme,
    onNavigateWithTypeFilter,
}) {
    const [greetingPokemonData, setGreetingPokemonData] = useState(null);
    const [isDailyPokemonLoading, setIsDailyPokemonLoading] = useState(true);

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
        const fetchGreetingPokemon = async () => {
            if (!db || !greetingPokemonId) {
                const defaultNames = {
                    morning: 'espeon',
                    afternoon: 'pikachu',
                    night: 'umbreon',
                };
                const defaultPokemon = allPokemons.find((pokemon) => pokemon.name === defaultNames[greeting.period]);
                setGreetingPokemonData(defaultPokemon || null);
                return;
            }

            try {
                const docRef = doc(db, 'artifacts/pokemonTeamBuilder/pokemons', String(greetingPokemonId));
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setGreetingPokemonData(docSnap.data());
                } else {
                    const fallback = allPokemons.find((pokemon) => pokemon.id === greetingPokemonId);
                    setGreetingPokemonData(fallback || null);
                }
            } catch (error) {
                console.error('Error fetching greeting Pokemon:', error);
                const fallback = allPokemons.find((pokemon) => pokemon.id === greetingPokemonId);
                setGreetingPokemonData(fallback || null);
            }
        };

        fetchGreetingPokemon();
    }, [db, greetingPokemonId, allPokemons, greeting.period]);

    const pokemonOfTheDay = useMemo(() => {
        if (!allPokemons || allPokemons.length === 0) {
            return null;
        }

        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        const seed = dayOfYear;
        const random = ((seed * 9301 + 49297) % 233280) / 233280;
        const index = Math.floor(random * allPokemons.length);

        return allPokemons[index] || allPokemons[0];
    }, [allPokemons]);

    useEffect(() => {
        setIsDailyPokemonLoading(!(allPokemons && allPokemons.length > 0));
    }, [allPokemons]);

    const tipOfTheDay = useMemo(() => {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
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
            favoriteTeams: savedTeams.filter((team) => team.isFavorite).length,
            totalFavoritePokemons: favoritePokemons.size,
            favoriteType: favoriteType ? favoriteType[0] : null,
        };
    }, [allPokemons, favoritePokemons, savedTeams]);

    const featuredFavorites = useMemo(
        () => allPokemons.filter((pokemon) => favoritePokemons.has(pokemon.id)).slice(0, 6),
        [allPokemons, favoritePokemons],
    );

    const lastEditedTeam = recentTeams[0];

    const greetingPokemonColor = greetingPokemonData?.types?.[0]
        ? typeColors[greetingPokemonData.types[0]]
        : colors.primary;
    const greetingPokemonSecondaryColor = greetingPokemonData?.types?.[1]
        ? typeColors[greetingPokemonData.types[1]]
        : greetingPokemonColor;

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

    return (
        <main className="space-y-6 pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <section
                    className="lg:col-span-6 relative overflow-hidden rounded-2xl p-6 elevation-1 flex flex-col justify-between min-h-[220px]"
                    style={{
                        background: `linear-gradient(135deg, ${greetingPokemonColor}28 0%, ${greetingPokemonSecondaryColor}12 55%, ${colors.card} 100%)`,
                        border: `1px solid ${greetingPokemonColor}40`,
                    }}
                    aria-label="Trainer greeting"
                >
                    {greetingPokemonData && (
                        <div className="absolute -right-6 -bottom-6 opacity-30 pointer-events-none">
                            <img
                                src={greetingPokemonData.animatedSprite || greetingPokemonData.sprite || POKEBALL_PLACEHOLDER_URL}
                                alt=""
                                aria-hidden="true"
                                className="w-40 h-40 md:w-48 md:h-48 object-contain"
                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                            />
                        </div>
                    )}

                    <div className="relative z-10 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <span className="text-3xl md:text-4xl leading-none select-none" aria-hidden="true">{greeting.emoji}</span>
                            <div className="min-w-0">
                                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight truncate" style={{ color: colors.text }}>
                                    {greeting.text}, Trainer!
                                </h1>
                                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                                    {randomMessage}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onOpenPokemonSelector}
                            type="button"
                            aria-label="Change partner Pokémon"
                            className="flex-shrink-0 p-2 rounded-lg transition-all hover:scale-110 active:scale-95 opacity-70 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{ backgroundColor: colors.cardLight }}
                            title="Change partner Pokémon"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: colors.text }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>

                    {greetingPokemonData && (
                        <div
                            className="relative z-10 mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm self-start max-w-full"
                            style={{ backgroundColor: greetingPokemonColor + '22' }}
                        >
                            <img
                                src={greetingPokemonData.sprite || POKEBALL_PLACEHOLDER_URL}
                                alt=""
                                aria-hidden="true"
                                className="w-7 h-7 flex-shrink-0"
                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                            />
                            <span className="text-xs sm:text-sm font-semibold capitalize truncate" style={{ color: colors.text }}>
                                Partner: {greetingPokemonData.name}
                            </span>
                            {greetingPokemonData.types && (
                                <div className="flex gap-1 flex-shrink-0">
                                    {greetingPokemonData.types.map((type) => (
                                        <img
                                            key={type}
                                            src={typeIcons[type]}
                                            alt={type}
                                            className="w-4 h-4"
                                            title={type}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {lastEditedTeam ? (
                    <section
                        className="lg:col-span-6 rounded-2xl p-6 relative overflow-hidden group cursor-pointer transition-all duration-200 elevation-1 hover:shadow-elevation-2 bg-surface focus-within:ring-2 focus-within:ring-primary flex flex-col justify-between min-h-[220px]"
                        style={{
                            background: `linear-gradient(135deg, ${colors.primary}22 0%, ${colors.card} 70%)`,
                            border: `1px solid ${colors.primary}55`,
                        }}
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
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: colors.primary }}>
                                Pick up where you left off
                            </p>
                            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight truncate mb-3" style={{ color: colors.text }}>
                                {lastEditedTeam.name}
                            </h2>
                            <div className="flex -space-x-2 mb-4 flex-wrap">
                                {lastEditedTeam.pokemons.slice(0, 6).map((pokemon, index) => (
                                    <img
                                        key={index}
                                        src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL}
                                        alt={pokemon.name}
                                        className="w-11 h-11 md:w-12 md:h-12 rounded-full border-2 flex-shrink-0"
                                        style={{ borderColor: colors.card, backgroundColor: colors.cardLight }}
                                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleEditTeam(lastEditedTeam); }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                                style={{ backgroundColor: colors.primary }}
                                aria-label={`Continue editing ${lastEditedTeam.name}`}
                            >
                                <EditIcon />
                                Continue editing
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); navigate('/builder'); }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                style={{ color: colors.text }}
                            >
                                <SwordsIcon />
                                Start new
                            </button>
                        </div>
                    </section>
                ) : (
                    <section
                        className="lg:col-span-6 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px] elevation-1 bg-surface"
                        style={{
                            background: `linear-gradient(135deg, ${colors.primary}22 0%, ${colors.card} 70%)`,
                            border: `1px solid ${colors.primary}55`,
                        }}
                    >
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: colors.primary }}>
                                New trainer
                            </p>
                            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mb-2" style={{ color: colors.text }}>
                                Build your first team
                            </h2>
                            <p className="text-sm" style={{ color: colors.textMuted }}>
                                Pick six Pokémon, set their movesets, and dominate.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/builder')}
                            className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                            style={{ backgroundColor: colors.primary }}
                        >
                            <SwordsIcon />
                            Create your first team
                        </button>
                    </section>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isDailyPokemonLoading ? (
                            <section className="rounded-2xl w-full p-6 relative overflow-hidden animate-pulse elevation-1 bg-surface">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-6 w-32 rounded-full" style={{ backgroundColor: colors.cardLight }}></div>
                                        </div>
                                        <div className="h-8 w-40 rounded mb-2" style={{ backgroundColor: colors.cardLight }}></div>
                                        <div className="h-4 w-16 rounded mb-3" style={{ backgroundColor: colors.cardLight }}></div>
                                        <div className="flex gap-2">
                                            <div className="h-6 w-16 rounded-full" style={{ backgroundColor: colors.cardLight }}></div>
                                            <div className="h-6 w-16 rounded-full" style={{ backgroundColor: colors.cardLight }}></div>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full" style={{ backgroundColor: colors.cardLight }}></div>
                                    </div>
                                </div>
                            </section>
                        ) : pokemonOfTheDay ? (
                            <section
                                className="rounded-2xl w-full p-6 relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] elevation-1 hover:shadow-elevation-2 bg-surface"
                                onClick={() => showDetails(pokemonOfTheDay)}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: colors.primary, color: 'white' }}>
                                                DAILY POKÉMON
                                            </span>
                                        </div>
                                        <h2 className="text-2xl md:text-3xl font-bold capitalize mb-1" style={{ color: colors.text }}>
                                            {pokemonOfTheDay.name}
                                        </h2>
                                        <p className="text-sm mb-3" style={{ color: colors.textMuted }}>
                                            #{String(pokemonOfTheDay.id).padStart(3, '0')}
                                        </p>
                                        <div className="flex gap-2">
                                            {pokemonOfTheDay.types?.map((type) => (
                                                <span
                                                    key={type}
                                                    className="px-3 py-1 rounded-full text-xs font-bold text-white capitalize"
                                                    style={{ backgroundColor: typeColors[type] }}
                                                >
                                                    {type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <img
                                            src={pokemonOfTheDay.animatedSprite || POKEBALL_PLACEHOLDER_URL}
                                            alt={pokemonOfTheDay.name}
                                            className="w-24 h-24 md:w-32 md:h-32 object-contain hover:scale-110 transition-transform"
                                            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                        />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onToggleFavoritePokemon(pokemonOfTheDay.id); }}
                                            className="absolute top-0 right-0 p-2 rounded-full transition-all hover:scale-110"
                                            style={{ backgroundColor: favoritePokemons.has(pokemonOfTheDay.id) ? 'rgba(251, 191, 36, 0.3)' : colors.cardLight }}
                                        >
                                            <StarIcon className="w-5 h-5" isFavorite={favoritePokemons.has(pokemonOfTheDay.id)} color={colors.textMuted} />
                                        </button>
                                    </div>
                                </div>
                            </section>
                        ) : null}

                        <section className="rounded-2xl w-full p-7 elevation-1 bg-surface">
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                                Did you know?
                            </h3>
                            <p className="text-normal leading-relaxed" style={{ color: colors.textMuted }}>
                                {tipOfTheDay}
                            </p>
                        </section>
                    </div>

                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: <SwordsIcon />, label: 'Create Team', path: '/builder', color: colors.primary },
                            { icon: <PokeballIcon />, label: 'Pokédex', path: '/pokedex', color: colors.warning },
                            { icon: <DiceIcon />, label: 'Random', path: '/generator', color: colors.info },
                            { icon: <StarIcon className="w-6 h-6" isFavorite color={colors.accent} />, label: 'Favorites', path: '/favorites', color: colors.accent },
                        ].map((shortcut, index) => (
                            <button
                                key={index}
                                onClick={() => navigate(shortcut.path)}
                                className="p-4 rounded-xl elevation-1 flex flex-col items-center gap-2 transition-all duration-200 hover:scale-105 hover:elevation-2 active:scale-95"
                                style={{
                                    backgroundColor: colors.card,
                                    border: `2px solid ${shortcut.color}20`,
                                    boxShadow: theme === 'light' ? 'var(--elevation-1)' : 'none',
                                }}
                            >
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: `${shortcut.color}20`, color: shortcut.color }}
                                >
                                    {shortcut.icon}
                                </div>
                                <span className="text-sm font-semibold" style={{ color: colors.text }}>
                                    {shortcut.label}
                                </span>
                            </button>
                        ))}
                    </section>

                    <section className="rounded-2xl p-6 elevation-1 bg-surface">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: colors.text }}>
                                Your favorites
                            </h3>
                            {featuredFavorites.length > 0 && (
                                <button
                                    onClick={() => navigate('/favorites')}
                                    className="text-sm hover:underline p-2 rounded-lg font-semibold transition-all hover:scale-105"
                                    style={{ color: colors.primary, backgroundColor: colors.primary + '30' }}
                                >
                                    Check all →
                                </button>
                            )}
                        </div>
                        {featuredFavorites.length > 0 ? (
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                {featuredFavorites.map((pokemon) => (
                                    <div
                                        key={pokemon.id}
                                        onClick={() => showDetails(pokemon)}
                                        className="p-3 rounded-xl text-center cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
                                        style={{ backgroundColor: colors.cardLight }}
                                    >
                                        <img
                                            src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL}
                                            alt={pokemon.name}
                                            className="w-16 h-16 mx-auto"
                                            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                        />
                                        <p className="text-xs capitalize truncate mt-1" style={{ color: colors.text }}>
                                            {pokemon.name}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                compact
                                title="No favorite Pokémon yet!"
                                message="Tap the star on any Pokémon card to pin it here."
                                action={{ label: 'Browse Pokédex', onClick: () => navigate('/pokedex') }}
                            />
                        )}
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="rounded-2xl p-6 elevation-1 bg-surface">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
                            Trainer Stats
                        </h3>
                        {stats.totalTeams > 0 ? (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: colors.cardLight }}>
                                    <p className="text-2xl font-bold" style={{ color: colors.primary }}>{stats.totalTeams}</p>
                                    <p className="text-xs" style={{ color: colors.textMuted }}>Teams created</p>
                                </div>
                                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: colors.cardLight }}>
                                    <p className="text-2xl font-bold" style={{ color: colors.accent }}>{stats.favoriteTeams}</p>
                                    <p className="text-xs" style={{ color: colors.textMuted }}>Favorite Teams</p>
                                </div>
                                {stats.favoriteType && (
                                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: colors.cardLight }}>
                                        <div
                                            className="w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1"
                                            style={{ backgroundColor: typeColors[stats.favoriteType] }}
                                        >
                                            <img src={typeIcons[stats.favoriteType]} alt={stats.favoriteType} className="w-6 h-6" />
                                        </div>
                                        <p className="text-xs capitalize" style={{ color: colors.textMuted }}>Favorite type</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <TrainerStatsEmptyState
                                colors={colors}
                                onCreateTeam={() => navigate('/builder')}
                                onBrowsePokedex={() => navigate('/pokedex')}
                            />
                        )}
                    </section>

                    <section className="rounded-2xl p-4 elevation-1 bg-surface">
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                            Explore by types
                        </h3>
                        <div className="grid grid-cols-9 gap-1.5">
                            {Object.keys(typeColors).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => onNavigateWithTypeFilter(type)}
                                    className="p-1.5 rounded-md transition-all duration-200 hover:scale-110 hover:shadow-md"
                                    title={type}
                                >
                                    <img
                                        src={typeIcons[type]}
                                        alt={type}
                                        className="w-full h-auto"
                                    />
                                </button>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}