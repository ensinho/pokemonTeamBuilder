import React, { useEffect, useRef, useState } from 'react';
import '../../styles/mascot-world.css';
const prefersReduced = () => typeof window !== 'undefined'
    && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/**
 * Progress as resolution (2026-11-17, "Fantasminha de plantão" — Pin UI's
 * Progress Image, "pixel"): the answer resolves from a handful of pixels to
 * the artwork, once, for a win that just happened. `play` false (a day that
 * loaded solved), reduced motion or an image that will not load: the image,
 * still, as before. Under 600 ms (four steps), transform/opacity only.
 */
const REVEAL_STEPS = [6, 10, 16, 28];
const STEP_MS = 120;

export function PixelReveal({ src, alt, play = false, className = '', onError, ...imgProps }) {
    const reduced = prefersReduced();
    const canvasRef = useRef(null);
    const [phase, setPhase] = useState(play && !reduced ? 'pixels' : 'done');

    useEffect(() => {
        if (!play || reduced || !src) { setPhase('done'); return undefined; }
        setPhase('pixels');
        let alive = true;
        const timers = [];
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!alive || !ctx) return;
            REVEAL_STEPS.forEach((n, i) => {
                timers.push(window.setTimeout(() => {
                    if (!alive) return;
                    canvas.width = n;
                    canvas.height = n;
                    ctx.imageSmoothingEnabled = true;
                    ctx.clearRect(0, 0, n, n);
                    ctx.drawImage(img, 0, 0, n, n);
                }, i * STEP_MS));
            });
            timers.push(window.setTimeout(() => { if (alive) setPhase('done'); }, REVEAL_STEPS.length * STEP_MS));
        };
        img.onerror = () => { if (alive) setPhase('done'); };
        img.src = src;
        return () => {
            alive = false;
            timers.forEach((id) => window.clearTimeout(id));
        };
    }, [play, reduced, src]);

    return (
        <span className={`pixel-reveal ${phase === 'pixels' ? 'is-revealing' : ''}`}>
            {/* `className` is the image's own (the caller's sprite classes) */}
            <img src={src} alt={alt} onError={onError} {...imgProps} className={`pixel-reveal__img ${className}`} />
            {phase === 'pixels' && <canvas ref={canvasRef} className="pixel-reveal__pixels" aria-hidden="true" />}
        </span>
    );
}

export default PixelReveal;
