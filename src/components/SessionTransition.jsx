import React from 'react';
import '../styles/auth-dialog.css';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { Loader } from './Loader';

/**
 * The cover between two sessions (sign out, account deleted). It hides the
 * moment the profile would otherwise re-render as a guest's, and lifts once
 * Home is under it — see `leaveSession` in useAuthStore.
 */
export function SessionTransition() {
    const { t } = useTranslation();
    const transition = useAuthStore((s) => s.sessionTransition);
    if (!transition) return null;
    const deleted = transition.kind === 'deleted';
    return (
        <div className="session-transition" role="alert" aria-live="assertive">
            <div className="session-transition__card">
                <Loader size="lg" />
                <h2 className="session-transition__title">
                    {deleted ? t('modals.sessionDeletedTitle') : t('modals.sessionSignOutTitle')}
                </h2>
                <p className="session-transition__text">
                    {deleted ? t('modals.sessionDeletedText') : t('modals.sessionSignOutText')}
                </p>
            </div>
        </div>
    );
}
