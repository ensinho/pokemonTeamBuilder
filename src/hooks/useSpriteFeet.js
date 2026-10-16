import { useEffect, useState } from 'react';
import { loadSpriteFeet } from '../services/pokemonDataCache';

// The sprite-feet table (public/data/sprite-feet.json), loaded once per session
// the first time a DS battle opens. Until it lands, sprites stand on the default
// row — a few pixels off at worst, never missing.
let table = null;
let pending = null;

const ensureLoaded = () => {
    if (table || pending) return pending;
    pending = loadSpriteFeet()
        .then((data) => { table = data || { defaults: {}, feet: {} }; })
        .catch(() => { table = { defaults: {}, feet: {} }; })
        .finally(() => { pending = null; });
    return pending;
};

export function useSpriteFeet() {
    const [data, setData] = useState(table);
    useEffect(() => {
        if (table) { setData(table); return undefined; }
        let alive = true;
        ensureLoaded()?.then(() => { if (alive) setData(table); });
        return () => { alive = false; };
    }, []);
    return data;
}
