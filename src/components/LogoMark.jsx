import React from 'react';
import { SITE_NAME } from '../utils/seoPages';

const BASE = import.meta.env.BASE_URL;
const SMALL = `${BASE}logo-mark-128.webp`;
const LARGE = `${BASE}logo-mark.webp`;

/**
 * The Gengar icon — the app's mark (favicon, splash, collapsed rail, landing,
 * the mascot). Two files, like BrandWordmark: 128w (3.5 KB) for everything
 * drawn at 64px or less, 256w (7 KB) for the splash. Before 2026-10-30 every
 * place loaded the 256px file, even the 24px mascot — an SEO audit's
 * "serve properly sized images". `sizes` is how wide this one is drawn.
 *
 * Its alt is the site's name. It is decorative beside the wordmark or a
 * message, so it is hidden from screen readers there (`decorative`, the
 * default) — the alt is then for image search and audits only. Where it
 * stands for the brand on its own (the collapsed rail), pass
 * `decorative={false}`.
 */
export function LogoMark({ sizes = '4rem', decorative = true, ...rest }) {
    return (
        <img
            src={SMALL}
            srcSet={`${SMALL} 128w, ${LARGE} 256w`}
            sizes={sizes}
            width={256}
            height={250}
            alt={SITE_NAME}
            aria-hidden={decorative ? 'true' : undefined}
            decoding="async"
            draggable={false}
            {...rest}
        />
    );
}

export default LogoMark;
