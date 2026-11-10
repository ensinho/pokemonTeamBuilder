import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { isBeginnerTrainer } from '../../utils/trainerProfile';
import { teamVerdict, verdictImproved } from '../../utils/mascot/assistant';
import { Mascot } from '../Mascot';
import { COACH_DISMISS_EVENT, isCoachDismissed } from './coachState';

/**
 * The mascot's verdict on the team being built (2026-11-10, the proposal's
 * "Time completo! · Muitas fraquezas… · Ótima cobertura!"): his face is the
 * readout, the sentence beside him is the app's. What he thinks is
 * `teamVerdict()`'s call (utils/mascot/assistant.js) on the same analysis the
 * rating reads, so the two can never disagree.
 *
 * He cheers only a step up the trainer just made (a weakness covered, the
 * sixth member) — never a team that loaded, never a step down. While the
 * beginner's coach is on screen he is the voice there, and this stays out.
 */
export function MascotVerdict({ analysis, teamSize = 0, className = '' }) {
    const { t } = useTranslation();
    const isBeginner = useAuthStore((s) => isBeginnerTrainer(s.trainerProfile));
    const [coachGone, setCoachGone] = useState(isCoachDismissed);
    useEffect(() => {
        const onGone = () => setCoachGone(true);
        window.addEventListener(COACH_DISMISS_EVENT, onGone);
        return () => window.removeEventListener(COACH_DISMISS_EVENT, onGone);
    }, []);

    const verdict = useMemo(() => teamVerdict(analysis, teamSize), [analysis, teamSize]);
    const previous = useRef(verdict?.id || null);
    const [cheer, setCheer] = useState(0);
    useEffect(() => {
        const id = verdict?.id || null;
        if (verdictImproved(previous.current, id)) setCheer((n) => n + 1);
        previous.current = id;
    }, [verdict?.id]);

    if (!verdict || (isBeginner && !coachGone)) return null;

    const types = verdict.types.slice(0, 3).map((type) => t(`types.${type}`)).join(', ');
    const peak = verdict.id === 'complete' || verdict.id === 'coverage';
    return (
        <div className={`mascot-verdict ${className}`} data-verdict={verdict.id} role="status">
            <Mascot size="md" mood={verdict.mood} seasonal={false} play={cheer ? (peak ? 'celebrate' : 'hop') : undefined} playKey={cheer} />
            <p className="mascot-verdict__text">
                <strong className="mascot-verdict__title">{t(`builder.verdict.${verdict.id}.title`, { types })}</strong>
                <span className="mascot-verdict__body">{t(`builder.verdict.${verdict.id}.body`, { types, n: verdict.covered })}</span>
            </p>
        </div>
    );
}

export default MascotVerdict;
