// Icon library — every glyph the app draws that is not a Pokémon asset.
//
// One family: Lucide, at its native 24-box and 2px stroke. This file used to mix
// four — Heroicons v1 outline, Heroicons v1 *solid* 20px (trash, clear, plus,
// info, edit), Tabler, and Lucide — so a solid trash can sat beside an outlined
// pencil in the same toolbar, and the set never read as one hand. The exported
// names and props are unchanged, so no call site had to move; the wrappers only
// pin each icon's historical default size.
//
// Brand marks (GitHub, LinkedIn, Showdown) and the app's own glyphs Lucide has
// no equivalent for (Poké Ball, three stars, flower) stay hand-drawn below, on
// the same 24-box and stroke so they sit in the family.
//
// Size with a className (`w-4 h-4`), colour with `text-*` — every icon strokes
// in currentColor. The `color` prop survives for older call sites only.
import {
    ArrowUpDown,
    BadgeCheck,
    Calculator,
    ChartColumn,
    ChevronDown,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    CircleCheck,
    CircleUserRound,
    CircleX,
    Database,
    Dice4,
    Download,
    Gauge,
    Globe,
    Heart,
    House,
    Info,
    Layers,
    MapPin,
    Menu,
    MessageCircleMore,
    Moon,
    Paperclip,
    Plus,
    RefreshCw,
    Reply,
    Save,
    Scroll,
    Settings,
    Share2,
    ShoppingBag,
    Sparkles,
    SquarePen,
    Star,
    Sun,
    Swords,
    Trash2,
    TriangleAlert,
    Trophy,
    X,
} from 'lucide-react';

export const GithubIcon = ({ color }) => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={color ? { color } : undefined}>
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.492.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
    </svg>
);

export const LinkedinIcon = ({ color }) => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={color ? { color } : undefined}>
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
);

export const StarsIcon = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M17.8 19.817l-2.172 1.138a.392 .392 0 0 1 -.568 -.41l.415 -2.411l-1.757 -1.707a.389 .389 0 0 1 .217 -.665l2.428 -.352l1.086 -2.193a.392 .392 0 0 1 .702 0l1.086 2.193l2.428 .352a.39 .39 0 0 1 .217 .665l-1.757 1.707l.414 2.41a.39 .39 0 0 1 -.567 .411l-2.172 -1.138z" />
        <path d="M6.2 19.817l-2.172 1.138a.392 .392 0 0 1 -.568 -.41l.415 -2.411l-1.757 -1.707a.389 .389 0 0 1 .217 -.665l2.428 -.352l1.086 -2.193a.392 .392 0 0 1 .702 0l1.086 2.193l2.428 .352a.39 .39 0 0 1 .217 .665l-1.757 1.707l.414 2.41a.39 .39 0 0 1 -.567 .411l-2.172 -1.138z" />
        <path d="M12 9.817l-2.172 1.138a.392 .392 0 0 1 -.568 -.41l.415 -2.411l-1.757 -1.707a.389 .389 0 0 1 .217 -.665l2.428 -.352l1.086 -2.193a.392 .392 0 0 1 .702 0l1.086 2.193l2.428 .352a.39 .39 0 0 1 .217 .665l-1.757 1.707l.414 2.41a.39 .39 0 0 1 -.567 .411l-2.172 -1.138z" />
    </svg>
);

