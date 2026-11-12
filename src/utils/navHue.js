import { typeColors } from '../constants/typeChart';

/**
 * Each destination's tone (2026-11-11, the taste pass) — the creative
 * direction's "type colours as tones" applied to the navigation. A rail of
 * twenty identical grey outlines is the template's rail; here each place
 * wears the type whose world it belongs to, so the column reads at a glance
 * the way a Pokédex reads by type. The tone is a canon colour, mixed into
 * theme tokens in CSS (`--nav-hue`, app-shell.css), never applied raw as ink.
 *
 * Chosen here, by destination, never in a view — the same rule as
 * glyphMotion.js. A new nav entry gets a tone from this table or falls back
 * to `normal`.
 */
const BY_KEY = Object.freeze({
    home: 'dragon', // the brand's own violet
    journeys: 'grass', // a path through the tall grass
    builder: 'fighting', // the swords
    pokedex: 'fire', // the Poké Ball's red
    feed: 'water', // the conversation
    favorites: 'psychic', // what you keep
    meta: 'electric', // the trend line, fast
    tools: 'steel', // the calculator
    damageCalc: 'steel',
    speedTiers: 'steel',
    guides: 'ground', // the book
    pokepuzzle: 'ghost', // the daily silhouette
    challenge: 'ground', // the Champion's gold crown
    generationQuiz: 'fairy', // the "?"
    community: 'flying', // the shield of battles and friends
    battles: 'flying',
    friends: 'flying',
    library: 'rock', // the scroll
    types: 'normal', // every type at once
    gyms: 'bug', // the badge case
    profile: 'normal',
    signIn: 'normal',
    admin: 'dark',
});

/** The canon type a destination's icon is toned in. */
export const navHueType = (key) => BY_KEY[key] || 'normal';

/** The canon colour itself, for `--nav-hue`. */
export const navHue = (key) => typeColors[navHueType(key)];
