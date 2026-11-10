import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { isBeginnerTrainer } from '../../utils/trainerProfile';
import { MascotTip } from '../Mascot';
import { dismissCoach, isCoachDismissed } from './coachState';

/**
 * The builder's coach (2026-11-05): for a trainer who said they are just
 * starting in competitive (`competitiveLevel: 'new'`), the mascot says what
 * the next step is, by where the team stands — empty, a few members, almost
 * there, complete. Closing it is for good on this device.
 */
const coachStage = (size) => (size === 0 ? 'empty' : size < 3 ? 'start' : size < 6 ? 'grow' : 'full');

// The coach's face follows the team: pointing at where to start, glad, set on
// finishing, radiant at six. Only the step to six celebrates — opening the
// builder on a full team is data that loaded, not something just done.
const COACH_FACE = {
    empty: { pose: 'apontando' },
    start: { mood: 'animado' },
    grow: { mood: 'determinado' },
    full: { mood: 'radiante', pose: 'comemorando' },
};

export function BuilderCoach({ teamSize = 0, className = '' }) {
    const { t } = useTranslation();
    const isBeginner = useAuthStore((s) => isBeginnerTrainer(s.trainerProfile));
    const [dismissed, setDismissed] = useState(isCoachDismissed);
    const stage = coachStage(teamSize);
    const previous = useRef(stage);
    const [celebrate, setCelebrate] = useState(0);
    useEffect(() => {
        if (stage === 'full' && previous.current !== 'full') setCelebrate((n) => n + 1);
        previous.current = stage;
    }, [stage]);
    if (!isBeginner || dismissed) return null;

    const dismiss = () => {
        setDismissed(true);
        dismissCoach();
    };

    return (
        <div className={`builder-coach ${className}`} role="note" aria-live="polite">
            <MascotTip size="sm" {...COACH_FACE[stage]} play={celebrate ? 'celebrate' : undefined} playKey={celebrate}>
                <strong className="builder-coach__title">{t(`builder.coach.${stage}.title`)}</strong>
                <span className="builder-coach__body">{t(`builder.coach.${stage}.body`)}</span>
            </MascotTip>
            <button type="button" className="builder-coach__close" onClick={dismiss} aria-label={t('builder.coach.dismiss')}>
                <X aria-hidden="true" />
            </button>
        </div>
    );
}

export default BuilderCoach;
