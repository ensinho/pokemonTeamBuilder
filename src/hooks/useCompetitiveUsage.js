import { useEffect, useMemo, useState } from 'react';

// Daily cache-buster, mirroring useTournamentData: a fresh URL each day so the
// cron-refreshed dataset is picked up within ~24h while same-day visits cache.
const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const staticUrl = () =>
    `${import.meta.env.BASE_URL || '/'}data/competitive-usage.json`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

/**
 * Loads the mined competitive-usage dataset — real held-item / ability / tera /
 * move frequencies per species, aggregated from the pokepastes of tournament
 * teams. Returns a `usageFor(id)` lookup plus the raw map and ready status.
 */
export function useCompetitiveUsage({ enabled = true } = {}) {
    const [byId, setById] = useState({});
    const [totalTeams, setTotalTeams] = useState(0);
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        // `enabled: false` (Team Builder playthrough mode) skips the download
        // entirely — nothing on screen consumes it there.
        if (!enabled) { setStatus('ready'); return undefined; }
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(staticUrl());
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled && data?.byId) {
                        setById(data.byId);
                        if (Number.isFinite(data.totalTeams)) setTotalTeams(data.totalTeams);
                    }
                }
            } catch (_) {
                /* dataset optional — suggestions fall back to heuristics */
            } finally {
                if (!cancelled) setStatus('ready');
            }
        })();
        return () => { cancelled = true; };
    }, [enabled]);

    const usageFor = useMemo(() => (id) => byId[id] || null, [byId]);

    return { byId, usageFor, totalTeams, status };
}
