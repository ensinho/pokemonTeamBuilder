import React, { useEffect, useState } from 'react';
import '../styles/auth-dialog.css';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { Mascot } from './Mascot';
import { BrandIntro } from './brand/BrandIntro';

/**
 * The cover between two sessions (sign out, account deleted). It hides the
 * moment the profile would otherwise re-render as a guest's, and lifts once
 * Home is under it — see `leaveSession` in useAuthStore.
 *
 * Since 2026-11-22 it is the brand intro in reverse (docs/modules/brand_intro.md):
 * the night closes in through the mascot's silhouette, he waves and vanishes,
 * and the page after the reload opens on the same night at rest and leaves
 * through the ghost into Home (AppLayout's `arrival` splash).
 */
export function SessionTransition() {
    const transition = useAuthStore((s) => s.sessionTransition);
    if (!transition) return null;
    return <Goodbye deleted={transition.kind === 'deleted'} />;
}

function Goodbye({ deleted }) {
    const { t } = useTranslation();
    // He waves while the night closes in, then vanishes — the ghost's exit.
    const [gone, setGone] = useState(false);
    useEffect(() => {
        const timer = window.setTimeout(() => setGone(true), 900);
        return () => window.clearTimeout(timer);
    }, []);
    return (
        <BrandIntro variant="session">
            <div className="session-scene" role="alert" aria-live="assertive">
                <Mascot
                    size="xl"
                    framing="body"
                    pose="acenando"
                    mood={deleted ? 'aliviado' : undefined}
                    play={gone ? 'vanish' : 'wave'}
                    playKey={gone ? 2 : 1}
                />
                <h2 className="session-scene__title">
                    {deleted ? t('modals.sessionDeletedTitle') : t('modals.sessionSignOutTitle')}
                </h2>
                <p className="session-scene__text">
                    {deleted ? t('modals.sessionDeletedText') : t('modals.sessionSignOutText')}
                </p>
            </div>
        </BrandIntro>
    );
}
