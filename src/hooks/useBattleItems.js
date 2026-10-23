import { useStaticData } from './useStaticData';

// Loads the baked battle-item list (public/data/battle-items.json) — the held-in-
// battle items only (no mulch / fossils / TMs), each with a slug for its sprite.
// Falls back to an empty list so callers can degrade to their own item source.

const NO_ITEMS = [];

export function useBattleItems() {
    const { data } = useStaticData('battle-items.json');
    return Array.isArray(data?.items) ? data.items : NO_ITEMS;
}
