import { create } from 'zustand';
import { themeReward } from '../constants/cosmetics';
import { levelForXp } from '../utils/trainerLevel';
import { localDayKey } from '../utils/dailyCheckin';
import { mergeRewards, newlyEarnedRewards, normalizeRewards, validEquip } from '../utils/rewards';
import { useAuthStore } from './useAuthStore';

/**
 * The trainer's rewards, recorded (2026-10-17, docs/modules/rewards.md):
 * experience and level, the cosmetics unlocked (id → the day it happened),
 * what is equipped, and which unlocks the trainer has already looked at.
 *
 * Recorded, not derived on every render, on purpose: the avatar frame in the
 * sidebar, the title under a name and the level on the Home have to paint at
 * once, before any of the listeners useTrainerBadges reads has answered. So
 * this keeps the last answer in localStorage (instant first paint) and in the
 * preferences doc as `rewards` (follows the account), exactly like the
 * journey marks.
 *
 * Two promises, both enforced here:
 * - **Nothing is ever taken back.** XP is the highest total ever seen, and an
 *   unlock stays unlocked — deleting a team, or a listener that has not
 *   answered yet, never costs the trainer anything.
 * - **Unlocks found in data are not celebrated.** syncProgress runs whenever
 *   the stats change, including when they arrive after boot; it only records.
 *   The Rewards tab shows what is new (`seen`), and only the trainer's own tap
 *   (the check-in) gets a moment.
 */

const STORAGE_KEY = 'ptb:rewards';

const EMPTY = { xp: 0, unlocked: {}, equipped: { frame: null, title: null }, equippedAt: 0, seen: {} };

const readLocal = () => {
    if (typeof window === 'undefined') return EMPTY;
    try {
        return normalizeRewards(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
    } catch (_) {
        return EMPTY;
    }
};

const recordOf = (state) => ({ xp: state.xp, unlocked: state.unlocked, equipped: state.equipped, equippedAt: state.equippedAt, seen: state.seen });

const writeLocal = (record) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch (_) { /* a convenience: the account copy still has it */ }
};

const initial = readLocal();

export const useRewardsStore = create((set, get) => {
    // What syncProgress last heard, so a check-in (which only knows its own
    // XP) can still judge the badge- and journey-based unlocks. Memory only.
    let lastFacts = { badgeIds: [], journeysDone: 0, checkins: 0 };

    const persist = () => {
        const record = recordOf(get());
        writeLocal(record);
        useAuthStore.getState().savePreferences({ rewards: record });
    };

    /** Raise XP to `xp` (never lower) and record whatever that and `facts` unlock. */
    const advance = (xp, facts) => {
        const state = get();
        const nextXp = Math.max(state.xp, Math.floor(xp || 0));
        const { level } = levelForXp(nextXp);
        const earned = newlyEarnedRewards({ level, ...facts }, state.unlocked);
        if (nextXp === state.xp && earned.length === 0) return { level, earned };
        const today = localDayKey();
        const unlocked = { ...state.unlocked };
        for (const id of earned) unlocked[id] = today;
        set({ xp: nextXp, level, unlocked });
        persist();
        return { level, earned };
    };

    return {
        ...initial,
        level: levelForXp(initial.xp).level,

        /** Fold the account's copy in (useAuthStore's profile hydration). */
        hydrate: (remoteRaw) => {
            const merged = mergeRewards(recordOf(get()), remoteRaw);
            set({ ...merged, level: levelForXp(merged.xp).level });
            writeLocal(merged);
        },

        /** The record as the preferences doc stores it. */
        snapshot: () => recordOf(get()),

        /**
         * The trainer's progress as useTrainerBadges just computed it. Records
         * only — never celebrates (see the header).
         */
        syncProgress: ({ xp, badgeIds = [], journeysDone = 0, checkins = 0 }) => {
            lastFacts = { badgeIds, journeysDone, checkins };
            advance(xp, lastFacts);
        },

        /**
         * XP the trainer earned with their own tap (the check-in). Returns the
         * level before and after and what it unlocked, for the card to show.
         */
        addXp: (amount, { checkins } = {}) => {
            const before = get().level;
            if (Number.isFinite(checkins)) lastFacts = { ...lastFacts, checkins: Math.max(lastFacts.checkins, checkins) };
            const { level, earned } = advance(get().xp + Math.max(0, amount || 0), lastFacts);
            return { levelBefore: before, level, earned };
        },

        /** Equip an unlocked item, or clear a kind with `null`. */
        equip: (kind, id) => {
            if (kind !== 'frame' && kind !== 'title') return;
            const next = id ? validEquip(id, kind) : null;
            if (id && (!next || !get().unlocked[next])) return;
            if (get().equipped[kind] === next) return;
            set((state) => ({ equipped: { ...state.equipped, [kind]: next }, equippedAt: Date.now() }));
            persist();
            useAuthStore.getState().syncPublicProfile();
        },

        /** The trainer looked at these unlocks: they stop reading as new. */
        markSeen: (ids) => {
            const fresh = (ids || []).filter((id) => !get().seen[id] && get().unlocked[id]);
            if (!fresh.length) return;
            set((state) => ({ seen: { ...state.seen, ...Object.fromEntries(fresh.map((id) => [id, true])) } }));
            persist();
        },
    };
});

/** Unlocked items the trainer has not looked at yet (call outside a selector: it builds a new array). */
export const unseenRewards = (state) => Object.keys(state.unlocked).filter((id) => !state.seen[id]);

/** How many unlocks are new — a number, so it is safe as a store selector. */
export const selectUnseenCount = (state) => {
    let count = 0;
    for (const id in state.unlocked) if (!state.seen[id]) count += 1;
    return count;
};

/** Whether `themeId` can be applied: the free themes always, a reward theme once unlocked. */
export const isThemeUnlocked = (themeId, unlocked = useRewardsStore.getState().unlocked) => {
    const reward = themeReward(themeId);
    return !reward || Boolean(unlocked[reward.id]);
};
