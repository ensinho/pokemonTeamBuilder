import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Swords, Trophy, ChevronRight, X, Check, ListTree } from 'lucide-react';

import { typeColors, typeIcons, typeChart } from '../../constants/types';
import { useGymLeaders } from '../../hooks/useGymLeaders';
import { gymTeamForImport } from '../../utils/gymTeam';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { useModalA11y } from '../../hooks/useModalA11y';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { getGameLogo, getGameAccent } from '../../assets/gameLogos';
import { toneInk, toneWash } from '../../utils/toneInk';
import { useAuthStore } from '../../store/useAuthStore';
import { caseLeaders, nextLeader, toggleBadge } from '../../utils/badgeCase';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { TypeChip } from '../TypeChip';
import '../../styles/game-cover.css';
import '../../styles/gyms-view.css';
import { SHOWDOWN_SPRITES_BASE } from '../../utils/assetHost';

const slugify = (name = '') => name.toLowerCase().trim().replace(/[.'’:]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
const pretty = (s = '') => s.replace(/-/g, ' ');
const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
const TRAINER_SPRITE_BASE = `${SHOWDOWN_SPRITES_BASE}/trainers/`;
// A hack ROM's leader can carry a note — a random pool, a roster not verified yet.
const leaderNote = (leader, pt) => (pt ? leader.notePt : null) || leader.note || null;

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
    'lazarus': 'ruby-sapphire-emerald',
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

// One titled grid of covers in the picker. At module scope: defined inside the
// modal it was a new component type on every render, so React remounted both
// grids (and reloaded their covers) each time the modal re-rendered.
function GameGroup({ title, items, selectedKey, onChoose }) {
    if (!items.length) return null;
    return (
        <div className="space-y-2">
            <p className="text-2xs font-semibold text-muted px-1">{title}</p>
            <div className="game-picker__grid !p-1 !overflow-visible">
                {items.map((g) => <GameCard key={g.key} game={g} active={g.key === selectedKey} onClick={() => onChoose(g.key)} />)}
            </div>
        </div>
    );
}

// Logo game picker modal: official games + hack ROMs in cover-art grids.
function GymGamePickerModal({ open, onClose, official, hacks, selectedKey, onSelect, pt }) {
    const dialogRef = useModalA11y(open ? onClose : undefined);
    if (!open) return null;
    const choose = (key) => { onSelect(key); onClose(); };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm max-lg:backdrop-filter-none" onClick={onClose} role="presentation">
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
                    <GameGroup title={pt ? 'Jogos oficiais' : 'Official games'} items={official} selectedKey={selectedKey} onChoose={choose} />
                    <GameGroup title={pt ? 'Hack ROMs' : 'Hack ROMs'} items={hacks} selectedKey={selectedKey} onChoose={choose} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm max-lg:backdrop-filter-none" onClick={onClose} role="presentation">
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
                            style={{ backgroundColor: toneWash(accent), border: `1px solid ${toneWash(accent, 45)}` }}
                        >
                            {leader.sprite ? (
                                <img
                                    src={`${TRAINER_SPRITE_BASE}${leader.sprite}.png`}
                                    alt=""
                                    className="h-full w-full object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            ) : (
                                <Trophy className="h-6 w-6 text-muted" />
                            )}
                        </div>
                        <div>
                            <h2 id="leader-team-title" className="font-heading text-base sm:text-lg text-fg">
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
                    {leaderNote(leader, pt) && <p className="mb-4 text-sm text-muted">{leaderNote(leader, pt)}</p>}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {leader.team.map((mon, i) => {
                            const entry = resolve(mon.name);
                            const id = entry?.id;
                            const types = entry?.types || [];

                            return (
                                <div
                                    key={`${mon.name}-${i}`}
                                    className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 relative overflow-hidden"
                                >
                                    {/* Level badge */}
                                    <div className="absolute right-3 top-3 rounded-md border bg-surface px-2 py-0.5 font-mono text-xs font-semibold" style={{ color: toneInk(accent), borderColor: toneWash(accent, 45) }}>
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
                                                className="h-14 w-14 image-pixelated"
                                            />
                                        </button>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate font-semibold capitalize text-fg text-sm">{pretty(mon.name)}</h3>
                                            {mon.pool && <p className="text-2xs text-muted">{pt ? 'Sorteio — pode não aparecer' : 'Random pick — may not appear'}</p>}
                                            <div className="mt-1 flex gap-1 flex-wrap">
                                                {types.map((tp) => (
                                                    <span
                                                        key={tp}
                                                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-semibold capitalize border"
                                                        style={{
                                                            color: toneInk(typeColors[tp]),
                                                            backgroundColor: toneWash(typeColors[tp], 10),
                                                            borderColor: toneWash(typeColors[tp], 25)
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
                                        <p className="mb-1 text-2xs font-semibold text-muted">{pt ? 'Ataques' : 'Moves'}</p>
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
                                                            className="truncate cursor-pointer rounded-md border px-2 py-1 text-center text-2xs font-medium capitalize flex items-center justify-center gap-1 leading-tight min-h-[22px] transition-opacity hover:opacity-75 focus:outline-none"
                                                            style={{
                                                                color: toneInk(color),
                                                                borderColor: toneWash(color, 25),
                                                                backgroundColor: toneWash(color, 8)
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
function TrainerAvatar({ sprite, type, size = 'md' }) {
    const [failed, setFailed] = useState(!sprite);
    React.useEffect(() => { setFailed(!sprite); }, [sprite]);
    return (
        <span className={`gyms-avatar gyms-avatar--${size}`} aria-hidden="true">
            {failed ? (
                typeIcons[type] ? <img src={typeIcons[type]} alt="" className="gyms-avatar__type" /> : <Trophy className="gyms-avatar__type" />
            ) : (
                <img
                    src={`${TRAINER_SPRITE_BASE}${sprite}.png`}
                    onError={() => setFailed(true)}
                    alt=""
                    className="gyms-avatar__sprite"
                    loading="lazy"
                />
            )}
        </span>
    );
}

// One member on the stage: the sprite on its type's platform, the name, the
// level as a figure and the types as icons — the three-letter "Roc" / "Gro"
// pills are gone (2026-11-12).
function TeamMon({ mon, entry, levelCap, onClick, pt }) {
    const id = entry?.id;
    const types = entry?.types || [];
    const tone = typeColors[types[0]];
    return (
        <button
            type="button"
            onClick={() => { if (id && onClick) onClick(); }}
            disabled={!id}
            title={mon.pool ? `${pretty(mon.name)} — ${pt ? 'pode ser sorteado' : 'may be picked at random'}` : pretty(mon.name)}
            // Dashed = may be absent: a hack ROM leader's random pick.
            className={`gyms-mon ${mon.pool ? 'is-pool' : ''}`}
        >
            <span className="gyms-mon__sprite type-platform" style={tone ? { '--card-type': tone } : undefined}>
                <img
                    src={id ? getPokemonFrontSpriteUrl(id) : POKEBALL_PLACEHOLDER_URL}
                    onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                    alt=""
                    className="image-pixelated"
                    loading="lazy"
                />
            </span>
            <span className="gyms-mon__name">{pretty(mon.name)}</span>
            <span className="gyms-mon__meta">
                <span className="gyms-mon__level">Lv {mon.level || levelCap || '?'}</span>
                {types.map((tp) => (typeIcons[tp]
                    ? <img key={tp} src={typeIcons[tp]} alt={cap(tp)} title={cap(tp)} className="gyms-mon__type" />
                    : null))}
            </span>
            {mon.pool && <span className="gyms-mon__pool">{pt ? 'sorteio' : 'random pick'}</span>}
        </button>
    );
}

const leaderKey = (leader) => `${leader.order}-${slugify(leader.name)}`;
const isLeague = (leader) => leader.gym === 'Elite Four' || leader.gym === 'Champion';
// The level to be ready for: the hack ROM's cap, else the ace's level.
const aceLevel = (leader) => leader.levelCap
    || leader.team.reduce((top, mon) => Math.max(top, Number(mon.level) || 0), 0)
    || null;
// What beats the leader's speciality, from the type chart: super effective
// first, then anything the type cannot touch at all.
const countersOf = (type) => {
    const row = typeChart[type];
    if (!row) return { strong: [], immune: [] };
    return {
        strong: Object.entries(row.damageTaken).filter(([, m]) => m > 1).map(([name]) => name.toLowerCase()),
        immune: Object.entries(row.damageDealt).filter(([, m]) => m === 0).map(([name]) => name.toLowerCase()),
    };
};

// One row of the route: who, where, their type, how big the team is and the
// level of its ace. A beaten leader's dot becomes their badge.
function RouteRow({ leader, active, beaten, onSelect }) {
    const tone = typeColors[leader.type] || 'var(--color-muted)';
    const level = aceLevel(leader);
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-current={active ? 'true' : undefined}
            className={`gyms-route__row ${active ? 'is-active' : ''} ${beaten ? 'is-beaten' : ''}`}
            style={{ '--gym-tone': tone }}
        >
            <span className="gyms-route__order">{leader.gym === 'Champion' ? '★' : leader.order}</span>
            <TrainerAvatar sprite={leader.sprite} type={leader.type} size="sm" />
            <span className="gyms-route__who">
                <span className="gyms-route__name">{leader.name}</span>
                <span className="gyms-route__place">{leader.city || leader.gym}</span>
            </span>
            <span className="gyms-route__facts">
                <i className={beaten ? 'gyms-badge is-earned' : 'gyms-route__dot'} aria-hidden="true" />
                {leader.team.length > 0 && <span>{leader.team.length}{level ? ` · Lv ${level}` : ''}</span>}
            </span>
        </button>
    );
}

/**
 * Gyms & Trainers — a route and a stage (2026-11-12; it was a jump list beside
 * thirteen stacked cards, each leader on screen twice). The route lists every
 * leader of the game in one quiet row each; the stage shows the chosen one:
 * portrait, team on type platforms, what to bring, and the badge to mark when
 * they are beaten — the same Badge Case the Home shows (utils/badgeCase.js).
 * Covers official games and famous hack ROMs.
 */
export function GymsView({ showDetails, onUseTeam }) {
    const { language, t } = useTranslation();
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
    const badgeCase = useAuthStore((s) => s.badgeCase);
    const setBadgeCase = useAuthStore((s) => s.setBadgeCase);
    const shiny = useShinyBurst();

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedKey = searchParams.get('game') || (games[0]?.key || null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [modalLeader, setModalLeader] = useState(null);
    const [pickedLeader, setPickedLeader] = useState(null);

    React.useEffect(() => {
        if (status === 'ready' && games.length > 0 && !searchParams.get('game')) {
            setSearchParams({ game: games[0].key }, { replace: true });
        }
    }, [status, games, searchParams, setSearchParams]);

    const indexBySlug = useMemo(() => {
        const m = new Map();
        // Forms carry display names in the index ("Hisuian Zorua", "Alolan
        // Ninetales"), so they are keyed by their slug as well.
        for (const p of pokemonIndex || []) {
            m.set(p.name, p);
            if (p.isForm) m.set(slugify(p.name), p);
        }
        return m;
    }, [pokemonIndex]);
    // Base species only, for resolving names whose default form carries a suffix
    // in the index (e.g. "Dudunsparce" → "dudunsparce-two-segment").
    const baseSpecies = useMemo(
        () => (pokemonIndex || []).filter((p) => !p.isForm && p.id <= 1025),
        [pokemonIndex]
    );
    const resolve = (name) => {
        const find = (slug) => indexBySlug.get(slug)
            || baseSpecies.find((p) => p.name === slug || p.name.startsWith(`${slug}-`))
            || null;
        const slug = slugify(name);
        // A hack ROM's own Mega ("Mega Toucannon" in Lazarus) has no entry of
        // its own: it shows as its base species.
        return find(slug) || (slug.startsWith('mega-') ? find(slug.slice(5)) : null);
    };

    const official = games.filter((g) => g.kind !== 'hackrom');
    const hacks = games.filter((g) => g.kind === 'hackrom');
    const selected = games.find((g) => g.key === selectedKey) || games[0] || null;
    const leaders = useMemo(() => selected?.leaders || [], [selected]);
    const gymLeaders = leaders.filter((l) => !isLeague(l));
    const league = leaders.filter(isLeague);
    const earned = (selected && badgeCase?.earned?.[selected.key]) || [];
    const badgeLeaders = selected ? caseLeaders(selected) : [];

    // The stage opens on the trainer's next leader — the first one not beaten —
    // and follows their pick from there. A new game starts over.
    const gameKey = selected?.key || null;
    React.useEffect(() => { setPickedLeader(null); }, [gameKey]);
    const current = leaders.find((l) => leaderKey(l) === pickedLeader)
        || nextLeader(leaders, earned)
        || leaders[0]
        || null;

    // The whole roster opens in the builder — moves, items, abilities and
    // levels included — and the layout takes the trainer there.
    const buildTeam = (leader) => {
        if (!onUseTeam) return;
        onUseTeam(gymTeamForImport(leader, resolve, { gameLabel: selected?.label }));
    };

    const toggleBeaten = (leader) => {
        if (!selected) return;
        const was = earned.includes(leader.order);
        setBadgeCase(toggleBadge(badgeCase, selected.key, leader.order));
        // The trainer's own act, and only the winning half of it.
        if (!was) shiny.fire();
    };

    const typeName = (tp) => t(`types.${tp}`, { defaultValue: cap(tp) });
    const tone = current ? (typeColors[current.type] || 'var(--color-primary)') : 'var(--color-primary)';
    const beaten = current ? earned.includes(current.order) : false;
    const counters = current ? countersOf(current.type) : { strong: [], immune: [] };
    const level = current ? aceLevel(current) : null;
    const eyebrow = !current ? ''
        : current.gym === 'Champion' ? (pt ? 'Campeão' : 'Champion')
            : current.gym === 'Elite Four' ? (pt ? 'Elite dos Quatro' : 'Elite Four')
                : `${pt ? 'Ginásio' : 'Gym'} ${current.order}`;
    const hasDetails = current ? current.team.some((mon) => mon.moves?.length || mon.item || mon.ability) : false;

    const routeGroup = (title, items, icon = null) => items.length > 0 && (
        <div className="gyms-route__group">
            <p className="gyms-route__title">{icon}{title} <span className="count-badge">{items.length}</span></p>
            <div className="gyms-route__rows">
                {items.map((leader) => (
                    <RouteRow
                        key={leaderKey(leader)}
                        leader={leader}
                        active={current ? leaderKey(current) === leaderKey(leader) : false}
                        beaten={earned.includes(leader.order)}
                        onSelect={() => setPickedLeader(leaderKey(leader))}
                    />
                ))}
            </div>
        </div>
    );

    return (
        <div className="gyms-view">
            <GymGamePickerModal
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                official={official}
                hacks={hacks}
                selectedKey={selected?.key}
                onSelect={(key) => setSearchParams({ game: key })}
                pt={pt}
            />

            {selected && (
                <header className="gyms-bar">
                    <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        className="game-cover gyms-bar__game"
                        style={{ '--cover-accent': accentFor(selected) }}
                        aria-haspopup="dialog"
                        title={pt ? 'Trocar jogo' : 'Change game'}
                    >
                        <span className="game-cover__art">
                            <img src={logoFor(selected)} alt="" className="game-cover__logo" />
                        </span>
                        <span className="game-cover__meta">
                            <span className="game-cover__eyebrow">
                                {selected.kind === 'hackrom' ? 'Hack ROM' : (pt ? 'Jogo' : 'Game')} · {selected.region}
                            </span>
                            <span className="game-cover__label text-left">{selected.label}</span>
                            <span className="game-cover__hint text-left">{pt ? 'Trocar jogo' : 'Change game'}</span>
                        </span>
                    </button>
                    {badgeLeaders.length > 0 && (
                        <div
                            className="gyms-badges"
                            role="img"
                            aria-label={pt
                                ? `${badgeLeaders.filter((l) => earned.includes(l.order)).length} de ${badgeLeaders.length} insígnias`
                                : `${badgeLeaders.filter((l) => earned.includes(l.order)).length} of ${badgeLeaders.length} badges`}
                        >
                            {badgeLeaders.map((leader) => (
                                <i
                                    key={leaderKey(leader)}
                                    className={`gyms-badge ${earned.includes(leader.order) ? 'is-earned' : ''}`}
                                    style={{ '--gym-tone': typeColors[leader.type] || 'var(--color-muted)' }}
                                    title={leader.badge || leader.name}
                                />
                            ))}
                            <span className="gyms-badges__figure" aria-hidden="true">
                                {badgeLeaders.filter((l) => earned.includes(l.order)).length}/{badgeLeaders.length}
                            </span>
                        </div>
                    )}
                </header>
            )}

            {selected && current && (
                <div className="gyms-body">
                    <nav className="gyms-route" aria-label={pt ? 'Líderes deste jogo' : 'Leaders of this game'}>
                        {routeGroup(pt ? 'Líderes de ginásio' : 'Gym leaders', gymLeaders)}
                        {routeGroup(pt ? 'Liga Pokémon' : 'Pokémon League', league, <Trophy aria-hidden="true" />)}
                    </nav>

                    <section className="gyms-stage" style={{ '--gym-tone': tone }} aria-live="polite">
                        <div className="gyms-stage__head">
                            <TrainerAvatar sprite={current.sprite} type={current.type} size="lg" />
                            <div className="gyms-stage__who">
                                <span className="gyms-stage__eyebrow">{eyebrow}</span>
                                <h2 className="gyms-stage__name">{current.name}</h2>
                                <p className="gyms-stage__place">
                                    {[current.gym !== 'Elite Four' && current.gym !== 'Champion' ? current.gym : null, current.city, current.badge].filter(Boolean).join(' · ')}
                                </p>
                                {current.type && <TypeChip type={current.type} />}
                            </div>
                        </div>

                        {current.team.length > 0 && (
                            <div className="gyms-stage__team">
                                {current.team.map((mon, i) => {
                                    const entry = resolve(mon.name);
                                    return (
                                        <TeamMon
                                            key={`${mon.name}-${i}`}
                                            mon={mon}
                                            entry={entry}
                                            levelCap={current.levelCap}
                                            onClick={() => entry && showDetails?.({ id: entry.id, name: entry.name })}
                                            pt={pt}
                                        />
                                    );
                                })}
                            </div>
                        )}
                        {leaderNote(current, pt) && <p className="gyms-stage__note">{leaderNote(current, pt)}</p>}

                        <div className="gyms-stage__foot">
                            <dl className="gyms-stage__facts">
                                {level && (
                                    <div>
                                        <dd>{level}</dd>
                                        <dt>{current.levelCap ? (pt ? 'nível máximo' : 'level cap') : (pt ? 'nível do ás' : 'ace level')}</dt>
                                    </div>
                                )}
                                {(counters.strong.length > 0 || counters.immune.length > 0) && (
                                    <div>
                                        <dd className="gyms-stage__counters">
                                            {[...new Set([...counters.immune, ...counters.strong])].map((tp) => (typeIcons[tp]
                                                ? <img key={tp} src={typeIcons[tp]} alt={typeName(tp)} title={typeName(tp)} />
                                                : null))}
                                        </dd>
                                        <dt>{pt ? `leve contra ${typeName(current.type)}` : `bring against ${typeName(current.type)}`}</dt>
                                    </div>
                                )}
                            </dl>
                            <div className="gyms-stage__actions">
                                <button
                                    type="button"
                                    onClick={() => toggleBeaten(current)}
                                    aria-pressed={beaten}
                                    className={`btn btn-ghost gyms-stage__beat ${beaten ? 'is-beaten' : ''} ${shiny.isBursting ? 'is-bursting' : ''}`}
                                >
                                    {beaten ? <Check aria-hidden="true" /> : <i className="gyms-badge" aria-hidden="true" />}
                                    {beaten ? (pt ? 'Vencido' : 'Beaten') : (pt ? 'Marcar como vencido' : 'Mark as beaten')}
                                    {shiny.burst}
                                </button>
                                {hasDetails && (
                                    <button type="button" className="btn btn-secondary" onClick={() => setModalLeader(current)}>
                                        <ListTree aria-hidden="true" /> {pt ? 'Golpes e itens' : 'Moves and items'}
                                    </button>
                                )}
                                {onUseTeam && current.team.length > 0 && (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => buildTeam(current)}
                                        title={pt ? 'Montar este time no construtor' : 'Build this team in the builder'}
                                    >
                                        <Swords aria-hidden="true" /> {pt ? 'Usar este time' : 'Use this team'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {selected?.source && (
                <p className="gyms-source">
                    <ChevronRight aria-hidden="true" /> {pt ? 'Fonte' : 'Source'}: {selected.source}
                </p>
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
