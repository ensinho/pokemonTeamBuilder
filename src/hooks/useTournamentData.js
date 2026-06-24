import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildCoOccurrence, suggestPartners } from '../utils/tournamentSynergy';

// Daily cache-buster: a new URL each day so users pick up the cron-refreshed
// dataset within ~24h, while same-day visits still hit the browser cache.
const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const staticUrl = () =>
    `${import.meta.env.BASE_URL || '/'}data/tournaments.json`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

/**
 * Loads the baked tournaments dataset and derives "popular" Pokémon from real
 * usage — i.e. how often each species appears across tournament teams. Shared by
 * the Tournaments view and the Home dashboard so the fetch is requested once.
 */
export function useTournamentData() {
    const [teams, setTeams] = useState([]);
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(staticUrl());
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled && Array.isArray(data?.teams)) setTeams(data.teams);
                }
            } catch (_) {
                /* dataset optional */
            } finally {
                if (!cancelled) setStatus('ready');
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const popular = useMemo(() => {
        const counts = new Map();
        for (const team of teams) {
            for (const mon of team.pokemons || []) {
                const entry = counts.get(mon.id) || { id: mon.id, name: mon.name, count: 0 };
                entry.count += 1;
                counts.set(mon.id, entry);
            }
        }
        return [...counts.values()].sort((a, b) => b.count - a.count);
    }, [teams]);

    const recent = useMemo(() => {
        // featured (podium) first, then the rest — already date-sorted in the file.
        return [...teams].sort((a, b) => Number(b.featured) - Number(a.featured));
    }, [teams]);

    // Co-occurrence model for the Team Builder's partner suggestions.
    const synergy = useMemo(() => buildCoOccurrence(teams), [teams]);
    const partnersFor = useCallback(
        (teamIds, lastId, limit = 12) => suggestPartners(synergy, teamIds, lastId, limit),
        [synergy]
    );

    return { teams, popular, recent, status, partnersFor, synergy };
}
