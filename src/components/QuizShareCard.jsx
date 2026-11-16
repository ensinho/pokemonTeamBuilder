import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleHelp } from 'lucide-react';

import { useTranslation } from '../hooks/useTranslation';
import { readQuizShare } from '../utils/gameShare';
import { quizListById } from '../utils/dailyQuiz';

/**
 * A quiz result inside a forum message (2026-11-15): which quiz, how many
 * were named, and a way to play the same one. A category run shows its mark
 * as pips — one per Pokémon asked, filled for each one named — and opens that
 * category; a generations run shows its figure and opens the duel
 * (`?duel=`, the same mark to beat). No Pokémon is ever named: a result
 * never spoils the list for whoever reads the thread.
 *
 * Read back through `readQuizShare` (checked and clamped). Reuses the
 * shared-team card's shell. Its own chunk — the category table comes with it.
 */
export function QuizShareCard({ share }) {
    const { t, language } = useTranslation();
    const navigate = useNavigate();
    const card = readQuizShare(share);
    if (!card) return null;

    const isCategory = card.mode === 'category';
    const category = isCategory ? quizListById(card.listId) : null;
    const name = isCategory
        ? (category ? category.title[language === 'pt' ? 'pt' : 'en'] : t('quiz.modes.categories'))
        : card.generations.length === 9
            ? t('forum.quizAllGens')
            : `Gen ${card.generations.map((key) => key.replace('generation-', '').toUpperCase()).join(' · ')}`;
    const title = t(isCategory && card.daily ? 'forum.quizTitleDaily' : 'forum.quizTitle', { name });
    const perfect = card.found === card.total;
    const open = () => navigate(isCategory
        ? `/quiz?tab=categories&list=${card.listId}`
        : `/quiz?duel=${card.duel}`);

    return (
        <div className="forum-team-share-card forum-team-share-card--puzzle">
            <div className="forum-team-share-header">
                <h5 className="forum-team-share-title flex items-center gap-1">
                    <CircleHelp className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                    {title}
                </h5>
                <span className={`badge shrink-0 ${perfect ? 'badge--success' : ''}`}>{card.found}/{card.total}</span>
            </div>

            <div className="puzzle-share-body">
                {isCategory ? (
                    <span className="quiz-share__pips" role="img" aria-label={t('forum.quizMark', { found: card.found, total: card.total })}>
                        {Array.from({ length: card.total }, (_, i) => (
                            <span key={i} className={`quiz-share__pip ${i < card.found ? 'is-found' : ''}`} />
                        ))}
                    </span>
                ) : (
                    <span className="quiz-share__meter" role="img" aria-label={t('forum.quizMark', { found: card.found, total: card.total })}>
                        <span className="quiz-share__fill" style={{ '--quiz-share': `${Math.round((card.found / card.total) * 100)}%` }} />
                    </span>
                )}

                <button
                    type="button"
                    onClick={open}
                    className="btn btn-ghost puzzle-share-play h-7 px-2.5 text-xs font-bold shrink-0"
                >
                    {t(isCategory ? 'forum.quizPlay' : 'forum.quizBeat')}
                </button>
            </div>
        </div>
    );
}

export default QuizShareCard;
