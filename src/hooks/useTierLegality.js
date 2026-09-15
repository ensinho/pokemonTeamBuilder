import { useEffect, useMemo, useState } from 'react';

import { legalIdsForFormat, formatHasTierFilter } from '../utils/tierLegality';

// Loads the baked Smogon tierlist (public/data/tier-legality.json) and turns it
// into the set of species a format allows. Fetched once per session and shared,
// because every Team Builder surface that filters by tier wants the same answer.
//
// Deliberately separate from the usage hooks: usage says who is POPULAR in a
// tier (and only for the ~150 species the chaos dump covers), this says who is
// ALLOWED. The builder's filter needs the second, or a legal-but-niche pick
// would be missing from the list it is supposed to be choosing from.

const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const dataUrl = (file) =>
    `${import.meta.env.BASE_URL || '/'}data/${file}`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

let cache = null;
let inFlight = null;

/**
 * `{ byId, legalIdsFor(formatId), hasTierFilter(formatId), status }`.
 *
 * `legalIdsFor` returns a Set, or `null` meaning "do not filter" — either the
 * format has no tier ladder (VGC, Monotype, 1v1) or the dataset has not landed.
 * Callers must treat `null` as "allow everything", never as "allow nothing".
 */
export function useTierLegality() {
    const [byId, setById] = useState(cache);
    const [status, setStatus] = useState(cache ? 'ready' : 'loading');

    useEffect(() => {
        if (cache) { setById(cache); setStatus('ready'); return undefined; }
        let cancelled = false;
        inFlight = inFlight || (async () => {
            try {
                const res = await fetch(dataUrl('tier-legality.json'));
                if (res.ok) {
                    const json = await res.json();
                    if (json?.byId) cache = json.byId;
                }
            } catch (_) { /* optional dataset — the filter simply stays off */ }
            return cache;
        })();
        inFlight.then((data) => {
            if (cancelled) return;
            setById(data);
            setStatus('ready');
        });
        return () => { cancelled = true; };
    }, []);

    const legalIdsFor = useMemo(() => {
        const memo = new Map();
        return (formatId) => {
            if (!formatId) return null;
            if (!memo.has(formatId)) memo.set(formatId, legalIdsForFormat(byId, formatId));
            return memo.get(formatId);
        };
    }, [byId]);

    return { byId, legalIdsFor, hasTierFilter: formatHasTierFilter, status };
}
