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

            {/* Loading skeleton while the tournament + Pokémon dataset loads */}
            {isLoading && (
                <section className="hd-panel hd-panel--meta">
                    <div className="hd-panel__head">
                        <span className="hd-panel__title"><Flame className="w-4 h-4" /> VGC Meta</span>
                    </div>
                    <div className="hd-panel__body">
                        <div className="hd-meta-mons-grid">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="hd-skel-mon-btn" aria-hidden="true">
                                    <span className="hd-skel hd-skel-mon-icon" />
                                    <span className="hd-skel hd-skel-mon-name" />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* VGC meta. The rail of Pokémon the ladder is actually playing is
                the part every screen gets, and a tap goes to that Pokémon's
                usage page — the old hover-to-filter was never reachable on a
                touch screen. Under it, where there is room, the latest
                tournament teams: see .hd-meta-teams in the stylesheet for why
                that is a question about the window's height, not its width. */}
            {status === 'ready' && topPopular.length > 0 && (
                <section className="hd-panel hd-panel--meta">
                    <div className="hd-panel__head">
                        <span className="hd-panel__title">
                            <Flame className="w-4 h-4 text-warning" /> VGC Meta
                        </span>
                        <button type="button" className="hd-panel__link" onClick={() => navigate('/tournaments')}>
                            {t('home.viewAll')}
                        </button>
                    </div>
                    <div className="hd-panel__body">
                        <p className="hd-meta-caption">
                            {language === 'pt' ? 'Pokémon populares' : 'Popular Pokémon'}
                            {usingMeta && metaFormat?.label && <span className="hd-meta-caption__format"> · {metaFormat.label}</span>}
                        </p>
                        <div className="hd-meta-mons-grid">
                            {topPopular.slice(0, 10).map((mon) => (
                                <button
                                    key={mon.id}
                                    type="button"
                                    className="hd-meta-mon-btn"
                                    onClick={() => navigate(`/meta/${mon.name || mon.id}`)}
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

                        {!isFlattened && recent.length > 0 && (
                            <div className="hd-meta-teams">
                                <ul className="hd-tourney-list">
                                    {recent.slice(0, 2).map((tm, i) => (
                                        <li key={tm.id || i}>
                                            <button
                                                type="button"
                                                className="hd-tourney-row"
                                                onClick={() => navigate(tm.id ? `/tournaments/team/${tm.id}` : '/tournaments')}
                                            >
                                                <span className="hd-tourney-row__roster" aria-hidden="true">
                                                    {(tm.pokemons || []).slice(0, 6).map((mon, j) => (
                                                        <img
                                                            key={`${mon.id}-${j}`}
                                                            src={getPokemonFrontSpriteUrl(mon.id)}
                                                            alt=""
                                                            loading="lazy"
                                                            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                                        />
                                                    ))}
                                                </span>
                                                <span className="hd-tourney-row__text">
                                                    <span className="hd-tourney-row__title">{tm.title || tm.player}</span>
                                                    {/* The regulation badge rides the second line rather than a
                                                        third column: as a column it took ~55px off a title that
                                                        was already truncating at half a panel wide. */}
                                                    <span className="hd-tourney-row__meta">
                                                        {tm.format && <span className="hd-tourney-row__badge">{tm.format}</span>}
                                                        <span className="hd-tourney-row__event">
                                                            {[tm.tournament, tm.placement].filter(Boolean).join(' · ')}
                                                        </span>
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </section>
            )}

        </div>
    );
}
