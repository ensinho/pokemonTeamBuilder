/**
 * The Primeira Jornada 2.0: a 4-step, value-first interactive onboarding built
 * around the 7 activation principles:
 * 1. Value before effort (`play`: live 4-Pokémon synergy spark using real
 *    `analyzeTeam` / `rateTeam` before asking any question).
 * 2. Useful questions only (`interests`, then adaptive `level` OR `partner` —
 *    zero generic XP lecture, zero premature sign-up gate).
 * 3. One clear action per screen, personal insight & holographic Trainer Pass,
 *    ending with a meaningful result (`blueprint`) that launches straight into
 *    the trainer's first Activation Moment with `JourneyCoach`.
 *
 * Pure on purpose: which screens a trainer sees, in what order, how the mascot
 * reacts, and what activation plan their answers build.
 */
import { asksCompetitiveLevel, derivePersona, normalizeTrainerProfile, personaHero, personaNavOrder } from './trainerProfile.js';
import { PERSONA_COSTUME } from './mascot/assistant.js';
import { XP_RULES, xpForLevel } from './trainerLevel.js';

/** Canonical step universe (welcome flow uses 4 focused screens). */
export const JOURNEY_STEPS = ['hello', 'play', 'interests', 'level', 'partner', 'blueprint'];

/**
 * How the journey was entered:
 * - `welcome`: first run — the hello (the brand intro: the name docks, the mascot
 *   rises and says hi; outside the count) → live spark → interests → calibrate
 *   (level or partner) → blueprint;
 * - `redo`: changing existing answers from Home / Profile — straight to questions → blueprint;
 * - `signIn`: "Já tem conta? Entrar" — account screen → done.
 */
export const JOURNEY_ENTRIES = ['welcome', 'redo', 'signIn'];

/**
 * The screens for these answers. Always 4 steps on first run (3 on redo),
 * adapting Step 3 to either competitive calibration (`level`) or picking a
 * Partner Pokémon (`partner`), never blocking new visitors with a sign-up wall.
 */
export function journeySteps({ interests = [], entry = 'welcome' } = {}) {
    if (entry === 'signIn') return ['account', 'done'];
    const calibrate = asksCompetitiveLevel(interests) ? 'level' : 'partner';
    if (entry === 'redo') return ['interests', calibrate, 'blueprint'];
    return ['hello', 'play', 'interests', calibrate, 'blueprint'];
}

/** Screens without progress chrome: the hello before the steps, the sign-in outcome after. */
const OUTSIDE_PROGRESS = new Set(['hello', 'done']);

/** Step index + total for the segmented step trail. */
export function journeyStepMeta(steps, step) {
    const counted = steps.filter((s) => !OUTSIDE_PROGRESS.has(s));
    const index = counted.indexOf(step);
    return {
        index: index >= 0 ? index : step === 'hello' ? 0 : counted.length - 1,
        total: Math.max(1, counted.length),
    };
}

/** How far along, 0…1, counting the active journey steps. */
export function journeyProgress(steps, step) {
    const counted = steps.filter((s) => !OUTSIDE_PROGRESS.has(s));
    const index = counted.indexOf(step);
    if (index < 0) return step === 'done' ? 1 : 0;
    return (index + 1) / counted.length;
}

/** Whether the screen shows the back arrow and step trail. */
export const journeyHasChrome = (step) => !OUTSIDE_PROGRESS.has(step);

/** The screen after `step`, or null at the end. */
export function nextJourneyStep(steps, step) {
    const index = steps.indexOf(step);
    return index >= 0 && index < steps.length - 1 ? steps[index + 1] : null;
}

/** Whether the trainer can leave a screen yet. */
export function canContinue(step, { interests = [] } = {}) {
    if (step === 'interests') return interests.length > 0;
    return true;
}

/**
 * Step 1 live synergy spark: four iconic Pokémon whose typings make the real
 * team analyzer answer immediately on tap. Starting with Charizard + Garchomp
 * leaves Rock/Ice open; tapping Ferrothorn or Gardevoir visibly closes gaps
 * and lifts the score in real time.
 */
export const SPARK_POOL = [
    { id: 6, name: 'Charizard', types: ['fire', 'flying'], tone: 'fire' },
    { id: 445, name: 'Garchomp', types: ['dragon', 'ground'], tone: 'dragon' },
    { id: 598, name: 'Ferrothorn', types: ['grass', 'steel'], tone: 'grass' },
    { id: 282, name: 'Gardevoir', types: ['psychic', 'fairy'], tone: 'psychic' },
];

export const SPARK_START = [6, 445];

/** Toggle a member in the Step 1 live mini-team (always keeps at least 1). */
export function toggleSparkMember(selected, id) {
    const has = selected.includes(id);
    if (has && selected.length <= 1) return selected;
    const next = has ? selected.filter((x) => x !== id) : [...selected, id];
    return SPARK_POOL.map((p) => p.id).filter((x) => next.includes(x));
}

/**
 * Step 3B Partner Pokémon choices (for non-competitive paths) — six distinct
 * types that immediately personalize the Home greeting, Hero aura & Trainer Card.
 */
export const PARTNER_CHOICES = [
    { id: 25, name: 'Pikachu', type: 'electric' },
    { id: 94, name: 'Gengar', type: 'ghost' },
    { id: 133, name: 'Eevee', type: 'normal' },
    { id: 6, name: 'Charizard', type: 'fire' },
    { id: 448, name: 'Lucario', type: 'fighting' },
    { id: 282, name: 'Gardevoir', type: 'psychic' },
];

/** The mascot's face as each interest is picked (a hop with it). */
export const INTEREST_MOOD = { competitive: 'determinado', franchise: 'animado', minigames: 'travesso' };
/** The mascot's face for each competitive level (he jumps for the ranked). */
export const LEVEL_MOOD = { new: 'feliz', casual: 'animado', ranked: 'confiante' };

/** How the mascot looks on arriving at each screen. */
export const STEP_LOOK = {
    hello: { mood: 'feliz' }, // he waves once he has risen (FirstJourney)
    play: { mood: 'animado', play: 'wave' },
    interests: { mood: 'curioso' },
    level: { mood: 'determinado' },
    partner: { mood: 'feliz', play: 'hop' },
    blueprint: { mood: 'radiante', play: 'celebrate' },
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
 * The #1 Activation Moment for this trainer's profile: one unmistakable action
 * that lands them directly in value with the matching JourneyCoach mission.
 */
const ACTIVATION_BY_PERSONA = {
    strategist: {
        id: 'builder',
        path: '/builder',
        missionId: 'addPokemon',
    },
    traveler: {
        id: 'pokedex',
        path: '/pokedex',
        missionId: 'pokedex',
    },
    challenger: {
        id: 'challenge',
        path: '/challenge',
        missionId: 'challenge',
    },
    master: {
        id: 'challenge',
        path: '/challenge',
        missionId: 'challenge',
    },
};

export function journeyActivation(profile) {
    const persona = derivePersona(profile);
    const id = persona?.id || 'challenger';
    const base = ACTIVATION_BY_PERSONA[id] || ACTIVATION_BY_PERSONA.challenger;
    const navTop = personaNavOrder(profile)[0] || 'teamBuilding';
    const heroKind = personaHero({ ...profile, answeredAt: profile?.answeredAt || 1 });
    return {
        ...base,
        personaId: id,
        navTop,
        heroKind,
    };
}

/**
 * Kept for backwards-compatible XP calculations on account sign-up copy.
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
