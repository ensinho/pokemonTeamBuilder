import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useUrlTab } from '../../hooks/useUrlTab';
import { useJourneys } from '../../hooks/useJourneys';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { journeyTotals } from '../../utils/journeys';
import { JourneyList } from '../journeys/JourneyList';
import { BadgeGallery } from '../journeys/BadgeGallery';
import { MascotTip } from '../Mascot';
import { RewardsPanel } from '../rewards/RewardsPanel';
import { useRewardsStore, selectUnseenCount } from '../../store/useRewardsStore';
import '../../styles/journeys.css';

const TABS = ['journeys', 'badges', 'rewards'];

/**
 * Journeys (2026-10-17): the onboarding that keeps teaching. Five levels of
 * missions, each done by actually using the app, and the badges they and
 * everything else earn — modelled on a missions/medals screen (levels as an
 * accordion, badges grouped by how they are earned, a detail sheet with one
 * action). Points were left out on purpose: the reward is the badge. The
 * Rewards tab (2026-10-17) adds the Trainer Level, the daily check-in and the
 * cosmetics they unlock — experience is computed, never spent.
 */
export function JourneysView() {
    const { t } = useTranslation();
    const [tab, setTab] = useUrlTab(TABS, 'journeys');
    const { journeys, badges, unlockedCount, totalBadgesCount, toggleEquip, selectedBadgeId } = useJourneys();
    const totals = journeyTotals(journeys);
    const unseenRewards = useRewardsStore(selectUnseenCount);

    useDocumentMeta({
        title: t('journeys.title'),
        description: t('journeys.subtitle'),
        path: '/journeys',
    });

    // Each tab carries its own figure (2026-10-22): three boxed stats above the
    // tabs said the same thing a second time, a screen before the content.
    const tabCounts = {
        journeys: `${totals.journeysDone}/${totals.journeysTotal}`,
        badges: `${unlockedCount}/${totalBadgesCount}`,
    };

    return (
        <main className="journeys-view">
            <MascotTip size="lg" className="journeys-view__lead">{t('journeys.subtitle')}</MascotTip>

            <div className="segmented segmented--block journeys-view__tabs" role="tablist" aria-label={t('journeys.tabsLabel')}>
                {TABS.map((key) => (
                    <button key={key} type="button" role="tab" className="segmented__item" aria-selected={tab === key} onClick={() => setTab(key)}>
                        {t(`journeys.tabs.${key}`)}
                        {tabCounts[key] && <span className="count-badge">{tabCounts[key]}</span>}
                        {key === 'rewards' && unseenRewards > 0 && tab !== 'rewards' && <span className="count-badge count-badge--new">{unseenRewards}</span>}
                    </button>
                ))}
            </div>

            {tab === 'journeys' ? (
                <>
                    {totals.journeysDone === totals.journeysTotal && (
                        <MascotTip size="lg" cheer>
                            <strong>{t('journeys.allDoneTitle')}</strong>
                            {t('journeys.allDoneSub')}
                        </MascotTip>
                    )}
                    <p className="journeys-view__progress">
                        {t('journeys.missionsProgress', { done: totals.missionsDone, total: totals.missionsTotal })}
                    </p>
                    <JourneyList journeys={journeys} />
                </>
            ) : tab === 'badges' ? (
                <BadgeGallery badges={badges} journeys={journeys} selectedBadgeId={selectedBadgeId} onToggleEquip={toggleEquip} />
            ) : (
                <RewardsPanel />
            )}
        </main>
    );
}

export default JourneysView;
