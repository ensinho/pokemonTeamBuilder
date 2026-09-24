import { useEffect, useState } from 'react';

// How far the page must have moved in one direction before the dock answers.
// Below this a finger resting on the glass, or momentum settling, would make
// the dock flicker between its two sizes.
const DIRECTION_THRESHOLD = 12;
// Near the top the page has nothing under the dock worth uncovering, so it
// always stays full size there.
const TOP_ZONE = 48;

/**
 * Whether the floating tab dock should be in its compact state: true while the
 * user is scrolling *down* the app's one scroller, false once they scroll back
 * up, reach the top, or change route. The iOS Safari toolbar pattern — the
 * chrome gets out of the way while reading, and returns the moment you reach
 * for it.
 *
 * Reads `scrollTop` inside a passive listener and commits at most one state
 * change per frame, and only when the answer flips, so a scroll re-renders the
 * layout twice (down, then up) rather than on every step.
 *
 * `scroller` is the element itself (hold it in state via a callback ref), not
 * a ref object: the shell's scroller mounts after the boot splash, and an
 * effect keyed on a ref object never learns the element arrived.
 */
export function useDockCompact(scroller, { enabled = true, resetKey } = {}) {
    const [compact, setCompact] = useState(false);

    // A new page starts with the full dock: arriving somewhere is exactly
    // when you want to see where else you can go.
    useEffect(() => {
        setCompact(false);
    }, [resetKey]);

    useEffect(() => {
        const el = scroller;
        if (!enabled || !el) return undefined;

        let anchor = el.scrollTop;
        let current = false;
        let frame = 0;

        const commit = (next) => {
            if (next === current) return;
            current = next;
            setCompact(next);
        };

        const onScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                const top = el.scrollTop;
                if (top <= TOP_ZONE) {
                    anchor = top;
                    commit(false);
                    return;
                }
                const delta = top - anchor;
                if (delta > DIRECTION_THRESHOLD) {
                    anchor = top;
                    commit(true);
                } else if (delta < -DIRECTION_THRESHOLD) {
                    anchor = top;
                    commit(false);
                } else if ((current && delta > 0) || (!current && delta < 0)) {
                    // Still travelling the way we already answered: move the
                    // anchor along so a reversal is measured from here.
                    anchor = top;
                }
            });
        };

        el.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            el.removeEventListener('scroll', onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [scroller, enabled, resetKey]);

    return enabled && compact;
}
