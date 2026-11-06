import { useEffect, useState } from 'react';

let engine = null;
let pending = null;

/** Load the mascot chunk once; AppLayout warms it on idle, a mascot asks for it on mount. */
export function loadMascotEngine() {
    if (!pending) {
        pending = import('./engine.js')
            .then((mod) => { engine = mod; return mod; })
            .catch((error) => { pending = null; throw error; });
    }
    return pending;
}

/** The engine module, or null until it has arrived (the component draws the static icon meanwhile). */
export function useMascotEngine() {
    const [mod, setMod] = useState(engine);
    useEffect(() => {
        if (mod) return undefined;
        let alive = true;
        loadMascotEngine().then((m) => { if (alive) setMod(m); }).catch(() => { /* offline first visit: the icon stays */ });
        return () => { alive = false; };
    }, [mod]);
    return mod;
}
