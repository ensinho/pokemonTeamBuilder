import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SwordsIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import { useBattleInvite } from '../hooks/useBattleInvite';
import { useBattlesStore } from '../store/useBattlesStore';
import { useAuthStore } from '../store/useAuthStore';
import { describeBattle } from '../utils/battle';

/**
 * A public battle invite inside a forum message.
 *
 * The message only carries the battle id, so this reads the live document: the
 * moment somebody claims the invite, every card in the thread changes at once.
 * All of the "may I?" logic comes from `describeBattle`, the same pure helper
 * the battle views use, so the buttons here can never offer a transition the
 * rules would reject.
 *
 * Deliberately reuses the shared-team card's shell: an invite is the same kind
 * of object in a thread, and it should not introduce a second visual language
 * for it. Its *head* is its own (`forum-invite-card__*`) because an invite
 * carries a live status and an action alongside the title, which the team
 * card's single `space-between` row had no room for on a phone.
 */
export function BattleInviteCard({ invite }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const userId = useAuthStore((s) => s.userId);
    const claimPublicInvite = useBattlesStore((s) => s.claimPublicInvite);
    const cancelChallenge = useBattlesStore((s) => s.cancelChallenge);
    const { battle, status } = useBattleInvite(invite?.battleId);

    const view = battle ? describeBattle(battle, userId) : null;
    const mode = battle?.mode || invite?.mode;
    const modeLabel = mode === 'random' ? t('forum.inviteModeRandom') : t('forum.inviteModeTeam');

    // Who took it, for a settled invite — `playerNames` is denormalized onto the
    // battle, so this needs no profile read.
    const claimedBy = battle && Array.isArray(battle.players) && battle.players.length === 2
        ? battle.playerNames?.[battle.players[1]] || t('forum.inviteSomeone')
        : null;

    // The invite's live half: a status line, an action, or both. Returned as a
    // fragment so the head's flex row (not a nested div) does the wrapping.
    const action = () => {
        if (status === 'loading') {
            return <span className="forum-invite-card__status">{t('common.loading')}</span>;
        }
        if (status === 'gone' || !battle) {
            return <span className="forum-invite-card__status">{t('forum.inviteUnavailable')}</span>;
        }
        if (battle.status === 'cancelled' || battle.status === 'declined') {
            return <span className="forum-invite-card__status">{t('forum.inviteCancelled')}</span>;
        }

        // Still open.
        if (view?.isPublicInvite) {
            if (view.canCancel) {
                return (
                    <>
                        <span className="forum-invite-card__status">{t('forum.inviteWaiting')}</span>
                        <button
                            type="button"
                            onClick={() => cancelChallenge(battle.id)}
                            className="btn btn-ghost h-7 px-2 text-xs font-bold"
                        >
                            {t('forum.inviteCancel')}
                        </button>
                    </>
                );
            }
            return (
                <button
                    type="button"
                    onClick={() => claimPublicInvite(battle.id)}
                    className="btn btn-primary h-7 px-2.5 text-xs font-bold"
                >
                    <SwordsIcon className="w-3.5 h-3.5 shrink-0" />
                    {t('forum.inviteAccept')}
                </button>
            );
        }

        // Claimed. Its two players get a way in; everyone else just sees who won
        // the race, which is why the document stays publicly readable.
        const iAmIn = Array.isArray(battle.players) && battle.players.includes(userId);
        return (
            <>
                <span className="forum-invite-card__status">
                    {t('forum.inviteTakenBy', { name: claimedBy })}
                </span>
                {iAmIn && (
                    <button
                        type="button"
                        onClick={() => navigate(`/battles/${battle.id}`)}
                        className="btn btn-primary h-7 px-2.5 text-xs font-bold"
                    >
                        {t('forum.inviteOpenBattle')}
                    </button>
                )}
            </>
        );
    };

    return (
        <div className="forum-team-share-card">
            <div className="forum-invite-card__head">
                <h5 className="forum-invite-card__title">
                    <SwordsIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    {t('forum.inviteTitle')}
                </h5>
                <span className="badge forum-invite-card__mode">{modeLabel}</span>
                <div className="forum-invite-card__action">{action()}</div>
            </div>
            <p className="forum-invite-card__hint">{t('forum.inviteHint')}</p>
        </div>
    );
}
