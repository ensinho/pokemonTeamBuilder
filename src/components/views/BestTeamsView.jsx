import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/entity-detail-view.css';
import '../../styles/tools-views.css';
import '../../styles/best-teams.css';

import { useTournamentData } from '../../hooks/useTournamentData';
import { useEntityNavigate } from '../../hooks/useEntityNavigate';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { bestTeamsSummary } from '../../utils/bestTeams';
import { titleCaseSlug } from '../../utils/smogonSets';
import { EmptyState } from '../EmptyState';
import { Loader } from '../Loader';
import { MonSprite, SourceCredit } from './metaShared';
import { TournamentTeamCard } from './TournamentTeamCard';
import { Share2 } from 'lucide-react';
import { useSharePage } from '../../hooks/useSharePage';

/**
 * The best teams of the current regulation (`/best-teams`, 2026-10-24), for
 * the "best VGC teams" searches: the teams that finished on top, the Pokémon
 * they use most and the pairs that keep coming back — every Pokémon a link to
 * its page, every team a tap from the builder. The numbers come from
 * utils/bestTeams.js, which the prerender (api/render-meta.js) reads too.
 */

function PokemonRow({ entry, rank, t }) {
    return (
        <li>
            <Link to={`/pokemon/${entry.id}`} className="bt-row">
                <span className="bt-row__rank">{rank}</span>
                <MonSprite id={entry.id} name={entry.name} className="bt-row__sprite image-pixelated" />
                <span className="bt-row__name">{titleCaseSlug(entry.name)}</span>
                <span className="bt-row__bar" aria-hidden="true"><span style={{ width: `${entry.share}%` }} /></span>
                <span className="bt-row__figure">{t('bestTeamsPage.pokemonShare', { share: entry.share })}</span>
            </Link>
        </li>
    );
}

function PairRow({ pair, t }) {
    return (
        <li className="bt-pair">
            {[pair.a, pair.b].map((mon) => (
                <Link key={mon.id} to={`/pokemon/${mon.id}`} className="bt-pair__mon">
                    <MonSprite id={mon.id} name={mon.name} className="bt-row__sprite image-pixelated" />
                    <span className="bt-row__name">{titleCaseSlug(mon.name)}</span>
                </Link>
            ))}
            <span className="bt-row__figure">{t('bestTeamsPage.pairShare', { count: pair.count })}</span>
        </li>
    );
}

export function BestTeamsView({ onOpenTeam }) {
    const { t, language } = useTranslation();
    const pt = language === 'pt';
    const navigate = useNavigate();
    const { linkState } = useEntityNavigate();
    const { teams, status } = useTournamentData();
    const summary = useMemo(() => bestTeamsSummary(teams), [teams]);
    const sharePage = useSharePage();
    useDocumentMeta({ path: '/best-teams' });

    if (status === 'loading') return <Loader size="lg" block />;
    if (!summary) return <EmptyState title={t('bestTeamsPage.empty')} />;

    const format = summary.format || 'VGC';

    return (
        <div className="edv best-teams">
            <header className="edv-header bt-hero">
                <span className="edv-kicker">{t('bestTeamsPage.kicker', { format })}</span>
                <h1 className="edv-title bt-hero__title">{t('bestTeamsPage.title', { format })}</h1>
                <p className="edv-lead">{t('bestTeamsPage.lede', { total: summary.total, events: summary.events })}</p>
                <div className="bt-hero__actions">
                    <Link to="/builder" className="btn btn-primary">{t('bestTeamsPage.buildOwn')}</Link>
                    <Link to="/tournaments" className="btn btn-outline">{t('bestTeamsPage.allTeams')}</Link>
                    <button type="button" className="btn btn-outline" onClick={() => sharePage('/best-teams', t('bestTeamsPage.title', { format }))}>
                        <Share2 aria-hidden="true" />
                        {t('common.sharePage')}
                    </button>
                </div>
            </header>

            {/* Unframed: the cards carry their own border (never a box in a box). */}
            <section className="bt-top" aria-labelledby="bt-top">
                <h2 id="bt-top" className="edv-section__title">{t('bestTeamsPage.top')}</h2>
                <div className="trn-grid">
                    {summary.top.map((team, i) => (
                        <TournamentTeamCard key={team.id || i} team={team} onOpen={onOpenTeam} navigate={navigate} linkState={linkState} t={t} pt={pt} />
                    ))}
                </div>
            </section>

            <div className="edv-main">
                <section className="edv-section" aria-labelledby="bt-pokemon">
                    <h2 id="bt-pokemon" className="edv-section__title">{t('bestTeamsPage.pokemon')}</h2>
                    <ol className="bt-list">
                        {summary.pokemon.map((entry, i) => <PokemonRow key={entry.id} entry={entry} rank={i + 1} t={t} />)}
                    </ol>
                </section>
                <section className="edv-section" aria-labelledby="bt-pairs">
                    <h2 id="bt-pairs" className="edv-section__title">{t('bestTeamsPage.pairs')}</h2>
                    <ol className="bt-list">
                        {summary.pairs.map((pair) => <PairRow key={`${pair.a.id}-${pair.b.id}`} pair={pair} t={t} />)}
                    </ol>
                </section>
            </div>

            <SourceCredit pt={pt} sources={['vgcpastes', 'limitless']} className="px-1" />
        </div>
    );
}
