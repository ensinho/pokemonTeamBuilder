import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Swords, Trophy, ChevronRight, Sparkles, X } from 'lucide-react';

import { typeColors, typeIcons } from '../../constants/types';
import { useGymLeaders } from '../../hooks/useGymLeaders';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { useModalA11y } from '../../hooks/useModalA11y';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { getGameLogo, getGameAccent } from '../../assets/gameLogos';
import '../../styles/game-cover.css';

const slugify = (name = '') => name.toLowerCase().trim().replace(/[.'’:]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
const pretty = (s = '') => s.replace(/-/g, ' ');
const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
const TRAINER_SPRITE_BASE = 'https://play.pokemonshowdown.com/sprites/trainers/';

// Gym game key → game-logo asset key (logos live under public games.json keys).
const LOGO_KEY = {
    'red-blue': 'red-blue-yellow', 'lets-go': 'lets-go',
    'gold-silver': 'gold-silver-crystal', 'heartgold-soulsilver': 'heartgold-soulsilver',
    'ruby-sapphire': 'ruby-sapphire-emerald', 'omega-ruby-alpha-sapphire': 'oras',
    'diamond-pearl': 'diamond-pearl-platinum', 'platinum': 'diamond-pearl-platinum',
    'brilliant-diamond-shining-pearl': 'bdsp',
    'black-white': 'black-white', 'black-white-2': 'black2-white2',
    'x-y': 'x-y', 'sun-moon': 'sun-moon', 'ultra-sun-ultra-moon': 'ultra-sun-ultra-moon',
    'sword-shield': 'sword-shield', 'scarlet-violet': 'scarlet-violet',
    'radical-red': 'red-blue-yellow', 'inclement-emerald': 'ruby-sapphire-emerald',
    'renegade-platinum': 'diamond-pearl-platinum', 'blaze-black': 'black-white',
};
const logoFor = (g) => getGameLogo(LOGO_KEY[g.key] || g.key);
const accentFor = (g) => getGameAccent(g.generation);

// A single selectable game cover (mirrors the Team Builder's game picker).
function GameCard({ game, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`game-card ${active ? 'is-active' : ''}`}
            style={{ '--cover-accent': accentFor(game) }}
            aria-pressed={active}
        >
            <span className="game-card__art">
                <img src={logoFor(game)} alt="" className="game-card__logo" loading="lazy" />
            </span>
            <span className="game-card__label">{game.label}</span>
            {game.region && <span className="game-card__sub">{game.region}</span>}
            {active && <span className="game-card__check" aria-hidden="true">✓</span>}
        </button>
    );
}

// Logo game picker modal: official games + hack ROMs in cover-art grids.
function GymGamePickerModal({ open, onClose, official, hacks, selectedKey, onSelect, pt }) {
    const dialogRef = useModalA11y(open ? onClose : undefined);
    if (!open) return null;
    const choose = (key) => { onSelect(key); onClose(); };
    const Group = ({ title, items }) => (items.length ? (
        <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted px-1">{title}</p>
            <div className="game-picker__grid !p-1 !overflow-visible">
                {items.map((g) => <GameCard key={g.key} game={g} active={g.key === selectedKey} onClick={() => choose(g.key)} />)}
            </div>
        </div>
    ) : null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="gym-game-picker-title"
                tabIndex={-1}
                className="game-picker w-full max-w-3xl rounded-2xl border border-border bg-surface shadow-2xl focus:outline-none"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="game-picker__head">
                    <div className="min-w-0">
                        <h2 id="gym-game-picker-title" className="game-picker__title">{pt ? 'Escolha um jogo' : 'Choose a game'}</h2>
                        <p className="game-picker__subtitle">{pt ? 'Jogos oficiais e hack ROMs' : 'Official games & hack ROMs'}</p>
                    </div>
                    <button type="button" onClick={onClose} className="team-builder-icon-button" aria-label={pt ? 'Fechar' : 'Close'}>
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="max-h-[70vh] space-y-6 overflow-y-auto p-5 custom-scrollbar">
                    <Group title={pt ? 'Jogos oficiais' : 'Official games'} items={official} />
                    <Group title={pt ? 'Hack ROMs' : 'Hack ROMs'} items={hacks} />
                </div>
            </div>
        </div>
    );
}

// Detailed team modal showing all details (sprite, name, types, level, ability, held item, and moves).
function LeaderTeamModal({ open, onClose, leader, resolve, accent, levelCap, showDetails, pt }) {
    const dialogRef = useModalA11y(open ? onClose : undefined);
    const { goToMove, goToAbility } = useEntityNavigate();
    if (!open || !leader) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="leader-team-title"
                tabIndex={-1}
                className="w-full max-w-4xl rounded-2xl border border-border bg-surface shadow-2xl focus:outline-none flex flex-col max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-bottom border-border p-4 sm:p-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl"
                            style={{ backgroundImage: `linear-gradient(135deg, ${accent}33, ${accent}0d)`, border: `1px solid ${accent}55` }}
                        >
                            {leader.sprite ? (
                                <img
                                    src={`${TRAINER_SPRITE_BASE}${leader.sprite}.png`}
                                    alt=""
                                    className="h-full w-full object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            ) : (
                                <Trophy className="h-6 w-6 text-white" />
                            )}
                        </div>
                        <div>
                            <h2 id="leader-team-title" className="text-base sm:text-lg font-extrabold text-fg">
                                {leader.name} — {pt ? 'Time Detalhado' : 'Detailed Team'}
                            </h2>
                            <p className="text-xs text-muted">
                                {[leader.gym, leader.city].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="team-builder-icon-button" aria-label={pt ? 'Fechar' : 'Close'}>
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-4 sm:p-6 custom-scrollbar flex-1 bg-surface-raised/20">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {leader.team.map((mon, i) => {
                            const entry = resolve(mon.name);
                            const id = entry?.id;
                            const types = entry?.types || [];

                            return (
                                <div
                                    key={`${mon.name}-${i}`}
                                    className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary/50 relative overflow-hidden"
                                >
                                    {/* Level badge */}
                                    <div className="absolute right-3 top-3 rounded-md px-2 py-0.5 text-xs font-bold text-white shadow-sm" style={{ backgroundColor: accent }}>
                                        Lv{mon.level || levelCap || '?'}
                                    </div>

                                    {/* Header info */}
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => id && showDetails?.({ id: entry.id, name: entry.name })}
                                            className="h-16 w-16 flex-shrink-0 rounded-lg bg-surface-raised border border-border hover:border-primary transition-colors flex items-center justify-center group"
                                            title={id ? (pt ? `Ver detalhes de ${pretty(mon.name)}` : `View details for ${pretty(mon.name)}`) : undefined}
                                            disabled={!id}
                                        >
                                            <img
                                                src={id ? getPokemonFrontSpriteUrl(id) : POKEBALL_PLACEHOLDER_URL}
                                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                                alt=""
                                                className="h-14 w-14 image-pixelated group-hover:scale-110 transition-transform"
                                            />
                                        </button>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate font-extrabold capitalize text-fg text-sm">{pretty(mon.name)}</h3>
                                            <div className="mt-1 flex gap-1 flex-wrap">
                                                {types.map((tp) => (
                                                    <span
                                                        key={tp}
                                                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold capitalize border"
                                                        style={{
                                                            color: typeColors[tp],
                                                            backgroundColor: `${typeColors[tp]}1a`,
                                                            borderColor: `${typeColors[tp]}40`
                                                        }}
                                                    >
                                                        {typeIcons[tp] && <img src={typeIcons[tp]} alt="" className="h-3 w-3 shrink-0 object-contain" />}
                                                        {tp}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Item / Ability */}
                                    <div className="space-y-1 bg-surface-raised/40 p-2 rounded-lg text-xs border border-border">
                                        <div className="flex justify-between gap-2">
                                            <span className="text-muted">{pt ? 'Habilidade' : 'Ability'}:</span>
                                            {mon.ability ? (
                                                <button type="button" onClick={(e) => { onClose(); goToAbility(mon.ability, e); }} className="font-semibold text-fg capitalize truncate transition-colors hover:text-primary focus:outline-none" title={pretty(mon.ability)}>
                                                    {pretty(mon.ability)}
                                                </button>
                                            ) : (
                                                <span className="font-semibold text-fg">-</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between gap-2">
                                            <span className="text-muted">{pt ? 'Item' : 'Item'}:</span>
                                            <span className="font-semibold text-fg capitalize truncate" title={pretty(mon.item)}>{pretty(mon.item) || '-'}</span>
                                        </div>
                                    </div>

                                    {/* Moves */}
                                    <div>
                                        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted">{pt ? 'Ataques' : 'Moves'}</p>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {Array.isArray(mon.moves) && mon.moves.length > 0 ? (
                                                mon.moves.map((mv, idx) => {
                                                    const name = typeof mv === 'string' ? mv : mv.name;
                                                    const type = typeof mv === 'string' ? 'normal' : (mv.type || 'normal');
                                                    const color = typeColors[type] || 'var(--color-primary)';
                                                    return (
                                                        <button
                                                            key={`${name}-${idx}`}
                                                            type="button"
                                                            onClick={(e) => { onClose(); goToMove(name, e); }}
                                                            className="truncate cursor-pointer rounded-md border px-2 py-1 text-center text-[10px] font-medium capitalize flex items-center justify-center gap-1 leading-tight min-h-[22px] transition-opacity hover:opacity-75 focus:outline-none"
                                                            style={{
                                                                color,
                                                                borderColor: `${color}40`,
                                                                backgroundColor: `${color}15`
                                                            }}
                                                            title={pretty(name)}
                                                        >
                                                            {typeIcons[type] && <img src={typeIcons[type]} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />}
                                                            <span className="truncate">{pretty(name)}</span>
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <span className="col-span-2 text-center text-xs text-muted py-2 bg-surface-raised/20 rounded border border-dashed border-border">
                                                    -
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Trainer portrait from the Pokémon Showdown sprite CDN, falling back to a
// type-coloured medallion when no sprite exists (e.g. custom hack-ROM leaders).
function TrainerAvatar({ sprite, type, order, accent }) {
    const [failed, setFailed] = useState(!sprite);
    return (
        <span className="relative h-16 w-16 shrink-0">
            <span
                className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl"
                style={{ backgroundImage: `linear-gradient(135deg, ${accent}33, ${accent}0d)`, border: `1px solid ${accent}55` }}
            >
                {failed ? (
                    typeIcons[type] ? <img src={typeIcons[type]} alt={type} className="h-7 w-7" /> : <Trophy className="h-7 w-7 text-white" />
                ) : (
                    <img
                        src={`${TRAINER_SPRITE_BASE}${sprite}.png`}
                        onError={() => setFailed(true)}
                        alt=""
                        className="h-full w-full object-contain"
                        loading="lazy"
                    />
                )}
            </span>
            <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-[10px] font-bold text-fg shadow-sm z-10">{order}</span>
        </span>
    );
}

function TeamMon({ mon, entry, accent, levelCap, onClick }) {
    const id = entry?.id;
    const types = entry?.types || [];
    const handleMonClick = (e) => {
        e.stopPropagation();
        if (id && onClick) onClick();
    };
    return (
        <button
            type="button"
            onClick={handleMonClick}
            disabled={!id}
            title={pretty(mon.name)}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface-raised/20 hover:bg-surface-raised/60 hover:border-primary/30 p-3 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full"
        >
            <div className="relative">
                <div
                    className="h-16 w-16 flex items-center justify-center tb-type-disc"
                    style={{
                        '--type-a': types[0] ? typeColors[types[0]] : accent,
                        '--type-b': types[1] ? typeColors[types[1]] : (types[0] ? typeColors[types[0]] : accent)
                    }}
                >
                    <img
                        src={id ? getPokemonFrontSpriteUrl(id) : POKEBALL_PLACEHOLDER_URL}
                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                        alt=""
                        className="h-12 w-12 image-pixelated group-hover:scale-110 transition-transform"
                        loading="lazy"
                    />
                </div>
                <span className="absolute -right-1.5 -top-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm" style={{ backgroundColor: accent }}>
                    Lv{mon.level || levelCap || '?'}
                </span>
            </div>

            <div className="flex flex-col items-center min-w-0 w-full mt-1.5">
                <span className="w-full truncate text-xs font-extrabold capitalize text-fg leading-tight">{pretty(mon.name)}</span>
                <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                    {types.map((tp) => (
                        <span
                            key={tp}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[8px] font-extrabold capitalize border"
                            style={{
                                color: typeColors[tp],
                                backgroundColor: `${typeColors[tp]}15`,
                                borderColor: `${typeColors[tp]}30`
                            }}
                        >
                            {typeIcons[tp] && <img src={typeIcons[tp]} alt="" className="h-2.5 w-2.5 shrink-0 object-contain" />}
                            {tp.slice(0, 3)}
                        </span>
                    ))}
                </div>
            </div>
        </button>
    );
}

/**
 * Gyms & Trainers — browse each game's gym leaders and the exact teams they
 * battle with. Covers official games and famous hack ROMs. Species resolve to
 * sprites/types from the pokémon index; teams can carry levels, items and moves.
 */
export function GymsView({ showDetails, onAddToTeam }) {
    const { language } = useTranslation();
    const pt = language === 'pt';
    useDocumentMeta({
        title: 'Gym Leaders',
        description: 'Gym leaders and their teams across every Pokémon game, region by region.',
        path: '/gyms',
    });
    const { games, status } = useGymLeaders();
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    React.useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedKey = searchParams.get('game') || (games[0]?.key || null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [modalLeader, setModalLeader] = useState(null);
    const [activeLeaderId, setActiveLeaderId] = useState(null);

    React.useEffect(() => {
        if (status === 'ready' && games.length > 0 && !searchParams.get('game')) {
            setSearchParams({ game: games[0].key }, { replace: true });
        }
    }, [status, games, searchParams, setSearchParams]);

    const indexBySlug = useMemo(() => {
        const m = new Map();
        for (const p of pokemonIndex || []) m.set(p.name, p);
        return m;
    }, [pokemonIndex]);
    // Base species only, for resolving names whose default form carries a suffix
    // in the index (e.g. "Dudunsparce" → "dudunsparce-two-segment").
    const baseSpecies = useMemo(
        () => (pokemonIndex || []).filter((p) => !p.isForm && p.id <= 1025),
        [pokemonIndex]
    );
    const resolve = (name) => {
        const slug = slugify(name);
        return indexBySlug.get(slug)
            || baseSpecies.find((p) => p.name === slug || p.name.startsWith(`${slug}-`))
            || null;
    };

    const official = games.filter((g) => g.kind !== 'hackrom');
    const hacks = games.filter((g) => g.kind === 'hackrom');
    const selected = games.find((g) => g.key === selectedKey) || games[0] || null;

    // Initialize active leader sidebar element
    React.useEffect(() => {
        if (selected && selected.leaders && selected.leaders.length > 0) {
            const first = selected.leaders[0];
            setActiveLeaderId(`leader-${first.order}-${slugify(first.name)}`);
        } else {
            setActiveLeaderId(null);
        }
    }, [selected]);

    // Scrollspy effect
    React.useEffect(() => {
        if (status !== 'ready' || !selected || !selected.leaders || !selected.leaders.length) return;

        const observerOptions = {
            root: null,
            rootMargin: '-80px 0px -60% 0px',
            threshold: 0,
        };

        const observerCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveLeaderId(entry.target.id);
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        selected.leaders.forEach((leader) => {
            const id = `leader-${leader.order}-${slugify(leader.name)}`;
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [selected, status]);

    const scrollToLeader = (leader) => {
        const id = `leader-${leader.order}-${slugify(leader.name)}`;
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveLeaderId(id);
        }
    };

    const buildTeam = (leader) => {
        if (!onAddToTeam) return;
        for (const mon of leader.team.slice(0, 6)) {
            const entry = resolve(mon.name);
            if (entry) onAddToTeam(entry);
        }
    };

    const gymLeaders = selected ? selected.leaders.filter(l => l.gym !== 'Elite Four' && l.gym !== 'Champion') : [];
    const eliteFourAndChamp = selected ? selected.leaders.filter(l => l.gym === 'Elite Four' || l.gym === 'Champion') : [];

    const renderLeaderCard = (leader) => {
        const accent = typeColors[leader.type] || 'var(--color-primary)';
        const isChamp = leader.gym === 'Champion';
        const active = activeLeaderId === `leader-${leader.order}-${slugify(leader.name)}`;

        return (
            <article
                key={`${leader.order}-${leader.name}`}
                id={`leader-${leader.order}-${slugify(leader.name)}`}
                onClick={() => setModalLeader(leader)}
                className={`team-builder-panel p-4 flex flex-col gap-4 border border-border border-l-4 transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden group/card animate-fade-in-up ${isChamp
                        ? active
                            ? 'border-yellow-500 shadow-yellow-500/10'
                            : 'hover:border-yellow-500/50'
                        : active
                            ? 'border-primary shadow-primary/10'
                            : 'hover:border-primary/50'
                    }`}
                style={{
                    borderLeftColor: isChamp ? '#eab308' : accent,
                    background: isChamp
                        ? 'linear-gradient(135deg, var(--color-surface) 75%, rgba(234, 179, 8, 0.04) 100%)'
                        : 'var(--color-surface)',
                    scrollMarginTop: '1.5rem',
                }}
            >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                        <TrainerAvatar sprite={leader.sprite} type={leader.type} order={isChamp ? '★' : leader.order} accent={isChamp ? '#eab308' : accent} />
                        <div className="min-w-0">
                            <h2 className="text-lg font-extrabold text-fg leading-none flex items-center gap-1.5">
                                {leader.name}
                                {isChamp && <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse shrink-0" />}
                            </h2>
                            <p className="text-xs text-muted mt-1.5">
                                {[leader.gym, leader.city].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`opacity-0 group-hover/card:opacity-100 transition-opacity text-xs font-bold mr-1 hidden sm:inline ${isChamp ? 'text-yellow-500' : 'text-primary'}`}>
                            {pt ? 'Ver time completo' : 'View full team'} ➔
                        </span>
                        <span
                            className="inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-bold capitalize"
                            style={{
                                color: isChamp ? '#eab308' : accent,
                                borderColor: 'currentColor',
                                backgroundColor: 'transparent'
                            }}
                        >
                            {typeIcons[leader.type] && <img src={typeIcons[leader.type]} alt="" className="h-3.5 w-3.5 object-contain" />}
                            {isChamp ? (pt ? 'Campeão' : 'Champion') : cap(leader.type)}
                        </span>
                        {leader.badge && (
                            <span className="rounded-xl border border-border bg-surface-raised px-2.5 py-1 text-[11px] font-bold text-muted">{leader.badge}</span>
                        )}
                        {leader.levelCap && (
                            <span className="rounded-xl border border-border bg-surface-raised px-2.5 py-1 text-[11px] font-bold text-muted">{pt ? 'Nível Máx' : 'Lv Cap'} {leader.levelCap}</span>
                        )}
                        {onAddToTeam && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    buildTeam(leader);
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-extrabold transition-all duration-200 bg-transparent ${isChamp
                                        ? 'border-yellow-500/40 text-yellow-500 hover:bg-yellow-500 hover:text-white hover:border-yellow-500'
                                        : 'border-primary/40 text-primary hover:bg-primary hover:text-white hover:border-primary'
                                    }`}
                                title={pt ? 'Montar este time no construtor' : 'Build this team in the builder'}
                            >
                                <Swords className="h-3 w-3" /> {pt ? 'Usar time' : 'Use team'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 mt-1">
                    {leader.team.map((mon, i) => {
                        const entry = resolve(mon.name);
                        return (
                            <TeamMon
                                key={`${mon.name}-${i}`}
                                mon={mon}
                                entry={entry}
                                accent={isChamp ? '#eab308' : accent}
                                levelCap={leader.levelCap}
                                onClick={() => entry && showDetails?.({ id: entry.id, name: entry.name })}
                            />
                        );
                    })}
                </div>
            </article>
        );
    };

    return (
        <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5">
            <header className="mb-5">
                <h1 className="flex items-center gap-2 text-2xl font-extrabold text-fg sm:text-3xl">
                    <Swords className="h-6 w-6 text-primary" /> {pt ? 'Ginásios & Treinadores' : 'Gyms & Trainers'}
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-muted">
                    {pt
                        ? 'Os líderes de ginásio de cada jogo e os times exatos que eles usam — jogos oficiais e os hack ROMs mais famosos.'
                        : "Each game's gym leaders and the exact teams they battle with — official games and the most famous hack ROMs."}
                </p>
            </header>

            <GymGamePickerModal
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                official={official}
                hacks={hacks}
                selectedKey={selected?.key}
                onSelect={(key) => setSearchParams({ game: key })}
                pt={pt}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left Column: Sticky Navigation Sidebar */}
                <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-5 lg:self-start max-h-[calc(100vh-40px)] overflow-y-auto pr-1 custom-scrollbar">
                    {/* Game Cover Card */}
                    {selected && (
                        <button
                            type="button"
                            onClick={() => setPickerOpen(true)}
                            className="game-cover w-full m-0"
                            style={{ '--cover-accent': accentFor(selected) }}
                            aria-haspopup="dialog"
                            title={pt ? 'Trocar jogo' : 'Change game'}
                        >
                            <span className="game-cover__art">
                                <img src={logoFor(selected)} alt="" className="game-cover__logo" />
                            </span>
                            <span className="game-cover__meta">
                                <span className="game-cover__eyebrow">
                                    {selected.kind === 'hackrom' ? (pt ? 'Hack ROM' : 'Hack ROM') : (pt ? 'Jogo' : 'Game')} · {selected.region}
                                </span>
                                <span className="game-cover__label text-left">{selected.label}</span>
                                <span className="game-cover__hint text-left">{pt ? 'Trocar jogo' : 'Change game'}</span>
                            </span>
                        </button>
                    )}

                    {/* Timeline Navigation */}
                    {selected && selected.leaders && selected.leaders.length > 0 && (
                        <nav className="team-builder-panel p-3.5 space-y-4">
                            {gymLeaders.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted px-2.5 mb-2.5">
                                        {pt ? 'Líderes de Ginásio' : 'Gym Leaders'}
                                    </p>
                                    <div className="space-y-1">
                                        {gymLeaders.map((leader) => {
                                            const leaderId = `leader-${leader.order}-${slugify(leader.name)}`;
                                            const active = activeLeaderId === leaderId;
                                            const accent = typeColors[leader.type] || 'var(--color-primary)';
                                            return (
                                                <button
                                                    key={`${leader.order}-${leader.name}`}
                                                    type="button"
                                                    onClick={() => scrollToLeader(leader)}
                                                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-all duration-200 ${active
                                                            ? 'bg-surface-raised border border-primary text-fg shadow-sm font-extrabold'
                                                            : 'border border-transparent text-muted hover:text-fg hover:bg-surface-raised'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span
                                                            className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold ${active
                                                                    ? 'bg-primary text-white font-black'
                                                                    : 'bg-surface-raised border border-border text-muted font-bold'
                                                                }`}
                                                        >
                                                            {leader.order}
                                                        </span>
                                                        <span className="truncate text-xs capitalize leading-tight">{leader.name}</span>
                                                    </div>
                                                    <span
                                                        className="h-2 w-2 shrink-0 rounded-full transition-all duration-200"
                                                        style={{
                                                            backgroundColor: accent,
                                                            transform: active ? 'scale(1.2)' : 'none'
                                                        }}
                                                        title={cap(leader.type)}
                                                    />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {eliteFourAndChamp.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary px-2.5 mb-2.5 flex items-center gap-1.5">
                                        <Trophy className="h-3.5 w-3.5 text-primary" />
                                        <span>{pt ? 'Liga Pokémon' : 'Pokémon League'}</span>
                                    </p>
                                    <div className="space-y-1">
                                        {eliteFourAndChamp.map((leader) => {
                                            const leaderId = `leader-${leader.order}-${slugify(leader.name)}`;
                                            const active = activeLeaderId === leaderId;
                                            const accent = typeColors[leader.type] || 'var(--color-primary)';
                                            const isChamp = leader.gym === 'Champion';
                                            return (
                                                <button
                                                    key={`${leader.order}-${leader.name}`}
                                                    type="button"
                                                    onClick={() => scrollToLeader(leader)}
                                                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-all duration-200 ${active
                                                            ? isChamp
                                                                ? 'bg-surface-raised border border-yellow-500 text-fg shadow-sm font-extrabold'
                                                                : 'bg-surface-raised border border-primary text-fg shadow-sm font-extrabold'
                                                            : 'border border-transparent text-muted hover:text-fg hover:bg-surface-raised'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span
                                                            className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold ${active
                                                                    ? isChamp
                                                                        ? 'bg-yellow-500 text-white font-black'
                                                                        : 'bg-primary text-white font-black'
                                                                    : 'bg-surface-raised border border-border text-muted font-bold'
                                                                }`}
                                                        >
                                                            {isChamp ? '★' : leader.order}
                                                        </span>
                                                        <span className="truncate text-xs capitalize leading-tight flex items-center gap-1">
                                                            {leader.name}
                                                            {isChamp && <Sparkles className="h-3 w-3 text-yellow-500 shrink-0" />}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className="h-2 w-2 shrink-0 rounded-full transition-all duration-200"
                                                        style={{
                                                            backgroundColor: isChamp ? '#eab308' : accent,
                                                            transform: active ? 'scale(1.2)' : 'none'
                                                        }}
                                                        title={isChamp ? (pt ? 'Campeão' : 'Champion') : cap(leader.type)}
                                                    />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </nav>
                    )}
                </aside>

                {/* Right Column: Gym Leaders Stack */}
                <main className="lg:col-span-9 space-y-8">
                    {selected && (
                        <>
                            {/* Gym Leaders Section */}
                            {gymLeaders.length > 0 && (
                                <div className="space-y-4">
                                    <div className="border-b border-border pb-2">
                                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                                            <span>{pt ? 'Líderes de Ginásio' : 'Gym Leaders'}</span>
                                            <span className="text-xs font-normal text-muted/60">({gymLeaders.length})</span>
                                        </h2>
                                    </div>
                                    <div className="space-y-4">
                                        {gymLeaders.map((leader) => renderLeaderCard(leader))}
                                    </div>
                                </div>
                            )}

                            {/* Pokémon League Section */}
                            {eliteFourAndChamp.length > 0 && (
                                <div className="space-y-4 pt-4">
                                    <div className="border-b border-border pb-2">
                                        <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                                            <Trophy className="h-4 w-4 text-primary" />
                                            <span>{pt ? 'Elite dos Quatro & Campeão' : 'Elite Four & Champion'}</span>
                                            <span className="text-xs font-normal text-primary/60">({eliteFourAndChamp.length})</span>
                                        </h2>
                                    </div>
                                    <div className="space-y-4">
                                        {eliteFourAndChamp.map((leader) => renderLeaderCard(leader))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {selected?.source && (
                        <p className="flex items-center gap-1 text-[11px] text-muted">
                            <ChevronRight className="h-3 w-3" /> {pt ? 'Fonte' : 'Source'}: {selected.source}
                        </p>
                    )}
                </main>
            </div>

            <LeaderTeamModal
                open={!!modalLeader}
                onClose={() => setModalLeader(null)}
                leader={modalLeader}
                resolve={resolve}
                accent={modalLeader ? (typeColors[modalLeader.type] || 'var(--color-primary)') : 'var(--color-primary)'}
                levelCap={modalLeader?.levelCap}
                showDetails={showDetails}
                pt={pt}
            />
        </div>
    );
}
