/**
 * The trainer profile (2026-11-05): what a trainer told the onboarding they
 * came for, and everything the app derives from it — the persona, the order
 * of the rail, the Home's "Para você" picks, the journeys worth suggesting
 * and the builder's first regulation.
 *
 * Pure on purpose, like journeys.js: the answers are stored once (useAuthStore
 * `trainerProfile`, localStorage + the preferences doc) and every surface asks
 * this module what they mean, so the rail and the Home can never disagree
 * about who is looking. Copy lives under `onboarding.*` in translations.
 *
 * The questions are few on purpose (Hick): what brings you here (any of
 * three), and — only for the competitive — how deep and which format.
 */

export const TRAINER_PROFILE_VERSION = 1;

/** What a trainer can say they came for. More than one is the common case. */
export const INTERESTS = ['competitive', 'franchise', 'minigames'];

/** How deep into competitive play, asked only when `competitive` is picked. */
export const COMPETITIVE_LEVELS = ['new', 'casual', 'ranked'];

/** Singles (Smogon), doubles (VGC), or both. */
export const BATTLE_FORMATS = ['singles', 'doubles', 'both'];

/**
 * The personas. `art` is the National Dex id drawn for it (official artwork),
 * `tone` the type colour its card and scene take. One per interest, plus the
 * trainer who picked all three.
 */
export const PERSONAS = {
    strategist: { id: 'strategist', interest: 'competitive', art: 445, tone: 'dragon' },
    traveler: { id: 'traveler', interest: 'franchise', art: 25, tone: 'electric' },
    challenger: { id: 'challenger', interest: 'minigames', art: 150, tone: 'psychic' },
    master: { id: 'master', interest: null, art: 94, tone: 'ghost' },
};

/** The persona each interest leads to, in priority order. */
const PERSONA_BY_INTEREST = { competitive: 'strategist', franchise: 'traveler', minigames: 'challenger' };

/** The competitive level drawn as an evolution line: Gible → Gabite → Garchomp. */
export const LEVEL_ART = { new: 443, casual: 444, ranked: 445 };

/** An empty profile: nothing answered, nothing skipped. */
export const EMPTY_TRAINER_PROFILE = Object.freeze({
    version: TRAINER_PROFILE_VERSION,
    interests: [],
    competitiveLevel: null,
    battleFormat: null,
    answeredAt: null,
    skippedAt: null,
});

const isTime = (value) => Number.isFinite(value) && value > 0;

/**
 * A stored or hand-edited value, made safe: unknown interests dropped, the
 * competitive answers kept only while `competitive` is an interest, times
 * kept only if they are times. Never throws.
 */
export function normalizeTrainerProfile(raw) {
    const value = raw && typeof raw === 'object' ? raw : {};
    const interests = INTERESTS.filter((interest) => Array.isArray(value.interests) && value.interests.includes(interest));
    const isCompetitive = interests.includes('competitive');
    return {
        version: TRAINER_PROFILE_VERSION,
        interests,
        competitiveLevel: isCompetitive && COMPETITIVE_LEVELS.includes(value.competitiveLevel) ? value.competitiveLevel : null,
        battleFormat: isCompetitive && BATTLE_FORMATS.includes(value.battleFormat) ? value.battleFormat : null,
        answeredAt: isTime(value.answeredAt) ? value.answeredAt : null,
        skippedAt: isTime(value.skippedAt) ? value.skippedAt : null,
    };
}

/** True once the trainer finished the onboarding. */
export const hasAnsweredProfile = (profile) => isTime(profile?.answeredAt);

/**
 * Whether the onboarding should offer itself on its own: never answered and
 * never turned down. A trainer who closed it can still open it from the Home
 * or the Profile — it just never comes back uninvited.
 */
export const needsTrainerProfile = (profile) => !hasAnsweredProfile(profile) && !isTime(profile?.skippedAt);

/**
 * Two copies of the profile (this device, the account): the one touched last
 * wins, whole — answers are a set, mixing two sets would invent a third.
 */
export function mergeTrainerProfiles(local, remote) {
    const a = normalizeTrainerProfile(local);
    const b = normalizeTrainerProfile(remote);
    const touched = (p) => Math.max(p.answeredAt || 0, p.skippedAt || 0);
    return touched(b) > touched(a) ? b : a;
}

/** The interests in their canonical order, the first being the primary. */
const orderedInterests = (profile) => INTERESTS.filter((i) => profile?.interests?.includes(i));

/**
 * Who the trainer is: `{ id, primary, interests }`. All three interests make a
 * `master`; otherwise the persona follows the first interest in priority
 * order (competitive → franchise → minigames) and the rest ride along as
 * secondary tags. Null with no interests — the app keeps its defaults.
 */
export function derivePersona(profile) {
    const interests = orderedInterests(profile);
    if (interests.length === 0) return null;
    if (interests.length === INTERESTS.length) {
        return { ...PERSONAS.master, primary: interests[0], interests };
    }
    return { ...PERSONAS[PERSONA_BY_INTEREST[interests[0]]], primary: interests[0], interests };
}

