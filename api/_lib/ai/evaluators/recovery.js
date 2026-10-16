/**
 * Healing (Recover, Roost, Rest, Wish…): 0.8 × the HP she is missing — but only
 * when the heal can matter. Below 55% HP, and only if the player can't knock
 * her out this turn anyway: healing into a KO is a wasted turn, so she attacks
 * instead. Rest only to cure a status or from low HP; nothing at full HP.
 */
export const evaluateRecovery = (ctx, move) => {
    const { me, myHp, threat } = ctx;
    if (myHp >= 100 && move.id !== 'wish') return { score: -Infinity, reason: 'full HP' };
    if (move.id === 'aquaring' || move.id === 'ingrain') {
        if (me.volatiles[move.id]) return { score: -Infinity, reason: 'already rooted' };
        return { score: threat.exp < 30 ? 8 : 0, reason: 'slow heal' };
    }
    if (move.id === 'rest' && !(me.status || myHp < 40)) return { score: 0, reason: 'rest not needed' };
    if (myHp >= 55) return { score: 0, reason: 'healthy enough' };
    if (threat.exp >= myHp) return { score: 0, reason: 'would be KO\'d anyway' };
    const scale = move.id === 'wish' ? 0.6 : 1;
    return { score: 0.8 * (100 - myHp) * scale, parts: { missing: 100 - myHp }, reason: 'heal' };
};
