import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../store/useAuthStore';
import { useRewardsStore } from '../store/useRewardsStore';
import { useTrainerCosmeticsStore } from '../store/useTrainerCosmeticsStore';

/**
 * The frame, title and level a trainer wears right now (rewards, 2026-10-17).
 * Your own come from useRewardsStore (live — equip and every avatar of yours
 * changes at once); anyone else's from their public profile
 * (useTrainerCosmeticsStore), with what a post stamped when it was written
 * (`stamped`) standing in until that answers, or when they have none.
 */
export function useTrainerCosmetics(uid, stamped = {}) {
    const ownUid = useAuthStore((s) => s.userId);
    const isOwn = Boolean(uid) && uid === ownUid;
    const own = useRewardsStore(useShallow((s) => ({ frameId: s.equipped.frame, titleId: s.equipped.title, level: s.level })));
    const entry = useTrainerCosmeticsStore((s) => (uid && !isOwn ? s.byUid[uid] : undefined));
    const request = useTrainerCosmeticsStore((s) => s.request);

    useEffect(() => {
        if (uid && !isOwn) request(uid);
    }, [uid, isOwn, request]);

    if (isOwn) return own;
    if (entry) return entry;
    return { frameId: stamped.frameId || null, titleId: stamped.titleId || null, level: null };
}
