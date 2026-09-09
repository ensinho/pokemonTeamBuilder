import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { Routes, Route, useNavigate, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import { useToastStore } from '../store/useToastStore';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore, resolveAvatar } from '../store/useAuthStore';
import { useFriends } from '../hooks/useFriends';
import { useBattles } from '../hooks/useBattles';
import { useBattleNotifications } from '../hooks/useBattleNotifications';
import { useActiveTeam } from '../hooks/useActiveTeam';
import { useActiveTeamStore } from '../store/useActiveTeamStore';
import { useFirestoreTeams } from '../hooks/useFirestoreTeams';
import { useReferenceStore } from '../store/useReferenceStore';
import { useNotifications } from '../hooks/useNotifications';

import { PATCH_NOTES_VERSION, THEME_META } from '../constants/theme';
import { pageGuideTips, PageGuide } from './PageGuide';
import { FooterFeedback } from './FooterFeedback';
import { SidebarAccountMenu } from './SidebarAccountMenu';
import { ShellNavGroup } from './ShellNavGroup';
import ToastStack from './ToastStack';
import { TextSizeControl } from './TextSizeControl';
import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { trainerSpriteUrl } from '../hooks/useTrainerSprites';
import { GengarPresence } from './GengarPresence';
import { getStaticPokemonDetail } from '../services/pokemonDataCache';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { appId } from '../constants/firebase';
import { BREAKPOINTS } from '../constants/breakpoints';
import { setNavigator, setSignInPrompt } from '../utils/navigation';
import { usePokedex } from '../hooks/usePokedex';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useEdgeSwipe } from '../hooks/useEdgeSwipe';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguageStore } from '../store/useLanguageStore';
import { useRegisterSW } from 'virtual:pwa-register/react';

import {
    AuthModal,
    ConfirmDialog,
    GreetingPokemonSelectorModal,
    TrainerSpriteSelectorModal,
    PatchNotesModal,
    ShareSnippetModal,
    SyncPromptModal,
    TeamPokemonEditorModal,
    VersionUpdateModal,
    BadgeUnlockModal
} from './modals';

import {
    GithubIcon, LinkedinIcon, CloseIcon, CollapseLeftIcon, CollapseRightIcon,
    DownloadIcon, MenuIcon, PokeballIcon, StarsIcon, SwordsIcon,
    HomeIcon, SunIcon, MoonIcon, AccountIcon, ChartColumnIcon, SuccessToastIcon,
    MapPinIcon, MessageIcon,
    ScrollIcon, BagIcon, TrophyIcon, CalculatorIcon, GaugeIcon, SparklesIcon
} from './icons';
import { BoxIcon, Puzzle, Medal, TrendingUp, Users } from 'lucide-react';

// HomeView stays eager: it's the landing route, so lazy-loading it would only add a
// fallback flash on first paint. Every other view is code-split (React.lazy) to shrink
// the initial bundle — the heavy ones (Pokedex, PokePuzzle) dominate it.
import { HomeView } from './views';

