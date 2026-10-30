import fs from 'node:fs/promises';
import path from 'node:path';
import { Dex } from '@pkmn/sim';

// Builds public/data/seo-dex.json — what an ability or an item page says, for
// the HTML api/render-meta.js serves to readers that never run the app (AI
// crawlers, link previews, Bing's first pass). Those pages were 13–19 words
// of title and description until 2026-10-30; the app fetches the full entry
// from PokéAPI in the browser, which a crawler never sees. Moves come from
// battle-dex.json (scripts/build-battle-dex.mjs), which already has them.
//
// Deterministic (no timestamp), so a build leaves the committed file as it was.
// Run: node scripts/build-seo-dex.mjs (no network — reads the installed sim).
//
//   abilities[id] = [name, shortDesc, [national dex numbers that can have it]]
//   items[id]     = [name, shortDesc, national dex number it Mega Evolves, or null]
//
// `id` is Showdown's (lowercase letters and digits): the page's slug with
// everything else removed — `/abilities/sand-stream` → `sandstream`.

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const MAX_DEX = 1025;

const main = async () => {
    const holders = new Map();
    for (const spec of Dex.species.all()) {
        if (!spec.exists || spec.num < 1 || spec.num > MAX_DEX) continue;
        for (const name of Object.values(spec.abilities || {})) {
            if (!name) continue;
            const id = Dex.abilities.get(name).id;
            if (!holders.has(id)) holders.set(id, new Set());
            holders.get(id).add(spec.num);
        }
    }

    const abilities = {};
    for (const ability of Dex.abilities.all()) {
        if (!ability.exists || ability.num < 1 || ability.isNonstandard === 'CAP') continue;
        abilities[ability.id] = [
            ability.name,
            ability.shortDesc || ability.desc || '',
            [...(holders.get(ability.id) || [])].sort((a, b) => a - b),
        ];
    }

    const items = {};
    for (const item of Dex.items.all()) {
        if (!item.exists || item.isNonstandard === 'CAP') continue;
        const base = item.megaStone ? Object.keys(item.megaStone)[0] : null;
        const megaFor = base ? Dex.species.get(base).num || null : null;
        items[item.id] = [item.name, item.shortDesc || item.desc || '', megaFor];
    }

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, 'seo-dex.json'), `${JSON.stringify({ abilities, items })}\n`, 'utf8');
    console.log(`Wrote ${Object.keys(abilities).length} abilities and ${Object.keys(items).length} items to public/data/seo-dex.json`);
};

main().catch((err) => {
    console.error('seo-dex build failed:', err?.message || err);
    process.exitCode = 1;
});
