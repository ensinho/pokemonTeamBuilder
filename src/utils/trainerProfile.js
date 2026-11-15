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
 * The questions are few on purpose (Hick): what brings you here (one or
 * both of two), and — only for the competitive — how deep and which format.
 *
 * Two interests since 2026-11-15 (Enzo: "concentrar o perfil de minijogos e o
 * perfil de franquias, para focar nos minigames"): playing the games and the
 * minigames became one — `minigames`, the Desafiante — because the site's
 * daily games (the Champion Challenge, the PokéPuzzle) are what people come
 * back for. A stored `franchise` is read as `minigames` (`LEGACY_INTERESTS`),
 * so nobody who answered before has to answer again.
 */

export const TRAINER_PROFILE_VERSION = 1;

/** What a trainer can say they came for. Both is the common case. */
export const INTERESTS = ['competitive', 'minigames'];

/** Interests the onboarding no longer asks, read as the one that absorbed them. */
export const LEGACY_INTERESTS = { franchise: 'minigames' };

/** How deep into competitive play, asked only when `competitive` is picked. */
export const COMPETITIVE_LEVELS = ['new', 'casual', 'ranked'];

/** Singles (Smogon), doubles (VGC), or both. */
export const BATTLE_FORMATS = ['singles', 'doubles', 'both'];

/**
 * The personas. `art` is the National Dex id drawn for it (official artwork),
 * `tone` the type colour its card and scene take. One per interest, plus the
 * trainer who picked both. `traveler` is no longer derived (2026-11-15) — it
 * stays so another trainer's older public profile still reads as a persona.
 */
export const PERSONAS = {
    strategist: { id: 'strategist', interest: 'competitive', art: 445, tone: 'dragon' },
    traveler: { id: 'traveler', interest: null, art: 25, tone: 'electric', legacy: true },
    challenger: { id: 'challenger', interest: 'minigames', art: 150, tone: 'psychic' },
    master: { id: 'master', interest: null, art: 94, tone: 'ghost' },
};

/** The persona each interest leads to, in priority order. */
const PERSONA_BY_INTEREST = { competitive: 'strategist', minigames: 'challenger' };

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
    const given = Array.isArray(value.interests)
        ? value.interests.map((interest) => LEGACY_INTERESTS[interest] || interest)
        : [];
    const interests = INTERESTS.filter((interest) => given.includes(interest));
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
const orderedInterests = (profile) => {
    const given = (profile?.interests || []).map((i) => LEGACY_INTERESTS[i] || i);
    return INTERESTS.filter((i) => given.includes(i));
};

/**
 * Who the trainer is: `{ id, primary, interests }`. Both interests make a
 * `master`; otherwise the persona follows the one interest. Null with no interests — the app keeps its defaults.
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
    tierList: { path: '/tier-list', labelKey: 'nav.tierList' },
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
    // The games and the minigames, one interest since 2026-11-15: the daily
    // two first, then what a player makes and looks up.
    minigames: ['challenge', 'pokepuzzle', 'tierList', 'generationQuiz', 'battles', 'pokedex', 'gyms'],
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

/** Where a trainer goes next once their own picks are already on the Home, most useful first. */
const MORE_BY_INTEREST = {
    competitive: ['meta', 'damageCalc', 'speedTiers', 'bestTeams', 'guides', 'types', 'tournaments'],
    minigames: ['tierList', 'generationQuiz', 'pokedex', 'gyms', 'types', 'moves'],
};

/**
 * The Home's "Para você" doors (2026-11-12, "um assunto, um lugar"): the
 * persona's picks minus what the hero and the Rota do dia already show today
 * (`exclude`), topped up from the persona's next destinations so the row is
 * always `max` long. A Challenger's four picks were the PokéPuzzle, the
 * Champion and the battles — all three already above the doors.
 */
export function homeDoors(profile, { exclude = [], max = 4 } = {}) {
    const interests = orderedInterests(profile);
    if (interests.length === 0) return [];
    const skip = new Set(exclude);
    const queue = [
        ...personaPicks(profile, Object.keys(PICK_DESTINATIONS).length),
        ...interests.flatMap((interest) => MORE_BY_INTEREST[interest] || []),
        ...Object.keys(PICK_DESTINATIONS),
    ];
    return [...new Set(queue)].filter((key) => !skip.has(key)).slice(0, max);
}

// ── The rail ───────────────────────────────────────────────────────────────

/** The rail's folding sections, in the order the app ships them. */
export const DEFAULT_NAV_ORDER = ['teamBuilding', 'guessing', 'database', 'dashboard'];

/** The sections an interest pulls to the top. */
const NAV_BY_INTEREST = {
    competitive: ['teamBuilding'],
    minigames: ['guessing', 'database'],
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
 * The phone dock's fourth slot. The daily puzzle held it from 2026-09-24; the
 * Champion Challenge took it on 2026-11-09 (Enzo), for anyone who plays or has
 * not said — the PokéPuzzle moved into the Mais sheet. A trainer who came only
 * for competitive gets Meta there. (The type chart held it for the Traveler
 * until the games joined the minigames, 2026-11-15.)
 */
export function personaDockSlot(profile) {
    const interests = orderedInterests(profile);
    if (interests.length === 0 || interests.includes('minigames')) return 'challenge';
    return 'meta';
}

// ── Journeys ───────────────────────────────────────────────────────────────

const JOURNEYS_BY_INTEREST = {
    competitive: ['first-team', 'strategy'],
    minigames: ['league', 'champions', 'first-steps'],
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
 * default (the current VGC). A singles player starts on OU. Applied only when
 * the builder has no choice stored yet. (The Traveler started in playthrough
 * mode until 2026-11-15; the Desafiante builds for the Champion Challenge,
 * which battles with competitive sets.)
 */
export function builderRegulationSeed(profile) {
    const interests = orderedInterests(profile);
    if (interests.length === 0) return null;
    if (!interests.includes('competitive')) return null;
    return profile.battleFormat === 'singles' ? SINGLES_DEFAULT_FORMAT : null;
}

/** Whether the onboarding should ask the competitive question. */
export const asksCompetitiveLevel = (interests = []) => interests.includes('competitive');

// ── Home order ─────────────────────────────────────────────────────────────

/**
 * The Home's main blocks, in the order a persona reaches for them
 * (2026-11-05, round 3): the Challenger's day (puzzle + Champion) comes
 * first, the Strategist's teams first. Anyone else — no profile, the Master —
 * keeps the shipped order. Block ids are CozyHomeView's.
 */
export const DEFAULT_HOME_ORDER = ['forYou', 'yourDay', 'teams'];

const HOME_ORDER_BY_PERSONA = {
    challenger: ['yourDay', 'forYou', 'teams'],
    strategist: ['teams', 'forYou', 'yourDay'],
};

export function personaHomeOrder(profile) {
    const persona = hasAnsweredProfile(profile) ? derivePersona(profile) : null;
    return (persona && HOME_ORDER_BY_PERSONA[persona.id]) || DEFAULT_HOME_ORDER;
}

/**
 * The compact cards of "Seu dia", in the order a persona reads them
 * (2026-11-12). `battles` shows only when a friend's battle waits on the
 * trainer, so it leads whenever it shows; `invite` is the Challenger's
 * "challenge a friend" when nothing waits. The Strategist reads the meta
 * first; the Challenger trades the meta for a friend to battle.
 */
export const DEFAULT_DAY_CARDS = ['battles', 'puzzle', 'badge', 'meta'];

const DAY_CARDS_BY_PERSONA = {
    strategist: ['battles', 'meta', 'puzzle', 'badge'],
    challenger: ['battles', 'puzzle', 'invite', 'badge'],
};

export function personaDayCards(profile) {
    const persona = hasAnsweredProfile(profile) ? derivePersona(profile) : null;
    return (persona && DAY_CARDS_BY_PERSONA[persona.id]) || DEFAULT_DAY_CARDS;
}

/**
 * What the Home's one hero card is about (2026-11-09, the "of the day" hero —
 * .claude/skills/app-screens). Since 2026-11-15 (Enzo: "focar a proposta do
 * site nos minigames… desde a home") it is the day's Champion battle for
 * everyone — no profile, the Desafiante, the Master — except the trainer who
 * came only for competitive, whose hero stays the team in progress. The rail
 * of the day's cards leaves the Champion out when she is the hero, so nothing
 * shows twice. `badges` (the Traveler's next gym leader) is no longer chosen.
 */
export const HOME_HEROES = ['team', 'challenge', 'badges'];

export function personaHero(profile) {
    const persona = hasAnsweredProfile(profile) ? derivePersona(profile) : null;
    return persona?.id === 'strategist' ? 'team' : 'challenge';
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
