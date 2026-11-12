import React, { useCallback, useEffect, useState } from 'react';
import { LandingView } from './LandingView';
import { isReturningVisitor, markLandingSeen, shouldShowLanding } from '../../utils/landing';
import { useLandingStore } from '../../store/useLandingStore';
import { track } from '../../services/analytics';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { useAuthStore } from '../../store/useAuthStore';
import { needsTrainerProfile } from '../../utils/trainerProfile';

// Every way off the landing leads through the onboarding first (2026-11-05):
// it opens over wherever the CTA went, so the visitor's intent still wins.
const offerOnboarding = () => {
    if (needsTrainerProfile(useAuthStore.getState().trainerProfile)) {
        useOnboardingStore.getState().open('landing');
    }
};

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
    // `cta` names the way out, for the landing's funnel (services/analytics.js).
    const leave = useCallback((cta) => {
        track('landing_cta', { cta: String(cta || 'unknown') });
        markLandingSeen(storage());
        offerOnboarding();
    }, []);
    const skip = useCallback(() => {
        track('landing_cta', { cta: 'skip' });
        markLandingSeen(storage());
        setIsFirstVisit(false);
        offerOnboarding();
    }, []);

    // "Já tem conta? Entrar": the Primeira Jornada opens on its account screen
    // (2026-11-12) over the landing, which stays put if it is closed and gives
    // way once an account is in (below) — no questions here: the account may
    // already carry a profile.
    const signIn = useCallback(() => {
        track('landing_cta', { cta: 'hero_signin' });
        useOnboardingStore.getState().open('landing', { entry: 'signIn' });
    }, []);

    const showLanding = isFirstVisit && shouldShowLanding({ hasTeams, isAnonymous });
    // The shell hides the phone dock while the landing is up (useLandingStore).
    useEffect(() => {
        useLandingStore.getState().setOpen(showLanding);
        if (showLanding) track('landing_view');
        return () => useLandingStore.getState().setOpen(false);
    }, [showLanding]);

    if (showLanding) {
        return <LandingView onLeave={leave} onSkip={skip} onSignIn={signIn} />;
    }
    return children;
}
