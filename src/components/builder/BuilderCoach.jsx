import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { useFirestoreTeamsStore } from '../../store/useFirestoreTeamsStore';
import { isBeginnerTrainer } from '../../utils/trainerProfile';
import { MascotTip } from '../Mascot';
import { dismissCoach, isCoachDismissed } from './coachState';

/**
 * The builder's coach: guides both competitive beginners (all stages 0 → 6)
 * AND any first-time builder facing an empty roster (`teamSize === 0` with no
 * saved teams yet). For non-beginners, it steps aside automatically the instant
 * the first Pokémon is added so `MascotVerdict` takes over — never two mascots
 * on screen at once. Closing it is persisted on this device.
 */
const coachStage = (size) => (size === 0 ? 'empty' : size < 3 ? 'start' : size < 6 ? 'grow' : 'full');

const COACH_FACE = {
    empty: { pose: 'apontando' },
    start: { mood: 'animado' },
    grow: { mood: 'determinado' },
    full: { mood: 'radiante', pose: 'comemorando' },
};

export function BuilderCoach({ teamSize = 0, onOpenGuide, className = '' }) {
    const { t } = useTranslation();
    const isBeginner = useAuthStore((s) => isBeginnerTrainer(s.trainerProfile));
    const savedTeamsCount = useFirestoreTeamsStore((s) => s.savedTeams.length);
    const [dismissed, setDismissed] = useState(isCoachDismissed);
    const stage = coachStage(teamSize);
    const previous = useRef(stage);
    const [celebrate, setCelebrate] = useState(0);
    useEffect(() => {
        if (stage === 'full' && previous.current !== 'full') setCelebrate((n) => n + 1);
        previous.current = stage;
    }, [stage]);

    const isFirstTimeEmpty = teamSize === 0 && savedTeamsCount === 0;
    if ((!isBeginner && !isFirstTimeEmpty) || dismissed) return null;

    const dismiss = () => {
        setDismissed(true);
        dismissCoach();
    };

    return (
        <div className={`builder-coach ${className}`} role="note" aria-live="polite">
            <MascotTip size="sm" {...COACH_FACE[stage]} play={celebrate ? 'celebrate' : undefined} playKey={celebrate}>
                <strong className="builder-coach__title">{t(`builder.coach.${stage}.title`)}</strong>
                <span className="builder-coach__body">{t(`builder.coach.${stage}.body`)}</span>
                {stage === 'empty' && onOpenGuide && (
                    <button type="button" className="btn-link builder-coach__action" onClick={onOpenGuide}>
                        {t('builder.howItWorks')}
                    </button>
                )}
            </MascotTip>
            <button type="button" className="builder-coach__close" onClick={dismiss} aria-label={t('builder.coach.dismiss')}>
                <X aria-hidden="true" />
            </button>
        </div>
    );
}

export default BuilderCoach;
