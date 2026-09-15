import { execSync } from 'node:child_process';

// Runs before `vite build`. It has two modes, and confusing them has cost real
// time twice now — someone runs `npm run build`, sees it succeed, pushes, and
// nothing about the data changed, because a plain build DOES NOT SCRAPE.
//
//   SCRAPE_DATA=true  → regenerate every dataset in public/data from Smogon,
//                       VGCPastes, PokéAPI and Showdown. Minutes, hundreds of MB.
//   (unset)           → move-types + sitemap only. public/data is left exactly as
//                       committed, which is what the site then ships.
//
// The gate exists so an ordinary build (and every Vercel deploy) is not hostage
// to four third-party sites being up. It is not a bug — but it must never again
// be silent, hence the banner below.

const scraping = process.env.SCRAPE_DATA === 'true';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

if (scraping) {
    console.log('\nprebuild: SCRAPE_DATA=true — refreshing every dataset in public/data.\n');
    run('npm run data:refresh-all');
} else {
    console.log([
        '',
        'prebuild: datasets NOT refreshed — public/data ships exactly as committed.',
        '          This is the normal build. To refresh the competitive data:',
        '            npm run data:usage        # Smogon tiers + usage (what Meta & Usage reads)',
        '            npm run data:refresh-all  # every dataset',
        '            SCRAPE_DATA=true npm run build',
        '          Then commit public/data — the committed files are what deploys.',
        '',
    ].join('\n'));
    run('node scripts/build-move-types.mjs && node scripts/build-sitemap.mjs');
}
