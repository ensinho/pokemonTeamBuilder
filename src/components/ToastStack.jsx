import React from 'react';
import { useToastStore } from '../store/useToastStore';
import {
    CheckCircleIcon, XCircleIcon, AlertTriangleIcon, InfoCircleIcon, CloseIcon,
} from './icons';
import { useTranslation } from '../hooks/useTranslation';
import { releaseVelocity, shouldDismissSwipe } from '../utils/sheetDismiss';

const SEVERITY_ICON = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: AlertTriangleIcon,
    info: InfoCircleIcon,
};

// How far a finger must travel before the toast is being dragged rather than
// tapped — a tap on "Undo" must stay a tap.
const DRAG_SLOP_PX = 8;
// The swipe-out runs on the glide token; this is when the store may collapse
// the row behind it.
const SWIPE_OUT_MS = 220;

/**
 * Swipe a toast off either edge to dismiss it (SwipeToast, React Bits) — the
 * gesture every phone notification answers to. Touch and pen only: on a
 * desktop the stack pauses under the cursor and every toast has a close
 * button, and a mouse drag there should stay free to select text.
 *
 * The toast follows the finger directly (a CSS variable, no re-render); the
 * release decision is the same rule the bottom sheets use, sideways
 * (utils/sheetDismiss.js). A vertical drag is let go at once.
 */
function useSwipeToDismiss({ onDismiss, onHold, onRelease }) {
    const nodeRef = React.useRef(null);
    const gesture = React.useRef(null);

    const reset = (node) => {
        node.classList.remove('is-dragging');
        node.style.removeProperty('--swipe-x');
        node.style.removeProperty('opacity');
    };

    const onPointerDown = (event) => {
        if (event.pointerType === 'mouse' || !event.isPrimary) return;
        gesture.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            dragging: false,
            samples: [{ y: event.clientX, t: event.timeStamp }],
        };
    };

    const onPointerMove = (event) => {
        const g = gesture.current;
        const node = nodeRef.current;
        if (!g || !node || event.pointerId !== g.id) return;
        const dx = event.clientX - g.x;
        const dy = event.clientY - g.y;
        if (!g.dragging) {
            if (Math.abs(dx) < DRAG_SLOP_PX && Math.abs(dy) < DRAG_SLOP_PX) return;
            if (Math.abs(dy) > Math.abs(dx)) {
                gesture.current = null;
                return;
            }
            g.dragging = true;
            node.setPointerCapture?.(event.pointerId);
            node.classList.add('is-dragging');
            onHold?.();
        }
        g.samples.push({ y: event.clientX, t: event.timeStamp });
        if (g.samples.length > 5) g.samples.shift();
        const width = node.offsetWidth || 1;
        node.style.setProperty('--swipe-x', `${dx}px`);
        node.style.opacity = String(Math.max(0.2, 1 - Math.abs(dx) / width));
    };

    const onPointerEnd = (event) => {
        const g = gesture.current;
        const node = nodeRef.current;
        gesture.current = null;
        if (!g || !node || !g.dragging || event.pointerId !== g.id) return;
        onRelease?.();
        const dx = event.clientX - g.x;
        const width = node.offsetWidth || 1;
        const velocity = event.type === 'pointercancel' ? 0 : releaseVelocity(g.samples);
        node.classList.remove('is-dragging');
        if (event.type !== 'pointercancel' && shouldDismissSwipe({ dx, width, velocity })) {
            node.style.setProperty('--swipe-x', `${Math.sign(dx) * (width + 24)}px`);
            node.style.opacity = '0';
            window.setTimeout(onDismiss, SWIPE_OUT_MS);
        } else {
            reset(node);
        }
    };

    return {
        ref: nodeRef,
        onPointerDown,
        onPointerMove,
        onPointerUp: onPointerEnd,
        onPointerCancel: onPointerEnd,
    };
}

/**
 * One toast. Kept as its own component so the enter → visible handoff is a
 * local effect rather than a scan over the whole stack on every render.
 */
