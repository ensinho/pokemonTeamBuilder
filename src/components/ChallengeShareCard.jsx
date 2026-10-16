import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';

import { useTranslation } from '../hooks/useTranslation';
import { readChallengeShare } from '../utils/challengeShare';

/**
 * A Champion Challenge result inside a forum message: the day, the outcome
 * and its figures, the win-chance curve as blocks, and a way in. Nothing about
 * either team. The payload was written by whoever posted, so it is read back
 * through `readChallengeShare` (checked and clamped) before anything is drawn.
 *
 * Reuses the shared-team card's shell, like the PokéPuzzle card, so a thread
 * keeps one visual language for "somebody attached something".
 */
export function ChallengeShareCard({ share }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const card = readChallengeShare(share);
    if (!card) return null;

    const title = card.difficulty
        ? t('forum.challengeTitleLevel', { level: t(`challenge.difficulty.${card.difficulty}`) })
        : t('forum.challengeTitle');

    return (
        <div className="forum-team-share-card forum-team-share-card--puzzle">
            <div className="forum-team-share-header">
                <h5 className="forum-team-share-title flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
                    {title}
                </h5>
                <span className={`badge shrink-0 ${card.won ? 'badge--success' : ''}`}>
                    {card.won ? t('forum.challengeWon') : t('forum.challengeLost')}
                </span>
            </div>

            <div className="puzzle-share-body">
                <div className="challenge-share-figures">
                    <span>
                        {card.won
                            ? t('forum.challengeFiguresWon', { turns: card.turns, remaining: card.remaining, score: card.score })
                            : t('forum.challengeFiguresLost', { turns: card.turns })}
                    </span>
                    {card.spark && (
                        <span className="challenge-share-spark" role="img" aria-label={t('challenge.result.chartTitle')}>{card.spark}</span>
                    )}
                    {(card.streak > 0 || card.place) && (
                        <span className="challenge-share-extra">
                            {[
                                card.streak > 0 ? t('challenge.share.streak', { n: card.streak }) : null,
                                card.place ? t('challenge.share.place', { place: card.place, board: t(`challenge.ranking.${card.board || 'daily'}`) }) : null,
                            ].filter(Boolean).join(' · ')}
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/challenge')}
                    className="btn btn-ghost puzzle-share-play h-7 px-2.5 text-xs font-bold shrink-0"
                >
                    {t('forum.challengePlay')}
                </button>
            </div>
        </div>
    );
}
