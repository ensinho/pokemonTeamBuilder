// Centralized export of share-snippet backgrounds.
//
// PATTERN — adding a new background:
//   1. Drop the image file in this folder (recommended: 1200x675 JPEG/PNG/WEBP).
//   2. Import it below with a stable `id` (kebab-case) and a friendly `name`.
//   3. Append it to the SHARE_BACKGROUNDS array.
//
// All snippets are rendered on a fixed-size canvas (see SNIPPET_DIMENSIONS)
// using `object-fit: cover`, so source aspect ratio doesn't have to match —
// but staying close to 16:9 minimises cropping.

import bg1 from './PokemonBackground.jpg';
import bg2 from './PokemonBackground2.jpg';
import bg3 from './PokemonBackground3.jpg';
import bg4 from './PokemonBackground4.jpg';

// Final exported snippet image dimensions (px). 16:9 plays nicely with
// social previews (Twitter/X, Discord, Instagram landscape).
export const SNIPPET_DIMENSIONS = Object.freeze({
    width: 1200,
    height: 675,
});

export const SHARE_BACKGROUNDS = [
    {
        id: 'classic',
        name: 'Lapras',
        url: bg1,
        accent: '#6FA5D8',
        accentSoft: 'rgba(111, 165, 216, 0.18)',
        border: 'rgba(111, 165, 216, 0.34)',
        surface: 'rgba(17, 42, 70, 0.62)',
        surfaceBorder: 'rgba(111, 165, 216, 0.30)',
    },
    {
        id: 'sunset',
        name: 'Latias',
        url: bg2,
        accent: '#F08A7C',
        accentSoft: 'rgba(240, 138, 124, 0.18)',
        border: 'rgba(240, 138, 124, 0.34)',
        surface: 'rgba(80, 34, 37, 0.58)',
        surfaceBorder: 'rgba(240, 138, 124, 0.32)',
    },
    {
        id: 'forest',
        name: 'Lugia',
        url: bg3,
        accent: '#4FAFA0',
        accentSoft: 'rgba(79, 175, 160, 0.18)',
        border: 'rgba(79, 175, 160, 0.34)',
        surface: 'rgba(22, 54, 49, 0.58)',
        surfaceBorder: 'rgba(79, 175, 160, 0.30)',
    },
    {
        id: 'ocean',
        name: 'Plain',
        url: bg4,
        accent: '#7F9ABF',
        accentSoft: 'rgba(127, 154, 191, 0.18)',
        border: 'rgba(127, 154, 191, 0.34)',
        surface: 'rgba(28, 40, 62, 0.58)',
        surfaceBorder: 'rgba(127, 154, 191, 0.28)',
    },
];

export const DEFAULT_BACKGROUND_ID = SHARE_BACKGROUNDS[0].id;

export const getBackgroundById = (id) =>
    SHARE_BACKGROUNDS.find((b) => b.id === id) || SHARE_BACKGROUNDS[0];
