import { useEffect } from 'react';

export const SITE_NAME = 'Pokémon Team Builder';
export const SITE_URL = 'https://pokemonbuilder.app';
const DEFAULT_DESCRIPTION = 'Build and share competitive Pokémon teams with a full Pokédex, damage calculator, speed tiers, Smogon sets, and real tournament usage stats.';
const DEFAULT_IMAGE = `${SITE_URL}/android-chrome-512x512.png`;

function upsertMeta(attr, key, content) {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}

function upsertCanonical(href) {
    let el = document.querySelector('link[rel="canonical"]');
    if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', 'canonical');
        document.head.appendChild(el);
    }
    el.setAttribute('href', href);
}

function applyMeta({ title, description, image, path }) {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const desc = description || DEFAULT_DESCRIPTION;
    const url = `${SITE_URL}${path}`;

    document.title = fullTitle;
    upsertMeta('name', 'description', desc);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:image', image || DEFAULT_IMAGE);
    upsertMeta('property', 'og:url', url);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', image || DEFAULT_IMAGE);
    upsertCanonical(url);
}

/**
 * Sets the document title, meta description, canonical link, and Open Graph /
 * Twitter tags for the current route, restoring the site defaults on unmount.
 * Plain DOM mutation rather than react-helmet: Google renders this app's JS
 * anyway, and only a handful of routes need per-page head content.
 */
export function useDocumentMeta({ title, description, image, path } = {}) {
    useEffect(() => {
        applyMeta({ title, description, image, path: path ?? window.location.pathname });
        return () => applyMeta({ path: window.location.pathname });
    }, [title, description, image, path]);
}
