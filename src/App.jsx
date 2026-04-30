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
import { firebaseConfig, appId, POKEAPI_BASE_URL } from './constants/firebase';
import { GENERATION_RANGES, LEGENDARY_IDS, NATURES_LIST, POKEMON_TIPS } from './constants/pokemon';
import { useDebounce } from './hooks/useDebounce';
import {
    GithubIcon, LinkedinIcon, StarsIcon, StarIcon, TrashIcon, ClearIcon, SaveIcon,
    PlusIcon, MenuIcon, CloseIcon, InfoIcon, PokeballIcon, SavedTeamsIcon,
    CollapseLeftIcon, CollapseRightIcon, ShareIcon, HeartIcon,
    SuccessToastIcon, ErrorToastIcon, WarningToastIcon, SunIcon, MoonIcon,
    SwordsIcon, EditIcon, SparklesIcon, ShowdownIcon, DiceIcon, FlowerIcon,
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
import { AuthModal } from './components/AuthModal';
import { SyncPromptModal } from './components/SyncPromptModal';
import { ProfileView } from './components/ProfileView';
import { MobileTeamBuilderView } from './components/MobileTeamBuilderView';
import { ShareSnippetModal } from './components/ShareSnippetModal';
import { SHARE_BACKGROUNDS } from './assets/backgrounds';
import { AnchoredPopover } from './components/AnchoredPopover';
import { useModalA11y } from './hooks/useModalA11y';

// Patch Notes Modal Component
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

// Mini visual previews mimicking the real components/locations they reference.
const DragDropVisual = ({ colors }) => (
    <div
        className="grid grid-cols-3 gap-2 p-2 rounded-md"
        style={{ backgroundColor: colors.background }}
        aria-hidden="true"
    >
        {[0, 1, 2, 3, 4, 5].map((i) => {
            const isDragging = i === 1;
            const isTarget = i === 4;
            return (
                <div
                    key={i}
                    className="relative h-9 rounded flex items-center justify-center"
                    style={{
                        backgroundColor: colors.cardLight,
                        opacity: isDragging ? 0.4 : 1,
                        outline: isTarget ? `2px dashed ${colors.primary}` : 'none',
                    }}
                >
                    <div
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: colors.primary + '99' }}
                    />
                    {isDragging && (
                        <span
                            className="absolute -right-1 -top-1 text-[10px]"
                            style={{ color: colors.primary }}
                        >
                            ⇢
                        </span>
                    )}
                </div>
            );
        })}
    </div>
);

const BstVisual = ({ colors }) => {
    // Mirrors TeamIdentitySummary's 3-badge row (Avg BST / Types / Lean)
    const Badge = ({ label, value, hint }) => (
        <div
            className="rounded-md p-1.5 text-center"
            style={{ backgroundColor: colors.background }}
        >
            <p
                className="text-[8px] uppercase tracking-wider font-semibold"
                style={{ color: colors.textMuted }}
            >
                {label}
            </p>
            <p className="text-sm font-bold leading-tight" style={{ color: colors.text }}>
                {value}
            </p>
            <p className="text-[8px]" style={{ color: colors.textMuted }}>
                {hint}
            </p>
        </div>
    );
    return (
        <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
            <Badge label="Avg BST" value="512" hint="Strong" />
            <Badge label="Types" value="5" hint="Diverse" />
            <Badge label="Lean" value="Mixed" hint="2/2/2" />
        </div>
    );
};

// Mirrors the footer FooterFeedback like pill + suggestion link
const LikeFeedbackVisual = ({ colors }) => (
    <div
        className="rounded-md p-3 flex items-center justify-center gap-2"
        style={{ backgroundColor: colors.background }}
        aria-hidden="true"
    >
        <span className="text-[10px]" style={{ color: colors.textMuted }}>
            Developed by Enzo Esmeraldo
        </span>
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
                backgroundColor: colors.primary,
                color: 'white',
                border: `1px solid ${colors.primary}`,
            }}
        >
            <HeartIcon className="w-3 h-3 shrink-0" />
            <span>1</span>
        </span>
        <span className="text-[9px] underline" style={{ color: colors.textMuted }}>
            Have a suggestion?
        </span>
    </div>
);

const HomeFlowVisual = ({ colors }) => (
    // Mirrors the Home "Pick up where you left off" hero card
    <div
        className="rounded-md p-2"
        style={{
            background: `linear-gradient(135deg, ${colors.primary}22 0%, ${colors.card} 70%)`,
            border: `1px solid ${colors.primary}55`,
        }}
        aria-hidden="true"
    >
        <p
            className="text-[8px] font-bold uppercase tracking-wider mb-1"
            style={{ color: colors.primary }}
        >
            Pick up where you left off
        </p>
        <div className="flex -space-x-1.5 mb-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                    key={i}
                    className="w-5 h-5 rounded-full border"
                    style={{
                        backgroundColor: colors.cardLight,
                        borderColor: colors.card,
                    }}
                />
            ))}
        </div>
        <div className="flex gap-1.5">
            <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold text-white"
                style={{ backgroundColor: colors.primary }}
            >
                ✎ Continue editing
            </span>
            <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold"
                style={{ color: colors.text, backgroundColor: colors.cardLight }}
            >
                + Start new
            </span>
        </div>
    </div>
);

// Mirrors the Team Share Snippet modal preview + action flow.
const SNIPPET_VISUAL_BG = SHARE_BACKGROUNDS[0]?.url || '';

const SnippetVisual = ({ colors }) => (
    <div
        className="rounded-md p-2"
        style={{ backgroundColor: colors.background }}
        aria-hidden="true"
    >
        <div
            className="relative rounded-md overflow-hidden p-2"
            style={{
                backgroundImage: `linear-gradient(135deg, rgba(0, 0, 0, 0.28) 0%, rgba(0, 0, 0, 0.42) 100%), url(${SNIPPET_VISUAL_BG})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: `1px solid ${colors.primary}44`,
            }}
        >
            <p className="text-[7px] font-bold uppercase tracking-wider text-white/90 mb-1">
                Team Snippet
            </p>
            <div className="flex items-end justify-between gap-2">
                <div className="flex -space-x-1">
                    {[0, 1, 2].map((i) => (
                        <span
                            key={i}
                            className="w-4 h-4 rounded-full border"
                            style={{ borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.2)' }}
                        />
                    ))}
                </div>
                <span className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#fff' }} />
            </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[8px] px-1.5 py-0.5 rounded font-bold text-white" style={{ backgroundColor: colors.primary }}>Share</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: colors.cardLight, color: colors.text }}>Download</span>
        </div>
    </div>
);

// Mirrors the new ProfileView trainer card hero — gradient banner with
// avatar, name, and the streak badge that's the "hooked" element.
const ProfileVisual = ({ colors }) => (
    <div
        className="rounded-md p-2 relative overflow-hidden"
        style={{
            backgroundImage: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 120%)`,
            color: '#fff',
        }}
        aria-hidden="true"
    >
        <div className="flex items-center gap-2">
            <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-extrabold"
                style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
            >
                T
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[7px] uppercase tracking-[0.18em] opacity-80 font-semibold">
                    Trainer Profile
                </p>
                <p className="text-[10px] font-extrabold leading-tight truncate">
                    Your Name
                </p>
            </div>
            <div
                className="rounded px-1.5 py-1 text-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
            >
                <p className="text-[6px] uppercase opacity-80">Streak</p>
                <p className="text-[10px] font-extrabold leading-none">7d</p>
            </div>
        </div>
        <div className="flex gap-1 mt-1.5">
            {['#7d65e1', '#6353b3', '#38BDF8', '#CA8A04'].map((c) => (
                <span
                    key={c}
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: c, borderColor: 'rgba(255,255,255,0.6)' }}
                />
            ))}
        </div>
    </div>
);

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

const PageGuide = ({ colors, pageKey, db, userId, showToast }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [suggestionText, setSuggestionText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const guide = PAGE_GUIDE_TIPS[pageKey];

    useEffect(() => {
        if (!isOpen) return;
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
    }, [isOpen]);

    const handleSendSuggestion = useCallback(async (e) => {
        e.preventDefault();
        const text = suggestionText.trim();
        if (!db || !userId || !text || isSending) return;
        setIsSending(true);
        try {
            await addDoc(collection(db, `artifacts/${appId}/suggestions`), {
                userId,
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
    }, [db, userId, suggestionText, isSending, pageKey, guide, showToast]);

    if (!guide) return null;

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
                                <form onSubmit={handleSendSuggestion} className="flex gap-2">
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
                                        disabled={!suggestionText.trim() || isSending || !db || !userId}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        style={{ backgroundColor: colors.primary }}
                                    >
                                        {isSending ? '...' : 'Send'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
            </AnchoredPopover>
        </div>
    );
};

const PatchNotesModal = ({ onClose, colors }) => {
    const dialogRef = useModalA11y(onClose);
    const navigate = useNavigate();
    const goTo = useCallback((path) => {
        onClose();
        navigate(path);
    }, [navigate, onClose]);

    const notes = [
        {
            key: 'snippet',
            Icon: ShareIcon,
            title: 'Team Snippet Sharing',
            description: 'Share your team as a polished image with custom title, background, QR code, and quick download/share actions.',
            cta: 'Open builder and tap Share',
            path: '/builder',
            Visual: SnippetVisual,
        },
        {
            key: 'profile',
            Icon: AccountIcon,
            title: 'Profile, Themes & Streak',
            description: 'New Profile screen with a trainer card, login streak, two new themes (Midnight, Solar) and cross-device sync of your preferences.',
            cta: 'Open your profile',
            path: '/profile',
            Visual: ProfileVisual,
        },
        {
            key: 'like',
            Icon: HeartIcon,
            title: 'Like the App + Send Suggestions',
            description: 'Found a bug or have an idea? Tap the heart in the footer to show some love or send a suggestion straight to me.',
            cta: 'Scroll to the footer',
            path: '/',
            Visual: LikeFeedbackVisual,
        },
        
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose} role="presentation">
            <div 
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="patch-notes-title"
                tabIndex={-1}
                className="rounded-2xl shadow-xl w-full max-w-lg max-h-[95vh] flex flex-col relative animate-fade-in focus:outline-none"
                style={{ backgroundColor: colors.card, '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} type="button" aria-label="Close patch notes" className="absolute top-4 right-4 text-muted hover:text-fg transition-colors z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1">
                    <CloseIcon />
                </button>
                
                {/* Header (fixed) */}
                <div className="text-center px-5 pt-5 pb-4 border-b shrink-0" style={{ borderColor: colors.cardLight }}>
                    <div className="flex items-center justify-center gap-4 mb-2">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full" style={{ backgroundColor: colors.primary + '20' }}>
                            <FlowerIcon />
                        </div>
                        <h2 id="patch-notes-title" className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: colors.text }}>
                            What's New!
                        </h2>
                    </div>
                    <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                        Version {PATCH_NOTES_VERSION} • April 2026
                    </p>
                </div>

                {/* Patch Notes Content (scrollable) */}
                <div className="space-y-4 px-5 py-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                    {notes.map(({ key, Icon, title, description, cta, path, Visual }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => goTo(path)}
                            className="w-full text-left p-4 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{ backgroundColor: colors.cardLight }}
                            aria-label={`${title} – ${cta}`}
                        >
                            <div className="rounded-lg overflow-hidden mb-3" style={{ backgroundColor: colors.card }}>
                                <Visual colors={colors} />
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-md" style={{ color: colors.primary, backgroundColor: colors.primary + '1A' }} aria-hidden="true">
                                    <Icon className="w-4 h-4" />
                                </span>
                                <h3 className="font-bold" style={{ color: colors.primary }}>{title}</h3>
                            </div>
                            <p className="text-sm" style={{ color: colors.text }}>
                                {description}
                            </p>
                            <span
                                className="inline-flex items-center gap-1 mt-2 text-xs font-semibold"
                                style={{ color: colors.primary }}
                            >
                                {cta}
                                <span aria-hidden="true">→</span>
                            </span>
                        </button>
                    ))}
                </div>

                {/* Footer (fixed) */}
                <div className="text-center px-5 pt-4 pb-5 border-t shrink-0" style={{ borderColor: colors.cardLight }}>
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 rounded-lg font-bold text-white transition-colors hover:opacity-90"
                        style={{ backgroundColor: colors.primary }}
                    >
                        Got it, let's go!
                    </button>
                    <p className="text-xs mt-3" style={{ color: colors.textMuted }}>
                        Made by Enzo Esmeraldo -- hope you like it!
                    </p>
                </div>
            </div>
        </div>
    );
};

