import { useEffect, useState } from 'react';
import { cachedStaticData, loadStaticData } from '../services/staticData';

/**
 * One baked dataset (services/staticData.js) as `{ data, status }`. Every
 * component that asks for the same file shares one request; a file that
 * already arrived is there on the first render. `data` is null until it
 * lands, and stays null if it fails ("optional dataset": callers degrade).
 * `enabled: false` skips the download and reports ready.
 */
export function useStaticData(file, { enabled = true } = {}) {
    const [state, setState] = useState(() => ({ file, data: cachedStaticData(file) ?? null, failed: false }));

    useEffect(() => {
        if (!enabled || !file) return undefined;
        const cached = cachedStaticData(file);
        if (cached !== undefined) {
            setState((s) => (s.file === file && s.data === cached ? s : { file, data: cached, failed: false }));
            return undefined;
        }
        let cancelled = false;
        loadStaticData(file)
            .then((data) => { if (!cancelled) setState({ file, data, failed: false }); })
            .catch(() => { if (!cancelled) setState({ file, data: null, failed: true }); });
        return () => { cancelled = true; };
    }, [file, enabled]);

    if (!enabled || !file) return { data: null, status: 'ready' };
    // The render after `file` changed, before the effect: never serve the
    // previous file's data under the new name.
    const current = state.file === file ? state : { data: cachedStaticData(file) ?? null, failed: false };
    return { data: current.data, status: current.data !== null || current.failed ? 'ready' : 'loading' };
}
