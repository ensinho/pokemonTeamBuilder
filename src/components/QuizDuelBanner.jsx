import React from 'react';
import { Mascot } from './Mascot';

/**
 * The quiz duel (2026-11-06, docs/plans/social-heart.md D3): someone found
 * N of M in these generations — beat it. Before the run it names the mark;
 * during the run it shows both figures side by side, and the moment you pass
 * the mark the mascot notices (once — the peak, the middle stays quiet).
 */
export function QuizDuelBanner({ duel, found = null, t }) {
    const playing = Number.isInteger(found);
    const passed = playing && found > duel.found;
    const gens = duel.generations.map((key) => key.replace('generation-', '').toUpperCase()).join(' · ');
    return (
        <div className={`quiz-duel ${passed ? 'is-passed' : ''}`} role="status" aria-live="polite">
            <Mascot size="sm" mood={passed ? 'radiante' : 'desafiador'} play={passed ? 'celebrate' : undefined} playKey={passed ? 1 : 0} />
            <div className="quiz-duel__text">
                <span className="quiz-duel__title">{t(passed ? 'quiz.duel.passed' : 'quiz.duel.title')}</span>
                <span className="quiz-duel__sub">{t('quiz.duel.sub', { found: duel.found, total: duel.total, gens })}</span>
            </div>
            {playing && (
                <span className="quiz-duel__score" aria-label={t('quiz.duel.scoreLabel', { mine: found, theirs: duel.found })}>
                    <strong>{found}</strong>
                    <span className="quiz-duel__vs">×</span>
                    <span>{duel.found}</span>
                </span>
            )}
        </div>
    );
}

export default QuizDuelBanner;