// ── Destinations ───────────────────────────────────────────────────────────

/**
 * Every place a pick can lead, with the `nav.*` key that names it. The shell's
 * rail keeps its own list for icons and badges; this table only says where a
 * persona should look first.
 */
export const PICK_DESTINATIONS = {
    builder: { path: '/builder', labelKey: 'nav.builder' },
    pokedex: { path: '/pokedex', labelKey: 'nav.pokemonList' },
    meta: { path: '/meta', labelKey: 'nav.meta' },
    bestTeams: { path: '/best-teams', labelKey: 'nav.bestTeams' },
    tournaments: { path: '/tournaments', labelKey: 'nav.tournaments' },
    damageCalc: { path: '/damage-calculator', labelKey: 'nav.damageCalc' },
    speedTiers: { path: '/speed-tiers', labelKey: 'nav.speedTiers' },
    guides: { path: '/guides', labelKey: 'nav.guides' },
    types: { path: '/types', labelKey: 'nav.types' },
    gyms: { path: '/gyms', labelKey: 'nav.gyms' },
    moves: { path: '/moves', labelKey: 'nav.moves' },
    pokepuzzle: { path: '/pokepuzzle', labelKey: 'nav.pokepuzzle' },
    challenge: { path: '/challenge', labelKey: 'nav.challenge' },
    generationQuiz: { path: '/quiz', labelKey: 'nav.quiz' },
    battles: { path: '/battles', labelKey: 'nav.battles' },
};

/** What each interest reaches for first, most useful first. */
const PICKS_BY_INTEREST = {
    competitive: {
        new: ['guides', 'builder', 'types', 'damageCalc'],
        casual: ['builder', 'damageCalc', 'bestTeams', 'meta'],
        ranked: ['meta', 'speedTiers', 'tournaments', 'damageCalc'],
    },
    franchise: ['pokedex', 'builder', 'gyms', 'types'],
    minigames: ['pokepuzzle', 'challenge', 'generationQuiz', 'battles'],
};

const picksFor = (interest, profile) => {
    if (interest !== 'competitive') return PICKS_BY_INTEREST[interest];
    return PICKS_BY_INTEREST.competitive[profile?.competitiveLevel || 'casual'];
};

/**
 * The Home's "Para você" shortcuts: up to `max` destination keys. Two from the
 * primary interest, then one from each other interest, then the primary's
 * rest — so a trainer with two interests sees both in the first row.
 */
export function personaPicks(profile, max = 4) {
    const interests = orderedInterests(profile);
    if (interests.length === 0) return [];
    const lists = interests.map((interest) => picksFor(interest, profile));
    const queue = [
        ...lists[0].slice(0, 2),
        ...lists.slice(1).map((list) => list[0]),
        ...lists[0].slice(2),
        ...lists.slice(1).flatMap((list) => list.slice(1)),
    ];
    return [...new Set(queue)].slice(0, max);
}

// ── The rail ───────────────────────────────────────────────────────────────

/** The rail's folding sections, in the order the app ships them. */
export const DEFAULT_NAV_ORDER = ['teamBuilding', 'guessing', 'database', 'dashboard'];

/** The sections an interest pulls to the top. */
const NAV_BY_INTEREST = {
    competitive: ['teamBuilding'],
    franchise: ['database'],
    minigames: ['guessing', 'dashboard'],
};

/**
 * The order of the rail's sections for this trainer: what their interests
 * pull up, in interest order, then the rest as shipped. Sections unknown to
 * the persona (admin) keep their place after these.
 */
export function personaNavOrder(profile) {
    const pulled = orderedInterests(profile).flatMap((interest) => NAV_BY_INTEREST[interest]);
    return [...new Set([...pulled, ...DEFAULT_NAV_ORDER])];
}

/** Sort a list of `{ key }` sections by `personaNavOrder`, unknown keys last, stable. */
export function sortNavGroups(groups, profile) {
    const order = personaNavOrder(profile);
    const rank = (key) => {
        const index = order.indexOf(key);
        return index === -1 ? order.length : index;
    };
    return groups
        .map((group, index) => ({ group, index }))
        .sort((a, b) => rank(a.group.key) - rank(b.group.key) || a.index - b.index)
        .map(({ group }) => group);
}

/**
 * The phone dock's fourth slot. The daily puzzle earned it (2026-09-24) and
 * keeps it for anyone who plays, or who has not said; a trainer who came only
 * for competitive gets Meta there, one who only plays the games the type chart.
 */
export function personaDockSlot(profile) {
    const interests = orderedInterests(profile);
    if (interests.length === 0 || interests.includes('minigames')) return 'pokepuzzle';
    if (interests[0] === 'competitive') return 'meta';
    return 'types';
}

