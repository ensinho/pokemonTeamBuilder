import React from 'react';
import '../styles/home-dashboard.css';
import { useTournamentData } from '../hooks/useTournamentData';
import { useMetaUsage } from '../hooks/useMetaUsage';
import { useTranslation } from '../hooks/useTranslation';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { maxWidthBelow } from '../constants/breakpoints';
import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { Flame, Folder, Puzzle } from 'lucide-react';
import { SavedTeamsIcon, SwordsIcon, PokeballIcon } from './icons';
import { useFirestoreTeams } from '../hooks/useFirestoreTeams';
import { getTeamPokemonDisplaySprite } from '../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../constants/theme';

const QUICK_LINKS = [
    { key: 'builder',    path: '/builder',    labelKey: 'nav.builder',     icon: <SwordsIcon /> },
    { key: 'pokedex',    path: '/pokedex',    labelKey: 'nav.pokemonList', icon: <PokeballIcon /> },
    { key: 'teams',      path: '/teams',      labelKey: 'nav.favorites',   icon: <Folder className="w-5 h-5 shrink-0" /> },
    { key: 'pokepuzzle', path: '/pokepuzzle', labelKey: 'nav.pokepuzzle',  icon: <Puzzle className="w-5 h-5 shrink-0" /> },
];

