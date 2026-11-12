/**
 * The Primeira Jornada (2026-11-12): the trainer-profile onboarding and the
 * account, merged into one conversation with the 3D mascot. Enzo approved the
 * proposal ("QUE INCRÍVEL") built from a reference video's three frames — the
 * mascot peeking from the edge, the answer as a white pill with a check, one
 * glowing promise over the mascot — and from the order that works in the
 * market (Duolingo): value first, the questions next, the account last and
 * optional. `components/onboarding/FirstJourney.jsx` draws it.
 *
 * Pure: which screens a trainer sees, in what order, how far along they are,
 * and how the mascot looks on each — the component only animates it.
 */
import { asksCompetitiveLevel, derivePersona, normalizeTrainerProfile } from './trainerProfile.js';
import { PERSONA_COSTUME } from './mascot/assistant.js';
import { XP_RULES, xpForLevel } from './trainerLevel.js';

/** Every screen, in order. */
export const JOURNEY_STEPS = ['peek', 'hello', 'tour', 'interests', 'level', 'xp', 'persona', 'account', 'done'];

/**
 * How the journey was entered:
 * - `welcome`: the first run (the landing's way out, or Home offering it);
 * - `redo`: a trainer changing answers they already gave (Profile, Home) —
 *   straight to the questions, no tour, no promise;
 * - `signIn`: "Já tem conta? Entrar" — the account screen, then done.
 */
export const JOURNEY_ENTRIES = ['welcome', 'redo', 'signIn'];

/**
 * The screens for these answers. The level is asked only of the competitive;
 * the account only of a guest (someone signed in has one).
 */
export function journeySteps({ interests = [], entry = 'welcome', isAnonymous = true } = {}) {
    if (entry === 'signIn') return ['account', 'done'];
    const level = asksCompetitiveLevel(interests);
    if (entry === 'redo') return ['interests', ...(level ? ['level'] : []), 'persona', 'done'];
    return JOURNEY_STEPS.filter((step) => (step !== 'level' || level) && (step !== 'account' || isAnonymous));
}

/** Screens that are a moment, not a question: no back arrow, no progress. */
const OUTSIDE_PROGRESS = new Set(['peek', 'hello', 'done']);

/** How far along, 0…1, counting only the question screens. */
export function journeyProgress(steps, step) {
    const counted = steps.filter((s) => !OUTSIDE_PROGRESS.has(s));
    const index = counted.indexOf(step);
    if (index < 0) return step === 'done' ? 1 : 0;
    return (index + 1) / counted.length;
}

/** Whether the screen shows the back arrow and the progress bar. */
export const journeyHasChrome = (step) => !OUTSIDE_PROGRESS.has(step);

/** The screen after `step`, or null at the end. */
export function nextJourneyStep(steps, step) {
    const index = steps.indexOf(step);
    return index >= 0 && index < steps.length - 1 ? steps[index + 1] : null;
}

/** Whether the trainer can leave a question screen yet. */
export function canContinue(step, { interests = [] } = {}) {
    if (step === 'interests') return interests.length > 0;
    return true;
}

/**
 * The tour: real screens of the app (public/onboarding/, phone captures),
 * each with what the mascot does beside it. Short on purpose — four is
 * enough to say "this is what is here" without becoming a manual.
 */
export const JOURNEY_TOUR = [
    { id: 'builder', image: 'tour-builder.webp', mood: 'concentrado', pose: 'analisando' },
    { id: 'pokedex', image: 'tour-pokedex.webp', mood: 'concentrado', pose: 'lendoPokedex' },
    { id: 'puzzle', image: 'tour-puzzle.webp', mood: 'pensando', pose: 'matutando' },
    { id: 'meta', image: 'tour-meta.webp', mood: 'curioso', pose: 'investigando' },
];
/** How long a tour card stays before the next, ms. */
export const TOUR_MS = 3200;

/** The mascot's face as each interest is picked (a hop with it). */
export const INTEREST_MOOD = { competitive: 'determinado', franchise: 'animado', minigames: 'travesso' };
/** The mascot's face for each competitive level (he jumps for the ranked). */
export const LEVEL_MOOD = { new: 'feliz', casual: 'animado', ranked: 'confiante' };

/** How the mascot looks on arriving at each screen. */
export const STEP_LOOK = {
    peek: { mood: 'curioso' },
    hello: { mood: 'feliz', play: 'wave' },
    tour: { mood: 'concentrado' },
    interests: { mood: 'feliz' },
    level: { mood: 'determinado' },
    xp: { mood: 'brilhando', play: 'hop' },
    persona: { mood: 'radiante', play: 'celebrate' },
    account: { mood: 'animado' },
    done: { mood: 'radiante', play: 'jump' },
};

/**
 * The answers as a profile, and who they make: the persona and the costume
 * the mascot wears from the reveal on (PERSONA_COSTUME — the same outfits as
 * Profile → Mascote's "Do perfil").
 */
export function journeyAnswers({ interests = [], level = null, format = 'both' } = {}) {
    const profile = normalizeTrainerProfile({ interests, competitiveLevel: level || 'casual', battleFormat: format });
    const persona = derivePersona(profile);
    return { profile, persona, hat: persona ? PERSONA_COSTUME[persona.id] || null : null };
}

/**
 * The XP screen's figures — the real rules (utils/trainerLevel.js), never a
 * made-up number: one mission against the first level, and what the rest pay.
 */
export function journeyXp() {
    const toNext = xpForLevel(2) - xpForLevel(1);
    return {
        mission: XP_RULES.mission,
        journey: XP_RULES.journey,
        badge: XP_RULES.badge,
        toNext,
        share: Math.min(1, XP_RULES.mission / (toNext || 1)),
    };
}
