import { useEffect } from 'react';
import { useQuickLookStore } from '../store/useQuickLookStore';

/**
 * Turn quick look on while `active` — the battle screens call this for as long
 * as a battle is on screen, so ⌘K opens a Pokémon, move, ability or item in a
 * panel beside the battle instead of navigating away from it.
 */
export function useQuickLookMode(active = true) {
    useEffect(() => {
        if (!active) return undefined;
        const { hold, release } = useQuickLookStore.getState();
        hold();
        return release;
    }, [active]);
}