const AdminDashboardView = lazy(() => import('./views/AdminDashboardView').then((m) => ({ default: m.AdminDashboardView })));
const FavoritesView = lazy(() => import('./views/FavoritesView').then((m) => ({ default: m.FavoritesView })));
const GenerationQuizView = lazy(() => import('./views/GenerationQuizView').then((m) => ({ default: m.GenerationQuizView })));
const CategoryGuesserView = lazy(() => import('./views/CategoryGuesserView').then((m) => ({ default: m.CategoryGuesserView })));
const SecretRoomGuesserView = lazy(() => import('./views/SecretRoomGuesserView').then((m) => ({ default: m.SecretRoomGuesserView })));
const PokedexView = lazy(() => import('./views/PokedexView').then((m) => ({ default: m.PokedexView })));
const ProfileView = lazy(() => import('./views/ProfileView').then((m) => ({ default: m.ProfileView })));
const FriendsView = lazy(() => import('./views/FriendsView').then((m) => ({ default: m.FriendsView })));
const BattleListView = lazy(() => import('./views/battle/BattleListView').then((m) => ({ default: m.BattleListView })));
const BattleDetailView = lazy(() => import('./views/battle/BattleDetailView').then((m) => ({ default: m.BattleDetailView })));
const TeamBuilderView = lazy(() => import('./views/TeamBuilderView').then((m) => ({ default: m.TeamBuilderView })));
const FeedView = lazy(() => import('./views/FeedView').then((m) => ({ default: m.FeedView })));
const PokePuzzleView = lazy(() => import('./views/PokePuzzleView')); // default export
const MovesListView = lazy(() => import('./views/MovesListView').then((m) => ({ default: m.MovesListView })));
const MoveDetailView = lazy(() => import('./views/MoveDetailView').then((m) => ({ default: m.MoveDetailView })));
const AbilitiesListView = lazy(() => import('./views/AbilitiesListView').then((m) => ({ default: m.AbilitiesListView })));
const AbilityDetailView = lazy(() => import('./views/AbilityDetailView').then((m) => ({ default: m.AbilityDetailView })));
const ItemsListView = lazy(() => import('./views/ItemsListView').then((m) => ({ default: m.ItemsListView })));
const ItemDetailView = lazy(() => import('./views/ItemDetailView').then((m) => ({ default: m.ItemDetailView })));
const PokemonDetailView = lazy(() => import('./views/PokemonDetailView').then((m) => ({ default: m.PokemonDetailView })));
const DamageCalculatorView = lazy(() => import('./views/DamageCalculatorView').then((m) => ({ default: m.DamageCalculatorView })));
const SpeedTiersView = lazy(() => import('./views/SpeedTiersView').then((m) => ({ default: m.SpeedTiersView })));
const TournamentsView = lazy(() => import('./views/TournamentsView').then((m) => ({ default: m.TournamentsView })));
const TournamentTeamView = lazy(() => import('./views/TournamentTeamView').then((m) => ({ default: m.TournamentTeamView })));
const TeamDetailView = lazy(() => import('./views/TeamDetailView').then((m) => ({ default: m.TeamDetailView })));
const MetaUsageView = lazy(() => import('./views/MetaUsageView').then((m) => ({ default: m.MetaUsageView })));
const PokemonUsageView = lazy(() => import('./views/PokemonUsageView').then((m) => ({ default: m.PokemonUsageView })));
const GymsView = lazy(() => import('./views/GymsView').then((m) => ({ default: m.GymsView })));
const NotFoundView = lazy(() => import('./views/NotFoundView').then((m) => ({ default: m.NotFoundView })));

import '../styles/app-shell.css';
import '../styles/toast.css';

const RouteFallback = () => (
    <div
        className="flex items-center justify-center w-full"
        style={{ minHeight: '60vh' }}
    >
        <GengarPresence variant="loading" size={96} />
    </div>
);

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

