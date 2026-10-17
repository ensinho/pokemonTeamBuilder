import React, { useEffect, useMemo, useState } from 'react';
import { Check, Lightbulb, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useJourneyCoachStore } from '../../store/useJourneyCoachStore';
import { useJourneys, useMissionLauncher } from '../../hooks/useJourneys';
import { useTranslation } from '../../hooks/useTranslation';
import { findMission, nextMission } from '../../utils/journeys';
import { JOURNEY_ICONS } from './journeyIcons';
import '../../styles/journeys.css';

// A finished mission's card stays this long, then steps aside on its own.
const DONE_LINGER_MS = 12000;

/**
 * The guide that walks along with a mission (2026-10-17): what to do and how,
 * on whatever page the trainer is on, until the facts say it is done — then
 * the next mission, or the journey's badge. The launcher only starts it on a
 * mission that is still open, so "done" here always means "done while being
 * guided", which is what makes it safe to celebrate.
 */
function CoachCard({ missionId }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const launch = useMissionLauncher();
    const stopMission = useJourneyCoachStore((s) => s.stopMission);
    const { journeys, celebrateBadge } = useJourneys();
    const [showHint, setShowHint] = useState(true);

    const found = useMemo(() => findMission(journeys, missionId), [journeys, missionId]);
    const journey = found?.journey;
    const mission = found?.mission;
    const isDone = Boolean(mission?.done);
    const following = isDone ? nextMission(journey) : null;
    const journeyDone = Boolean(isDone && journey?.isComplete);

    // A mission id from an older build that no longer exists: drop it.
    useEffect(() => { if (!found) stopMission(); }, [found, stopMission]);

    useEffect(() => {
        if (!isDone) return undefined;
        if (journeyDone) celebrateBadge(journey.badgeId);
        const timer = window.setTimeout(stopMission, DONE_LINGER_MS);
        return () => window.clearTimeout(timer);
    }, [isDone, journeyDone, journey, celebrateBadge, stopMission]);

    if (!mission) return null;

    const Icon = JOURNEY_ICONS[journey.id];
    const title = t(`journeys.missions.${mission.id}.title`);

    return (
        <aside className={`journey-coach ${isDone ? 'is-done' : ''}`} aria-label={t('journeys.coach.label')}>
            <span className="journey-coach__mark" aria-hidden="true">
                {isDone ? <Check /> : <Icon />}
            </span>

            <div className="journey-coach__text" role="status" aria-live="polite">
                <span className="journey-coach__eyebrow">
                    {isDone
                        ? (journeyDone
                            ? t('journeys.coach.journeyDone', { journey: t(`journeys.list.${journey.id}.title`) })
                            : t('journeys.coach.done'))
                        : t('journeys.coach.eyebrow', { n: journey.level })}
                </span>
                <span className="journey-coach__title">{title}</span>
                {!isDone && showHint && (
                    <span className="journey-coach__hint">{t(`journeys.missions.${mission.id}.hint`)}</span>
                )}
            </div>

            <div className="journey-coach__actions">
                {!isDone && mission.progress && (
                    <span className="badge badge--figure">{mission.progress.current}/{mission.progress.target}</span>
                )}
                {!isDone && (
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => setShowHint((v) => !v)}
                        aria-pressed={showHint}
                        aria-label={showHint ? t('journeys.coach.hideHint') : t('journeys.coach.showHint')}
                        title={showHint ? t('journeys.coach.hideHint') : t('journeys.coach.showHint')}
                    >
                        <Lightbulb aria-hidden="true" />
                    </button>
                )}
                {isDone && following && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => launch(following)}>
                        {t('journeys.coach.next')}
                    </button>
                )}
                {isDone && !following && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => { stopMission(); navigate('/journeys'); }}>
                        {t('journeys.coach.seeJourneys')}
                    </button>
                )}
                <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-icon"
                    onClick={stopMission}
                    aria-label={t('journeys.coach.stop')}
                    title={t('journeys.coach.stop')}
                >
                    <X aria-hidden="true" />
                </button>
            </div>
        </aside>
    );
}

/**
 * Mounted once by the shell. Renders — and reads the trainer's stats, with the
 * listeners that takes — only while a mission is being guided, so the boot
 * path pays nothing for it. `hidden` steps aside on the screens that own the
 * whole viewport (a battle, the Champion's DS console).
 */
export function JourneyCoach({ hidden = false }) {
    const missionId = useJourneyCoachStore((s) => s.missionId);
    if (!missionId || hidden) return null;
    return <CoachCard key={missionId} missionId={missionId} />;
}

export default JourneyCoach;
