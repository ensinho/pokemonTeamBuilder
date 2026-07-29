import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useToastStore } from '../../store/useToastStore';
import { useModalA11y } from '../../hooks/useModalA11y';
import { AvatarSprite } from '../AvatarSprite';
import { PokeballIcon, SwordsIcon, DiceIcon, CloseIcon, ClipIcon } from '../icons';

export function ChallengeModal({
    isOpen,
    onClose,
    friend = null,
    friends = [],
    onStartChallenge,
    userId,
}) {
    const { t, language } = useTranslation();
    const showToast = useToastStore((state) => state.showToast);
    const dialogRef = useModalA11y(isOpen ? onClose : null);

    const [selectedFriendId, setSelectedFriendId] = useState('');
    const [selectedMode, setSelectedMode] = useState('normal'); // 'normal' | 'random'

    useEffect(() => {
        if (friend) {
            setSelectedFriendId(friend.userId);
        } else if (friends.length > 0) {
            setSelectedFriendId(friends[0].userId);
        } else {
            setSelectedFriendId('');
        }
    }, [friend, friends, isOpen]);

    const activeFriend = useMemo(() => {
        if (friend) return friend;
        return friends.find((f) => f.userId === selectedFriendId) || null;
    }, [friend, friends, selectedFriendId]);

    const inviteLink = useMemo(() => {
        if (!userId || typeof window === 'undefined') return '';
        return `${window.location.origin}${window.location.pathname}#/friends?tab=find&add=${userId}`;
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
        if (!activeFriend) return;
        await onStartChallenge(activeFriend, { mode: selectedMode });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="challenge-modal-title"
                tabIndex={-1}
                className="relative w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in outline-none flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                        <SwordsIcon className="w-5 h-5 text-primary" />
                        <h3 id="challenge-modal-title" className="text-base font-bold text-fg">
                            {t('battle.challengeTrainer')}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="text-muted hover:text-fg p-1 rounded-lg hover:bg-surface-raised transition-colors"
                    >
                        <CloseIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Opponent Display / Picker */}
                    {friend ? (
                        <div className="flex items-center gap-3 p-3 bg-surface-raised border border-border rounded-xl">
                            <AvatarSprite
                                trainerSprite={friend.trainerSprite}
                                pokemonId={friend.avatarPokemonId}
                                isShiny={friend.avatarIsShiny}
                                className="w-10 h-10 object-contain"
                                fallback={<PokeballIcon className="w-5 h-5 text-muted opacity-40" />}
                            />
                            <div className="min-w-0 flex-1">
                                <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                                    {language === 'pt' ? 'Oponente' : 'Opponent'}
                                </span>
                                <h4 className="text-sm font-bold text-fg truncate">
                                    {friend.displayName || t('friends.unknownTrainer')}
                                </h4>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                                {t('battle.selectFriendPrompt')}
                            </label>
                            {friends.length === 0 ? (
                                <p className="text-xs text-muted italic bg-surface-raised p-3 rounded-xl border border-border">
                                    {language === 'pt'
                                        ? 'Você ainda não tem amigos. Use o link de convite abaixo!'
                                        : 'No friends added yet. Use the invite link below!'}
                                </p>
                            ) : (
                                <select
                                    className="input-clean font-semibold w-full text-xs"
                                    value={selectedFriendId}
                                    onChange={(e) => setSelectedFriendId(e.target.value)}
                                >
                                    {friends.map((f) => (
                                        <option key={f.userId} value={f.userId}>
                                            {f.displayName || t('friends.unknownTrainer')}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Battle Mode Cards (Minimalist) */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                            {t('battle.chooseFormatTitle')}
                        </label>

                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setSelectedMode('normal')}
                                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                    selectedMode === 'normal'
                                        ? 'border-primary bg-primary/10 ring-1 ring-primary/40 shadow-sm'
                                        : 'border-border bg-surface-raised hover:border-primary'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <SwordsIcon className={`w-4 h-4 ${selectedMode === 'normal' ? 'text-primary' : 'text-muted'}`} />
                                    {selectedMode === 'normal' && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    )}
                                </div>
                                <span className="text-xs font-bold text-fg block">
                                    {t('battle.normalMode')}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedMode('random')}
                                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                    selectedMode === 'random'
                                        ? 'border-primary bg-primary/10 ring-1 ring-primary/40 shadow-sm'
                                        : 'border-border bg-surface-raised hover:border-primary'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <DiceIcon className={`w-4 h-4 ${selectedMode === 'random' ? 'text-primary' : 'text-muted'}`} />
                                    {selectedMode === 'random' && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    )}
                                </div>
                                <span className="text-xs font-bold text-fg block">
                                    {t('battle.randomMode')}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Full-width Invite Link Button */}
                    <div className="pt-1">
                        <button
                            type="button"
                            onClick={copyInviteLink}
                            className="w-full btn btn-secondary py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-2 border border-border hover:border-primary/50 transition-colors rounded-xl"
                        >
                            <ClipIcon className="w-4 h-4 text-primary shrink-0" />
                            <span>{t('battle.copyBattleInvite')}</span>
                        </button>
                    </div>

                    {/* Footer Actions (50/50 split) */}
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full btn btn-ghost font-semibold text-xs py-2.5 rounded-xl border border-border flex items-center justify-center"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!activeFriend}
                            className="w-full btn btn-primary font-semibold text-xs py-2.5 rounded-xl shadow-md flex items-center justify-center"
                        >
                            {t('friends.battle')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
