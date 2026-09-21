/**
 * How a batch of "needs your attention" battles becomes *one* message.
 *
 * Two things go wrong without this. A trainer who opens the app after a day
 * away used to get one OS banner per waiting battle, all at once, which is
 * noise rather than information; and the same burst could fire again on a
 * reconnect. Pure on purpose — the decision is what's worth testing, the
 * showing is not.
 *
 * @param {Array<{battleId: string, notice: object}>} fresh
 * @returns {null|{kind: 'single', battleId: string, notice: object}|{kind: 'group', count: number}}
 */
export const digestAttention = (fresh) => {
    if (!Array.isArray(fresh) || fresh.length === 0) return null;
    if (fresh.length === 1) return { kind: 'single', battleId: fresh[0].battleId, notice: fresh[0].notice };
    return { kind: 'group', count: fresh.length };
};

/** Where a digest should take the trainer when they tap it. */
export const digestUrl = (digest) => (
    digest?.kind === 'single' ? `/battles/${digest.battleId}` : '/battles'
);
