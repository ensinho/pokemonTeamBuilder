/**
 * The mascot's mime (2026-11-17, "Fantasminha de plantão"): stuck on the quiz
 * of the day, the trainer asks him — once a run — and he imitates one of the
 * Pokémon still missing. His vocabulary is the clue: he turns the colour of
 * its type, does a gesture of that type, and the line under him gives the
 * figures (its height, its generation).
 *
 * Pure. Every pose and mood named here is the rig's own (catalog.js); a test
 * checks they exist, so a renamed pose cannot leave him blank.
 */

/** One gesture per type: a mood, and a pose whose prop or paws say it. */
export const MIME_GESTURES = {
    normal: { mood: 'sonolento', pose: 'dormindo' },          // the pillow
    fire: { mood: 'confiante', pose: 'segurandoChama' },      // a flame that must not go out
    water: { mood: 'animado', pose: 'pulando' },              // a splash
    electric: { mood: 'empolgado', pose: 'tomadaSolta' },     // the plug
    grass: { mood: 'aliviado', pose: 'comemorando' },         // arms up like a sprout
    ice: { mood: 'assustado' },                               // a shiver
    fighting: { mood: 'determinado', pose: 'apontando' },
    poison: { mood: 'tonto' },
    ground: { mood: 'curioso', pose: 'espiando' },            // peeking out of the ground
    flying: { mood: 'feliz', pose: 'olhandoNuvem' },          // the cloud
    psychic: { mood: 'pensando', pose: 'matutando' },
    bug: { mood: 'curioso', pose: 'investigando' },           // the lens: small things
    rock: { mood: 'determinado', pose: 'segurandoEscudo' },
    ghost: { mood: 'travesso', pose: 'shadowBall' },
    dragon: { mood: 'bravo' },                                // the roar
    dark: { mood: 'desconfiado' },
    steel: { mood: 'confiante', pose: 'segurandoEscudo' },
    fairy: { mood: 'apaixonado', pose: 'acenando' },
};

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };

/** `generation-iv` → 4 (null when unknown). */
export const generationNumber = (value) => {
    if (Number.isInteger(value)) return value;
    const match = /generation-([ivx]+)$/.exec(String(value || ''));
    return match ? ROMAN[match[1]] || null : null;
};

/**
 * Which missing Pokémon he mimes: the same one for the same run and step
 * (so a re-render never swaps it), spread over the list as the run moves on.
 */
export function pickMime(remaining = [], seed = '') {
    if (!remaining.length) return null;
    let h = 0;
    for (let i = 0; i < seed.length; i += 1) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
    return remaining[h % remaining.length];
}

/**
 * The mime for a Pokémon: his look (`tone`, `mood`, `pose`) and the line's
 * figures. `height` (metres) comes from the battle dex when it is loaded.
 *
 * @param {{ types?: string[], generation?: string|number }} mon
 * @param {{ height?: number }} [dex]
 */
export function mimeFor(mon, dex = null) {
    const type = String(mon?.types?.[0] || 'normal').toLowerCase();
    const gesture = MIME_GESTURES[type] || MIME_GESTURES.normal;
    const height = Number(dex?.height);
    return {
        type,
        mood: gesture.mood,
        pose: gesture.pose || null,
        tone: MIME_GESTURES[type] ? type : 'normal',
        height: Number.isFinite(height) && height > 0 ? Math.round(height * 10) / 10 : null,
        gen: generationNumber(mon?.generation),
    };
}
