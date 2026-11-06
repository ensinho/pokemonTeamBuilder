/**
 * The mascot's constants that the boot path needs without the rig
 * (the store validates a saved tone; the component picks a framing).
 * `rig.test.js` checks they match the rig.
 */
export const TONES = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];

/** Framings: how much of the rig space a drawing shows. */
export const VIEWS = {
    head: '-380 -440 760 760',   // the head + its sparks: tips, icons, coaches
    body: '-480 -520 960 960',   // with paws and props: empty states, the loader
    wide: '-520 -560 1040 1040', // room to jump and be dragged: the playground
};

/** Named sizes, in CSS px at the default UI scale (the wrapper is sized in rem). */
export const MASCOT_SIZES = { xs: 24, sm: 36, md: 48, lg: 64, xl: 120, hero: 176 };
