import React from 'react';
import { Check, ChevronRight, Crown, Eye } from 'lucide-react';

/**
 * "Rota do dia" (2026-11-12, utils/dayRoute.js): the day's cards along a
 * dashed route — stamps for what is done, one big card for what to do now,
 * a short line for the rest. Each card is a descriptor the Home builds:
 *
 *   { tone, art, kicker, live, title, sub, extra, action: { label, onClick },
 *     onOpen, stamp: { title, sub, mark: 'check' | 'crown' | 'eye' }, fig }
 *
 * The size of a card is its state; the Home never decides it.
 */
const MARKS = { check: Check, crown: Crown, eye: Eye };

export function DayRoute({ route, items, t }) {
    const { done, now, next } = route;
    const current = now ? items[now] : null;
    return (
        <div className={`day-route ${done.length ? 'has-stamps' : ''} ${next.length ? 'has-next' : ''}`}>
            {done.length > 0 && (
                <ol className="day-route__stamps" aria-label={t('cozyHome.route.done')}>
                    {done.map((id) => {
                        const item = items[id];
                        const Mark = MARKS[item.stamp?.mark] || Check;
                        return (
                            <li key={id}>
                                <button type="button" className="day-stamp" style={{ '--tone': item.tone }} onClick={item.onOpen}>
                                    <span className="day-stamp__seal" aria-hidden="true">
                                        {item.art}
                                        <span className={`day-stamp__mark ${item.stamp?.mark === 'crown' ? 'is-gold' : ''} ${item.stamp?.mark === 'eye' ? 'is-quiet' : ''}`}><Mark /></span>
                                    </span>
                                    <span className="day-stamp__text">
                                        <span className="day-stamp__title">{item.stamp?.title || item.title}</span>
                                        {item.stamp?.sub && <span className="day-stamp__sub">{item.stamp.sub}</span>}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ol>
            )}

            {current ? (
                <article className={`day-now ${current.live ? 'is-live' : ''}`} style={{ '--tone': current.tone }} aria-label={t('cozyHome.route.now')}>
                    <span className="day-now__band" aria-hidden="true" />
                    <div className="day-now__body">
                        <span className="day-now__kicker">
                            {current.live && <span className="live-dot" aria-hidden="true" />}
                            <span>{t('cozyHome.route.now')}</span>
                            {current.kicker && <span className="day-now__kicker-rest">· {current.kicker}</span>}
                        </span>
                        <h4 className="day-now__title">{current.title}</h4>
                        {current.sub && <p className="day-now__sub">{current.sub}</p>}
                        {current.extra}
                        {current.action && (
                            <span className="day-now__actions">
                                <button type="button" className="btn btn-primary" onClick={current.action.onClick}>
                                    {current.action.label}
                                </button>
                            </span>
                        )}
                    </div>
                    <span className="day-now__art" aria-hidden="true">{current.art}</span>
                </article>
            ) : (
                <article className="day-now day-now--rest" aria-label={t('cozyHome.route.allDoneTitle')}>
                    <div className="day-now__body">
                        <h4 className="day-now__title">{t('cozyHome.route.allDoneTitle')}</h4>
                        <p className="day-now__sub">{t('cozyHome.route.allDoneSub')}</p>
                    </div>
                </article>
            )}

            {next.length > 0 && (
                <ul className="day-route__next" aria-label={t('cozyHome.route.next')}>
                    {next.map((id) => {
                        const item = items[id];
                        return (
                            <li key={id}>
                                <button type="button" className="day-next" style={{ '--tone': item.tone }} onClick={item.onOpen}>
                                    <span className="day-next__art" aria-hidden="true">{item.art}</span>
                                    <span className="day-next__text">
                                        <span className="day-next__title">
                                            {item.live && <span className="live-dot" aria-hidden="true" />}
                                            {item.title}
                                        </span>
                                        {item.sub && <span className="day-next__sub">{item.sub}</span>}
                                    </span>
                                    {item.fig
                                        ? <span className="day-next__fig">{item.fig}</span>
                                        : <ChevronRight className="day-next__chevron" aria-hidden="true" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
