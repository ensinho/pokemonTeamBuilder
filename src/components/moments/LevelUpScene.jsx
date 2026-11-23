import React, { useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react';

import { FramedAvatar } from '../rewards/FramedAvatar';
import { MascotIcon } from '../Mascot';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { useRewardsStore } from '../../store/useRewardsStore';
import { getCosmetic } from '../../constants/cosmetics';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { levelForXp } from '../../utils/trainerLevel';
import { LEVEL_UP, landFrames, swapKeyframes } from '../../utils/livingMoments';
import { sample, spring } from '../../utils/brandIntro';
import '../../styles/moments.css';

const PARTICLES = 12;
const prefersReduced = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/**
 * Level up → the evolution screen (utils/livingMoments.js): the XP bar fills,
 * the screen dims, the level's numeral swaps its silhouette between the old
 * and the new figure faster and faster, the flash, and the new level lands in
 * gold (earned). The page's default state is the end of the scene; the Web
 * Animations below play it from the start, and a tap finishes them at once.
 */
export function LevelUpScene({ payload, onDone }) {
    const { t } = useTranslation();
    const titleId = useId();
    const uid = useAuthStore((s) => s.userId);
    const partnerId = useAuthStore((s) => s.greetingPokemonId);
    const xp = useRewardsStore((s) => s.xp);
    const { level, levelBefore, gained = 0, earned = [] } = payload || {};
    const after = levelForXp(xp);
    const before = levelForXp(Math.max(0, xp - gained));
    const reward = earned.map(getCosmetic).find(Boolean);

    const rootRef = useRef(null);
    const parts = useRef({});
    const anims = useRef([]);
    const ref = (key) => (node) => { parts.current[key] = node; };

    const close = useCallback(() => onDone?.(), [onDone]);
    const tap = () => {
        const running = anims.current.filter((a) => a.playState === 'running');
        if (running.length) running.forEach((a) => a.finish());
        else close();
    };

    useLayoutEffect(() => {
        rootRef.current?.focus({ preventScroll: true });
        if (prefersReduced()) {
            const a = rootRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
            anims.current = [a];
            return undefined;
        }
        const p = parts.current;
        const total = LEVEL_UP.done;
        const at = (ms) => ms / total;
        const run = (el, keyframes, options) => el && anims.current.push(el.animate(keyframes, { duration: total, fill: 'both', ...options }));
        const step = 'step-end';

        // the bar: fills to the top, then starts the new level
        run(p.fill, [
            { offset: 0, transform: `scaleX(${before.percent / 100})` },
            { offset: at(LEVEL_UP.fill), transform: 'scaleX(1)', easing: step },
            { offset: at(LEVEL_UP.land), transform: 'scaleX(0)' },
            { offset: at(LEVEL_UP.land + 500), transform: `scaleX(${after.percent / 100})` },
            { offset: 1, transform: `scaleX(${after.percent / 100})` },
        ]);
        run(p.labelOld, [{ offset: 0, opacity: 1, easing: step }, { offset: at(LEVEL_UP.land), opacity: 0 }, { offset: 1, opacity: 0 }]);
        run(p.labelNew, [{ offset: 0, opacity: 0, easing: step }, { offset: at(LEVEL_UP.land), opacity: 1 }, { offset: 1, opacity: 1 }]);
        // the dim that makes it an evolution
        run(p.veil, [
            { offset: 0, opacity: 0 }, { offset: at(LEVEL_UP.dim), opacity: 0 }, { offset: at(LEVEL_UP.dim + 300), opacity: 1 },
            { offset: at(LEVEL_UP.land), opacity: 1 }, { offset: at(LEVEL_UP.land + 350), opacity: 0 }, { offset: 1, opacity: 0 },
        ]);
        // the silhouette: the avatar glows white, the badge goes to ink, the numerals swap
        run(p.white, [
            { offset: 0, opacity: 0 }, { offset: at(LEVEL_UP.swapsFrom), opacity: 0 }, { offset: at(LEVEL_UP.swapsFrom + 350), opacity: 0.85 },
            { offset: at(LEVEL_UP.land), opacity: 0.85 }, { offset: at(LEVEL_UP.land + 300), opacity: 0 }, { offset: 1, opacity: 0 },
        ]);
        run(p.ink, [{ offset: 0, opacity: 0, easing: step }, { offset: at(LEVEL_UP.swapsFrom), opacity: 1, easing: step }, { offset: at(LEVEL_UP.land), opacity: 0 }, { offset: 1, opacity: 0 }]);
        run(p.gold, [{ offset: 0, opacity: 0, easing: step }, { offset: at(LEVEL_UP.land), opacity: 1 }, { offset: 1, opacity: 1 }]);
        run(p.numOld, swapKeyframes({ newNumeral: false }));
        run(p.numNew, swapKeyframes({ newNumeral: true }));
        run(p.numbers, [{ offset: 0, color: 'var(--mascot-white)', easing: step }, { offset: at(LEVEL_UP.land), color: 'var(--brand-ink)' }, { offset: 1, color: 'var(--brand-ink)' }]);
        const land = landFrames();
        run(p.badge, land.keyframes, { duration: land.duration, delay: LEVEL_UP.land, fill: 'none' });
        // the light gathering into the avatar
        (p.particles?.children ? [...p.particles.children] : []).forEach((el, i) => {
            const a = (360 / PARTICLES) * i;
            const start = LEVEL_UP.swapsFrom + i * 40;
            run(el, [
                { offset: 0, opacity: 0, transform: `rotate(${a}deg) translateX(15rem)` },
                { offset: at(start), opacity: 0, transform: `rotate(${a}deg) translateX(15rem)` },
                { offset: at(start + 250), opacity: 1, transform: `rotate(${a + 20}deg) translateX(12rem)`, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
                { offset: at(LEVEL_UP.flash - 60), opacity: 1, transform: `rotate(${a + 80}deg) translateX(1rem)` },
                { offset: at(LEVEL_UP.flash), opacity: 0, transform: `rotate(${a + 80}deg) translateX(0)` },
                { offset: 1, opacity: 0, transform: `rotate(${a + 80}deg) translateX(0)` },
            ]);
        });
        run(p.flash, [
            { offset: 0, opacity: 0 }, { offset: at(LEVEL_UP.flash), opacity: 0 }, { offset: at(LEVEL_UP.land), opacity: 1 },
            { offset: at(LEVEL_UP.land + 450), opacity: 0 }, { offset: 1, opacity: 0 },
        ]);
        const words = sample(700, (u) => {
            const s = u >= 700 ? 1 : spring(u, 2.4, 0.6);
            return { opacity: Math.min(1, s * 1.3), transform: `translateY(${Math.round((1 - s) * 24 * 10) / 10}px)` };
        });
        run(p.words, words.keyframes, { duration: words.duration, delay: LEVEL_UP.words, fill: 'backwards' });
        return () => anims.current.forEach((a) => a.cancel());
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the scene plays once
    }, []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [close]);

    return (
        <div ref={rootRef} className="moment" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={tap}>
            <span className="moment__veil" ref={ref('veil')} />
            <div className="lvl">
                <span className="lvl__particles" ref={ref('particles')} aria-hidden="true">
                    {Array.from({ length: PARTICLES }, (_, i) => <i key={i} className={i % 4 === 0 ? 'is-gold' : ''} />)}
                </span>
                <div className="lvl__avatar" aria-hidden="true">
                    <FramedAvatar uid={uid} className="lvl__face">
                        {partnerId
                            ? <img src={getPokemonArtworkSpriteUrl(partnerId)} alt="" width={160} height={160} decoding="async" draggable={false} />
                            : <MascotIcon className="lvl__mascot" />}
                    </FramedAvatar>
                    <span className="lvl__white" ref={ref('white')} />
                    <span className="lvl__badge" ref={ref('badge')}>
                        <span className="lvl__badge-ink" ref={ref('ink')} />
                        <span className="lvl__badge-gold" ref={ref('gold')} />
                        <span className="lvl__numbers" ref={ref('numbers')}>
                            <span className="lvl__n is-old" ref={ref('numOld')}>{levelBefore}</span>
                            <span className="lvl__n is-new" ref={ref('numNew')}>{level}</span>
                        </span>
                    </span>
                </div>
                <div className="lvl__xp" aria-hidden="true">
                    <span className="lvl__labels">
                        <span className="lvl__label is-old" ref={ref('labelOld')}>{t('moments.levelUp.level', { n: levelBefore })}</span>
                        <span className="lvl__label is-new" ref={ref('labelNew')}>{t('moments.levelUp.level', { n: level })}</span>
                    </span>
                    <span className="lvl__track"><i ref={ref('fill')} style={{ transform: `scaleX(${after.percent / 100})` }} /></span>
                </div>
                <div className="lvl__words" ref={ref('words')}>
                    <h2 id={titleId} className="lvl__title">{t('moments.levelUp.title', { n: level })}</h2>
                    <p className="lvl__sub">{t('moments.levelUp.gained', { xp: gained })}</p>
                    {reward && <p className="lvl__reward">{t('moments.levelUp.reward', { name: t(`rewards.items.${reward.id}.name`) })}</p>}
                    <button type="button" className="btn btn-primary btn-lg lvl__go" onClick={(e) => { e.stopPropagation(); close(); }}>
                        {t('moments.continue')}
                    </button>
                </div>
            </div>
            <span className="moment__flash" ref={ref('flash')} />
        </div>
    );
}

export default LevelUpScene;
