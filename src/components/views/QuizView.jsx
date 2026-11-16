import React, { Suspense, lazy, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Brain, Layers } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useUrlTab } from '../../hooks/useUrlTab';
import { useGamesToday } from '../../hooks/useGamesToday';
import { localDayNumber } from '../../utils/gamesToday';
import { dailyQuizFor } from '../../utils/dailyQuiz';
import { Loader } from '../Loader';
import '../../styles/quiz-hub.css';

// Each mode is its own chunk: picking one never downloads the other.
const GenerationQuizView = lazy(() => import('./GenerationQuizView').then((m) => ({ default: m.GenerationQuizView })));
const CategoryGuesserView = lazy(() => import('./CategoryGuesserView').then((m) => ({ default: m.CategoryGuesserView })));

const MODES = ['generations', 'categories'];
const MODE_ICONS = { generations: Layers, categories: Brain };

/**
 * One Quiz, two ways to play (2026-10-17): name every Pokémon of the
 * generations you pick, or every Pokémon drawn for one official trait (the old
 * PokéQuiz at /guesser, which now redirects here). The mode lives in the URL
 * (`?tab=categories`) so Back and a shared link land on the same one.
 *
 * The quiz of the day (2026-11-15) is a category: on the generations tab a
 * strip names it and opens it (`?tab=categories&daily=1`) while today's is
 * still to play; the category mode carries its own strip, with the run's state.
 */
export function QuizView({ showDetails, showToast }) {
    const { t, language } = useTranslation();
    const [mode, setMode] = useUrlTab(MODES, 'generations');
    const [, setParams] = useSearchParams();
    const gamesDone = useGamesToday();
    const daily = useMemo(() => dailyQuizFor(localDayNumber(Date.now())), []);
    const openDaily = () => setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'categories');
        next.set('daily', '1');
        return next;
    }, { replace: true, preventScrollReset: true });

    return (
        <div className="quiz-hub">
            <div className="quiz-hub__modes segmented" role="group" aria-label={t('quiz.modeLabel')}>
                {MODES.map((key) => {
                    const Icon = MODE_ICONS[key];
                    return (
                        <button key={key} type="button" className="segmented__item" aria-pressed={mode === key} onClick={() => setMode(key)}>
                            <Icon aria-hidden="true" />
                            {t(`quiz.modes.${key}`)}
                        </button>
                    );
                })}
            </div>

            {mode === 'generations' && daily && !gamesDone.quiz && (
                <button type="button" className="quiz-daily quiz-daily--link" onClick={openDaily}>
                    <span className="quiz-daily__mark" aria-hidden="true"><span className="live-dot" /></span>
                    <span className="quiz-daily__text">
                        <span className="quiz-daily__kicker">{t('quiz.daily.title')}</span>
                        <span className="quiz-daily__name">{daily.list.title[language === 'pt' ? 'pt' : 'en']}</span>
                    </span>
                    <span className="quiz-daily__fig">{t('quiz.daily.count', { n: daily.names.length })}</span>
                    <span className="quiz-daily__go">{t('quiz.daily.play')}</span>
                </button>
            )}

            <Suspense fallback={<Loader scene="think" block />}>
                {mode === 'categories'
                    ? <CategoryGuesserView showDetails={showDetails} showToast={showToast} />
                    : <GenerationQuizView showDetails={showDetails} showToast={showToast} />}
            </Suspense>
        </div>
    );
}

export default QuizView;
