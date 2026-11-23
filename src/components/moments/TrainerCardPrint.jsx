import React, { useLayoutEffect, useMemo, useRef } from 'react';

import { useTranslation } from '../../hooks/useTranslation';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { trainerPixels } from '../../utils/trainerCardPattern';
import { CARD_PRINT, printDelays } from '../../utils/livingMoments';
import { sample, spring } from '../../utils/brandIntro';
import '../../styles/moments.css';

const COLS = 34;
const ROWS = 8;
const prefersReduced = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/**
 * Account created → the trainer card comes out printed (utils/livingMoments.js
 * CARD_PRINT): it slides out of a slot, its banner — the trainer's own pixels
 * (`trainerPixels`, the trainer card's) in their persona's colour — fills in
 * cell by cell in an order drawn from the same seed, the name types itself,
 * the persona and level arrive, and last the one gold pixel of "training
 * since". The resting markup is the finished card; reduced motion shows it.
 */
export function TrainerCardPrint({ seed, name, partnerId, tone, persona, level, since }) {
    const { t } = useTranslation();
    const pixels = useMemo(() => trainerPixels(seed, { cols: COLS, rows: ROWS }), [seed]);
    const delays = useMemo(() => printDelays(pixels.length, seed), [pixels.length, seed]);
    const cardRef = useRef(null);
    const pixelsRef = useRef(null);
    const nameRef = useRef(null);
    const factsRef = useRef(null);
    const goldRef = useRef(null);

    useLayoutEffect(() => {
        if (prefersReduced()) return undefined;
        const anims = [];
        const run = (el, keyframes, options) => el && anims.push(el.animate(keyframes, { fill: 'backwards', ...options }));
        const slide = sample(760, (u) => {
            const s = u >= 760 ? 1 : spring(u, 1.7, 0.62);
            return { transform: `translateY(${Math.round((1 - s) * -105 * 10) / 10}%)` };
        });
        run(cardRef.current, slide.keyframes, { duration: slide.duration, delay: CARD_PRINT.slide });
        [...(pixelsRef.current?.children || [])].forEach((rect, i) => {
            run(rect, [{ opacity: 0 }, { opacity: rect.getAttribute('opacity') || 1 }], { duration: 120, delay: delays[i] });
        });
        run(nameRef.current, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
            duration: CARD_PRINT.nameRun, delay: CARD_PRINT.name, easing: `steps(${Math.max(4, String(name || '').length)}, end)`,
        });
        run(factsRef.current, [{ opacity: 0, transform: 'translateY(0.375rem)' }, { opacity: 1, transform: 'none' }], {
            duration: 360, delay: CARD_PRINT.facts, easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        });
        const pop = sample(520, (u) => ({ transform: `scale(${u >= 520 ? 1 : Math.round(spring(u, 3.4, 0.35) * 1000) / 1000})` }));
        run(goldRef.current, pop.keyframes, { duration: pop.duration, delay: CARD_PRINT.gold });
        return () => anims.forEach((a) => a.cancel());
        // eslint-disable-next-line react-hooks/exhaustive-deps -- prints once
    }, []);

    return (
        <div className="tcp" style={{ '--tcp-tone': tone }} aria-label={t('moments.card.label', { name })} role="img">
            <span className="tcp__slot" aria-hidden="true" />
            <div className="tcp__window">
                <article className="tcp__card" ref={cardRef}>
                    <div className="tcp__banner" aria-hidden="true">
                        <svg ref={pixelsRef} viewBox={`0 0 ${COLS} ${ROWS}`} preserveAspectRatio="xMaxYMid slice">
                            {pixels.map((p) => (
                                <rect
                                    key={`${p.x}-${p.y}`}
                                    x={p.x + 0.12}
                                    y={p.y + 0.12}
                                    width="0.76"
                                    height="0.76"
                                    className={p.accent ? 'is-accent' : undefined}
                                    opacity={p.accent ? 1 : p.o}
                                />
                            ))}
                        </svg>
                    </div>
                    <span className="tcp__avatar" aria-hidden="true">
                        {partnerId && <img src={getPokemonArtworkSpriteUrl(partnerId)} alt="" width={96} height={96} decoding="async" draggable={false} />}
                    </span>
                    <div className="tcp__body">
                        <p className="tcp__name" ref={nameRef}>{name}</p>
                        <p className="tcp__facts" ref={factsRef}>
                            {persona && <span>{persona}</span>}
                            <span className="tcp__level">{t('moments.card.level', { n: level })}</span>
                        </p>
                    </div>
                    <p className="tcp__since">
                        <span>{t('moments.card.since', { when: since })}</span>
                        <span className="tcp__gold" ref={goldRef} aria-hidden="true" />
                    </p>
                </article>
            </div>
        </div>
    );
}

export default TrainerCardPrint;
