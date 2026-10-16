import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Dex } from '@pkmn/sim';
import { Sprites } from '@pkmn/img';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

// Builds public/data/sprite-feet.json — where each battle sprite's feet are, so
// the Champion Challenge can stand every Pokémon on its platform.
//
// Showdown pads the Gen 4 sprites (and the Gen 5 ones used for later species)
// into a 96 × 96 canvas, and the feet land anywhere from row 72 to row 93
// depending on the species. Without this, a fixed offset leaves Roserade
// floating above her platform and Garchomp sunk into his. The sprite host sends
// no CORS header, so the browser cannot measure the pixels itself — hence a
// table, baked here.
//
// Format: { size, defaults: { front, back }, feet: { "<file>": [front, back] } },
// keyed by the sprite's file name (src/utils/battleSprites.js `spriteKey`) — a
// species' front and back always come from the same generation's folder, so the
// name alone is unique. A side that could not be read is null (use the default).
// Run: node scripts/build-sprite-feet.mjs   (network; ~3k small PNGs, polite concurrency)

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const OUT = path.join(DATA_DIR, 'sprite-feet.json');
const CONCURRENCY = 12;
const DEFAULTS = { front: 80, back: 80 };

const keyOf = (url) => url.split('/').pop().replace(/\.png$/, '');

const feetOf = async (url) => {
    const response = await fetch(url);
    if (!response.ok) return null;
    const png = PNG.sync.read(Buffer.from(await response.arrayBuffer()));
    for (let y = png.height - 1; y >= 0; y -= 1) {
        for (let x = 0; x < png.width; x += 1) {
            if (png.data[(y * png.width + x) * 4 + 3] > 16) return y;
        }
    }
    return null;
};

const main = async () => {
    const jobs = new Map(); // "<file>:<side>" → { key, url, side }
    for (const species of Dex.species.all()) {
        if (!species.exists || species.num <= 0 || ['CAP', 'Custom', 'Pokestar'].includes(species.isNonstandard)) continue;
        for (const side of ['front', 'back']) {
            const { url } = Sprites.getPokemon(species.name, { gen: 'gen4', side: side === 'back' ? 'p1' : 'p2' });
            const key = keyOf(url);
            if (!jobs.has(`${key}:${side}`)) jobs.set(`${key}:${side}`, { key, url, side });
        }
    }

    const feet = {};
    const queue = [...jobs.values()];
    let done = 0;
    let missing = 0;
    const worker = async () => {
        while (queue.length) {
            const { key, url, side } = queue.shift();
            feet[key] ||= [null, null];
            try {
                const row = await feetOf(url);
                if (row === null) missing += 1;
                else feet[key][side === 'back' ? 1 : 0] = row;
            } catch (_) {
                missing += 1;
            }
            done += 1;
            if (done % 500 === 0) console.log(`  ${done}/${jobs.size}`);
        }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const sorted = Object.fromEntries(Object.entries(feet)
        .filter(([, rows]) => rows.some((row) => row !== null))
        .sort(([a], [b]) => a.localeCompare(b)));
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(OUT, JSON.stringify({ size: 96, defaults: DEFAULTS, feet: sorted }));
    console.log(`sprite-feet.json: ${jobs.size} sprites, ${Object.keys(sorted).length} species files, ${missing} unreadable`);
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
