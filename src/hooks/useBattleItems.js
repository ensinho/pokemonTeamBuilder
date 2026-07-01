import { useEffect, useState } from 'react';

// Loads the baked battle-item list (public/data/battle-items.json) — the held-in-
// battle items only (no mulch / fossils / TMs), each with a slug for its sprite.
// Falls back to an empty list so callers can degrade to their own item source.

const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};
const dataUrl = () =>
    `${import.meta.env.BASE_URL || '/'}data/battle-items.json`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

let cache = null;

export function useBattleItems() {
    const [items, setItems] = useState(cache || []);
    useEffect(() => {
        if (cache) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(dataUrl());
                if (res.ok) {
                    const data = await res.json();
                    cache = Array.isArray(data?.items) ? data.items : [];
                    if (!cancelled) setItems(cache);
                }
            } catch (_) { /* optional */ }
        })();
        return () => { cancelled = true; };
    }, []);
    return items;
}
