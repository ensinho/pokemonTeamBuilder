import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

/**
 * Replace-writes to the query string, built from the *live* URL.
 *
 * The router applies a navigation inside a transition, so the `searchParams`
 * a render saw can be one keystroke behind. Building the next query from it
 * (setSearchParams(prev => …)) let two quick writes start from the same stale
 * query and the second dropped the first. The location state rides along, so
 * a page reached with a breadcrumb trail keeps it.
 *
 * Returns `write(mutate)`: `mutate(params)` edits a copy in place; nothing is
 * navigated when the query comes out unchanged. `write` returns the query it
 * navigated to (as URLSearchParams#toString), or null when it did not.
 */
export function useReplaceSearchParams() {
    const [, setSearchParams] = useSearchParams();
    const location = useLocation();
    const stateRef = useRef(location.state);
    stateRef.current = location.state;

    return useCallback((mutate) => {
        const current = new URLSearchParams(window.location.search);
        const next = new URLSearchParams(current);
        mutate(next);
        const query = next.toString();
        if (query === current.toString()) return null;
        setSearchParams(next, { replace: true, preventScrollReset: true, state: stateRef.current });
        return query;
    }, [setSearchParams]);
}

/**
 * One query-string parameter as component state (`?q=`, `?type=`…), so a
 * filter survives Back, a refresh and a shared link.
 *
 * The value the control shows is local state, mirrored to the URL on every
 * change: a controlled input fed straight from the router's (transitioned)
 * location jumps its caret and drops characters typed quickly. A URL change
 * that this hook did not write — Back/Forward, a link to `?q=` while the view
 * is open — is adopted. The fallback value keeps the URL clean (no param).
 */
export function useUrlParam(name, fallback = '') {
    const [params] = useSearchParams();
    const urlValue = params.get(name) ?? fallback;
    const [value, setValue] = useState(urlValue);
    const write = useReplaceSearchParams();
    // Values this hook wrote and the router has not echoed back yet, oldest
    // first. Their echoes must not overwrite what the user typed since.
    const pending = useRef([]);

    useEffect(() => {
        const index = pending.current.indexOf(urlValue);
        if (index !== -1) {
            pending.current = pending.current.slice(index + 1);
            return;
        }
        pending.current = [];
        setValue(urlValue);
    }, [urlValue]);

    const update = useCallback((next) => {
        const resolved = next ?? fallback;
        setValue(resolved);
        const written = write((p) => {
            if (resolved === fallback || resolved === '') p.delete(name);
            else p.set(name, resolved);
        });
        if (written !== null) pending.current.push(resolved === '' ? fallback : resolved);
    }, [name, fallback, write]);

    return [value, update];
}
