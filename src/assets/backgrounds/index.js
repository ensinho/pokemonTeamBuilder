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
    { id: 'classic', name: 'Lapras',  url: bg1 },
    { id: 'sunset',  name: 'Latias',   url: bg2 },
    { id: 'forest',  name: 'Lugia',   url: bg3 },
    { id: 'ocean',   name: 'Plain',    url: bg4 },
];

export const DEFAULT_BACKGROUND_ID = SHARE_BACKGROUNDS[0].id;

export const getBackgroundById = (id) =>
    SHARE_BACKGROUNDS.find((b) => b.id === id) || SHARE_BACKGROUNDS[0];
