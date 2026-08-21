import React from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { CloseIcon, StarsIcon } from '../icons';
import { Sparkles, Check } from 'lucide-react';

export function BadgeUnlockModal() {
    const { t, language } = useTranslation();
    const newlyUnlockedBadge = useAuthStore((s) => s.newlyUnlockedBadge);
    const clearNewlyUnlockedBadge = useAuthStore((s) => s.clearNewlyUnlockedBadge);
    const selectedBadgeId = useAuthStore((s) => s.selectedBadgeId);
    const setSelectedBadgeId = useAuthStore((s) => s.setSelectedBadgeId);
    const showToast = useToastStore((s) => s.showToast);

    const isOpen = Boolean(newlyUnlockedBadge);
    const dialogRef = useModalA11y(isOpen ? clearNewlyUnlockedBadge : null);

    if (!isOpen || !newlyUnlockedBadge) return null;

    const BadgeIcon = newlyUnlockedBadge.Icon;
    const badgeName = language === 'pt' ? newlyUnlockedBadge.namePt : newlyUnlockedBadge.nameEn;
    const badgeDesc = language === 'pt' ? newlyUnlockedBadge.descPt : newlyUnlockedBadge.descEn;
    const badgeReq = language === 'pt' ? newlyUnlockedBadge.reqPt : newlyUnlockedBadge.reqEn;
    const isAlreadyEquipped = selectedBadgeId === newlyUnlockedBadge.id;

    const handleEquipNow = () => {
        setSelectedBadgeId(newlyUnlockedBadge.id);
        showToast(
            language === 'pt'
                ? `Insígnia ${badgeName} equipada com sucesso!`
                : `${badgeName} equipped successfully!`,
            'success'
        );
        clearNewlyUnlockedBadge();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="badge-unlock-title"
                tabIndex={-1}
                className="relative w-full max-w-md bg-surface border-2 border-primary/40 rounded-2xl shadow-2xl overflow-hidden animate-scale-in text-center p-6 outline-none"
                style={{
                    boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(var(--color-primary-rgb, 99, 102, 241), 0.25)',
                }}
            >
                {/* Close Button */}
                <button
                    onClick={clearNewlyUnlockedBadge}
                    aria-label={t('common.close') || 'Close'}
                    className="absolute top-3 right-3 text-muted hover:text-fg p-1.5 rounded-lg hover:bg-surface-raised transition-colors z-10"
                >
                    <CloseIcon className="w-5 h-5" />
                </button>

                {/* Subtle Radial Glow */}
                <div
                    className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none opacity-40 blur-3xl"
                    style={{ backgroundColor: newlyUnlockedBadge.accentColor || 'var(--color-primary)' }}
                />

                {/* Header Tag */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft text-primary border border-primary-border text-[11px] font-bold uppercase tracking-wider mb-4 animate-bounce">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{language === 'pt' ? 'Nova Conquista Desbloqueada!' : 'New Badge Unlocked!'}</span>
                </div>

                {/* Big Animated Badge Icon */}
                <div className="my-4 flex items-center justify-center relative">
                    <div className="w-28 h-28 relative flex items-center justify-center">
                        <div
                            className="absolute inset-0 rounded-full animate-ping opacity-20"
                            style={{ backgroundColor: newlyUnlockedBadge.accentColor || 'var(--color-primary)' }}
                        />
                        <div className="w-24 h-24 transition-transform duration-300 hover:scale-110 filter drop-shadow-lg">
                            <BadgeIcon className="w-full h-full object-contain" />
                        </div>
                    </div>
                </div>

                {/* Badge Title & Info */}
                <h3 id="badge-unlock-title" className="text-xl font-extrabold text-fg tracking-tight mb-1">
                    {badgeName}
                </h3>
                <p className="text-xs font-semibold text-primary mb-3">
                    {badgeReq}
                </p>
                <p className="text-xs text-muted leading-relaxed px-4 mb-6">
                    {badgeDesc}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button
                        type="button"
                        onClick={handleEquipNow}
                        className="btn btn-primary w-full sm:w-auto px-6 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
                    >
                        {isAlreadyEquipped ? (
                            <>
                                <Check className="w-4 h-4" />
                                <span>{language === 'pt' ? 'Equipada no Perfil' : 'Equipped on Profile'}</span>
                            </>
                        ) : (
                            <>
                                <StarsIcon className="w-4 h-4" />
                                <span>{language === 'pt' ? 'Equipar no Perfil' : 'Equip to Profile'}</span>
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={clearNewlyUnlockedBadge}
                        className="btn btn-secondary w-full sm:w-auto px-5 py-2.5 text-xs font-semibold"
                    >
                        {language === 'pt' ? 'Continuar' : 'Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BadgeUnlockModal;
