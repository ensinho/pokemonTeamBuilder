import React, { useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react';

import { useTranslation } from '../../hooks/useTranslation';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { typeColors } from '../../constants/types';
import { TEAM_SAVED, arcFrames, teamBallLands } from '../../utils/livingMoments';
import { sample, spring } from '../../utils/brandIntro';
import '../../styles/moments.css';

const prefersReduced = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/**
 * The first team saved → into Bill's PC (utils/livingMoments.js TEAM_SAVED):
 * each Pokémon turns to red light and shrinks into its Poké Ball, the balls
 * arc into the PC box one after another, the lid closes on them and the box
 * counts one. Only the account's first team: saving is frequent, every later
 * save keeps the plain toast.
 */
export function TeamSavedScene({ payload, onDone }) {
    const { t } = useTranslation();
    const titleId = useId();
    const members = (payload?.members || []).slice(0, 6);
    const rootRef = useRef(null);
    const monRefs = useRef([]);
    const boxRef = useRef(null);
    const lidRef = useRef(null);
    const countRef = useRef(null);
    const wordsRef = useRef(null);
    const anims = useRef([]);
    const closed = useRef(false);

    const close = useCallback(() => {
        if (closed.current) return;
        closed.current = true;
        onDone?.();
    }, [onDone]);
    const tap = () => {
        const running = anims.current.filter((a) => a.playState === 'running');
        if (running.length) running.forEach((a) => a.finish());
        else close();
    };

    useLayoutEffect(() => {
        rootRef.current?.focus({ preventScroll: true });
        if (prefersReduced()) {
            anims.current = [rootRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 })];
            const timer = window.setTimeout(close, 1600);
            return () => window.clearTimeout(timer);
        }
        const run = (el, keyframes, options) => el && anims.current.push(el.animate(keyframes, { fill: 'both', ...options }));
        const box = boxRef.current?.getBoundingClientRect();
        const last = members.length - 1;
        run(lidRef.current, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-38deg)' }], {
            duration: TEAM_SAVED.lidOpen, delay: TEAM_SAVED.first, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards',
        });
        monRefs.current.forEach((node, i) => {
            if (!node) return;
            const t0 = TEAM_SAVED.first + i * TEAM_SAVED.each;
            const sprite = node.querySelector('.tsv__sprite');
            const red = node.querySelector('.tsv__red');
            const ball = node.querySelector('.tsv__ball');
            run(red, [{ opacity: 0 }, { opacity: 1 }], { duration: TEAM_SAVED.red, delay: t0 });
            run(sprite, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.2)', opacity: 0 }], {
                duration: TEAM_SAVED.shrink, delay: t0 + TEAM_SAVED.red, easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
            });
            run(red, [{ transform: 'scale(1)' }, { transform: 'scale(0.2)', opacity: 0 }], {
                duration: TEAM_SAVED.shrink, delay: t0 + TEAM_SAVED.red, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', composite: 'replace',
            });
            run(ball, [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }], {
                duration: TEAM_SAVED.shrink, delay: t0 + TEAM_SAVED.red, fill: 'backwards',
            });
            const from = ball.getBoundingClientRect();
            const dx = box ? box.left + box.width / 2 - (from.left + from.width / 2) : 0;
            const dy = box ? box.top + box.height / 2 - (from.top + from.height / 2) : 0;
            const arc = arcFrames(dx, dy, 110);
            run(ball, arc.keyframes.map((k, n, all) => ({ ...k, opacity: n === all.length - 1 ? 0 : 1 })), {
                duration: arc.duration, delay: t0 + TEAM_SAVED.red + TEAM_SAVED.shrink, fill: 'forwards',
            });
        });
        const closeAt = teamBallLands(Math.max(0, last));
        run(lidRef.current, [{ transform: 'rotate(-38deg)' }, { transform: 'rotate(4deg)', offset: 0.6 }, { transform: 'rotate(0deg)' }], {
            duration: TEAM_SAVED.settle, delay: closeAt, easing: 'ease-out', fill: 'forwards',
        });
        const pop = sample(520, (u) => ({ transform: `scale(${u >= 520 ? 1 : Math.round(spring(u, 3, 0.4) * 1000) / 1000})` }));
        run(countRef.current, pop.keyframes, { duration: pop.duration, delay: closeAt + 120, fill: 'backwards' });
        run(wordsRef.current, [{ opacity: 0, transform: 'translateY(0.75rem)' }, { opacity: 1, transform: 'none' }], {
            duration: 420, delay: closeAt + 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards',
        });
        const timer = window.setTimeout(close, TEAM_SAVED.done);
        return () => { window.clearTimeout(timer); anims.current.forEach((a) => a.cancel()); };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the scene plays once
    }, []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [close]);

    return (
        <div ref={rootRef} className="moment moment--team" style={{ '--tsv-box': typeColors.water }} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={tap}>
            <div className="tsv">
                <div className="tsv__pc" aria-hidden="true">
                    <div className="tsv__box" ref={boxRef}>
                        <span className="tsv__lid" ref={lidRef} />
                        <span className="tsv__grid">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</span>
                        <span className="tsv__count" ref={countRef}>+1</span>
                    </div>
                    <span className="tsv__pc-label">{t('moments.teamSaved.pc')}</span>
                </div>
                <ol className="tsv__party" aria-hidden="true">
                    {members.map((id, i) => (
                        <li key={`${id}-${i}`} className="tsv__slot" ref={(n) => { monRefs.current[i] = n; }}>
                            <img className="tsv__sprite" src={getPokemonFrontSpriteUrl(id)} alt="" width={96} height={96} decoding="async" draggable={false} />
                            <img className="tsv__red" src={getPokemonFrontSpriteUrl(id)} alt="" width={96} height={96} decoding="async" draggable={false} />
                            <span className="tsv__ball" />
                        </li>
                    ))}
                </ol>
                <div className="tsv__words" ref={wordsRef}>
                    <h2 id={titleId} className="tsv__title">{t('moments.teamSaved.title')}</h2>
                    <p className="tsv__sub">{t('moments.teamSaved.sub', { name: payload?.name || '' })}</p>
                </div>
            </div>
        </div>
    );
}

export default TeamSavedScene;
