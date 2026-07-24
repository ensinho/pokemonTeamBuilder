import { useEffect, useState } from 'react';

// Loads the baked trainer-sprite roster (public/data/trainer-sprites.json) — the
// avatars a trainer can pick for their profile. Same shape of loader as
// useBattleItems: module-level cache, best-effort, degrades to an empty list so
// callers just fall back to the greeting Pokémon.

const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};
const dataUrl = () =>
    `${import.meta.env.BASE_URL || '/'}data/trainer-sprites.json`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

const SPRITE_BASE_URL = 'https://play.pokemonshowdown.com/sprites/trainers';

/**
 * URL for a trainer sprite id (e.g. 'cynthia' → …/trainers/cynthia.png).
 *
 * Hotlinked from Showdown, which serves these with an 8-day `cache-control` and
 * is additionally cached by the service worker (see vite.config.js). The host
 * sends no `access-control-allow-origin`, so these may only be used as an
 * `<img src>` — never `fetch`ed or drawn to a canvas.
 */
export const trainerSpriteUrl = (id) => (id ? `${SPRITE_BASE_URL}/${id}.png` : null);

let cache = null;

export function useTrainerSprites() {
    const [trainers, setTrainers] = useState(cache || []);
    useEffect(() => {
        if (cache) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(dataUrl());
                if (res.ok) {
                    const data = await res.json();
                    cache = Array.isArray(data?.trainers) ? data.trainers : [];
                    if (!cancelled) setTrainers(cache);
                }
            } catch (_) { /* optional enrichment — the picker just stays empty */ }
        })();
        return () => { cancelled = true; };
    }, []);
    return trainers;
}
