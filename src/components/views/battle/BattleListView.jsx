import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useBattles } from '../../../hooks/useBattles';
import { useAuthStore } from '../../../store/useAuthStore';
import { useBattlesStore } from '../../../store/useBattlesStore';
import { useToastStore } from '../../../store/useToastStore';
import { useTranslation } from '../../../hooks/useTranslation';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import {
    isBrowserNotificationSupported, getBrowserNotificationPreference, setBrowserNotificationPreference,
} from '../../../hooks/useBattleNotifications';
import { AvatarSprite } from '../../AvatarSprite';
import { EmptyState } from '../../EmptyState';
import { PokeballIcon } from '../../icons';
import '../../../styles/battle-view.css';

/** Enable/disable the native browser popup for "your turn" and challenges. */
function NotificationToggle() {
    const { t } = useTranslation();
    const showToast = useToastStore((state) => state.showToast);
    const [enabled, setEnabled] = useState(() => (
        isBrowserNotificationSupported()
        && getBrowserNotificationPreference()
        && Notification.permission === 'granted'
    ));

    const handleClick = async () => {
        if (!isBrowserNotificationSupported()) {
            showToast(t('battle.notifyUnsupported'), 'warning');
            return;
        }
        if (enabled) {
            setBrowserNotificationPreference(false);
            setEnabled(false);
            return;
        }
        if (Notification.permission === 'denied') {
            showToast(t('battle.notifyBlocked'), 'warning');
            return;
        }
        const permission = Notification.permission === 'granted'
            ? 'granted'
            : await Notification.requestPermission();
        if (permission === 'granted') {
            setBrowserNotificationPreference(true);
            setEnabled(true);
        } else {
            showToast(t('battle.notifyBlocked'), 'warning');
        }
    };

    return (
        <button type="button" className="battle-sprite-toggle" aria-pressed={enabled} onClick={handleClick}>
            {t('battle.notifyToggle')}: {enabled ? t('common.yes') : t('common.no')}
        </button>
    );
}

/** Status pill copy + tone, from the viewer's point of view. */
const statusTone = (view) => {
    if (view.waitingOn === 'me') return 'is-urgent';
    if (view.status === 'active') return 'is-active';
    if (view.isOver) return 'is-over';
    return 'is-waiting';
};

export function BattleListView() {
    const { t } = useTranslation();
    useDocumentMeta({
        title: 'Battles',
        description: 'Your turn-by-turn battles against friends.',
        path: '/battles',
    });

    const navigate = useNavigate();
    const isAnonymous = useAuthStore((state) => state.isAnonymous);
    const { battles, isLoadingBattles } = useBattles();
    const deleteBattle = useBattlesStore((state) => state.deleteBattle);

    if (isAnonymous) {
        return (
            <div className="battle-view">
                <EmptyState title={t('battle.guestTitle')} message={t('battle.guestMessage')} />
            </div>
        );
    }

    const statusLabel = (view) => {
        if (view.status === 'pending') {
            return view.isChallenger ? t('battle.statusSentPending') : t('battle.statusAwaitingYou');
        }
        if (view.status === 'teamSelect') {
            if (!view.myReady) return t('battle.statusPickYourTeam');
            if (!view.theirReady) return t('battle.statusWaitingTheirTeam');
            return t('battle.statusReadyToStart');
        }
        return t(`battle.status_${view.status}`);
    };

    return (
        <div className="battle-view">
            <p className="battle-intro">{t('battle.listIntro')}</p>
            <NotificationToggle />

            {isLoadingBattles && battles.length === 0 ? (
                <div className="battle-loading">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                </div>
            ) : battles.length === 0 ? (
                <EmptyState
                    compact
                    title={t('battle.emptyTitle')}
                    message={t('battle.emptyMessage')}
                    action={{ label: t('battle.goToFriends'), onClick: () => navigate('/friends') }}
                />
            ) : (
                <ul className="battle-list">
                    {battles.map(({ battle, view }) => (
                        <li key={battle.id} className={`battle-card ${statusTone(view)}`}>
                            <button
                                type="button"
                                className="battle-card__main"
                                onClick={() => navigate(`/battles/${battle.id}`)}
                            >
                                <span className="battle-card__avatar">
                                    <AvatarSprite
                                        trainerSprite={view.opponentAvatar?.trainerSprite}
                                        pokemonId={view.opponentAvatar?.pokemonId}
                                        isShiny={view.opponentAvatar?.isShiny}
                                        fallback={<PokeballIcon className="w-5 h-5 text-muted opacity-50" />}
                                    />
                                </span>
                                <span className="battle-card__identity">
                                    <span className="battle-card__name">
                                        {view.opponentName || t('friends.unknownTrainer')}
                                    </span>
                                    <span className="battle-card__status">{statusLabel(view)}</span>
                                </span>
                                {view.waitingOn === 'me' && (
                                    <span className="battle-card__flag">{t('battle.yourMove')}</span>
                                )}
                            </button>

                            {view.canDelete && (
                                <button
                                    type="button"
                                    className="btn btn-ghost battle-card__dismiss"
                                    onClick={() => deleteBattle(battle.id)}
                                >
                                    {t('battle.dismiss')}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
