import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CircleHelp, Crown, Puzzle, Rows3 } from 'lucide-react';
import { Mascot } from '../Mascot';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';

/**
 * The Diário do dia's header (2026-11-06, docs/plans/social-heart.md B1):
 * the day's room at the Centro Pokémon. The mascot at the counter, how many
 * results already arrived, and the doors the day has — the champions, the
 * puzzle, the quiz and the tier list (four since 2026-11-15). Every "share
 * to forum" from any of them lands in this thread.
 */
export function DiaryBanner({ messages = [], isToday, t, silhouette = null }) {
    const counts = useMemo(() => ({
        puzzle: messages.filter((m) => m.sharedPuzzle).length,
        challenge: messages.filter((m) => m.sharedChallenge).length,
        quiz: messages.filter((m) => m.sharedQuiz).length,
        tier: messages.filter((m) => m.sharedTierList).length,
    }), [messages]);
    const total = counts.puzzle + counts.challenge + counts.quiz + counts.tier;
    // Only the games someone shared: a row of zeros reads as a dead room.
    const tally = [
        counts.challenge > 0 && t('forum.diary.tallyChallenge', { n: counts.challenge }),
        counts.puzzle > 0 && t('forum.diary.tallyPuzzle', { n: counts.puzzle }),
        counts.quiz > 0 && t('forum.diary.tallyQuiz', { n: counts.quiz }),
        counts.tier > 0 && t('forum.diary.tallyTier', { n: counts.tier }),
    ].filter(Boolean).join(' · ');

    return (
        <div className="diary-banner">
            <Mascot size="md" mood={total > 0 ? 'animado' : 'feliz'} pose={isToday ? 'acenando' : undefined} />
            <div className="diary-banner__text">
                <p className="diary-banner__lead">{t(isToday ? 'forum.diary.lead' : 'forum.diary.leadPast')}</p>
                <p className="diary-banner__count">
                    {total > 0
                        ? t('forum.diary.shared', { tally })
                        : t(isToday ? 'forum.diary.empty' : 'forum.diary.emptyPast')}
                </p>
            </div>
            {silhouette && (
                <div className={`diary-whos ${silhouette.revealed ? 'is-revealed' : ''}`}>
                    <img src={getPokemonArtworkSpriteUrl(silhouette.id)} alt="" width={96} height={96} decoding="async" className="diary-whos__art" />
                    <div className="diary-whos__text">
                        <strong>{t('forum.whos.title')}</strong>
                        <span>{silhouette.revealed ? t('forum.whos.revealed', { name: silhouette.name }) : t('forum.whos.how')}</span>
                    </div>
                </div>
            )}
            {isToday && (
                <div className="diary-banner__doors">
                    <Link to="/challenge" className="diary-door">
                        <Crown aria-hidden="true" />
                        <span>{t('forum.diary.challenge')}</span>
                    </Link>
                    <Link to="/pokepuzzle" className="diary-door">
                        <Puzzle aria-hidden="true" />
                        <span>{t('forum.diary.puzzle')}</span>
                    </Link>
                    <Link to="/quiz?tab=categories&daily=1" className="diary-door">
                        <CircleHelp aria-hidden="true" />
                        <span>{t('forum.diary.quiz')}</span>
                    </Link>
                    <Link to="/tier-list?daily=1" className="diary-door">
                        <Rows3 aria-hidden="true" />
                        <span>{t('forum.diary.tier')}</span>
                    </Link>
                </div>
            )}
        </div>
    );
}

export default DiaryBanner;
