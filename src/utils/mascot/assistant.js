/**
 * The mascot as a small assistant (2026-11-10): what he has to say about the
 * thing in front of the trainer, decided here and nowhere else. Pure — the
 * views hand over facts they already hold and draw the answer.
 *
 * Three rules from the market study (docs/modules/mascot.md, "The assistant"):
 * - **The face is the readout** (Duolingo's widget): one mood per state, so
 *   the drawing alone says how things stand.
 * - **He gestures, the app speaks** (Mailchimp's Freddie): the sentence is UI
 *   copy beside him, keyed here, never a voice of his own.
 * - **One thing, and he can be told to stop** (Clippy and the Rotom Dex are
 *   the two ways this goes wrong): a single note a day, closable, and nothing
 *   at all when there is nothing worth saying.
 */

import { rateTeam } from '../teamAnalysis.js';

const size = (v) => (v instanceof Set ? v.size : Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0);

/** A team covering this many of the 18 types super-effectively is "great coverage". */
export const GREAT_COVERAGE = 14;
/** Verdicts from worst to best — a step up this ladder is the trainer's doing, and may be cheered. */
export const VERDICT_RANK = ['weak', 'hole', 'start', 'growing', 'complete', 'coverage'];

/**
 * The mascot's verdict on the team being built, from `analyzeTeam`'s result.
 * `types` are the team-wide weaknesses, worst first (for the sentence).
 *
 * start     one or two members                    — glad (too early to judge:
 *           with one member every weakness it has is "team-wide")
 * weak      two or more team-wide weaknesses AND a grade below "solid"
 *           (`rateTeam`) — worried. He never frowns beside a good grade.
 * hole      any other team-wide weakness          — wary: a heads-up, not a judgement
 * growing   three to five, nothing wrong          — set on finishing
 * complete  six, no team-wide weakness            — radiant
 * coverage  six, none, and ≥ GREAT_COVERAGE types hit — sparkling
 *
 * @returns {{ id: string, mood: string, types: string[], covered: number } | null} null for an empty team
 */
export function teamVerdict(analysis, teamSize = 0) {
    if (!teamSize) return null;
    const weaknesses = Object.entries(analysis?.weaknesses || {}).sort((a, b) => b[1] - a[1]).map(([type]) => type);
    const covered = size(analysis?.strengths);
    const pick = (id, mood) => ({ id, mood, types: weaknesses, covered });
    if (teamSize <= 2) return pick('start', 'animado');
    const { grade } = rateTeam(analysis, teamSize);
    const graded = grade === 'solid' || grade === 'excellent';
    if (weaknesses.length >= 2 && !graded) return pick('weak', 'preocupado');
    if (weaknesses.length >= 1) return pick('hole', 'desconfiado');
    if (teamSize >= 6) return covered >= GREAT_COVERAGE ? pick('coverage', 'brilhando') : pick('complete', 'radiante');
    return pick('growing', 'determinado');
}

/** True when `next` is a better verdict than `prev` — the only change he cheers. */
export const verdictImproved = (prev, next) => Boolean(prev && next) && VERDICT_RANK.indexOf(next) > VERDICT_RANK.indexOf(prev);

/** From this hour on, an open check-in is worth a word (the day is ending). */
export const EVENING = 18;

/**
 * The one thing the mascot says on Home today, or null. Priority is "who is
 * waiting on the trainer": a friend first, then the day's own doors, and when
 * every door is closed he says so and rests — the payoff, not another task.
 *
 * Never guilt (the streak line states what the check-in keeps, with the
 * shield if one would cover a miss), never what the hero already says (the
 * team's status is the hero's), and nothing for a brand-new trainer (the
 * journey's welcome is his line there).
 *
 * @param {object} f
 * @param {number} f.hour            local hour, 0–23
 * @param {boolean} f.isNew          the journey's welcome is showing
 * @param {number} f.battlesWaiting  friend battles waiting on the trainer's move
 * @param {boolean} f.checkedIn      today's check-in is done
 * @param {number} f.streak          the live streak, in days
 * @param {number} f.shields         streak shields in hand
 * @param {'open'|'done'|null} f.puzzle     today's PokéPuzzle (null: not known yet)
 * @param {'open'|'done'|'none'|null} f.challenge  today's Champion Challenge ('none': a guest has none; null: not known yet)
 * @returns {{ id: string, mood: string, to?: string, action?: 'streak', n?: number } | null}
 */
