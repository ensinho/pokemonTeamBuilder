import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';

import '../../styles/plantao-phase3.css';
import { typeColors } from '../../constants/types';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { useMascotStore } from '../../store/useMascotStore';
import { useRoundStore } from '../../store/useRoundStore';
import { toast } from '../../store/useToastStore';
import { derivePersona } from '../../utils/trainerProfile';
import {
    EGG_CYCLE_DAYS,
    deriveEggProgress,
    hatchEggCycle,
    readEggState,
    storeCostumeForEggHat,
    withEquippedEggHat,
    writeEggState,
} from '../../utils/mascotEgg';
import { Mascot } from '../Mascot';
import { PixelScene } from '../mascot/PixelScene';
import { ReceiptStamp } from '../mascot/Receipt';

const CRACK_PATHS = [
    { k: 0, top: true, d: 'M40 22l8 9-5 9 9 6' },
    { k: 1, top: true, d: 'M98 52l-9 7 6 8-8 9' },
    { k: 2, top: false, d: 'M28 112l10 4-2 10 9 4' },
    { k: 3, top: false, d: 'M74 124l7 10-6 8 8 9' },
    { k: 4, top: true, d: 'M8 86L21 95 34 84 47 95 60 84 73 95 86 84 99 95 112 84 124 86' },
];

/**
 * O Ovo Surpresa (Fase 3 "Fantasminha de Plantão" — `/games`).
 *
 * Non-punitive 5-day incubator driven by `fullDays` (`useRoundStore`, `4/4`
 * days). Missing days never resets progress. At 5 full days, tapping hatches
 * the egg to reveal `<Mascot mood="radiante" pose="comemorando" hat={...} />`
 * + a Gold `ReceiptStamp`, with 1-tap equipping on `useMascotStore`.
 */
