import { useEffect, useState } from 'react';

// Loads the baked mega-stone map (public/data/mega-stones.json): stone slug →
// { base, baseId, form, spriteId, types }. Lets the team reflect a Mega form when
// its stone is equipped, so the roster changes dynamically as you build.

const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};
const dataUrl = () =>
    `${import.meta.env.BASE_URL || '/'}data/mega-stones.json`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

let cache = null;

export function useMegaStones() {
    const [byStone, setByStone] = useState(cache || {});
    useEffect(() => {
        if (cache) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(dataUrl());
                if (res.ok) {
                    const data = await res.json();
                    cache = data?.byStone || {};
                    if (!cancelled) setByStone(cache);
                }
            } catch (_) { /* optional */ }
        })();
        return () => { cancelled = true; };
    }, []);
    return byStone;
}

/**
 * The Mega form a team member is currently in, or null. A member megas only when
 * the held item is that species' stone (`baseId` must match), so an unrelated
 * stone doesn't transform it.
 */
export function megaFormFor(pokemon, byStone) {
    const item = pokemon?.customization?.item;
    if (!item || !byStone) return null;
    const m = byStone[item];
    return m && m.baseId === pokemon.id ? m : null;
}

// "Tyranitar-Mega" → "Mega Tyranitar"; "Charizard-Mega-Y" → "Mega Charizard Y".
export function megaDisplayName(form = '') {
    const parts = form.split('-');
    const i = parts.indexOf('Mega');
    if (i === -1) return form.replace(/-/g, ' ');
    const suffix = parts.slice(i + 1).join(' ');
    return `Mega ${parts.slice(0, i).join(' ')}${suffix ? ` ${suffix}` : ''}`.trim();
}
