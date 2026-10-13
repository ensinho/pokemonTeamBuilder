import React from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { CloseIcon, StarsIcon } from '../icons';
import { Check } from 'lucide-react';

/**
 * A badge the user just earned. A plain dialog (`.modal-scrim > .modal-panel`,
 * useModalA11y): it opens after the moment that earned it has been seen —
 * PokéPuzzle waits for the result card, the quizzes for their celebration to
 * close — so it does not need to shout over anything. No bouncing tag, no
 * pinging ring, no blurred glow: the one reward is the shiny sparkle, and only
 * from the user's own tap on Equip.
 */
export function BadgeUnlockModal() {
    const { t, language } = useTranslation();
    const newlyUnlockedBadge = useAuthStore((s) => s.newlyUnlockedBadge);
    const clearNewlyUnlockedBadge = useAuthStore((s) => s.clearNewlyUnlockedBadge);
    const selectedBadgeId = useAuthStore((s) => s.selectedBadgeId);
    const setSelectedBadgeId = useAuthStore((s) => s.setSelectedBadgeId);
    const showToast = useToastStore((s) => s.showToast);
    const shiny = useShinyBurst();

    const isOpen = Boolean(newlyUnlockedBadge);
    const dialogRef = useModalA11y(isOpen ? clearNewlyUnlockedBadge : null);

    if (!isOpen || !newlyUnlockedBadge) return null;

    const BadgeIcon = newlyUnlockedBadge.Icon;
    const badgeName = language === 'pt' ? newlyUnlockedBadge.namePt : newlyUnlockedBadge.nameEn;
    const badgeDesc = language === 'pt' ? newlyUnlockedBadge.descPt : newlyUnlockedBadge.descEn;
    const badgeReq = language === 'pt' ? newlyUnlockedBadge.reqPt : newlyUnlockedBadge.reqEn;
    const isAlreadyEquipped = selectedBadgeId === newlyUnlockedBadge.id;

    const handleEquipNow = () => {
        shiny.fire();
        setSelectedBadgeId(newlyUnlockedBadge.id);
        showToast(t('games.badgeEquippedToast', { name: badgeName }), 'success');
        // Let the sparkle play before the dialog leaves.
        window.setTimeout(clearNewlyUnlockedBadge, 450);
    };

    return (
        <div className="modal-scrim z-[100]" onClick={clearNewlyUnlockedBadge} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="badge-unlock-title"
                aria-describedby="badge-unlock-desc"
                tabIndex={-1}
                className="modal-panel modal-panel--sm"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="modal-header">
                    <p className="flex-1 m-0 text-sm font-semibold text-muted">{t('games.badgeUnlocked')}</p>
                    <button type="button" onClick={clearNewlyUnlockedBadge} aria-label={t('common.close')} className="modal-close">
                        <CloseIcon />
                    </button>
                </div>

                <div className="modal-body flex flex-col items-center gap-2 text-center">
                    <div className="w-20 h-20" aria-hidden="true">
                        <BadgeIcon className="w-full h-full object-contain" />
                    </div>
                    <h2 id="badge-unlock-title" className="modal-title">{badgeName}</h2>
                    <p className="m-0 text-sm font-semibold text-primary">{badgeReq}</p>
                    <p id="badge-unlock-desc" className="modal-subtitle">{badgeDesc}</p>
                </div>

                <div className="modal-footer">
                    <button type="button" onClick={clearNewlyUnlockedBadge} className="btn btn-ghost">
                        {t('games.continue')}
                    </button>
                    <button
                        type="button"
                        onClick={handleEquipNow}
                        disabled={isAlreadyEquipped}
                        className={`btn btn-primary relative ${shiny.isBursting ? 'is-bursting' : ''}`}
                    >
                        {isAlreadyEquipped ? <Check aria-hidden="true" /> : <StarsIcon />}
                        {isAlreadyEquipped ? t('games.badgeEquipped') : t('games.equipBadge')}
                        {shiny.burst}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BadgeUnlockModal;
