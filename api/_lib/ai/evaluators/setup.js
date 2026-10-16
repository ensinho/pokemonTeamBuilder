import { ownBoosts } from './classify.js';

const STAGE = (n) => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n));

/**
 * Boosting moves (Swords Dance, Nasty Plot, Dragon Dance, Coil, Calm Mind…):
 *
 *   35 × safe × (1 − currentBoost/4) + 15·[the boost would turn a hit into a KO]
 *
 * `safe` = the player's best believed hit on her is under the profile's
 * threshold *and* she is above 60% HP. Worth nothing at +4, never at +6, and
 * never for a stat she has no use for. With the ace as her last Pokémon and a
 * real threat across the field, she stops boosting and attacks.
 */
export const evaluateSetup = (ctx, move) => {
    const { est, me, foe, profile } = ctx;
    const boosts = ownBoosts(move);
    const myMoves = est.moveIdsOf(me).map((id) => est.battle.dex.moves.get(id));
    const hasPhysical = myMoves.some((m) => m.category === 'Physical');
    const hasSpecial = myMoves.some((m) => m.category === 'Special');

    const relevant = Object.entries(boosts).filter(([stat, n]) => n > 0 && (
        (stat === 'atk' && hasPhysical)
        || (stat === 'spa' && hasSpecial)
        || stat === 'spe' || stat === 'def' || stat === 'spd' || stat === 'accuracy'
    ));
    if (!relevant.length) return { score: 0, reason: 'no use for this stat' };

    const current = Math.max(...relevant.map(([stat]) => me.boosts[stat] || 0));
    if (current >= 6) return { score: -Infinity, reason: 'maxed' };
    if (current >= 4) return { score: 0, reason: 'enough boosts' };

    const lastStand = ctx.myAlive === 1 && ctx.threat.exp > 40;
    const safe = !lastStand && ctx.threat.exp < profile.setupThreshold && ctx.myHp > 60 ? 1 : 0;

    // Would the boost turn my best hit into a KO next turn?
    let koAfter = 0;
    for (const m of myMoves) {
        if (m.category === 'Status') continue;
        const stat = m.category === 'Physical' ? 'atk' : 'spa';
        if (!boosts[stat]) continue;
        const d = est.damage(me, foe, m.id);
        if (d.immune || d.ko > 0.5) continue;
        const now = me.boosts[stat] || 0;
        const scaled = d.max * (STAGE(Math.min(6, now + boosts[stat])) / STAGE(now));
        if (scaled * 0.85 >= foe.hp) koAfter = 1;
    }

    let score = 35 * safe * (1 - current / 4) + 15 * koAfter * safe;
    // Speed that flips who moves first is worth having on its own.
    if (boosts.spe > 0 && est.actsFirst(me, null, foe, null) === 0) score += 10 * safe;
    return { score, parts: { safe, current, koAfter }, reason: safe ? 'safe to boost' : 'unsafe' };
};
