import { COSMETICS, COSMETICS_BY_ID, getCosmetic } from '../constants/cosmetics';

/**
 * Rewards logic (2026-10-17, docs/modules/rewards.md). Pure: which cosmetics a
 * trainer's progress unlocks, what comes next on the level track, how a frame
 * is drawn. useRewardsStore records the answers so nothing here runs on render
 * for the views that only show what is equipped.
 *
 * `progress` is `{ level, badgeIds, journeysDone, checkins }`.
 */

export const isRewardEarned = (item, progress = {}) => {
    const unlock = item?.unlock;
    if (!unlock) return false;
    switch (unlock.type) {
        case 'level': return (progress.level || 1) >= unlock.level;
        case 'badge': return (progress.badgeIds || []).includes(unlock.badgeId);
        case 'journeys': return (progress.journeysDone || 0) >= unlock.count;
        case 'checkins': return (progress.checkins || 0) >= unlock.count;
        default: return false;
    }
};

/** Ids `progress` earns that `unlocked` (a map id → day) does not hold yet, in catalogue order. */
export const newlyEarnedRewards = (progress, unlocked = {}) =>
    COSMETICS.filter((item) => !unlocked[item.id] && isRewardEarned(item, progress)).map((item) => item.id);

/**
 * The level track: every level that pays something, in order, with its items.
 * Levels with no item are left out — the track is a list of things to look
 * forward to, not a ruler.
 */
export const levelTrack = () => {
    const byLevel = new Map();
    for (const item of COSMETICS) {
        if (item.unlock.type !== 'level') continue;
        if (!byLevel.has(item.unlock.level)) byLevel.set(item.unlock.level, []);
        byLevel.get(item.unlock.level).push(item);
    }
    return [...byLevel.entries()].sort((a, b) => a[0] - b[0]).map(([level, items]) => ({ level, items }));
};

/** The next level on the track above `level`, or null at the end of it. */
export const nextLevelReward = (level = 1) => levelTrack().find((step) => step.level > level) || null;

/** How an item is unlocked, as a translation key + params (`rewards.unlock.*`). */
export const unlockLabel = (item) => {
    const unlock = item?.unlock || {};
    switch (unlock.type) {
        case 'level': return { key: 'rewards.unlock.level', params: { n: unlock.level } };
        case 'badge': return { key: 'rewards.unlock.badge', params: { badgeId: unlock.badgeId } };
        case 'journeys': return { key: 'rewards.unlock.journeys', params: { n: unlock.count } };
        case 'checkins': return { key: 'rewards.unlock.checkins', params: { n: unlock.count } };
        default: return { key: 'rewards.unlock.unknown', params: {} };
    }
};

/**
 * Props that put a frame around an avatar container: a class and the two ring
 * colours as custom properties (styles in rewards.css). Empty for no frame, so
 * a call site can always spread it.
 */
export const frameProps = (frameId) => {
    const item = getCosmetic(frameId);
    if (!item || item.kind !== 'frame') return {};
    return {
        'data-frame': item.id,
        ...(item.premium ? { 'data-frame-premium': '' } : {}),
        style: { '--frame-a': item.colors[0], '--frame-b': item.colors[1] },
    };
};

/** Keep only ids that name a real item of `kind`; anything else reads as nothing equipped. */
export const validEquip = (id, kind) => {
    const item = getCosmetic(id);
    return item && item.kind === kind ? item.id : null;
};

// ---- The recorded copy (useRewardsStore, the preferences doc) ------------

const cleanMap = (raw, keep) => Object.fromEntries(
    Object.entries(raw && typeof raw === 'object' ? raw : {}).filter(([id, value]) => COSMETICS_BY_ID[id] && keep(value)),
);

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Only real items, real days and real kinds survive a read — hand-edited junk reads as nothing. */
export const normalizeRewards = (raw) => ({
    xp: Number.isFinite(raw?.xp) && raw.xp > 0 ? Math.floor(raw.xp) : 0,
    unlocked: cleanMap(raw?.unlocked, (day) => typeof day === 'string' && DAY_RE.test(day)),
    equipped: {
        frame: validEquip(raw?.equipped?.frame, 'frame'),
        title: validEquip(raw?.equipped?.title, 'title'),
    },
    equippedAt: Number.isFinite(raw?.equippedAt) && raw.equippedAt > 0 ? raw.equippedAt : 0,
    seen: cleanMap(raw?.seen, (value) => value === true),
});

/**
 * Two copies of the record (this browser, the account) merged: the higher XP,
 * every unlock either one holds (the earlier day wins), every "seen". Equipped
 * items come from whichever copy chose last (`equippedAt`) — an equip saved
 * here a moment before leaving the page must not lose to an older account
 * copy (found 2026-10-17 in the browser pass); a tie goes to the account.
 */
export const mergeRewards = (localRaw, remoteRaw) => {
    const local = normalizeRewards(localRaw);
    const remote = normalizeRewards(remoteRaw);
    const unlocked = { ...local.unlocked };
    for (const [id, day] of Object.entries(remote.unlocked)) {
        if (!unlocked[id] || day < unlocked[id]) unlocked[id] = day;
    }
    const equipSource = local.equippedAt > remote.equippedAt ? local : remote;
    return {
        xp: Math.max(local.xp, remote.xp),
        unlocked,
        equipped: equipSource.equipped,
        equippedAt: equipSource.equippedAt,
        seen: { ...local.seen, ...remote.seen },
    };
};
