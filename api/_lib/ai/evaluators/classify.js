/**
 * Which evaluator owns a move. Each move goes to exactly one, so scores never
 * double count; a damaging move's secondary effects are the attack
 * evaluator's business, not the status one's.
 */

const RECOVERY = new Set([
    'recover', 'roost', 'softboiled', 'slackoff', 'milkdrink', 'moonlight', 'morningsun', 'synthesis',
    'shoreup', 'healorder', 'junglehealing', 'lunarblessing', 'strengthsap', 'rest', 'wish', 'aquaring', 'ingrain',
]);
const HAZARDS = new Set(['stealthrock', 'spikes', 'toxicspikes', 'stickyweb']);
const PHAZE = new Set(['roar', 'whirlwind']);

export const isProtect = (move) => Boolean(move.stallingMove) && move.id !== 'endure';

const raisesOwnStats = (move) => {
    const own = move.target === 'self' || move.target === 'adjacentAllyOrSelf' ? move.boosts : move.self?.boosts;
    return Boolean(own) && Object.values(own).some((n) => n > 0);
};

/** @returns {'attack'|'setup'|'status'|'recovery'|'utility'|'other'} */
export const classify = (move) => {
    if (move.category !== 'Status') return 'attack';
    if (RECOVERY.has(move.id) || (move.heal && move.target === 'self')) return 'recovery';
    if (raisesOwnStats(move)) return 'setup';
    if (move.id === 'haze' || PHAZE.has(move.id) || isProtect(move) || HAZARDS.has(move.id) || move.weather || move.terrain) return 'utility';
    if (move.status || move.volatileStatus === 'confusion') return 'status';
    return 'other';
};

export const ownBoosts = (move) => (move.target === 'self' || move.target === 'adjacentAllyOrSelf' ? move.boosts : move.self?.boosts) || {};

export { HAZARDS, PHAZE };
