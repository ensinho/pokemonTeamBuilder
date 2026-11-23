import React, { useLayoutEffect, useRef } from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { CloseIcon, StarsIcon } from '../icons';
import { Check } from 'lucide-react';
import { MascotTip } from '../Mascot';
import { BADGE_CASE, badgeSpinFrames, seatFrames } from '../../utils/livingMoments';
import '../../styles/moments.css';

const prefersReduced = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/**
 * A badge the user just earned. A plain dialog (`.modal-scrim > .modal-panel`,
 * useModalA11y): it opens after the moment that earned it has been seen —
 * PokéPuzzle waits for the result card, the quizzes for their celebration to
 * close — so it does not need to shout over anything. No bouncing tag, no
 * pinging ring, no blurred glow: the one reward is the shiny sparkle, and only
 * from the user's own tap on Equip.
 *
 * Since 2026-11-22 (the living moments — Enzo: "pode crescer") the badge
 * arrives as the games' badge case does: it turns twice in the air coming
 * down into its socket, seats with a squash, the socket lights gold with one
 * ring going out, the spark burst opens behind it and one shine crosses it.
 * Once per badge, never looped; the shiny sparkle stays Equip's.
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

    const spinRef = useRef(null);
    const seatRef = useRef(null);
    const emblemRef = useRef(null);
    const socketRef = useRef(null);
    const ringRef = useRef(null);
    const shineRef = useRef(null);
    const bodyRef = useRef(null);
    const badgeId = newlyUnlockedBadge?.id;
    useLayoutEffect(() => {
        if (!badgeId || prefersReduced() || !spinRef.current) return undefined;
        const anims = [];
        const run = (el, keyframes, options) => el && anims.push(el.animate(keyframes, { fill: 'backwards', ...options }));
        const spin = badgeSpinFrames();
        run(spinRef.current, spin.keyframes, { duration: spin.duration, delay: BADGE_CASE.spin });
        const seat = seatFrames();
        run(seatRef.current, seat.keyframes, { duration: seat.duration, delay: BADGE_CASE.land, fill: 'none' });
        run(emblemRef.current, [{ transform: 'scale(0) rotate(-40deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
            pseudoElement: '::before', duration: 520, delay: BADGE_CASE.land, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        });
        run(socketRef.current, [{ opacity: 0, transform: 'scale(0.7)' }, { opacity: 1, transform: 'none' }], {
            duration: 360, delay: BADGE_CASE.light, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        });
        run(ringRef.current, [{ opacity: 0.9, transform: 'scale(0.9)' }, { opacity: 0, transform: 'scale(1.9)' }], {
            duration: 560, delay: BADGE_CASE.light, easing: 'ease-out', fill: 'forwards',
        });
        run(shineRef.current, [{ transform: 'translateX(-130%) skewX(-20deg)' }, { transform: 'translateX(230%) skewX(-20deg)' }], {
            duration: BADGE_CASE.shineRun, delay: BADGE_CASE.shine, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'both',
        });
        [...(bodyRef.current?.querySelectorAll('[data-bcm-rise]') || [])].forEach((el, i) => {
            run(el, [{ opacity: 0, transform: 'translateY(0.5rem)' }, { opacity: 1, transform: 'none' }], {
                duration: 380, delay: BADGE_CASE.words + i * 70, easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            });
        });
        return () => anims.forEach((a) => a.cancel());
    }, [badgeId]);

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

                <div className="modal-body flex flex-col items-center gap-2 text-center" ref={bodyRef}>
                    <div className="bcm" aria-hidden="true">
                        <span className="bcm__socket" ref={socketRef} />
                        <span className="bcm__ring" ref={ringRef} />
                        <div className="bcm__spin" ref={spinRef}>
                            <div className="bcm__seat" ref={seatRef}>
                                <div className="reward-emblem spark-host bcm__emblem" ref={emblemRef}>
                                    <BadgeIcon className="w-full h-full object-contain" />
                                </div>
                                <span className="bcm__gloss"><span className="bcm__shine" ref={shineRef} /></span>
                            </div>
                        </div>
                    </div>
                    <h2 id="badge-unlock-title" className="modal-title" data-bcm-rise>{badgeName}</h2>
                    <p className="m-0 text-sm font-semibold text-primary" data-bcm-rise>{badgeReq}</p>
                    <p id="badge-unlock-desc" className="modal-subtitle" data-bcm-rise>{badgeDesc}</p>
                    {/* A finished journey is the big moment: the mascot says what is next. */}
                    {newlyUnlockedBadge.category === 'journey' && (
                        <MascotTip pose="segurandoInsignia" mood="empolgado" play="jump" className="badge-unlock__tip">
                            {newlyUnlockedBadge.journeyId === 'league' ? t('journeys.allDoneSub') : t('journeys.unlockTip')}
                        </MascotTip>
                    )}
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