const ShellNavButton = ({ active, collapsed, label, onClick, icon, badge = 0 }) => {
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
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
            aria-current={active ? 'page' : undefined}
            className={`app-shell__nav-link ${active ? 'is-active' : ''} ${collapsed ? 'is-collapsed' : ''}`}
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
// StrictMode runs it twice in development while it mutates localStorage and then
// reloads the page.
//
// `versionBumpHandled`: the first run detects the bump, flags the notes, clears
// the caches and schedules a reload. The second run then re-reads the version it
// just wrote, sees a match, takes the "show" branch and consumes the flag — on a
// page that is about to be thrown away, so the reloaded page had nothing left and
// the notes never appeared in dev (production, mounting once, was unaffected).
//
// `patchNotesOwed`: same double mount on the reloaded page, where the first run
// legitimately consumes the flag; this keeps the second run from rendering nothing.
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

// Which nav section is open. Exactly one, or none — see the accordion note on
// `openNavGroup` below. Stores the open key rather than the folded ones, because
// "at most one" is the invariant and a single string cannot express a broken
// state the way a set of five could. Keyed by a stable section key, never by the
// translated title.
const SIDEBAR_GROUP_KEY = 'ptb-sidebar-open-group';

const readOpenGroup = () => {
    try {
        const raw = window.localStorage.getItem(SIDEBAR_GROUP_KEY);
        return raw || null;
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
        if (path.includes('/feed')) return 'feed';
        if (path.includes('/pokedex')) return 'pokedex';
        if (path.includes('/pokemon/')) return 'pokemonDetail';
        if (path.includes('/pokepuzzle')) return 'pokepuzzle';
        if (path.includes('/moves')) return 'moves';
        if (path.includes('/abilities')) return 'abilities';
        if (path.includes('/items')) return 'items';
        if (path.includes('/gyms')) return 'gyms';
        if (path.includes('/tournaments')) return 'tournaments';
        if (path.includes('/meta')) return 'meta';
        if (path.includes('/damage-calculator')) return 'damageCalc';
        if (path.includes('/speed-tiers')) return 'speedTiers';
        if (path.includes('/teams')) return 'allTeams';
        if (path.includes('/guesser')) return 'categoryGuesser';
        if (path.includes('/quiz')) return 'generationQuiz';
        if (path.includes('/pokeroom')) return 'secretRoom';
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
    const dismissToast = useToastStore((state) => state.dismissToast);
    const { theme, colors, toggleTheme, changeTheme, homeWallpaperId, setHomeWallpaperPreference, showTeraType, setShowTeraType } = useThemeStore();
    const {
        userId, userEmail, isAnonymous, isAdmin, displayName, setDisplayName,
        greetingPokemonId, greetingPokemonIsShiny, setGreetingPokemon, streak,
        trainerSprite, setTrainerSprite, avatarPreference, setAvatarPreference,
        handleResetSyncPrompt, showSyncPrompt, handleDismissSyncPrompt,
        handleSignIn, handleSignUp, handleSignOut, isAuthReady
    } = useAuthStore();

    const {
        currentTeam, teamName, setTeamName, editingTeamId, handleRemoveFromTeam,
        handleReorderTeam, handleSaveTeam, handleClearTeam, handleExportToShowdown,
        handleShareTeam, editingTeamMember, setEditingTeamMember, shareModal,
        closeShareModal, handleUpdateTeamMember, suggestedPokemonIds, teamAnalysis,
        setCurrentTeam, shareTeamByData, handleAddPokemon, setEditingTeamId,
        handleRandomizeTeam, isRandomizing
    } = useActiveTeam();

    const {
        favoritePokemons, handleToggleFavoritePokemon, deleteConfirmation,
        setDeleteConfirmation, handleDeleteTeam, handleToggleFavorite, handleDuplicateTeam,
        savedTeams, activeTeamId, setActiveTeamId
    } = useFirestoreTeams();

    const activeTeam = useMemo(() => {
        if (!savedTeams || savedTeams.length === 0) return null;
        return savedTeams.find(t => t.id === activeTeamId) || savedTeams[0];
    }, [savedTeams, activeTeamId]);

    const { generations, items, natures, games } = useReferenceStore();

    // Pokedex logic hook
    const pokedex = usePokedex();

    // PWA install prompt
    const { isInstallable, isIOS, handleInstall } = usePWAInstall();

    // UI Local States
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
    const [openNavGroup, setOpenNavGroup] = useState(() =>
        (typeof window === 'undefined' ? null : readOpenGroup()));
    const [authModal, setAuthModal] = useState({ open: false, mode: 'signIn' });

    // Lets a store-raised toast open the auth modal. Every "you need an account
    // for this" message used to be a dead end — it named the requirement and
    // left the user to go find the button.
    useEffect(() => {
        setSignInPrompt((mode = 'signIn') => setAuthModal({ open: true, mode }));
    }, []);
    const [showPatchNotes, setShowPatchNotes] = useState(false);
    const [showGreetingPokemonSelector, setShowGreetingPokemonSelector] = useState(false);
    const [showTrainerSpriteSelector, setShowTrainerSpriteSelector] = useState(false);
    const [showVersionModal, setShowVersionModal] = useState(false);

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

    // Open one nav section, closing whichever was open. An accordion, not a set
    // of independent folds: with five sections and twenty links, "each folds on
    // its own" means the rail's height is whatever the user last left it at, and
    // in practice that was everything open and a scrollbar. Exactly one open
    // section keeps the rail a fixed, short shape on every screen.
    //
    // Persisted immediately — the sidebar is the one piece of chrome on every
    // route, so re-folding it each visit would be a tax.
    const toggleNavGroup = useCallback((groupKey) => {
        setOpenNavGroup((previous) => {
            const next = previous === groupKey ? null : groupKey;
            try {
                if (next) window.localStorage.setItem(SIDEBAR_GROUP_KEY, next);
                else window.localStorage.removeItem(SIDEBAR_GROUP_KEY);
            } catch { /* preference is best-effort */ }
            return next;
        });
    }, []);

    // Explicit collapse/expand from the sidebar controls. Persists the choice so
    // it overrides the width-based auto behavior from then on.
    const setSidebarCollapsedManual = useCallback((val) => {
        setIsSidebarCollapsed(val);
        try { window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, val ? '1' : '0'); }
        catch { /* ignore */ }
    }, []);

    // PWA SW registration & update prompt
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW();

    useEffect(() => {
        if (needRefresh) {
            setShowVersionModal(true);
        }
    }, [needRefresh]);

    const handleVersionRefresh = useCallback(() => {
        if (needRefresh) {
            updateServiceWorker(true);
        } else {
            window.location.reload();
        }
        setShowVersionModal(false);
    }, [needRefresh, updateServiceWorker]);

    // Periodic and focus check for new index.html / hashed assets
    useEffect(() => {
        let isCancelled = false;

        const checkNewVersion = async () => {
            try {
                const response = await fetch(`${window.location.origin}${import.meta.env.BASE_URL || '/'}index.html?t=${Date.now()}`, { cache: 'no-store' });
                if (!response.ok) return;
                const html = await response.text();

                // Find all script tags in the fetched HTML
                const scriptRegex = /<script\b[^>]*src="([^"]+)"/g;
                let match;
                const fetchedScripts = [];
                while ((match = scriptRegex.exec(html)) !== null) {
                    fetchedScripts.push(match[1]);
                }

                // Compare with scripts in current document
                const currentScripts = Array.from(document.querySelectorAll('script')).map(s => s.getAttribute('src')).filter(Boolean);

                // Check if any fetched asset is new
                const isNewVersion = fetchedScripts.some(src => {
                    if (src.includes('/assets/') && src.endsWith('.js')) {
                        return !currentScripts.includes(src);
                    }
                    return false;
                });

                if (isNewVersion && !isCancelled) {
                    setShowVersionModal(true);
                }
            } catch (e) {
                console.error('Error checking version:', e);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkNewVersion();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        const intervalId = setInterval(checkNewVersion, 5 * 60 * 1000);
        const initialTimeout = setTimeout(checkNewVersion, 10 * 1000);

        return () => {
            isCancelled = true;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(intervalId);
            clearTimeout(initialTimeout);
        };
    }, []);

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

    // Ensure sidebar is always expanded when on mobile
    useEffect(() => {
        if (isMobile) setIsSidebarCollapsed(false);
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
    const isMobileDetailsOpen = useMemo(() => {
        return isMobile && currentPage === 'pokedex' && searchParams.has('pokemon');
    }, [isMobile, currentPage, searchParams]);

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

    // Mobile gesture: pull from the left edge to open the sidebar, swipe left to close.
    useEdgeSwipe({
        enabled: isMobile && !isMobileDetailsOpen,
        isOpen: isSidebarOpen,
        onOpen: () => setIsSidebarOpen(true),
        onClose: () => setIsSidebarOpen(false),
    });


    // Auth Splash Loader
    const [showInitialAuthSplash, setShowInitialAuthSplash] = useState(true);
    const [authSplashProgress, setAuthSplashProgress] = useState(0);
    const [authSplashMessage, setAuthSplashMessage] = useState(() => t('splash.msg1'));
    const initialBootTimeRef = useRef(Date.now());

    const splashMessages = useMemo(() => [
        t('splash.msg1'),
        t('splash.msg2'),
        t('splash.msg3'),
        t('splash.msg4'),
        t('splash.msg5'),
    ], [language, t]);

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

    // Check patch notes version & clear caches + force a single reload on version bump
    useEffect(() => {
        const seenVersion = localStorage.getItem('patchNotesVersion');
        const showAfterReload = localStorage.getItem('showPatchNotesAfterReload') === '1';

        if (versionBumpHandled) return;

        if (seenVersion && seenVersion !== PATCH_NOTES_VERSION) {
            // Version has been bumped!
            versionBumpHandled = true;

            // Set flag to show patch notes after the reload
            localStorage.setItem('showPatchNotesAfterReload', '1');

            // 1. Unregister all active service workers to clear PWA cache
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (const registration of registrations) {
                        registration.unregister();
                    }
                }).catch(() => { });
            }

            // 2. Clear session storage completely
            try { sessionStorage.clear(); } catch (e) { }

            // 3. Clear non-essential localStorage keys
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
                    'ptb-sidebar-collapsed-groups',
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
            } catch (e) { }

            // 4. Update version in localStorage to match the new one BEFORE reloading
            localStorage.setItem('patchNotesVersion', PATCH_NOTES_VERSION);

            // 5. Force a single clean reload of the page
            setTimeout(() => {
                window.location.reload();
            }, 100);
        } else {
            // Same version, or first load. Show patch notes if flagged from a recent reload
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
            'categoryGuesser': { title: t('nav.pokequiz'), subtitle: language === 'pt' ? 'Adivinhe Pokémon por características e atributos oficiais' : 'Guess Pokémon by official traits & characteristics' },
            'generationQuiz': { title: t('quiz.title'), subtitle: t('quiz.subtitle') },
            'pokepuzzle': { title: t('pokepuzzle.title'), subtitle: t('pokepuzzle.subtitle') },
            'favorites': { title: t('nav.favorites'), subtitle: language === 'pt' ? 'Gerencie seus times salvos e Pokémon favoritos' : 'Manage your saved teams and favorite Pokémon' },
            'admin': { title: t('nav.admin'), subtitle: t('layout.adminSubtitle') },
            'profile': { title: t('profile.title'), subtitle: t('profile.trainerProfile') },
            'pokemonDetail': { title: t('nav.pokemonList'), subtitle: t('home.shortcutPokedexDesc') },
            'moves': { title: t('nav.moves'), subtitle: t('db.movesSubtitle') },
            'abilities': { title: t('nav.abilities'), subtitle: t('db.abilitiesSubtitle') },
            'items': { title: t('nav.items'), subtitle: t('db.itemsSubtitle') },
            'tournaments': { title: t('nav.tournaments'), subtitle: t('tools.tournamentsSubtitle') },
            'meta': { title: language === 'pt' ? 'Meta & Uso' : 'Meta & Usage', subtitle: language === 'pt' ? 'Uso competitivo, cores e o que os Pokémon estão rodando' : 'Competitive usage, cores & what Pokémon are running' },
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
            'secretRoom': {
                title: 'PokéRoom',
                subtitle: language === 'pt'
                    ? 'Salas privadas para adivinhar Pokémon com amigos'
                    : 'Private rooms to guess Pokémon with friends',
            },
            'notFound': { title: '404', subtitle: '' },
        };
        // Falling back to the Home entry made a missing key look like a working
        // header — /gyms and /pokeroom both shipped showing "Início" for exactly
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

    // The four destinations that carry the app. They sit unlabelled at the top of
    // the rail and never fold, so the things people actually came for are always
    // one click away and always in the same place — the rail's shape does not
    // change as you move around it. Everything else lives in the folding sections
    // below and is reached in two.
    const primaryNavItems = useMemo(() => ([
        { key: 'home', label: t('nav.home'), path: '/', icon: <HomeIcon /> },
        { key: 'builder', label: t('nav.builder'), path: '/builder', icon: <SwordsIcon /> },
        { key: 'pokedex', label: t('nav.pokemonList'), path: '/pokedex', icon: <PokeballIcon /> },
        { key: 'feed', label: t('nav.feed'), path: '/feed', icon: <MessageIcon /> },
    ]), [t]);

    // Sections hold the long tail only — a link promoted to `primaryNavItems`
    // above is deliberately absent here. Listing it twice would put the same
    // destination in two places in one 200px column, which reads as a bug.
    const navigationGroups = useMemo(() => {
        const groups = [
            {
                key: 'teamBuilding',
                title: t('nav.teamBuilding'),
                items: [
                    { key: 'meta', label: language === 'pt' ? 'Meta & Uso' : 'Meta & Usage', path: '/meta', icon: <TrendingUp className="w-5 h-5 shrink-0" /> },
                    { key: 'tournaments', label: t('nav.tournaments'), path: '/tournaments', icon: <TrophyIcon /> },
                    { key: 'damageCalc', label: t('nav.damageCalc'), path: '/damage-calculator', icon: <CalculatorIcon /> },
                    { key: 'speedTiers', label: t('nav.speedTiers'), path: '/speed-tiers', icon: <GaugeIcon /> },
                ]
            },
            {
                key: 'database',
                title: t('nav.database'),
                items: [
                    { key: 'favorites', label: t('nav.favorites'), path: '/favorites', icon: <BoxIcon className="w-5 h-5 shrink-0" /> },
                    { key: 'gyms', label: language === 'pt' ? 'Ginásios' : 'Gyms', path: '/gyms', icon: <Medal className="w-5 h-5 shrink-0" /> },
                    { key: 'moves', label: t('nav.moves'), path: '/moves', icon: <ScrollIcon /> },
                    { key: 'abilities', label: t('nav.abilities'), path: '/abilities', icon: <SparklesIcon className="w-5 h-5 shrink-0" /> },
                    { key: 'items', label: t('nav.items'), path: '/items', icon: <BagIcon /> },
                ]
            },
            {
                key: 'guessing',
                title: t('nav.guessing'),
                items: [
                    { key: 'pokeroom', label: 'PokéRoom', path: '/pokeroom', icon: <Users className="w-5 h-5 shrink-0" /> },
                    { key: 'categoryGuesser', label: t('nav.pokequiz'), path: '/guesser', icon: <SparklesIcon className="w-5 h-5 shrink-0" /> },
                    { key: 'pokepuzzle', label: t('nav.pokepuzzle'), path: '/pokepuzzle', icon: <Puzzle className="w-5 h-5 shrink-0" /> },
                    { key: 'generationQuiz', label: t('nav.quiz'), path: '/quiz', icon: <SuccessToastIcon /> },
                ]
            },
            {
                key: 'dashboard',
                title: t('nav.dashboard'),
                items: [
                    { key: 'friends', label: t('nav.friends'), path: '/friends', icon: <AccountIcon className="w-5 h-5 shrink-0" />, badge: pendingFriendRequests },
                    { key: 'battles', label: t('nav.battles'), path: '/battles', icon: <SwordsIcon className="w-5 h-5 shrink-0" />, badge: battlesAwaitingMe },
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

    // The open section follows the route. Land on a page that lives inside a
    // section and that section opens, so "where am I" is answered by the rail
    // itself rather than by a dot on a folded header. Navigating to one of the
    // pinned primary links leaves the sections as they are — those four are not
    // in any section, so there is nothing to reveal and snapping the rail shut
    // on every trip Home would just make it flicker.
    useEffect(() => {
        const activeGroup = navigationGroups.find((g) =>
            g.items.some((item) => currentPage === item.key));
        if (!activeGroup) return;
        setOpenNavGroup(activeGroup.key);
    }, [navigationGroups, currentPage]);


    // Available Pokemons & Recent Teams computations
    const availablePokemons = useMemo(() => {
        const teamIds = new Set(currentTeam.map(p => p.id));
        const available = pokedex.pokemons.filter(p => !teamIds.has(p.id));

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
            showToast(t('layout.loadDetailsError', { id: pokemonId }), "error");
            return null;
        }
    }, [pokemonDetailsCache, showToast]);

    // Load shared team via URL search params (?team=ID)
    const fetchAndSetSharedTeam = useCallback(async (teamId) => {
        if (!db || sharedTeamLoaded) return;
        setSharedTeamLoaded(true);
        // Held open until the fetch settles, then replaced by its outcome — a
        // stale "Loading…" sitting under "Loaded!" is two toasts saying one thing.
        const loadingId = showToast(t('layout.loadingSharedTeam'), 'info', { sticky: true, closable: false });
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
                        teraType: detail.types?.[0] || 'normal',
                        isShiny: false,
                        ability: detail.abilities?.[0]?.name || 'unknown',
                        moves: [],
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
                dismissToast(loadingId);
                showToast(t('layout.loadedSharedTeam', { name: teamData.name }), 'success');

                navigate('/builder');
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('team');
                    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
                } catch { /* ignore history failures */ }
            } else {
                dismissToast(loadingId);
                showToast(t('layout.sharedTeamNotFound'), 'error');
            }
        } catch (error) {
            dismissToast(loadingId);
            showToast(t('layout.failedLoadSharedTeam'), 'error');
        }
    }, [showToast, dismissToast, sharedTeamLoaded, navigate, fetchPokemonDetails, setCurrentTeam, setTeamName]);

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
                instanceId: savedPokemonData.instanceId,
                customization: { ...defaultCustomization, ...savedPokemonData.customization }
            };
        }).filter(Boolean);

        setCurrentTeam(customizedTeam);
        setTeamName(team.name);
        setEditingTeamId(team.id);
        navigate('/builder');
        setIsSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [fetchPokemonDetails, showToast, navigate, setCurrentTeam, setTeamName, setEditingTeamId]);

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

    const handleExportSavedTeamToShowdown = useCallback(async (team) => {
        const teamMembers = team?.pokemons || [];
        if (teamMembers.length === 0) return showToast(t('layout.emptySavedTeamWarning'), 'warning');
        const exportText = useActiveTeamStore.getState().buildShowdownExportText(teamMembers);
        
        const teamNameText = team?.name ? ` "${team.name}"` : '';
        const msg = language === 'pt'
            ? `Time${teamNameText} copiado! Redirecionando para o Pokémon Showdown em 2 segundos...`
            : `Team${teamNameText} copied! Redirecting to Pokémon Showdown in 2 seconds...`;
        showToast(msg, 'success');

        await useActiveTeamStore.getState().copyTextToClipboard(exportText, null);

        // Redirect after a 2 second delay so user sees the toast on the page
        setTimeout(() => {
            window.open('https://play.pokemonshowdown.com/teambuilder', '_blank');
        }, 2000);
    }, [showToast, t, language]);

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
                                backgroundColor: colors.primary,
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
            {showPatchNotes && (
                <PatchNotesModal
                    onClose={handleClosePatchNotes}
                    colors={colors}
                    isInstallable={isInstallable}
                    isIOS={isIOS}
                    onInstall={handleInstall}
                />
            )}
            {showVersionModal && (
                <VersionUpdateModal
                    onRefresh={handleVersionRefresh}
                    onDismiss={() => setShowVersionModal(false)}
                />
            )}
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
            {showTrainerSpriteSelector && (
                <TrainerSpriteSelectorModal
                    onClose={() => setShowTrainerSpriteSelector(false)}
                    onSelect={(spriteId) => {
                        setTrainerSprite(spriteId);
                        setShowTrainerSpriteSelector(false);
                    }}
                    currentSpriteId={trainerSprite}
                    colors={colors}
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

            <BadgeUnlockModal />

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

            <ToastStack />

            {/* Sidebar Shell Layout */}
            <div className="app-shell">
                {isSidebarOpen && (
                    <div
                        className="app-shell__overlay lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                        role="presentation"
                        aria-label={t('layout.closeSidebar')}
                    />
                )}
                {!isMobileDetailsOpen && (
                    <aside className={`app-shell__sidebar ${isRailCollapsed ? 'is-collapsed' : ''} ${isSidebarOpen ? 'is-open' : ''}`}>
                        <div className="app-shell__sidebar-inner">
                            {/* Top: Gengar Logo + Title */}
                            <div className={`app-shell__brand ${isRailCollapsed ? 'is-collapsed' : ''}`}>
                                <div className="app-shell__brand-main">
                                    <img
                                        src={import.meta.env.BASE_URL + 'LogoCuteGengarRounded.png'}
                                        alt="Pokémon Team Builder Logo"
                                        className="app-shell__brand-logo cursor-pointer"
                                        onClick={() => navigate('/')}
                                        title={t('layout.goHome')}
                                    />
                                    <div className={`app-shell__brand-copy ${isRailCollapsed ? 'is-hidden' : ''}`}>
                                        {/* One wordmark, sentence case. It was a 10px
                                            all-caps "POKÉMON" eyebrow stacked over
                                            "Team Builder" — two type sizes and a caps
                                            treatment to say one name. */}
                                        <h2 className="app-shell__brand-title">Pokémon Team Builder</h2>
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
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    type="button"
                                    aria-label="Close sidebar"
                                    className="app-shell__icon-button lg:hidden"
                                >
                                    <CloseIcon />
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
                                        <ShellNavGroup
                                            key={group.key}
                                            title={group.title}
                                            railCollapsed={isRailCollapsed}
                                            isOpen={openNavGroup === group.key}
                                            hasActiveItem={group.items.some((item) => currentPage === item.key)}
                                            onToggle={() => toggleNavGroup(group.key)}
                                            panelId={`app-shell-nav-${group.key}`}
                                        >
                                            {group.items.map((item) => (
                                                <li key={item.key}>
                                                    <ShellNavButton
                                                        active={currentPage === item.key}
                                                        collapsed={isRailCollapsed}
                                                        label={item.label}
                                                        icon={item.icon}
                                                        badge={item.badge || 0}
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
                                {/* Install App — pinned at bottom, mobile only */}
                                {(isInstallable || isIOS) && (
                                    <div className="px-3 lg:hidden">
                                        <button
                                            type="button"
                                            onClick={isIOS
                                                ? () => showToast(t('layout.developedBy').startsWith('Desenvolvido') ? 'Botão de Compartilhar -> "Adicionar à Tela Inicial"' : 'Share button -> "Add to Home Screen"', 'info')
                                                : handleInstall
                                            }
                                            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-bold text-white transition-opacity active:opacity-75"
                                            style={{ backgroundColor: colors.primary }}
                                        >
                                            <DownloadIcon className="w-4 h-4 shrink-0" />
                                            <span>{isIOS ? t('nav.addToHome') : t('nav.installApp')}</span>
                                        </button>
                                    </div>
                                )}
                                <div className={`app-shell__account ${isRailCollapsed ? 'is-collapsed' : ''}`}>
                                    {isAnonymous ? (
                                        <button
                                            type="button"
                                            onClick={() => setAuthModal({ open: true, mode: 'signIn' })}
                                            aria-label={t('nav.signIn')}
                                            title={t('nav.signIn')}
                                            className={`app-shell__nav-link ${isRailCollapsed ? 'is-collapsed' : ''}`}
                                        >
                                            <span className="app-shell__nav-icon" aria-hidden="true"><AccountIcon /></span>
                                            <span className={`app-shell__nav-text ${isRailCollapsed ? 'is-hidden' : ''}`}>{t('nav.signIn')}</span>
                                        </button>
                                    ) : (
                                        <SidebarAccountMenu
                                            collapsed={isRailCollapsed}
                                            isMobile={isMobile}
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
                                            onChangeTheme={changeTheme}
                                            onSignOut={handleSignOut}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </aside>
                )}

                <div className="app-shell__content custom-scrollbar">
                    {!isMobileDetailsOpen && (
                        <header className="app-shell__header">
                            <div className="app-shell__header-main">
                                <button
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    type="button"
                                    aria-label={isSidebarOpen ? t('layout.closeSidebar') : t('layout.expandSidebar')}
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
                                {/* Desktop keeps the quick theme toggle; guests keep it on mobile too. */}
                                {(!isMobile || isAnonymous) && (
                                    <button onClick={toggleTheme} type="button" aria-label={t('layout.switchTheme', { theme: theme === 'dark' ? (t('layout.developedBy').startsWith('Desenvolvido') ? 'claro' : 'light') : (t('layout.developedBy').startsWith('Desenvolvido') ? 'escuro' : 'dark') })} className="app-shell__icon-button">
                                        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                                    </button>
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
                                        onChangeTheme={changeTheme}
                                        onSignOut={handleSignOut}
                                    />
                                )}
                            </div>
                        </header>
                    )}

                    <main className={`app-shell__body ${isMobileDetailsOpen ? 'is-mobile-detail' : ''}`}>
                        <div className={pageFrameClassName}>
                            <Suspense fallback={<RouteFallback />}>
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
                                            activeTeamId={activeTeamId}
                                            setActiveTeamId={setActiveTeamId}
                                        />
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
                                    <Route path="/items" element={<ItemsListView />} />
                                    <Route path="/items/:name" element={<ItemDetailView />} />
                                    <Route path="/tournaments" element={
                                        <TournamentsView db={db} onOpenTeam={handleEditTeam} />
                                    } />
                                    <Route path="/tournaments/team/:id" element={
                                        <TournamentTeamView onImport={handleEditTeam} colors={colors} />
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
                                     <Route path="/pokeroom" element={<SecretRoomGuesserView />} />
                                     <Route path="/pokeroom/:roomId" element={<SecretRoomGuesserView />} />
                                     <Route path="/guesser" element={
                                         <CategoryGuesserView
                                             showDetails={showDetails}
                                             showToast={showToast}
                                         />
                                     } />
                                     <Route path="/quiz" element={
                                        <GenerationQuizView
                                            showDetails={showDetails}
                                            showToast={showToast}
                                        />
                                    } />
                                    <Route path="/pokepuzzle" element={
                                        <PokePuzzleView />
                                    } />
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
                                            onChangeTheme={changeTheme}
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
                                    <Route path="*" element={<NotFoundView colors={colors} navigate={navigate} theme={theme} />} />
                                </Routes>
                            </Suspense>
                        </div>
                    </main>

                    {currentPage !== 'feed' && currentPage !== 'generationQuiz' && currentPage !== 'secretRoom' && !location.pathname.startsWith('/pokeroom') && (
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
                                    {/* Also in the account menu — but the footer is the one place a
                                        signed-out visitor can reach it. */}
                                    <TextSizeControl variant="compact" />
                                    <a href="https://github.com/ensinho/pokemonTeamBuilder" target="_blank" rel="noopener noreferrer" className="app-shell__footer-link"><GithubIcon /></a>
                                    <a href="https://www.linkedin.com/in/enzoesmeraldo/" target="_blank" rel="noopener noreferrer" className="app-shell__footer-link"><LinkedinIcon /></a>
                                </div>
                            </div>
                        </footer>
                    )}
                </div>

                {isMobile && !isMobileDetailsOpen && (
                    <nav className="app-shell__tabbar" aria-label={language === 'pt' ? 'Navegação principal' : 'Primary'}>
                        {[
                            { key: 'home', label: t('nav.home'), icon: <HomeIcon />, path: '/' },
                            { key: 'builder', label: t('nav.builder'), icon: <SwordsIcon />, path: '/builder' },
                            { key: 'pokedex', label: 'Pokédex', icon: <PokeballIcon />, path: '/pokedex' },
                            { key: 'meta', label: 'Meta', icon: <TrendingUp className="w-5 h-5 shrink-0" />, path: '/meta' },
                            { key: 'more', label: language === 'pt' ? 'Mais' : 'More', icon: <MenuIcon />, action: () => setIsSidebarOpen(true) },
                        ].map((tab) => {
                            const active = tab.key !== 'more' && (currentPage === tab.key || (tab.key === 'pokedex' && currentPage === 'pokemonDetail'));
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => (tab.action ? tab.action() : navigate(tab.path))}
                                    className={`app-shell__tab ${active ? 'is-active' : ''}`}
                                    aria-current={active ? 'page' : undefined}
                                >
                                    <span className="app-shell__tab-icon" aria-hidden="true">{tab.icon}</span>
                                    <span className="app-shell__tab-label">{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                )}
            </div>
        </div>
    );
}
