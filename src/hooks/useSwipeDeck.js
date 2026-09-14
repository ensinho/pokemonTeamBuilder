import { useCallback, useEffect, useRef, useState } from 'react';

// How far a finger travels before the gesture commits to an axis. Below this
// the touch is still ambiguous and the page must be free to scroll.
const AXIS_LOCK_PX = 10;
// Commit thresholds — either a quarter of the screen, or a flick.
const COMMIT_RATIO = 0.25;
const COMMIT_VELOCITY = 0.4; // px/ms
// Pull past the first/last entry, and the deck resists instead of moving.
const EDGE_RESISTANCE = 0.28;
// Slide-out before the route changes. Kept in step with --pdm-exit in
// pokemon-detail-mobile.css.
const EXIT_MS = 190;

/**
 * Drag-a-deck-sideways gesture for the mobile Pokémon screen: the page follows
 * the finger, the neighbour peeks in from the edge, and releasing past the
 * threshold commits to it.
 *
 * The live offset is written straight to the DOM as a `--pdm-dx` custom
 * property on `rootRef` rather than held in React state — a touchmove is ~60
 * events a second and this screen's tree is the whole Pokédex entry. React only
 * hears about the phase changes (idle → dragging → committing), which is what
 * decides whether the peek panels exist at all.
 *
 * Vertical scrolling is untouched: the root carries `touch-action: pan-y`, so
 * the browser keeps the vertical pan and we never preventDefault.
 */
export function useSwipeDeck({ hasPrev, hasNext, onPrev, onNext, enabled = true }) {
    const rootRef = useRef(null);
    const gesture = useRef(null);
    const exitTimer = useRef(null);
    const [phase, setPhase] = useState('idle'); // 'idle' | 'dragging' | 'prev' | 'next'

    const setOffset = useCallback((value) => {
        rootRef.current?.style.setProperty('--pdm-dx', `${value}px`);
    }, []);

    useEffect(() => () => clearTimeout(exitTimer.current), []);

    const handleTouchStart = useCallback((event) => {
        if (!enabled || event.touches.length !== 1 || phase === 'prev' || phase === 'next') return;
        const touch = event.touches[0];
        gesture.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: event.timeStamp,
            axis: null,
            dx: 0,
            width: rootRef.current?.offsetWidth || window.innerWidth,
        };
    }, [enabled, phase]);

    const handleTouchMove = useCallback((event) => {
        const g = gesture.current;
        if (!g || event.touches.length !== 1) return;
        const touch = event.touches[0];
        const dx = touch.clientX - g.x;
        const dy = touch.clientY - g.y;

        if (!g.axis) {
            if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
            // Ties go to the scroller: a mostly-vertical drag on a long page is
            // far more common than a sideways one, and stealing it is worse than
            // missing a lazy swipe.
            g.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
            if (g.axis === 'x') setPhase('dragging');
        }
        if (g.axis !== 'x') return;

        const blocked = (dx > 0 && !hasPrev) || (dx < 0 && !hasNext);
        g.dx = blocked ? dx * EDGE_RESISTANCE : dx;
        setOffset(g.dx);
    }, [hasPrev, hasNext, setOffset]);

    const handleTouchEnd = useCallback((event) => {
        const g = gesture.current;
        gesture.current = null;
        if (!g || g.axis !== 'x') { setPhase('idle'); return; }

        const elapsed = Math.max(event.timeStamp - g.time, 1);
        const velocity = Math.abs(g.dx) / elapsed;
        const passed = Math.abs(g.dx) > g.width * COMMIT_RATIO || velocity > COMMIT_VELOCITY;
        const direction = g.dx > 0 ? 'prev' : 'next';
        const available = direction === 'prev' ? hasPrev : hasNext;

        if (!passed || !available) {
            setPhase('idle');
            setOffset(0);
            return;
        }

        setPhase(direction);
        setOffset(direction === 'prev' ? g.width : -g.width);
        exitTimer.current = setTimeout(() => {
            (direction === 'prev' ? onPrev : onNext)?.();
        }, EXIT_MS);
    }, [hasPrev, hasNext, onPrev, onNext, setOffset]);

    const handleTouchCancel = useCallback(() => {
        gesture.current = null;
        setPhase('idle');
        setOffset(0);
    }, [setOffset]);

    return {
        rootRef,
        phase,
        // The peek panels only exist while a gesture does — three Pokémon heroes
        // on screen at rest is two more than anyone is looking at.
        isActive: phase !== 'idle',
        isSettling: phase === 'prev' || phase === 'next',
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
            onTouchCancel: handleTouchCancel,
        },
    };
}
