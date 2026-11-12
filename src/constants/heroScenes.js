import { SHARE_BACKGROUNDS } from '../assets/backgrounds';

/**
 * The Home hero's scenes (2026-11-12): what the palette button behind the
 * banner offers. The four photographs the share snippets use, then scenes
 * drawn in the hero's own material — no new image to download:
 *
 * - `pattern` scenes are a tile drawn as a mask, so the hero paints them in
 *   its own colours (`--color-fg` over the type tint) and every theme reads.
 *   They are the battle's weather and the game's own devices.
 * - `partner` and `trainer` are the trainer's alone: their partner's official
 *   artwork as the backdrop, and their Trainer ID drawn as the trainer card's
 *   pixel banner (utils/trainerCardPattern.js) — two trainers never share one.
 *
 * A stored id is checked against this list (`isHeroSceneId`), so a new scene
 * is one entry here plus its name in `cozyHome.scenes.*` (en + pt). The share
 * snippets keep using SHARE_BACKGROUNDS only: a canvas cannot draw a mask.
 */

const svg = (body, size = 64) => `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>${body}</svg>`,
)}")`;

// Every tile is drawn in black: as a mask only its alpha matters.
const TILES = {
    // Rain Dance: slanted streaks.
    rain: svg("<g stroke='black' stroke-width='1.6' stroke-linecap='round'><path d='M10 4l-4 12'/><path d='M38 14l-4 12'/><path d='M58 2l-4 12'/><path d='M22 34l-4 12'/><path d='M50 40l-4 12'/><path d='M8 52l-3 9'/></g>"),
    // Sunny Day: rays from a corner sun.
    sun: svg("<g fill='black'><circle cx='0' cy='0' r='14'/><circle cx='64' cy='64' r='14'/><circle cx='64' cy='0' r='14'/><circle cx='0' cy='64' r='14'/></g><g stroke='black' stroke-width='2' stroke-linecap='round'><path d='M20 20l8 8'/><path d='M44 44l-8-8'/><path d='M44 20l-8 8'/><path d='M20 44l8-8'/></g>"),
    // Hail / Snow: six-armed flakes.
    snow: svg("<g stroke='black' stroke-width='1.4' stroke-linecap='round'><path d='M16 10v12M10 13l12 6M10 19l12-6'/><path d='M46 38v12M40 41l12 6M40 47l12-6'/></g><g fill='black'><circle cx='50' cy='12' r='1.6'/><circle cx='12' cy='48' r='1.6'/><circle cx='32' cy='30' r='1.2'/></g>"),
    // Sandstorm: grains blown sideways.
    sand: svg("<g fill='black'><circle cx='6' cy='8' r='1.4'/><circle cx='30' cy='4' r='1'/><circle cx='54' cy='14' r='1.4'/><circle cx='18' cy='28' r='1'/><circle cx='44' cy='34' r='1.4'/><circle cx='8' cy='50' r='1.2'/><circle cx='36' cy='56' r='1'/><circle cx='60' cy='46' r='1.2'/></g><g stroke='black' stroke-width='1.2' stroke-linecap='round'><path d='M2 20h16'/><path d='M34 22h20'/><path d='M20 42h14'/></g>"),
    // A night route: stars of three sizes.
    stars: svg("<g fill='black'><path d='M14 6l1.6 4.4L20 12l-4.4 1.6L14 18l-1.6-4.4L8 12l4.4-1.6z'/><circle cx='44' cy='10' r='1.2'/><circle cx='56' cy='30' r='1.6'/><circle cx='28' cy='36' r='1'/><path d='M46 42l1.2 3.3 3.3 1.2-3.3 1.2-1.2 3.3-1.2-3.3-3.3-1.2 3.3-1.2z'/><circle cx='10' cy='54' r='1.4'/><circle cx='34' cy='58' r='1'/></g>"),
    // The PC's Poké Balls, outlined.
    pokeballs: svg("<g fill='none' stroke='black' stroke-width='2'><circle cx='16' cy='16' r='10'/><path d='M6 16h20'/><circle cx='16' cy='16' r='3'/><circle cx='48' cy='48' r='10'/><path d='M38 48h20'/><circle cx='48' cy='48' r='3'/></g>"),
    // Terastal: the crystal's facets.
    tera: svg("<g fill='none' stroke='black' stroke-width='1.6' stroke-linejoin='round'><path d='M32 4l14 14-14 22-14-22z'/><path d='M18 18h28'/><path d='M32 4v36'/><path d='M4 44l10 8-10 10M60 44l-10 8 10 10'/></g>"),
    // Tall grass: where every encounter starts.
    grass: svg("<g fill='black'><path d='M4 30q4-12 6-22q2 10 6 22z'/><path d='M14 30q3-9 4-16q2 8 5 16z'/><path d='M36 62q4-12 6-22q2 10 6 22z'/><path d='M46 62q3-9 4-16q2 8 5 16z'/></g>"),
};

const PATTERN_SCENES = [
    { id: 'rain', kind: 'pattern', size: 64 },
    { id: 'sun', kind: 'pattern', size: 96 },
    { id: 'snow', kind: 'pattern', size: 72 },
    { id: 'sand', kind: 'pattern', size: 56 },
    { id: 'stars', kind: 'pattern', size: 88 },
    { id: 'grass', kind: 'pattern', size: 64 },
    { id: 'pokeballs', kind: 'pattern', size: 72 },
    { id: 'tera', kind: 'pattern', size: 80 },
].map((scene) => ({ ...scene, mask: TILES[scene.id] }));

export const HERO_SCENES = [
    ...SHARE_BACKGROUNDS.map((bg) => ({ id: bg.id, kind: 'image', url: bg.url, name: bg.name })),
    { id: 'partner', kind: 'partner' },
    { id: 'trainer', kind: 'trainer' },
    ...PATTERN_SCENES,
];

export const HERO_SCENE_GROUPS = [
    { id: 'yours', ids: ['partner', 'trainer'] },
    { id: 'weather', ids: ['rain', 'sun', 'snow', 'sand'] },
    { id: 'places', ids: ['stars', 'grass', 'pokeballs', 'tera'] },
    { id: 'photos', ids: SHARE_BACKGROUNDS.map((bg) => bg.id) },
];

const BY_ID = new Map(HERO_SCENES.map((scene) => [scene.id, scene]));

export const getHeroScene = (id) => BY_ID.get(id) || null;

export const isHeroSceneId = (id) => typeof id === 'string' && BY_ID.has(id);

/** The scene until the trainer picks one: one photograph per day of the year. */
export const defaultHeroScene = (dayOfYear = 0) => HERO_SCENES[Math.abs(dayOfYear) % SHARE_BACKGROUNDS.length];
