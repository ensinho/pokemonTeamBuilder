import { useEffect, useState } from 'react';

// Daily cache-buster (mirrors the other static-data hooks) so an updated dataset
// is picked up within ~24h while same-day visits hit the browser cache.
const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const staticUrl = () =>
    `${import.meta.env.BASE_URL || '/'}data/gym-leaders.json`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

/**
 * Loads the gym-leaders dataset — each game's gym leaders and their teams. Used
 * by the Gyms & Trainers view. Returns the games array + ready status.
 */
export function useGymLeaders() {
    const [games, setGames] = useState([]);
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(staticUrl());
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled && Array.isArray(data?.games)) setGames(data.games);
                }
            } catch (_) {
                /* dataset optional */
            } finally {
                if (!cancelled) setStatus('ready');
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return { games, status };
}
