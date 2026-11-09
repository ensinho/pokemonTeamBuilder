import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { checkinCalendar, localDayKey, normalizeStreak, streakMonth, weekStartFor } from '../../utils/dailyCheckin';
import { CloseIcon } from '../icons';
import { Mascot } from '../Mascot';
import { DayBall } from './CheckinWeek';
import '../../styles/streak-sheet.css';

/**
 * The streak, as a sheet (2026-11-09, the mood-streak reference —
 * .claude/skills/app-screens): "Você está numa sequência de **12 dias**", the
 * month as Poké Balls, the shields and the record as figure + muted word, and
 * the check-in when today is still open. The mascot above answers the state:
 * beaming once today counts, waving while it waits, asleep with no run.
 *
 * The month is derived (utils/dailyCheckin.js `streakMonth`): the run as the
 * streak counts it, nothing the records cannot know. A sheet on a phone, a
 * dialog on a desktop — `useModalA11y` owns both.
 */
export function StreakSheet({ onClose }) {
    const { t, language } = useTranslation();
    const dialogRef = useModalA11y(onClose);
    const { checkin, streak: streakRaw, checkIn } = useAuthStore(useShallow((s) => ({ checkin: s.checkin, streak: s.streak, checkIn: s.checkIn })));
    const shiny = useShinyBurst();
    const [result, setResult] = useState(null);

    const today = localDayKey();
    const weekStartsOn = weekStartFor(language);
    const month = useMemo(() => streakMonth({ checkin, streak: streakRaw }, today, { weekStartsOn }), [checkin, streakRaw, today, weekStartsOn]);
    const calendar = useMemo(() => checkinCalendar(checkin, today), [checkin, today]);
    const streak = normalizeStreak(streakRaw);
    const locale = language === 'pt' ? 'pt-BR' : 'en-GB';

    const monthName = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' })
        .format(new Date(Date.UTC(month.year, month.month - 1, 1)));
    const weekdays = useMemo(() => {
        const format = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' });
        // 2026-11-01 is a Sunday: walk the seven from the week's first day.
        return Array.from({ length: 7 }, (_, i) => format.format(new Date(Date.UTC(2026, 10, 1 + ((weekStartsOn + i) % 7)))));
    }, [locale, weekStartsOn]);

    const live = month.streak;
    // The figure is the one accent word of the title (the reference's "12 day").
    const days = live === 1 ? t('streakSheet.daysOne') : t('streakSheet.days', { n: live });
    const [before, after] = live > 0 ? t('streakSheet.title', { days: '\u0000' }).split('\u0000') : [t('streakSheet.titleNone'), ''];
    const mood = month.doneToday ? { mood: 'radiante', play: 'hop' } : live > 0 ? { mood: 'animado', pose: 'acenando', play: 'wave' } : { mood: 'sonolento' };

    const handleCheckIn = () => {
        const outcome = checkIn();
        if (!outcome) return;
        shiny.fire();
        setResult(outcome);
    };

    return createPortal(
        <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="streak-sheet-title"
                tabIndex={-1}
                className="modal-panel modal-panel--sm streak-sheet"
            >
                <button type="button" onClick={onClose} aria-label={t('common.close')} className="modal-close streak-sheet__close">
                    <CloseIcon className="w-4 h-4" />
                </button>

                <div className="modal-body streak-sheet__body">
                    <header className="streak-sheet__head" data-sheet-handle>
                        <Mascot size="lg" {...mood} playKey={result ? 1 : 0} className="streak-sheet__mascot" />
                        <h2 id="streak-sheet-title" className="streak-sheet__title">
                            {before}
                            {live > 0 && <em className="accent-word">{days}</em>}
                            {after}
                        </h2>
                        <p className="streak-sheet__lead">{live > 0 ? t('streakSheet.lead') : t('streakSheet.leadNone')}</p>
                    </header>

                    <section className="streak-month" aria-label={t('streakSheet.monthLabel', { month: monthName })}>
                        <p className="streak-month__name">{monthName} <span>{month.year}</span></p>
                        <div className="streak-month__grid" role="list">
                            {weekdays.map((name, i) => (
                                <span key={`w${i}`} className="streak-month__weekday" aria-hidden="true">{name}</span>
                            ))}
                            {Array.from({ length: month.leading }, (_, i) => <span key={`b${i}`} aria-hidden="true" />)}
                            {month.days.map((day) => (
                                <span
                                    key={day.key}
                                    role="listitem"
                                    className={`streak-month__day is-${day.state} ${day.state === 'today-done' && shiny.isBursting ? 'is-bursting' : ''}`}
                                    aria-label={`${day.date} · ${t(`checkinWeek.states.${day.state === 'today-done' ? 'todayDone' : day.state}`)}`}
                                    aria-current={day.state.startsWith('today') ? 'date' : undefined}
                                >
                                    <DayBall state={day.state === 'today' ? 'past' : day.state} />
                                    <span className="streak-month__date" aria-hidden="true">{day.date}</span>
                                    {day.state === 'today-done' && shiny.burst}
                                </span>
                            ))}
                        </div>
                    </section>

                    <dl className="streak-sheet__facts">
                        <div><dt>{t('streakSheet.factStreak')}</dt><dd>{live}</dd></div>
                        <div><dt>{t('streakSheet.factShields')}</dt><dd>{streak.shields}</dd></div>
                        <div><dt>{t('streakSheet.factRecord')}</dt><dd>{Math.max(streak.longest, live)}</dd></div>
                    </dl>

                    <p className="sr-only" role="status" aria-live="polite">
                        {result ? t('rewards.checkin.gained', { xp: result.xp }) : ''}
                    </p>
                    {month.doneToday ? (
                        <p className="streak-sheet__done">
                            {result
                                ? `${t('rewards.checkin.gained', { xp: result.xp })} · ${t('rewards.checkin.done')}`
                                : t('rewards.checkin.comeBack', { xp: calendar.days[calendar.todayIndex % 7].xp })}
                        </p>
                    ) : (
                        <button type="button" className="btn btn-primary btn-lg btn-block streak-sheet__cta" onClick={handleCheckIn}>
                            {t('rewards.checkin.cta', { xp: calendar.xpToday })}
                        </button>
                    )}
                    <p className="streak-sheet__note">{t('rewards.checkin.shieldHint')} {t('rewards.checkin.puzzleNote')}</p>
                </div>
            </div>
        </div>,
        document.body,
    );
}

export default StreakSheet;
