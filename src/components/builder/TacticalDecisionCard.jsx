import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import { typeColors } from '../../constants/types';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { toast } from '../../store/useToastStore';
import { isBeginnerTrainer } from '../../utils/trainerProfile';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { Mascot } from '../Mascot';
import { RollingNumber } from '../RollingNumber';
import { Sprite } from '../Sprite';
import { TypeChip } from '../TypeChip';
import { COACH_DISMISS_EVENT, isCoachDismissed } from './coachState';

const APPLIED_HOLD_MS = 2600;

/**
 * AffectUI-inspired Mascot Tactical Decision Card for the Team Builder (Peça 01).
 *
 * Surfaces the #1 actionable defensive vulnerability or coverage gap while the
 * party has >= 2 Pokémon and >= 1 open slot, previews the exact `rateTeam`
 * synergy jump (`scoreBefore → scoreAfter`) via `<RollingNumber>`, and lets the
 * trainer apply the suggested filler in 1 click (with slot `.is-peeling` and a
 * reversible undo toast) or cycle through the top 3 distinct candidates.
 */
export function TacticalDecisionCard({
    decision,
    currentTeam = [],
    onAppliedVisibilityChange,
    className = '',
}) {
    const { t } = useTranslation();
    const isBeginner = useAuthStore((s) => isBeginnerTrainer(s.trainerProfile));
    const [coachGone, setCoachGone] = useState(isCoachDismissed);
    const [optionIdx, setOptionIdx] = useState(0);
    const [applied, setApplied] = useState(null);
    const [applyPlayKey, setApplyPlayKey] = useState(0);
    const applyTimerRef = useRef(null);

    useEffect(() => {
        const onGone = () => setCoachGone(true);
        window.addEventListener(COACH_DISMISS_EVENT, onGone);
        return () => window.removeEventListener(COACH_DISMISS_EVENT, onGone);
    }, []);

    useEffect(() => () => {
        if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    }, []);

    // Reset candidate cycle index when the primary threat or top candidate shifts.
    const decisionIdentity = decision
        ? `${decision.threatType}:${decision.openSlotNumber}:${decision.candidates.map((c) => c.id).join(',')}`
        : '';
    useEffect(() => {
        setOptionIdx(0);
    }, [decisionIdentity]);

    // If the trainer clicks Undo on the toast (or removes the added Pokémon),
    // immediately exit the post-apply confirmation beat so the suggestion returns.
    const addedStillPresent = useMemo(() => {
        if (!applied?.instanceId) return false;
        return currentTeam.some((member) => member?.instanceId === applied.instanceId);
    }, [applied, currentTeam]);

    useEffect(() => {
        if (applied && !addedStillPresent) {
            if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
            setApplied(null);
        }
    }, [applied, addedStillPresent]);

    const activeApplied = applied && addedStillPresent ? applied : null;
    const isVisible = Boolean((activeApplied || decision) && !(isBeginner && !coachGone));

    useEffect(() => {
        onAppliedVisibilityChange?.(isVisible);
    }, [isVisible, onAppliedVisibilityChange]);

    useEffect(() => () => {
        onAppliedVisibilityChange?.(false);
    }, [onAppliedVisibilityChange]);

    if (!isVisible) return null;

    const candidates = decision?.candidates || [];
    const safeIdx = candidates.length > 0 ? optionIdx % candidates.length : 0;
    const candidate = activeApplied ? activeApplied.candidate : candidates[safeIdx];
    if (!candidate) return null;

    const threatType = activeApplied ? activeApplied.threatType : decision.threatType;
    const threatLabel = t(`types.${threatType}`, { defaultValue: threatType });
    const slotNumber = activeApplied ? activeApplied.slotNumber : decision.openSlotNumber;
    const scoreBefore = activeApplied ? activeApplied.scoreBefore : decision.scoreBefore;
    const scoreAfter = activeApplied ? activeApplied.scoreAfter : candidate.scoreAfter;
    const isCritical = !activeApplied && Boolean(decision?.isCritical);
    const kind = activeApplied ? 'applied' : decision.kind;

    const mascotMood = activeApplied
        ? (activeApplied.wasCritical ? 'aliviado' : 'confiante')
        : 'pensando';
    const mascotPose = activeApplied ? 'parado' : 'analisando';

    let badgeClass = 'badge badge--primary';
    let badgeText = t('builder.decision.gapBadge');
    if (activeApplied) {
        badgeClass = 'badge badge--success';
        badgeText = t('builder.decision.appliedBadge', { slot: slotNumber });
    } else if (isCritical) {
        // Brand rule: Live Pink `.badge--live` strictly for critical >=2x shared weakness with 0 resists.
        badgeClass = 'badge badge--live';
        badgeText = decision.quadWeakCount > 0
            ? t('builder.decision.criticalQuadBadge', { type: threatLabel })
            : t('builder.decision.criticalSharedBadge', { count: decision.weakCount });
    } else if (kind === 'shared_weakness') {
        badgeClass = 'badge badge--warning';
        badgeText = t('builder.decision.warningBadge', { type: threatLabel });
    }

    let titleText = t('builder.decision.gapTitle', { type: threatLabel });
    if (activeApplied) {
        titleText = t('builder.decision.appliedTitle', { name: candidate.name, slot: slotNumber });
    } else if (isCritical) {
        titleText = t('builder.decision.criticalTitle', { count: decision.weakCount, type: threatLabel });
    } else if (kind === 'shared_weakness') {
        titleText = t('builder.decision.warningTitle', { type: threatLabel, slot: slotNumber });
    }

    let reasonText = t('builder.decision.reasonResist', {
        name: candidate.name,
        type: threatLabel,
        slot: slotNumber,
    });
    if (activeApplied) {
        reasonText = t('builder.decision.reasonApplied', {
            type: threatLabel,
            before: scoreBefore,
            after: scoreAfter,
        });
    } else if (candidate.threatMultiplier === 0) {
        reasonText = t('builder.decision.reasonImmune', {
            name: candidate.name,
            type: threatLabel,
            slot: slotNumber,
        });
    } else if (candidate.threatMultiplier <= 0.25) {
        reasonText = t('builder.decision.reasonQuadResist', {
            name: candidate.name,
            type: threatLabel,
            slot: slotNumber,
        });
    }

    const multTag = candidate.threatMultiplier === 0
        ? t('builder.decision.immuneTag')
        : candidate.threatMultiplier <= 0.25
            ? t('builder.decision.quadResistTag')
            : t('builder.decision.resistTag');

    const primaryType = candidate.types?.[0] || 'normal';
    const platformStyle = { '--card-type': typeColors[primaryType] || 'var(--color-primary)' };

    const handleApply = () => {
        if (activeApplied || !decision) return;
        const store = useActiveTeamStore.getState();
        const prevIds = new Set(store.currentTeam.map((m) => m.instanceId));
        store.handleAddPokemon(candidate.pokemon);

        const nextTeam = useActiveTeamStore.getState().currentTeam;
        const addedMember = nextTeam.find((m) => !prevIds.has(m.instanceId));
        if (!addedMember) return;

        const addedInstanceId = addedMember.instanceId;
        const snapshot = {
            instanceId: addedInstanceId,
            candidate,
            threatType: decision.threatType,
            slotNumber: decision.openSlotNumber,
            scoreBefore: decision.scoreBefore,
            scoreAfter: candidate.scoreAfter,
            wasCritical: decision.isCritical,
        };

        if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
        setApplied(snapshot);
        setApplyPlayKey((n) => n + 1);
        applyTimerRef.current = setTimeout(() => {
            setApplied(null);
            applyTimerRef.current = null;
        }, APPLIED_HOLD_MS);

        toast.info(t('builder.decision.appliedToast', {
            name: candidate.name,
            slot: snapshot.slotNumber,
        }), {
            key: 'tactical-decision-applied',
            description: t('builder.decision.appliedToastDesc', {
                type: threatLabel,
                before: snapshot.scoreBefore,
                after: snapshot.scoreAfter,
            }),
            spriteUrl: getPokemonFrontSpriteUrl(candidate.id),
            actions: [{
                label: t('toast.undo'),
                onClick: () => {
                    const latest = useActiveTeamStore.getState();
                    if (!latest.currentTeam.some((m) => m.instanceId === addedInstanceId)) return;
                    if (latest.editingTeamMember?.instanceId === addedInstanceId) {
                        latest.setEditingTeamMember(null);
                    }
                    latest.setCurrentTeam(latest.currentTeam.filter((m) => m.instanceId !== addedInstanceId));
                },
            }],
        });
    };

    const handleCycle = () => {
        if (candidates.length <= 1) return;
        setOptionIdx((idx) => (idx + 1) % candidates.length);
    };

    return (
        <article
            className={`tb-decision ${activeApplied ? 'is-applied' : ''} ${className}`.trim()}
            data-decision-kind={kind}
            role="region"
            aria-label={t('builder.decision.regionAria')}
        >
            <div className="tb-decision__head">
                <Mascot
                    mood={mascotMood}
                    pose={mascotPose}
                    size="sm"
                    seasonal={false}
                    play={activeApplied ? 'hop' : undefined}
                    playKey={applyPlayKey}
                    className="tb-decision__mascot"
                />
                <div className="tb-decision__lead">
                    <div className="tb-decision__meta">
                        <span className={badgeClass}>{badgeText}</span>
                        <span
                            className="tb-decision__synergy"
                            aria-label={activeApplied
                                ? t('builder.decision.synergyAppliedAria', { after: scoreAfter })
                                : t('builder.decision.synergyPreviewAria', { before: scoreBefore, after: scoreAfter })}
                        >
                            <span className="tb-decision__synergy-label" aria-hidden="true">
                                {t('builder.decision.synergyLabel')}
                            </span>
                            <span className="tb-decision__synergy-nums figure" aria-hidden="true">
                                <RollingNumber value={activeApplied ? scoreAfter : scoreBefore} />
                                {!activeApplied && (
                                    <>
                                        <span className="tb-decision__arrow">→</span>
                                        <span className="tb-decision__after">
                                            <RollingNumber value={scoreAfter} />
                                        </span>
                                    </>
                                )}
                            </span>
                        </span>
                    </div>
                    <p className="tb-decision__title">{titleText}</p>
                </div>
            </div>

            <p className="tb-decision__reason">{reasonText}</p>

            <div className="tb-decision__candidate">
                <div className="tb-decision__stage type-platform" style={platformStyle}>
                    <Sprite
                        src={getPokemonFrontSpriteUrl(candidate.id)}
                        artworkSrc={getPokemonArtworkSpriteUrl(candidate.id)}
                        alt={candidate.name}
                        className="tb-decision__sprite"
                    />
                </div>
                <div className="tb-decision__candidate-info">
                    <div className="tb-decision__candidate-top">
                        <span className="tb-decision__name">{candidate.name}</span>
                        <span className="tb-decision__mult figure">{multTag}</span>
                    </div>
                    <div className="tb-decision__types">
                        {(candidate.types || []).map((type) => (
                            <TypeChip key={type} type={type} size="sm" />
                        ))}
                    </div>
                </div>
            </div>

            {!activeApplied && (
                <div className="tb-decision__actions">
                    <button
                        type="button"
                        onClick={handleApply}
                        className="btn btn-secondary btn-sm tb-decision__apply touch-target"
                        aria-label={t('builder.decision.applyAria', { name: candidate.name, slot: slotNumber })}
                    >
                        <Plus aria-hidden="true" />
                        <span className="btn__label">{t('builder.decision.apply')}</span>
                    </button>
                    {candidates.length > 1 && (
                        <button
                            type="button"
                            onClick={handleCycle}
                            className="btn btn-ghost btn-sm tb-decision__cycle touch-target"
                            aria-label={t('builder.decision.cycleAria', {
                                current: safeIdx + 1,
                                total: candidates.length,
                            })}
                        >
                            <RefreshCw aria-hidden="true" />
                            <span className="btn__label">{t('builder.decision.cycle')}</span>
                            <span className="tb-decision__option-count figure" aria-hidden="true">
                                {t('builder.decision.optionIndex', {
                                    current: safeIdx + 1,
                                    total: candidates.length,
                                })}
                            </span>
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}

export default TacticalDecisionCard;
