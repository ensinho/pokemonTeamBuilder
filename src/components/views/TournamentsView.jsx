import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/tools-views.css';
import { useTournamentData } from '../../hooks/useTournamentData';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { EmptyState } from '../EmptyState';
import { SourceCredit } from './metaShared';
import { TrophyIcon, ClearIcon } from '../icons';
import { TournamentTeamCard as TeamCard } from './TournamentTeamCard';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useProgressiveReveal } from '../../hooks/useProgressiveReveal';
import { maxWidthBelow } from '../../constants/breakpoints';
import { ShowMoreButton } from '../ShowMoreButton';
import { Loader } from '../Loader';

// Match a team against the search term across its Pokémon, title/player,
// tournament name, placement, format and date — so any of those finds it.
function teamMatches(team, q) {
    if (!q) return true;
    const haystack = [
        team.title, team.player, team.tournament, team.placement, team.format, team.date,
        ...(Array.isArray(team.pokemons) ? team.pokemons.map((m) => m.name) : []),
    ];
    return haystack.some((v) => typeof v === 'string' && v.toLowerCase().includes(q));
}

export function TournamentsView({ onOpenTeam }) {
    const { t, language } = useTranslation();
    const pt = language === 'pt';
    useDocumentMeta({
        title: 'Tournament Teams',
        description: 'Real teams from recent VGC tournaments with placements, full sets, and one-click import into the builder.',
        path: '/tournaments',
    });
    const navigate = useNavigate();
    const { linkState } = useEntityNavigate();
    const { teams, status } = useTournamentData();
    const [search, setSearch] = useState('');

    const query = search.trim().toLowerCase();
    const { featured, tournament } = useMemo(() => {
        const matched = query ? teams.filter((tm) => teamMatches(tm, query)) : teams;
        return {
            featured: matched.filter((tm) => tm.featured),
            tournament: matched.filter((tm) => !tm.featured),
        };
    }, [teams, query]);

    // At one column on a phone, 40 featured + 80 tournament cards were ~30,000px
    // of scroll and 720 sprites loaded up front. Reveal each section in pages
    // there; desktop's multi-column grid keeps them all. A search starts over.
    const isMobile = useMediaQuery(maxWidthBelow('lg'));
    // Paged on desktop too: all 120 teams at once was 11.5 screens and 720
    // sprites on first paint (2026-10-14). Desktop pages are just bigger.
    const featuredReveal = useProgressiveReveal(featured.length, { initial: isMobile ? 4 : 8, step: isMobile ? 10 : 16, resetKey: query });
    const tournamentReveal = useProgressiveReveal(tournament.length, { initial: isMobile ? 6 : 12, step: isMobile ? 10 : 24, resetKey: query });

    if (status === 'loading') {
        return (
            <Loader size="lg" block />
        );
    }

    if (teams.length === 0) {
        return <EmptyState title={t('tools.tournamentsEmpty')} message={t('tools.tournamentsEmptyDesc')} />;
    }

    const noMatches = query && featured.length === 0 && tournament.length === 0;

    return (
        <div>
            <div className="trn-toolbar">
                <div className="trn-search-wrap">
                    <span className="trn-search-icon" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder={t('tools.searchTournaments')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="trn-search-input"
                    />
                    {search && (
                        <button type="button" onClick={() => setSearch('')} className="trn-search-clear" aria-label={t('common.clear')}>
                            <ClearIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {noMatches && <EmptyState compact title={t('tools.tournamentsNoMatch')} message={t('db.noMatchesDesc')} />}

            {featured.length > 0 && (
                <section className="trn-section">
                    <h2 className="trn-section__title"><TrophyIcon className="w-5 h-5" /> {t('tools.featuredTeams')}</h2>
                    <div className="trn-grid">
                        {featured.slice(0, featuredReveal.limit).map((tm, i) => <TeamCard key={tm.id || `f${i}`} team={tm} onOpen={onOpenTeam} navigate={navigate} linkState={linkState} t={t} pt={pt} />)}
                    </div>
                    {featuredReveal.hasMore && <ShowMoreButton remaining={featuredReveal.remaining} onClick={featuredReveal.showMore} />}
                </section>
            )}

            {tournament.length > 0 && (
                <section className="trn-section">
                    <h2 className="trn-section__title"><TrophyIcon className="w-5 h-5" /> {t('tools.tournamentTeams')}</h2>
                    <div className="trn-grid">
                        {tournament.slice(0, tournamentReveal.limit).map((tm, i) => <TeamCard key={tm.id || `t${i}`} team={tm} onOpen={onOpenTeam} navigate={navigate} linkState={linkState} t={t} pt={pt} />)}
                    </div>
                    {tournamentReveal.hasMore && <ShowMoreButton remaining={tournamentReveal.remaining} onClick={tournamentReveal.showMore} />}
                </section>
            )}

            <SourceCredit pt={pt} sources={['vgcpastes', 'limitless']} className="mt-6 px-1 pb-2" />
        </div>
    );
}
