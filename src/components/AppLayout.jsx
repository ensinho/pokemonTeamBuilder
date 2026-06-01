import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useToastStore } from '../store/useToastStore';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useActiveTeam } from '../hooks/useActiveTeam';
import { useFirestoreTeams } from '../hooks/useFirestoreTeams';
import { useReferenceStore } from '../store/useReferenceStore';

import { PATCH_NOTES_VERSION, THEME_META } from '../constants/theme';
import { pageGuideTips, PageGuide } from './PageGuide';
import { FooterFeedback } from './FooterFeedback';
import { SidebarAccountMenu } from './SidebarAccountMenu';
import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { getStaticPokemonDetail } from '../services/pokemonDataCache';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { appId } from '../constants/firebase';
import { usePokedex } from '../hooks/usePokedex';

import {
    AuthModal,
    ConfirmDialog,
    GreetingPokemonSelectorModal,
    PatchNotesModal,
    PokemonDetailModal,
    ShareSnippetModal,
    SyncPromptModal,
    TeamPokemonEditorModal
} from './modals';

import {
    GithubIcon, LinkedinIcon, CloseIcon, CollapseLeftIcon, CollapseRightIcon,
    MenuIcon, PokeballIcon, SavedTeamsIcon, StarsIcon, SwordsIcon, DiceIcon,
    HomeIcon, SunIcon, MoonIcon, AccountIcon, ChartColumnIcon, SuccessToastIcon,
    ErrorToastIcon, WarningToastIcon
} from './icons';

import {
    AdminDashboardView,
    AllTeamsView,
    FavoritePokemonsView,
    GenerationQuizView,
    HomeView,
    PokedexView,
    ProfileView,
    RandomGeneratorView,
    TeamBuilderView,
} from './views';

import '../styles/app-shell.css';

