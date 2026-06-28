import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Swords, Trophy, ChevronRight, Sparkles, X } from 'lucide-react';

import { typeColors, typeIcons } from '../../constants/types';
import { useGymLeaders } from '../../hooks/useGymLeaders';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTranslation } from '../../hooks/useTranslation';
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
                                            <span className="font-semibold text-fg capitalize truncate" title={pretty(mon.ability)}>{pretty(mon.ability) || '-'}</span>
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
                                                        <span
                                                            key={`${name}-${idx}`}
                                                            className="truncate rounded-md border px-2 py-1 text-center text-[10px] font-medium capitalize flex items-center justify-center gap-1 leading-tight min-h-[22px]"
                                                            style={{
                                                                color,
                                                                borderColor: `${color}40`,
                                                                backgroundColor: `${color}15`
                                                            }}
                                                            title={pretty(name)}
                                                        >
                                                            {typeIcons[type] && <img src={typeIcons[type]} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />}
                                                            <span className="truncate">{pretty(name)}</span>
                                                        </span>
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
            className="group flex flex-col items-center gap-2 rounded-xl border border-transparent bg-transparent p-2 text-center transition-all hover:bg-surface-raised/55 hover:border-primary/20 disabled:opacity-60 disabled:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full"
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
                <span className="absolute -right-1.5 -top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm" style={{ backgroundColor: accent }}>
                    Lv{mon.level || levelCap || '?'}
                </span>
            </div>
            
            <div className="flex flex-col items-center min-w-0 w-full mt-1">
                <span className="w-full truncate text-xs font-extrabold capitalize text-fg leading-tight">{pretty(mon.name)}</span>
                <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                    {types.map((tp) => (
                        <img key={tp} src={typeIcons[tp]} alt={tp} title={tp} className="h-3.5 w-3.5 object-contain" />
                    ))}
                </div>
                {mon.ability && (
                    <span className="w-full truncate text-[10px] font-bold text-muted capitalize mt-1.5 leading-none" title={pretty(mon.ability)}>
                        {pretty(mon.ability)}
                    </span>
                )}
            </div>

            {Array.isArray(mon.moves) && mon.moves.length > 0 && (
                <div className="mt-2.5 grid grid-cols-2 gap-1 w-full shrink-0">
                    {mon.moves.slice(0, 4).map((mv, idx) => {
                        const name = typeof mv === 'string' ? mv : mv.name;
                        const type = typeof mv === 'string' ? 'normal' : (mv.type || 'normal');
                        const color = typeColors[type] || 'var(--color-primary)';
                        return (
                            <span
                                key={`${name}-${idx}`}
                                className="truncate rounded px-1 py-0.5 text-[8px] font-bold capitalize text-center border flex items-center justify-center gap-0.5 leading-none min-h-[16px]"
                                style={{
                                    color,
                                    borderColor: `${color}28`,
                                    backgroundColor: `${color}0a`
                                }}
                                title={pretty(name)}
                            >
                                {typeIcons[type] && <img src={typeIcons[type]} alt="" className="h-2 w-2 shrink-0 object-contain" />}
                                <span className="truncate">{pretty(name)}</span>
                            </span>
                        );
                    })}
                </div>
            )}
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
    const { games, status } = useGymLeaders();
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    React.useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedKey = searchParams.get('game') || (games[0]?.key || null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [modalLeader, setModalLeader] = useState(null);

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

    const buildTeam = (leader) => {
        if (!onAddToTeam) return;
        for (const mon of leader.team.slice(0, 6)) {
            const entry = resolve(mon.name);
            if (entry) onAddToTeam(entry);
        }
    };

    if (status !== 'ready' && games.length === 0) {
        return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-muted">{pt ? 'Carregando ginásios…' : 'Loading gyms…'}</div>;
    }

    return (
        <div className="mx-auto max-w-6xl px-3 py-5 sm:px-5">
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

            {/* Logo game selector — opens the cover-art picker modal */}
            {selected && (
                <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="game-cover"
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
                        <span className="game-cover__label">{selected.label}</span>
                        <span className="game-cover__hint">{pt ? 'Trocar jogo' : 'Change game'}</span>
                    </span>
                </button>
            )}

            <GymGamePickerModal
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                official={official}
                hacks={hacks}
                selectedKey={selected?.key}
                onSelect={(key) => setSearchParams({ game: key })}
                pt={pt}
            />

            {/* Leaders */}
            {selected && (
                <div className="mt-6 space-y-4">
                    {selected.leaders.map((leader) => {
                        const accent = typeColors[leader.type] || 'var(--color-primary)';
                        return (
                            <article
                                key={`${leader.order}-${leader.name}`}
                                onClick={() => setModalLeader(leader)}
                                className="team-builder-panel p-4 flex flex-col gap-4 hover:border-primary/50 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden group/card animate-fade-in-up"
                                style={{
                                    borderTopColor: accent,
                                    borderTopWidth: 3,
                                    background: 'var(--color-surface)'
                                }}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <TrainerAvatar sprite={leader.sprite} type={leader.type} order={leader.order} accent={accent} />
                                        <div className="min-w-0">
                                            <h2 className="text-lg font-extrabold text-fg leading-snug">{leader.name}</h2>
                                            <p className="text-xs text-muted mt-0.5">
                                                {[leader.gym, leader.city].filter(Boolean).join(' · ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="opacity-0 group-hover/card:opacity-100 transition-opacity text-xs font-bold text-primary mr-1">
                                            {pt ? 'Ver detalhes' : 'View details'} ➔
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize" style={{ color: accent, backgroundColor: `${accent}1f` }}>
                                            {typeIcons[leader.type] && <img src={typeIcons[leader.type]} alt="" className="h-3.5 w-3.5 object-contain" />}
                                            {cap(leader.type)}
                                        </span>
                                        {leader.badge && (
                                            <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-[11px] font-semibold text-muted">{leader.badge}</span>
                                        )}
                                        {leader.levelCap && (
                                            <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-[11px] font-semibold text-muted">{pt ? 'Nível máx' : 'Lv cap'} {leader.levelCap}</span>
                                        )}
                                        {onAddToTeam && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    buildTeam(leader);
                                                }}
                                                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
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
                                                accent={accent}
                                                levelCap={leader.levelCap}
                                                onClick={() => entry && showDetails?.({ id: entry.id, name: entry.name })}
                                            />
                                        );
                                    })}
                                </div>
                            </article>
                        );
                    })}

                    {selected.source && (
                        <p className="flex items-center gap-1 text-[11px] text-muted">
                            <ChevronRight className="h-3 w-3" /> {pt ? 'Fonte' : 'Source'}: {selected.source}
                        </p>
                    )}
                </div>
            )}

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
