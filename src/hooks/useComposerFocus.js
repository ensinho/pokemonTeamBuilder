import { useCallback, useRef } from 'react';

/**
 * Hands a chat composer (input/textarea) the caret when the user starts a reply.
 *
 * Focus is deferred by one frame on purpose: pressing "Reply" also renders the
 * quote banner above the composer, and focusing before that paint means the
 * browser scrolls to where the field *was*. One frame later the layout is
 * settled, so `scrollIntoView` lands on the real position.
 *
 * The caret goes to the end of any draft text — replying to someone should
 * never drop the user in the middle of what they had already typed.
 */
export function useComposerFocus() {
    const composerRef = useRef(null);

    const focusComposer = useCallback(() => {
        const raf = typeof window !== 'undefined' && window.requestAnimationFrame
            ? window.requestAnimationFrame
            : (fn) => setTimeout(fn, 16);

        raf(() => {
            const el = composerRef.current;
            if (!el) return;

            // preventScroll + an explicit scrollIntoView: the default focus scroll
            // centers the field, which on mobile yanks the thread out from under
            // the message the user just replied to.
            el.focus({ preventScroll: true });

            const length = el.value?.length ?? 0;
            try {
                el.setSelectionRange(length, length);
            } catch {
                // Some input types reject setSelectionRange; the field is focused either way.
            }

            el.scrollIntoView({ block: 'nearest' });
        });
    }, []);

    return { composerRef, focusComposer };
}
