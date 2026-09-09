import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

// How close to the bottom still counts as "reading the latest".
const NEAR_BOTTOM_PX = 120;
// How long after opening a thread we keep re-pinning to the bottom while it
// settles. Every team card hotlinks six sprites, so the content keeps growing
// after the messages themselves have rendered — and when those sprites are
// already cached there is no `load` event to react to, only a taller layout.
// So the pin is time-based rather than event-based, and short enough that it
// can never feel like the list is holding on.
const SETTLE_MS = 1200;

/**
 * Keeps a chat-style list showing its newest message.
 *
 * Opening a thread jumps **instantly** — a smooth scroll here starts at the top
 * and travels, which reads as "it opened at the top", and any re-render or
 * touch mid-animation leaves it stranded halfway. Smooth is kept for the case
 * it actually helps: a message arriving while you are already at the bottom.
 *
 * The jump is then re-asserted as images finish loading, because the first jump
 * aims at a height that does not include them yet. Scrolling away from the
 * bottom cancels that immediately, so the pin can never fight the user.
 *
 * @param {object} containerRef  the scrollable element
 * @param {object} options
 * @param {string} options.threadKey  changes when a different thread is shown
 * @param {number} options.count      number of messages currently rendered
 * @param {boolean} options.lastIsMine follow even if scrolled up — I just posted
 */
export function useChatAutoScroll(containerRef, { threadKey, count = 0, lastIsMine = false }) {
    const prevThread = useRef(threadKey);
    const prevCount = useRef(0);
    const pinUntil = useRef(0);
    const rafRef = useRef(0);

    // Re-assert the bottom every frame for a moment after opening. The first
    // jump aims at a height that does not include images, late renders or fonts;
    // this catches all of them without caring which one moved.
    const pump = useCallback(() => {
        const el = containerRef.current;
        if (!el || Date.now() >= pinUntil.current) {
            rafRef.current = 0;
            return;
        }
        const bottom = el.scrollHeight - el.clientHeight;
        if (el.scrollTop !== bottom) el.scrollTop = bottom;
        rafRef.current = requestAnimationFrame(pump);
    }, [containerRef]);

    const startPin = useCallback(() => {
        pinUntil.current = Date.now() + SETTLE_MS;
        if (!rafRef.current) rafRef.current = requestAnimationFrame(pump);
    }, [pump]);

    useLayoutEffect(() => {
        const el = containerRef.current;

        prevThread.current = threadKey;

        // **The list going empty is the signal that a thread is (re)opening**,
        // not the thread id changing. Both the original code and the first two
        // versions of this hook keyed off the id and landed at the top, because
        // the store empties `messages` and re-listens in cases where the id
        // never changes — re-selecting the current topic, or the listener
        // rebinding after auth settles. The next non-empty render then looked
        // like neither an opening (count was still the old one) nor growth
        // (23 is not more than 23), so nothing scrolled while the remounted
        // list sat at the top.
        if (!el || count === 0) {
            prevCount.current = 0;
            return;
        }

        const opened = prevCount.current === 0;
        const grew = count > prevCount.current;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
        prevCount.current = count;

        if (opened) {
            el.scrollTop = el.scrollHeight;
            startPin();
        } else if (grew && (lastIsMine || nearBottom)) {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
    }, [containerRef, threadKey, count, lastIsMine, startPin]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return undefined;

        // Scrolling away from the bottom hands control back immediately, so the
        // pin can never fight someone reading back through the thread.
        const release = () => {
            const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
            if (!nearBottom) pinUntil.current = 0;
        };

        // Cold sprites arrive well past the settle window — a thread of team
        // cards pulls a hundred of them. Each one that lands pushes the deadline
        // out, so the pin lasts exactly as long as the thread is still growing
        // and not a moment longer. `load` does not bubble, hence capture.
        const extend = () => {
            if (pinUntil.current > 0) startPin();
        };

        el.addEventListener('scroll', release, { passive: true });
        el.addEventListener('load', extend, true);
        el.addEventListener('error', extend, true);
        return () => {
            el.removeEventListener('scroll', release);
            el.removeEventListener('load', extend, true);
            el.removeEventListener('error', extend, true);
        };
        // Re-bound per thread: switching topics swaps the loading spinner for a
        // fresh list element, and the listeners must follow the live node.
    }, [containerRef, threadKey, startPin]);

    useEffect(() => () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }, []);
}
