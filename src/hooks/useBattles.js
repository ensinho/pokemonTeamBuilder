import { useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useBattlesStore } from '../store/useBattlesStore';
import { describeBattle, battleSortRank } from '../utils/battle';

/**
 * Every battle this trainer is in, already described from their perspective and
 * ordered so anything needing their move floats to the top.
 *
 * The listener is bound to the account's lifetime and reference-counted in the
 * store, so several components may hold this hook at once.
 */
export function useBattles() {
    const userId = useAuthStore((state) => state.userId);
    const isAnonymous = useAuthStore((state) => state.isAnonymous);

    const initListeners = useBattlesStore((state) => state.initListeners);
    const cleanupListeners = useBattlesStore((state) => state.cleanupListeners);
    const battles = useBattlesStore((state) => state.battles);
    const isLoadingBattles = useBattlesStore((state) => state.isLoadingBattles);

    useEffect(() => {
        if (userId && !isAnonymous) {
            initListeners();
        } else {
            cleanupListeners();
        }
        return () => cleanupListeners();
    }, [userId, isAnonymous, initListeners, cleanupListeners]);

    const described = useMemo(() => {
        if (!userId) return [];
        return battles
            .map((battle) => ({ battle, view: describeBattle(battle, userId) }))
            // A battle that doesn't describe isn't ours to show.
            .filter((entry) => entry.view)
            .sort((a, b) => {
                const byRank = battleSortRank(a.view) - battleSortRank(b.view);
                if (byRank !== 0) return byRank;
                return String(b.battle.lastActivityAt || '').localeCompare(String(a.battle.lastActivityAt || ''));
            });
    }, [battles, userId]);

    // Drives the sidebar badge: battles that can't move without this trainer.
    const awaitingMeCount = useMemo(
        () => described.filter((entry) => entry.view.waitingOn === 'me').length,
        [described],
    );

    return { battles: described, isLoadingBattles, awaitingMeCount };
}
