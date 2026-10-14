import { useEffect, useState } from 'react';
import { loadBattleDex } from '../services/pokemonDataCache';

// The battle tooltips' move/species data (public/data/battle-dex.json). Loaded
// once per session; components re-render when it lands. The battle screen
// calls this on mount, so the file is usually in by the first hover.
let dex = null;
let pending = null;

const ensureLoaded = () => {
    if (dex || pending) return pending;
    pending = loadBattleDex()
        .then((data) => { dex = data || { moves: {}, species: {} }; })
        .catch(() => { dex = { moves: {}, species: {} }; })
        .finally(() => { pending = null; });
    return pending;
};

export const getBattleDex = () => dex;

export function useBattleDex() {
    const [data, setData] = useState(dex);
    useEffect(() => {
        if (dex) { setData(dex); return undefined; }
        let alive = true;
        ensureLoaded()?.then(() => { if (alive) setData(dex); });
        return () => { alive = false; };
    }, []);
    return data;
}
