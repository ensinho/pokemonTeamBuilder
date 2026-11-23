import React, { lazy, Suspense, useEffect, useState } from 'react';

import { useMomentStore } from '../../store/useMomentStore';

const LevelUpScene = lazy(() => import('./LevelUpScene'));
const FullDayScene = lazy(() => import('./FullDayScene'));
const TeamSavedScene = lazy(() => import('./TeamSavedScene'));
const SCENES = { levelUp: LevelUpScene, fullDay: FullDayScene, teamSaved: TeamSavedScene };

/**
 * Plays the living moments one at a time (useMomentStore, utils/livingMoments.js).
 * Mounted once in AppLayout; the scenes are their own lazy chunk, fetched only
 * when a trainer earns one. A place playing its own scene holds the queue
 * (`holdMoments`) and the next moment waits for it.
 */
export function MomentLayer() {
    const current = useMomentStore((s) => s.queue[0] || null);
    const holdUntil = useMomentStore((s) => s.holdUntil);
    const [, wake] = useState(0);

    useEffect(() => {
        if (!current) return undefined;
        const wait = holdUntil - Date.now();
        if (wait <= 0) return undefined;
        const timer = window.setTimeout(() => wake((n) => n + 1), wait + 20);
        return () => window.clearTimeout(timer);
    }, [current, holdUntil]);

    if (!current || holdUntil > Date.now()) return null;
    const Scene = SCENES[current.kind];
    if (!Scene) return null;
    const done = () => useMomentStore.getState().finish(current.id);
    return (
        <Suspense fallback={null}>
            <Scene key={current.id} payload={current.payload} onDone={done} />
        </Suspense>
    );
}

export default MomentLayer;
