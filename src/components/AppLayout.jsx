import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { createPortal } from 'react-dom';
import { Routes, Route, useNavigate, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import { useToastStore } from '../store/useToastStore';
import { useThemeStore } from '../store/useThemeStore';
import { chooseTheme } from '../store/themeChoice';
import { useAuthStore, resolveAvatar } from '../store/useAuthStore';
import { useFriends } from '../hooks/useFriends';
import { useBattles } from '../hooks/useBattles';
import { useBattleNotifications } from '../hooks/useBattleNotifications';
import { useActiveTeam } from '../hooks/useActiveTeam';
import { useActiveTeamStore } from '../store/useActiveTeamStore';
import { useFirestoreTeams } from '../hooks/useFirestoreTeams';
import { useReferenceStore } from '../store/useReferenceStore';
import { useTeamCompareStore } from '../store/useTeamCompareStore';
import { useNotifications } from '../hooks/useNotifications';

import { PATCH_NOTES_VERSION, THEME_META } from '../constants/theme';
import { pageGuideTips, PageGuide } from './PageGuide';
import { FooterFeedback } from './FooterFeedback';
import { DrawerAboutSection } from './DrawerAboutSection';
import { SidebarAccountMenu } from './SidebarAccountMenu';
import { ShellNavGroup } from './ShellNavGroup';
import ToastStack from './ToastStack';
import { ThemeToggle } from './ThemeToggle';
import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { storedFormFields, withUniqueInstanceIds } from '../utils/teamSerialization';
import { trainerSpriteUrl } from '../hooks/useTrainerSprites';
import { GengarPresence } from './GengarPresence';
import { getStaticPokemonDetail } from '../services/pokemonDataCache';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { BREAKPOINTS } from '../constants/breakpoints';
import { setNavigator, setPartnerPicker, setSignInPrompt } from '../utils/navigation';
import { PAGE_MARKS } from '../utils/journeys';
import { JourneyCoach } from './journeys/JourneyCoach';
import { splashHoldMs, splashProgress } from '../utils/bootSplash';
import { usePokedex } from '../hooks/usePokedex';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { useDockCompact } from '../hooks/useDockCompact';
import { ariaKeyShortcuts, formatShortcut, matchesShortcut } from '../utils/searchShortcut';

// Direct imports, not the modals barrel: the barrel re-exports every dialog,
// and the ones with side effects (stylesheets) would ride into the entry bundle
// even though the lazy() loaders below are their only real users.
import { ConfirmDialog } from './modals/ConfirmDialog';
import { ConfirmHost } from './modals/ConfirmHost';
import { SessionTransition } from './SessionTransition';
import { GuestAccountCard } from './GuestAccountCard';
import { SyncPromptModal } from './modals/SyncPromptModal';
import { VersionUpdateModal } from './modals/VersionUpdateModal';

import {
    GithubIcon, LinkedinIcon, CollapseLeftIcon, CollapseRightIcon,
    DownloadIcon, MenuIcon, PokeballIcon, StarsIcon, SwordsIcon,
    HomeIcon, AccountIcon, ChartColumnIcon,
    MapPinIcon, MessageIcon,
    ScrollIcon, BagIcon, TrophyIcon, CalculatorIcon, GaugeIcon, SparklesIcon
} from './icons';
// Every destination gets its own glyph: Habilidades/PokéQuiz, Amigos/Entrar and
// Batalhas/Construtor used to share one each, which made the Mais grid harder to
// scan than its labels (2026-10-06).
import { BoxIcon, Puzzle, Medal, Search, TrendingUp, Settings, Users, ShieldHalf, Crown, Shapes, Award, CircleHelp, Route as RouteIcon } from 'lucide-react';

// The Home view stays eager: it's the landing route, so lazy-loading it would only add a
// fallback flash on first paint. Every other view is code-split (React.lazy) to shrink
// the initial bundle — the heavy ones (Pokedex, PokePuzzle) dominate it.
// Views' CSS first, in the barrel's old order (see the module); the Home's JS
// directly, so the views barrel — and every other view — stays out of the
// entry bundle.
import '../styles/eagerViewStyles';
import { CozyHomeView } from './views/CozyHomeView';
import { HomeEntry } from './views/HomeEntry';
import { useLandingStore } from '../store/useLandingStore';
import { BrandWordmark } from './BrandWordmark';

// The phone's tab destinations, plus the screen the Pokédex opens. Named so the
// idle prefetch below and React.lazy share one import: the module loader caches
// the promise, so a prefetched chunk renders on the first tap instead of
// suspending behind the route fallback for a network round trip.
const loadTeamBuilderView = () => import('./views/TeamBuilderView');
const loadPokedexView = () => import('./views/PokedexView');
const loadPokemonDetailView = () => import('./views/PokemonDetailView');
const loadPokePuzzleView = () => import('./views/PokePuzzleView');
const loadChampionChallengeView = () => import('./views/challenge/ChampionChallengeView');
const loadMetaUsageView = () => import('./views/MetaUsageView');
// The Mais sheet only exists once its tab is tapped, so it stays out of the
// boot bundle — and is warmed with the tab destinations, so that tap opens it
// without waiting on a download.
const loadMobileMoreSheet = () => import('./MobileMoreSheet');
const MobileMoreSheet = lazy(() => loadMobileMoreSheet().then((m) => ({ default: m.MobileMoreSheet })));
// The global search is its own chunk too: it opens from the header or ⌘K, and is
// warmed with the tab destinations on a phone, where the header glyph is its
// only way in.
const loadCommandPalette = () => import('./CommandPalette');
const CommandPalette = lazy(() => loadCommandPalette().then((m) => ({ default: m.CommandPalette })));
// Dialogs that only open from a click. They were ~90 KB of the entry bundle
// (the share composer alone is 25 KB) paid by every visitor before first paint;
// as chunks they cost nothing until wanted, and the idle warm-up below fetches
// the likely ones so the first click still opens instantly.
const loadTeamPokemonEditorModal = () => import('./modals/TeamPokemonEditorModal');
const loadShareSnippetModal = () => import('./modals/ShareSnippetModal');
const loadAuthModal = () => import('./modals/AuthModal');
const TeamPokemonEditorModal = lazy(() => loadTeamPokemonEditorModal().then((m) => ({ default: m.TeamPokemonEditorModal })));
const ShareSnippetModal = lazy(() => loadShareSnippetModal().then((m) => ({ default: m.ShareSnippetModal })));
const AuthModal = lazy(() => loadAuthModal().then((m) => ({ default: m.AuthModal })));
// Mounted only while a badge is waiting to be shown (newlyUnlockedBadge).
const TeamCompareModal = lazy(() => import('./modals/TeamCompareModal').then((m) => ({ default: m.TeamCompareModal })));
const BadgeUnlockModal = lazy(() => import('./modals/BadgeUnlockModal').then((m) => ({ default: m.BadgeUnlockModal })));
const PatchNotesModal = lazy(() => import('./modals/PatchNotesModal').then((m) => ({ default: m.PatchNotesModal })));
const GreetingPokemonSelectorModal = lazy(() => import('./modals/GreetingPokemonSelectorModal').then((m) => ({ default: m.GreetingPokemonSelectorModal })));
const TrainerSpriteSelectorModal = lazy(() => import('./modals/TrainerSpriteSelectorModal').then((m) => ({ default: m.TrainerSpriteSelectorModal })));

const MOBILE_PREFETCH = [loadTeamBuilderView, loadPokedexView, loadPokemonDetailView, loadPokePuzzleView, loadMobileMoreSheet, loadCommandPalette, loadTeamPokemonEditorModal, loadAuthModal];
// Desktop had no warm-up at all, so the first click on Construtor downloaded a
// 107 KB chunk behind the route fallback. Same idea, the rail's main entries.
// Hovering or focusing a rail entry fetches its chunk: the half second between
// pointing and clicking is usually enough for the download, so the long tail
// the idle warm-up skips still opens without the route fallback. Same import()
// specifiers as the lazy() calls below, so the module cache is shared.
const ROUTE_CHUNKS = {
    builder: loadTeamBuilderView, pokedex: loadPokedexView, pokepuzzle: loadPokePuzzleView, meta: loadMetaUsageView,
    challenge: loadChampionChallengeView,
    feed: () => import('./views/FeedView'), favorites: () => import('./views/FavoritesView'),
    tournaments: () => import('./views/TournamentsView'), bestTeams: () => import('./views/BestTeamsView'),
    damageCalc: () => import('./views/DamageCalculatorView'),
    speedTiers: () => import('./views/SpeedTiersView'), moves: () => import('./views/MovesListView'),
    abilities: () => import('./views/AbilitiesListView'), items: () => import('./views/ItemsListView'),
    types: () => import('./views/TypesView'),
    gyms: () => import('./views/GymsView'), generationQuiz: () => import('./views/QuizView'),
    journeys: () => import('./views/JourneysView'),
    friends: () => import('./views/FriendsView'), battles: () => import('./views/battle/BattleListView'),
    profile: () => import('./views/ProfileView'), admin: () => import('./views/AdminDashboardView'),
};
const prefetchRoute = (key) => { ROUTE_CHUNKS[key]?.().catch(() => {}); };
const DESKTOP_PREFETCH = [loadTeamBuilderView, loadPokedexView, loadPokemonDetailView, loadCommandPalette, loadMetaUsageView, loadTeamPokemonEditorModal, loadShareSnippetModal, loadAuthModal];

const IS_APPLE = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');

// Typing "/" opens search only when the user is not already typing somewhere.
const isTypingTarget = (target) => Boolean(
    target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)),
);

const AdminDashboardView = lazy(() => import('./views/AdminDashboardView').then((m) => ({ default: m.AdminDashboardView })));
const FavoritesView = lazy(() => import('./views/FavoritesView').then((m) => ({ default: m.FavoritesView })));
const QuizView = lazy(() => import('./views/QuizView').then((m) => ({ default: m.QuizView })));
const JourneysView = lazy(() => import('./views/JourneysView').then((m) => ({ default: m.JourneysView })));
const PokedexView = lazy(() => loadPokedexView().then((m) => ({ default: m.PokedexView })));
const ProfileView = lazy(() => import('./views/ProfileView').then((m) => ({ default: m.ProfileView })));
const FriendsView = lazy(() => import('./views/FriendsView').then((m) => ({ default: m.FriendsView })));
const BattleListView = lazy(() => import('./views/battle/BattleListView').then((m) => ({ default: m.BattleListView })));
const BattleDetailView = lazy(() => import('./views/battle/BattleDetailView').then((m) => ({ default: m.BattleDetailView })));
const TeamBuilderView = lazy(() => loadTeamBuilderView().then((m) => ({ default: m.TeamBuilderView })));
const FeedView = lazy(() => import('./views/FeedView').then((m) => ({ default: m.FeedView })));
const PokePuzzleView = lazy(loadPokePuzzleView); // default export
const ChampionChallengeView = lazy(() => loadChampionChallengeView().then((m) => ({ default: m.ChampionChallengeView })));
const MovesListView = lazy(() => import('./views/MovesListView').then((m) => ({ default: m.MovesListView })));
const MoveDetailView = lazy(() => import('./views/MoveDetailView').then((m) => ({ default: m.MoveDetailView })));
const AbilitiesListView = lazy(() => import('./views/AbilitiesListView').then((m) => ({ default: m.AbilitiesListView })));
const AbilityDetailView = lazy(() => import('./views/AbilityDetailView').then((m) => ({ default: m.AbilityDetailView })));
const TypesView = lazy(() => import('./views/TypesView').then((m) => ({ default: m.TypesView })));
const SharedTeamView = lazy(() => import('./views/SharedTeamView').then((m) => ({ default: m.SharedTeamView })));
const TypeDetailView = lazy(() => import('./views/TypesView').then((m) => ({ default: m.TypeDetailView })));
const ItemsListView = lazy(() => import('./views/ItemsListView').then((m) => ({ default: m.ItemsListView })));
const ItemDetailView = lazy(() => import('./views/ItemDetailView').then((m) => ({ default: m.ItemDetailView })));
const PokemonDetailView = lazy(() => loadPokemonDetailView().then((m) => ({ default: m.PokemonDetailView })));
const DamageCalculatorView = lazy(() => import('./views/DamageCalculatorView').then((m) => ({ default: m.DamageCalculatorView })));
const SpeedTiersView = lazy(() => import('./views/SpeedTiersView').then((m) => ({ default: m.SpeedTiersView })));
const TournamentsView = lazy(() => import('./views/TournamentsView').then((m) => ({ default: m.TournamentsView })));
const BestTeamsView = lazy(() => import('./views/BestTeamsView').then((m) => ({ default: m.BestTeamsView })));
const TournamentTeamView = lazy(() => import('./views/TournamentTeamView').then((m) => ({ default: m.TournamentTeamView })));
const TeamDetailView = lazy(() => import('./views/TeamDetailView').then((m) => ({ default: m.TeamDetailView })));
const MetaUsageView = lazy(() => loadMetaUsageView().then((m) => ({ default: m.MetaUsageView })));
const PokemonUsageView = lazy(() => import('./views/PokemonUsageView').then((m) => ({ default: m.PokemonUsageView })));
const GymsView = lazy(() => import('./views/GymsView').then((m) => ({ default: m.GymsView })));
const NotFoundView = lazy(() => import('./views/NotFoundView').then((m) => ({ default: m.NotFoundView })));

