import { useCallback, useRef, useState } from 'react';
import { gameBeat, nextStreak } from '../utils/mascot/assistant';

/**
 * A game's beats for `<MascotCompanion>` (2026-11-11): `emit('found')` when
 * the trainer's answer lands, `emit('miss')`, `emit('win')`… The streak of
 * right answers is counted here, so the views only say what happened.
 * What each beat looks like is `gameBeat`'s call (utils/mascot/assistant.js).
 */
export function useMascotBeat() {
    const [beat, setBeat] = useState(null);
    const streak = useRef(0);
    const seq = useRef(0);
    const emit = useCallback((kind, facts = {}) => {
        streak.current = nextStreak(streak.current, kind);
        const look = gameBeat(kind, { ...facts, streak: streak.current });
        if (!look) return;
        seq.current += 1;
        setBeat({ ...look, kind, id: seq.current });
    }, []);
    return [beat, emit];
}
