import { mayAbsorb } from './abilities.js';

/**
 * Damaging moves. Points ≈ % of the target's HP:
 *
 *   acc × (E[d] + 60·pKO) + 20·pKO·first + 15·[priority ∧ target faster ∧ pKO > .5]
 *   − self-drop, recoil, contact, recharge and charge penalties
 *   × 0.3 if the target *may* have an absorbing ability she hasn't seen
 *
 * A known immunity is not a low score but no option at all (−∞): "Earthquake
 * into a Flying type" is a mistake, not a gamble.
 */
export const evaluateAttack = (ctx, move) => {
    const { est, me, foe, foePred, memory, profile, personality, knowledge } = ctx;
    const d = est.damage(me, foe, move.id);
    if (d.immune) return { score: -Infinity, reason: 'immune' };
    if (move.id === 'dreameater' && foe.status !== 'slp') return { score: -Infinity, reason: 'target awake' };
    if (move.id === 'fakeout' && me.activeMoveActions > 0) return { score: -Infinity, reason: 'fake out only works first' };

    const first = est.actsFirst(me, move.id, foe, foePred.top);
    const pKO = d.ko;
    const parts = { exp: d.expPct, pKO, acc: d.acc, first };
    let score = d.acc * (d.expPct + 60 * pKO) + 20 * pKO * d.acc * first;

    const targetFaster = est.actsFirst(me, null, foe, null) === 0;
    if ((move.priority || 0) > 0 && targetFaster && pKO > 0.5) {
        score += 15;
        parts.priorityFinish = 15;
    }

    // Leaf Storm, Close Combat, Draco Meteor…: a stat drop without the KO. The
    // penalty grows with the drop already taken, so a second Leaf Storm at −2
    // loses to the move that doesn't cut her own power again.
    const dropped = Object.entries(move.self?.boosts || {}).filter(([, n]) => n < 0);
    if (dropped.length && pKO < 0.5) {
        const already = Math.max(...dropped.map(([stat]) => Math.max(0, -(me.boosts[stat] || 0))));
        const penalty = 8 + 12 * already;
        score -= penalty;
        parts.selfDrop = -penalty;
    }
    const recoil = Boolean(move.recoil || move.mindBlownRecoil || move.hasCrashDamage);
    if (recoil && ctx.myHp < 30) {
        score -= 10;
        parts.recoil = -10;
    }
    if (move.hasCrashDamage) score -= (1 - d.acc) * 20;
    if (move.flags?.contact) {
        const info = knowledge.foe.get(foe.species.name);
        if (['roughskin', 'ironbarbs'].includes(info?.ability) || info?.item === 'rockyhelmet') {
            score -= 6;
            parts.contact = -6;
        }
    }
    if (move.self?.volatileStatus === 'mustrecharge' && pKO < 0.9) {
        score -= 15;
        parts.recharge = -15;
    }
    if (move.flags?.charge && me.item !== 'powerherb') {
        score -= 10;
        parts.charge = -10;
    }

    // Secondary effects, valued only when they can matter.
    const chanceScale = me.ability === 'serenegrace' ? 2 : 1;
    for (const secondary of move.secondaries || []) {
        const chance = Math.min(100, (secondary.chance || 100) * chanceScale) / 100;
        if (secondary.status && !foe.status) score += 12 * chance * (1 - pKO);
        if (secondary.volatileStatus === 'flinch' && first === 1) score += 10 * chance * (1 - pKO);
        if (secondary.self?.boosts) score += 6 * chance;
        if (secondary.boosts) score += 4 * chance * (1 - pKO);
    }

    // Answering a boosting player: take the KO now.
    if (memory.setupCount >= 1 && ctx.foeBoostSum > 0 && pKO > 0.5) {
        score *= 1.3;
        parts.punishSetup = 1.3;
    }

    // Their last Pokémon: close it out — priority and accuracy over power.
    if (profile.adaptation === 'full' && ctx.foeAlive === 1) {
        score -= 10 * (1 - d.acc);
        if ((move.priority || 0) > 0 && pKO > 0.3) score += 10;
    }

    // Cold when ahead: no recoil, no coin flips.
    if (ctx.myAlive - ctx.foeAlive >= personality.coldLead) {
        if (recoil) score -= personality.coldRecoilPenalty;
        score -= personality.coldInaccuracyPenalty * (1 - d.acc);
    }

    if (mayAbsorb(ctx, foe, move)) {
        score *= 0.3;
        parts.mayBeImmune = 0.3;
    }

    return { score, parts, reason: pKO > 0.5 ? 'ko' : 'damage' };
};