export const PokeballIcon = ({ className = 'w-6 h-6 shrink-0' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
        <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
        <path d="M3 12h6" />
        <path d="M15 12h6" />
    </svg>
);

export const ShowdownIcon = ({ className = 'w-6 h-6 shrink-0' }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        {/* Top half of Pokéball donut */}
        <path d="M 3.6 11 A 5.5 5.5 0 0 1 14.4 11 H 10.1 A 1.5 1.5 0 0 0 7.9 11 H 3.6 Z" />
        {/* Bottom half of Pokéball donut */}
        <path d="M 3.6 13 A 5.5 5.5 0 0 0 14.4 13 H 10.1 A 1.5 1.5 0 0 1 7.9 13 H 3.6 Z" />
        {/* Exclamation mark top bar */}
        <path d="M 18.5 3.5 H 21.5 L 18.5 15.5 H 15.5 Z" />
        {/* Exclamation mark bottom dot */}
        <path d="M 14.8 18.5 H 17.8 L 17 21.5 H 14 Z" />
    </svg>
);

export const FlowerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M16.956 2.057c.355 .124 .829 .375 1.303 .796a3.77 3.77 0 0 1 1.246 2.204c.173 .989 -.047 1.894 -.519 2.683l-.123 .194q -.097 .147 -.196 .272q .066 .234 .117 .471q .26 -.178 .545 -.307c.851 -.389 1.727 -.442 2.527 -.306q .226 .04 .346 .076a1 1 0 0 1 .689 .712l.029 .13q .015 .08 .03 .18a4.45 4.45 0 0 1 -.324 2.496a3.94 3.94 0 0 1 -1.71 1.85l-.242 .12a4.23 4.23 0 0 1 -2.234 .349a9 9 0 0 1 -.443 1.023c.37 .016 .748 .093 1.128 .24c.732 .28 1.299 .758 1.711 1.367a3.95 3.95 0 0 1 .654 1.613a1 1 0 0 1 -.356 .917a3.8 3.8 0 0 1 -.716 .443c-.933 .455 -1.978 .588 -3.043 .179l-.032 -.015l-.205 -.086a3.6 3.6 0 0 1 -1.33 -1.069l-.143 -.197a4 4 0 0 1 -.26 -.433a6 6 0 0 1 -.927 .511q .18 .262 .337 .56a7.4 7.4 0 0 1 .66 1.747a1 1 0 0 1 -1.95 .444l-.028 -.11a6 6 0 0 0 -.449 -1.143c-.342 -.645 -.71 -.968 -1.048 -.968s-.706 .323 -1.048 .969a5.6 5.6 0 0 0 -.367 .874l-.082 .269l-.028 .11a1 1 0 0 1 -1.95 -.444a7.3 7.3 0 0 1 .66 -1.747q .158 -.298 .337 -.561a6.4 6.4 0 0 1 -.93 -.508a4 4 0 0 1 -.256 .43c-.366 .541 -.855 .98 -1.473 1.267l-.238 .1c-.994 .382 -1.97 .292 -2.855 -.091l-.188 -.087a3.8 3.8 0 0 1 -.716 -.443a1 1 0 0 1 -.356 -.917a3.95 3.95 0 0 1 .654 -1.613a3.6 3.6 0 0 1 1.71 -1.368c.38 -.146 .758 -.223 1.13 -.24a9 9 0 0 1 -.445 -1.023a4.23 4.23 0 0 1 -2.233 -.348a4 4 0 0 1 -.916 -.587l-.207 -.191a4 4 0 0 1 -.724 -.977l-.105 -.216a4.45 4.45 0 0 1 -.265 -2.806a1 1 0 0 1 .69 -.712q .119 -.036 .345 -.076c.801 -.135 1.678 -.082 2.53 .308q .283 .129 .545 .304q .048 -.235 .112 -.47a5 5 0 0 1 -.194 -.272c-.556 -.832 -.83 -1.806 -.642 -2.877l.05 -.242a3.75 3.75 0 0 1 1.027 -1.803l.169 -.159a4 4 0 0 1 1.303 -.796a1 1 0 0 1 .975 .178c.2 .168 .462 .446 .719 .83c.556 .833 .83 1.807 .642 2.878a3.77 3.77 0 0 1 -1.246 2.204c-.303 .27 -.607 .47 -.879 .61a7.5 7.5 0 0 0 -.255 1.971c0 3.502 2.285 6.272 5 6.272s5 -2.77 5 -6.276a7.6 7.6 0 0 0 -.253 -1.967a4.3 4.3 0 0 1 -.881 -.61a3.77 3.77 0 0 1 -1.246 -2.204c-.188 -1.07 .086 -2.045 .642 -2.877c.257 -.385 .52 -.663 .72 -.831a1 1 0 0 1 .974 -.178" />
    </svg>
);

// Favourite star. Filled + warning-coloured when on; the colour is the theme's
// token, not a literal amber, so it holds contrast on the light themes too.
export const StarIcon = ({ className = 'w-6 h-6', isFavorite, color }) => (
    <Star
        className={className}
        fill={isFavorite ? 'currentColor' : 'none'}
        style={{ color: isFavorite ? 'var(--color-warning)' : color }}
        aria-hidden="true"
    />
);