export function MascotEggCard({ className = '' }) {
    const { t } = useTranslation();
    const fullDays = useRoundStore((s) => s.round?.fullDays || 0);
    const prefs = useMascotStore((s) => s.prefs);
    const trainerProfile = useAuthStore((s) => s.trainerProfile);

    const [eggState, setEggState] = useState(() => readEggState());
    // Strictly false on mount: reload never replays a celebration.
    const [justHatched, setJustHatched] = useState(false);
    const [hatchedHatSession, setHatchedHatSession] = useState(null);
    const [wobbling, setWobbling] = useState(false);

    useEffect(() => {
        const sync = () => {
            if (document.visibilityState === 'visible') setEggState(readEggState());
        };
        document.addEventListener('visibilitychange', sync);
        return () => document.removeEventListener('visibilitychange', sync);
    }, []);

    const mascotToneCss = useMemo(() => {
        if (prefs.tone === 'persona') {
            const pTone = derivePersona(trainerProfile)?.tone;
            return (pTone && typeColors[pTone]) || 'var(--mascot-brand)';
        }
        if (prefs.tone && typeColors[prefs.tone]) return typeColors[prefs.tone];
        return 'var(--mascot-brand)';
    }, [prefs.tone, trainerProfile]);

    const progress = useMemo(
        () => deriveEggProgress(fullDays, eggState),
        [fullDays, eggState]
    );

    const isHatched = progress.hatched || justHatched;
    const unlockedHat = hatchedHatSession || progress.rewardHat;
    const isEquipped = eggState.equippedHat === unlockedHat
        && prefs.costume === storeCostumeForEggHat(unlockedHat);

    const handleStageInteract = useCallback(() => {
        if (progress.readyToHatch) {
            const reward = progress.rewardHat;
            const next = writeEggState(hatchEggCycle(eggState, fullDays));
            setEggState(next);
            setHatchedHatSession(reward);
            setJustHatched(true);
            useMascotStore.getState().react('celebrate');
            return;
        }
        if (!isHatched) {
            setWobbling(true);
            window.setTimeout(() => setWobbling(false), 540);
        }
    }, [progress.readyToHatch, progress.rewardHat, eggState, fullDays, isHatched]);

    const handleEquip = useCallback(() => {
        if (!unlockedHat) return;
        const next = writeEggState(withEquippedEggHat(eggState, unlockedHat));
        setEggState(next);
        useMascotStore.getState().setPrefs({ costume: storeCostumeForEggHat(unlockedHat) });
        useMascotStore.getState().react('hop');
        toast.success(t('egg.equippedToast', { hat: t(`egg.hats.${unlockedHat}`) }));
    }, [eggState, unlockedHat, t]);

    const title = isHatched
        ? t('egg.titleHatched')
        : progress.readyToHatch
            ? t('egg.titleReady')
            : t('egg.title');

    const subtitle = isHatched
        ? t('egg.subHatched')
        : progress.readyToHatch
            ? t('egg.subReady')
            : t('egg.sub');

    const stepPillsFilled = isHatched ? EGG_CYCLE_DAYS : progress.stepDays;
    const unlockedTotal = progress.unlocked.length;

    const StageTag = isHatched ? 'div' : 'button';
    const stageProps = isHatched
        ? { className: 'mascot-egg-card__stage' }
        : {
            type: 'button',
            className: 'mascot-egg-card__stage is-interactive',
            onClick: handleStageInteract,
            'aria-label': progress.readyToHatch
                ? t('egg.hatchCta')
                : t('egg.stageAria', { n: stepPillsFilled }),
        };

    return (
        <section
            className={`mascot-egg-card ${progress.readyToHatch ? 'is-ready' : ''} ${isHatched ? 'is-hatched' : ''} ${className}`}
            style={{ '--egg-tone': mascotToneCss }}
            aria-label={t('egg.eyebrow')}
        >
            <StageTag {...stageProps}>
                <PixelScene kind={isHatched ? 'morning' : 'dusk'} seed={19} className="mascot-egg-card__scene" />
                <span className="mascot-egg-card__aura" aria-hidden="true" />

                <span className={`mascot-egg-card__egg ${wobbling ? 'is-wobbling' : ''}`} aria-hidden="true">
                    <svg viewBox="0 0 132 168" focusable="false">
                        <path
                            d="M66 164C33 164 6 140 6 104c0-6 .7-12 2-18L21 95 34 84 47 95 60 84 73 95 86 84 99 95 112 84 124 86c1.3 6 2 12 2 18 0 36-27 60-60 60Z"
                            fill="var(--receipt-paper)"
                        />
                        <circle cx="92" cy="118" r="15" fill="var(--egg-spot)" />
                        <circle cx="52" cy="138" r="9" fill="var(--egg-spot)" />
                        <g fill="none" stroke="var(--brand-ink)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            {CRACK_PATHS.filter((c) => !c.top).map((c) => (
                                <path
                                    key={c.k}
                                    d={c.d}
                                    className={`mascot-egg-card__crack ${!isHatched && c.k < progress.crackCountVisible ? 'is-on' : ''}`}
                                />
                            ))}
                        </g>
                        <g className="mascot-egg-card__shell-top">
                            <path
                                d="M66 4C38 4 15 42 8 86L21 95 34 84 47 95 60 84 73 95 86 84 99 95 112 84 124 86C117 42 94 4 66 4Z"
                                fill="var(--receipt-paper)"
                            />
                            <circle cx="44" cy="56" r="12" fill="var(--egg-spot)" />
                            <circle cx="86" cy="32" r="7" fill="var(--egg-spot)" />
                            <g fill="none" stroke="var(--brand-ink)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                {CRACK_PATHS.filter((c) => c.top).map((c) => (
                                    <path
                                        key={c.k}
                                        d={c.d}
                                        className={`mascot-egg-card__crack ${!isHatched && c.k < progress.crackCountVisible ? 'is-on' : ''}`}
                                    />
                                ))}
                            </g>
                        </g>
                    </svg>
                </span>

                {isHatched && (
                    <span className="mascot-egg-card__hatchling">
                        <Mascot
                            size="xl"
                            framing="body"
                            mood="radiante"
                            pose="comemorando"
                            hat={unlockedHat}
                            seasonal={false}
                            play={justHatched ? 'celebrate' : undefined}
                        />
                    </span>
                )}
            </StageTag>

            <div className="mascot-egg-card__body">
                <div className="mascot-egg-card__copy">
                    <div className="mascot-egg-card__head">
                        <p className="mascot-egg-card__eyebrow">{t('egg.eyebrow')}</p>
                        {unlockedTotal > 0 && (
                            <span className="mascot-egg-card__unlocked">
                                {unlockedTotal === 1
                                    ? t('egg.unlockedOne')
                                    : t('egg.unlockedCount', { n: unlockedTotal })}
                            </span>
                        )}
                    </div>
                    <h3 className="mascot-egg-card__title">{title}</h3>
                    <p className="mascot-egg-card__sub">{subtitle}</p>
                </div>

                <ol className="mascot-egg-card__steps" aria-label={t('egg.meterLabel', { n: stepPillsFilled })}>
                    {[1, 2, 3, 4, 5].map((step) => (
                        <li
                            key={step}
                            className={`mascot-egg-card__pill ${step <= stepPillsFilled ? 'is-filled' : ''}`}
                        >
                            {t('egg.dayPill', { n: step })}
                        </li>
                    ))}
                </ol>

                <div className="mascot-egg-card__footer">
                    <span className="mascot-egg-card__meter-text">
                        {t('egg.meterLabel', { n: stepPillsFilled })}
                    </span>

                    <div className="mascot-egg-card__actions">
                        {progress.readyToHatch && (
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={handleStageInteract}
                            >
                                <Sparkles aria-hidden="true" />
                                {t('egg.hatchCta')}
                            </button>
                        )}

                        {isHatched && (
                            <>
                                <div className="mascot-egg-card__stamp-wrap">
                                    <ReceiptStamp
                                        gold
                                        press={justHatched}
                                        mood="radiante"
                                        hat={unlockedHat}
                                        sub={t('egg.stampSub')}
                                        word={t(`egg.hats.${unlockedHat}`)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={isEquipped}
                                    onClick={handleEquip}
                                >
                                    {isEquipped ? t('egg.equipped') : t('egg.equipCta')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default MascotEggCard;
