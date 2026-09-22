import { useCallback, useRef } from 'react';

import { releaseVelocity, shouldDismissSheet } from '../utils/sheetDismiss';

/**
 * Everything a dialog needs from the platform, attached to its panel node:
 *
 *  - Escape closes it.
 *  - Focus moves in on open and returns to where it was on close.
 *  - On a phone it behaves as a sheet: drag it down by its top edge to dismiss.
 *  - When React removes it, it leaves on an exit animation instead of vanishing.
 *
 * Returns a callback ref. Put it on the dialog's panel (the element with
 * role="dialog" aria-modal="true" and an aria-label/labelledby).
 *
 * It is a callback ref rather than an effect on mount because several dialogs
 * stay mounted and render `null` while closed (ConfirmDialog, ChallengeModal…):
 * a `[]` effect ran once at app start with no node, so those dialogs never got
 * focus moved into them at all. A ref runs every time the panel appears.
 */
export function useModalA11y(onClose) {
    // Keep the latest onClose without re-attaching. Callers often pass an inline
    // arrow that changes identity every render; if that re-ran the attach, any
    // parent re-render while the dialog is open (typing into a shared cache, say)
    // would yank focus back to the panel after a single keystroke.
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    return useCallback((node) => {
        if (!node) return undefined;
        return attachDialog(node, () => onCloseRef.current?.());
    }, []);
}

const FOCUSABLE =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const TEXT_ENTRY =
    'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]):not([type="file"]), textarea, select';

// Phones present every .modal-panel as a sheet (index.css, same breakpoint).
// A .bottom-sheet__panel is a sheet at every width.
const SHEET_QUERY = '(max-width: 639px)';
const SHEET_PANEL = '.modal-panel, .bottom-sheet__panel';
const SHEET_HOST = '.modal-scrim, .bottom-sheet';
// A drag may start on the grabber strip at the top of the panel or on
// anything marked as its handle — never from inside the content, where the
// same vertical gesture belongs to scrolling, sliders and carousels.
const GRAB_ZONE_PX = 44;
const HANDLE = '[data-sheet-handle], .modal-header, .bottom-sheet__handle, .bottom-sheet__header';
const NO_DRAG = 'input, textarea, select, [contenteditable="true"]';

function prefersReducedMotion() {
    return typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function attachDialog(node, close) {
    const previouslyFocused = document.activeElement;
    const state = { dismissedByDrag: false };

    focusInitial(node);

    const onKey = (event) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            close();
        }
    };
    document.addEventListener('keydown', onKey);

    const detachDrag = node.matches(SHEET_PANEL)
        ? attachSheetDrag(node, () => { state.dismissedByDrag = true; close(); })
        : null;

    // Snapshot for the exit animation now, while the panel is still in the
    // document — by the time the removal can be observed, it is gone.
    return () => {
        document.removeEventListener('keydown', onKey);
        detachDrag?.();
        if (!state.dismissedByDrag) leaveOnExitAnimation(node);
        if (previouslyFocused && typeof previouslyFocused.focus === 'function' && previouslyFocused.isConnected) {
            previouslyFocused.focus({ preventScroll: true });
        }
    };
}

// Initial focus goes to the panel itself unless the dialog is a form that
// starts with a text field (or marks a control with data-autofocus). Focusing
// the first *button* put a focus ring on the close button of every dialog that
// opened on its own — the onboarding, patch notes — which read as a bordered
// control nobody had touched, and let a stray Enter activate it.
function focusInitial(node) {
    const explicit = node.querySelector('[data-autofocus]');
    const first = node.querySelector(FOCUSABLE);
    const target = explicit || (first && first.matches(TEXT_ENTRY) ? first : node);
    target.focus?.({ preventScroll: true });
}

