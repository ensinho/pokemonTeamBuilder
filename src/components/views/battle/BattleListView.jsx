import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Trash2 } from 'lucide-react';
import { FramedAvatar } from '../../rewards/FramedAvatar';

import { useBattles } from '../../../hooks/useBattles';
import { useFriends } from '../../../hooks/useFriends';
import { useAuthStore } from '../../../store/useAuthStore';
import { useBattlesStore } from '../../../store/useBattlesStore';
import { useTranslation } from '../../../hooks/useTranslation';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { useNotificationSettings } from '../../../hooks/useNotificationSettings';
import { AvatarSprite } from '../../AvatarSprite';
import { EmptyState } from '../../EmptyState';
import { PokeballIcon, SwordsIcon } from '../../icons';
import { ChallengeModal } from '../../modals/ChallengeModal';
import '../../../styles/battle-view.css';
import { Loader } from '../../Loader';
import { promptSignIn } from '../../../utils/navigation';
import { confirmAction } from '../../../store/useConfirmStore';
import { Switch } from '../../Switch';

/**
 * Enable/disable notifications for battles — in-app while the tab is open, and
 * Web Push once the app is closed. All of the platform awkwardness (iOS wants
 * the PWA installed, every browser wants the prompt to come from a click) lives
 * in `useNotificationSettings`.
 */
function NotificationToggle() {
    const { t } = useTranslation();
    const { enabled, busy, toggle } = useNotificationSettings();

    // A switch, not a pill that reads "Notifications: Enabled" — the control's
    // position is the state, so the label can just name what it controls.
    return (
        <Switch
            size="sm"
            checked={enabled}
            disabled={busy}
            onChange={toggle}
            label={t('profile.sectionNotifications')}
        />
    );
}