export function homeNote(f = {}) {
    if (f.isNew) return null;
    const night = f.hour >= 22 || f.hour < 6;
    if (f.battlesWaiting > 0) return { id: f.battlesWaiting === 1 ? 'battleOne' : 'battles', mood: 'desafiador', to: '/battles', n: f.battlesWaiting };
    if (!f.checkedIn && f.streak >= 2 && f.hour >= EVENING) {
        return { id: f.shields > 0 ? 'streakShield' : 'streak', mood: f.shields > 0 ? 'aliviado' : 'expectante', action: 'streak', n: f.streak };
    }
    if (f.puzzle === 'open') return { id: 'puzzle', mood: 'curioso', to: '/pokepuzzle' };
    if (f.challenge === 'open') return { id: 'challenge', mood: 'determinado', to: '/challenge' };
    if (f.checkedIn && f.puzzle === 'done' && (f.challenge === 'done' || f.challenge === 'none')) {
        return night ? { id: 'restNight', mood: 'sonolento' } : { id: 'rest', mood: 'orgulhoso' };
    }
    return null;
}

/**
 * How long a wait has run, as the loader sees it (Loader.jsx): nothing extra
 * at first, a word of company once it is clearly a wait, and an honest "this
 * is taking long" past the point attention drifts (NN/g's 10 s).
 */
export const PATIENCE_STEPS = [4000, 10000];
export const patienceStage = (ms) => (ms >= PATIENCE_STEPS[1] ? 2 : ms >= PATIENCE_STEPS[0] ? 1 : 0);

/**
 * The outfits the trainer can dress him in (Profile → Mascote), the proposal's
 * "variações temáticas". `persona` follows who the trainer said they are.
 * A season's hat still wins on its dates — it is the app's, and it is brief.
 */
export const COSTUMES = ['glasses', 'explorer', 'headphones', 'detective', 'cap', 'bowtie', 'sunglasses', 'mortarboard'];
export const PERSONA_COSTUME = { strategist: 'glasses', traveler: 'explorer', challenger: 'headphones', master: 'bowtie' };

/** The hat a costume choice means for this persona, or null. */
export function costumeHat(choice, personaId) {
    if (choice === 'persona') return PERSONA_COSTUME[personaId] || null;
    return COSTUMES.includes(choice) ? choice : null;
}

/**
 * His face beside the battle's message (2026-11-10): the readout of the
 * moment on screen, from the trainer's side (`mySide`). He gestures, the
 * message speaks — this only names a mood. Rooting for the trainer, never
 * gloating: a rival's faint is a cheer, the trainer's own a wince.
 *
 * @param {object|null} event the timeline's current moment (`battleTimeline`)
 * @param {{mySide?: string, hpPct?: number, yourTurn?: boolean, waiting?: boolean, ended?: boolean, won?: boolean}} facts
 * @returns {string} a `MOODS` name
 */
export function battleMood(event, { mySide = 'p1', hpPct = 100, yourTurn = false, waiting = false, ended = false, won = false } = {}) {
    const mine = event?.side === mySide;
    switch (event?.type) {
        case 'end': return won ? 'radiante' : 'triste';
        case 'intro': return 'desafiador';
        case 'dialogue': return 'desconfiado';
        case 'mega':
        case 'tera':
        case 'zpower': return mine ? 'brilhando' : 'surpreso';
        case 'faint': return mine ? 'triste' : 'animado';
        case 'effect':
            if (event.kind === 'supereffective' || event.kind === 'crit') return mine ? 'assustado' : 'empolgado';
            if (event.kind === 'resisted' || event.kind === 'immune') return mine ? 'aliviado' : 'preocupado';
            if (event.kind === 'miss') return 'surpreso';
            break;
        case 'stat': return (event.amount > 0) === mine ? 'confiante' : 'preocupado';
        case 'status': return mine ? 'preocupado' : 'travesso';
        case 'cure': return mine ? 'aliviado' : 'desconfiado';
        case 'cant': return mine ? 'tonto' : 'travesso';
        case 'hp':
            if (event.heal) return mine ? 'aliviado' : 'desconfiado';
            break;
        default: break;
    }
    if (ended) return won ? 'radiante' : 'triste';
    if (event) return 'concentrado';
    if (waiting) return 'pensando';
    if (yourTurn) return hpPct <= 25 ? 'preocupado' : 'determinado';
    return 'concentrado';
}
