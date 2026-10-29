import { create } from 'zustand';
import { track } from '../services/analytics';

/**
 * The team comparison is a dialog, not a page: any place that shows a saved
 * team opens it with that team on the left (`openTeamCompare(id, source)`),
 * and AppLayout mounts `TeamCompareModal` while it is open. The right side
 * starts empty and the modal picks the most useful opponent (the active team,
 * else the newest other one).
 */
export const useTeamCompareStore = create((set) => ({
    isOpen: false,
    leftId: null,
    rightId: null,
    open: (leftId = null, rightId = null) => set({ isOpen: true, leftId, rightId }),
    close: () => set({ isOpen: false }),
    setLeft: (leftId) => set({ leftId }),
    setRight: (rightId) => set({ rightId }),
}));

/** `source` names the shortcut, for the funnel (docs/modules/analytics.md). */
export const openTeamCompare = (leftId, source) => {
    track('team_compare_open', { source });
    useTeamCompareStore.getState().open(leftId);
};
