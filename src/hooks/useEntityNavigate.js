import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toApiSlug } from '../utils/smogonSets';

/**
 * Navigation to the move/ability/item detail pages from anywhere a name is shown.
 * Accepts either a PokéAPI slug ("fire-punch") or a Showdown display name
 * ("Will-O-Wisp") and stashes the current URL in location.state.from so the
 * detail page's back button returns exactly here. Pass the click event so
 * chips inside clickable cards don't also trigger their parent.
 */
export function useEntityNavigate() {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.pathname + location.search;

    const go = useCallback((kind, name, e) => {
        if (e) e.stopPropagation();
        const slug = toApiSlug(name);
        if (!slug) return;
        navigate(`/${kind}/${slug}`, { state: { from } });
    }, [navigate, from]);

    return {
        goToMove: useCallback((name, e) => go('moves', name, e), [go]),
        goToAbility: useCallback((name, e) => go('abilities', name, e), [go]),
        goToItem: useCallback((name, e) => go('items', name, e), [go]),
        // Current URL, for stamping `state: { from }` on plain <Link>s so the
        // destination's back button returns exactly here.
        from,
    };
}
