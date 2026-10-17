import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, Flame, Shield } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../../store/useAuthStore';
import { useRewardsStore, selectUnseenCount } from '../../store/useRewardsStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { checkinCalendar, liveStreak, localDayKey } from '../../utils/dailyCheckin';
import { levelForXp } from '../../utils/trainerLevel';
import { nextLevelReward } from '../../utils/rewards';
import { getCosmetic } from '../../constants/cosmetics';
import { RollingNumber } from '../RollingNumber';
import { JourneyBar } from '../journeys/JourneyList';
import '../../styles/rewards.css';

/**
 * The daily check-in and the Trainer Level, in one card (2026-10-17,
 * docs/modules/rewards.md). Everything it shows comes from the recorded
 * stores, so it paints at once — no listener, no loader.
 *
 * The check-in is the one moment of the rewards system: the trainer's own tap
 * gets the shiny sparkle, the level rolls to its new value and the result
 * (XP, a level, an unlock, a shield) is said in place, under the button that
 * earned it. Unlocks found in data never come through here.
 *
 * `variant="home"` is the compact card with a link to the Rewards tab;
 * `variant="full"` heads that tab.
 */
export function CheckinCard({ variant = 'full', onOpenRewards }) {
    const { t } = useTranslation();
    const { checkin, streak, checkIn } = useAuthStore(useShallow((s) => ({ checkin: s.checkin, streak: s.streak, checkIn: s.checkIn })));
    const xp = useRewardsStore((s) => s.xp);
    const unseen = useRewardsStore(selectUnseenCount);
    const shiny = useShinyBurst();
    const [result, setResult] = useState(null);

    // The local day, read per render: a PWA left open across midnight shows
    // the new day's check-in as soon as anything re-renders it.
    const today = localDayKey();
    const calendar = useMemo(() => checkinCalendar(checkin, today), [checkin, today]);
    const progress = levelForXp(xp);
    const streakNow = liveStreak(streak, today);
    const shields = streak?.shields || 0;
    const next = nextLevelReward(progress.level);
    const isHome = variant === 'home';

    const handleCheckIn = () => {
        const outcome = checkIn();
        if (!outcome) return;
        shiny.fire();
        setResult(outcome);
    };

    const resultLine = result && (() => {
        const parts = [t('rewards.checkin.gained', { xp: result.xp })];
        if (result.level > result.levelBefore) parts.push(t('rewards.checkin.levelUp', { n: result.level }));
        if (result.cycleComplete) parts.push(t('rewards.checkin.cycleComplete'));
        if (result.usedShield) parts.push(t('rewards.checkin.usedShield'));
        if (result.earnedShield) parts.push(t('rewards.checkin.earnedShield'));
        if (result.earned?.length === 1) {
            parts.push(t('rewards.checkin.unlockedOne', { name: t(`rewards.items.${getCosmetic(result.earned[0]).id}.name`) }));
        } else if (result.earned?.length > 1) {
            parts.push(t('rewards.checkin.unlockedMany', { n: result.earned.length }));
        }
        return parts.join(' · ');
    })();

    const streakLabel = streakNow === 0
        ? t('rewards.checkin.streakNone')
        : streakNow === 1 ? t('rewards.checkin.streakOne') : t('rewards.checkin.streak', { n: streakNow });

    return (
        <section className={`card checkin checkin--${variant}`} aria-label={t('rewards.checkin.title')}>
            <header className="checkin__head">
                <span className="checkin__level" aria-label={t('rewards.levelLong', { n: progress.level })}>
                    <span className="checkin__level-label">{t('rewards.levelLabel')}</span>
                    <span className="checkin__level-value">
                        <RollingNumber value={progress.level} />
                    </span>
                </span>
                <span className="checkin__xp">
                    <JourneyBar percent={progress.percent} />
                    <span className="checkin__xp-line">
                        <span>{t('rewards.xpToNext', { n: progress.xpToNext, level: progress.level + 1 })}</span>
                        {next && (
                            <span className="checkin__next">
                                {t('rewards.nextRewardLabel')} · {t('rewards.nextReward', { n: next.level })}
                            </span>
                        )}
                    </span>
                </span>
                {isHome && onOpenRewards && (
                    <button type="button" className="btn btn-ghost btn-sm checkin__more" onClick={onOpenRewards}>
                        {unseen > 0 && <span className="count-badge">{unseen}</span>}
                        {t('journeys.tabs.rewards')}
                        <ChevronRight aria-hidden="true" />
                    </button>
                )}
            </header>

            <ol className="checkin__days" aria-label={t('rewards.checkin.calendarLabel')}>
                {calendar.days.map((day) => (
                    <li
                        key={day.day}
                        className={`checkin__day ${day.claimed ? 'is-claimed' : ''} ${day.isToday ? 'is-today' : ''} ${day.day === 7 ? 'is-big' : ''}`}
                        aria-label={`${t('rewards.checkin.day', { n: day.day })} · ${t('rewards.checkin.gained', { xp: day.xp })}`}
                        aria-current={day.isToday ? 'date' : undefined}
                    >
                        <span className="checkin__day-mark" aria-hidden="true">
                            {day.claimed ? <Check /> : day.day}
                        </span>
                        <span className="checkin__day-xp" aria-hidden="true">+{day.xp}</span>
                    </li>
                ))}
            </ol>

            <footer className="checkin__foot">
                <span className="checkin__facts">
                    <span className={`checkin__fact ${streakNow > 0 ? 'is-lit' : ''}`}>
                        <Flame aria-hidden="true" /> {streakLabel}
                    </span>
                    {shields > 0 && (
                        <span className="checkin__fact" title={t('rewards.checkin.shieldHint')}>
                            <Shield aria-hidden="true" />
                            {shields === 1 ? t('rewards.checkin.shieldsOne') : t('rewards.checkin.shieldsMany', { n: shields })}
                        </span>
                    )}
                </span>
                {calendar.doneToday ? (
                    <span className="checkin__done">
                        <span className="badge badge--success"><Check aria-hidden="true" /> {t('rewards.checkin.done')}</span>
                        {!result && <span className="checkin__later">{t('rewards.checkin.comeBack', { xp: calendar.days[calendar.todayIndex % 7].xp })}</span>}
                    </span>
                ) : (
                    <button
                        type="button"
                        className={`btn btn-primary checkin__cta ${shiny.isBursting ? 'is-bursting' : ''}`}
                        onClick={handleCheckIn}
                    >
                        {t('rewards.checkin.cta', { xp: calendar.xpToday })}
                        {shiny.burst}
                    </button>
                )}
            </footer>

            {/* Always in the DOM so the result is announced; the visible line
                appears only once there is something to say. */}
            <p className="sr-only" role="status" aria-live="polite">{resultLine}</p>
            {resultLine && (
                <p className="checkin__result">
                    <span>{resultLine}</span>
                    {result.earned?.length > 0 && onOpenRewards && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={onOpenRewards}>{t('rewards.checkin.see')}</button>
                    )}
                </p>
            )}

            {!isHome && <p className="checkin__note">{t('rewards.checkin.puzzleNote')} {t('rewards.checkin.shieldHint')}</p>}
        </section>
    );
}

export default CheckinCard;