// Greeting Pokemon Selector Modal
const GreetingPokemonSelectorModal = ({ onClose, onSelect, allPokemons, currentPokemonId, colors, db }) => {
    const dialogRef = useModalA11y(onClose);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 350);
    const [selectedType, setSelectedType] = useState(null);

    // Browse state — local paginated list shown when search is empty
    const [browseList, setBrowseList] = useState(allPokemons || []);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Search state — Firestore query results shown while user is typing
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const isSearchActive = debouncedSearch.trim().length > 0;

    // ── Browse: load next batch ──────────────────────────────────────────────
    const loadMorePokemons = useCallback(async () => {
        if (!db || isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        try {
            const constraints = [orderBy('id'), limit(200)];
            if (lastDoc) constraints.push(startAfter(lastDoc));
            const q = query(collection(db, 'artifacts/pokemonTeamBuilder/pokemons'), ...constraints);
            const snapshot = await getDocs(q);
            if (snapshot.empty || snapshot.docs.length < 200) setHasMore(false);
            const newPokemons = snapshot.docs.map(d => d.data());
            const lastVisible = snapshot.docs[snapshot.docs.length - 1];
            setBrowseList(prev => {
                const combined = [...prev, ...newPokemons];
                return combined.filter((p, i, self) => i === self.findIndex(x => x.id === p.id));
            });
            setLastDoc(lastVisible);
        } catch (err) {
            console.error('Error loading more Pokemon:', err);
            setHasMore(false);
        } finally {
            setIsLoadingMore(false);
        }
    }, [db, lastDoc, isLoadingMore, hasMore]);

    // Initial load if the seed list is small
    useEffect(() => {
        if (browseList.length < 100 && hasMore) loadMorePokemons();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Search: Firestore prefix query, fires on debounced value ────────────
    useEffect(() => {
        if (!isSearchActive) { setSearchResults([]); return; }
        if (!db) return;

        let cancelled = false;
        const run = async () => {
            setIsSearching(true);
            try {
                const term = debouncedSearch.toLowerCase();
                const constraints = [
                    orderBy('name'),
                    where('name', '>=', term),
                    where('name', '<=', term + '\uf8ff'),
                    limit(100),
                ];
                if (selectedType) constraints.push(where('types', 'array-contains', selectedType));
                const q = query(collection(db, 'artifacts/pokemonTeamBuilder/pokemons'), ...constraints);
                const snap = await getDocs(q);
                if (!cancelled) setSearchResults(snap.docs.map(d => d.data()));
            } catch (err) {
                console.error('Pokemon search error:', err);
            } finally {
                if (!cancelled) setIsSearching(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [debouncedSearch, isSearchActive, db, selectedType]);

    // ── Displayed list ───────────────────────────────────────────────────────
    // In browse mode, apply type filter locally; search mode already queries by type on Firestore.
    const displayedPokemons = useMemo(() => {
        if (isSearchActive) return searchResults;
        if (!selectedType) return browseList;
        return browseList.filter(p => p.types?.includes(selectedType));
    }, [isSearchActive, searchResults, browseList, selectedType]);

    const highestLoadedId = useMemo(() => {
        return browseList.reduce((max, p) => Math.max(max, Number(p?.id) || 0), 0);
    }, [browseList]);
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose} role="presentation">
            <div 
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="greeting-selector-title"
                tabIndex={-1}
                className="rounded-2xl shadow-xl w-full max-w-7xl max-h-[85vh] overflow-y-auto custom-scrollbar p-6 relative animate-fade-in focus:outline-none"
                style={{ backgroundColor: colors.card, '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} type="button" aria-label="Close partner selector" className="absolute top-4 right-4 text-muted hover:text-fg transition-colors z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1">
                    <CloseIcon />
                </button>
                
                <div className="mb-6">
                    <h2 id="greeting-selector-title" className="text-2xl font-bold mb-2" style={{ color: colors.text }}>
                        Choose Your Partner Pokémon
                    </h2>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                        Select a Pokémon to display on your greeting card
                    </p>
                </div>
                
                {/* Search and filter */}
                <div className="mb-4 space-y-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search Pokémon by name…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border-2 transition-all focus:outline-none pr-10"
                            style={{ 
                                backgroundColor: colors.cardLight, 
                                color: colors.text,
                                borderColor: isSearchActive ? colors.primary : colors.cardLight,
                            }}
                        />
                        {isSearchActive && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors hover:opacity-70"
                                aria-label="Clear search"
                                style={{ color: colors.textMuted }}
                            >
                                <CloseIcon />
                            </button>
                        )}
                    </div>

                    {/* Mode indicator */}
                    {isSearchActive ? (
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                            {isSearching
                                ? 'Searching…'
                                : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${debouncedSearch}"`}
                        </p>
                    ) : (
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                            Browsing {browseList.length} loaded Pokémon — or type to search all of them.
                        </p>
                    )}
                    
                    {/* Type filter */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedType(null)}
                            className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                            style={{ 
                                backgroundColor: !selectedType ? colors.primary : colors.cardLight,
                                color: !selectedType ? 'white' : colors.text
                            }}
                        >
                            All Types
                        </button>
                        {Object.keys(typeColors).slice(0, 8).map(type => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className="px-3 py-1 rounded-full text-xs font-semibold text-white transition-all"
                                style={{ 
                                    backgroundColor: selectedType === type ? typeColors[type] : colors.cardLight,
                                    opacity: selectedType === type ? 1 : 0.7
                                }}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Clear selection option */}
                {currentPokemonId && (
                    <button
                        onClick={() => onSelect(null)}
                        className="w-full mb-4 p-3 rounded-lg border-2 border-dashed transition-all hover:scale-[1.02]"
                        style={{ borderColor: colors.textMuted, color: colors.textMuted }}
                    >
                        <span className="text-2xl mb-1 block">✨</span>
                        Remove custom Pokémon (use default)
                    </button>
                )}
                
                {/* Pokemon grid */}
                {isSearching ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: colors.primary }} />
                    </div>
                ) : (
                    <div className="grid grid-cols-3  md:grid-cols-5 lg:grid-cols-8 gap-3">
                        {displayedPokemons.map(pokemon => (
                            <button
                                key={pokemon.id}
                                onClick={() => onSelect(pokemon.id)}
                                className="p-3 rounded-xl text-center transition-all hover:scale-105 hover:shadow-lg relative"
                                style={{ 
                                    backgroundColor: currentPokemonId === pokemon.id ? colors.primary + '20' : colors.cardLight,
                                    border: currentPokemonId === pokemon.id ? `2px solid ${colors.primary}` : 'none'
                                }}
                            >
                                {currentPokemonId === pokemon.id && (
                                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                                <img 
                                    src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL}
                                    alt={pokemon.name}
                                    className="w-16 h-16 mx-auto"
                                    onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                />
                                <p className="text-xs capitalize truncate mt-1" style={{ color: colors.text }}>
                                    {pokemon.name}
                                </p>
                            </button>
                        ))}
                    </div>
                )}
                
                {/* Load More — only in browse mode */}
                {!isSearchActive && hasMore && (
                    <div className="mt-4 text-center">
                        <button
                            onClick={loadMorePokemons}
                            disabled={isLoadingMore}
                            className="px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: colors.primary, color: 'white' }}
                        >
                            {isLoadingMore ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Loading more…
                                </div>
                            ) : (
                                `Load more Pokémon (${browseList.length} loaded · up to #${highestLoadedId})`
                            )}
                        </button>
                    </div>
                )}
                
                {!isSearching && displayedPokemons.length === 0 && (
                    <EmptyState
                        compact
                        title={isSearchActive || selectedType ? 'No matches' : 'No Pokémon available'}
                        message={isSearchActive ? `Nothing found for "${debouncedSearch}". Try a different name.` : selectedType ? 'Try clearing the type filter.' : 'Pokémon data is loading.'}
                    />
                )}
            </div>
        </div>
    );
};
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", colors }) => {
    const dialogRef = useModalA11y(isOpen ? onClose : undefined);
    if (!isOpen) return null;
    const titleId = 'confirm-dialog-title';
    const descId = 'confirm-dialog-desc';

    return (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose} role="presentation">
            <div 
                ref={dialogRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                tabIndex={-1}
                className="rounded-2xl shadow-2xl w-full max-w-md p-6 relative transform transition-all animate-scale-in focus:outline-none"
                style={{backgroundColor: colors.card, border: `1px solid ${colors.cardLight}`}}
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center">
                    <div className="mx-auto w-14 h-14 rounded-full bg-danger/20 flex items-center justify-center mb-4">
                        <svg className="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 id={titleId} className="text-xl font-bold mb-2" style={{color: colors.text}}>{title}</h3>
                    <p id={descId} className="text-sm mb-6" style={{color: colors.textMuted}}>{message}</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        style={{backgroundColor: colors.cardLight, color: colors.text}}
                    >
                        No! Keep them
                    </button>
                    <button 
                        onClick={() => { onConfirm(); onClose(); }}
                        className="flex-1 py-3 px-4 rounded-xl font-semibold bg-danger hover:opacity-90 text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const POKEMON_STAT_ACCENT_COLORS = {
    hp: '#EF4444',
    attack: '#F97316',
    defense: '#EAB308',
    'special-attack': '#3B82F6',
    'special-defense': '#22C55E',
    speed: '#EC4899',
};

const getPokemonWeaknessEntries = (pokemonTypes = []) => {
    if (!Array.isArray(pokemonTypes) || pokemonTypes.length === 0) return [];

    return Object.keys(typeChart)
        .map((attackingType) => {
            const capitalizedAttackingType = attackingType.charAt(0).toUpperCase() + attackingType.slice(1);
            const multiplier = pokemonTypes.reduce((acc, pokemonType) => {
                return acc * (typeChart[pokemonType]?.damageTaken[capitalizedAttackingType] ?? 1);
            }, 1);

            return { type: attackingType, multiplier };
        })
        .filter(({ multiplier }) => multiplier > 1)
        .sort((a, b) => b.multiplier - a.multiplier || a.type.localeCompare(b.type));
};

const WeaknessBadge = ({ type, multiplier, colors }) => (
    <span
        className="inline-flex items-center gap-1 rounded-full pl-1.5 pr-2 py-1"
        style={{ backgroundColor: colors.cardLight, color: colors.text }}
    >
        <img src={typeIcons[type]} alt="" aria-hidden="true" className="h-3.5 w-3.5 rounded-full" />
        <span className="text-[10px] font-semibold capitalize">{type}</span>
        <span
            className="text-[10px] font-bold"
            style={{ color: multiplier >= 4 ? colors.danger : colors.textMuted }}
        >
            x{multiplier}
        </span>
    </span>
);

const CompactStatBar = ({ stat, value, colors }) => {
    const width = Math.max((value / 255) * 100, 16);
    return (
        <div className="flex items-center gap-2">
            <p className="w-[34%] text-[11px] font-semibold capitalize leading-tight text-right" style={{ color: colors.text }}>
                {stat.replace('-', ' ')}
            </p>
            <div className="w-[66%] rounded-full h-3 overflow-hidden" style={{ backgroundColor: colors.cardLight }}>
                <div
                    className="h-3 rounded-full text-[9px] text-white font-bold flex items-center justify-end pr-1.5"
                    style={{
                        width: `${width}%`,
                        backgroundColor: POKEMON_STAT_ACCENT_COLORS[stat] || colors.primary,
                    }}
                >
                    {value}
                </div>
            </div>
        </div>
    );
};

const PokemonDetailModal = ({ pokemon, onClose, onAdd, currentTeam, colors, showPokemonDetails, db, isFavorite, onToggleFavorite }) => {
    const dialogRef = useModalA11y(onClose);
    const [showShiny, setShowShiny] = useState(false);
    const [evolutionDetails, setEvolutionDetails] = useState([]);
    const pokemonWeaknesses = useMemo(() => getPokemonWeaknessEntries(pokemon?.types || []), [pokemon]);

    useEffect(() => {
        if (!pokemon || !pokemon.evolution_chain_url || !db) return;
        
        const fetchEvolutionChain = async () => {
            try {
                const res = await fetch(pokemon.evolution_chain_url);
                const data = await res.json();
                const chain = [];
                let evoData = data.chain;
                do {
                    chain.push({
                        name: evoData.species.name,
                        url: evoData.species.url
                    });
                    evoData = evoData.evolves_to[0];
                } while (!!evoData && evoData.hasOwnProperty('evolves_to'));

                const detailsPromises = chain.map(async (evo) => {
                    const id = evo.url.split('/').filter(Boolean).pop();
                    const docRef = doc(db, 'artifacts/pokemonTeamBuilder/pokemons', id);
                    const docSnap = await getDoc(docRef);
                    return docSnap.exists() ? docSnap.data() : { name: evo.name, sprite: POKEBALL_PLACEHOLDER_URL };
                });
                
                const resolvedDetails = await Promise.all(detailsPromises);
                setEvolutionDetails(resolvedDetails);

            } catch (error) {
                console.error("Failed to fetch evolution chain", error);
            }
        };

        fetchEvolutionChain();
    }, [pokemon, db]);

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
                        <img src={spriteToShow || POKEBALL_PLACEHOLDER_URL} alt={pokemon.name} className="mx-auto h-24 w-24 sm:h-32 sm:w-32 image-pixelated hover:scale-110 transition-transform duration-300"/>
                        <button 
                             onClick={() => setShowShiny(!showShiny)} 
                             className={`absolute -bottom-2 -right-5 p-1 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${showShiny ? 'bg-yellow-500' : 'bg-gray-700'}`} 
                             style={{color: 'white'}} 
                             title="Toggle Shiny">
                            <SparklesIcon className="w-4 h-4"/>
                        </button>
                        {onToggleFavorite && (
                            <button 
                                onClick={() => onToggleFavorite(pokemon.id)} 
                                className={`absolute -bottom-2 -left-5 p-1 rounded-full transition-all duration-200 hover:scale-110 active:scale-95`} 
                                style={{backgroundColor: isFavorite ? 'rgba(251, 191, 36, 0.3)' : 'rgba(107, 114, 128, 0.7)', color: 'white'}} 
                                title={isFavorite ? "Remove from favorites" : "Add to favorites"}>
                                <StarIcon className="w-5 h-5" isFavorite={isFavorite} color="white" />
                            </button>
                        )}
                    </div>
                    <h2 id="pokemon-detail-title" className="text-2xl sm:text-3xl font-bold capitalize mt-2" style={{color: colors.text}}>{pokemon.name} <span style={{color: colors.textMuted}}>#{pokemon.id}</span></h2>
                    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                        {pokemon.types.map(type => <TypeBadge key={type} type={type} colors={colors} />)}
                    </div>
                </div>

                <div className="mt-4 sm:hidden">
                    <h3 className="text-lg font-bold mb-2 text-center" style={{color: colors.text}}>Base Stats</h3>
                    <div className="space-y-1.5 rounded-xl p-3" style={{ backgroundColor: colors.background }}>
                        {pokemon.stats?.map((stat) => (
                            <CompactStatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />
                        ))}
                    </div>
                </div>

                <div className="mt-5 hidden sm:block">
                    <h3 className="text-xl font-bold mb-3 text-center" style={{color: colors.text}}>Base Stats</h3>
                    <div className="space-y-2">
                        {pokemon.stats?.map(stat => <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />)}
                    </div>
                </div>

                <div className="mt-4 rounded-xl p-3 sm:p-4" style={{ backgroundColor: colors.background }}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <h3 className="text-base sm:text-lg font-bold" style={{ color: colors.text }}>Weaknesses</h3>
                        <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                            style={{ backgroundColor: colors.cardLight, color: colors.textMuted }}
                        >
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
                                        <p className="text-xs sm:text-sm capitalize leading-tight" style={{color: colors.text}}>{evo.name}</p>
                                    </button>
                                    {index < evolutionDetails.length - 1 && <span className="text-lg sm:text-2xl px-1" style={{color: colors.textMuted}}>→</span>}
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

const TeamPokemonEditorModal = ({ pokemon, onClose, onSave, colors, items, natures, moveDetailsCache, setMoveDetailsCache }) => {
    const [customization, setCustomization] = useState(pokemon.customization);
    const [remainingEVs, setRemainingEVs] = useState(510);
    const [moveSearch, setMoveSearch] = useState('');
    const [activeTab, setActiveTab] = useState('loadout');
    const dialogRef = useRef(null);
    const previouslyFocusedRef = useRef(null);
    const statNames = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    const pokemonWeaknesses = useMemo(() => getPokemonWeaknessEntries(pokemon?.types || []), [pokemon]);

    const fetchMoveDetails = useCallback(async (moveUrl, moveName) => {
        if (moveDetailsCache[moveName]) {
            return moveDetailsCache[moveName];
        }
        try {
            const res = await fetch(moveUrl);
            const data = await res.json();
            const moveData = {
                name: data.name,
                type: data.type.name,
                power: data.power,
                accuracy: data.accuracy,
                pp: data.pp,
                damage_class: data.damage_class.name,
            };
            setMoveDetailsCache(prev => ({...prev, [moveName]: moveData}));
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
            if (!moveDetailsCache[m.name]) {
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


const TeamBuilderView = ({
    currentTeam, teamName, setTeamName, handleRemoveFromTeam, handleReorderTeam, handleSaveTeam, editingTeamId, handleClearTeam,
    recentTeams, onNavigateToTeams, handleToggleFavorite, handleEditTeam, handleShareTeam, requestDeleteTeam, handleExportToShowdown,
    teamAnalysis,
    searchInput, setSearchInput, selectedGeneration, setSelectedGeneration, generations,
    isInitialLoading,
    availablePokemons, handleAddPokemonToTeam, lastPokemonElementRef, isFetchingMore,
    selectedTypes, handleTypeSelection, showDetails,
    suggestedPokemonIds, colors, onEditTeamPokemon,
    favoritePokemons, onToggleFavoritePokemon,
    showOnlyFavorites, setShowOnlyFavorites
}) => {
    // Drag state for team-slot reordering. Keyboard reorder uses Alt+Arrow
    // and doesn't need this — it goes straight to handleReorderTeam.
    const [dragIndex, setDragIndex] = React.useState(null);

    // Filter available pokemons based on favorites toggle
    const displayedPokemons = showOnlyFavorites 
        ? availablePokemons.filter(p => favoritePokemons.has(p.id))
        : availablePokemons;

    return (
    <>
        <MobileTeamBuilderView
            currentTeam={currentTeam}
            teamName={teamName}
            setTeamName={setTeamName}
            handleRemoveFromTeam={handleRemoveFromTeam}
            handleSaveTeam={handleSaveTeam}
            editingTeamId={editingTeamId}
            handleClearTeam={handleClearTeam}
            recentTeams={recentTeams}
            onNavigateToTeams={onNavigateToTeams}
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
            isInitialLoading={isInitialLoading}
            displayedPokemons={displayedPokemons}
            handleAddPokemonToTeam={handleAddPokemonToTeam}
            lastPokemonElementRef={lastPokemonElementRef}
            isFetchingMore={isFetchingMore}
            selectedTypes={selectedTypes}
            onToggleFavoritePokemon={onToggleFavoritePokemon}
            handleTypeSelection={handleTypeSelection}
            showDetails={showDetails}
            suggestedPokemonIds={suggestedPokemonIds}
            colors={colors}
            onEditTeamPokemon={onEditTeamPokemon}
            favoritePokemons={favoritePokemons}
            showOnlyFavorites={showOnlyFavorites}
            setShowOnlyFavorites={setShowOnlyFavorites}
        />

        <main className="hidden lg:grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-8 lg:sticky lg:top-4 lg:self-start">
            <section className="p-6 rounded-xl shadow-lg" style={{backgroundColor: colors.card}}>
                <h2 className="text-lg md:text-xl font-bold mb-4 border-b-2 pb-2" style={{borderColor: colors.primary, color: colors.text}}>Current Team</h2>
                <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team Name" className="w-full p-3 rounded-lg border-2 focus:outline-none" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}/>
                <div className="grid grid-cols-3 gap-4 min-h-[120px] p-4 rounded-lg mt-4 " style={{backgroundColor: colors.background}}>
                    {currentTeam.map((p, idx) => (
                        <div
                            key={p.instanceId}
                            className={`text-center relative group cursor-grab active:cursor-grabbing rounded-lg transition-all ${dragIndex === idx ? 'opacity-40' : 'opacity-100'} hover:bg-surface-raised/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                            draggable
                            tabIndex={0}
                            role="button"
                            aria-label={`${p.name}, slot ${idx + 1} of ${currentTeam.length}. Drag to reorder, or hold Alt and press Arrow keys.`}
                            onClick={() => onEditTeamPokemon(p)}
                            onKeyDown={(e) => {
                                if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
                                    e.preventDefault();
                                    handleReorderTeam?.(idx, Math.max(0, idx - 1));
                                } else if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) {
                                    e.preventDefault();
                                    handleReorderTeam?.(idx, Math.min(currentTeam.length - 1, idx + 1));
                                } else if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onEditTeamPokemon(p);
                                }
                            }}
                            onDragStart={(e) => {
                                setDragIndex(idx);
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', String(idx));
                            }}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                            onDrop={(e) => {
                                e.preventDefault();
                                const from = Number(e.dataTransfer.getData('text/plain'));
                                if (!Number.isNaN(from)) handleReorderTeam?.(from, idx);
                                setDragIndex(null);
                            }}
                            onDragEnd={() => setDragIndex(null)}
                        >
                            <div className="mx-auto h-20 w-20">
                                <Sprite src={p.animatedSprite || p.sprite} alt={p.name} className="w-full h-full" />
                            </div>
                            <p className="text-xs capitalize truncate" style={{color: colors.text}}>{p.name}</p>

                             <button
                                onClick={(e) => { e.stopPropagation(); onEditTeamPokemon(p); }}
                                aria-label={`Edit ${p.name}`}
                                className="absolute top-1 left-1 bg-gray-700 bg-opacity-50 text-white rounded-full h-6 w-6 flex items-center justify-center transition-opacity text-sm opacity-100 visible lg:opacity-0 lg:invisible lg:group-hover:opacity-100 lg:group-hover:visible"
                                >
                                <EditIcon />
                            </button>

                            <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveFromTeam(p.instanceId); }}
                            aria-label={`Remove ${p.name} from team`}
                            className="
                                absolute top-1 right-1 bg-danger text-white rounded-full h-6 w-6 flex items-center justify-center text-sm
                                opacity-100 visible
                                lg:opacity-0 lg:invisible
                                lg:group-hover:opacity-100 lg:group-hover:visible
                                transition-opacity duration-200 
                            "
                            >
                            <TrashIcon/>
                            </button>
                        </div>
                        ))}

                    {Array.from({ length: 6 - currentTeam.length }).map((_, i) => (<div key={i} className="flex items-center justify-center"><img src={POKEBALL_PLACEHOLDER_URL} alt="Empty team slot" className="w-12 h-12 opacity-40"/></div>))}
                </div>

                <TeamIdentitySummary team={currentTeam} />
                <div className="flex items-center gap-2 mt-4">
                    <button onClick={handleSaveTeam} className="w-full flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]" style={{backgroundColor: colors.primary, color: colors.background}}> <SaveIcon /> {editingTeamId ? 'Update' : 'Save'} </button>
                    <button onClick={handleExportToShowdown} type="button" aria-label="Export team to Pokémon Showdown" className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{backgroundColor: colors.cardLight, color: colors.text}} title="Export to Showdown"><ShowdownIcon /></button>
                    <button onClick={handleShareTeam} type="button" aria-label="Share team" className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{backgroundColor: colors.cardLight, color: colors.text}} title="Share Team"><ShareIcon /></button>
                    <button onClick={handleClearTeam} type="button" aria-label="Clear team" className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{backgroundColor: colors.cardLight, color: colors.text}} title="Clear Team"><ClearIcon /></button>
                </div>
            </section>
            
            <section className="p-6 rounded-xl shadow-lg backdrop-blur-sm" style={{backgroundColor: colors.card, borderTop: `1px solid ${colors.cardLight}`}}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg md:text-xl font-bold" style={{color: colors.text}}>Recent Teams</h2>
                    <button onClick={onNavigateToTeams} className="text-sm hover:underline transition-all duration-200 hover:scale-105" style={{color: colors.primary}}>View All</button>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar" style={{'--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card}}>
                    {recentTeams.length > 0 ? recentTeams.map(team => (
                        <div key={team.id} className="p-4 rounded-lg flex items-center justify-between transition-all duration-200 hover:shadow-md" style={{backgroundColor: colors.cardLight}}>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-lg truncate" style={{color: colors.text}}>{team.name}</p>
                                <div className="flex mt-1">
                                    {team.pokemons.map(p => <img key={p.id} src={p.sprite || POKEBALL_PLACEHOLDER_URL} onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL }} alt={p.name} className="h-8 w-8 -ml-2 border-2 rounded-full transition-transform duration-200 hover:scale-110 hover:z-10" style={{borderColor: colors.cardLight, backgroundColor: colors.card}} />)}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <button onClick={() => handleToggleFavorite(team)} title="Favorite">
                                    <StarIcon isFavorite={team.isFavorite} color={colors.textMuted} />
                                </button>
                                <button onClick={() => handleEditTeam(team)} className="text-xs font-bold py-1 px-3 rounded-full transition-all duration-200 hover:scale-105 active:scale-95" style={{backgroundColor: colors.primary, color: colors.background}} >Edit</button>
                                <button onClick={() => requestDeleteTeam(team.id, team.name)} className="bg-danger p-1 hover:opacity-90 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"><TrashIcon /></button>
                            </div>
                        </div>
                    )) : <p className="text-center py-4" style={{color: colors.textMuted}}>No recent teams yet.</p>}
                </div>
            </section>
        </div>

        <div className="lg:col-span-6">
            <section className="p-6 rounded-xl shadow-lg h-full flex flex-col" style={{backgroundColor: colors.card}}>
                <div className="mb-4">
                    <h2 className="text-xl md:text-2xl font-bold mb-4" style={{color: colors.text}}>Choose your Pokémon!</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <input type="text" placeholder="Search Pokémon..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}/>
                        <select value={selectedGeneration} onChange={e => setSelectedGeneration(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none appearance-none capitalize" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}>
                            <option value="all" style={{color: colors.text}}>All Generations</option>
                            {generations.map(gen => <option key={gen} value={gen} className="capitalize" style={{color: colors.text}}>{gen.replace('-', ' ')}</option>)}
                        </select>
                        <button 
                            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                            className={`w-full p-3 rounded-lg border-2 focus:outline-none flex items-center justify-center gap-2 font-semibold transition-all duration-200 ${showOnlyFavorites ? 'ring-2 ring-yellow-400' : ''}`}
                            style={{backgroundColor: showOnlyFavorites ? 'rgba(251, 191, 36, 0.2)' : colors.cardLight, borderColor: 'transparent', color: colors.text}}
                        >
                            <StarIcon className="w-5 h-5" isFavorite={showOnlyFavorites} color={colors.textMuted} />
                            {showOnlyFavorites ? 'Favorites' : 'Favorites'}
                        </button>
                    </div>
                </div>
                <div className="relative flex-grow h-[60vh]">
                    {isInitialLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: colors.primary}}></div>
                        </div>
                    ) : (
                    <>
                        <div className="h-full overflow-y-auto custom-scrollbar" style={{'--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card}}>
                            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-2 py-4">
                                {displayedPokemons.map((pokemon, index) => (
                                    <PokemonCard 
                                        key={pokemon.id} 
                                        details={pokemon} 
                                        onCardClick={showDetails}
                                        onAddToTeam={handleAddPokemonToTeam}
                                        lastRef={index === displayedPokemons.length - 1 ? lastPokemonElementRef : null} 
                                        isSuggested={suggestedPokemonIds.has(pokemon.id)} 
                                        colors={colors}
                                        isFavorite={favoritePokemons.has(pokemon.id)}
                                        onToggleFavorite={onToggleFavoritePokemon}
                                    />
                                ))}
                            </div>
                            {isFetchingMore && <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: colors.primary}}></div></div>}
                            {displayedPokemons.length === 0 && !isInitialLoading && (
                                <EmptyState
                                    compact
                                    title={showOnlyFavorites ? 'No favorites match' : 'No Pökemon found'}
                                    message={showOnlyFavorites ? 'Try clearing filters or favoriting more Pokémon.' : 'Try a different search, generation, or type.'}
                                />
                            )}
                        </div>
                    </>)}
                </div>
            </section>
        </div>

        <div className="lg:col-span-3 space-y-8 lg:sticky lg:top-4 lg:self-start">
            <section className="p-6 rounded-xl shadow-lg" style={{backgroundColor: colors.card}}>
                <h3 className="text-sm md:text-base font-bold mb-3 text-center uppercase tracking-wider" style={{color: colors.text}}>Filter by Type</h3>
                <div className="grid grid-cols-5 lg:grid-cols-5 gap-1.5">
                    {Object.keys(typeColors).map(type => (
                        <button key={type} onClick={() => handleTypeSelection(type)} className={`p-1.5 rounded-lg bg-transparent transition-colors hover:opacity-75 ${selectedTypes.has(type) ? 'ring-2 ring-primary' : ''}`} style={{backgroundColor: colors.cardLight}} title={type}>
                            <img src={typeIcons[type]} alt={type} className="w-full h-full object-contain" />
                        </button>
                    ))}
                </div>
            </section>
            {currentTeam.length > 0 && (
                <section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: colors.card }}>
                    <h3 className="text-lg md:text-xl font-bold mb-4" style={{color: colors.text}}>Team Analysis</h3>
                    <div>
                        <h4 className="font-semibold mb-2 text-success">Offensive Coverage:</h4>
                        <div className="flex flex-wrap gap-1">
                            {teamAnalysis.strengths.size > 0 ? Array.from(teamAnalysis.strengths).sort().map(type => <TypeBadge key={type} type={type} colors={colors} />) : <p className="text-sm" style={{color: colors.textMuted}}>No type advantages found.</p>}
                        </div>
                    </div>
                    <div className="mt-4">
                        <h4 className="font-semibold mb-2 text-danger">Defensive Weaknesses:</h4>
                        <div className="flex flex-wrap gap-1">
                            {Object.keys(teamAnalysis.weaknesses).length > 0 ? Object.entries(teamAnalysis.weaknesses).sort(([,a],[,b]) => b-a).map(([type, score]) => (
                                <div key={type} className="flex items-center">
                                    <TypeBadge type={type} colors={colors} />
                                    <span className="text-xs text-danger">({score}x)</span>
                                </div>
                            )) : <p className="text-sm" style={{color: colors.textMuted}}>Your team is rock solid!</p>}
                        </div>
                    </div>
                </section>
            )}
        </div>
    </main>
    </>
    );
};

const AllTeamsView = ({teams, onEdit, onExport, onShare, requestDelete, onToggleFavorite, searchTerm, setSearchTerm, colors}) => (
    <div className="p-6 rounded-xl shadow-lg" style={{backgroundColor: colors.card}}>
        <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{color: colors.text}}>All Saved Teams</h2>
        <input type="text" placeholder="Search teams by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 mb-6 rounded-lg border-2 focus:outline-none" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}/>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {teams.length > 0 ? teams.map(team => (
                <div key={team.id} className="p-4 rounded-lg flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:scale-[1.02]" style={{backgroundColor: colors.cardLight}}>
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-xl truncate mb-2" style={{color: colors.text}}>{team.name}</p>
                        <button onClick={() => onToggleFavorite(team)} title="Favorite" className="transition-transform duration-200 hover:scale-110 active:scale-95">
                            <StarIcon isFavorite={team.isFavorite} color={colors.textMuted} />
                        </button>
                    </div>
                    <div className="flex my-2">
                        {team.pokemons.map(p => <img key={p.id} src={p.sprite || POKEBALL_PLACEHOLDER_URL} onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL }} alt={p.name} className="h-12 w-12 -ml-3 border-2 rounded-full transition-transform duration-200 hover:scale-110 hover:z-10" style={{borderColor: colors.cardLight, backgroundColor: colors.card}} />)}
                    </div>
                    <div className="flex items-center gap-2 mt-auto pt-2">
                        <button onClick={() => onEdit(team)} className="w-full bg-primary hover:bg-purple-500/30 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]">Edit</button>
                        <button
                            type="button"
                            onClick={() => onExport(team)}
                            aria-label={`Export ${team.name} to Pokémon Showdown`}
                            title="Export to Showdown"
                            className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                            style={{backgroundColor: colors.card, color: colors.text}}
                        >
                            <ShowdownIcon />
                        </button>
                        <button
                            type="button"
                            onClick={() => onShare(team)}
                            aria-label={`Share ${team.name}`}
                            title="Share Team"
                            className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                            style={{backgroundColor: colors.card, color: colors.text}}
                        >
                            <ShareIcon />
                        </button>
                        <button onClick={() => requestDelete(team.id, team.name)} className="p-2 bg-danger hover:opacity-90 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"><TrashIcon /></button>
                    </div>
                </div>
            )) : <p className="col-span-full text-center py-8" style={{color: colors.textMuted}}>No teams found.</p>}
        </div>
    </div>
);

const PokedexView = ({
    pokemons,
    lastPokemonElementRef, isFetchingMore,
    searchInput, setSearchInput, selectedTypes, handleTypeSelection,
    selectedGeneration, setSelectedGeneration, generations,
    isInitialLoading, colors, showDetails,
    favoritePokemons, onToggleFavoritePokemon,
    showOnlyFavorites, setShowOnlyFavorites
}) => {
    // Filter pokemons based on favorites toggle
    const displayedPokemons = showOnlyFavorites 
        ? pokemons.filter(p => favoritePokemons.has(p.id))
        : pokemons;

    return (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             <div className="lg:col-span-9">
                 <section className="p-6 rounded-xl shadow-lg h-full flex flex-col" style={{backgroundColor: colors.card}}>
                     <div className="mb-4">
                         <h2 className="text-xl md:text-2xl font-bold mb-4" style={{color: colors.text}}>Pokédex</h2>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                             <input type="text" placeholder="Search Pokémon..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}/>
                             <select value={selectedGeneration} onChange={e => setSelectedGeneration(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none appearance-none capitalize" style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}>
                                 <option value="all" style={{color: colors.text}}>All Generations</option>
                                 {generations.map(gen => <option key={gen} value={gen} className="capitalize" style={{color: colors.text}}>{gen.replace('-', ' ')}</option>)}
                             </select>
                             <button 
                                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                className={`w-full p-3 rounded-lg border-2 focus:outline-none flex items-center justify-center gap-2 font-semibold transition-all duration-200 ${showOnlyFavorites ? 'ring-2 ring-yellow-400' : ''}`}
                                style={{backgroundColor: showOnlyFavorites ? 'rgba(251, 191, 36, 0.2)' : colors.cardLight, borderColor: 'transparent', color: colors.text}}
                             >
                                <StarIcon className="w-5 h-5" isFavorite={showOnlyFavorites} color={colors.textMuted} />
                                {showOnlyFavorites ? 'Showing Favorites' : 'Show Favorites'}
                             </button>
                         </div>
                     </div>
                     <div className="relative flex-grow h-[75vh]">
                         {isInitialLoading ? (
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: colors.primary}}></div>
                             </div>
                         ) : (
                         <>
                             <div className="h-full overflow-y-auto custom-scrollbar" style={{'--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card}}>
                                 <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-2">
                                     {displayedPokemons.map((pokemon, index) => (
                                         <PokemonCard 
                                             key={pokemon.id} 
                                             details={pokemon} 
                                             onCardClick={showDetails} 
                                             lastRef={index === displayedPokemons.length - 1 ? lastPokemonElementRef : null} 
                                             colors={colors}
                                             isFavorite={favoritePokemons.has(pokemon.id)}
                                             onToggleFavorite={onToggleFavoritePokemon}
                                         />
                                     ))}
                                 </div>
                                 {isFetchingMore && <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: colors.primary}}></div></div>}
                                 {displayedPokemons.length === 0 && !isInitialLoading && (
                                     <EmptyState
                                         compact
                                         title={showOnlyFavorites ? 'No favorites match' : 'Nothing here'}
                                         message={showOnlyFavorites ? 'Try clearing filters or favoriting more Pokémon.' : 'Try a different search or filter combination.'}
                                     />
                                 )}
                             </div>
                         </>)}
                     </div>
                 </section>
             </div>

             <div className="lg:col-span-3 space-y-8">
                 <section className="p-6 rounded-xl shadow-lg" style={{backgroundColor: colors.card}}>
                     <h3 className="text-sm md:text-base font-bold mb-3 text-center uppercase tracking-wider" style={{color: colors.text}}>Filter by Type</h3>
                     <div className="grid grid-cols-5 lg:grid-cols-5 gap-1.5">
                         {Object.keys(typeColors).map(type => (
                             <button key={type} onClick={() => handleTypeSelection(type)} className={`p-1.5 rounded-lg bg-transparent transition-colors hover:opacity-75 ${selectedTypes.has(type) ? 'ring-2 ring-primary' : ''}`} style={{backgroundColor: colors.cardLight}} title={type}>
                                 <img src={typeIcons[type]} alt={type} className="w-full h-full object-contain" />
                             </button>
                         ))}
                     </div>
                 </section>
             </div>
        </main>
    )
};

// Favorite Pokemons View
const FavoritePokemonsView = ({
    allPokemons,
    favoritePokemons,
    onToggleFavoritePokemon,
    showDetails,
    colors,
    onAddToTeam,
    isLoading
}) => {
    const [searchInput, setSearchInput] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    
    // Get favorite pokemon data from all pokemons
    const favoritePokemonsList = useMemo(() => {
        return allPokemons.filter(p => favoritePokemons.has(p.id));
    }, [allPokemons, favoritePokemons]);
    
    // Apply filters
    const filteredFavorites = useMemo(() => {
        let filtered = favoritePokemonsList;
        
        if (searchInput) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchInput.toLowerCase())
            );
        }
        
        if (selectedType !== 'all') {
            filtered = filtered.filter(p => p.types.includes(selectedType));
        }
        
        return filtered;
    }, [favoritePokemonsList, searchInput, selectedType]);

    return (
        <main className="space-y-6">
            <section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: colors.card }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: colors.text }}>
                            Favorite Pokémon
                        </h2>
                        <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                            {favoritePokemons.size} Pokémon saved as favorites
                        </p>
                    </div>
                </div>
                
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <input 
                        type="text" 
                        placeholder="Search favorites..." 
                        value={searchInput} 
                        onChange={(e) => setSearchInput(e.target.value)} 
                        className="w-full p-3 rounded-lg border-2 focus:outline-none" 
                        style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}
                    />
                    <select 
                        value={selectedType} 
                        onChange={e => setSelectedType(e.target.value)} 
                        className="w-full p-3 rounded-lg border-2 focus:outline-none appearance-none capitalize" 
                        style={{backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text}}
                    >
                        <option value="all">All Types</option>
                        {Object.keys(typeColors).map(type => (
                            <option key={type} value={type} className="capitalize">{type}</option>
                        ))}
                    </select>
                </div>
                
                {/* Pokemon Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: colors.primary}}></div>
                    </div>
                ) : filteredFavorites.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                        {filteredFavorites.map(pokemon => (
                            <PokemonCard 
                                key={pokemon.id} 
                                details={pokemon} 
                                onCardClick={showDetails} 
                                colors={colors}
                                isFavorite={true}
                                onToggleFavorite={onToggleFavoritePokemon}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="mb-4">
                            <StarIcon className="w-16 h-16 mx-auto" isFavorite={false} color={colors.textMuted} />
                        </div>
                        <h3 className="text-xl font-bold mb-2" style={{ color: colors.text }}>
                            {favoritePokemons.size === 0 ? 'No favorites yet!' : 'No matches found'}
                        </h3>
                        <p style={{ color: colors.textMuted }}>
                            {favoritePokemons.size === 0 
                                ? 'Start adding Pokémon to your favorites by clicking the star icon on any Pokémon card.'
                                : 'Try adjusting your search or filter criteria.'}
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
};

// ============================================
// HOME VIEW 
// ============================================

const HomeView = ({
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
    onNavigateWithTypeFilter
}) => {
    const [greetingPokemonData, setGreetingPokemonData] = useState(null);
    const [isDailyPokemonLoading, setIsDailyPokemonLoading] = useState(true);
    
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            return { text: "Good morning", emoji: "☀️", pokemon: "espeon", period: "morning" };
        } else if (hour >= 12 && hour < 18) {
            return { text: "Good afternoon", emoji: "🌤️", pokemon: "pikachu", period: "afternoon" };
        } else {
            return { text: "Good evening", emoji: "🌙", pokemon: "umbreon", period: "night" };
        }
    };
    const greeting = getGreeting();
    
    // Fetch greeting Pokemon data from Firestore
    useEffect(() => {
        const fetchGreetingPokemon = async () => {
            if (!db || !greetingPokemonId) {
                // Use default Pokemon if no custom selection
                const defaultNames = {
                    morning: 'espeon',
                    afternoon: 'pikachu',
                    night: 'umbreon'
                };
                const defaultPokemon = allPokemons.find(p => p.name === defaultNames[greeting.period]);
                setGreetingPokemonData(defaultPokemon || null);
                return;
            }
            
            try {
                const docRef = doc(db, 'artifacts/pokemonTeamBuilder/pokemons', String(greetingPokemonId));
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setGreetingPokemonData(docSnap.data());
                } else {
                    // Fallback to finding in loaded Pokemon
                    const fallback = allPokemons.find(p => p.id === greetingPokemonId);
                    setGreetingPokemonData(fallback || null);
                }
            } catch (error) {
                console.error('Error fetching greeting Pokemon:', error);
                // Fallback to loaded Pokemon
                const fallback = allPokemons.find(p => p.id === greetingPokemonId);
                setGreetingPokemonData(fallback || null);
            }
        };
        
        fetchGreetingPokemon();
    }, [db, greetingPokemonId, allPokemons, greeting.period]);

    // daily pokemon
    const getPokemonOfTheDay = () => {
        if (!allPokemons || allPokemons.length === 0) {
            return null;
        }
        
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        
        const seed = dayOfYear;
        const random = ((seed * 9301 + 49297) % 233280) / 233280; 
        const index = Math.floor(random * allPokemons.length);
        
        return allPokemons[index] || allPokemons[0];
    };
    const pokemonOfTheDay = getPokemonOfTheDay();
    
    useEffect(() => {
        if (allPokemons && allPokemons.length > 0) {
            setIsDailyPokemonLoading(false);
        } else {
            setIsDailyPokemonLoading(true);
        }
    }, [allPokemons]);

    // daily tip
    const getTipOfTheDay = () => {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        return POKEMON_TIPS[dayOfYear % POKEMON_TIPS.length];
    };
    const tipOfTheDay = getTipOfTheDay();

    // trainer stats
    const getTrainerStats = () => {
        const allPokemonsInTeams = savedTeams.flatMap(t => t.pokemons);
        const typeCounts = {};
        
        allPokemonsInTeams.forEach(p => {
            const pokemon = allPokemons.find(ap => ap.id === p.id);
            if (pokemon?.types) {
                pokemon.types.forEach(type => {
                    typeCounts[type] = (typeCounts[type] || 0) + 1;
                });
            }
        });

        const favoriteType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
        
        return {
            totalTeams: savedTeams.length,
            favoriteTeams: savedTeams.filter(t => t.isFavorite).length,
            totalFavoritePokemons: favoritePokemons.size,
            favoriteType: favoriteType ? favoriteType[0] : null
        };
    };
    const stats = getTrainerStats();

    // favorites
    const featuredFavorites = useMemo(() => {
        return allPokemons.filter(p => favoritePokemons.has(p.id)).slice(0, 6);
    }, [allPokemons, favoritePokemons]);

    // last edited team
    const lastEditedTeam = recentTeams[0];
    
    const pokemonPrimaryColor = pokemonOfTheDay?.types?.[0] ? typeColors[pokemonOfTheDay.types[0]] : colors.primary;
    const pokemonSecondaryColor = pokemonOfTheDay?.types?.[1] ? typeColors[pokemonOfTheDay.types[1]] : pokemonPrimaryColor;
    
    const greetingPokemonColor = greetingPokemonData?.types?.[0] ? typeColors[greetingPokemonData.types[0]] : colors.primary;
    const greetingPokemonSecondaryColor = greetingPokemonData?.types?.[1] ? typeColors[greetingPokemonData.types[1]] : greetingPokemonColor;
    
    // Pokemon-themed motivational messages
    const motivationalMessages = [
        "Ready to be the very best!",
        "Your journey awaits, Trainer!",
        "Let's catch 'em all today!",
        "Adventure is out there!",
        "Time to build your dream team!",
        "Every Pokémon is unique!",
        "Gotta catch 'em all!",
        "Explore new possibilities!",
    ];
    const randomMessage = useMemo(() => {
        const today = new Date();
        const seed = today.getDate() + today.getMonth();
        return motivationalMessages[seed % motivationalMessages.length];
    }, []);

    return (
        <main className="space-y-6 pb-8">
            {/* Hero row — greeting + primary CTA share one responsive row.
                Mobile: stacked. lg+: 6/6 split (greeting compact, CTA wider). */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                {/* Greeting card — compact, partner-themed, no oversized sprite */}
                <section
                    className="lg:col-span-6 relative overflow-hidden rounded-2xl p-6 elevation-1 flex flex-col justify-between min-h-[220px]"
                    style={{
                        background: `linear-gradient(135deg, ${greetingPokemonColor}28 0%, ${greetingPokemonSecondaryColor}12 55%, ${colors.card} 100%)`,
                        border: `1px solid ${greetingPokemonColor}40`,
                    }}
                    aria-label="Trainer greeting"
                >
                    {/* faint background partner sprite */}
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

                    {/* Partner chip — pinned to the bottom so card heights match the CTA card */}
                    {greetingPokemonData && (
                        <div className="relative z-10 mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm self-start max-w-full"
                             style={{ backgroundColor: greetingPokemonColor + '22' }}>
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
                                    {greetingPokemonData.types.map(type => (
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

                {/* Primary CTA — continue last team OR build first team */}
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
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEditTeam(lastEditedTeam); } }}
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
                                {lastEditedTeam.pokemons.slice(0, 6).map((p, i) => (
                                    <img
                                        key={i}
                                        src={p.sprite || POKEBALL_PLACEHOLDER_URL}
                                        alt={p.name}
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

            {/* main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* left column */}
                <div className="lg:col-span-2 space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* daily mon */}
                    {isDailyPokemonLoading ? (
                        <section
                            className="rounded-2xl w-full p-6 relative overflow-hidden animate-pulse elevation-1 bg-surface"
                        >
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
                    ) : pokemonOfTheDay && (
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
                                        {pokemonOfTheDay.types?.map(type => (
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
                    )}

                    {/* daily tip */}
                    <section
                        className="rounded-2xl w-full p-7 elevation-1 bg-surface"
                    >
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                            Did you know?
                        </h3>
                        <p className="text-normal leading-relaxed" style={{ color: colors.textMuted }}>
                            {tipOfTheDay}
                        </p>
                    </section>
                    </div>

                    {/* quick options */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: <SwordsIcon />, label: "Create Team", path: "/builder", color: "#7d65e1" },
                            { icon: <PokeballIcon />, label: "Pokédex", path: "/pokedex", color: "#EE8130" },
                            { icon: <DiceIcon />, label: "Random", path: "/generator", color: "#6390F0" },
                            { icon: <StarIcon className="w-6 h-6" isFavorite={true} color="#FBBF24" />, label: "Favorites", path: "/favorites", color: "#FBBF24" }
                        ].map((shortcut, index) => (
                            <button
                                key={index}
                                onClick={() => navigate(shortcut.path)}
                                className="p-4 rounded-xl flex flex-col items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                                style={{ 
                                    backgroundColor: colors.card, 
                                    border: `2px solid ${shortcut.color}20`,
                                    boxShadow: theme === 'light' ? '0 2px 4px -1px rgba(0, 0, 0, 0.08)' : 'none'
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

                    {/* favorites */}
                    <section
                        className="rounded-2xl p-6 elevation-1 bg-surface"
                    >
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
                                {featuredFavorites.map(pokemon => (
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

                {/* right column */}
                <div className="space-y-6">
                    
                    {/* trainer stats */}
                    <section
                        className="rounded-2xl p-6 elevation-1 bg-surface"
                    >
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
                                    <p className="text-2xl font-bold" style={{ color: '#FBBF24' }}>{stats.favoriteTeams}</p>
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
                            <EmptyState
                                compact
                                title="No teams yet!"
                                message="Create your first team to start tracking stats."
                                action={{ label: 'Build a team', onClick: () => navigate('/builder') }}
                            />
                        )}
                    </section>

                    {/* last edited team — promoted to hero CTA at top of page */}

                    {/* explore by type */}
                    <section
                        className="rounded-2xl p-4 elevation-1 bg-surface"
                    >
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                            Explore by types
                        </h3>
                        <div className="grid grid-cols-9 gap-1.5">
                            {Object.entries(typeColors).map(([type, color]) => (
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
};

// Pokemon Random Generator Data — moved to ./constants/pokemon.js

const RandomGeneratorView = ({ colors, generations }) => {
    const [generatedPokemon, setGeneratedPokemon] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingAllIds, setIsLoadingAllIds] = useState(false);
    const [allPokemonIds, setAllPokemonIds] = useState([]);
    const [pokemonCount, setPokemonCount] = useState(3);
    const [selectedRegion, setSelectedRegion] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [legendaryFilter, setLegendaryFilter] = useState('all');
    const [fullyEvolvedFilter, setFullyEvolvedFilter] = useState('all');
    const [formsFilter, setFormsFilter] = useState('all');
    const [evolutionCache, setEvolutionCache] = useState({});

    const getGenerationName = (id) => {
        for (const [gen, range] of Object.entries(GENERATION_RANGES)) {
            if (gen !== 'all' && id >= range.start && id <= range.end) {
                return gen.replace('generation-', 'Gen ').toUpperCase();
            }
        }
        return 'Unknown';
    };

    const fetchEvolutionChain = useCallback(async (evolutionChainUrl, targetPokemonId = null) => {
        try {
            const cacheKey = targetPokemonId ? `${evolutionChainUrl}_${targetPokemonId}` : evolutionChainUrl;
            
            if (evolutionCache[cacheKey]) {
                return evolutionCache[cacheKey];
            }

            const evoRes = await fetch(evolutionChainUrl);
            const evoData = await evoRes.json();
            
            // Eevee and its evolutions list (IDs: 133-136, 196-197, 470-471, 700)
            const EEVEE_FAMILY = [133, 134, 135, 136, 196, 197, 470, 471, 700];
            
            const evolutions = [];
            
            // Check if this is Eevee family and we have a target Pokemon
            const isEeveeFamily = targetPokemonId && EEVEE_FAMILY.includes(parseInt(targetPokemonId));
            
            if (isEeveeFamily) {
                // Special handling for Eevee family: only show linear path
                const findPathToTarget = (chain, targetId, path = []) => {
                    const speciesId = chain.species.url.split('/').filter(Boolean).pop();
                    const currentPath = [...path, {
                        name: chain.species.name,
                        id: speciesId,
                        chain: chain
                    }];
                    
                    // If we found the target, return the path
                    if (parseInt(speciesId) === parseInt(targetId)) {
                        return currentPath;
                    }
                    
                    // Search in evolves_to branches
                    if (chain.evolves_to && chain.evolves_to.length > 0) {
                        for (const evo of chain.evolves_to) {
                            const result = findPathToTarget(evo, targetId, currentPath);
                            if (result) return result;
                        }
                    }
                    
                    return null;
                };
                
                const pathToTarget = findPathToTarget(evoData.chain, targetPokemonId);
                
                if (pathToTarget) {
                    pathToTarget.forEach((node, index) => {
                        const id = parseInt(node.id);
                        let genIntroduced = 'Unknown';
                        
                        for (const [gen, range] of Object.entries(GENERATION_RANGES)) {
                            if (gen !== 'all' && id >= range.start && id <= range.end) {
                                genIntroduced = gen.replace('generation-', 'Gen ').toUpperCase();
                                break;
                            }
                        }
                        
                        evolutions.push({
                            name: node.name,
                            id: node.id,
                            stage: index + 1,
                            genIntroduced: genIntroduced,
                            evolutionDetails: node.chain.evolution_details?.[0] || null
                        });
                    });
                }
            } else {
                // Normal processing for non-Eevee Pokemon
                const processChain = (chain, stage = 1) => {
                    const speciesId = chain.species.url.split('/').filter(Boolean).pop();
                    let genIntroduced = 'Unknown';
                    
                    // Determine generation based on ID
                    const id = parseInt(speciesId);
                    for (const [gen, range] of Object.entries(GENERATION_RANGES)) {
                        if (gen !== 'all' && id >= range.start && id <= range.end) {
                            genIntroduced = gen.replace('generation-', 'Gen ').toUpperCase();
                            break;
                        }
                    }

                    evolutions.push({
                        name: chain.species.name,
                        id: speciesId,
                        stage: stage,
                        genIntroduced: genIntroduced,
                        evolutionDetails: chain.evolution_details?.[0] || null
                    });
                    
                    if (chain.evolves_to && chain.evolves_to.length > 0) {
                        chain.evolves_to.forEach(evo => processChain(evo, stage + 1));
                    }
                };
                
                processChain(evoData.chain);
            }
            
            setEvolutionCache(prev => ({
                ...prev,
                [cacheKey]: evolutions
            }));
            
            return evolutions;
        } catch (error) {
            console.error('Error fetching evolution chain:', error);
            return [];
        }
    }, [evolutionCache]);

    const fetchPokemonForms = useCallback(async (pokemonId, speciesUrl) => {
        try {
            const speciesRes = await fetch(speciesUrl);
            const speciesData = await speciesRes.json();
            
            const forms = await Promise.all(
                speciesData.varieties
                    .filter(v => !v.is_default)
                    .slice(0, 5) // Limit to 5 forms for performance
                    .map(async (variety) => {
                        try {
                            const formRes = await fetch(variety.pokemon.url);
                            const formData = await formRes.json();
                            return {
                                name: variety.pokemon.name,
                                sprite: formData.sprites.front_default || formData.sprites.other?.['official-artwork']?.front_default
                            };
                        } catch {
                            return null;
                        }
                    })
            );
            
            return forms.filter(Boolean);
        } catch (error) {
            console.error('Error fetching forms:', error);
            return [];
        }
    }, []);

    const fetchFullPokemonData = useCallback(async (pokemonId) => {
        try {
            const [pokemonRes, speciesRes] = await Promise.all([
                fetch(`${POKEAPI_BASE_URL}/pokemon/${pokemonId}`),
                fetch(`${POKEAPI_BASE_URL}/pokemon-species/${pokemonId}`)
            ]);
            
            const pokemonData = await pokemonRes.json();
            const speciesData = await speciesRes.json();
            
            const evolutions = await fetchEvolutionChain(speciesData.evolution_chain.url, pokemonId);
            const forms = await fetchPokemonForms(pokemonId, `${POKEAPI_BASE_URL}/pokemon-species/${pokemonId}`);
            
            // Determine evolution stage
            const currentEvo = evolutions.find(e => parseInt(e.id) === pokemonId);
            const evolutionStage = currentEvo?.stage || 1;
            const isFullyEvolved = !evolutions.some(e => e.stage > evolutionStage);
            
            // Random nature if needed
            const randomNature = NATURES_LIST[Math.floor(Math.random() * NATURES_LIST.length)];
            
            // Random gender
            const genderRate = speciesData.gender_rate;
            let gender = 'Genderless';
            if (genderRate === -1) {
                gender = 'Genderless';
            } else if (genderRate === 0) {
                gender = 'Male';
            } else if (genderRate === 8) {
                gender = 'Female';
            } else {
                gender = Math.random() < (genderRate / 8) ? 'Female' : 'Male';
            }

            return {
                id: pokemonData.id,
                name: pokemonData.name,
                types: pokemonData.types.map(t => t.type.name),
                sprite: pokemonData.sprites.other?.['official-artwork']?.front_default || pokemonData.sprites.front_default,
                shinySprite: pokemonData.sprites.other?.['official-artwork']?.front_shiny || pokemonData.sprites.front_shiny,
                height: pokemonData.height / 10, // Convert to meters
                weight: pokemonData.weight / 10, // Convert to kg
                generation: getGenerationName(pokemonData.id),
                stats: pokemonData.stats.map(s => ({ name: s.stat.name, base_stat: s.base_stat })),
                abilities: pokemonData.abilities.map(a => a.ability.name),
                evolutions: evolutions,
                evolutionStage: evolutionStage,
                isFullyEvolved: isFullyEvolved,
                forms: forms,
                isLegendary: speciesData.is_legendary,
                isMythical: speciesData.is_mythical,
                habitat: speciesData.habitat?.name || 'Unknown',
                nature: randomNature,
                gender: gender,
                baseHappiness: speciesData.base_happiness,
                captureRate: speciesData.capture_rate,
                growthRate: speciesData.growth_rate?.name || 'Unknown'
            };
        } catch (error) {
            console.error(`Error fetching Pokemon ${pokemonId}:`, error);
            return null;
        }
    }, [fetchEvolutionChain, fetchPokemonForms]);

    const loadAllPokemonIds = useCallback(async () => {
        if (allPokemonIds.length > 0) return allPokemonIds;

        setIsLoadingAllIds(true);
        try {
            // Pull full pokemon index from PokéAPI so "All Regions" includes
            // forms/entries with IDs above 1025 (e.g. mega evolutions).
            const response = await fetch(`${POKEAPI_BASE_URL}/pokemon?limit=20000`);
            const data = await response.json();

            const ids = (data.results || [])
                .map((entry) => {
                    const parts = entry.url.split('/').filter(Boolean);
                    return Number(parts[parts.length - 1]);
                })
                .filter((id) => Number.isInteger(id) && id > 0);

            const uniqueSortedIds = Array.from(new Set(ids)).sort((a, b) => a - b);
            setAllPokemonIds(uniqueSortedIds);
            return uniqueSortedIds;
        } catch (error) {
            console.error('Error loading full Pokemon index:', error);
            return [];
        } finally {
            setIsLoadingAllIds(false);
        }
    }, [allPokemonIds]);

    const generateRandomPokemon = useCallback(async () => {
        setIsLoading(true);
        setGeneratedPokemon([]);
        
        try {
            // Build the pool of valid Pokemon IDs
            let validIds = [];
            if (selectedRegion === 'all') {
                validIds = await loadAllPokemonIds();
            } else {
                const range = GENERATION_RANGES[selectedRegion] || GENERATION_RANGES['all'];
                for (let id = range.start; id <= range.end; id++) {
                    validIds.push(id);
                }
            }

            if (validIds.length === 0) {
                setGeneratedPokemon([]);
                return;
            }
            
            // Filter by legendary status
            if (legendaryFilter === 'legendary') {
                validIds = validIds.filter(id => LEGENDARY_IDS.has(id));
            } else if (legendaryFilter === 'non-legendary') {
                validIds = validIds.filter(id => !LEGENDARY_IDS.has(id));
            }
            
            // Shuffle and pick random IDs
            const shuffled = validIds.sort(() => Math.random() - 0.5);
            const selectedIds = shuffled.slice(0, Math.min(pokemonCount, validIds.length));
            
            // Fetch full data for selected Pokemon
            const pokemonPromises = selectedIds.map(id => fetchFullPokemonData(id));
            let results = await Promise.all(pokemonPromises);
            results = results.filter(Boolean);
            
            // Apply type filter
            if (selectedType !== 'all') {
                results = results.filter(p => p.types.includes(selectedType));
                // If we filtered out too many, fetch more
                if (results.length < pokemonCount) {
                    const remaining = pokemonCount - results.length;
                    const moreIds = shuffled.slice(pokemonCount, pokemonCount + remaining * 3);
                    const moreResults = await Promise.all(moreIds.map(id => fetchFullPokemonData(id)));
                    const filtered = moreResults.filter(p => p && p.types.includes(selectedType));
                    results = [...results, ...filtered].slice(0, pokemonCount);
                }
            }
            
            // Apply fully evolved filter
            if (fullyEvolvedFilter === 'fully-evolved') {
                results = results.filter(p => p.isFullyEvolved);
            } else if (fullyEvolvedFilter === 'not-fully-evolved') {
                results = results.filter(p => !p.isFullyEvolved);
            }
            
            setGeneratedPokemon(results);
        } catch (error) {
            console.error('Error generating Pokemon:', error);
        } finally {
            setIsLoading(false);
        }
    }, [pokemonCount, selectedRegion, selectedType, legendaryFilter, fullyEvolvedFilter, fetchFullPokemonData, loadAllPokemonIds]);

    // Generate on mount
    useEffect(() => {
        generateRandomPokemon();
    }, []);

    const PokemonDetailCard = ({ pokemon }) => {
        const [evoSprites, setEvoSprites] = useState({});
        const [loadingSprites, setLoadingSprites] = useState(true);
        
        // Fetch sprites for evolution chain
        useEffect(() => {
            const fetchEvoSprites = async () => {
                if (!pokemon.evolutions || pokemon.evolutions.length === 0) {
                    setLoadingSprites(false);
                    return;
                }
                setLoadingSprites(true);
                const sprites = {};
                try {
                    await Promise.all(
                        pokemon.evolutions.map(async (evo) => {
                            try {
                                const res = await fetch(`${POKEAPI_BASE_URL}/pokemon/${evo.id}`);
                                const data = await res.json();
                                sprites[evo.id] = data.sprites.front_default;
                            } catch (e) {
                                sprites[evo.id] = null;
                            }
                        })
                    );
                } catch (e) {
                    console.error('Error fetching evo sprites:', e);
                }
                setEvoSprites(sprites);
                setLoadingSprites(false);
            };
            fetchEvoSprites();
        }, [pokemon.evolutions]);

        const primaryType = pokemon.types[0];
        
        // Split evolutions into pre and post
        const currentIndex = pokemon.evolutions?.findIndex(evo => parseInt(evo.id) === pokemon.id) ?? -1;
        const preEvolutions = currentIndex > 0 ? pokemon.evolutions.slice(0, currentIndex) : [];
        const postEvolutions = currentIndex >= 0 && currentIndex < (pokemon.evolutions?.length - 1) 
            ? pokemon.evolutions.slice(currentIndex + 1) 
            : [];

        const EvolutionSprite = ({ evo, isCurrent = false }) => (
            <div className="flex flex-col items-center">
                <div 
                    className={`rounded-xl p-1 ${isCurrent ? '' : 'opacity-70'}`}
                    style={{ 
                        backgroundColor: isCurrent ? typeColors[primaryType] + '20' : 'transparent',
                        border: isCurrent ? `3px solid ${typeColors[primaryType]}` : '2px solid transparent'
                    }}
                >
                    {loadingSprites ? (
                        <div className={`${isCurrent ? 'w-24 h-24' : 'w-16 h-16'} rounded-full animate-pulse`} style={{ backgroundColor: colors.cardLight }}></div>
                    ) : (isCurrent ? pokemon.sprite : evoSprites[evo.id]) ? (
                        <img 
                            src={isCurrent ? pokemon.sprite : evoSprites[evo.id]} 
                            alt={evo.name} 
                            className={`${isCurrent ? 'w-24 h-24' : 'w-16 h-16'} object-contain`}
                        />
                    ) : (
                        <div className={`${isCurrent ? 'w-24 h-24' : 'w-16 h-16'} rounded-full flex items-center justify-center text-lg`} style={{ backgroundColor: colors.cardLight }}>?</div>
                    )}
                </div>
                <p className={`capitalize font-semibold mt-1 text-center truncate ${isCurrent ? 'text-sm max-w-[96px]' : 'text-[11px] max-w-[64px]'}`}
                   style={{ color: isCurrent ? typeColors[primaryType] : colors.textMuted }}>
                    {evo.name.replace(/-/g, ' ')}
                </p>
                {!isCurrent && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-medium mt-0.5"
                        style={{ backgroundColor: colors.cardLight, color: colors.textMuted }}>
                        {evo.genIntroduced}
                    </span>
                )}
            </div>
        );

        return (
            <div 
                className="group rounded-2xl overflow-hidden"
                style={{ 
                    backgroundColor: colors.card,
                    border: `3px solid ${typeColors[primaryType]}`
                }}
            >
                {/* Header with Evolution Chain */}
                <div className="relative p-4" style={{ backgroundColor: typeColors[primaryType] + '10' }}>
                    {/* Name & Info Row */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: colors.card, color: colors.textMuted }}>
                                #{String(pokemon.id).padStart(3, '0')}
                            </span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: typeColors[primaryType] + '30', color: typeColors[primaryType] }}>
                                {pokemon.generation}
                            </span>
                        </div>
                        <div className="flex gap-1.5">
                            {pokemon.types.map(type => (
                                <span 
                                    key={type} 
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase"
                                    style={{ backgroundColor: typeColors[type] }}
                                >
                                    {type}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    {/* Pokemon Name */}
                    <h3 className="text-lg font-bold capitalize text-center mb-3" style={{ color: colors.text }}>
                        {pokemon.name.replace(/-/g, ' ')}
                    </h3>
                    
                    {/* Evolution Chain in Header */}
                    <div className="flex items-center justify-center gap-2">
                        {/* Pre-evolutions (left side) */}
                        {preEvolutions.length > 0 && (
                            <>
                                <div className="flex items-center gap-1">
                                    {preEvolutions.map((evo, idx) => (
                                        <React.Fragment key={evo.id}>
                                            <EvolutionSprite evo={evo} isCurrent={false} />
                                            {idx < preEvolutions.length - 1 && (
                                                <span className="text-sm" style={{ color: colors.textMuted }}>→</span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                                <span className="text-lg mx-1" style={{ color: colors.textMuted }}>→</span>
                            </>
                        )}
                        
                        {/* Current Pokemon (center, larger) */}
                        {pokemon.evolutions && pokemon.evolutions.length > 0 ? (
                            <EvolutionSprite 
                                evo={pokemon.evolutions.find(e => parseInt(e.id) === pokemon.id) || { id: pokemon.id, name: pokemon.name }} 
                                isCurrent={true} 
                            />
                        ) : (
                            <div 
                                className="rounded-xl p-1"
                                style={{ 
                                    backgroundColor: typeColors[primaryType] + '20',
                                    border: `3px solid ${typeColors[primaryType]}`
                                }}
                            >
                                <img 
                                    src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL} 
                                    alt={pokemon.name}
                                    className="w-24 h-24 object-contain"
                                    onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                />
                            </div>
                        )}
                        
                        {/* Post-evolutions (right side) */}
                        {postEvolutions.length > 0 && (
                            <>
                                <span className="text-lg mx-1" style={{ color: colors.textMuted }}>→</span>
                                <div className="flex items-center gap-1">
                                    {postEvolutions.map((evo, idx) => (
                                        <React.Fragment key={evo.id}>
                                            <EvolutionSprite evo={evo} isCurrent={false} />
                                            {idx < postEvolutions.length - 1 && (
                                                <span className="text-sm" style={{ color: colors.textMuted }}>→</span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                
                {/* Content - Compact */}
                <div className="px-4 pb-4 pt-3 space-y-3">
                    {/* Height & Weight - Compact Row */}
                    <div className="flex gap-2">
                        <div className="flex-1 p-2.5 rounded-xl text-center" style={{ backgroundColor: colors.cardLight }}>
                            <p className="text-[9px] uppercase tracking-wider font-medium" style={{ color: colors.textMuted }}>Height</p>
                            <p className="text-base font-bold" style={{ color: colors.text }}>
                                {pokemon.height}<span className="text-xs font-normal opacity-60">m</span>
                            </p>
                        </div>
                        <div className="flex-1 p-2.5 rounded-xl text-center" style={{ backgroundColor: colors.cardLight }}>
                            <p className="text-[9px] uppercase tracking-wider font-medium" style={{ color: colors.textMuted }}>Weight</p>
                            <p className="text-base font-bold" style={{ color: colors.text }}>
                                {pokemon.weight}<span className="text-xs font-normal opacity-60">kg</span>
                            </p>
                        </div>
                    </div>
                    
                    {/* Habitat & Legendary Status - New Row */}
                    <div className="flex gap-2">
                        <div className="flex-1 p-2.5 rounded-xl text-center" style={{ backgroundColor: colors.cardLight }}>
                            <p className="text-[9px] uppercase tracking-wider font-medium" style={{ color: colors.textMuted }}>Habitat</p>
                            <p className="text-sm font-bold capitalize" style={{ color: colors.text }}>
                                {pokemon.habitat?.replace(/-/g, ' ') || 'Unknown'}
                            </p>
                        </div>
                        <div className="flex-1 p-2.5 rounded-xl text-center" style={{ backgroundColor: colors.cardLight }}>
                            <p className="text-[9px] uppercase tracking-wider font-medium" style={{ color: colors.textMuted }}>Status</p>
                            <p className="text-sm font-bold" style={{ 
                                color: pokemon.isLegendary ? '#FFD700' : pokemon.isMythical ? '#DA70D6' : colors.text 
                            }}>
                                {pokemon.isLegendary ? '⭐ Legendary' : pokemon.isMythical ? '✨ Mythical' : 'Regular'}
                            </p>
                        </div>
                    </div>
                    
                    {/* Forms - Compact */}
                    {pokemon.forms && pokemon.forms.length > 0 && (formsFilter === 'all' || formsFilter === 'with-forms') && (
                        <div className="p-3 rounded-xl" style={{ backgroundColor: colors.cardLight }}>
                            <p className="text-[9px] uppercase tracking-wider text-center mb-2 font-medium" style={{ color: colors.textMuted }}>
                                Forms ({pokemon.forms.length})
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {pokemon.forms.slice(0, 4).map(form => (
                                    <div key={form.name} className="text-center">
                                        {form.sprite && (
                                            <img src={form.sprite} alt={form.name} className="w-10 h-10 mx-auto"/>
                                        )}
                                        <p className="text-[9px] capitalize mt-0.5 max-w-[50px] truncate" style={{ color: colors.text }}>
                                            {form.name.replace(pokemon.name + '-', '').replace(/-/g, ' ')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Abilities - Compact */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: colors.cardLight }}>
                        <p className="text-[9px] uppercase tracking-wider text-center mb-2 font-medium" style={{ color: colors.textMuted }}>
                            Abilities
                        </p>
                        <div className="flex flex-wrap justify-center gap-1.5">
                            {pokemon.abilities.map((ability, idx) => (
                                <span 
                                    key={ability} 
                                    className="text-[11px] px-2.5 py-1 rounded-full capitalize font-medium"
                                    style={{ backgroundColor: idx === 0 ? typeColors[primaryType] : colors.card, color: idx === 0 ? 'white' : colors.text }}
                                >
                                    {ability.replace(/-/g, ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <main className="space-y-6">
            {/* Filters Section */}
            <section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: colors.card }}>
                <h2 className="text-xl md:text-2xl font-bold mb-4" style={{ color: colors.text }}>
                    Random Pokémon Generator
                </h2>
                
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-sm whitespace-nowrap" style={{ color: colors.text }}>Generate</label>
                        <select 
                            value={pokemonCount} 
                            onChange={(e) => setPokemonCount(parseInt(e.target.value))}
                            className="w-16 p-2 rounded-lg"
                            style={{ backgroundColor: colors.cardLight, color: colors.text }}
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <span className="text-sm" style={{ color: colors.text }}>Pokémon</span>
                    </div>
                    
                    <select 
                        value={selectedRegion} 
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        className="p-2 rounded-lg capitalize"
                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                    >
                        <option value="all">All Regions</option>
                        {Object.keys(GENERATION_RANGES).filter(g => g !== 'all').map(gen => (
                            <option key={gen} value={gen} className="capitalize">
                                {gen.replace('generation-', 'Gen ').replace('-', ' ')}
                            </option>
                        ))}
                    </select>
                    
                    <select 
                        value={selectedType} 
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="p-2 rounded-lg capitalize"
                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                    >
                        <option value="all">All Types</option>
                        {Object.keys(typeColors).map(type => (
                            <option key={type} value={type} className="capitalize">{type}</option>
                        ))}
                    </select>
                    
                    <select 
                        value={legendaryFilter} 
                        onChange={(e) => setLegendaryFilter(e.target.value)}
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                    >
                        <option value="all">All Legendaries</option>
                        <option value="legendary">Legendaries Only</option>
                        <option value="non-legendary">No Legendaries</option>
                    </select>
                    
                    <select 
                        value={fullyEvolvedFilter} 
                        onChange={(e) => setFullyEvolvedFilter(e.target.value)}
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                    >
                        <option value="all">Fully Evolved or Not</option>
                        <option value="fully-evolved">Fully Evolved Only</option>
                        <option value="not-fully-evolved">Not Fully Evolved</option>
                    </select>
                    
                    <select 
                        value={formsFilter} 
                        onChange={(e) => setFormsFilter(e.target.value)}
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                    >
                        <option value="all">All Forms</option>
                        <option value="with-forms">Show Forms</option>
                        <option value="no-forms">Hide Forms</option>
                    </select>
                    
                    <button 
                        onClick={generateRandomPokemon}
                        disabled={isLoading || isLoadingAllIds}
                        className="px-6 py-2 rounded-lg font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: colors.primary }}
                    >
                        {isLoading ? 'Generating...' : isLoadingAllIds ? 'Loading index...' : 'Generate'}
                    </button>
                </div>
            </section>
            
            {/* Results Section */}
            <section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: colors.card }}>
                {isLoading ? (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: pokemonCount }).map((_, i) => (
                            <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ backgroundColor: colors.cardLight }}>
                                <div className="h-40 relative" style={{ backgroundColor: colors.card }}>
                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="h-4 rounded w-2/3 mx-auto" style={{ backgroundColor: colors.card }}></div>
                                    <div className="flex gap-2 justify-center">
                                        <div className="h-6 w-16 rounded-full" style={{ backgroundColor: colors.card }}></div>
                                        <div className="h-6 w-16 rounded-full" style={{ backgroundColor: colors.card }}></div>
                                    </div>
                                    <div className="h-20 rounded" style={{ backgroundColor: colors.card }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : generatedPokemon.length > 0 ? (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {generatedPokemon.map(pokemon => (
                            <PokemonDetailCard key={pokemon.id} pokemon={pokemon} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        compact
                        title="Nothing rolled"
                        message="No Pokémon match the selected filters. Try loosening them."
                    />
                )}
            </section>
        </main>
    );
};

export default function App() {
    const AUTH_SPLASH_MESSAGES = [
        'Checking if you are who you say you are',
        'Verifying trainer credentials',
        'Confirming your identity with Professor Oak',
        'Making sure this trainer card is yours',
        'Securing your team data before we start',
    ];

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
    const [maxToasts, setMaxToasts] = useState(3);
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
            'profile': { title: 'Profile', icon: '', subtitle: 'Trainer card & preferences' }
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
        const fetchStaticData = async () => {
             try {
                const genRes = await fetch(`${POKEAPI_BASE_URL}/generation`);
                const genData = await genRes.json();
                setGenerations(genData.results.map(g => g.name));

                const itemRes = await fetch(`${POKEAPI_BASE_URL}/item?limit=2000`);
                const itemData = await itemRes.json();
                setItems(itemData.results);
                
                const natureRes = await fetch(`${POKEAPI_BASE_URL}/nature`);
                const natureData = await natureRes.json();
                setNatures(natureData.results);
             } catch (e) {
                showToast("Failed to load filter data.", "error");
             }
        }
        fetchStaticData();
    }, []);

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
    
    const allFilteredTeams = useMemo(() => {
        let teams = [...savedTeams].sort((a,b) => (b.isFavorite - a.isFavorite) || new Date(b.updatedAt || a.createdAt) - new Date(a.updatedAt || a.createdAt));
        if (teamSearchTerm) {
            teams = teams.filter(team => team.name.toLowerCase().includes(teamSearchTerm.toLowerCase()));
        }
        return teams;
    }, [savedTeams, teamSearchTerm]);
    
     const fetchPokemonDetails = useCallback(async (pokemonId) => {
        if (pokemonDetailsCache[pokemonId]) {
            return pokemonDetailsCache[pokemonId];
        }
        if (!db) return null;

        try {
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
    }, [db, showToast, sharedTeamLoaded, navigate]);

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
   const buildPokemonQuery = (isLoadMore = false) => {
        const genToUse = currentPage === 'pokedex' ? pokedexSelectedGeneration : selectedGeneration;
        const searchToUse = (currentPage === 'pokedex' ? debouncedPokedexSearchTerm : debouncedSearchTerm).toLowerCase();
        const typesToUse = Array.from(currentPage === 'pokedex' ? pokedexSelectedTypes : selectedTypes);

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

        if (isLoadMore && lastVisibleDoc) {
            constraints.push(startAfter(lastVisibleDoc));
        }

        constraints.push(limit(50));
        
        return query(q, ...constraints);
    };

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
    }, [
        db, isAuthReady, currentPage, 
        debouncedSearchTerm, selectedGeneration, JSON.stringify(Array.from(selectedTypes)), 
        debouncedPokedexSearchTerm, pokedexSelectedGeneration, JSON.stringify(Array.from(pokedexSelectedTypes))
    ]);

    const fetchMorePokemons = useCallback(async () => {
        if (isFetchingMore || !hasMore || !db || !lastVisibleDoc) return;

        setIsFetchingMore(true);
        const q = buildPokemonQuery(true);
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
    }, [isFetchingMore, hasMore, db, lastVisibleDoc, currentPage, selectedGeneration, debouncedSearchTerm, JSON.stringify(Array.from(selectedTypes)), pokedexSelectedGeneration, debouncedPokedexSearchTerm, JSON.stringify(Array.from(pokedexSelectedTypes))]);

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
            try { localStorage.setItem('theme', newTheme); } catch (_) {}
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
        try { localStorage.setItem('theme', nextTheme); } catch (_) {}
    }, []);

    const handleResetSyncPrompt = useCallback(() => {
        try { localStorage.removeItem('syncPromptDismissed'); } catch (_) {}
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
                        try { localStorage.setItem('greetingPokemon', String(data.greetingPokemonId)); } catch (_) {}
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
                            try { localStorage.setItem('trainerStreak', JSON.stringify(merged)); } catch (_) {}
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
            { displayName, greetingPokemonId, streak, updatedAt: Date.now() },
            { merge: true }
        ).catch(() => { /* best-effort */ });
    }, [db, userId, displayName, greetingPokemonId, streak]);

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
            try { localStorage.setItem('trainerStreak', JSON.stringify(next)); } catch (_) {}
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
                    />
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
        {modalPokemon && <PokemonDetailModal pokemon={modalPokemon} onClose={() => setModalPokemon(null)} onAdd={currentPage === 'builder' ? handleAddPokemonToTeam : null} currentTeam={currentTeam} colors={colors} showPokemonDetails={showDetails} pokemonDetailsCache={pokemonDetailsCache} db={db} isFavorite={favoritePokemons.has(modalPokemon.id)} onToggleFavorite={handleToggleFavoritePokemon} />}
        {editingTeamMember && <TeamPokemonEditorModal pokemon={editingTeamMember} onClose={() => setEditingTeamMember(null)} onSave={handleUpdateTeamMember} colors={colors} items={items} natures={natures} moveDetailsCache={moveDetailsCache}/>}
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
                    borderRight: theme === 'light' ? '1px solid #E5E7EB' : 'none'
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
                        <button onClick={() => { navigate('/'); setIsSidebarOpen(false); }} className={`nav-item w-full p-3 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'home' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'home' ? 'white' : colors.text}}>
                          <span className="nav-icon"><HomeIcon /></span>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Home</span>
                        </button>
                      </li>
                      <li className="mt-2">
                        <button onClick={() => { navigate('/builder'); setIsSidebarOpen(false); }} className={`nav-item w-full p-3 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'builder' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'builder' ? 'white' : colors.text}}>
                          <span className="nav-icon"><SwordsIcon /></span>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Team Builder</span>
                        </button>
                      </li>
                       <li className="mt-2">
                        <button onClick={() => { navigate('/pokedex'); setIsSidebarOpen(false); }} className={`nav-item w-full p-3 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'pokedex' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'pokedex' ? 'white' : colors.text}}>
                            <span className="nav-icon"><PokeballIcon /></span>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Pokédex</span>
                        </button>
                      </li>
                      <li className="mt-2">
                        <button onClick={() => { navigate('/generator'); setIsSidebarOpen(false); }} className={`nav-item w-full p-3 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'randomGenerator' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'randomGenerator' ? 'white' : colors.text}}>
                            <span className="nav-icon"><DiceIcon /></span>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Random Generator</span>
                        </button>
                      </li>
                      <li className="mt-2">
                        <button onClick={() => { navigate('/favorites'); setIsSidebarOpen(false); }} className={`nav-item w-full p-3 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'favorites' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'favorites' ? 'white' : colors.text}}>
                            <span className="nav-icon"><StarsIcon className="w-6 h-6 shrink-0" isFavorite={true} color={currentPage === 'favorites' ? 'white' : colors.text} /></span>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Favorites</span>
                        </button>
                      </li>
                      <li className="mt-2">
                        <button onClick={() => { navigate('/teams'); setIsSidebarOpen(false); }} className={`nav-item w-full p-3 mt-2 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'allTeams' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'allTeams' ? 'white' : colors.text}}>
                          <span className="nav-icon"><SavedTeamsIcon/></span>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Saved Teams</span>
                        </button>
                      </li>
                      <li className="mt-2">
                        <button onClick={() => { navigate('/profile'); setIsSidebarOpen(false); }} className={`nav-item w-full p-3 rounded-lg font-bold flex items-center transition-colors ${currentPage === 'profile' ? 'is-active' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`} style={{color: currentPage === 'profile' ? 'white' : colors.text}}>
                          <span className="nav-icon"><TrainerAvatar pokemonId={greetingPokemonId} color={currentPage === 'profile' ? 'white' : colors.text} /></span>
                          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-0 lg:ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>Profile</span>
                        </button>
                      </li>
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
                        borderBottom: theme === 'light' ? '1px solid #E5E7EB' : 'none'
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
                        <FooterFeedback db={db} userId={userId} colors={colors} showToast={showToast} />
                    </p>

                <div className="flex justify-center gap-4 mt-4">
                        <a href="https://github.com/ensinho" target="_blank" rel="noopener noreferrer" className="hover:opacity-80" style={{color: colors.textMuted}}><GithubIcon color={colors.textMuted} /></a>
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
