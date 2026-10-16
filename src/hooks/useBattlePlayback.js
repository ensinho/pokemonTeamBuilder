import { useCallback, useEffect, useReducer, useRef } from 'react';

import {
    durationOf, initialPlayback, isPlaying, isSilent, playbackReducer, toTimeline, withDialogue,
} from '../utils/battleTimeline';

/**
 * Plays the battle log as a sequence of moments (`battleTimeline.js` holds the
 * queue as a pure reducer; this adds the timers).
 *
 * New lines (a turn coming back from the server) are queued and played in
 * order; lines already in the log when the screen opened are shown at once —
 * resuming a battle never replays it. A fresh battle opens with `intro`
 * events. `skip()` (a tap, the A button) moves straight to the next moment.
 *
 * @param {string[]} lines the player's log
 * @param {{dialogue?: Array<{key, params, lineIndex}>, intro?: object[], fast?: boolean, reducedMotion?: boolean}} options
 */
export function useBattlePlayback(lines, { dialogue = [], intro = [], fast = false, reducedMotion = false } = {}) {
    const [state, dispatch] = useReducer(playbackReducer, null, () => initialPlayback(
        lines.length,
        intro.length ? withDialogue([...intro, ...toTimeline(lines)], dialogue) : [],
    ));
    const queued = useRef(lines.length);
    const dialogueRef = useRef(dialogue);
    dialogueRef.current = dialogue;

    // Queue whatever arrived since last time.
    useEffect(() => {
        if (lines.length < queued.current) {
            queued.current = lines.length;
            dispatch({ type: 'reset', tail: lines.length });
            return;
        }
        if (lines.length === queued.current) return;
        const from = queued.current;
        queued.current = lines.length;
        const fresh = dialogueRef.current.filter((d) => d.lineIndex >= from);
        dispatch({ type: 'enqueue', events: withDialogue(toTimeline(lines, { from }), fresh), tail: lines.length });
    }, [lines]);

    // Start the next moment when idle; hold the current one for its duration.
    const { current, queue } = state;
    useEffect(() => {
        if (!current) {
            if (queue.length) dispatch({ type: 'next' });
            return undefined;
        }
        const ms = isSilent(current) && current.type === 'turn' ? 0 : durationOf(current, { fast, reducedMotion });
        const timer = setTimeout(() => dispatch({ type: 'next' }), ms);
        return () => clearTimeout(timer);
    }, [current, queue.length, fast, reducedMotion]);

    const skip = useCallback(() => dispatch({ type: 'next' }), []);

    // Lines that arrived this render are queued by the effect above, one render
    // late; they already count as playing, or the commands flash for a frame
    // between the server's answer and the turn's first moment.
    const playing = isPlaying(state) || lines.length > state.tail;
    return { current, shown: state.shown, playing, skip };
}
