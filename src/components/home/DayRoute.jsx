import React from 'react';
import { Check, ChevronRight, Crown, Eye } from 'lucide-react';

/**
 * "Rota do dia" (2026-11-12, utils/dayRoute.js): the day's cards along the
 * Town Map path — what is done, the one thing to do now, what comes next.
 * Each card is a descriptor the Home builds:
 *
 *   { tone, art, kicker, live, title, sub, extra, action: { label, onClick },
 *     onOpen, stamp: { title, sub, mark: 'check' | 'crown' | 'eye' }, fig }
 *
 * The harmony pass (2026-11-12, "Home em harmonia"): one row of the Home's
 * four-column grid, every card the same anatomy (`home-tile`: art on its
 * platform, kicker, title, one line). "Agora" takes two columns; what is done
 * and what comes next share the other two — one card each when there is room,
 * short rows when there are more — so the row never grows a second one and
 * every edge lands on the columns the doors and the teams use below. On a
 * phone the same cards run sideways, "Agora" first.
 */
const MARKS = { check: Check, crown: Crown, eye: Eye };
/** At most this many short rows in one group: the row's height is "Agora"'s. */
const MAX_ROWS = 3;

const Mark = ({ stamp }) => {
    const Icon = MARKS[stamp?.mark] || Check;
    const tone = stamp?.mark === 'crown' ? 'is-gold' : stamp?.mark === 'eye' ? 'is-quiet' : '';
    return <span className={`home-tile__mark ${tone}`}><Icon /></span>;
};

function RouteTile({ item, isDone, variant }) {
    const title = isDone ? (item.stamp?.title || item.title) : item.title;
    const sub = isDone ? item.stamp?.sub : item.sub;
    return (
        <button
            type="button"
            className={`home-tile home-tile--${variant} route-tile ${isDone ? 'is-done' : ''}`}
            style={{ '--tone': item.tone }}
            onClick={item.onOpen}
            data-fx
        >
            <span className="home-tile__media" aria-hidden="true">
                <span className="fx-holo" />
                <span className="home-tile__stage">{item.art}</span>
                {isDone && <Mark stamp={item.stamp} />}
            </span>
            <span className="home-tile__body">
                {!isDone && item.kicker && (
                    <span className="home-tile__kicker">
                        {item.live && <span className="live-dot" aria-hidden="true" />}
                        {item.kicker}
                    </span>
                )}
                <span className="home-tile__title">{title}</span>
                {sub && <span className="home-tile__sub">{sub}</span>}
            </span>
            {variant === 'row' && (
                !isDone && item.fig
                    ? <span className="home-tile__fig">{item.fig}</span>
                    : <ChevronRight className="home-tile__chevron" aria-hidden="true" />
            )}
        </button>
    );
}

function Group({ ids, items, isDone, span, label }) {
    const shown = isDone ? ids.slice(-MAX_ROWS) : ids.slice(0, MAX_ROWS);
    // One card per column when they fit; short rows when there are more.
    const variant = shown.length <= span ? 'card' : 'row';
    return (
        <ul className={`day-route__group is-span-${span} is-${variant}s ${isDone ? 'is-done' : 'is-next'}`} aria-label={label}>
            {shown.map((id) => (
                <li key={id}>
                    <RouteTile item={items[id]} isDone={isDone} variant={variant} />
                </li>
            ))}
        </ul>
    );
}

/** A card-wide click that leaves the card's own controls to themselves. */
const cardClick = (open) => (e) => {
    if (e.target instanceof Element && e.target.closest('button, a, input, [role="menu"], [aria-haspopup]')) return;
    open();
};

export function DayRoute({ route, items, t }) {
    const { done, now, next } = route;
    const current = now ? items[now] : null;
    const sides = (done.length > 0) + (next.length > 0);
    // "Agora" always takes two of the four columns; the groups share the rest.
    const span = sides === 2 ? 1 : 2;
    const allCards = (done.length === 0 || Math.min(done.length, MAX_ROWS) <= span)
        && (next.length === 0 || Math.min(next.length, MAX_ROWS) <= span);

    return (
        <div className={`day-route home-grid ${allCards ? 'is-cards' : ''} ${sides === 0 ? 'is-alone' : ''}`}>
            {done.length > 0 && <Group ids={done} items={items} isDone span={span} label={t('cozyHome.route.done')} />}

            {current ? (
                // The whole card answers a click (Enzo, 2026-11-12); its button
                // stays the keyboard's way in, so the card is not a second tab stop.
                <article
                    className={`home-tile home-tile--card route-now ${current.live ? 'is-live' : ''} ${current.action ? 'is-clickable' : ''}`}
                    style={{ '--tone': current.tone }}
                    aria-label={t('cozyHome.route.now')}
                    data-fx
                    onClick={current.action ? cardClick(current.action.onClick) : undefined}
                >
                    <span className="home-tile__media" aria-hidden="true">
                        <span className="fx-holo" />
                        <span className="home-tile__stage">{current.art}</span>
                    </span>
                    <div className="home-tile__body route-now__body">
                        <span className="home-tile__kicker">
                            {current.live && <span className="live-dot" aria-hidden="true" />}
                            <span>{t('cozyHome.route.now')}</span>
                            {current.kicker && <span className="route-now__kicker-rest">· {current.kicker}</span>}
                        </span>
                        <span className="route-now__main">
                            <span className="route-now__text">
                                <h4 className="home-tile__title route-now__title">{current.title}</h4>
                                {current.sub && <p className="home-tile__sub">{current.sub}</p>}
                            </span>
                            {current.action && (
                                // The page's one primary is the hero's; this is the card's own action.
                                <button type="button" className="btn btn-secondary route-now__action" onClick={current.action.onClick}>
                                    {current.action.label}
                                </button>
                            )}
                        </span>
                        {current.extra}
                    </div>
                </article>
            ) : (
                <article className="home-tile home-tile--card route-now route-now--rest" aria-label={t('cozyHome.route.allDoneTitle')}>
                    <span className="home-tile__media" aria-hidden="true">
                        <span className="home-tile__stage"><span className="home-tile__mark route-now__done"><Check /></span></span>
                    </span>
                    <div className="home-tile__body">
                        <h4 className="home-tile__title route-now__title">{t('cozyHome.route.allDoneTitle')}</h4>
                        <p className="home-tile__sub">{t('cozyHome.route.allDoneSub')}</p>
                    </div>
                </article>
            )}

            {next.length > 0 && <Group ids={next} items={items} isDone={false} span={span} label={t('cozyHome.route.next')} />}
        </div>
    );
}
