import React, { useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react';

import { useTranslation } from '../../hooks/useTranslation';
import { useRoundStore } from '../../store/useRoundStore';
import { DAILY_GAMES } from '../../utils/gamesToday';
import { FULL_DAY, wobbleFrames } from '../../utils/livingMoments';
import { sample, spring } from '../../utils/brandIntro';
import '../../styles/moments.css';

const prefersReduced = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/**
 * Full day → the fourth capture (utils/livingMoments.js): the day's last Poké
 * Ball flies onto the belt and wobbles three times, clicks, the four light up
 * in gold one after the other, and the day's receipt opens with its gold stamp
 * pressed (RoundReceiptDialog, `openReceipt('day')`) — the scene hands over to
 * the real receipt rather than drawing a second one.
 */
export function FullDayScene({ onDone }) {
    const { t } = useTranslation();
    const titleId = useId();
    const rootRef = useRef(null);
    const balls = useRef([]);
    const rings = useRef([]);
    const sparks = useRef(null);
    const words = useRef(null);
    const anims = useRef([]);
    const handed = useRef(false);

    const handover = useCallback(() => {
        if (handed.current) return;
        handed.current = true;
        onDone?.();
        useRoundStore.getState().openReceipt('day');
    }, [onDone]);

    const tap = () => {
        const running = anims.current.filter((a) => a.playState === 'running');
        if (running.length) running.forEach((a) => a.finish());
        else handover();
    };

    useLayoutEffect(() => {
        rootRef.current?.focus({ preventScroll: true });
        if (prefersReduced()) {
            anims.current = [rootRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 })];
            const timer = window.setTimeout(handover, 1400);
            return () => window.clearTimeout(timer);
        }
        const run = (el, keyframes, options) => el && anims.current.push(el.animate(keyframes, { fill: 'backwards', ...options }));
        const last = balls.current[DAILY_GAMES.length - 1];
        // the fourth ball: in on a spring, then the capture's three wobbles
        const fly = sample(560, (u) => {
            const s = u >= 560 ? 1 : spring(u, 2.2, 0.55);
            return { transform: `translateY(${Math.round((1 - s) * 180)}%) scale(${Math.round((0.4 + 0.6 * Math.min(1, s)) * 1000) / 1000})`, opacity: Math.min(1, s * 2) };
        });
        run(last?.parentElement, fly.keyframes, { duration: fly.duration, delay: FULL_DAY.fly });
        const wobble = wobbleFrames();
        run(last, wobble.keyframes, { duration: wobble.duration, fill: 'none' });
        run(last?.querySelector('.fday__button'), [
            { offset: 0, background: 'var(--mascot-white)' },
            { offset: 0.5, background: 'var(--brand-gold)' },
            { offset: 1, background: 'var(--mascot-white)' },
        ], { duration: 260, delay: FULL_DAY.click, fill: 'none' });
        // the click: three sparks
        [...(sparks.current?.children || [])].forEach((el, i) => {
            const a = -90 + (i - 1) * 50;
            run(el, [
                { opacity: 1, transform: `rotate(${a}deg) translateX(0.5rem) scale(0.4)` },
                { opacity: 0, transform: `rotate(${a}deg) translateX(3.25rem) scale(1)` },
            ], { duration: 460, delay: FULL_DAY.click, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
        });
        // the four in gold, one after the other
        rings.current.forEach((el, i) => {
            const pop = sample(520, (u) => ({ opacity: 1, transform: `scale(${u >= 520 ? 1 : Math.round((0.6 + 0.4 * spring(u, 2.8, 0.45)) * 1000) / 1000})` }));
            run(el, [{ opacity: 0, transform: 'scale(0.6)' }, ...pop.keyframes.slice(1)], { duration: pop.duration, delay: FULL_DAY.gold + i * FULL_DAY.goldEach });
        });
        const rise = sample(640, (u) => {
            const s = u >= 640 ? 1 : spring(u, 2.4, 0.6);
            return { opacity: Math.min(1, s * 1.3), transform: `translateY(${Math.round((1 - s) * 20)}px)` };
        });
        run(words.current, rise.keyframes, { duration: rise.duration, delay: FULL_DAY.words });
        const timer = window.setTimeout(handover, FULL_DAY.handover);
        return () => { window.clearTimeout(timer); anims.current.forEach((a) => a.cancel()); };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the scene plays once
    }, []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') handover(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handover]);

    return (
        <div ref={rootRef} className="moment moment--day" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={tap}>
            <div className="fday">
                <p className="fday__kicker">{t('moments.fullDay.kicker')}</p>
                <ol className="fday__belt">
                    {DAILY_GAMES.map((game, i) => (
                        <li key={game} className="fday__slot">
                            <span className="fday__ring" ref={(n) => { rings.current[i] = n; }} />
                            <span className="fday__holder">
                                <span className="fday__ball" ref={(n) => { balls.current[i] = n; }}>
                                    <span className="fday__button" />
                                </span>
                            </span>
                            <span className="fday__name">{t(`gamesHub.short.${game}`)}</span>
                        </li>
                    ))}
                    <li className="fday__sparks" ref={sparks} aria-hidden="true"><i /><i /><i /></li>
                </ol>
                <div className="fday__words" ref={words}>
                    <h2 id={titleId} className="fday__title">{t('moments.fullDay.title')}</h2>
                    <p className="fday__sub">{t('moments.fullDay.sub')}</p>
                </div>
            </div>
        </div>
    );
}

export default FullDayScene;
