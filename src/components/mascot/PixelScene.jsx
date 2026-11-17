import React, { useEffect, useRef } from 'react';
import { renderScene, sceneWidth } from '../../utils/pixelScene';
import '../../styles/mascot-world.css';

/**
 * A pixel scene (2026-11-17, "Fantasminha de plantão"): the mascot's world,
 * 64 cells tall, drawn once per size on a canvas scaled with
 * `image-rendering: pixelated` (utils/pixelScene.js holds the pixels).
 * Static: it answers a resize, never loops — the figures standing in it are
 * what moves. `onGround(scene)` hands the parent where the ground is, so a
 * figure stands on it at any width. Decorative (`aria-hidden`).
 *
 * Only for the mascot's world: the meadow, the receipt's morning. Never
 * behind text a trainer reads, never on chrome (design-system skill).
 */
export function PixelScene({ kind = 'dusk', seed = 7, onGround, className = '' }) {
    const ref = useRef(null);
    const groundRef = useRef(onGround);
    groundRef.current = onGround;

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas || typeof ResizeObserver === 'undefined') return undefined;
        let lastWidth = 0;
        const draw = () => {
            const { width, height } = canvas.getBoundingClientRect();
            if (!width || !height) return;
            const cells = sceneWidth(width, height);
            if (cells === lastWidth) return;
            lastWidth = cells;
            const scene = renderScene(kind, cells, seed);
            canvas.width = scene.width;
            canvas.height = scene.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.putImageData(new ImageData(scene.data, scene.width, scene.height), 0, 0);
            groundRef.current?.(scene);
        };
        const observer = new ResizeObserver(draw);
        observer.observe(canvas);
        draw();
        return () => observer.disconnect();
    }, [kind, seed]);

    return <canvas ref={ref} className={`pixel-scene ${className}`} aria-hidden="true" />;
}

export default PixelScene;
