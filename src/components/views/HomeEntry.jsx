import React, { useCallback, useState } from 'react';
import { LandingView } from './LandingView';
import { isReturningVisitor, markLandingSeen, shouldShowLanding } from '../../utils/landing';

const storage = () => {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

/**
 * The `/` route: the landing on a first visit, the trainer's Home otherwise
 * (utils/landing.js). Decided when the route mounts, from what an earlier
 * visit left in storage, so it never swaps under the visitor mid-read —
 * except to give way the moment teams or an account prove this is not a
 * first visit after all.
 */
export function HomeEntry({ hasTeams, isAnonymous, children }) {
    const [isFirstVisit, setIsFirstVisit] = useState(() => !isReturningVisitor(storage()));
    const leave = useCallback(() => markLandingSeen(storage()), []);
    const skip = useCallback(() => {
        markLandingSeen(storage());
        setIsFirstVisit(false);
    }, []);

    if (isFirstVisit && shouldShowLanding({ hasTeams, isAnonymous })) {
        return <LandingView onLeave={leave} onSkip={skip} />;
    }
    return children;
}
