import { useEffect, useRef } from 'react';

// Mobile "pull from the left edge to open the sidebar" gesture, plus
// "swipe left to close" when it's already open. No-ops on desktop (enabled=false).
//
// - Open: touch must START within `edgeWidth`px of the left edge, then travel
//   right past `threshold`px with a dominant horizontal motion.
// - Close: when already open, a dominant left swipe of `threshold`px anywhere closes it.
//
// Listeners are passive (we never preventDefault) so we don't fight native scroll.
export function useEdgeSwipe({ enabled, isOpen, onOpen, onClose, edgeWidth = 32, threshold = 80 }) {
    // Keep the latest callbacks/flags without re-binding listeners every render.
    const ctx = useRef({ enabled, isOpen, onOpen, onClose, edgeWidth, threshold });
    ctx.current = { enabled, isOpen, onOpen, onClose, edgeWidth, threshold };

    useEffect(() => {
        const start = { x: 0, y: 0, fromEdge: false, tracking: false };

        const onTouchStart = (e) => {
            const c = ctx.current;
            if (!c.enabled || e.touches.length !== 1) { start.tracking = false; return; }
            const t = e.touches[0];
            start.x = t.clientX;
            start.y = t.clientY;
            start.fromEdge = t.clientX <= c.edgeWidth;
            // Track if it could open (edge swipe) or close (sidebar already open).
            start.tracking = start.fromEdge || c.isOpen;
        };

        const onTouchEnd = (e) => {
            const c = ctx.current;
            if (!c.enabled || !start.tracking) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - start.x;
            const dy = t.clientY - start.y;
            // Ignore mostly-vertical gestures (scrolling).
            if (Math.abs(dx) < Math.abs(dy)) return;

            if (!c.isOpen && start.fromEdge && dx > c.threshold) {
                c.onOpen();
            } else if (c.isOpen && dx < -c.threshold) {
                c.onClose();
            }
        };

        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchend', onTouchEnd, { passive: true });
        return () => {
            document.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('touchend', onTouchEnd);
        };
    }, []);
}
