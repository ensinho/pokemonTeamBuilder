import { typeChart } from '../constants/types';
import { analyzeTeam } from './teamAnalysis';

/**
 * The pure half of the cozy Home: what the trainer card says about a team, the
 * trainer's ID number, which member answers the meta's leader, and which badge
 * is closest. No store access — the view hands everything in.
 */

export const TEAM_SIZE = 6;
export const TYPE_COUNT = Object.keys(typeChart).length;

/** A five-digit trainer ID, like the games' Trainer Card. Stable per account. */
export const trainerIdFromUid = (uid) => {
    if (!uid) return '00000';
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
        hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
    }
    return String(hash % 100000).padStart(5, '0');
};

/** Morning 5–12, afternoon 12–18, evening 18–22, night otherwise. */
export const dayPeriod = (hour) => {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
};

/**
 * Members of a saved team with their types resolved: a saved slot may lack
 * `types`, so `typesById` (from the Pokédex index) fills the gap.
 */
export const resolveMembers = (team, typesById = new Map()) =>
    (team?.pokemons || [])
        .filter(Boolean)
        .map((p) => ({
            ...p,
            types: Array.isArray(p.types) && p.types.length > 0 ? p.types : (typesById.get(p.id) || []),
        }));

/**
 * `ready` — six members; `draft` — one or none; `missing` — anything between.
 * Coverage is how many of the 18 types the team's own types hit for super
 * effective; the weak point is the type most of the team is weak to.
 */
export const summarizeTeam = (team, typesById) => {
    const members = resolveMembers(team, typesById);
    const size = members.length;
    const missing = Math.max(0, TEAM_SIZE - size);
    const status = size >= TEAM_SIZE ? 'ready' : size <= 1 ? 'draft' : 'missing';

    if (size === 0) {
        return { members, size, missing, status, coverage: 0, weakness: null };
    }

    const { teamAnalysis } = analyzeTeam(members);
    const [weakType, weakCount] = Object.entries(teamAnalysis.weaknesses)
        .sort((a, b) => b[1] - a[1])[0] || [];

    return {
        members,
        size,
        missing,
        status,
        coverage: teamAnalysis.strengths.size,
        weakness: weakType ? { type: weakType, count: weakCount } : null,
    };
};

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** The attack multiplier of `attackType` against a Pokémon of `defenderTypes`. */
export const typeMultiplier = (attackType, defenderTypes = []) =>
    defenderTypes.reduce(
        (acc, defType) => acc * (typeChart[defType]?.damageTaken[capitalize(attackType)] ?? 1),
        1,
    );

/**
 * The member whose own types hit the meta leader hardest (super effective
 * only), or null. Ties keep team order, so the answer is stable.
 */
export const findMetaAnswer = (members = [], leaderTypes = []) => {
    if (leaderTypes.length === 0) return null;
    let best = null;
    let bestMult = 1;
    for (const member of members) {
        for (const type of member.types || []) {
            const mult = typeMultiplier(type, leaderTypes);
            if (mult > bestMult) {
                best = member;
                bestMult = mult;
            }
        }
    }
    return best;
};

/**
 * The locked badge nearest to unlocking: highest percent first, then the
 * smaller target (a 1-of-3 beats a 10-of-30 at the same percent).
 */
export const pickNextBadge = (badges = []) =>
    badges
        .filter((b) => !b.isUnlocked && b.progress)
        .sort((a, b) =>
            (b.progress.percent - a.progress.percent) || (a.progress.target - b.progress.target))[0] || null;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * How long ago a team was edited, in calendar days (not 24h windows: 23:50
 * yesterday is "yesterday" at 00:10). `today`/`yesterday` keep the time,
 * `days` runs to 13, `weeks` to 8, then `date`.
 */
export const editedParts = (iso, now = new Date()) => {
    const date = iso ? new Date(iso) : null;
    if (!date || Number.isNaN(date.getTime())) return null;
    const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    if (days <= 0) return { kind: 'today', time, date };
    if (days === 1) return { kind: 'yesterday', time, date };
    if (days < 14) return { kind: 'days', n: days, date };
    if (days < 57) return { kind: 'weeks', n: Math.floor(days / 7), date };
    return { kind: 'date', date };
};