const TrainerAvatar = ({ pokemonId, isShiny = false, size = 24, color = 'currentColor', className = '' }) => {
    if (pokemonId) {
        return (
            <span
                className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${className}`}
                style={{ width: size, height: size, backgroundColor: 'var(--color-primary-soft)' }}
                aria-hidden="true"
            >
                <img
                    src={getPokemonFrontSpriteUrl(pokemonId, { shiny: isShiny })}
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

const ShellNavButton = ({ active, collapsed, label, onClick, icon }) => (
    <button
        type="button"
        onClick={onClick}
        title={collapsed ? label : undefined}
        aria-current={active ? 'page' : undefined}
        className={`app-shell__nav-link ${active ? 'is-active' : ''} ${collapsed ? 'is-collapsed' : ''}`}
    >
        <span className="app-shell__nav-icon" aria-hidden="true">{icon}</span>
        <span className={`app-shell__nav-text ${collapsed ? 'is-hidden' : ''}`}>{label}</span>
    </button>
);

const AUTH_SPLASH_MESSAGES = [
    'Checking if you are who you say you are',
    'Verifying trainer credentials',
    'Confirming your identity with Professor Oak',
    'Making sure this trainer card is yours',
    'Securing your team data before we start',
];

export default function AppLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    // Zustand Stores
    const { toasts, showToast, maxToasts } = useToastStore();
    const { theme, colors, toggleTheme, changeTheme, homeWallpaperId, setHomeWallpaperPreference } = useThemeStore();
    const {
        userId, userEmail, isAnonymous, isAdmin, displayName, setDisplayName,
        greetingPokemonId, greetingPokemonIsShiny, setGreetingPokemon, streak,
        handleResetSyncPrompt, showSyncPrompt, handleDismissSyncPrompt,
        handleSignIn, handleSignUp, handleSignOut, isAuthReady
    } = useAuthStore();

    const {
        currentTeam, teamName, setTeamName, editingTeamId, handleRemoveFromTeam,
        handleReorderTeam, handleSaveTeam, handleClearTeam, handleExportToShowdown,
        handleShareTeam, editingTeamMember, setEditingTeamMember, shareModal,
        closeShareModal, handleUpdateTeamMember, suggestedPokemonIds, teamAnalysis,
        setCurrentTeam, shareTeamByData, handleAddPokemon
    } = useActiveTeam();

    const {
        favoritePokemons, handleToggleFavoritePokemon, deleteConfirmation,
        setDeleteConfirmation, handleDeleteTeam, handleToggleFavorite, savedTeams
    } = useFirestoreTeams();

    const { generations, items, natures } = useReferenceStore();

    // Pokedex logic hook
    const pokedex = usePokedex();

    // UI Local States
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [authModal, setAuthModal] = useState({ open: false, mode: 'signIn' });
    const [modalPokemon, setModalPokemon] = useState(null);
    const [showPatchNotes, setShowPatchNotes] = useState(false);
    const [showGreetingPokemonSelector, setShowGreetingPokemonSelector] = useState(false);
    
    // Auth Splash Loader
    const [showInitialAuthSplash, setShowInitialAuthSplash] = useState(true);
    const [authSplashProgress, setAuthSplashProgress] = useState(0);
    const [authSplashMessage, setAuthSplashMessage] = useState(AUTH_SPLASH_MESSAGES[0]);
    const initialBootTimeRef = useRef(Date.now());

    // Caches for dynamic fetches
    const [pokemonDetailsCache, setPokemonDetailsCache] = useState({});
    const [moveDetailsCache, setMoveDetailsCache] = useState({});
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    const [sharedTeamLoaded, setSharedTeamLoaded] = useState(false);

    // Initial Splash timer
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

    // Check patch notes version
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

    // Derive current page routing
    const currentPage = useMemo(() => {
        const path = location.pathname;
        if (path.includes('/pokedex')) return 'pokedex';
        if (path.includes('/teams')) return 'allTeams';
        if (path.includes('/quiz')) return 'generationQuiz';
        if (path.includes('/generator')) return 'randomGenerator';
        if (path.includes('/favorites')) return 'favorites';
        if (path.includes('/builder')) return 'builder';
        if (path.includes('/profile')) return 'profile';
        if (path.includes('/admin')) return 'admin';
        return 'home';
    }, [location.pathname]);

    const pageInfo = useMemo(() => {
        const pages = {
            'home': { title: 'Home', subtitle: 'Overview and next actions' },
            'builder': { title: 'Team Builder', subtitle: 'Build and tune your current roster' },
            'pokedex': { title: 'Pokédex', subtitle: 'Search and compare Pokémon' },
            'allTeams': { title: 'Saved Teams', subtitle: 'Revisit and manage your collection' },
            'generationQuiz': { title: 'Generation Quiz', subtitle: 'Guess every Pokémon from your selected generations' },
            'randomGenerator': { title: 'Random Generator', subtitle: 'Generate a fresh starting point' },
            'favorites': { title: 'Favorite Pokémon', subtitle: 'Quick access to your pinned roster' },
            'admin': { title: 'Admin Dashboard', subtitle: 'Suggestions and replies' },
            'profile': { title: 'Profile', subtitle: 'Trainer card and preferences' },
        };
        return pages[currentPage] || pages['home'];
    }, [currentPage]);

    const pageFrameClassName = useMemo(() => {
        if (currentPage === 'home') return '';
        return 'app-shell__page-frame';
    }, [currentPage]);

    const navigationItems = useMemo(() => {
        const items = [
            { key: 'home', label: 'Home', path: '/', icon: <HomeIcon /> },
            { key: 'builder', label: 'Builder', path: '/builder', icon: <SwordsIcon /> },
            { key: 'pokedex', label: 'Pokédex', path: '/pokedex', icon: <PokeballIcon /> },
            { key: 'generationQuiz', label: 'Quiz', path: '/quiz', icon: <SuccessToastIcon /> },
            { key: 'randomGenerator', label: 'Generator', path: '/generator', icon: <DiceIcon /> },
            { key: 'favorites', label: 'Favorites', path: '/favorites', icon: <StarsIcon className="w-5 h-5 shrink-0" /> },
            { key: 'allTeams', label: 'Saved Teams', path: '/teams', icon: <SavedTeamsIcon /> },
            { key: 'profile', label: 'Profile', path: '/profile', icon: <AccountIcon className="w-5 h-5 shrink-0" /> },
        ];

        if (isAdmin) {
            items.push({ key: 'admin', label: 'Admin', path: '/admin', icon: <ChartColumnIcon className="w-5 h-5 shrink-0" /> });
        }

        return items;
    }, [isAdmin]);

    // Available Pokemons & Recent Teams computations
    const availablePokemons = useMemo(() => {
        const teamIds = new Set(currentTeam.map(p => p.id));
        const available = pokedex.pokemons.filter(p => !teamIds.has(p.id));
        
        return available.sort((a, b) => {
            const aIsSuggested = suggestedPokemonIds.has(a.id);
            const bIsSuggested = suggestedPokemonIds.has(b.id);
            if (aIsSuggested && !bIsSuggested) return -1;
            if (!aIsSuggested && bIsSuggested) return 1;
            return a.id - b.id;
        });
    }, [pokedex.pokemons, currentTeam, suggestedPokemonIds]);

    const recentTeams = useMemo(() => {
        return [...savedTeams]
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 3);
    }, [savedTeams]);

    // Fetch details helper (caches detail docs)
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
    }, [pokemonDetailsCache, showToast]);

    // Load shared team via URL search params (?team=ID)
    const fetchAndSetSharedTeam = useCallback(async (teamId) => {
        if (!db || sharedTeamLoaded) return;
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
                showToast(`Loaded team: ${teamData.name}`, "success");

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
    }, [showToast, sharedTeamLoaded, navigate, fetchPokemonDetails, setCurrentTeam, setTeamName]);

    useEffect(() => {
        if (!db || !isAuthReady) return;
        const urlParams = new URLSearchParams(window.location.search);
        const teamId = urlParams.get('team');
        if (teamId) {
            fetchAndSetSharedTeam(teamId);
        }
    }, [isAuthReady, fetchAndSetSharedTeam]);

    // Saved team handlers
    const handleEditTeam = useCallback(async (team) => {
        showToast(`Loading team: ${team.name}...`, 'info');
        
        const teamPokemonDetailsPromises = team.pokemons.map(p => fetchPokemonDetails(p.id));
        const teamPokemonDetails = await Promise.all(teamPokemonDetailsPromises);

        const customizedTeam = teamPokemonDetails.map((detail, i) => {
            if (!detail) return null;
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
        }).filter(Boolean);

        setCurrentTeam(customizedTeam);
        setTeamName(team.name);
        useActiveTeam.getState?.()?.setEditingTeamId?.(team.id); // Set id directly if store hook wraps it
        navigate('/builder');
        setIsSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [fetchPokemonDetails, showToast, navigate, setCurrentTeam, setTeamName]);

    const handleShareSavedTeam = useCallback(async (team) => {
        await shareTeamByData(team?.pokemons || [], team?.name || 'Unnamed Team');
    }, [shareTeamByData]);

    const handleExportSavedTeamToShowdown = useCallback(async (team) => {
        const teamMembers = team?.pokemons || [];
        if (teamMembers.length === 0) return showToast('This saved team is empty!', 'warning');
        const exportText = useActiveTeam.getState?.()?.buildShowdownExportText?.(teamMembers) || '';
        await useActiveTeam.getState?.()?.copyTextToClipboard?.(exportText, 'Copied for Pokémon Showdown!');
    }, [showToast]);

    const showDetails = useCallback((pokemon) => {
        setModalPokemon(pokemon);
    }, []);

    const handleEditTeamMember = useCallback((pokemon) => {
        setEditingTeamMember(pokemon);
    }, [setEditingTeamMember]);

    const handleNavigateWithTypeFilter = useCallback((type) => {
        pokedex.setPokedexSelectedTypes(new Set([type]));
        navigate('/pokedex');
    }, [navigate, pokedex]);

    // Splash renderer
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
            {/* Modal Components */}
            {modalPokemon && (
                <PokemonDetailModal
                    pokemon={modalPokemon}
                    onClose={() => setModalPokemon(null)}
                    onAdd={currentPage === 'builder' ? handleAddPokemon : null}
                    currentTeam={currentTeam}
                    colors={colors}
                    showPokemonDetails={showDetails}
                    pokemonDetailsCache={pokemonDetailsCache}
                    setPokemonDetailsCache={setPokemonDetailsCache}
                    db={db}
                    isFavorite={favoritePokemons.has(modalPokemon.id)}
                    onToggleFavorite={handleToggleFavoritePokemon}
                />
            )}
            {editingTeamMember && (
                <TeamPokemonEditorModal
                    pokemon={editingTeamMember}
                    onClose={() => setEditingTeamMember(null)}
                    onSave={handleUpdateTeamMember}
                    colors={colors}
                    items={items}
                    natures={natures}
                    moveDetailsCache={moveDetailsCache}
                    setMoveDetailsCache={setMoveDetailsCache}
                />
            )}
            {showPatchNotes && <PatchNotesModal onClose={handleClosePatchNotes} colors={colors} />}
            {showGreetingPokemonSelector && (
                <GreetingPokemonSelectorModal
                    onClose={() => setShowGreetingPokemonSelector(false)}
                    onSelect={setGreetingPokemon}
                    allPokemons={pokedex.pokemons}
                    currentPokemonId={greetingPokemonId}
                    currentPokemonIsShiny={greetingPokemonIsShiny}
                    colors={colors}
                    db={db}
                />
            )}

            <ShareSnippetModal
                isOpen={shareModal.isOpen}
                onClose={closeShareModal}
                pokemons={shareModal.pokemons}
                defaultTitle={shareModal.defaultTitle}
                shareUrl={shareModal.shareUrl}
                colors={colors}
                showToast={showToast}
            />

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

            {showSyncPrompt && isAnonymous && (
                <SyncPromptModal
                    colors={colors}
                    onSignUp={() => { setAuthModal({ open: true, mode: 'signUp' }); }}
                    onSignIn={() => { setAuthModal({ open: true, mode: 'signIn' }); }}
                    onDismiss={handleDismissSyncPrompt}
                />
            )}

            <ConfirmDialog
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, teamId: null, teamName: '' })}
                onConfirm={() => {
                    handleDeleteTeam(deleteConfirmation.teamId);
                    setDeleteConfirmation({ isOpen: false, teamId: null, teamName: '' });
                }}
                title="Erase the Team? 😢"
                message={`Are you sure you want to delete "${deleteConfirmation.teamName}"? They could be so great...`}
                confirmText="Yeah don't care"
                colors={colors}
            />

            {/* Toast Alerts */}
            <div className="fixed top-5 right-5 z-50 space-y-2">
                {toasts.slice(0, maxToasts).map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-center justify-between gap-3 px-4 py-2 rounded-lg shadow-lg text-white animate-fade-in-out min-w-[260px] ${
                            toast.type === 'success' ? 'bg-success' :
                            toast.type === 'warning' ? 'bg-warning' :
                            toast.type === 'info' ? 'bg-info' : 'bg-danger'
                        }`}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            {!toast.spriteUrl && (
                                <>
                                    {toast.type === 'success' && <SuccessToastIcon />}
                                    {toast.type === 'error' && <ErrorToastIcon />}
                                    {toast.type === 'warning' && <WarningToastIcon />}
                                </>
                            )}
                            <span className="truncate">{toast.message}</span>
                        </div>
                        {toast.spriteUrl && (
                            <img
                                src={toast.spriteUrl}
                                alt=""
                                aria-hidden="true"
                                className="w-16 h-16 image-pixelated -my-1 shrink-0"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Sidebar Shell Layout */}
            <div className="app-shell">
                {isSidebarOpen && (
                    <div
                        className="app-shell__overlay lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                        role="presentation"
                        aria-label="Close sidebar"
                    />
                )}
                <aside className={`app-shell__sidebar custom-scrollbar ${isSidebarCollapsed ? 'is-collapsed' : ''} ${isSidebarOpen ? 'is-open' : ''}`}>
                    <div className="app-shell__sidebar-inner">
                        <div className={`app-shell__brand ${isSidebarCollapsed ? 'is-collapsed' : ''}`}>
                            <div className="app-shell__brand-main">
                                <img
                                    src={import.meta.env.BASE_URL + 'LogoCuteGengarRounded.png'}
                                    alt="Pokémon Team Builder Logo"
                                    className="app-shell__brand-logo"
                                />
                                <div className={`app-shell__brand-copy ${isSidebarCollapsed ? 'is-hidden' : ''}`}>
                                    <p className="app-shell__brand-label">Pokemon Team Builder</p>
                                </div>
                            </div>
                            {!isSidebarCollapsed && (
                                <button
                                    onClick={() => setIsSidebarCollapsed(true)}
                                    type="button"
                                    aria-label="Collapse sidebar"
                                    aria-expanded="true"
                                    className="app-shell__icon-button app-shell__collapse-toggle hidden lg:inline-flex"
                                >
                                    <CollapseLeftIcon />
                                </button>
                            )}
                            <button onClick={() => setIsSidebarOpen(false)} type="button" aria-label="Close sidebar" className="app-shell__icon-button lg:hidden">
                                <CloseIcon />
                            </button>
                        </div>
                        <nav className="app-shell__nav" aria-label="Primary">
                            <ul className="app-shell__nav-list">
                                {isSidebarCollapsed && (
                                    <li className="app-shell__nav-control hidden lg:block">
                                        <button
                                            type="button"
                                            onClick={() => setIsSidebarCollapsed(false)}
                                            aria-label="Expand sidebar"
                                            aria-expanded="false"
                                            className="app-shell__nav-link app-shell__nav-link--control is-collapsed"
                                        >
                                            <span className="app-shell__nav-icon" aria-hidden="true"><CollapseRightIcon /></span>
                                        </button>
                                    </li>
                                )}
                                {navigationItems.map((item) => (
                                    <li key={item.key}>
                                        <ShellNavButton
                                            active={currentPage === item.key}
                                            collapsed={isSidebarCollapsed}
                                            label={item.label}
                                            icon={item.icon}
                                            onClick={() => {
                                                navigate(item.path);
                                                setIsSidebarOpen(false);
                                            }}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </nav>
                        <div className="app-shell__account">
                            {isAnonymous ? (
                                <button
                                    type="button"
                                    onClick={() => setAuthModal({ open: true, mode: 'signIn' })}
                                    aria-label="Sign in or create an account"
                                    title="Sign in"
                                    className={`app-shell__account-button ${isSidebarCollapsed ? 'is-collapsed' : ''}`}
                                >
                                    <span className="app-shell__nav-icon"><AccountIcon className="w-5 h-5 shrink-0" /></span>
                                    <span className={`app-shell__nav-text ${isSidebarCollapsed ? 'is-hidden' : ''}`}>
                                        Sign in
                                    </span>
                                </button>
                            ) : (
                                <SidebarAccountMenu
                                    collapsed={isSidebarCollapsed}
                                    avatar={<TrainerAvatar pokemonId={greetingPokemonId} isShiny={greetingPokemonIsShiny} color={colors.primary} />}
                                    displayName={displayName || userEmail?.split('@')[0] || 'Trainer'}
                                    email={userEmail || ''}
                                    currentTheme={theme}
                                    themes={THEME_META}
                                    onOpenProfile={() => {
                                        navigate('/profile');
                                        setIsSidebarOpen(false);
                                    }}
                                    onChangeTheme={changeTheme}
                                    onSignOut={handleSignOut}
                                />
                            )}
                        </div>
                    </div>
                </aside>

                <div className="app-shell__content custom-scrollbar">
                    <header className="app-shell__header">
                        <div className="app-shell__header-main">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                type="button"
                                aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                                aria-expanded={isSidebarOpen}
                                className="app-shell__icon-button app-shell__mobile-menu lg:hidden"
                            >
                                {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
                            </button>

                            <div className="app-shell__header-copy">
                                <div className="app-shell__header-title-row">
                                    <h1 className="app-shell__header-title">{pageInfo.title}</h1>
                                    {pageGuideTips[currentPage] && (
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
                                <p className="app-shell__header-subtitle">{pageInfo.subtitle}</p>
                            </div>
                        </div>

                        <div className="app-shell__header-actions">
                            <button onClick={toggleTheme} type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} className="app-shell__icon-button">
                                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                            </button>
                        </div>
                    </header>

                    <main className="app-shell__body">
                        {pageFrameClassName ? (
                            <div className={pageFrameClassName}>
                                <Routes>
                                    <Route path="/" element={
                                        <HomeView
                                            colors={colors}
                                            navigate={navigate}
                                            savedTeams={savedTeams}
                                            favoritePokemons={favoritePokemons}
                                            allPokemons={pokedex.pokemons}
                                            recentTeams={recentTeams}
                                            showDetails={showDetails}
                                            onToggleFavoritePokemon={handleToggleFavoritePokemon}
                                            handleEditTeam={handleEditTeam}
                                            greetingPokemonId={greetingPokemonId}
                                            greetingPokemonIsShiny={greetingPokemonIsShiny}
                                            heroBackgroundId={homeWallpaperId}
                                            onChangeHeroBackground={setHomeWallpaperPreference}
                                            onOpenPokemonSelector={() => setShowGreetingPokemonSelector(true)}
                                            db={db}
                                            theme={theme}
                                            onNavigateWithTypeFilter={handleNavigateWithTypeFilter}
                                        />
                                    } />
                                    <Route path="/builder" element={
                                        <TeamBuilderView
                                            currentTeam={currentTeam}
                                            teamName={teamName}
                                            setTeamName={setTeamName}
                                            handleRemoveFromTeam={handleRemoveFromTeam}
                                            handleReorderTeam={handleReorderTeam}
                                            handleSaveTeam={() => handleSaveTeam(savedTeams)}
                                            editingTeamId={editingTeamId}
                                            handleClearTeam={handleClearTeam}
                                            recentTeams={recentTeams}
                                            onNavigateToTeams={() => navigate('/teams')}
                                            handleToggleFavorite={handleToggleFavorite}
                                            handleEditTeam={handleEditTeam}
                                            requestDeleteTeam={(id, name) => setDeleteConfirmation({ isOpen: true, teamId: id, teamName: name })}
                                            handleShareTeam={handleShareTeam}
                                            handleExportToShowdown={handleExportToShowdown}
                                            teamAnalysis={teamAnalysis}
                                            searchInput={pokedex.searchInput}
                                            setSearchInput={pokedex.setSearchInput}
                                            selectedGeneration={pokedex.selectedGeneration}
                                            setSelectedGeneration={pokedex.setSelectedGeneration}
                                            generations={generations}
                                            isInitialLoading={pokedex.isLoading}
                                            availablePokemons={availablePokemons}
                                            handleAddPokemonToTeam={handleAddPokemon}
                                            lastPokemonElementRef={pokedex.lastPokemonElementRef}
                                            isFetchingMore={pokedex.isFetchingMore}
                                            selectedTypes={pokedex.selectedTypes}
                                            handleTypeSelection={pokedex.handleTypeSelection}
                                            showDetails={showDetails}
                                            suggestedPokemonIds={suggestedPokemonIds}
                                            colors={colors}
                                            onEditTeamPokemon={handleEditTeamMember}
                                            favoritePokemons={favoritePokemons}
                                            onToggleFavoritePokemon={handleToggleFavoritePokemon}
                                            showOnlyFavorites={pokedex.showOnlyFavorites}
                                            setShowOnlyFavorites={pokedex.setShowOnlyFavorites}
                                        />
                                    } />
                                    <Route path="/pokedex" element={
                                        <PokedexView
                                            pokemons={pokedex.pokemons}
                                            lastPokemonElementRef={pokedex.lastPokemonElementRef}
                                            isFetchingMore={pokedex.isFetchingMore}
                                            searchInput={pokedex.pokedexSearchInput}
                                            setSearchInput={pokedex.setPokedexSearchInput}
                                            selectedTypes={pokedex.pokedexSelectedTypes}
                                            handleTypeSelection={pokedex.handlePokedexTypeSelection}
                                            selectedGeneration={pokedex.pokedexSelectedGeneration}
                                            setSelectedGeneration={pokedex.setPokedexSelectedGeneration}
                                            generations={generations}
                                            isInitialLoading={pokedex.isLoading}
                                            colors={colors}
                                            showDetails={showDetails}
                                            favoritePokemons={favoritePokemons}
                                            onToggleFavoritePokemon={handleToggleFavoritePokemon}
                                            showOnlyFavorites={pokedex.pokedexShowOnlyFavorites}
                                            setShowOnlyFavorites={pokedex.setPokedexShowOnlyFavorites}
                                        />
                                    } />
                                    <Route path="/favorites" element={
                                        <FavoritePokemonsView
                                            allPokemons={pokedex.pokemons}
                                            favoritePokemons={favoritePokemons}
                                            onToggleFavoritePokemon={handleToggleFavoritePokemon}
                                            showDetails={showDetails}
                                            colors={colors}
                                            onAddToTeam={handleAddPokemon}
                                            isLoading={pokedex.isLoading}
                                        />
                                    } />
                                    <Route path="/quiz" element={
                                        <GenerationQuizView
                                            showDetails={showDetails}
                                            showToast={showToast}
                                        />
                                    } />
                                    <Route path="/teams" element={
                                        <AllTeamsView
                                            teams={savedTeams}
                                            onEdit={handleEditTeam}
                                            onExport={handleExportSavedTeamToShowdown}
                                            onShare={handleShareSavedTeam}
                                            requestDelete={(id, name) => setDeleteConfirmation({ isOpen: true, teamId: id, teamName: name })}
                                            onToggleFavorite={handleToggleFavorite}
                                            searchTerm={teamSearchTerm}
                                            setSearchTerm={setTeamSearchTerm}
                                            colors={colors}
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
                                            greetingPokemonIsShiny={greetingPokemonIsShiny}
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
                                    {isAdmin && (
                                        <Route path="/admin" element={
                                            <AdminDashboardView
                                                db={db}
                                                auth={useAuthStore.getState().auth}
                                                isAdmin={isAdmin}
                                                colors={colors}
                                                showToast={showToast}
                                            />
                                        } />
                                    )}
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </div>
                        ) : (
                            <Routes>
                                {/* Duplicate routes definition for non-frame view (home) */}
                                <Route path="/" element={
                                    <HomeView
                                        colors={colors}
                                        navigate={navigate}
                                        savedTeams={savedTeams}
                                        favoritePokemons={favoritePokemons}
                                        allPokemons={pokedex.pokemons}
                                        recentTeams={recentTeams}
                                        showDetails={showDetails}
                                        onToggleFavoritePokemon={handleToggleFavoritePokemon}
                                        handleEditTeam={handleEditTeam}
                                        greetingPokemonId={greetingPokemonId}
                                        greetingPokemonIsShiny={greetingPokemonIsShiny}
                                        heroBackgroundId={homeWallpaperId}
                                        onChangeHeroBackground={setHomeWallpaperPreference}
                                        onOpenPokemonSelector={() => setShowGreetingPokemonSelector(true)}
                                        db={db}
                                        theme={theme}
                                        onNavigateWithTypeFilter={handleNavigateWithTypeFilter}
                                    />
                                } />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        )}
                    </main>

                    <footer className="app-shell__footer">
                        <div className="app-shell__footer-row">
                            <div className="app-shell__footer-credit">
                                <span>
                                    Developed and built by <a href="https://github.com/ensinho" target="_blank" rel="noopener noreferrer" className="app-shell__footer-link app-shell__footer-link--inline">Enzo Esmeraldo</a>
                                </span>
                                <FooterFeedback db={db} userId={userId} userEmail={userEmail} displayName={displayName} showToast={showToast} />
                            </div>

                            <div className="app-shell__footer-links">
                                <a href="https://github.com/ensinho/pokemonTeamBuilder" target="_blank" rel="noopener noreferrer" className="app-shell__footer-link"><GithubIcon /></a>
                                <a href="https://www.linkedin.com/in/enzoesmeraldo/" target="_blank" rel="noopener noreferrer" className="app-shell__footer-link"><LinkedinIcon /></a>
                            </div>
                        </div>
                        <p className="app-shell__footer-copy">Using the <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer" className="app-shell__footer-link app-shell__footer-link--inline">PokéAPI</a>. Pokémon and their names are trademarks of Nintendo.</p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