export function HomeDashboard({ navigate, puzzleCard }) {
    const { t, language } = useTranslation();
    const { popular, recent, status } = useTournamentData();
    // Rank the popular row by real Smogon ladder usage for the current regulation
    // (same source as the Meta page), falling back to tournament counts while it loads.
    const { ranked: metaRanked, format: metaFormat } = useMetaUsage();
    const [activePokemonId, setActivePokemonId] = React.useState(null);

    // A phone gets one competitive block, not two. The tournament-teams list is
    // six sprites and two lines of metadata per row — on a 390px screen that is
    // most of a viewport spent on other people's teams, before the user has
    // reached their own. Below md the popular row stands alone and a tap goes
    // straight to that Pokémon's usage page; the full list lives one tap away
    // under "View all".
    const isCompact = useMediaQuery(maxWidthBelow('md'));

    // Below xl the home columns flatten and HomeView's pinned card — the team
    // you were last editing — sits directly above this panel. Listing that same
    // team again here is the page repeating itself, so it drops out of the list
    // at those widths (at xl the pinned card is hidden and the list carries it).
    const isFlattened = useMediaQuery(maxWidthBelow('xl'));

    // savedTeams already arrives ordered by updatedAt desc from the store's
    // Firestore query, so "recent" is just the head of that list.
    const { savedTeams, activeTeamId } = useFirestoreTeams();
    const recentTeams = React.useMemo(() => {
        const list = savedTeams || [];
        // Same fallback HomeView uses to resolve the pinned team: the stored id
        // when it still exists, otherwise the most recent team.
        const pinnedId = list.some((team) => team.id === activeTeamId) ? activeTeamId : list[0]?.id;
        const pool = isFlattened ? list.filter((team) => team.id !== pinnedId) : list;
        return pool.slice(0, 3);
    }, [savedTeams, activeTeamId, isFlattened]);

    // With no teams at all, HomeView's "Build your first team" card is already
    // on screen below xl — two stacked empty states both saying "make a team"
    // is the clutter this pass exists to remove. At xl that card is hidden, so
    // the empty state here is the only prompt and has to stay.
    const showContinuePanel = recentTeams.length > 0 || !isFlattened;

    const usingMeta = metaRanked.length > 0;
    const topPopular = (usingMeta ? metaRanked : popular).slice(0, 15);
    const isLoading = status === 'loading';

    const handleMouseEnterMon = (id) => {
        if (isCompact) return;
        setActivePokemonId(id);
    };

    const handleMouseLeaveGrid = () => {
        setActivePokemonId(null);
    };

    const handleMonClick = (mon) => {
        if (isCompact) {
            navigate(`/meta/${mon.name || mon.id}`);
            return;
        }
        setActivePokemonId(activePokemonId === mon.id ? null : mon.id);
    };

    const filteredTeams = React.useMemo(() => {
        if (!activePokemonId) return recent.slice(0, 2);
        const matched = recent.filter(team => (team.pokemons || []).some(mon => mon.id === activePokemonId));
        return matched.length > 0 ? matched.slice(0, 2) : recent.slice(0, 2);
    }, [recent, activePokemonId]);

    return (
        <div className="hd-stack">
            {/* Shortcuts. One row of icons, never a stacked list: three link-rows
                filling a column was the "broken shelf" — a nav pretending to be
                content. As a single rail it costs one row of height and reads as
                a launcher, which is what it is. */}
            <nav className="hd-quick-rail" aria-label={t('home.shortcuts')}>
                {QUICK_LINKS.map((l) => (
                    <button
                        key={l.key}
                        type="button"
                        className="hd-quick-tile"
                        onClick={() => navigate(l.path)}
                    >
                        <span className="hd-quick-tile__icon" aria-hidden="true">{l.icon}</span>
                        <span className="hd-quick-tile__label">{t(l.labelKey)}</span>
                    </button>
                ))}
            </nav>

            {/* Daily PokéPuzzle — the one thing on this page that expires today,
                so it sits directly under the shortcuts on mobile. On desktop it
                renders in the sidebar instead (the wrapper hides it here). */}
            {puzzleCard && <div className="hd-puzzle-slot xl:hidden">{puzzleCard}</div>}

            {/* Continue where you left off — the user's own work, as compact
                rows: the roster cluster is the icon, the name is the label. The
                tall three-across cards this replaces were the right shape for a
                desktop column and three screenfuls on a phone. */}
            {showContinuePanel && (
            <section className="hd-panel hd-panel--continue">
                <div className="hd-panel__head">
                    <span className="hd-panel__title"><SavedTeamsIcon className="w-4 h-4" /> {t('home.continueTitle')}</span>
                    {recentTeams.length > 0 && (
                        <button type="button" className="hd-panel__link" onClick={() => navigate('/teams')}>
                            {t('home.continueAll')} →
                        </button>
                    )}
                </div>
                {recentTeams.length === 0 ? (
                    <div className="hd-panel__body hd-continue-start">
                        <p className="hd-continue-start__title">{t('home.continueEmptyTitle')}</p>
                        <p className="hd-continue-start__body">{t('home.continueEmptyBody')}</p>
                        <button
                            type="button"
                            className="hd-continue-start__cta"
                            onClick={() => navigate('/builder')}
                        >
                            <SwordsIcon />
                            <span>{t('home.continueEmptyCta')}</span>
                        </button>
                    </div>
                ) : (
                    <ul className="hd-continue-list">
                        {recentTeams.map((team) => {
                            const members = (team.pokemons || []).filter(Boolean);
                            const memberLabel = `${members.length} ${members.length === 1 ? t('home.continueMember') : t('home.continueMembers')}`;
                            return (
                                <li key={team.id}>
                                    <button
                                        type="button"
                                        className="hd-team-row"
                                        onClick={() => navigate(`/teams/${team.id}`)}
                                        aria-label={`${team.name} — ${memberLabel}`}
                                    >
                                        <span className="hd-team-row__roster" aria-hidden="true">
                                            {members.slice(0, 6).map((mon, i) => (
                                                <img
                                                    key={mon.instanceId || `${team.id}-${mon.id}-${i}`}
                                                    src={getTeamPokemonDisplaySprite(mon)}
                                                    onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                                    alt=""
                                                    loading="lazy"
                                                />
                                            ))}
                                        </span>
                                        <span className="hd-team-row__name">{team.name}</span>
                                        {/* The count rides the right edge as a
                                            figure, not a sentence — the row is
                                            one line and the word is in the
                                            button's label for screen readers. */}
                                        <span className="hd-team-row__meta" aria-hidden="true">{members.length}/6</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
            )}

            {/* Loading skeletons while the tournament + Pokémon dataset loads */}
            {isLoading && (
                <section className="hd-panel hd-panel--meta">
                    <div className="hd-panel__head">
                        <span className="hd-panel__title"><Flame className="w-4 h-4" /> {language === 'pt' ? 'VGC Meta & Equipes' : 'VGC Meta & Teams'}</span>
                    </div>
                    <div className="hd-panel__body space-y-4">
                        <div>
                            <div className="hd-meta-mons-grid">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <div key={i} className="hd-skel-mon-btn" aria-hidden="true">
                                        <span className="hd-skel hd-skel-mon-icon" />
                                        <span className="hd-skel hd-skel-mon-name" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        {!isCompact && (
                            <div className="border-t border-border pt-4">
                                <div className="hd-meta-teams-list">
                                    {Array.from({ length: 2 }).map((_, i) => (
                                        <div key={i} className="hd-skel-team-row" aria-hidden="true">
                                            <div className="hd-skel-team-info">
                                                <span className="hd-skel hd-skel-team-player" />
                                                <span className="hd-skel hd-skel-team-meta" />
                                            </div>
                                            <div className="hd-skel-team-roster">
                                                {Array.from({ length: 6 }).map((__, j) => (
                                                    <span key={j} className="hd-skel hd-skel-roster-icon" />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Fused VGC Meta & Teams Panel */}
            {status === 'ready' && (topPopular.length > 0 || recent.length > 0) && (
                <section className="hd-panel hd-panel--meta" onMouseLeave={handleMouseLeaveGrid}>
                    <div className="hd-panel__head">
                        <span className="hd-panel__title">
                            <Flame className="w-4 h-4 text-warning" /> {language === 'pt' ? 'VGC Meta' : 'VGC Meta'}
                        </span>
                        <button type="button" className="hd-panel__link" onClick={() => navigate('/tournaments')}>
                            {t('home.viewAll')}
                        </button>
                    </div>
                    <div className="hd-panel__body space-y-4">
                        {/* Popular Mons Icon Row - Grid style, no scroll */}
                        <div>
                            <p className="hd-meta-caption">
                                {language === 'pt' ? 'Pokémon Populares' : 'Popular Pokémon'}
                                {!isCompact && (
                                    <span className="hidden sm:inline"> {language === 'pt' ? '(Passe o mouse para filtrar)' : '(Hover to filter)'}</span>
                                )}
                                {usingMeta && metaFormat?.label && <span className="hd-meta-caption__format"> · {metaFormat.label}</span>}
                            </p>
                            <div className="hd-meta-mons-grid">
                                {topPopular.slice(0, 10).map((mon) => (
                                    <button 
                                        key={mon.id} 
                                        type="button" 
                                        className={`hd-meta-mon-btn ${activePokemonId === mon.id ? 'is-active' : ''}`}
                                        onMouseEnter={() => handleMouseEnterMon(mon.id)}
                                        onClick={() => handleMonClick(mon)}
                                        title={(mon.name || '').replace(/-/g, ' ')}
                                    >
                                        <div className="hd-meta-mon-icon-wrap">
                                            <img src={getPokemonFrontSpriteUrl(mon.id)} alt="" aria-hidden="true" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                                            <span className="hd-meta-mon-badge" title={usingMeta ? (language === 'pt' ? 'uso no ladder' : 'ladder usage') : (language === 'pt' ? 'aparições' : 'appearances')}>{usingMeta ? `${mon.count}%` : mon.count}</span>
                                        </div>
                                        <span className="hd-meta-mon-name">{(mon.name || '').replace(/-/g, ' ')}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filtered Team List — desktop/tablet only (see isCompact above) */}
                        {!isCompact && (
                            <div className="border-t border-border pt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="hd-meta-caption hd-meta-caption--inline">
                                        {activePokemonId ? (
                                            <span>
                                                {language === 'pt' 
                                                    ? `Equipes com ${formatPokemonDisplayName((topPopular.find(p => p.id === activePokemonId) || popular.find(p => p.id === activePokemonId))?.name)}` 
                                                    : `Teams with ${formatPokemonDisplayName((topPopular.find(p => p.id === activePokemonId) || popular.find(p => p.id === activePokemonId))?.name)}`
                                                }
                                            </span>
                                        ) : (
                                            <span>{language === 'pt' ? 'Equipes Recentes VGC' : 'Recent VGC Teams'}</span>
                                        )}
                                    </p>
                                    {activePokemonId && (
                                        <button 
                                            type="button" 
                                            onClick={() => setActivePokemonId(null)}
                                            className="hd-panel__link"
                                        >
                                            {language === 'pt' ? 'Limpar filtro' : 'Clear filter'}
                                        </button>
                                    )}
                                </div>

                                <div className="hd-meta-teams-list">
                                    {filteredTeams.length === 0 ? (
                                        <div className="hd-meta-teams-empty text-center py-6 text-muted text-xs font-mono">
                                            {language === 'pt' ? 'Nenhuma equipe encontrada com este Pokémon.' : 'No teams found with this Pokémon.'}
                                        </div>
                                    ) : (
                                        filteredTeams.map((tm, i) => (
                                            <div 
                                                key={tm.id || i} 
                                                className="hd-meta-team-row" 
                                                onClick={() => navigate('/tournaments')} 
                                                role="button" 
                                                tabIndex={0}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/tournaments'); } }}
                                            >
                                                <div className="hd-meta-team-info">
                                                    <span className="hd-meta-team-player">{tm.title || tm.player}</span>
                                                    <span className="hd-meta-team-details">
                                                        {tm.format && <span className="hd-meta-team-badge">{tm.format}</span>}
                                                        <span className="truncate">{[tm.tournament, tm.placement].filter(Boolean).join(' · ')}</span>
                                                    </span>
                                                </div>
                                                <div className="hd-meta-team-roster">
                                                    {Array.from({ length: 6 }).map((_, j) => {
                                                        const mon = (tm.pokemons || [])[j];
                                                        if (!mon) {
                                                            return <div key={`empty-${j}`} className="hd-meta-team-roster-sprite-wrap is-empty" aria-hidden="true" />;
                                                        }
                                                        const isHighlighted = activePokemonId === mon.id;
                                                        return (
                                                            <div
                                                                key={`${mon.id}-${j}`}
                                                                className={`hd-meta-team-roster-sprite-wrap ${isHighlighted ? 'is-highlighted' : ''}`}
                                                                title={(mon.name || '').replace(/-/g, ' ')}
                                                            >
                                                                <img src={getPokemonFrontSpriteUrl(mon.id)} alt="" aria-hidden="true" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}

// Helper to format Pokémon name nicely for display (copied from HomeView for scope)
const formatPokemonDisplayName = (name = '') => {
    const overrides = {
        farfetchd: "Farfetch'd",
        sirfetchd: "Sirfetch'd",
        'mr-mime': 'Mr. Mime',
        'mime-jr': 'Mime Jr.',
        'mr-rime': 'Mr. Rime',
        'type-null': 'Type: Null',
        'porygon-z': 'Porygon-Z',
        'ho-oh': 'Ho-Oh',
        flabebe: 'Flabebe',
    };
    if (overrides[name]) return overrides[name];
    return name
        .split('-')
        .filter(Boolean)
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
};
