import { useEffect, useMemo, useState } from 'react';

// Daily cache-buster, mirroring useCompetitiveUsage / useTournamentData: a fresh
// URL each day so the rebuilt dataset is picked up within ~24h while same-day
// visits hit the browser cache.
const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const staticUrl = () =>
    `${import.meta.env.BASE_URL || '/'}data/smogon.json`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

/**
 * Loads the baked Smogon dataset — expert-curated recommended sets + written
 * analysis per species, mirrored from pkmn.github.io/smogon. Complements the
 * tournament-mined competitive-usage data: where that captures *what champions
 * actually ran* (real but thin), this gives a *robust, full-meta baseline* with
 * the reasoning behind each set. Returns a `smogonFor(id)` lookup + ready status.
 */
export function useSmogonData() {
    const [byId, setById] = useState({});
    const [status, setStatus] = useState('loading');

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
                /* dataset optional — surfaces simply hide when absent */
            } finally {
                if (!cancelled) setStatus('ready');
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const smogonFor = useMemo(() => (id) => byId[id] || null, [byId]);

    return { byId, smogonFor, status };
}