function Toast({ toast, onDismiss, onSettle, onHold, onRelease, closeLabel }) {
    const Icon = SEVERITY_ICON[toast.severity] || InfoCircleIcon;
    const autoDismisses = Number.isFinite(toast.duration) && toast.duration > 0;
    const swipe = useSwipeToDismiss({ onDismiss: () => onDismiss(toast.id), onHold, onRelease });

    React.useEffect(() => {
        if (toast.phase !== 'entering') return undefined;
        const handle = requestAnimationFrame(() => onSettle(toast.id));
        return () => cancelAnimationFrame(handle);
    }, [toast.phase, toast.id, onSettle]);

    return (
        <li
            className={`toast-item is-${toast.phase}`}
            // An error is worth interrupting a screen reader for; a success
            // confirming an action the user just took is not.
            role={toast.severity === 'error' ? 'alert' : 'status'}
            aria-live={toast.severity === 'error' ? 'assertive' : 'polite'}
        >
            <div className={`toast toast--${toast.severity}`} {...swipe}>
                <span className="toast__icon" aria-hidden="true">
                    {toast.spriteUrl
                        ? <img src={toast.spriteUrl} alt="" className="toast__sprite" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        : <Icon className="toast__glyph" />}
                </span>

                <div className="toast__body">
                    <p className="toast__title">{toast.title}</p>
                    {toast.description && <p className="toast__desc">{toast.description}</p>}

                    {toast.actions.length > 0 && (
                        <div className="toast__actions">
                            {toast.actions.map((action, i) => (
                                <button
                                    key={action.label}
                                    type="button"
                                    // The last action is the one that continues the flow, so
                                    // it always carries the fill — including when it is the
                                    // only one. Anything before it is the way out, and reads
                                    // as an outline.
                                    className={`toast__action ${action.variant || (i === toast.actions.length - 1 ? 'primary' : 'ghost')}`}
                                    onClick={() => {
                                        action.onClick?.();
                                        if (!action.keepOpen) onDismiss(toast.id);
                                    }}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {toast.closable && (
                    <button
                        type="button"
                        className="toast__close"
                        onClick={() => onDismiss(toast.id)}
                        aria-label={closeLabel}
                    >
                        <CloseIcon className="w-4 h-4" />
                    </button>
                )}

                {autoDismisses && (
                    // Hairline countdown. It is not decoration: it is the only
                    // thing that tells the user the toast is on a clock, and
                    // seeing it stop under the cursor is how hover-to-pause is
                    // discovered. Driven by CSS so the pause is a single
                    // `animation-play-state` flip, not a JS ticker.
                    <span
                        className="toast__timer"
                        aria-hidden="true"
                        style={{ animationDuration: `${toast.duration}ms` }}
                    />
                )}
            </div>
        </li>
    );
}

/**
 * The stack. Fixed to the top-right on desktop and to the bottom on phones,
 * where the top edge is under the notch and out of thumb reach.
 *
 * Hovering or focusing anywhere in the stack freezes every dismiss timer —
 * a toast that expires while you are reaching for its button is worse than no
 * toast at all, and toasts here carry buttons by design.
 */
export default function ToastStack() {
    const toasts = useToastStore((s) => s.toasts);
    const dismissToast = useToastStore((s) => s.dismissToast);
    const settleToast = useToastStore((s) => s.settleToast);
    const pauseToasts = useToastStore((s) => s.pauseToasts);
    const resumeToasts = useToastStore((s) => s.resumeToasts);
    const paused = useToastStore((s) => s.paused);
    const { t } = useTranslation();

    if (toasts.length === 0) return null;

    return (
        <ul
            className={`toast-stack ${paused ? 'is-paused' : ''}`}
            aria-label={t('toast.regionLabel')}
            onMouseEnter={pauseToasts}
            onMouseLeave={resumeToasts}
            onFocusCapture={pauseToasts}
            onBlurCapture={resumeToasts}
        >
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    toast={toast}
                    onDismiss={dismissToast}
                    onSettle={settleToast}
                    onHold={pauseToasts}
                    onRelease={resumeToasts}
                    closeLabel={t('toast.dismiss')}
                />
            ))}
        </ul>
    );
}
