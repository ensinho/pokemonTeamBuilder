// The project's own social profiles — the same handle on both. Node-safe: the
// site pages (content/sitePages.js) and the JSON-LD `sameAs` (utils/seoPages.js)
// import it too, and they run in api/render-meta.js.
export const SOCIAL_HANDLE = '@pokemonbuilder_';
export const SOCIAL_X_URL = 'https://x.com/pokemonbuilder_';
export const SOCIAL_INSTAGRAM_URL = 'https://www.instagram.com/pokemonbuilder_';

// In the order they are drawn, everywhere they are drawn (footer, the drawer's
// About section, the patch notes). `id` picks the brand mark in components/icons.
export const SOCIAL_LINKS = [
    { id: 'x', name: 'X', href: SOCIAL_X_URL },
    { id: 'instagram', name: 'Instagram', href: SOCIAL_INSTAGRAM_URL },
];
