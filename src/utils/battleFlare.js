/**
 * Which moments of a battle get the anime flare (`ds/DsFlare`), how big, where
 * and in which colours. Pure, so the choice is tested without a browser; the
 * scene only draws what this returns.
 *
 *   a move connects             hit, on the side it hit, the move's type colour
 *   …a critical hit / super     crit (larger, every part)
 *   Mega Evolution              mega, on the Pokémon
 *   the battle won              win, over the field's middle
 *
 * Only a direct hit counts — a `-damage` with no `[from]`, which the timeline
 * tags with the move (`strike`); recoil, weather and poison stay quiet.
 * Colours are the game screen's palette tokens, or a type's colour.
 */

const ALL = ['glint', 'ring', 'ring2', 'blade', 'star', 'rays', 'dot'];

/** Each flare: its width in DS px, how long it lasts, which parts it draws, and in how many passes. */
export const FLARE_VARIANTS = {
    hit: { size: 72, duration: 560, parts: ['glint', 'ring', 'star', 'rays'], passes: 1 },
    crit: { size: 104, duration: 720, parts: ALL, passes: 1 },
    mega: { size: 156, duration: 1300, parts: ALL, passes: 2 },
    win: { size: 190, duration: 1100, parts: ALL, passes: 2 },
};

/**
 * @param {object|null} current the playback's moment (`battleTimeline`)
 * @param {{moveMeta: (name: string) => ({type?: string}|null), foeName: string, typeColors: Record<string, string>}} context
 * @returns {{variant: 'hit'|'crit'|'mega'|'win', at: 'mine'|'foe'|'centre', colorA: string, colorB: string}|null}
 */
export const flareOf = (current, { moveMeta, foeName, typeColors }) => {
    if (!current) return null;
    const at = current.side === 'p1' ? 'mine' : 'foe';
    if (current.type === 'hp' && current.strike && !current.heal) {
        const type = moveMeta(current.strike.move)?.type;
        return {
            variant: current.strike.hard ? 'crit' : 'hit',
            at,
            colorA: typeColors[type] || 'var(--ds-paper)',
            colorB: 'var(--ds-banner-stripe)',
        };
    }
    if (current.type === 'mega') return { variant: 'mega', at, colorA: 'var(--ds-flare-mega)', colorB: 'var(--ds-ring)' };
    if (current.type === 'end' && current.winner && current.winner !== foeName) {
        return { variant: 'win', at: 'centre', colorA: 'var(--ds-banner-stripe)', colorB: 'var(--ds-ring)' };
    }
    return null;
};