export const TrashIcon = ({ className = 'h-5 w-5', color }) => (
    <Trash2 className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const ClearIcon = ({ className = 'h-5 w-5', color }) => (
    <X className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const SaveIcon = ({ className = 'h-5 w-5', color }) => (
    <Save className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const DownloadIcon = ({ className = 'w-5 h-5', color }) => (
    <Download className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const PlusIcon = ({ className = 'h-5 w-5', color }) => (
    <Plus className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const MenuIcon = ({ className = 'w-6 h-6', color }) => (
    <Menu className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const CloseIcon = ({ className = 'w-6 h-6', color }) => (
    <X className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const InfoIcon = ({ className = 'h-5 w-5', color }) => (
    <Info className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const SavedTeamsIcon = ({ className = 'w-6 h-6 shrink-0', color }) => (
    <Layers className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const AccountIcon = ({ className = 'w-6 h-6 shrink-0', color }) => (
    <CircleUserRound className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const CollapseLeftIcon = ({ className = 'w-6 h-6', color }) => (
    <ChevronsLeft className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const CollapseRightIcon = ({ className = 'w-6 h-6', color }) => (
    <ChevronsRight className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const ShareIcon = ({ className = 'h-5 w-5', color }) => (
    <Share2 className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const HeartIcon = ({ className = 'w-6 h-6 shrink-0', color }) => (
    <Heart className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const SuccessToastIcon = ({ className = 'w-6 h-6', color }) => (
    <BadgeCheck className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const CheckCircleIcon = ({ className = 'w-5 h-5', color }) => (
    <CircleCheck className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const XCircleIcon = ({ className = 'w-5 h-5', color }) => (
    <CircleX className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const AlertTriangleIcon = ({ className = 'w-5 h-5', color }) => (
    <TriangleAlert className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const InfoCircleIcon = ({ className = 'w-5 h-5', color }) => (
    <Info className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const SunIcon = ({ className = 'w-6 h-6', color }) => (
    <Sun className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const MoonIcon = ({ className = 'w-6 h-6', color }) => (
    <Moon className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const SwordsIcon = ({ className = 'w-4 h-4', color }) => (
    <Swords className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const EditIcon = ({ className = 'h-5 w-5', color }) => (
    <SquarePen className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const SparklesIcon = ({ className = 'w-6 h-6', color }) => (
    <Sparkles className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const DiceIcon = ({ className = 'w-6 h-6 shrink-0', color }) => (
    <Dice4 className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const HomeIcon = ({ className = 'w-6 h-6 shrink-0', color }) => (
    <House className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const RefreshIcon = ({ className = 'w-5 h-5', color }) => (
    <RefreshCw className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const ArrowUpDownIcon = ({ className = 'w-5 h-5', color }) => (
    <ArrowUpDown className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const ChartColumnIcon = ({ className = 'w-5 h-5', color }) => (
    <ChartColumn className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const HouseIcon = ({ className = 'w-5 h-5', color }) => (
    <House className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const MapPinIcon = ({ className = 'w-5 h-5 shrink-0', color }) => (
    <MapPin className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const SettingsIcon = ({ className = 'w-5 h-5', color }) => (
    <Settings className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const GlobeIcon = ({ className = 'w-5 h-5', color }) => (
    <Globe className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const MessageIcon = ({ className = 'w-6 h-6 shrink-0', color }) => (
    <MessageCircleMore className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const ReplyIcon = ({ className = 'w-5 h-5', color }) => (
    <Reply className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const ClipIcon = ({ className = 'w-5 h-5', color }) => (
    <Paperclip className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const DatabaseIcon = ({ className = 'w-6 h-6 shrink-0', color }) => (
    <Database className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const ScrollIcon = ({ className = 'w-6 h-6 shrink-0', color }) => (
    <Scroll className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const BagIcon = ({ className = 'w-6 h-6 shrink-0', color }) => (
    <ShoppingBag className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const TrophyIcon = ({ className = 'w-6 h-6 shrink-0', color }) => (
    <Trophy className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const CalculatorIcon = ({ className = 'w-6 h-6 shrink-0', color }) => (
    <Calculator className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const GaugeIcon = ({ className = 'w-6 h-6 shrink-0', color }) => (
    <Gauge className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const ChevronDownIcon = ({ className = 'w-5 h-5', color }) => (
    <ChevronDown className={className} color={color || 'currentColor'} aria-hidden="true" />
);

export const ChevronLeftIcon = ({ className = 'w-5 h-5', color }) => (
    <ChevronLeft className={className} color={color || 'currentColor'} aria-hidden="true" />
);
