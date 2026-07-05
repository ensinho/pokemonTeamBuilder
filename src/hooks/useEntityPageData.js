import { useEffect, useState } from 'react';

/**
 * Loads the record behind a detail page (/abilities/:name, /moves/:name).
 * status: 'loading' | 'ready' | 'missing' — 'missing' covers both a bad slug
 * (404) and a failed fetch, which the pages render as a not-found state.
 */
export function useEntityPageData(name, load) {
    const [state, setState] = useState({ status: 'loading', data: null });

    useEffect(() => {
        let cancelled = false;
        setState({ status: 'loading', data: null });
        Promise.resolve(load(name))
            .then((data) => {
                if (!cancelled) setState(data ? { status: 'ready', data } : { status: 'missing', data: null });
            })
            .catch(() => {
                if (!cancelled) setState({ status: 'missing', data: null });
            });
        return () => { cancelled = true; };
    }, [name, load]);

    return state;
}
