import React from 'react';
import { useToastStore } from '../store/useToastStore';
import {
    CheckCircleIcon, XCircleIcon, AlertTriangleIcon, InfoCircleIcon, CloseIcon,
} from './icons';
import { useTranslation } from '../hooks/useTranslation';

const SEVERITY_ICON = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: AlertTriangleIcon,
    info: InfoCircleIcon,
};

/**
 * One toast. Kept as its own component so the enter → visible handoff is a
 * local effect rather than a scan over the whole stack on every render.
 */
function Toast({ toast, onDismiss, onSettle, closeLabel }) {
    const Icon = SEVERITY_ICON[toast.severity] || InfoCircleIcon;
    const autoDismisses = Number.isFinite(toast.duration) && toast.duration > 0;

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
            <div className={`toast toast--${toast.severity}`}>
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
                    closeLabel={t('toast.dismiss')}
                />
            ))}
        </ul>
    );
}