// ── Journeys ───────────────────────────────────────────────────────────────

const JOURNEYS_BY_INTEREST = {
    competitive: ['first-team', 'strategy'],
    franchise: ['first-steps', 'first-team'],
    minigames: ['league', 'champions'],
};

/** The journey ids this trainer's interests point at, in interest order. */
export function recommendedJourneyIds(profile) {
    return [...new Set(orderedInterests(profile).flatMap((interest) => JOURNEYS_BY_INTEREST[interest]))];
}

/**
 * The journey to suggest next: the first unfinished recommended one, or —
 * with no profile or everything recommended done — the first unfinished at
 * all (journeys.js `currentJourney`). Levels stay an order, not a lock.
 */
export function suggestedJourney(journeys = [], profile) {
    const recommended = recommendedJourneyIds(profile);
    for (const id of recommended) {
        const journey = journeys.find((j) => j.id === id && !j.isComplete);
        if (journey) return journey;
    }
    return journeys.find((j) => !j.isComplete) || null;
}

// ── The builder ────────────────────────────────────────────────────────────

/** The regulation a singles player starts on (public/data/usage-index.json). */
export const SINGLES_DEFAULT_FORMAT = 'gen9ou';

/**
 * The builder's first regulation for this trainer, or null to keep the app's
 * default (the current VGC). Someone who only plays the games starts in
 * playthrough mode ('none', constants/regulations.js); a singles player on
 * OU. Applied only when the builder has no choice stored yet.
 */
export function builderRegulationSeed(profile) {
    const interests = orderedInterests(profile);
    if (interests.length === 0) return null;
    if (!interests.includes('competitive')) return interests.includes('franchise') ? 'none' : null;
    return profile.battleFormat === 'singles' ? SINGLES_DEFAULT_FORMAT : null;
}

/** Whether the onboarding should ask the competitive question. */
export const asksCompetitiveLevel = (interests = []) => interests.includes('competitive');

// ── Home order ─────────────────────────────────────────────────────────────

/**
 * The Home's main blocks, in the order a persona reaches for them
 * (2026-11-05, round 3): the Challenger's day (puzzle + Champion) comes
 * first, the Strategist's teams first, the Traveler's places to go and then
 * the teams of their run, the day's games last. Anyone else — no profile, the
 * Master — keeps the shipped order. Block ids are CozyHomeView's.
 */
export const DEFAULT_HOME_ORDER = ['forYou', 'yourDay', 'teams'];

const HOME_ORDER_BY_PERSONA = {
    challenger: ['yourDay', 'forYou', 'teams'],
    strategist: ['teams', 'forYou', 'yourDay'],
    // The Traveler's own block leads: the Badge Case (components/home/BadgeCase.jsx).
    traveler: ['badges', 'forYou', 'teams', 'yourDay'],
};

export function personaHomeOrder(profile) {
    const persona = hasAnsweredProfile(profile) ? derivePersona(profile) : null;
    return (persona && HOME_ORDER_BY_PERSONA[persona.id]) || DEFAULT_HOME_ORDER;
}

/**
 * What the Home's one hero card is about (2026-11-09, the "of the day" hero —
 * .claude/skills/app-screens): the team in progress for most trainers; the
 * day's Champion battle for the one who came for the minigames; the next gym
 * leader of the game being played for the one who came for the games (Enzo,
 * 2026-11-09). The rail of the day's cards leaves the Champion out when she
 * is the hero, so nothing shows twice.
 */
export const HOME_HEROES = ['team', 'challenge', 'badges'];

const HERO_BY_PERSONA = { challenger: 'challenge', traveler: 'badges' };

export function personaHero(profile) {
    const persona = hasAnsweredProfile(profile) ? derivePersona(profile) : null;
    return HERO_BY_PERSONA[persona?.id] || 'team';
}

/** Whether the builder should coach (competitive, just starting). */
export const isBeginnerTrainer = (profile) => hasAnsweredProfile(profile) && profile?.competitiveLevel === 'new';

/** Whether the builder should lead with the meta (competitive, ranked). */
export const isRankedTrainer = (profile) => hasAnsweredProfile(profile) && profile?.competitiveLevel === 'ranked';

/**
 * The search's quick links with an empty query (⌘K, 2026-11-05): the
 * persona's picks first, in their order, then every other destination as
 * the shell listed it. `destinations` are `{ path, … }`; nothing is dropped.
 */
export function personaQuickLinks(destinations = [], profile) {
    if (!hasAnsweredProfile(profile)) return destinations;
    const paths = personaPicks(profile, 8).map((key) => PICK_DESTINATIONS[key]?.path).filter(Boolean);
    const rank = (d) => {
        const i = paths.indexOf(d.path);
        return i === -1 ? paths.length : i;
    };
    return destinations
        .map((d, index) => ({ d, index }))
        .sort((a, b) => rank(a.d) - rank(b.d) || a.index - b.index)
        .map(({ d }) => d);
}
