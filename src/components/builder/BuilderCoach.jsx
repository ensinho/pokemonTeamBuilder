import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { isBeginnerTrainer } from '../../utils/trainerProfile';
import { MascotTip } from '../Mascot';

/**
 * The builder's coach (2026-11-05): for a trainer who said they are just
 * starting in competitive (`competitiveLevel: 'new'`), the mascot says what
 * the next step is, by where the team stands — empty, a few members, almost
 * there, complete. Closing it is for good on this device.
 */
const DISMISS_KEY = 'ptb:builderCoachDismissed';

const readDismissed = () => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
};

const coachStage = (size) => (size === 0 ? 'empty' : size < 3 ? 'start' : size < 6 ? 'grow' : 'full');

export function BuilderCoach({ teamSize = 0, className = '' }) {
    const { t } = useTranslation();
    const isBeginner = useAuthStore((s) => isBeginnerTrainer(s.trainerProfile));
    const [dismissed, setDismissed] = useState(readDismissed);
    if (!isBeginner || dismissed) return null;

    const stage = coachStage(teamSize);
    const dismiss = () => {
        setDismissed(true);
        try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* the tip just comes back next visit */ }
    };

    return (
        <div className={`builder-coach ${className}`} role="note" aria-live="polite">
            <MascotTip size="sm" cheer={stage === 'full'}>
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
