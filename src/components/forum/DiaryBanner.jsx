import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Puzzle } from 'lucide-react';
import { Mascot } from '../Mascot';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';

/**
 * The Diário do dia's header (2026-11-06, docs/plans/social-heart.md B1):
 * the day's room at the Centro Pokémon. The mascot at the counter, how many
 * results already arrived, and the two doors the day has — the puzzle and the
 * champions. Every "share to forum" from either lands in this thread.
 */
export function DiaryBanner({ messages = [], isToday, t, silhouette = null }) {
    const counts = useMemo(() => ({
        puzzle: messages.filter((m) => m.sharedPuzzle).length,
        challenge: messages.filter((m) => m.sharedChallenge).length,
    }), [messages]);
    const total = counts.puzzle + counts.challenge;

    return (
        <div className="diary-banner">
            <Mascot size="md" mood={total > 0 ? 'animado' : 'feliz'} pose={isToday ? 'acenando' : undefined} />
            <div className="diary-banner__text">
                <p className="diary-banner__lead">{t(isToday ? 'forum.diary.lead' : 'forum.diary.leadPast')}</p>
                <p className="diary-banner__count">
                    {total > 0
                        ? t('forum.diary.count', { puzzle: counts.puzzle, challenge: counts.challenge })
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
                    <Link to="/pokepuzzle" className="diary-door">
                        <Puzzle aria-hidden="true" />
                        <span>{t('forum.diary.puzzle')}</span>
                    </Link>
                    <Link to="/challenge" className="diary-door">
                        <Crown aria-hidden="true" />
                        <span>{t('forum.diary.challenge')}</span>
                    </Link>
                </div>
            )}
        </div>
    );
}

export default DiaryBanner;
