import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { weeklyStandings } from '../../utils/forumWeekly';
import { Mascot } from '../Mascot';

/**
 * The Torneio da semana's header (2026-11-06, social-heart B2): the week's
 * theme in a line, the podium so far (votes = likes + reactions), and the
 * one action — enter a team. The week's winner earns the "Campeão da semana"
 * badge when the week closes.
 */
export function WeeklyBanner({ topic, messages = [], isCurrent, onEnter, t }) {
    const standings = useMemo(() => weeklyStandings(messages).slice(0, 3), [messages]);
    return (
        <div className="weekly-banner">
            <div className="weekly-banner__head">
                <Mascot size="md" mood="desafiador" />
                <div className="weekly-banner__text">
                    <p className="weekly-banner__theme">{t(`forum.weekly.themes.${topic.theme}.rule`)}</p>
                    <p className="weekly-banner__how">{t(isCurrent ? 'forum.weekly.how' : 'forum.weekly.closed')}</p>
                </div>
            </div>
            {standings.length > 0 && (
                <ol className="weekly-banner__podium" aria-label={t('forum.weekly.standings')}>
                    {standings.map(({ message, score }, i) => (
                        <li key={message.id} className={`weekly-banner__place is-${i + 1}`}>
                            <span className="weekly-banner__rank">{i === 0 ? <Trophy aria-hidden="true" /> : i + 1}</span>
                            <span className="weekly-banner__name">{message.creatorName}</span>
                            <span className="weekly-banner__team">{message.sharedTeam?.name}</span>
                            <span className="weekly-banner__votes">{t('forum.weekly.votes', { n: score })}</span>
                        </li>
                    ))}
                </ol>
            )}
            {isCurrent && (
                <button type="button" className="btn btn-primary weekly-banner__cta" onClick={onEnter}>
                    {t('forum.weekly.enter')}
                </button>
            )}
        </div>
    );
}

export default WeeklyBanner;
