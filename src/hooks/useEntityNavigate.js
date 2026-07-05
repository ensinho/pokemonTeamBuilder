import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toApiSlug } from '../utils/smogonSets';
import { backLabelFor } from '../utils/backNavigation';

// Deepest breadcrumb we keep. Long chains (mon → item → mon → …) forget the
// oldest hops instead of growing location.state forever.
const MAX_TRAIL = 10;

// The chain of URLs that led to the current page, oldest first. Detail links
// stamp it via `linkState` below; legacy single-`from` links read as a
// one-entry trail so old history entries still work.
const readTrail = (location) => {
    const state = location.state || {};
    if (Array.isArray(state.trail)) return state.trail.filter((s) => typeof s === 'string' && s);
    return typeof state.from === 'string' && state.from ? [state.from] : [];
};

/**
 * Navigation to the move/ability/item detail pages from anywhere a name is shown.
 * Accepts either a PokéAPI slug ("fire-punch") or a Showdown display name
 * ("Will-O-Wisp"). Every hop pushes the current URL onto a breadcrumb trail in
 * location.state, so chained detail pages (meta → Pokémon → item) can walk back
 * exactly the way they came — one page at a time. Pass the click event so chips
 * inside clickable cards don't also trigger their parent.
 */
export function useEntityNavigate() {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.pathname + location.search;

    // Stamp this on any detail-bound <Link state={…}> / navigate(…, { state })
    // so the destination's back button knows the full chain that led there.
    const linkState = useMemo(
        () => ({ trail: [...readTrail(location), from].slice(-MAX_TRAIL) }),
        [location, from],
    );

    const go = useCallback((kind, name, e) => {
        if (e) e.stopPropagation();
        const slug = toApiSlug(name);
        if (!slug) return;
        navigate(`/${kind}/${slug}`, { state: linkState });
    }, [navigate, linkState]);

    return {
        goToMove: useCallback((name, e) => go('moves', name, e), [go]),
        goToAbility: useCallback((name, e) => go('abilities', name, e), [go]),
        goToItem: useCallback((name, e) => go('items', name, e), [go]),
        linkState,
        from,
    };
}

/**
 * The app-wide "back" handler for detail pages. Pops the previous URL off the
 * breadcrumb trail and restores it WITH the remaining trail, so that page's own
 * back button keeps working through the whole chain. Falls back to plain
 * history, then to `fallback` on a cold deep link (router `location.key` is the
 * sentinel 'default') so the button never dead-ends or leaves the app.
 * Returns `{ goBack, backLabel }` — `backLabel` names the origin when known.
 */
export function useSmartBack(fallback, pt = false, fallbackLabel = '') {
    const navigate = useNavigate();
    const location = useLocation();
    const trail = readTrail(location);
    const target = trail[trail.length - 1] || '';

    const goBack = useCallback(() => {
        if (target) navigate(target, { state: { trail: trail.slice(0, -1) } });
        else if (location.key && location.key !== 'default') navigate(-1);
        else navigate(fallback);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate, target, location.state, location.key, fallback]);

    return { goBack, backLabel: backLabelFor(target, pt, fallbackLabel) };
}
