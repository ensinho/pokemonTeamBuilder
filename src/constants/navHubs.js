/**
 * Navigation hubs (2026-11-09, Enzo: "reduzir quantidade de abas"). Pages that
 * answer one question share one entry in the rail and the Mais sheet, and a
 * switcher at the top of each page moves between them. The routes stay —
 * every one is indexed and linked from elsewhere — only the menu shrinks.
 *
 * `pages` are page keys as AppLayout's `currentPage` names them, in switcher
 * order; the first is where the menu entry goes.
 */
export const NAV_HUBS = {
    library: [
        { key: 'moves', path: '/moves', labelKey: 'nav.moves' },
        { key: 'abilities', path: '/abilities', labelKey: 'nav.abilities' },
        { key: 'items', path: '/items', labelKey: 'nav.items' },
    ],
    meta: [
        { key: 'meta', path: '/meta', labelKey: 'nav.hubUsage' },
        { key: 'bestTeams', path: '/best-teams', labelKey: 'nav.bestTeams' },
        { key: 'tournaments', path: '/tournaments', labelKey: 'nav.hubTournamentTeams' },
    ],
};

/** The hub a list page belongs to (exact list path only — not /moves/:name). */
export function hubForPath(pathname) {
    for (const [hub, pages] of Object.entries(NAV_HUBS)) {
        if (pages.some((page) => page.path === pathname)) return hub;
    }
    return null;
}

/** The page keys a hub's menu entry stands for. */
export const hubMembers = (hub) => (NAV_HUBS[hub] || []).map((page) => page.key);
