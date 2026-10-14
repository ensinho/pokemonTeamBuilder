import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * A tab kept in the URL (`?tab=`), so Back returns to it and a link can share
 * it. Writes replace the history entry — switching tabs is not a navigation
 * the user expects Back to step through. The default tab keeps the URL clean.
 */
export function useUrlTab(tabs, fallback) {
    const [params, setParams] = useSearchParams();
    const raw = params.get('tab');
    const tab = tabs.includes(raw) ? raw : fallback;
    const setTab = useCallback((next) => {
        setParams((prev) => {
            const out = new URLSearchParams(prev);
            if (next === fallback) out.delete('tab'); else out.set('tab', next);
            return out;
        }, { replace: true, preventScrollReset: true });
    }, [setParams, fallback]);
    return [tab, setTab];
}
