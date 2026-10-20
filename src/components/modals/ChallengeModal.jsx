import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useToastStore } from '../../store/useToastStore';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useFirestoreTeams } from '../../hooks/useFirestoreTeams';
import { readLastBattleTeam } from '../../store/useBattlesStore';
import { teamCheck } from '../../utils/challengeTeams';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { AvatarSprite } from '../AvatarSprite';
import { FramedAvatar } from '../rewards/FramedAvatar';
import { PokeballIcon, SwordsIcon, DiceIcon, CloseIcon, ClipIcon } from '../icons';
import '../../styles/challenge-modal.css';

/**
 * Challenge a friend — one sheet, one decision per row: who, which mode, and
 * (for your own team) which team, with the one used last already chosen. The
 * team goes with the challenge, so the friend's accept starts the battle on
 * the spot: no "pick your team", no "start", no waiting on each other.
 */
export function ChallengeModal({
    isOpen,
    onClose,
    friend = null,
    friends = [],
    onStartChallenge,
    userId,
}) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const showToast = useToastStore((state) => state.showToast);
    const dialogRef = useModalA11y(isOpen ? onClose : null);
    const { savedTeams } = useFirestoreTeams();

    const [selectedFriendId, setSelectedFriendId] = useState('');
    const [selectedMode, setSelectedMode] = useState('normal'); // 'normal' | 'random'
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [isSending, setIsSending] = useState(false);

    const teams = useMemo(() => savedTeams.map((team) => {
        const members = (team.pokemons || []).filter(Boolean);
        return { team, members, ready: members.length > 0 && teamCheck(members).errors.length === 0 };
    }), [savedTeams]);

    useEffect(() => {
        if (!isOpen) return;
        if (friend) setSelectedFriendId(friend.userId);
        else if (friends.length > 0) setSelectedFriendId(friends[0].userId);
        else setSelectedFriendId('');
    }, [friend, friends, isOpen]);

    // The team used last, else the first that can battle. Without one, the
    // random mode is the way to battle right now.
    useEffect(() => {
        if (!isOpen) return;
        const last = readLastBattleTeam();
        const pick = teams.find((row) => row.team.id === last && row.ready) || teams.find((row) => row.ready) || null;
        setSelectedTeamId(pick?.team.id || null);
        if (!pick) setSelectedMode('random');
    }, [isOpen, teams]);

    const activeFriend = useMemo(() => {
        if (friend) return friend;
        return friends.find((f) => f.userId === selectedFriendId) || null;
    }, [friend, friends, selectedFriendId]);

    const selectedTeam = teams.find((row) => row.team.id === selectedTeamId) || null;
    const needsTeam = selectedMode === 'normal';
    const canSend = Boolean(activeFriend) && (!needsTeam || selectedTeam?.ready) && !isSending;

    const inviteLink = useMemo(() => {
        if (!userId || typeof window === 'undefined') return '';
        return `${window.location.origin}${import.meta.env.BASE_URL}friends?tab=find&add=${userId}`.replace(/([^:]\/)\/+/g, '$1');
    }, [userId]);

    const copyInviteLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            showToast(t('friends.inviteCopied'), 'success');
        } catch (err) {
            console.error('Copy invite failed:', err);
            showToast(t('friends.inviteCopyFailed'), 'error');
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSend) return;
        setIsSending(true);
        try {
            await onStartChallenge(activeFriend, {
                mode: selectedMode === 'random' ? 'random' : 'standard',
                team: needsTeam && selectedTeam
                    ? { id: selectedTeam.team.id, name: selectedTeam.team.name, members: selectedTeam.members }
                    : null,
            });
            onClose();
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="modal-scrim">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="challenge-modal-title"
                tabIndex={-1}
                className="modal-panel modal-panel--sm"
            >
                <div className="modal-header">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <SwordsIcon className="w-5 h-5 text-primary" />
                        <h3 id="challenge-modal-title" className="modal-title">{t('battle.challengeTrainer')}</h3>
                    </div>
                    <button type="button" onClick={onClose} aria-label={t('common.close')} className="modal-close">
                        <CloseIcon className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="modal-body space-y-4">
                    {friend ? (
                        <div className="flex items-center gap-3 p-3 bg-surface-raised rounded-xl">
                            <FramedAvatar uid={friend.userId} stampedFrameId={friend.frameId} className="inline-flex w-10 h-10 shrink-0 items-center justify-center rounded-full">
                                <AvatarSprite
                                    trainerSprite={friend.trainerSprite}
                                    pokemonId={friend.avatarPokemonId}
                                    isShiny={friend.avatarIsShiny}
                                    className="w-10 h-10 object-contain"
                                    fallback={<PokeballIcon className="w-5 h-5 text-muted opacity-40" />}
                                />
                            </FramedAvatar>
                            <div className="min-w-0 flex-1">
                                <span className="text-2xs text-muted font-bold block">{t('battle.stage.opponent')}</span>
                                <h4 className="text-sm font-bold text-fg truncate">{friend.displayName || t('friends.unknownTrainer')}</h4>
                            </div>
                        </div>
                    ) : (
                        <div className="field">
                            <label className="field-label" htmlFor="challenge-friend">{t('battle.selectFriendPrompt')}</label>
                            {friends.length === 0 ? (
                                <p className="text-xs text-muted bg-surface-raised p-3 rounded-xl">{t('battle.stage.noFriends')}</p>
                            ) : (
                                <select
                                    id="challenge-friend"
                                    className="select-clean"
                                    value={selectedFriendId}
                                    onChange={(e) => setSelectedFriendId(e.target.value)}
                                >
                                    {friends.map((f) => (
                                        <option key={f.userId} value={f.userId}>{f.displayName || t('friends.unknownTrainer')}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    <div className="field">
                        <span className="field-label">{t('battle.chooseFormatTitle')}</span>
                        <div className="segmented segmented--block" role="group" aria-label={t('battle.chooseFormatTitle')}>
                            <button type="button" className="segmented__item" aria-pressed={selectedMode === 'normal'} onClick={() => setSelectedMode('normal')}>
                                <SwordsIcon className="w-4 h-4" aria-hidden="true" />
                                {t('battle.normalMode')}
                            </button>
                            <button type="button" className="segmented__item" aria-pressed={selectedMode === 'random'} onClick={() => setSelectedMode('random')}>
                                <DiceIcon className="w-4 h-4" aria-hidden="true" />
                                {t('battle.randomMode')}
                            </button>
                        </div>
                        <p className="text-xs text-muted">
                            {selectedMode === 'random' ? t('battle.randomModeDesc') : t('battle.stage.teamGoesWith')}
                        </p>
                    </div>

                    {needsTeam && (
                        <div className="field">
                            <span className="field-label">{t('battle.stage.yourTeam')}</span>
                            {teams.length === 0 ? (
                                <div className="flex items-center justify-between gap-3 p-3 bg-surface-raised rounded-xl">
                                    <p className="text-xs text-muted m-0">{t('battle.lobby.noTeams')}</p>
                                    <button type="button" className="btn btn-outline btn-sm" onClick={() => { onClose(); navigate('/builder'); }}>
                                        {t('battle.lobby.buildTeam')}
                                    </button>
                                </div>
                            ) : (
                                <ul className="challenge-teams custom-scrollbar">
                                    {teams.map(({ team, members, ready }) => (
                                        <li key={team.id}>
                                            <button
                                                type="button"
                                                className="challenge-teams__row"
                                                aria-pressed={team.id === selectedTeamId}
                                                disabled={!ready}
                                                onClick={() => setSelectedTeamId(team.id)}
                                            >
                                                <span className="challenge-teams__name">{team.name || t('challenge.picker.untitled')}</span>
                                                {!ready && <span className="challenge-teams__warn">{t('battle.stage.teamNotReady')}</span>}
                                                <span className="challenge-teams__sprites" aria-hidden="true">
                                                    {members.slice(0, 6).map((mon, index) => (
                                                        // A saved team keeps its order.
                                                        <img key={`${mon.id}-${index}`} src={getTeamPokemonDisplaySprite(mon)} alt="" width={28} height={28} loading="lazy" decoding="async" />
                                                    ))}
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    <button type="button" onClick={copyInviteLink} className="btn btn-ghost btn-sm btn-block">
                        <ClipIcon className="w-4 h-4 shrink-0" />
                        <span>{t('battle.copyBattleInvite')}</span>
                    </button>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn btn-ghost">{t('common.cancel')}</button>
                        <button type="submit" disabled={!canSend} className="btn btn-primary">
                            {isSending ? t('battle.stage.sending') : t('battle.stage.sendChallenge')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
