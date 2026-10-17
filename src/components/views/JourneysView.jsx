import React from 'react';
import { Award, Flag, Route } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useUrlTab } from '../../hooks/useUrlTab';
import { useJourneys } from '../../hooks/useJourneys';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { journeyTotals } from '../../utils/journeys';
import { JourneyList } from '../journeys/JourneyList';
import { BadgeGallery } from '../journeys/BadgeGallery';
import { EmptyState } from '../EmptyState';
import '../../styles/journeys.css';

const TABS = ['journeys', 'badges'];

/**
 * Journeys (2026-10-17): the onboarding that keeps teaching. Five levels of
 * missions, each done by actually using the app, and the badges they and
 * everything else earn — modelled on a missions/medals screen (levels as an
 * accordion, badges grouped by how they are earned, a detail sheet with one
 * action). Points were left out on purpose: the reward is the badge.
 */
export function JourneysView() {
    const { t } = useTranslation();
    const [tab, setTab] = useUrlTab(TABS, 'journeys');
    const { journeys, badges, unlockedCount, totalBadgesCount, toggleEquip, selectedBadgeId } = useJourneys();
    const totals = journeyTotals(journeys);

    useDocumentMeta({
        title: t('journeys.title'),
        description: t('journeys.subtitle'),
        path: '/journeys',
    });

    const stats = [
        { key: 'journeys', icon: Route, value: `${totals.journeysDone}/${totals.journeysTotal}`, label: t('journeys.statJourneys') },
        { key: 'missions', icon: Flag, value: `${totals.missionsDone}/${totals.missionsTotal}`, label: t('journeys.statMissions') },
        { key: 'badges', icon: Award, value: `${unlockedCount}/${totalBadgesCount}`, label: t('journeys.statBadges') },
    ];

    return (
        <main className="journeys-view">
            <p className="section-lead journeys-view__lead">{t('journeys.subtitle')}</p>

            <dl className="journeys-view__stats">
                {stats.map((stat) => {
                    const StatIcon = stat.icon;
                    return (
                        <div key={stat.key} className="card card--compact journeys-view__stat">
                            <StatIcon className="journeys-view__stat-icon" aria-hidden="true" />
                            <dt className="journeys-view__stat-label">{stat.label}</dt>
                            <dd className="journeys-view__stat-value">{stat.value}</dd>
                        </div>
                    );
                })}
            </dl>

            <div className="segmented segmented--block journeys-view__tabs" role="tablist" aria-label={t('journeys.tabsLabel')}>
                {TABS.map((key) => (
                    <button key={key} type="button" role="tab" className="segmented__item" aria-selected={tab === key} onClick={() => setTab(key)}>
                        {t(`journeys.tabs.${key}`)}
                    </button>
                ))}
            </div>

            {tab === 'journeys' ? (
                <>
                    {totals.journeysDone === totals.journeysTotal && (
                        <EmptyState compact title={t('journeys.allDoneTitle')} message={t('journeys.allDoneSub')} />
                    )}
                    <JourneyList journeys={journeys} />
                </>
            ) : (
                <BadgeGallery badges={badges} journeys={journeys} selectedBadgeId={selectedBadgeId} onToggleEquip={toggleEquip} />
            )}
        </main>
    );
}

export default JourneysView;