// ---------------------------------------------------------------------------
// Drag to dismiss.
//
// Touch events, not pointer events: once the gesture is recognised as a sheet
// drag, `preventDefault()` on a non-passive touchmove is the only way to stop
// the browser from also scrolling the panel underneath the finger. With
// pointer events the browser claims the pan and fires pointercancel instead.
function attachSheetDrag(panel, dismiss) {
    const isSheetNow = () =>
        panel.matches('.bottom-sheet__panel') || window.matchMedia(SHEET_QUERY).matches;
    const host = panel.closest(SHEET_HOST);
    const backdrop = host?.querySelector(':scope > .bottom-sheet__backdrop') || null;

    let start = null;
    let dragging = false;
    let dy = 0;
    let samples = [];

    const setScrim = (progress, withTransition) => {
        // progress 0 = fully open, 1 = gone. The modal scrim paints its own
        // background (the panel is its child, so opacity would fade the panel
        // too); the bottom sheet has a separate backdrop element.
        if (backdrop) {
            backdrop.style.transition = withTransition ? 'opacity var(--duration-slow) var(--ease-drawer)' : 'none';
            backdrop.style.opacity = String(1 - progress);
        } else if (host) {
            host.style.transition = withTransition ? 'background-color var(--duration-slow) var(--ease-drawer)' : 'none';
            host.style.backgroundColor = `color-mix(in srgb, var(--scrim) ${Math.round((1 - progress) * 100)}%, transparent)`;
        }
    };

    const reset = () => {
        panel.style.transition = '';
        panel.style.transform = '';
        if (backdrop) { backdrop.style.transition = ''; backdrop.style.opacity = ''; }
        if (host) { host.style.transition = ''; host.style.backgroundColor = ''; }
    };

    const onStart = (event) => {
        start = null;
        if (event.touches.length !== 1 || !isSheetNow()) return;
        const target = event.target;
        if (!(target instanceof Element) || target.closest(NO_DRAG)) return;
        const touch = event.touches[0];
        const inGrabZone = touch.clientY - panel.getBoundingClientRect().top <= GRAB_ZONE_PX;
        if (!inGrabZone && !target.closest(HANDLE)) return;
        start = { x: touch.clientX, y: touch.clientY };
        dragging = false;
        dy = 0;
        samples = [{ y: touch.clientY, t: event.timeStamp }];
    };

    const onMove = (event) => {
        if (!start) return;
        const touch = event.touches[0];
        const moveY = touch.clientY - start.y;
        const moveX = touch.clientX - start.x;
        if (!dragging) {
            if (Math.abs(moveY) < 6 && Math.abs(moveX) < 6) return;
            // Up or sideways is not a dismiss: hand the gesture back.
            if (moveY <= 0 || Math.abs(moveX) > Math.abs(moveY)) {
                start = null;
                return;
            }
            dragging = true;
            // The entrance animation may still be running; it owns `transform`
            // until it is cleared.
            panel.style.animation = 'none';
            panel.style.transition = 'none';
        }
        event.preventDefault();
        dy = Math.max(0, moveY);
        panel.style.transform = `translate3d(0, ${dy}px, 0)`;
        setScrim(Math.min(1, dy / Math.max(1, panel.offsetHeight)), false);
        samples.push({ y: touch.clientY, t: event.timeStamp });
        if (samples.length > 5) samples.shift();
    };

    const onEnd = () => {
        if (!start) return;
        start = null;
        if (!dragging) return;
        dragging = false;

        const height = panel.offsetHeight;
        const dismissNow = shouldDismissSheet({ dy, height, velocity: releaseVelocity(samples) });
        const reduced = prefersReducedMotion();
        panel.style.transition = reduced
            ? 'none'
            : `transform ${dismissNow ? 'var(--duration-slow)' : 'var(--duration-entrance)'} var(--ease-drawer)`;

        if (dismissNow) {
            panel.style.transform = 'translate3d(0, 100%, 0)';
            setScrim(1, !reduced);
            let finished = false;
            const finish = () => { if (!finished) { finished = true; dismiss(); } };
            if (reduced) finish();
            else {
                panel.addEventListener('transitionend', finish, { once: true });
                window.setTimeout(finish, 400); // transitionend is not guaranteed
            }
        } else {
            panel.style.transform = 'translate3d(0, 0, 0)';
            setScrim(0, !reduced);
            window.setTimeout(reset, 400);
        }
    };

    panel.addEventListener('touchstart', onStart, { passive: true });
    panel.addEventListener('touchmove', onMove, { passive: false });
    panel.addEventListener('touchend', onEnd);
    panel.addEventListener('touchcancel', onEnd);
    return () => {
        panel.removeEventListener('touchstart', onStart);
        panel.removeEventListener('touchmove', onMove);
        panel.removeEventListener('touchend', onEnd);
        panel.removeEventListener('touchcancel', onEnd);
    };
}

// ---------------------------------------------------------------------------
// Exit animation.
//
// Every dialog in the app is unmounted the instant its parent flips a boolean,
// so none of them could animate out — they blinked away, which is the least
// native thing a sheet can do. Rather than teach sixteen dialogs to delay their
// own unmount, the leaving dialog is copied: a static, inert clone of its host
// (scrim + panel) is put back in the document and plays the exit keyframes in
// index.css (`.is-exiting`), then removes itself.
//
// The clone is taken at ref cleanup, while React has not yet removed the node,
// and only shown if the original is actually gone a microtask later — under
// StrictMode, React detaches and re-attaches a ref on mount without removing
// anything, and that must not produce a ghost.
function leaveOnExitAnimation(panel) {
    if (prefersReducedMotion()) return;
    const host = panel.closest(SHEET_HOST);
    if (!host || !host.isConnected) return;

    const ghost = host.cloneNode(true);
    const scrolled = collectScrollPositions(host, ghost);
    ghost.classList.add('is-exiting');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    ghost.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));

    queueMicrotask(() => {
        if (host.isConnected) return;
        document.body.appendChild(ghost);
        scrolled.forEach(([el, top]) => { el.scrollTop = top; });
        window.setTimeout(() => ghost.remove(), 320);
    });
}

// A clone starts scrolled to the top; a dialog closed halfway down its content
// would visibly jump before leaving. Walk both trees in step and carry the
// scroll offsets across.
function collectScrollPositions(original, clone) {
    const pairs = [];
    const a = document.createTreeWalker(original, NodeFilter.SHOW_ELEMENT);
    const b = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT);
    let x = a.currentNode;
    let y = b.currentNode;
    while (x && y) {
        if (x.scrollTop > 0) pairs.push([y, x.scrollTop]);
        x = a.nextNode();
        y = b.nextNode();
    }
    return pairs;
}
