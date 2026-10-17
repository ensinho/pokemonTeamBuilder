import React, { Suspense, lazy } from 'react';
import { Brain, Layers } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useUrlTab } from '../../hooks/useUrlTab';
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
 */
export function QuizView({ showDetails, showToast }) {
    const { t } = useTranslation();
    const [mode, setMode] = useUrlTab(MODES, 'generations');

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

            <Suspense fallback={<Loader block />}>
                {mode === 'categories'
                    ? <CategoryGuesserView showDetails={showDetails} showToast={showToast} />
                    : <GenerationQuizView showDetails={showDetails} showToast={showToast} />}
            </Suspense>
        </div>
    );
}

export default QuizView;
