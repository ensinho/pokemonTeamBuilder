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

/**
 * The loader's scenes (Loader.jsx `scene`): what the mascot does while a region
 * waits, chosen by what it waits for. Names from catalog.js (`catalog.test.js`
 * checks them); the motion is the props' own CSS loop (mascot.css), so a wait
 * costs no JavaScript frames.
 */
export const LOADER_SCENES = {
    capture: { mood: 'expectante', pose: 'capturando' },    // a Pokémon, a team, a page: will the ball hold?
    battle: { mood: 'desafiador', pose: 'shadowBall' },     // a battle being set up: a Shadow Ball charging
    pokedex: { mood: 'concentrado', pose: 'lendoPokedex' }, // reference data: reading, a page of the Pokédex turns
    think: { mood: 'pensando', pose: 'matutando' },         // a quiz, a calculation: the thought bubble's dots
    search: { mood: 'curioso', pose: 'investigando' },      // trainers, places: the lens sweeps, the eyes follow it
};
