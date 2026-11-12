import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mascot } from './Mascot';
import { useMascotStore } from '../store/useMascotStore';
import { gameBeat } from '../utils/mascot/assistant';

/**
 * The mascot beside a game (2026-11-11): he lives there (breathes, looks at
 * the pointer, hops when tapped) and answers the game's beats
 * (`useMascotBeat`) — a hop for a right answer, a head shake for a miss,
 * sparks for a hint, a celebration at a win. A passing face goes back to the
 * resting one after its `hold`; an end stays. He holds the stage while
 * mounted, so the app's own reactions (a saved team, an error) play here too.
 *
 * `listen`: also take the app's beats (`useMascotStore.emitBeat`, e.g. the
 * forum store's post, comment, like and reaction) — only those emitted after
 * he mounted, so opening a page never replays an old one.
 *
 * Decorative: the game's copy says what happened; he is `aria-hidden`.
 */
export function MascotCompanion({ beat: own, listen = false, rest = 'feliz', restPose, size = 'md', framing, stage = true, className = '' }) {
    const appBeat = useMascotStore((s) => (listen ? s.beat : null));
    const mountedAt = useRef(useMascotStore.getState().beat?.id ?? 0);
    const heard = useMemo(() => {
        if (!appBeat || appBeat.id <= mountedAt.current) return null;
        const look = gameBeat(appBeat.kind);
        return look ? { ...look, kind: appBeat.kind, id: `app${appBeat.id}` } : null;
    }, [appBeat]);
    // the newest of the two wins (a game's own beat, or one the app heard)
    const [latest, setLatest] = useState(null);
    useEffect(() => { if (own) setLatest(own); }, [own]);
    useEffect(() => { if (heard) setLatest(heard); }, [heard]);
    const beat = latest;
    const [held, setHeld] = useState(null);
    useEffect(() => {
        if (!beat) return undefined;
        setHeld(beat);
        if (!beat.hold) return undefined;
        const id = window.setTimeout(() => setHeld((h) => (h?.id === beat.id ? null : h)), beat.hold);
        return () => window.clearTimeout(id);
    }, [beat]);
    return (
        <Mascot
            size={size}
            framing={framing}
            mood={held?.mood || rest}
            pose={held?.pose || restPose}
            play={beat?.play}
            playKey={beat?.id}
            interactive
            stage={stage}
            seasonal={false}
            className={`mascot-companion ${className}`}
        />
    );
}

export default MascotCompanion;
