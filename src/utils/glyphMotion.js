/**
 * The icons' own motions (2026-11-09) — the creative direction's "motion lives
 * inside the thing" as one small vocabulary the app's navigation shares. A
 * motion says what its icon draws: the Poké Ball wobbles the way a caught
 * Pokémon's does, the swords clash, the crown is lifted, the trend line rises,
 * the puzzle piece snaps in, the lens scans. Played once per act, never on
 * load, never looping, and nothing at all under reduced motion
 * (interactions.css, "Glyph motion").
 *
 * Where each plays:
 * - desktop: the rail's link, on hover (`.app-shell__nav-link:hover`);
 * - phone: the dock's tab, the moment it becomes the current one;
 * - anywhere a control carries `data-glyph` and opts in through CSS.
 *
 * The motion is chosen here, by destination, never in a view — a new nav
 * entry gets a meaning from this table or falls back to `nudge`.
 */

export const GLYPH_MOTIONS = Object.freeze([
    'hop', // a small jump: home, friends, profile
    'clash', // two blades meet: builder, battles
    'wobble', // the caught Poké Ball's three rocks: the Pokédex
    'rise', // up and to the right: meta, speed
    'lift', // raised off its base: the Champion's crown
    'snap', // a quarter turn into place: the puzzle
    'scan', // a lens circling: search
    'turn', // shapes turning over: the type chart, admin
    'open', // a book opening: guides, the library
    'swing', // hanging from its ribbon or hook: gyms' medal, the quiz's "?"
    'pop', // a press that answers: forum, favourites, the calculator
    'nudge', // forward a step: journeys, anything without its own
]);

const BY_KEY = Object.freeze({
    home: 'hop',
    journeys: 'nudge',
    builder: 'clash',
    pokedex: 'wobble',
    feed: 'pop',
    favorites: 'pop',
    meta: 'rise',
    damageCalc: 'pop',
    speedTiers: 'rise',
    guides: 'open',
    pokepuzzle: 'snap',
    challenge: 'lift',
    generationQuiz: 'swing',
    library: 'open',
    types: 'turn',
    gyms: 'swing',
    battles: 'clash',
    friends: 'hop',
    admin: 'turn',
    profile: 'hop',
    search: 'scan',
});

/** The motion a destination's icon plays; `nudge` for one with no meaning yet. */
export const glyphMotion = (key) => BY_KEY[key] || 'nudge';
