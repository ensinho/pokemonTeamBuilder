import { useStaticData } from './useStaticData';
import { SHOWDOWN_SPRITES_BASE } from '../utils/assetHost';

// Loads the baked trainer-sprite roster (public/data/trainer-sprites.json) — the
// avatars a trainer can pick for their profile. Same shape of loader as
// useBattleItems: one shared request, best-effort, degrades to an empty list so
// callers just fall back to the greeting Pokémon.

const SPRITE_BASE_URL = `${SHOWDOWN_SPRITES_BASE}/trainers`;

/**
 * URL for a trainer sprite id (e.g. 'cynthia' → …/trainers/cynthia.png).
 *
 * Hotlinked from Showdown, which serves these with an 8-day `cache-control` and
 * is additionally cached by the service worker (see vite.config.js). The host
 * sends no `access-control-allow-origin`, so these may only be used as an
 * `<img src>` — never `fetch`ed or drawn to a canvas.
 */
export const trainerSpriteUrl = (id) => (id ? `${SPRITE_BASE_URL}/${id}.png` : null);

const NO_TRAINERS = [];

export function useTrainerSprites() {
    const { data } = useStaticData('trainer-sprites.json');
    return Array.isArray(data?.trainers) ? data.trainers : NO_TRAINERS;
}
