import React, { useEffect, useMemo, useState } from 'react';
import { Check, Lock, Quote } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { COSMETICS, COSMETIC_KINDS } from '../../constants/cosmetics';
import { THEME_META } from '../../constants/theme';
import { getBadgeById } from '../../constants/badges';
import { useRewardsStore, unseenRewards } from '../../store/useRewardsStore';
import { useAuthStore, resolveAvatar } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { chooseTheme } from '../../store/themeChoice';
import { originFromEvent } from '../../utils/themeTransition';
import { useTranslation } from '../../hooks/useTranslation';
import { frameProps, levelTrack, unlockLabel } from '../../utils/rewards';
import { AvatarSprite } from '../AvatarSprite';
import { PokeballIcon } from '../icons';
import { CheckinCard } from './CheckinCard';
import '../../styles/rewards.css';

const THEME_SWATCH = Object.fromEntries(THEME_META.map((meta) => [meta.id, meta.swatch]));

/** How an item is unlocked, in words — a badge's own name when a badge unlocks it. */
function useUnlockText() {
    const { t, language } = useTranslation();
    return (item) => {
        const { key, params } = unlockLabel(item);
        if (params.badgeId) {
            const badge = getBadgeById(params.badgeId);
            return t(key, { badge: badge ? (language === 'pt' ? badge.namePt : badge.nameEn) : params.badgeId });
        }
        return t(key, params);
    };
}

/** The little picture of an item: the trainer's own avatar in the frame, the title's words, the theme's colour. */
function RewardPreview({ item, avatar }) {
    if (item.kind === 'frame') {
        const { style, ...rest } = frameProps(item.id);
        return (
            <span className="reward-preview reward-preview--frame" style={style} {...rest} aria-hidden="true">
                <AvatarSprite {...avatar} className="reward-preview__sprite" fallback={<PokeballIcon className="reward-preview__fallback" />} />
            </span>
        );
    }
    if (item.kind === 'theme') {
        return <span className="reward-preview reward-preview--theme" style={{ '--reward-swatch': THEME_SWATCH[item.themeId] }} aria-hidden="true" />;
    }
    return (
        <span className="reward-preview reward-preview--title" aria-hidden="true">
            <Quote />
        </span>
    );
}

/**
 * The Rewards tab of /journeys (2026-10-17, docs/modules/rewards.md): the
 * check-in and level card, the level track, and the collection — every frame,
 * title and theme, locked ones in plain sight with how to get them, unlocked
 * ones one tap from equipped. Reads only the recorded stores.
 */
