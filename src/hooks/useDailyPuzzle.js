import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { loadPokemonIndex } from '../services/pokemonDataCache';
import { getDailyPokemonIndex } from '../utils/pokePuzzle';

const ALLOWED_MAX_ID = 1025;

/**
 * Today's PokéPuzzle as the Home sees it: the target, whether this account has
 * solved it (Firestore first, then the per-account localStorage summary that
 * PokePuzzleView writes), and a random silhouette to tease with — never the
 * target itself before it is solved.
 */
export function useDailyPuzzle(userId) {
    const [state, setState] = useState({ target: null, summary: null, silhouetteId: 1, isLoading: true });

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const now = new Date();
            const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
            let summary = null;

            if (userId) {
                try {
                    const snap = await getDoc(doc(db, `artifacts/pokemonTeamBuilder/users/${userId}/pokepuzzle`, `daily_${dateString}`));
                    if (snap.exists()) {
                        const data = snap.data();
                        summary = { solved: data.gameStatus === 'WON', attempts: data.guesses?.length || 0, date: dateString };
                    }
                } catch (_) { /* offline or signed out — fall through to local */ }
            }

            if (!summary) {
                try {
                    const saved = JSON.parse(localStorage.getItem(`ptb:pokepuzzle:${userId || 'anon'}:daily:summary`) || 'null');
                    if (saved?.date === dateString) summary = saved;
                } catch (_) { /* ignore */ }
            }

            let target = null;
            let silhouetteId = 1;
            try {
                const pool = (await loadPokemonIndex()).filter((p) => p.id <= ALLOWED_MAX_ID);
                if (pool.length > 0) {
                    target = pool[getDailyPokemonIndex(dateString, pool)];
                    silhouetteId = pool[Math.floor(Math.random() * pool.length)].id;
                }
            } catch (_) { /* the card simply hides */ }

            if (!cancelled) setState({ target, summary, silhouetteId, isLoading: false });
        };
        load();
        return () => { cancelled = true; };
    }, [userId]);

    return state;
}
