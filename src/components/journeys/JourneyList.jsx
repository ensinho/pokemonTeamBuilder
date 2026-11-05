import React, { useId, useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useMissionLauncher } from '../../hooks/useJourneys';
import { getBadgeById } from '../../constants/badges';
import { currentJourney, personaJourneyFilter } from '../../utils/journeys';
import { derivePersona, hasAnsweredProfile, recommendedJourneyIds } from '../../utils/trainerProfile';
import { XP_RULES } from '../../utils/trainerLevel';
import { useAuthStore } from '../../store/useAuthStore';
import { JOURNEY_ICONS } from './journeyIcons';
import '../../styles/journeys.css';

/**
 * One mission: what to do, how, and a way to go do it. A done mission is a
 * plain row (nothing left to tap); a pending one is a button that starts the
 * guide and takes the trainer there. The pending mark is a dashed ring —
 * dashed means "not there yet", here as everywhere in this app.
 */
export function MissionRow({ mission }) {
    const { t } = useTranslation();
    const launch = useMissionLauncher();
    const title = t(`journeys.missions.${mission.id}.title`);

    if (mission.done) {
        return (
            <li className="mission is-done">
                <span className="mission__mark" aria-hidden="true"><Check /></span>
                <span className="mission__text">
                    <span className="mission__title">{title}</span>
                    <span className="mission__sub">{t('journeys.done')}</span>
                </span>
                {/* Earned: the reward as a gold pill (quest-list, 2026-11-05). */}
                <span className="badge badge--gold mission__reward">{t('journeys.xpReward', { n: XP_RULES.mission })}</span>
            </li>
        );
    }

    return (
        <li>
            <button type="button" className="mission" onClick={() => launch(mission)}>
                <span className="mission__mark" aria-hidden="true" />
                <span className="mission__text">
                    <span className="mission__title">{title}</span>
                    <span className="mission__sub">{t(`journeys.missions.${mission.id}.hint`)}</span>
                </span>
                {mission.progress && (
                    <span className="badge badge--figure mission__count">
                        {mission.progress.current}/{mission.progress.target}
                    </span>
                )}
                {/* Not yet: the reward as quiet coloured text, the row itself is the action. */}
                <span className="mission__reward is-pending">{t('journeys.xpReward', { n: XP_RULES.mission })}</span>
                <ChevronRight className="mission__go" aria-hidden="true" />
            </button>
        </li>
    );
}

/** The level's tile: its emblem once earned, its glyph until then. */
export function JourneyTile({ journey, isCurrent }) {
    const Icon = JOURNEY_ICONS[journey.id];
    const badge = getBadgeById(journey.badgeId);
    if (journey.isComplete && badge) {
        return <span className="journey__tile is-earned" aria-hidden="true"><badge.Icon /></span>;
    }
    return (
        <span className={`journey__tile ${isCurrent ? 'is-current' : ''}`} aria-hidden="true">
            <Icon />
        </span>
    );
}

/** The thin bar under a level's head: how much of it is done. */
export const JourneyBar = ({ percent }) => (
    <span className="journey__bar" aria-hidden="true">
        <i style={{ inlineSize: `${percent}%` }} />
    </span>
);

function JourneyCard({ journey, isCurrent, isRecommended, isOpen, onToggle }) {
    // A persona journey (2026-11-05) wears its profile, not a level number.
    const { t, language } = useTranslation();
    const bodyId = useId();
    const badge = getBadgeById(journey.badgeId);

    return (
        <section className={`card card--flush journey ${isCurrent ? 'is-current' : ''} ${journey.isComplete ? 'is-complete' : ''}`}>
            <button type="button" className="journey__head" aria-expanded={isOpen} aria-controls={bodyId} onClick={onToggle}>
                <JourneyTile journey={journey} isCurrent={isCurrent} />
                <span className="journey__text">
                    <span className="journey__level">
                        {journey.persona ? t('journeys.personaTag') : t('journeys.level', { n: journey.level })}
                        {isRecommended && !journey.isComplete && (
                            <span className="badge badge--primary journey__for-you">{t('onboarding.forYou')}</span>
                        )}
                    </span>
                    <span className="journey__title">{t(`journeys.list.${journey.id}.title`)}</span>
                    <span className="journey__sub">{t(`journeys.list.${journey.id}.sub`)}</span>
                </span>
                <span className="journey__count">{journey.doneCount}/{journey.total}</span>
                <ChevronDown className="journey__chevron" aria-hidden="true" />
            </button>

            {isOpen && (
                <div id={bodyId} className="journey__body">
                    <JourneyBar percent={journey.percent} />
                    <ol className="journey__missions">
                        {journey.missions.map((mission) => <MissionRow key={mission.id} mission={mission} />)}
                    </ol>
                    {badge && (
                        <p className={`journey__reward ${journey.isComplete ? 'is-earned' : ''}`}>
                            <badge.Icon className="journey__reward-icon" aria-hidden="true" />
                            <span>
                                {t('journeys.reward')}: <strong>{language === 'pt' ? badge.namePt : badge.nameEn}</strong>
                            </span>
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}

/**
 * The five levels as an accordion, the current one open. Opening another
 * closes nothing — a trainer comparing two levels keeps both in view.
 */
export function JourneyList({ journeys, personaJourneys = [] }) {
    const { t } = useTranslation();
    const current = currentJourney(journeys);
    // The journeys the trainer profile points at wear a "Para você" tag; the
    // order stays the levels' (an order, not a lock).
    const trainerProfile = useAuthStore((s) => s.trainerProfile);
    const recommended = new Set(recommendedJourneyIds(trainerProfile));
    // The trainer's own persona journey(s), after the levels.
    const persona = hasAnsweredProfile(trainerProfile) ? derivePersona(trainerProfile) : null;
    const mine = personaJourneys.filter(personaJourneyFilter(persona?.id));
    const [openIds, setOpenIds] = useState(() => new Set(current ? [current.id] : []));
    const toggle = (id) => setOpenIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    return (
        <div className="journey-list">
            {journeys.map((journey) => (
                <JourneyCard
                    key={journey.id}
                    journey={journey}
                    isCurrent={journey.id === current?.id}
                    isRecommended={recommended.has(journey.id)}
                    isOpen={openIds.has(journey.id)}
                    onToggle={() => toggle(journey.id)}
                />
            ))}
            {mine.length > 0 && (
                <>
                    <h2 className="journey-list__section">
                        {persona.id === 'master'
                            ? t('journeys.personaSectionMaster')
                            : t('journeys.personaSection', { persona: t(`onboarding.personas.${persona.id}.name`) })}
                    </h2>
                    {mine.map((journey) => (
                        <JourneyCard
                            key={journey.id}
                            journey={journey}
                            isCurrent={false}
                            isRecommended={false}
                            isOpen={openIds.has(journey.id)}
                            onToggle={() => toggle(journey.id)}
                        />
                    ))}
                </>
            )}
        </div>
    );
}

export default JourneyList;