/** How a finished battle went, from the viewer's side — null while it isn't over. */
const outcomeOf = (battle, userId) => {
    if (battle.status !== 'ended') return null;
    if (battle.forfeitedBy) return battle.forfeitedBy === userId ? 'forfeitLost' : 'forfeitWon';
    if (!battle.winner) return 'tie';
    return battle.winner === userId ? 'won' : 'lost';
};

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
    const userId = useAuthStore((state) => state.userId);
    const isAnonymous = useAuthStore((state) => state.isAnonymous);
    const myAvatar = useAuthStore(useShallow((state) => state.publicAvatar()));
    const { battles, isLoadingBattles } = useBattles();
    const { friends } = useFriends();
    const challengeFriend = useBattlesStore((state) => state.challengeFriend);
    const deleteBattle = useBattlesStore((state) => state.deleteBattle);

    const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);

    if (isAnonymous) {
        return (
            <div className="battle-view">
                <EmptyState
                    title={t('battle.guestTitle')}
                    message={t('battle.guestMessage')}
                    action={{ label: t('profile.createAccountBtn'), onClick: () => promptSignIn('signUp') }}
                />
            </div>
        );
    }

    const statusLabel = (view) => {
        if (view.status === 'pending') {
            return view.isChallenger ? t('battle.statusSentPending') : t('battle.statusAwaitingYou');
        }
        if (view.status === 'teamSelect') {
            if (view.isRandom) return t('battle.statusDealingRandom');
            if (!view.myReady) return t('battle.statusPickYourTeam');
            if (!view.theirReady) return t('battle.statusWaitingTheirTeam');
            return t('battle.statusReadyToStart');
        }
        return t(`battle.status_${view.status}`);
    };

    const handleDelete = async (battleId, event) => {
        event.stopPropagation();
        const confirmed = await confirmAction({
            title: t('dialogs.discardBattleTitle'),
            message: t('dialogs.discardBattleMsg'),
            confirmText: t('battle.discardBattle'),
        });
        if (confirmed) await deleteBattle(battleId);
    };

    return (
        <div className="battle-view">
            {/* Header controls bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <p className="battle-intro text-sm text-muted m-0 flex-1 min-w-[240px]">
                    {t('battle.listIntro')}
                </p>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-primary font-semibold text-xs flex items-center gap-1.5 px-4 py-2"
                        onClick={() => setIsChallengeModalOpen(true)}
                    >
                        <SwordsIcon className="w-4 h-4" />
                        <span>{t('battle.createBattle')}</span>
                    </button>

                    <NotificationToggle />
                </div>
            </div>

            {isLoadingBattles && battles.length === 0 ? (
                <div className="battle-loading">
                    <Loader />
                </div>
            ) : battles.length === 0 ? (
                <EmptyState
                    compact
                    title={t('battle.emptyTitle')}
                    message={t('battle.emptyMessage')}
                    action={{
                        label: t('battle.createBattle'),
                        onClick: () => setIsChallengeModalOpen(true),
                    }}
                />
            ) : (
                <ul className="battle-list">
                    {battles.map(({ battle, view }) => {
                        const outcome = outcomeOf(battle, userId);
                        const won = outcome === 'won' || outcome === 'forfeitWon';
                        return (
                        <li key={battle.id} className={`battle-card ${statusTone(view)}`}>
                            <button
                                type="button"
                                className="battle-card__main"
                                onClick={() => navigate(`/battles/${battle.id}`)}
                            >
                                {/* The VS card in miniature: you, then them. */}
                                <span className="battle-card__vs" aria-hidden="true">
                                    <FramedAvatar uid={userId} className="battle-card__avatar">
                                        <AvatarSprite
                                            trainerSprite={myAvatar.trainerSprite}
                                            pokemonId={myAvatar.pokemonId}
                                            isShiny={myAvatar.isShiny}
                                            fallback={<PokeballIcon className="w-5 h-5 text-muted opacity-50" />}
                                        />
                                    </FramedAvatar>
                                    <span className="battle-card__vs-mark">VS</span>
                                    <FramedAvatar uid={view.opponentId} className="battle-card__avatar">
                                        <AvatarSprite
                                            trainerSprite={view.opponentAvatar?.trainerSprite}
                                            pokemonId={view.opponentAvatar?.pokemonId}
                                            isShiny={view.opponentAvatar?.isShiny}
                                            fallback={<PokeballIcon className="w-5 h-5 text-muted opacity-50" />}
                                        />
                                    </FramedAvatar>
                                </span>
                                <span className="battle-card__identity">
                                    <span className="battle-card__name">
                                        {view.isPublicInvite
                                            ? t('battle.openInviteOpponent')
                                            : (view.opponentName || t('friends.unknownTrainer'))}
                                    </span>
                                    <span className="battle-card__status">{statusLabel(view)}</span>
                                </span>
                                {view.waitingOn === 'me' && (
                                    <span className="battle-card__flag">{t('battle.yourMove')}</span>
                                )}
                                {outcome && (
                                    <span className={`battle-card__result ${won ? 'is-won' : ''}`}>
                                        {t(won ? 'battle.result.won' : outcome === 'tie' ? 'battle.result.tie' : 'battle.result.lost')}
                                    </span>
                                )}
                            </button>

                            {view.canDelete && (
                                <button
                                    type="button"
                                    className="btn btn-ghost battle-card__dismiss"
                                    onClick={(e) => handleDelete(battle.id, e)}
                                    aria-label={t('battle.dismiss')}
                                    title={t('battle.dismiss')}
                                >
                                    <Trash2 className="w-4 h-4 shrink-0 battle-card__dismiss-icon" aria-hidden="true" />
                                    <span className="battle-card__dismiss-label">{t('battle.dismiss')}</span>
                                </button>
                            )}
                        </li>
                        );
                    })}
                </ul>
            )}

            <ChallengeModal
                isOpen={isChallengeModalOpen}
                onClose={() => setIsChallengeModalOpen(false)}
                friends={friends}
                onStartChallenge={async (targetFriend, options) => {
                    const battleId = await challengeFriend(targetFriend, options);
                    if (battleId) navigate(`/battles/${battleId}`);
                }}
                userId={userId}
            />
        </div>
    );
}
