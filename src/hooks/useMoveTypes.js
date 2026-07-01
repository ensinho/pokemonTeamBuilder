import { useEffect, useMemo, useState } from 'react';

// Daily cache-buster, mirroring the other static-data hooks.
const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const staticUrl = () =>
    `${import.meta.env.BASE_URL || '/'}data/move-types.json`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

// Normalize a display move name to the Showdown move id used as the map key.
export const moveId = (name = '') => String(name).toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Loads the baked move → type map so move chips can be coloured by type without
 * a per-move API call. Returns `typeForMove(name)` (lowercase type or null).
 */
export function useMoveTypes() {
    const [byId, setById] = useState({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(staticUrl());
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled && data?.byId) setById(data.byId);
                }
            } catch (_) {
                /* optional — chips just render without a type colour */
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const typeForMove = useMemo(() => (name) => byId[moveId(name)] || null, [byId]);

    return { typeForMove };
}
