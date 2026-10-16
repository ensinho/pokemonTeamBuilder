import { useEffect, useRef } from 'react';

const KEY_TO_ACTION = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'a', Enter: 'a', Space: 'a',
    KeyX: 'b', Escape: 'b', Backspace: 'b',
    Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4',
};

const DIRECTIONS = new Set(['up', 'down', 'left', 'right']);

/** A key event this console must leave alone (2026-10-13: the puzzle swallowed typing). */
const isForeign = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return true;
    const target = event.target;
    if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return true;
    // A dialog over the console (confirm, sign in, search) owns the keyboard.
    return Boolean(document.querySelector('.modal-scrim'));
};

/**
 * The console's keyboard: arrows/WASD → directions, Z/Enter/Space → A,
 * X/Esc/Backspace → B, 1–4 → moves. Directions report press and release so a
 * held key keeps walking. Screens only ever see actions, never keys.
 *
 * @param {{enabled?: boolean, onAction: (action: string) => void, onRelease?: (action: string) => void}} handlers
 */
export function useConsoleInput({ enabled = true, onAction, onRelease }) {
    const handlers = useRef({ onAction, onRelease });
    handlers.current = { onAction, onRelease };

    useEffect(() => {
        if (!enabled) return undefined;
        const down = (event) => {
            const action = KEY_TO_ACTION[event.code];
            if (!action || isForeign(event)) return;
            // A focused button answers Enter/Space itself.
            if (action === 'a' && event.target?.tagName === 'BUTTON' && event.code !== 'KeyZ') return;
            event.preventDefault();
            if (event.repeat && DIRECTIONS.has(action)) return; // held: the walker repeats on its own
            handlers.current.onAction?.(action);
        };
        const up = (event) => {
            const action = KEY_TO_ACTION[event.code];
            if (action && DIRECTIONS.has(action)) handlers.current.onRelease?.(action);
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, [enabled]);
}