export function RewardsPanel() {
    const { t } = useTranslation();
    const unlockText = useUnlockText();
    const { level, unlocked, equipped, equip, markSeen } = useRewardsStore(useShallow((s) => ({
        level: s.level, unlocked: s.unlocked, equipped: s.equipped, equip: s.equip, markSeen: s.markSeen,
    })));
    const avatar = useAuthStore(useShallow((s) => resolveAvatar(s)));
    const theme = useThemeStore((s) => s.theme);
    const [kind, setKind] = useState('frame');

    // What was new when the tab opened keeps its "New" tag while the trainer
    // is here; the record learns at once that they have seen it.
    const [freshIds] = useState(() => new Set(unseenRewards(useRewardsStore.getState())));
    useEffect(() => {
        if (freshIds.size) markSeen([...freshIds]);
    }, [freshIds, markSeen]);

    const track = useMemo(() => levelTrack(), []);
    const items = COSMETICS.filter((item) => item.kind === kind);
    const counts = useMemo(() => Object.fromEntries(COSMETIC_KINDS.map((k) => {
        const ofKind = COSMETICS.filter((item) => item.kind === k);
        return [k, { have: ofKind.filter((item) => unlocked[item.id]).length, total: ofKind.length }];
    })), [unlocked]);
    const currentStep = track.find((step) => step.level > level)?.level ?? null;

    const handleItem = (item, event) => {
        if (!unlocked[item.id]) return;
        if (item.kind === 'theme') chooseTheme(item.themeId, originFromEvent(event));
        else equip(item.kind, equipped[item.kind] === item.id ? null : item.id);
    };

    return (
        <div className="rewards-panel">
            <p className="rewards-panel__lead">{t('rewards.lead')}</p>

            <CheckinCard variant="full" />

            <section className="section">
                <div className="section-head">
                    <h2 className="section-title">{t('rewards.collection.title')}</h2>
                </div>
                <div className="segmented segmented--block rewards-panel__kinds" role="group" aria-label={t('rewards.collection.kindsLabel')}>
                    {COSMETIC_KINDS.map((k) => (
                        <button key={k} type="button" className="segmented__item" aria-pressed={kind === k} onClick={() => setKind(k)}>
                            {t(`rewards.collection.kinds.${k}`)}
                            <span className="count-badge">{counts[k].have}/{counts[k].total}</span>
                        </button>
                    ))}
                </div>
                <ul className="reward-grid">
                    {items.map((item) => {
                        const isUnlocked = Boolean(unlocked[item.id]);
                        const isOn = item.kind === 'theme' ? theme === item.themeId : equipped[item.kind] === item.id;
                        const actionLabel = !isUnlocked ? t('rewards.collection.locked')
                            : item.kind === 'theme' ? (isOn ? t('rewards.collection.applied') : t('rewards.collection.apply'))
                                : (isOn ? t('rewards.collection.equipped') : t('rewards.collection.equip'));
                        return (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    className={`card card--compact card--interactive reward-card ${isOn ? 'card--selected' : ''} ${isUnlocked ? '' : 'is-locked'}`}
                                    onClick={(event) => handleItem(item, event)}
                                    aria-pressed={isUnlocked ? isOn : undefined}
                                    aria-disabled={!isUnlocked || undefined}
                                >
                                    <RewardPreview item={item} avatar={avatar} />
                                    <span className="reward-card__text">
                                        <span className="reward-card__name">
                                            {t(`rewards.items.${item.id}.name`)}
                                            {freshIds.has(item.id) && <span className="badge badge--primary">{t('rewards.collection.new')}</span>}
                                        </span>
                                        <span className="reward-card__how">{unlockText(item)}</span>
                                    </span>
                                    <span className={`reward-card__state ${isOn ? 'is-on' : ''}`}>
                                        {!isUnlocked ? <Lock aria-hidden="true" /> : isOn ? <Check aria-hidden="true" /> : null}
                                        {actionLabel}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <section className="section">
                <div className="section-head">
                    <h2 className="section-title">{t('rewards.track.title')}</h2>
                    <span className="section-meta">{t('rewards.levelLong', { n: level })}</span>
                </div>
                <ol className="level-track">
                    {track.map((step) => {
                        const reached = level >= step.level;
                        const isNext = step.level === currentStep;
                        return (
                            <li key={step.level} className={`level-track__step ${reached ? 'is-reached' : ''} ${isNext ? 'is-next' : ''}`}>
                                <span className="level-track__level">{step.level}</span>
                                <span className="level-track__items">
                                    {step.items.map((item) => (
                                        <span key={item.id} className="level-track__item">
                                            <RewardPreview item={item} avatar={avatar} />
                                            <span>{t(`rewards.items.${item.id}.name`)}</span>
                                        </span>
                                    ))}
                                </span>
                                <span className="level-track__state">
                                    {reached ? <><Check aria-hidden="true" /> {t('rewards.track.reached')}</> : isNext ? t('rewards.nextRewardLabel') : <Lock aria-hidden="true" />}
                                </span>
                            </li>
                        );
                    })}
                </ol>
                {currentStep === null && <p className="rewards-panel__lead">{t('rewards.trackEnd')}</p>}
            </section>
        </div>
    );
}

export default RewardsPanel;
