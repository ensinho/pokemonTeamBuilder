import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Flame, Plus, Shield } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../../store/useAuthStore';
import { useRewardsStore, selectUnseenCount } from '../../store/useRewardsStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { CHECKED_IN_EVENT, checkinCalendar, checkinWeek, liveStreak, localDayKey, streakHeat, weekStartFor } from '../../utils/dailyCheckin';
import { levelForXp } from '../../utils/trainerLevel';
import { getCosmetic } from '../../constants/cosmetics';
import { Mascot } from '../Mascot';
import { RollingNumber } from '../RollingNumber';
import '../../styles/rewards.css';

/**
 * The day as a Poké Ball: caught (in the run), dashed (absent), the shield
 * that will cover a missed day. Drawn, not an icon font — it is the strip's
 * whole vocabulary, and dashed means absent here as everywhere in the app.
 */
export function DayBall({ state }) {
    if (state === 'shielded') return <Shield className="day-ball day-ball--shield" aria-hidden="true" />;
    if (state === 'ahead') return <span className="day-ball day-ball--ahead" aria-hidden="true" />;
    const caught = state === 'caught' || state === 'today-done';
    return (
        <svg viewBox="0 0 16 16" className={`day-ball ${caught ? 'is-caught' : 'is-absent'}`} aria-hidden="true">
            {caught && <path d="M1.5 8a6.5 6.5 0 0 1 13 0z" className="day-ball__top" />}
            <circle cx="8" cy="8" r="6.5" className="day-ball__rim" />
            <path d="M1.5 8h13" className="day-ball__band" />
            <circle cx="8" cy="8" r="2" className="day-ball__button" />
        </svg>
    );
}

/**
 * The daily check-in as the Home's week strip (2026-11-09, the journal
 * reference's Mon–Sun row — .claude/skills/app-screens): this week's seven
 * days, each date in a round disc (today's inverted, the run's tinted), a
 * Poké Ball under each day of the run.
 * Today's open cell IS the check-in — the strip's one moment, with the shiny
 * sparkle from the trainer's own tap. Under it, one muted line: the level and
 * what the next check-in pays. The full card (cycle, shields, collection)
 * stays on the Rewards tab (`CheckinCard variant="full"`).
 *
 * Above the days, the run itself (2026-11-12, Enzo: "mais atrativo com a
 * streak do user… talvez foguinho"): a flame that grows with the run's heat
 * (`streakHeat`: a spark, three days, a week, a month), the count as the
 * strip's figure, and how far the next flame is. Earned, so gold. It opens
 * the streak sheet. The trainer's own check-in is answered here (it was the
 * greeting pill's job until the hearth pass removed the pill — the same
 * figure stood twice, a thumb apart): the flame flares once and the count
 * rolls to its new figure, wherever the check-in was made (CHECKED_IN_EVENT).
 *
 * Reads only recorded stores, so it paints at once — no listener, no loader.
 */