import '../styles/app-shell.css';
import '../styles/toast.css';

// Fades in after a beat (.route-fallback, app-shell.css): a chunk that lands
// in under ~200ms swaps straight to the view instead of flashing the loader.
const RouteFallback = () => (
    <div className="route-fallback flex items-center justify-center w-full py-16">
        <GengarPresence variant="loading" size={96} />
    </div>
);

const SettingsGlyph = () => <Settings className="w-5 h-5 shrink-0" />;

const TrainerAvatar = ({ pokemonId, isShiny = false, trainerSprite = null, size = 24, color = 'currentColor', className = '' }) => {
    if (trainerSprite || pokemonId) {
        return (
            <span
                className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${className}`}
                style={{ width: size, height: size, backgroundColor: 'var(--color-primary-soft)' }}
                aria-hidden="true"
            >
                <img
                    src={trainerSprite
                        ? trainerSpriteUrl(trainerSprite)
                        : getPokemonFrontSpriteUrl(pokemonId, { shiny: isShiny })}
                    alt=""
                    className="image-pixelated"
                    // Pokémon sprites carry transparent padding, so they get cropped
                    // wider than the frame and nudged down; trainer sprites are
                    // square and fill it exactly.
                    style={trainerSprite
                        ? { width: size, height: size, objectFit: 'contain' }
                        : { width: size + 8, height: size, objectFit: 'contain', marginTop: 2 }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
            </span>
        );
    }
    return <AccountIcon color={color} className={`shrink-0 ${className}`} />;
};

const ShellNavButton = ({ active, collapsed, label, onClick, icon, badge = 0, onIntent }) => {
    const buttonRef = useRef(null);
    // Styled hover tooltip for the collapsed rail. Rendered via a portal with
    // fixed positioning so it escapes the sidebar's `overflow: hidden` clip.
    const [tooltipPos, setTooltipPos] = useState(null);

    const showTooltip = () => {
        if (!collapsed || !buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        setTooltipPos({ top: rect.top + rect.height / 2, left: rect.right + 10 });
    };
    const hideTooltip = () => setTooltipPos(null);

    return (
        <button
            ref={buttonRef}
            type="button"
            onClick={onClick}
            onMouseEnter={() => { showTooltip(); onIntent?.(); }}
            onMouseLeave={hideTooltip}
            onFocus={() => { showTooltip(); onIntent?.(); }}
            onBlur={hideTooltip}
            aria-current={active ? 'page' : undefined}
            className={`app-shell__nav-link ${active ? 'is-active' : ''}  ${collapsed ? 'is-collapsed' : ''}`}
        >
            <span className="app-shell__nav-icon" aria-hidden="true">
                {icon}
                {/* Collapsed rail has no room for the count, so it degrades to a dot. */}
                {badge > 0 && collapsed && <span className="app-shell__nav-dot" aria-hidden="true" />}
            </span>
            <span className={`app-shell__nav-text ${collapsed ? 'is-hidden' : ''}`}>{label}</span>
            {badge > 0 && !collapsed && <span className="app-shell__nav-badge">{badge > 9 ? '9+' : badge}</span>}
            {collapsed && tooltipPos && createPortal(
                <span
                    role="tooltip"
                    className="app-shell__nav-tooltip"
                    style={{ top: tooltipPos.top, left: tooltipPos.left }}
                >
                    {label}
                </span>,
                document.body
            )}
        </button>
    );
};

// Two module-scope latches for the patch-notes effect, both there because React's
// StrictMode runs it twice in development while it mutates localStorage.
//
// `versionBumpHandled`: the first run detects the bump, clears the caches, writes
// the new version and shows the notes. Without the latch the second run re-reads
// the version *it just wrote*, sees a match and takes the other branch — which is
// how the notes used to vanish in dev while working in production.
//
// `patchNotesOwed`: same double mount, where the first run legitimately consumes
// the `showPatchNotesAfterReload` handoff flag; this keeps the second run from
// rendering nothing.
let versionBumpHandled = false;
let patchNotesOwed = false;

// Sidebar collapse preference. A fresh key (not the legacy 'ptb-sidebar-collapsed',
// which was auto-persisted on every change) so that only a *deliberate* toggle
// counts as a preference; absence means "let the viewport width decide".
const SIDEBAR_COLLAPSE_KEY = 'ptb-sidebar-collapse-pref';

// Returns the user's explicit choice (true/false), or null when they haven't
// made one — in which case we auto-decide from the viewport width.
const readSidebarCollapsePref = () => {
    try {
        const v = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
        return v === '1' ? true : v === '0' ? false : null;
    } catch { return null; }
};

// On the small-laptop band (1024–1279px) the fixed sidebar steals too much
// width, so default it to the icon rail. At ≥1280px there's room to expand it.
const autoCollapseForWidth = (w) => w >= BREAKPOINTS.lg && w < BREAKPOINTS.xl;

const AUTH_SPLASH_MESSAGES = [
    'Checking if you are who you say you are',
    'Verifying trainer credentials',
    'Confirming your identity with Professor Oak',
    'Making sure this trainer card is yours',
    'Securing your team data before we start',
];

export default function AppLayout() {
    const { t, language } = useTranslation();
    const navigate = useNavigate();

    // Hand the router to code outside the tree (see utils/navigation.js). The
    // stores raise most of the app's toasts, and those toasts now carry the
    // "next step" button for whatever just happened.
    useEffect(() => { setNavigator(navigate); }, [navigate]);
    const location = useLocation();

    // Derive current page routing
    const currentPage = useMemo(() => {
        const path = location.pathname;
        if (path === '/') return 'home';
        if (path.startsWith('/journeys')) return 'journeys';
        if (path.includes('/feed')) return 'feed';
        if (path.includes('/pokedex')) return 'pokedex';
        if (path.includes('/pokemon/')) return 'pokemonDetail';
        if (path.includes('/pokepuzzle')) return 'pokepuzzle';
        if (path.includes('/challenge')) return 'challenge';
        if (path.includes('/moves')) return 'moves';
        if (path.includes('/abilities')) return 'abilities';
        if (path === '/types' || path.startsWith('/types/')) return 'types';
        if (path === '/best-teams') return 'bestTeams';
        if (path.startsWith('/t/')) return 'sharedTeam';
        if (path.includes('/items')) return 'items';
        if (path.includes('/gyms')) return 'gyms';
        if (path.includes('/tournaments')) return 'tournaments';
        if (path.includes('/meta')) return 'meta';
        if (path.includes('/damage-calculator')) return 'damageCalc';
        if (path.includes('/speed-tiers')) return 'speedTiers';
        if (path.includes('/teams')) return 'allTeams';
        if (path.includes('/quiz')) return 'generationQuiz';
        if (path.includes('/battles')) return 'battles';
        if (path.includes('/friends')) return 'friends';
        if (path.includes('/favorites')) return 'favorites';
        if (path.includes('/builder')) return 'builder';
        if (path.includes('/profile')) return 'profile';
        if (path.includes('/admin')) return 'admin';
        return 'notFound';
    }, [location.pathname]);

    // Zustand Stores
    const showToast = useToastStore((state) => state.showToast);
    // Selected with useShallow, never the whole store: a bare useAuthStore()
    // re-rendered this entire shell on every change to any field of the store.
    const { theme, colors, homeWallpaperId, setHomeWallpaperPreference, showTeraType, setShowTeraType, searchShortcut, setSearchShortcut } = useThemeStore(useShallow((s) => ({
        theme: s.theme, colors: s.colors, homeWallpaperId: s.homeWallpaperId,
        setHomeWallpaperPreference: s.setHomeWallpaperPreference, showTeraType: s.showTeraType,
        setShowTeraType: s.setShowTeraType, searchShortcut: s.searchShortcut, setSearchShortcut: s.setSearchShortcut,
    })));
    const {
        userId, userEmail, isAnonymous, isAdmin, displayName, setDisplayName,
        greetingPokemonId, greetingPokemonIsShiny, setGreetingPokemon, streak,
        trainerSprite, setTrainerSprite, avatarPreference, setAvatarPreference,
        handleResetSyncPrompt, showSyncPrompt, handleDismissSyncPrompt,
        handleSignIn, handleSignUp, handleSignOut, sendPasswordReset, isAuthReady, isAuthReconciled, isNewVisitor
    } = useAuthStore(useShallow((s) => ({
        userId: s.userId, userEmail: s.userEmail, isAnonymous: s.isAnonymous, isAdmin: s.isAdmin,
        displayName: s.displayName, setDisplayName: s.setDisplayName,
        greetingPokemonId: s.greetingPokemonId, greetingPokemonIsShiny: s.greetingPokemonIsShiny,
        setGreetingPokemon: s.setGreetingPokemon, streak: s.streak,
        trainerSprite: s.trainerSprite, setTrainerSprite: s.setTrainerSprite,
        avatarPreference: s.avatarPreference, setAvatarPreference: s.setAvatarPreference,
        handleResetSyncPrompt: s.handleResetSyncPrompt, showSyncPrompt: s.showSyncPrompt,
        handleDismissSyncPrompt: s.handleDismissSyncPrompt,
        handleSignIn: s.handleSignIn, handleSignUp: s.handleSignUp, handleSignOut: s.handleSignOut,
        sendPasswordReset: s.sendPasswordReset,
        isAuthReady: s.isAuthReady, isAuthReconciled: s.isAuthReconciled, isNewVisitor: s.isNewVisitor,
    })));

    const {
        currentTeam, teamName, setTeamName, editingTeamId, handleRemoveFromTeam,
        handleReorderTeam, handleSaveTeam, handleClearTeam, handleExportToShowdown,
        handleShareTeam, editingTeamMember, setEditingTeamMember, shareModal,
        closeShareModal, handleUpdateTeamMember, suggestedPokemonIds, teamAnalysis,
        setCurrentTeam, shareTeamByData, handleAddPokemon, setEditingTeamId,
        handleRandomizeTeam, isRandomizing, importTeam
    } = useActiveTeam();
    const speciesClause = useActiveTeamStore((s) => s.speciesClause);

    const {
        favoritePokemons, handleToggleFavoritePokemon, deleteConfirmation,
        setDeleteConfirmation, handleDeleteTeam, handleToggleFavorite, handleDuplicateTeam,
        savedTeams, activeTeamId, setActiveTeamId
    } = useFirestoreTeams();

    const activeTeam = useMemo(() => {
        if (!savedTeams || savedTeams.length === 0) return null;
        return savedTeams.find(t => t.id === activeTeamId) || savedTeams[0];
    }, [savedTeams, activeTeamId]);

    const newlyUnlockedBadge = useAuthStore((s) => s.newlyUnlockedBadge);
    const isTeamCompareOpen = useTeamCompareStore((s) => s.isOpen);
    const { generations, items, natures, games } = useReferenceStore(useShallow((s) => ({
        generations: s.generations, items: s.items, natures: s.natures, games: s.games,
    })));

    // Pokedex logic hook
    const pokedex = usePokedex();

    // PWA install prompt
    const { isInstallable, isIOS, handleInstall } = usePWAInstall();

    // UI Local States
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // The user's shortcut (⌘K / Ctrl+K unless changed on the profile) from
    // anywhere, or "/" when not typing — the palette toggles on the chord so the
    // same keys that opened it close it again. The profile's recorder stops
    // propagation while it listens, so recording never opens the palette.
    useEffect(() => {
        const handleKeyDown = (event) => {
            const key = event.key?.toLowerCase();
            if (matchesShortcut(event, searchShortcut)) {
                event.preventDefault();
                setIsSearchOpen((open) => !open);
            } else if (key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target)) {
                event.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [searchShortcut]);

    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth >= BREAKPOINTS.lg;
        }
        return false;
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        const pref = readSidebarCollapsePref();
        if (pref !== null) return pref;                 // deliberate choice wins
        return autoCollapseForWidth(window.innerWidth); // otherwise decide by width
    });
    const [authModal, setAuthModal] = useState({ open: false, mode: 'signIn' });

    // Lets a store-raised toast open the auth modal. Every "you need an account
    // for this" message used to be a dead end — it named the requirement and
    // left the user to go find the button.
    useEffect(() => {
        setSignInPrompt((mode = 'signIn') => setAuthModal({ open: true, mode }));
    }, []);
    const [showPatchNotes, setShowPatchNotes] = useState(false);
    const [showGreetingPokemonSelector, setShowGreetingPokemonSelector] = useState(false);
    // The journeys' first mission opens the partner picker from wherever it is
    // started (Home, the Journeys page, the guide's "Next mission").
    useEffect(() => {
        setPartnerPicker(() => setShowGreetingPokemonSelector(true));
    }, []);

    // A page the journeys teach leaves its mark the first time it is opened
    // (utils/journeys.js PAGE_MARKS). markJourney is a no-op once set.
    useEffect(() => {
        const mark = PAGE_MARKS[currentPage];
        if (mark) useAuthStore.getState().markJourney(mark);
    }, [currentPage]);
    const [showTrainerSpriteSelector, setShowTrainerSpriteSelector] = useState(false);

    // Bound here (not only in FriendsView) so the sidebar badge stays live on every
    // route. The store reference-counts, so FriendsView holding it too is fine.
    const { incomingRequests } = useFriends();
    const pendingFriendRequests = incomingRequests.length;

    // Same reasoning: bound here so the badge counts battles waiting on this
    // trainer no matter which route is open.
    const { awaitingMeCount: battlesAwaitingMe } = useBattles();

    // Native browser Notification popups for battles — must live somewhere
    // mounted for the whole session (not just inside the battle views) so a
    // Custom hooks for domain logic & real-time updates
    useNotifications();
    useFriends();
    useBattles();
    useBattleNotifications();

    // The signed-in trainer's own avatar, with their pokemon/trainer choice
    // applied. Memoized off the primitives so the shell doesn't rebuild it on
    // every unrelated store update.
    const ownAvatar = useMemo(
        () => resolveAvatar({ avatarPreference, trainerSprite, greetingPokemonId, greetingPokemonIsShiny }),
        [avatarPreference, trainerSprite, greetingPokemonId, greetingPokemonIsShiny],
    );

    // Explicit collapse/expand from the sidebar controls. Persists the choice so
    // it overrides the width-based auto behavior from then on.
    const setSidebarCollapsedManual = useCallback((val) => {
        setIsSidebarCollapsed(val);
        try { window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, val ? '1' : '0'); }
        catch { /* ignore */ }
    }, []);

    // Service worker registration + the "a new version is live" prompt. Detection
    // and reload both live in the hook, because both used to be wrong here: two
    // detectors raced for the same modal and the loser's reload was answered by
    // the old worker's precache, which is why every release prompted twice.
    const {
        updateAvailable,
        applyUpdate: handleVersionRefresh,
        dismissUpdate: handleVersionDismiss,
    } = useAppUpdate();

    // Track viewport tier, and auto-collapse the sidebar on the small-laptop band
    // (1024–1279) — but only while the user hasn't set an explicit preference.
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < BREAKPOINTS.lg : false);
    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            setIsMobile(w < BREAKPOINTS.lg);
            if (w >= BREAKPOINTS.lg && readSidebarCollapsePref() === null) {
                setIsSidebarCollapsed(autoCollapseForWidth(w));
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Ensure sidebar is always expanded when on mobile — and closed: on a phone
    // `isSidebarOpen` means "the Mais sheet is up", and a desktop window resized
    // (or a tablet rotated) below lg arrives with it true, which would open the
    // sheet unasked.
    useEffect(() => {
        if (isMobile) {
            setIsSidebarCollapsed(false);
            setIsSidebarOpen(false);
        }
    }, [isMobile]);

    // What the sidebar actually renders as. The icon rail is a *desktop*
    // affordance: below lg the sidebar is an off-canvas drawer, and a collapsed
    // drawer is 60px of unlabelled icons whose only expand control is itself
    // desktop-only — a dead end you reach just by having collapsed the rail once
    // on a bigger screen, since the preference is stored per user, not per
    // breakpoint. The effect above tries to correct the state and is kept, but
    // state that has to be corrected can always be observed mid-correction;
    // deriving it at render makes the 60px drawer unrepresentable.
    const isRailCollapsed = isSidebarCollapsed && !isMobile;

    const [searchParams] = useSearchParams();
    // Full-screen takeover: no app header, no tab bar, no page gutter. The phone
    // Pokémon screen (MobilePokemonDetailView) is a dedicated screen — it owns
    // its own back button and title, so the app header would be a second title
    // bar over it, and its sideways swipe wants the whole width.
    const isMobileDetailsOpen = useMemo(() => {
        if (!isMobile) return false;
        if (currentPage === 'pokemonDetail') return true;
        // Legacy /pokedex?pokemon=<id> links (they redirect, but the redirect
        // renders one frame first).
        return currentPage === 'pokedex' && searchParams.has('pokemon');
    }, [isMobile, currentPage, searchParams]);

    // The floating tab dock shrinks while the page is scrolled down and comes
    // back on the way up — `.app-shell__content` is the app's one scroller.
    const [contentScrollEl, setContentScrollEl] = useState(null);
    // The first-visit landing leads with its CTAs alone: no dock under it.
    const isLandingOpen = useLandingStore((s) => s.isOpen);
    const isDockCompact = useDockCompact(contentScrollEl, {
        enabled: isMobile && !isMobileDetailsOpen,
        resetKey: location.pathname,
    });

    // Lock body scroll when mobile details takeover is active
    useEffect(() => {
        if (isMobileDetailsOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileDetailsOpen]);

    // No edge-swipe gesture on phones any more. It pulled the sidebar in from the
    // left edge, and the phone no longer has a left drawer: "Mais" opens a bottom
    // sheet (MobileMoreSheet) that drags down to close like every other sheet. A
    // left-edge swipe is also mobile Safari's own "back" gesture, which the old
    // one raced in a browser tab.


    // Auth Splash Loader
    const [showInitialAuthSplash, setShowInitialAuthSplash] = useState(true);
    const [authSplashProgress, setAuthSplashProgress] = useState(0);
    const [authSplashMessage, setAuthSplashMessage] = useState(() => t('splash.msg1'));
    const initialBootTimeRef = useRef(Date.now());

    // "Boot settled" = the identity on screen is the real one (not the boot
    // snapshot) and the reference data every view reads is in the store. Only
    // the mobile splash waits on this; see src/utils/bootSplash.js.
    // A first visit (isNewVisitor) has no identity to reconcile, so it counts
    // as settled once the reference data is in.
    const isBootSettled = ((isAuthReady && isAuthReconciled) || isNewVisitor) && generations.length > 0;
    const canLeaveSplash = isAuthReady || isNewVisitor;

    // Once boot has settled and the main thread is idle, fetch the main
    // destinations (the tab bar's on a phone, the rail's on desktop) so the
    // first tap on each is a render, not a download. Waiting for boot keeps
    // these chunks out of the way of the requests the splash is holding for; a
    // failed prefetch is harmless (lazy() retries). Data Saver opts out.
    //
    // It waits for the network to go quiet (no new resource for 1.5 s, capped
    // at 8 s) and fetches one chunk at a time: firing all of them on idle made a
    // phone deep link 3–10% slower, the chunks competing with the page's own
    // data on a 4G connection (measured 2026-10-14, ux-bench).
    useEffect(() => {
        if (!isBootSettled || navigator.connection?.saveData) return undefined;
        const list = isMobile ? MOBILE_PREFETCH : DESKTOP_PREFETCH;
        let cancelled = false;
        let started = false;
        let quietTimer;
        let observer;
        const warm = async () => {
            if (started) return;
            started = true;
            observer?.disconnect();
            window.clearTimeout(quietTimer);
            for (const load of list) {
                if (cancelled) return;
                try { await load(); } catch { /* lazy() retries on use */ }
            }
        };
        const armQuiet = () => {
            window.clearTimeout(quietTimer);
            quietTimer = window.setTimeout(warm, 1500);
        };
        if ('PerformanceObserver' in window) {
            try {
                observer = new PerformanceObserver(armQuiet);
                observer.observe({ type: 'resource' });
            } catch { observer = null; }
        }
        armQuiet();
        const capTimer = window.setTimeout(warm, 8000);
        return () => {
            cancelled = true;
            observer?.disconnect();
            window.clearTimeout(quietTimer);
            window.clearTimeout(capTimer);
        };
    }, [isMobile, isBootSettled]);

    const splashMessages = useMemo(() => [
        t('splash.msg1'),
        t('splash.msg2'),
        t('splash.msg3'),
        t('splash.msg4'),
        t('splash.msg5'),
    ], [t]);

    // Caches for dynamic fetches
    const [pokemonDetailsCache, setPokemonDetailsCache] = useState({});
    const [teamSearchTerm, setTeamSearchTerm] = useState('');

    // Initial Splash timer. On desktop this is the original 900 ms beat; on
    // mobile it stretches until boot settles (capped), so the app doesn't paint
    // mid-request and then visibly re-render into the reconciled user.
    useEffect(() => {
        if (!canLeaveSplash || !showInitialAuthSplash) return;
        const remainingMs = splashHoldMs({
            isMobile,
            elapsedMs: Date.now() - initialBootTimeRef.current,
            isBootSettled,
        });
        const timer = setTimeout(() => {
            setShowInitialAuthSplash(false);
        }, remainingMs);
        return () => clearTimeout(timer);
    }, [canLeaveSplash, showInitialAuthSplash, isMobile, isBootSettled]);

    // Keep the bar honest about the wait: on mobile it creeps to 90% over the
    // floor and only closes the last 10% once boot has actually settled.
    const splashBar = splashProgress({ isMobile, isBootSettled });
    useEffect(() => {
        if (!showInitialAuthSplash) return;
        const timer = setTimeout(() => setAuthSplashProgress(splashBar.width), 30);
        return () => clearTimeout(timer);
    }, [showInitialAuthSplash, splashBar.width]);

    useEffect(() => {
        if (!showInitialAuthSplash) return;

        const pickMessage = (current) => {
            if (splashMessages.length <= 1) return splashMessages[0] || '';
            let next = current;
            while (next === current) {
                next = splashMessages[Math.floor(Math.random() * splashMessages.length)];
            }
            return next;
        };

        setAuthSplashMessage(prev => pickMessage(prev));

        let timerId;
        const scheduleNext = () => {
            const randomDelay = 2500 + Math.floor(Math.random() * 1500);
            timerId = setTimeout(() => {
                setAuthSplashMessage(prev => pickMessage(prev));
                scheduleNext();
            }, randomDelay);
        };

        scheduleNext();
        return () => clearTimeout(timerId);
    }, [showInitialAuthSplash, splashMessages]);

    // Drop stale cached data when the app version changes, then show the notes.
    //
    // This used to also unregister every service worker and reload the page. Both
    // were wrong (docs/wounds.md, 2026-09-14): reaching this code at all means the
    // new bundle is *already running*, so the reload was a second visible reload
    // for no gain, and unregistering the worker threw away a 13 MB precache and
    // left the next release with no worker to detect it with.
    useEffect(() => {
        const seenVersion = localStorage.getItem('patchNotesVersion');
        const showAfterReload = localStorage.getItem('showPatchNotesAfterReload') === '1';

        if (versionBumpHandled) return;

        if (seenVersion && seenVersion !== PATCH_NOTES_VERSION) {
            // Version has been bumped!
            versionBumpHandled = true;

            // 1. Clear session storage completely
            try { sessionStorage.clear(); } catch (_) { /* storage blocked: nothing to clear */ }

            // 2. Clear non-essential localStorage keys
            try {
                // The sweep exists to drop stale CACHED DATA after a format
                // change — never the user's settings. Anything a person chose
                // deliberately belongs here, or a release silently resets it.
                // (Found the hard way: the 1.8.0 bump would have wiped the text
                // size — an accessibility setting — the sidebar layout, the
                // builder guide's "seen" flag and the new playthrough mode.)
                const preservedKeys = [
                    // Appearance & interface preferences
                    'theme',
                    'language',
                    'ptbUiScale',
                    'ptbShowTeraType',
                    'homeWallpaperId',
                    'ptb-sidebar-collapse-pref',
                    'ptb-sidebar-open-groups',
                    'ptb:battleAnimatedSprites',
                    // Builder state the user set
                    'ptbActiveTeamId',
                    'tb-regulation',
                    'tb-filters-expanded',
                    // Trainer profile & progress
                    'trainerStreak',
                    'greetingPokemon',
                    'selectedBadgeId',
                    'ptb:celebratedBadges',
                    // Journeys + rewards (a guest has no account copy to restore them)
                    'ptb:journeyMarks',
                    'trainerActiveDays',
                    'ptb:checkin',
                    'ptb:rewards',
                    'generationQuizActiveRunId',
                    // "Don't show me this again" acknowledgements
                    'syncPromptDismissed',
                    'tb-onboarding-seen',
                    'teamsTopicNoticeDismissed',
                    'ptb:browserNotifications',
                    'showPatchNotesAfterReload'
                ];
                const shouldPreserve = (key) => {
                    if (preservedKeys.includes(key)) return true;
                    if (key.startsWith('generationQuizRun:') || key.startsWith('generationQuizBest:')) return true;
                    if (key.startsWith('ptb:pokepuzzle:')) return true;
                    return false;
                };

                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && !shouldPreserve(key)) {
                        localStorage.removeItem(key);
                    }
                }
            } catch (_) { /* storage blocked: nothing to clear */ }

            // 3. Record the version we are now on, and show what changed.
            localStorage.setItem('patchNotesVersion', PATCH_NOTES_VERSION);
            localStorage.removeItem('showPatchNotesAfterReload');
            patchNotesOwed = true;
            setShowPatchNotes(true);
        } else {
            // Same version, or first load. `showPatchNotesAfterReload` is the old
            // reload-based handoff: still honoured so anyone who took the update
            // on the previous build still gets their notes.
            if (showAfterReload || patchNotesOwed) {
                patchNotesOwed = true;
                setShowPatchNotes(true);
                localStorage.removeItem('showPatchNotesAfterReload');
            }
            if (!seenVersion) {
                localStorage.setItem('patchNotesVersion', PATCH_NOTES_VERSION);
            }
        }
    }, []);

    // Deliberately does not set `patchNotesOwed`: that latch means "this page load
    // owes the user the notes"; opening them by hand is just opening them.
    const handleOpenPatchNotes = useCallback(() => {
        setShowPatchNotes(true);
    }, []);

    const handleClosePatchNotes = useCallback(() => {
        patchNotesOwed = false;
        setShowPatchNotes(false);
    }, []);

    const pageInfo = useMemo(() => {
        const pages = {
            'home': { title: t('nav.home'), subtitle: t('home.defaultSubtitle') },
            'feed': { title: t('nav.feed'), subtitle: language === 'pt' ? 'Fórum público e feed de compartilhamento' : 'Public forum and sharing feed' },
            'builder': { title: t('builder.title'), subtitle: t('builder.subtitle') },
            'pokedex': { title: t('nav.pokedex'), subtitle: t('home.shortcutPokedexDesc') },
            'allTeams': { title: t('savedTeams.title'), subtitle: t('savedTeams.subtitle') },
            'generationQuiz': { title: t('quiz.title'), subtitle: t('quiz.subtitle') },
            'journeys': { title: t('journeys.title'), subtitle: t('journeys.subtitle') },
            'pokepuzzle': { title: t('pokepuzzle.title'), subtitle: t('pokepuzzle.subtitle') },
            'challenge': { title: t('challenge.title'), subtitle: '' },
            'favorites': { title: t('nav.favorites'), subtitle: language === 'pt' ? 'Gerencie seus times salvos e Pokémon favoritos' : 'Manage your saved teams and favorite Pokémon' },
            'admin': { title: t('nav.admin'), subtitle: t('layout.adminSubtitle') },
            // "Cartão de Treinador & Preferências" ellipsised at "Prefe…" in a phone
            // header; the phone gets the tab-length name.
            'profile': { title: t('profile.title'), shortTitle: t('nav.profile'), subtitle: t('profile.trainerProfile') },
            'pokemonDetail': { title: t('nav.pokemonList'), subtitle: t('home.shortcutPokedexDesc') },
            'moves': { title: t('nav.moves'), subtitle: t('db.movesSubtitle') },
            'abilities': { title: t('nav.abilities'), subtitle: t('db.abilitiesSubtitle') },
            'types': { title: t('nav.types'), subtitle: t('db.typesSubtitle') },
            'sharedTeam': { title: t('sharedTeamView.kicker'), subtitle: '' },
            'items': { title: t('nav.items'), subtitle: t('db.itemsSubtitle') },
            'tournaments': { title: t('nav.tournaments'), subtitle: t('tools.tournamentsSubtitle') },
            'bestTeams': { title: t('nav.bestTeams'), subtitle: '' },
            'meta': { title: language === 'pt' ? 'Meta & uso' : 'Meta & usage', subtitle: language === 'pt' ? 'Uso competitivo, cores e o que os Pokémon estão rodando' : 'Competitive usage, cores & what Pokémon are running' },
            'damageCalc': { title: t('nav.damageCalc'), subtitle: t('tools.damageSubtitle') },
            'speedTiers': { title: t('nav.speedTiers'), subtitle: t('tools.speedSubtitle') },
            'friends': { title: t('nav.friends'), subtitle: language === 'pt' ? 'Seus amigos treinadores e pedidos pendentes' : 'Your trainer friends and pending requests' },
            'battles': { title: t('nav.battles'), subtitle: language === 'pt' ? 'Batalhas por turno contra seus amigos' : 'Turn-by-turn battles against your friends' },
            'gyms': {
                title: language === 'pt' ? 'Ginásios' : 'Gyms',
                subtitle: language === 'pt'
                    ? 'Líderes de ginásio e os times exatos que eles usam'
                    : 'Gym leaders and the exact teams they run',
            },
            'notFound': { title: t('layout.notFoundPageTitle'), subtitle: '' },
        };
        // Falling back to the Home entry made a missing key look like a working
        // header — /gyms and the old /pokeroom both shipped showing "Início" for exactly
        // that reason. An unknown route now shows nothing rather than a lie.
        return pages[currentPage] || { title: '', subtitle: '' };
    }, [currentPage, t, language]);

    // One wrapper for every route. It carries no width cap — see the note on
    // .app-shell__page-frame — but it stays a single shared element so the
    // router is defined once; home used to escape it via a duplicated <Routes>.
    const pageFrameClassName = 'app-shell__page-frame';

    // Gates the header's team strip. Nothing in the active team means nothing to
    // put in the header — see the note at its render site.
    const hasActiveTeamMembers = (activeTeam?.pokemons?.length ?? 0) > 0;

    // The five destinations that carry the app. They sit unlabelled at the top of
    // the rail and never fold, so the things people actually came for are always
    // one click away and always in the same place — the rail's shape does not
    // change as you move around it. Everything else lives in the folding sections
    // below and is reached in two.
    //
    // v3 (2026-10-02) grouped the rail by what the user came to do rather than
    // by when a feature shipped: the pinned four are the core loop — build, keep,
    // look up — so "My teams" (your own work) left PokéData, where it sat between
    // Gyms and Moves.
    //
    // 2026-10-09 (Enzo): the forum is pinned too, between Pokédex and My teams —
    // it is where people go every day, and two clicks through Community hid it.
    // The pinned label is the short "Fórum"; the page title keeps "Feed e fórum".
    //
    // 2026-10-17: Journeys joins them, right under Home — it is where a new
    // trainer learns everything else on this list, so it cannot be two clicks
    // away in a folding section.
    const primaryNavItems = useMemo(() => ([
        { key: 'home', label: t('nav.home'), path: '/', icon: <HomeIcon /> },
        { key: 'journeys', label: t('nav.journeys'), path: '/journeys', icon: <RouteIcon className="w-5 h-5 shrink-0" /> },
        { key: 'builder', label: t('nav.builder'), path: '/builder', icon: <SwordsIcon /> },
        { key: 'pokedex', label: t('nav.pokemonList'), path: '/pokedex', icon: <PokeballIcon /> },
        { key: 'feed', label: t('nav.forum'), path: '/feed', icon: <MessageIcon /> },
        { key: 'favorites', label: t('nav.favorites'), path: '/favorites', icon: <BoxIcon className="w-5 h-5 shrink-0" /> },
    ]), [t]);

    // Sections hold the long tail only — a link promoted to `primaryNavItems`
    // above is deliberately absent here. Listing it twice would put the same
    // destination in two places in one 200px column, which reads as a bug.
    const navigationGroups = useMemo(() => {
        const groups = [
            {
                // Competitive: what the meta is, and the tools to answer it.
                key: 'teamBuilding',
                title: t('nav.teamBuilding'),
                items: [
                    { key: 'meta', label: language === 'pt' ? 'Meta & uso' : 'Meta & usage', path: '/meta', icon: <TrendingUp className="w-5 h-5 shrink-0" /> },
                    { key: 'bestTeams', label: t('nav.bestTeams'), path: '/best-teams', icon: <Award className="w-5 h-5 shrink-0" /> },
                    { key: 'tournaments', label: t('nav.tournaments'), path: '/tournaments', icon: <TrophyIcon /> },
                    // Short in the rail so it can stay narrow; the search keeps the
                    // full name, so "dano" / "tiers" still find them.
                    { key: 'damageCalc', label: t('nav.damageCalcShort'), searchLabel: t('nav.damageCalc'), path: '/damage-calculator', icon: <CalculatorIcon /> },
                    { key: 'speedTiers', label: t('nav.speedTiersShort'), searchLabel: t('nav.speedTiers'), path: '/speed-tiers', icon: <GaugeIcon /> },
                ]
            },
            {
                // PokéData: things you look up.
                key: 'database',
                title: t('nav.database'),
                items: [
                    { key: 'moves', label: t('nav.moves'), path: '/moves', icon: <ScrollIcon /> },
                    { key: 'abilities', label: t('nav.abilities'), path: '/abilities', icon: <SparklesIcon className="w-5 h-5 shrink-0" /> },
                    { key: 'types', label: t('nav.types'), path: '/types', icon: <Shapes className="w-5 h-5 shrink-0" /> },
                    { key: 'items', label: t('nav.items'), path: '/items', icon: <BagIcon /> },
                    { key: 'gyms', label: language === 'pt' ? 'Ginásios' : 'Gyms', path: '/gyms', icon: <Medal className="w-5 h-5 shrink-0" /> },
                ]
            },
            {
                // Games: the daily one first — it is the one that is new today.
                key: 'guessing',
                title: t('nav.guessing'),
                items: [
                    { key: 'pokepuzzle', label: t('nav.pokepuzzle'), path: '/pokepuzzle', icon: <Puzzle className="w-5 h-5 shrink-0" /> },
                    { key: 'challenge', label: t('nav.challenge'), shortLabel: t('nav.challengeShort'), searchLabel: t('nav.challengeSearch'), path: '/challenge', icon: <Crown className="w-5 h-5 shrink-0" /> },
                    { key: 'generationQuiz', label: t('nav.quiz'), path: '/quiz', icon: <CircleHelp className="w-5 h-5 shrink-0" /> },
                ]
            },
            {
                // Community: the other trainers — the forum itself is pinned above.
                // The key stays 'dashboard' so a stored open/folded preference
                // still applies.
                key: 'dashboard',
                title: t('nav.dashboard'),
                items: [
                    // Battles first: a battle waiting on you is the one thing here with a clock on it.
                    { key: 'battles', label: t('nav.battles'), path: '/battles', icon: <ShieldHalf className="w-5 h-5 shrink-0" />, badge: battlesAwaitingMe },
                    { key: 'friends', label: t('nav.friends'), path: '/friends', icon: <Users className="w-5 h-5 shrink-0" />, badge: pendingFriendRequests },
                ]
            },
        ];

        if (isAdmin) {
            groups.push({
                key: 'management',
                title: t('nav.management'),
                items: [
                    { key: 'admin', label: t('nav.admin'), path: '/admin', icon: <ChartColumnIcon className="w-5 h-5 shrink-0" /> }
                ]
            });
        }

        return groups;
    }, [isAdmin, t, language, pendingFriendRequests, battlesAwaitingMe]);

    // The phone's bottom tab bar. One definition, read by the bar itself and by
    // the Mais sheet, which leaves out whatever the bar already shows.
    const mobileTabs = useMemo(() => ([
        { key: 'home', label: t('nav.home'), icon: <HomeIcon />, path: '/' },
        // A fifth of a 360px phone fits about six letters at the dock's size:
        // "Construtor" was cut to "Constru…". The full name stays its accessible name.
        { key: 'builder', label: t('nav.builder'), shortLabel: t('nav.builderShort'), icon: <SwordsIcon />, path: '/builder' },
        { key: 'pokedex', label: 'Pokédex', icon: <PokeballIcon />, path: '/pokedex' },
        // The daily puzzle is the one thing on a phone that is new every day, so it
        // earns the thumb slot; Meta moved into the Mais sheet (2026-09-24, Enzo).
        { key: 'pokepuzzle', label: 'Puzzle', icon: <Puzzle className="w-5 h-5 shrink-0" />, path: '/pokepuzzle' },
    ]), [t]);

    // What the Mais sheet lists — every destination the tab bar has no room for,
    // in exactly one place (2026-10-18, Enzo: "mais fácil, intuitivo e
    // simétrico"). Ordered by how often people come for it (2026-10-29, Enzo:
    // "o champion challenge deve ser mais fácil de acessar… em destaque, único
    // na linha"):
    // - hero: the daily Champion Challenge, alone on the first row, a wide card
    //   with a line saying what it is;
    // - shortcuts: the pinned destinations the bar leaves out (My teams, Forum,
    //   Journeys), untitled, one row of equal cards;
    // - Play: your battles, friends and the Quiz — what is left of the rail's
    //   Community and Games;
    // - Competitive and PokéData as the rail has them.
    // Admin is a tool, not a destination people browse to: it leaves the grid
    // for a row under it (`moreSheetToolItems`). Sections are derived from the
    // rail's items, never re-listed, so a link added there shows up here too.
    const moreSheetSections = useMemo(() => {
        const inTabBar = new Set(mobileTabs.map((tab) => tab.key));
        const placed = new Set(['challenge', ...primaryNavItems.map((item) => item.key)]);
        const visible = (items) => items.filter((item) => !inTabBar.has(item.key));
        const groupItems = (key) => navigationGroups.find((group) => group.key === key)?.items ?? [];
        const itemsOf = (...keys) => visible(keys.flatMap(groupItems)).filter((item) => !placed.has(item.key));
        const titleOf = (key) => navigationGroups.find((group) => group.key === key)?.title;
        const challenge = navigationGroups.flatMap((group) => group.items).find((item) => item.key === 'challenge');
        return [
            // The card has room for the full name; the hint says what it is.
            { key: 'hero', title: null, hero: true, items: challenge ? [{ ...challenge, shortLabel: undefined, hint: t('nav.challengeHint') }] : [] },
            { key: 'pinned', title: null, featured: true, items: visible(primaryNavItems) },
            { key: 'play', title: t('nav.play'), items: itemsOf('dashboard', 'guessing') },
            { key: 'teamBuilding', title: titleOf('teamBuilding'), items: itemsOf('teamBuilding') },
            { key: 'database', title: titleOf('database'), items: itemsOf('database') },
        ].filter((section) => section.items.length > 0);
    }, [mobileTabs, primaryNavItems, navigationGroups, t]);

    const moreSheetToolItems = useMemo(
        () => navigationGroups.find((group) => group.key === 'management')?.items ?? [],
        [navigationGroups],
    );

    // Every destination the rail knows, once each — what the global search
    // offers as "Pages" and, with an empty query, as its jump-to list.
    // Profile and favourite Pokémon are in no section, so before 2026-10-06 a
    // guest had no way to find them at all (preferences, language, notifications
    // lived only behind a Home card); the search is where "where is X" goes.
    const searchDestinations = useMemo(() => {
        const seen = new Set();
        const extras = [
            { key: 'favoritePokemon', label: t('favorites.title'), path: '/favorites?tab=pokemon', icon: <StarsIcon className="w-5 h-5 shrink-0" /> },
            { key: 'profile', label: t('nav.profile'), path: '/profile', icon: <AccountIcon className="w-5 h-5 shrink-0" /> },
        ];
        return [...primaryNavItems, ...navigationGroups.flatMap((group) => group.items), ...extras]
            .filter((item) => item.path && !seen.has(item.key) && seen.add(item.key))
            .map(({ key, label, searchLabel, path, icon }) => ({ key, label: searchLabel || label, path, icon }));
    }, [primaryNavItems, navigationGroups, t]);

    // Available Pokemons & Recent Teams computations
    const availablePokemons = useMemo(() => {
        const teamIds = new Set(currentTeam.map(p => p.id));
        // Under the Species Clause (a competitive builder) by species, not by id:
        // with Dragonite on the team the picker kept offering Mega Dragonite (its
        // own id), which the store refuses. `baseId` is on every form entry.
        const teamSpecies = new Set(currentTeam.map(p => p.speciesId || p.baseId || p.id));
        const available = pokedex.pokemons.filter(p => (speciesClause
            ? !teamSpecies.has(p.baseId || p.id)
            : !teamIds.has(p.id)));

        const indexMap = new Map(pokedex.pokemons.map((p, idx) => [p.id, idx]));

        return available.sort((a, b) => {
            const aIsSuggested = suggestedPokemonIds.has(a.id);
            const bIsSuggested = suggestedPokemonIds.has(b.id);
            if (aIsSuggested && !bIsSuggested) return -1;
            if (!aIsSuggested && bIsSuggested) return 1;

            const aIndex = indexMap.get(a.id) ?? 0;
            const bIndex = indexMap.get(b.id) ?? 0;
            return aIndex - bIndex;
        });
    }, [pokedex.pokemons, currentTeam, suggestedPokemonIds, speciesClause]);

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
            showToast(t('layout.loadDetailsError', { id: pokemonId }), "error");
            return null;
        }
    }, [pokemonDetailsCache, showToast, t]);

    // A legacy share link (/builder?team=ID, every share before 2026-10-21)
    // opens that team's page now: a preview with an Import button, instead of
    // silently replacing whatever the visitor was building.
    useEffect(() => {
        const teamId = new URLSearchParams(location.search).get('team');
        if (teamId && /^[A-Za-z0-9_-]{1,128}$/.test(teamId)) navigate(`/t/${teamId}`, { replace: true });
    }, [location.search, navigate]);

    // Saved team handlers
    const handleEditTeam = useCallback(async (team) => {
        showToast(t('layout.loadingTeamName', { name: team.name }), 'info');

        const teamPokemonDetailsPromises = team.pokemons.map(p => fetchPokemonDetails(p.id));
        const teamPokemonDetails = await Promise.all(teamPokemonDetailsPromises);

        const customizedTeam = teamPokemonDetails.map((detail, i) => {
            if (!detail) return null;
            const savedPokemonData = team.pokemons[i];
            const defaultCustomization = {
                item: '', nature: 'serious', teraType: detail.types?.[0] || 'normal', isShiny: false,
                ability: detail.abilities?.[0]?.name || 'unknown',
                moves: [],
                evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
                ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 }
            };

            return {
                ...detail,
                ...storedFormFields(savedPokemonData),
                instanceId: savedPokemonData.instanceId,
                customization: { ...defaultCustomization, ...savedPokemonData.customization }
            };
        }).filter(Boolean);

        setCurrentTeam(withUniqueInstanceIds(customizedTeam));
        setTeamName(team.name);
        setEditingTeamId(team.id);
        navigate('/builder');
        setIsSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [fetchPokemonDetails, showToast, navigate, setCurrentTeam, setTeamName, setEditingTeamId, t]);

    // A tournament roster. It must not go through handleEditTeam: that path reads
    // `customization` and `instanceId` off each member, and a tournament set has
    // neither — every set came out blank and all six shared one id.
    const handleImportTeam = useCallback(async (team) => {
        const loaded = await importTeam(team);
        if (!loaded) return;
        navigate('/builder');
        setIsSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [navigate, importTeam]);

    // Duplicate a saved team, then offer to open the copy in the builder. The
    // toast action (rather than an automatic redirect) keeps the user wherever
    // they were — duplicating from a list is usually a batch action.
    const handleDuplicateSavedTeam = useCallback(async (team) => {
        const duplicate = await handleDuplicateTeam(team);
        if (!duplicate) return;
        showToast(
            t('savedTeams.duplicated', { name: duplicate.name }),
            'success',
            { duration: 6000, action: { label: t('common.edit'), onClick: () => handleEditTeam(duplicate) } },
        );
    }, [handleDuplicateTeam, showToast, t, handleEditTeam]);

    // Single source of truth for Pokémon detail: the /pokemon/:id page. We stash
    // the originating route in history state so the detail page's back button can
    // return there (and label itself accordingly) instead of always hitting /pokedex.
    const showDetails = useCallback((pokemon) => {
        if (pokemon?.id != null) {
            navigate(`/pokemon/${pokemon.id}`, { state: { from: location.pathname + location.search } });
        }
    }, [navigate, location.pathname, location.search]);

    const handleRailSlotClick = useCallback((pokemon) => {
        if (pokemon?.id != null) {
            navigate(`/pokemon/${pokemon.id}`, { state: { from: location.pathname + location.search } });
        }
    }, [navigate, location.pathname, location.search]);

    const handleShareSavedTeam = useCallback(async (team) => {
        await shareTeamByData(team?.pokemons || [], team?.name || 'Unnamed Team');
    }, [shareTeamByData]);

    // Saved teams export through the same action as the builder (the store's
    // exportTeamToShowdown): the toast waits for the clipboard, and Showdown
    // opens from its action — a click, so iOS allows the new tab.
    const handleExportSavedTeamToShowdown = useCallback(
        (team) => useActiveTeamStore.getState().exportTeamToShowdown(team?.pokemons || [], team?.name),
        [],
    );

    const handleEditTeamMember = useCallback((pokemon) => {
        setEditingTeamMember(pokemon);
    }, [setEditingTeamMember]);

    // Splash renderer
    if (showInitialAuthSplash) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: colors.background }}>
                <div className="boot-splash w-full max-w-xs text-center">
                    <img
                        src={import.meta.env.BASE_URL + 'logo-mark.webp'}
                        alt=""
                        className="mx-auto w-28 h-auto"
                    />
                    <BrandWordmark className="mx-auto mt-4 block w-48 h-auto" sizes="12rem" />
                    <div
                        className="mt-5 h-1 w-full overflow-hidden rounded-full"
                        style={{ backgroundColor: colors.cardLight }}
                        aria-hidden="true"
                    >
                        <span
                            className="block h-full rounded-full"
                            style={{
                                width: `${authSplashProgress}%`,
                                backgroundColor: colors.primary,
                                transition: `width ${splashBar.durationMs}ms ease-out`,
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
            {/* Modal Components — most are lazy chunks, each behind its own
                boundary so one loading never blanks another that is open. */}
            {editingTeamMember && (
                <Suspense fallback={null}>
                <TeamPokemonEditorModal
                    pokemon={editingTeamMember}
                    onClose={() => setEditingTeamMember(null)}
                    onSave={handleUpdateTeamMember}
                    colors={colors}
                    items={items}
                    natures={natures}
                />
                </Suspense>
            )}
            {showPatchNotes && (
                <Suspense fallback={null}>
                <PatchNotesModal
                    onClose={handleClosePatchNotes}
                    colors={colors}
                    isInstallable={isInstallable}
                    isIOS={isIOS}
                    onInstall={handleInstall}
                    onOpenSearch={() => setIsSearchOpen(true)}
                />
                </Suspense>
            )}
            {updateAvailable && (
                <VersionUpdateModal
                    onRefresh={handleVersionRefresh}
                    onDismiss={handleVersionDismiss}
                />
            )}
            {showGreetingPokemonSelector && (
                <Suspense fallback={null}>
                <GreetingPokemonSelectorModal
                    onClose={() => setShowGreetingPokemonSelector(false)}
                    onSelect={setGreetingPokemon}
                    currentPokemonId={greetingPokemonId}
                    currentPokemonIsShiny={greetingPokemonIsShiny}
                />
                </Suspense>
            )}
            {showTrainerSpriteSelector && (
                <Suspense fallback={null}>
                <TrainerSpriteSelectorModal
                    onClose={() => setShowTrainerSpriteSelector(false)}
                    onSelect={(spriteId) => {
                        setTrainerSprite(spriteId);
                        setShowTrainerSpriteSelector(false);
                    }}
                    currentSpriteId={trainerSprite}
                    colors={colors}
                />
                </Suspense>
            )}

            {shareModal.isOpen && (
            <Suspense fallback={null}>
            <ShareSnippetModal
                isOpen={shareModal.isOpen}
                onClose={closeShareModal}
                pokemons={shareModal.pokemons}
                defaultTitle={shareModal.defaultTitle}
                shareUrl={shareModal.shareUrl}
                colors={colors}
                showToast={showToast}
            />
            </Suspense>
            )}

            {authModal.open && (
                <Suspense fallback={null}>
                <AuthModal
                    mode={authModal.mode}
                    canLink={isAnonymous}
                    onSignIn={handleSignIn}
                    onSignUp={handleSignUp}
                    onResetPassword={sendPasswordReset}
                    onClose={() => setAuthModal({ open: false, mode: authModal.mode })}
                    colors={colors}
                />
                </Suspense>
            )}

            {showSyncPrompt && isAnonymous && (
                <SyncPromptModal
                    colors={colors}
                    onSignUp={() => { setAuthModal({ open: true, mode: 'signUp' }); }}
                    onSignIn={() => { setAuthModal({ open: true, mode: 'signIn' }); }}
                    onDismiss={handleDismissSyncPrompt}
                />
            )}

            {newlyUnlockedBadge && (
                <Suspense fallback={null}>
                    <BadgeUnlockModal />
                </Suspense>
            )}

            {isTeamCompareOpen && (
                <Suspense fallback={null}>
                    <TeamCompareModal />
                </Suspense>
            )}

            <ConfirmDialog
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, teamId: null, teamName: '' })}
                onConfirm={() => {
                    handleDeleteTeam(deleteConfirmation.teamId);
                    setDeleteConfirmation({ isOpen: false, teamId: null, teamName: '' });
                }}
                title={t('dialogs.deleteTeamTitle')}
                message={t('dialogs.deleteTeamMsg', { teamName: deleteConfirmation.teamName })}
                confirmText={t('dialogs.deleteTeamConfirm')}
                colors={colors}
            />

            {isSearchOpen && (
                <Suspense fallback={null}>
                    <CommandPalette onClose={() => setIsSearchOpen(false)} destinations={searchDestinations} />
                </Suspense>
            )}

            {/* Answers confirmAction() from anywhere in the app. */}
            <ConfirmHost />
            <SessionTransition />

            <ToastStack />

            {/* The mission guide. Steps aside on the screens that own the whole
                viewport: the Champion's console and a battle in progress. */}
            <JourneyCoach hidden={currentPage === 'challenge' || location.pathname.startsWith('/battles/')} />

            {/* Sidebar Shell Layout */}
            <div className="app-shell">
                {/* The rail is a desktop object. Below lg the tab bar is the
                    navigation and its "Mais" tab opens MobileMoreSheet (after the
                    content column), so the old off-canvas drawer, its scrim and
                    its phone-only rows are gone from here. */}
                {!isMobile && (
                    <aside className={`app-shell__sidebar ${isRailCollapsed ? 'is-collapsed' : ''}  ${isSidebarOpen ? 'is-open' : ''}`}>
                        <div className="app-shell__sidebar-inner">
                            {/* Top: Gengar Logo + Title */}
                            <div className={`app-shell__brand ${isRailCollapsed ? 'is-collapsed' : ''}`}>
                                <div className="app-shell__brand-main">
                                    {/* Expanded, the wordmark is the whole brand — the
                                        Gengar icon beside it squeezed both (2026-10-26).
                                        The 60px icon rail has no room for the wordmark,
                                        so there the icon stands in for it. */}
                                    {isRailCollapsed && (
                                        <img
                                            src={import.meta.env.BASE_URL + 'logo-mark.webp'}
                                            alt=""
                                            className="app-shell__brand-logo cursor-pointer"
                                            onClick={() => navigate('/')}
                                            title={t('layout.goHome')}
                                        />
                                    )}
                                    <div className={`app-shell__brand-copy ${isRailCollapsed ? 'is-hidden' : ''}`}>
                                        {/* Its alt text is the heading's name. */}
                                        <h2 className="app-shell__brand-title">
                                            <button
                                                type="button"
                                                className="app-shell__brand-home"
                                                onClick={() => navigate('/')}
                                                title={t('layout.goHome')}
                                            >
                                                <BrandWordmark className="app-shell__brand-wordmark" sizes="10.5rem" />
                                            </button>
                                        </h2>
                                    </div>
                                </div>
                                {/* The rail's own collapse control lives in the rail.
                                    It used to sit in the content header, ahead of
                                    the page title — which pushed every page title
                                    ~40px right of the content it titled, so nothing
                                    in the main column shared a left edge. */}
                                <button
                                    onClick={() => setSidebarCollapsedManual(!isRailCollapsed)}
                                    type="button"
                                    aria-label={isRailCollapsed ? t('layout.expandSidebar') : t('layout.collapseSidebar')}
                                    title={isRailCollapsed ? t('layout.expandSidebar') : t('layout.collapseSidebar')}
                                    className="app-shell__icon-button app-shell__collapse-toggle hidden lg:inline-flex"
                                >
                                    {isRailCollapsed ? <CollapseRightIcon /> : <CollapseLeftIcon />}
                                </button>
                            </div>

                            {/* Middle: Navigation menu */}
                            <nav className="app-shell__nav" aria-label="Primary">
                                {/* Pinned block — no heading. Four rows that never move. */}
                                <ul className="app-shell__nav-list app-shell__nav-list--primary">
                                    {primaryNavItems.map((item) => (
                                        <li key={item.key}>
                                            <ShellNavButton
                                                active={currentPage === item.key}
                                                collapsed={isRailCollapsed}
                                                label={item.label}
                                                icon={item.icon}
                                                badge={item.badge || 0}
                                                onIntent={() => prefetchRoute(item.key)}
                                                onClick={() => {
                                                    navigate(item.path);
                                                    setIsSidebarOpen(false);
                                                }}
                                            />
                                        </li>
                                    ))}
                                </ul>

                                <ul className="app-shell__nav-list">
                                    {navigationGroups.map((group) => (
                                        // Every section open, always (2026-10-17, Enzo): the rail
                                        // lists everything under quiet headings instead of folding.
                                        <ShellNavGroup
                                            key={group.key}
                                            title={group.title}
                                            railCollapsed={isRailCollapsed}
                                        >
                                            {group.items.map((item) => (
                                                <li key={item.key}>
                                                    <ShellNavButton
                                                        active={currentPage === item.key}
                                                        collapsed={isRailCollapsed}
                                                        label={item.label}
                                                        icon={item.icon}
                                                        badge={item.badge || 0}
                                                        onIntent={() => prefetchRoute(item.key)}
                                                        onClick={() => {
                                                            navigate(item.path);
                                                            setIsSidebarOpen(false);
                                                        }}
                                                    />
                                                </li>
                                            ))}
                                        </ShellNavGroup>
                                    ))}
                                </ul>
                            </nav>

                            {/* Bottom: Theme button, collapse button, account menu */}
                            <div className="app-shell__sidebar-bottom">
                                <div className={`app-shell__account ${isRailCollapsed ? 'is-collapsed' : ''}`}>
                                    {isAnonymous ? (
                                        <>
                                            {/* A guest's preferences (language, notifications,
                                                text size) live on /profile, which had no entry
                                                in the rail until 2026-10-06. */}
                                            <ShellNavButton
                                                active={currentPage === 'profile'}
                                                collapsed={isRailCollapsed}
                                                label={t('nav.profile')}
                                                icon={<SettingsGlyph />}
                                                onIntent={() => prefetchRoute('profile')}
                                                onClick={() => navigate('/profile')}
                                            />
                                            {/* Expanded: the guest's trainer card, the same object as
                                                the sign-in dialog it opens. Collapsed: just the icon. */}
                                            {isRailCollapsed ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setAuthModal({ open: true, mode: 'signIn' })}
                                                    aria-label={t('nav.signIn')}
                                                    title={t('nav.signIn')}
                                                    className="app-shell__nav-link is-collapsed"
                                                >
                                                    <span className="app-shell__nav-icon" aria-hidden="true"><AccountIcon /></span>
                                                </button>
                                            ) : (
                                                <GuestAccountCard variant="rail" />
                                            )}
                                        </>
                                    ) : (
                                        <SidebarAccountMenu
                                            collapsed={isRailCollapsed}
                                            avatar={<TrainerAvatar pokemonId={ownAvatar.pokemonId} isShiny={ownAvatar.isShiny} trainerSprite={ownAvatar.trainerSprite} color={colors.primary} />}
                                            displayName={displayName || userEmail?.split('@')[0] || 'Trainer'}
                                            email={userEmail || ''}
                                            currentTheme={theme}
                                            themes={THEME_META}
                                            onOpenProfile={() => {
                                                navigate('/profile');
                                                setIsSidebarOpen(false);
                                            }}
                                            onOpenPatchNotes={handleOpenPatchNotes}
                                            onChangeTheme={chooseTheme}
                                            onSignOut={handleSignOut}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </aside>
                )}

                <div ref={setContentScrollEl} className={`app-shell__content custom-scrollbar ${isMobileDetailsOpen ? 'is-mobile-detail' : ''} ${isLandingOpen ? 'is-landing' : ''}`}>
                    {!isMobileDetailsOpen && (
                        <header className="app-shell__header">
                            <div className="app-shell__header-main">
                                {/* No menu button: on a phone the tab bar's "Mais" is
                                    the way into the rest of the app, one thumb-reach
                                    away, and the header keeps its left edge for the
                                    title — the same edge as the page under it. */}
                                <div className="app-shell__header-copy">
                                    <div className="app-shell__header-title-row">
                                        <h1 className="app-shell__header-title">{pageInfo.shortTitle || pageInfo.title}</h1>
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
                                    {/* No subtitle line (2026-10-06): every page already
                                        introduces itself under the header, so the header's
                                        tagline was the same sentence twice ("Gerencie seus
                                        times…" right above "Reveja e gerencie…"). */}
                                </div>
                            </div>

                            {/* Desktop search: the header's centre, shaped like
                                the field it opens with its shortcut on its face.
                                Centred on the page column rather than parked in
                                a corner — search is the one control that belongs
                                to every page equally. Phones keep a glyph among
                                the actions (below). */}
                            {!isMobile && (
                                <div className="app-shell__header-search">
                                    <button
                                        type="button"
                                        onClick={() => setIsSearchOpen(true)}
                                        onPointerEnter={() => { loadCommandPalette().catch(() => {}); }}
                                        onFocus={() => { loadCommandPalette().catch(() => {}); }}
                                        aria-keyshortcuts={ariaKeyShortcuts(searchShortcut)}
                                        className="app-shell__search-trigger"
                                    >
                                        <Search aria-hidden="true" />
                                        <span className="app-shell__search-trigger-label">{t('search.placeholder')}</span>
                                        <kbd>{formatShortcut(searchShortcut, IS_APPLE)}</kbd>
                                    </button>
                                </div>
                            )}

                            <div className="app-shell__header-end">
                            {/* Horizontal Active Team Slots. Rendered only once the
                                active team actually holds something: six dashed
                                empty rings sat in the header of every page,
                                permanently, saying nothing — the top-right of the
                                app read as a row of broken placeholders. With no
                                team there is nothing to show, so we show nothing. */}
                            <div className="app-shell__header-team">
                                {hasActiveTeamMembers && Array.from({ length: 6 }).map((_, index) => {
                                    const pokemon = activeTeam?.pokemons?.[index];
                                    if (pokemon) {
                                        return (
                                            <button
                                                key={pokemon.instanceId || pokemon.id}
                                                type="button"
                                                onClick={() => handleRailSlotClick(pokemon)}
                                                className="app-shell__header-team-slot"
                                                title={t('layout.viewPokemonTitle', { name: pokemon.name })}
                                            >
                                                <img
                                                    src={getPokemonFrontSpriteUrl(pokemon.id, { shiny: pokemon.customization?.isShiny })}
                                                    alt={pokemon.name}
                                                    className="app-shell__header-team-sprite"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                                <span className="app-shell__header-team-slot-badge">{index + 1}</span>
                                            </button>
                                        );
                                    }
                                    return (
                                        <div
                                            key={`empty-${index}`}
                                            className="app-shell__header-team-slot is-empty"
                                            title={t('layout.emptySlotTitle')}
                                            onClick={() => {
                                                if (activeTeam && editingTeamId !== activeTeam.id) {
                                                    handleEditTeam(activeTeam);
                                                } else {
                                                    navigate('/builder');
                                                }
                                            }}
                                        >
                                            <PokeballIcon className="w-5 h-5 opacity-40" />
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="app-shell__header-actions">
                                {/* Phone search: a glyph among the glyphs. */}
                                {isMobile && (
                                    <button
                                        type="button"
                                        onClick={() => setIsSearchOpen(true)}
                                        aria-label={t('search.trigger')}
                                        className="app-shell__icon-button"
                                    >
                                        <Search className="w-5 h-5" aria-hidden="true" />
                                    </button>
                                )}
                                {/* Desktop keeps the quick theme toggle; guests keep it on mobile too. */}
                                {(!isMobile || isAnonymous) && (
                                    <ThemeToggle className="app-shell__icon-button" />
                                )}
                                {/* Mobile: the top-right icon opens the account & preferences menu. */}
                                {isMobile && !isAnonymous && (
                                    <SidebarAccountMenu
                                        variant="header"
                                        isMobile
                                        avatar={<TrainerAvatar pokemonId={ownAvatar.pokemonId} isShiny={ownAvatar.isShiny} trainerSprite={ownAvatar.trainerSprite} color={colors.primary} />}
                                        displayName={displayName || userEmail?.split('@')[0] || 'Trainer'}
                                        email={userEmail || ''}
                                        currentTheme={theme}
                                        themes={THEME_META}
                                        onOpenProfile={() => navigate('/profile')}
                                        onOpenPatchNotes={handleOpenPatchNotes}
                                        onChangeTheme={chooseTheme}
                                        onSignOut={handleSignOut}
                                    />
                                )}
                            </div>
                            </div>
                        </header>
                    )}

                    <main className={`app-shell__body ${isMobileDetailsOpen ? 'is-mobile-detail' : ''}`}>
                        <div className={pageFrameClassName}>
                            <Suspense fallback={<RouteFallback />}>
                                <Routes>
                                    <Route path="/" element={
                                        <HomeEntry hasTeams={(savedTeams?.length || 0) > 0} isAnonymous={isAnonymous}>
                                            <CozyHomeView
                                                navigate={navigate}
                                                savedTeams={savedTeams}
                                                favoritePokemons={favoritePokemons}
                                                greetingPokemonId={greetingPokemonId}
                                                greetingPokemonIsShiny={greetingPokemonIsShiny}
                                                onOpenPokemonSelector={() => setShowGreetingPokemonSelector(true)}
                                                handleEditTeam={handleEditTeam}
                                                activeTeamId={activeTeamId}
                                                heroBackgroundId={homeWallpaperId}
                                                onChangeHeroBackground={setHomeWallpaperPreference}
                                            />
                                        </HomeEntry>
                                    } />
                                    <Route path="/feed" element={
                                        <FeedView
                                            colors={colors}
                                            showToast={showToast}
                                            navigate={navigate}
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
                                            activeTeamId={activeTeamId}
                                            setActiveTeamId={setActiveTeamId}
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
                                            selectedGame={pokedex.selectedGame}
                                            setSelectedGame={pokedex.setSelectedGame}
                                            games={games}
                                            generations={generations}
                                            isInitialLoading={pokedex.isLoading}
                                            availablePokemons={availablePokemons}
                                            gamePokemonIds={pokedex.gamePokemonIds}
                                            gameDexes={pokedex.gameDexes}
                                            handleAddPokemonToTeam={handleAddPokemon}
                                            handleRandomizeTeam={handleRandomizeTeam}
                                            isRandomizing={isRandomizing}
                                            lastPokemonElementRef={pokedex.lastPokemonElementRef}
                                            isFetchingMore={pokedex.isFetchingMore}
                                            selectedTypes={pokedex.selectedTypes}
                                            handleTypeSelection={pokedex.handleTypeSelection}
                                            typeMatchMode={pokedex.typeMatchMode}
                                            setTypeMatchMode={pokedex.setTypeMatchMode}
                                            showDetails={showDetails}
                                            suggestedPokemonIds={suggestedPokemonIds}
                                            colors={colors}
                                            onEditTeamPokemon={handleEditTeamMember}
                                            favoritePokemons={favoritePokemons}
                                            onToggleFavoritePokemon={handleToggleFavoritePokemon}
                                            showOnlyFavorites={pokedex.showOnlyFavorites}
                                            setShowOnlyFavorites={pokedex.setShowOnlyFavorites}
                                            db={db}
                                            fetchPokemonDetails={fetchPokemonDetails}
                                            pokemonDetailsCache={pokemonDetailsCache}
                                            setPokemonDetailsCache={setPokemonDetailsCache}
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
                                            typeMatchMode={pokedex.pokedexTypeMatchMode}
                                            setTypeMatchMode={pokedex.setPokedexTypeMatchMode}
                                            selectedGeneration={pokedex.pokedexSelectedGeneration}
                                            setSelectedGeneration={pokedex.setPokedexSelectedGeneration}
                                            generations={generations}
                                            games={games}
                                            selectedGame={pokedex.pokedexSelectedGame}
                                            setSelectedGame={pokedex.setPokedexSelectedGame}
                                            isInitialLoading={pokedex.isLoading}
                                            listSignature={pokedex.listSignature}
                                            colors={colors}
                                            showDetails={showDetails}
                                            favoritePokemons={favoritePokemons}
                                            onToggleFavoritePokemon={handleToggleFavoritePokemon}
                                            showOnlyFavorites={pokedex.pokedexShowOnlyFavorites}
                                            setShowOnlyFavorites={pokedex.setPokedexShowOnlyFavorites}
                                            db={db}
                                            pokemonDetailsCache={pokemonDetailsCache}
                                            setPokemonDetailsCache={setPokemonDetailsCache}
                                        />
                                    } />

                                    <Route path="/pokemon/:idOrName" element={
                                        <PokemonDetailView
                                            colors={colors}
                                            favoritePokemons={favoritePokemons}
                                            onToggleFavoritePokemon={handleToggleFavoritePokemon}
                                            onAdd={handleAddPokemon}
                                            currentTeam={currentTeam}
                                            db={db}
                                            pokemonDetailsCache={pokemonDetailsCache}
                                            setPokemonDetailsCache={setPokemonDetailsCache}
                                        />
                                    } />
                                    <Route path="/moves" element={<MovesListView />} />
                                    <Route path="/moves/:name" element={<MoveDetailView />} />
                                    <Route path="/abilities" element={<AbilitiesListView />} />
                                    <Route path="/abilities/:name" element={<AbilityDetailView />} />
                                    <Route path="/types" element={<TypesView />} />
                                    <Route path="/t/:id" element={<SharedTeamView />} />
                                    <Route path="/types/:type" element={<TypeDetailView />} />
                                    <Route path="/items" element={<ItemsListView />} />
                                    <Route path="/items/:name" element={<ItemDetailView />} />
                                    <Route path="/tournaments" element={
                                        <TournamentsView db={db} onOpenTeam={handleImportTeam} />
                                    } />
                                    <Route path="/best-teams" element={<BestTeamsView onOpenTeam={handleImportTeam} />} />
                                    <Route path="/tournaments/team/:id" element={
                                        <TournamentTeamView onImport={handleImportTeam} />
                                    } />
                                    <Route path="/meta" element={<MetaUsageView />} />
                                    <Route path="/meta/:idOrName" element={<PokemonUsageView />} />
                                    <Route path="/gyms" element={
                                        <GymsView showDetails={showDetails} onAddToTeam={handleAddPokemon} />
                                    } />
                                    <Route path="/damage-calculator" element={
                                        <DamageCalculatorView />
                                    } />
                                    <Route path="/speed-tiers" element={
                                        <SpeedTiersView generations={generations} />
                                    } />
                                    <Route path="/favorites" element={
                                        <FavoritesView
                                            pokemonProps={{
                                                allPokemons: pokedex.pokemons,
                                                favoritePokemons,
                                                onToggleFavoritePokemon: handleToggleFavoritePokemon,
                                                showDetails,
                                                colors,
                                                onAddToTeam: handleAddPokemon,
                                                isLoading: pokedex.isLoading,
                                            }}
                                            teamsProps={{
                                                teams: savedTeams,
                                                onEdit: handleEditTeam,
                                                onExport: handleExportSavedTeamToShowdown,
                                                onShare: handleShareSavedTeam,
                                                requestDelete: (id, name) => setDeleteConfirmation({ isOpen: true, teamId: id, teamName: name }),
                                                onToggleFavorite: handleToggleFavorite,
                                                onDuplicate: handleDuplicateSavedTeam,
                                                searchTerm: teamSearchTerm,
                                                setSearchTerm: setTeamSearchTerm,
                                                colors,
                                                activeTeamId,
                                                setActiveTeamId,
                                            }}
                                        />
                                    } />
                                    {/* One Quiz, two modes. The old PokéQuiz (/guesser) is its
                                        "categories" mode; PokéRoom left on 2026-10-17, and its
                                        links land on the Quiz rather than on a 404. */}
                                    <Route path="/quiz" element={
                                        <QuizView
                                            showDetails={showDetails}
                                            showToast={showToast}
                                        />
                                    } />
                                    <Route path="/guesser" element={<Navigate to="/quiz?tab=categories" replace />} />
                                    <Route path="/journeys" element={<JourneysView />} />
                                    <Route path="/pokeroom/*" element={<Navigate to="/quiz" replace />} />
                                    <Route path="/pokepuzzle" element={
                                        <PokePuzzleView />
                                    } />
                                    <Route path="/challenge" element={<ChampionChallengeView />} />
                                    {/* Saved Teams now lives as a tab inside /favorites. */}
                                    <Route path="/teams" element={<Navigate to="/favorites?tab=teams" replace />} />
                                    <Route path="/teams/:id" element={
                                        <TeamDetailView
                                            teams={savedTeams}
                                            onEdit={handleEditTeam}
                                            onShare={handleShareSavedTeam}
                                            onExport={handleExportSavedTeamToShowdown}
                                            requestDelete={(id, name) => setDeleteConfirmation({ isOpen: true, teamId: id, teamName: name })}
                                            onToggleFavorite={handleToggleFavorite}
                                            onDuplicate={handleDuplicateSavedTeam}
                                            activeTeamId={activeTeamId}
                                            setActiveTeamId={setActiveTeamId}
                                            colors={colors}
                                            fetchPokemonDetails={fetchPokemonDetails}
                                            showDetails={showDetails}
                                        />
                                    } />
                                    <Route path="/friends" element={<FriendsView />} />
                                    <Route path="/battles" element={<BattleListView />} />
                                    <Route path="/battles/:battleId" element={<BattleDetailView />} />
                                    <Route path="/profile" element={
                                        <ProfileView
                                            userEmail={userEmail}
                                            userId={userId}
                                            isAnonymous={isAnonymous}
                                            theme={theme}
                                            onChangeTheme={chooseTheme}
                                            language={language}
                                            onChangeLanguage={(lang) => {
                                                useLanguageStore.getState().setLanguage(lang);
                                                useAuthStore.getState().savePreferences({ language: lang });
                                            }}
                                            showTeraType={showTeraType}
                                            onChangeShowTeraType={(show) => {
                                                setShowTeraType(show);
                                                useAuthStore.getState().savePreferences({ showTeraType: show });
                                            }}
                                            searchShortcut={searchShortcut}
                                            onChangeSearchShortcut={(shortcut) => {
                                                setSearchShortcut(shortcut);
                                                useAuthStore.getState().savePreferences({ searchShortcut: useThemeStore.getState().searchShortcut });
                                            }}
                                            displayName={displayName}
                                            onChangeDisplayName={setDisplayName}
                                            greetingPokemonId={greetingPokemonId}
                                            greetingPokemonIsShiny={greetingPokemonIsShiny}
                                            onOpenPokemonSelector={() => setShowGreetingPokemonSelector(true)}
                                            trainerSprite={trainerSprite}
                                            onOpenTrainerSelector={() => setShowTrainerSpriteSelector(true)}
                                            avatarPreference={avatarPreference}
                                            onChangeAvatarPreference={setAvatarPreference}
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
                                                auth={auth}
                                                isAdmin={isAdmin}
                                                colors={colors}
                                                showToast={showToast}
                                            />
                                        } />
                                    )}
                                    <Route path="*" element={<NotFoundView colors={colors} navigate={navigate} theme={theme} onOpenSearch={() => setIsSearchOpen(true)} />} />
                                </Routes>
                            </Suspense>
                        </div>
                    </main>

                    {currentPage !== 'feed' && currentPage !== 'generationQuiz' && (
                        <footer className="app-shell__footer">
                            <div className="app-shell__footer-row">
                                <div className="app-shell__footer-credit">
                                    <span>
                                        {t('layout.developedBy')} <a href="https://github.com/ensinho" target="_blank" rel="noopener noreferrer" className="app-shell__footer-link app-shell__footer-link--inline">Enzo Esmeraldo</a>
                                    </span>
                                    <FooterFeedback db={db} userId={userId} userEmail={userEmail} displayName={displayName} showToast={showToast} />
                                    <button
                                        type="button"
                                        onClick={handleOpenPatchNotes}
                                        className="app-shell__footer-link app-shell__footer-version"
                                        title={t('patchNotes.openLabel')}
                                    >
                                        v{PATCH_NOTES_VERSION}
                                    </button>
                                </div>

                                <div className="app-shell__footer-links">
                                    {/* Text size left the footer on 2026-10-06: it lives in
                                        Profile, which guests now reach from the rail
                                        ("Perfil e preferências"), and in the account menu. */}
                                    <a href="https://github.com/ensinho/pokemonTeamBuilder" target="_blank" rel="noopener noreferrer" className="app-shell__footer-link"><GithubIcon /></a>
                                    <a href="https://www.linkedin.com/in/enzoesmeraldo/" target="_blank" rel="noopener noreferrer" className="app-shell__footer-link"><LinkedinIcon /></a>
                                </div>
                            </div>
                        </footer>
                    )}
                </div>

                {isMobile && !isMobileDetailsOpen && !isLandingOpen && (
                    <nav className={`app-shell__tabbar ${isDockCompact ? 'is-compact' : ''}`} aria-label={language === 'pt' ? 'Navegação principal' : 'Primary'}>
                        {(() => {
                            const tabActive = (key) => currentPage === key || (key === 'pokedex' && currentPage === 'pokemonDetail');
                            // "Mais" answers "where am I" for every page it leads to: with
                            // no tab lit on /gyms, the bar said nothing about location.
                            // Only for pages the sheet actually lists — it used to light up
                            // on /404 and on a signed-in /profile, which it does not contain.
                            const moreKeys = new Set([...moreSheetSections.flatMap((section) => section.items), ...moreSheetToolItems].map((item) => item.key));
                            if (isAnonymous) moreKeys.add('profile');
                            const moreActive = !mobileTabs.some((tab) => tabActive(tab.key)) && moreKeys.has(currentPage);
                            return [
                                ...mobileTabs.map((tab) => ({ ...tab, active: tabActive(tab.key) })),
                                { key: 'more', label: t('nav.more'), icon: <MenuIcon />, action: () => setIsSidebarOpen(true), active: moreActive },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => (tab.action ? tab.action() : navigate(tab.path))}
                                    className={`app-shell__tab ${tab.active ? 'is-active' : ''}`}
                                    aria-current={tab.active && !tab.action ? 'page' : undefined}
                                    aria-haspopup={tab.action ? 'dialog' : undefined}
                                    aria-label={tab.shortLabel && tab.shortLabel !== tab.label ? tab.label : undefined}
                                >
                                    <span className="app-shell__tab-icon" aria-hidden="true">{tab.icon}</span>
                                    <span className="app-shell__tab-label">{tab.shortLabel || tab.label}</span>
                                </button>
                            ));
                        })()}
                    </nav>
                )}

                {isMobile && isSidebarOpen && !isMobileDetailsOpen && (
                    <Suspense fallback={null}>
                    <MobileMoreSheet
                        onClose={() => setIsSidebarOpen(false)}
                        sections={moreSheetSections}
                        currentPage={currentPage}
                        onIntent={prefetchRoute}
                        onNavigate={(path) => {
                            setIsSidebarOpen(false);
                            navigate(path);
                        }}
                        header={
                            <ul className="more-sheet__list more-sheet__account">
                                <li>
                                    {isAnonymous ? (
                                        // Close the sheet first: the auth dialog and this sheet
                                        // share --z-modal, and a portal opened earlier paints
                                        // under one opened later (docs/wounds.md, 2026-09-09).
                                        <GuestAccountCard variant="sheet" onBeforeOpen={() => setIsSidebarOpen(false)} />
                                    ) : (
                                        <SidebarAccountMenu
                                            isMobile
                                            avatar={<TrainerAvatar pokemonId={ownAvatar.pokemonId} isShiny={ownAvatar.isShiny} trainerSprite={ownAvatar.trainerSprite} color={colors.primary} />}
                                            displayName={displayName || userEmail?.split('@')[0] || 'Trainer'}
                                            email={userEmail || ''}
                                            currentTheme={theme}
                                            themes={THEME_META}
                                            onOpenProfile={() => {
                                                setIsSidebarOpen(false);
                                                navigate('/profile');
                                            }}
                                            onOpenPatchNotes={handleOpenPatchNotes}
                                            onChangeTheme={chooseTheme}
                                            onSignOut={handleSignOut}
                                        />
                                    )}
                                </li>
                                {isAnonymous && (
                                    <li>
                                        <button
                                            type="button"
                                            onClick={() => { setIsSidebarOpen(false); navigate('/profile'); }}
                                            className="app-shell__nav-link"
                                            aria-current={currentPage === 'profile' ? 'page' : undefined}
                                        >
                                            <span className="app-shell__nav-icon" aria-hidden="true"><SettingsGlyph /></span>
                                            <span className="app-shell__nav-text">{t('nav.profileAndSettings')}</span>
                                        </button>
                                    </li>
                                )}
                            </ul>
                        }
                    >
                        {moreSheetToolItems.length > 0 && (
                            <ul className="more-sheet__list">
                                {moreSheetToolItems.map((item) => (
                                    <li key={item.key}>
                                        <button
                                            type="button"
                                            onClick={() => { setIsSidebarOpen(false); navigate(item.path); }}
                                            className={`app-shell__nav-link ${currentPage === item.key ? 'is-active' : ''}`}
                                            aria-current={currentPage === item.key ? 'page' : undefined}
                                        >
                                            <span className="app-shell__nav-icon" aria-hidden="true">{item.icon}</span>
                                            <span className="app-shell__nav-text">{item.label}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {(isInstallable || isIOS) && (
                            <button
                                type="button"
                                onClick={isIOS
                                    ? () => showToast(t('layout.developedBy').startsWith('Desenvolvido') ? 'Botão de Compartilhar -> "Adicionar à Tela Inicial"' : 'Share button -> "Add to Home Screen"', 'info')
                                    : handleInstall
                                }
                                className="btn btn-primary btn-lg btn-block"
                            >
                                <DownloadIcon className="w-4 h-4 shrink-0" />
                                <span>{isIOS ? t('nav.addToHome') : t('nav.installApp')}</span>
                            </button>
                        )}
                        {/* The site footer is hidden below 1024px; its contents live
                            here, as one more section of rows (see DrawerAboutSection). */}
                        <ul className="more-sheet__list">
                            <DrawerAboutSection
                                onOpenPatchNotes={() => {
                                    setIsSidebarOpen(false);
                                    handleOpenPatchNotes();
                                }}
                                db={db}
                                userId={userId}
                                userEmail={userEmail}
                                displayName={displayName}
                                showToast={showToast}
                            />
                        </ul>
                    </MobileMoreSheet>
                    </Suspense>
                )}
            </div>
        </div>
    );
}
