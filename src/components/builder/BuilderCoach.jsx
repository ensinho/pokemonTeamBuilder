import React, { useEffect, useState } from 'react';
import { Dices, HelpCircle, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { useFirestoreTeamsStore } from '../../store/useFirestoreTeamsStore';
import { isBeginnerTrainer } from '../../utils/trainerProfile';
import { MascotFace } from '../Mascot';
import { COACH_DISMISS_EVENT, dismissCoach, isCoachDismissed } from './coachState';

/**
 * The builder's coach: sleek 1-line inline strip (borderless tonal fill, zero
 * nested boxes) that guides beginners (stages 0 → 6) and first-time builders on
 * an empty roster without pushing the Pokémon picker grid off screen. When
 * hidden or dismissed, renders optional `fallback` so callers never duplicate
 * empty-state copy alongside the coach.
 */
const coachStage = (size) => (size === 0 ? 'empty' : size < 3 ? 'start' : size < 6 ? 'grow' : 'full');

const COACH_MOOD = {
    empty: 'curioso',
    start: 'animado',
    grow: 'determinado',
    full: 'radiante',
};

export function BuilderCoach({
    teamSize = 0,
    onOpenGuide,
    onRandomize,
    isRandomizing = false,
    canRandomize = false,
    compact = false,
    fallback = null,
    className = '',
}) {
    const { t } = useTranslation();
    const isBeginner = useAuthStore((s) => isBeginnerTrainer(s.trainerProfile));
    const savedTeamsCount = useFirestoreTeamsStore((s) => s.savedTeams.length);
    const [dismissed, setDismissed] = useState(isCoachDismissed);

    useEffect(() => {
        const onDismissed = () => setDismissed(true);
        window.addEventListener(COACH_DISMISS_EVENT, onDismissed);
        return () => window.removeEventListener(COACH_DISMISS_EVENT, onDismissed);
    }, []);

    const stage = coachStage(teamSize);
    const isFirstTimeEmpty = teamSize === 0 && savedTeamsCount === 0;
    const visible = !dismissed && (isBeginner || isFirstTimeEmpty);

    if (!visible) return fallback;

    const title = t(`builder.coach.${stage}.title`);
    const body = t(`builder.coach.${stage}.body`);

    const dismiss = () => {
        setDismissed(true);
        dismissCoach();
    };

    return (
        <div
            className={`tb-coach-strip ${compact ? 'tb-coach-strip--compact' : ''} ${className}`.trim()}
            role="note"
            aria-live="polite"
            title={body}
        >
            <MascotFace mood={COACH_MOOD[stage]} size="xs" className="tb-coach-strip__face" />
            <p className="tb-coach-strip__text">
                <span className="tb-coach-strip__title">{title}</span>
            </p>
            <div className="tb-coach-strip__actions">
                {stage === 'empty' && onRandomize && (
                    <button
                        type="button"
                        className="tb-coach-strip__btn"
                        onClick={onRandomize}
                        disabled={isRandomizing || !canRandomize}
                    >
                        <Dices aria-hidden="true" />
                        <span>{t('markedUi.builder.coachRandom')}</span>
                    </button>
                )}
                {stage === 'empty' && onOpenGuide && (
                    <button
                        type="button"
                        className="tb-coach-strip__icon-btn"
                        onClick={onOpenGuide}
                        aria-label={t('builder.howItWorks')}
                        title={t('builder.howItWorks')}
                    >
                        <HelpCircle aria-hidden="true" />
                    </button>
                )}
                <button
                    type="button"
                    className="tb-coach-strip__icon-btn"
                    onClick={dismiss}
                    aria-label={t('builder.coach.dismiss')}
                    title={t('builder.coach.dismiss')}
                >
                    <X aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}

export default BuilderCoach;