export function CheckinWeek({ onOpenRewards, onOpenStreak }) {
    const { t, language } = useTranslation();
    const { checkin, streak, checkIn } = useAuthStore(useShallow((s) => ({ checkin: s.checkin, streak: s.streak, checkIn: s.checkIn })));
    const xp = useRewardsStore((s) => s.xp);
    const unseen = useRewardsStore(selectUnseenCount);
    const shiny = useShinyBurst();
    const [result, setResult] = useState(null);
    // Keyed by the flare, so each check-in plays it once — never for a streak
    // that merely arrives from another device.
    const [flare, setFlare] = useState(0);
    useEffect(() => {
        const onCheckIn = () => setFlare((n) => n + 1);
        window.addEventListener(CHECKED_IN_EVENT, onCheckIn);
        return () => window.removeEventListener(CHECKED_IN_EVENT, onCheckIn);
    }, []);

    // The local day, read per render: a PWA left open across midnight turns
    // the page as soon as anything re-renders it.
    const today = localDayKey();
    const week = useMemo(
        () => checkinWeek({ checkin, streak }, today, { weekStartsOn: weekStartFor(language) }),
        [checkin, streak, today, language],
    );
    const calendar = useMemo(() => checkinCalendar(checkin, today), [checkin, today]);
    const progress = levelForXp(xp);
    const run = liveStreak(streak, today);
    const { heat, goal, from } = streakHeat(run);
    const toGoal = goal ? Math.min(1, (run - from) / (goal - from)) : 1;
    const locale = language === 'pt' ? 'pt-BR' : 'en-GB';
    const weekdayName = useMemo(() => {
        const format = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
        return (key) => {
            const [y, m, d] = key.split('-').map(Number);
            const name = format.format(new Date(Date.UTC(y, m - 1, d))).replace('.', '');
            return name.charAt(0).toUpperCase() + name.slice(1, 3);
        };
    }, [locale]);
    const longDate = useMemo(() => {
        const format = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
        return (key) => {
            const [y, m, d] = key.split('-').map(Number);
            return format.format(new Date(Date.UTC(y, m - 1, d)));
        };
    }, [locale]);

    const handleCheckIn = () => {
        const outcome = checkIn();
        if (!outcome) return;
        shiny.fire();
        setResult(outcome);
        window.dispatchEvent(new CustomEvent(CHECKED_IN_EVENT));
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

    const stateLabel = (state) => t(`checkinWeek.states.${state === 'today-done' ? 'todayDone' : state}`);

    return (
        <section className="checkin-week" data-heat={heat} aria-label={t('rewards.checkin.title')}>
            <button type="button" className="checkin-week__head" onClick={onOpenStreak} aria-label={`${run} ${run === 1 ? t('checkinWeek.streak.day') : t('checkinWeek.streak.days')} · ${t(`checkinWeek.heat.h${heat}`)} · ${t('checkinWeek.streak.open')}`}>
                <span className="checkin-week__fire" aria-hidden="true">
                    <Flame key={flare} className={`checkin-week__flame ${flare ? 'is-flaring' : ''}`} />
                    {heat >= 3 && <Flame className="checkin-week__flame checkin-week__flame--echo" />}
                </span>
                <span className="checkin-week__run" aria-hidden="true">
                    <span className="checkin-week__count"><RollingNumber value={run} /></span>
                    <span className="checkin-week__unit">{run === 1 ? t('checkinWeek.streak.day') : t('checkinWeek.streak.days')}</span>
                </span>
                <span className="checkin-week__heat" aria-hidden="true">
                    <span className="checkin-week__heat-word">{t(`checkinWeek.heat.h${heat}`)}</span>
                    {heat > 0 && goal && (
                        <>
                            <span className="checkin-week__meter" style={{ '--fill': toGoal }}><i /></span>
                            <span className="checkin-week__goal">{t('checkinWeek.streak.toGoal', { n: goal - run, goal })}</span>
                        </>
                    )}
                </span>
            </button>
            <ol className="checkin-week__days" aria-label={t('rewards.checkin.calendarLabel')}>
                {week.days.map((day) => {
                    const isToday = day.state === 'today' || day.state === 'today-done';
                    const label = `${longDate(day.key)} · ${stateLabel(day.state)}`;
                    const face = (
                        <>
                            <span className="checkin-week__weekday" aria-hidden="true">{weekdayName(day.key)}</span>
                            <span className="checkin-week__disc" aria-hidden="true">{day.date}</span>
                            {day.state === 'today'
                                ? <span className="checkin-week__plus" aria-hidden="true"><Plus /></span>
                                : <DayBall state={day.state} />}
                        </>
                    );
                    return (
                        <li key={day.key} className={`checkin-week__day is-${day.state}`} aria-current={isToday ? 'date' : undefined}>
                            {day.state === 'today' ? (
                                <button
                                    type="button"
                                    className={`checkin-week__cell checkin-week__check ${shiny.isBursting ? 'is-bursting' : ''}`}
                                    onClick={handleCheckIn}
                                    aria-label={`${t('rewards.checkin.cta', { xp: calendar.xpToday })} · ${longDate(day.key)}`}
                                >
                                    {face}
                                </button>
                            ) : (
                                <span className={`checkin-week__cell ${day.state === 'today-done' && shiny.isBursting ? 'is-bursting' : ''}`} role="img" aria-label={label}>
                                    {face}
                                    {day.state === 'today-done' && shiny.burst}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>

            {/* Always in the DOM so the result is announced. */}
            <p className="sr-only" role="status" aria-live="polite">{resultLine}</p>
            <div className="checkin-week__foot">
                {resultLine ? (
                    <p className="checkin-week__line checkin-week__line--result">
                        <Mascot size="xs" mood={result.level > result.levelBefore ? 'empolgado' : 'animado'} play="hop" />
                        <span>{resultLine}</span>
                    </p>
                ) : (
                    <button type="button" className="checkin-week__line checkin-week__streak" onClick={onOpenStreak}>
                        <span className="checkin-week__level">{t('rewards.levelLong', { n: progress.level })}</span>
                        {week.doneToday ? (
                            // Two lengths, one shown (rewards.css, by the strip's width): on a
                            // phone the long one lost its figure to an ellipsis ("…for +…").
                            <>
                                <span className="checkin-week__muted checkin-week__muted--long">
                                    {t('rewards.checkin.comeBack', { xp: calendar.days[calendar.todayIndex % 7].xp })}
                                </span>
                                <span className="checkin-week__muted checkin-week__muted--short">
                                    {t('rewards.checkin.comeBackShort', { xp: calendar.days[calendar.todayIndex % 7].xp })}
                                </span>
                            </>
                        ) : (
                            <span className="checkin-week__muted">{t('checkinWeek.tapToday', { xp: calendar.xpToday })}</span>
                        )}
                    </button>
                )}
                {onOpenRewards && (
                    <button type="button" className="btn btn-ghost btn-sm checkin-week__more" onClick={onOpenRewards}>
                        {unseen > 0 && <span className="count-badge">{unseen}</span>}
                        {t('journeys.tabs.rewards')}
                        <ChevronRight aria-hidden="true" />
                    </button>
                )}
            </div>
        </section>
    );
}

export default CheckinWeek;
