/**
 * Bakes public/data/item-list.json — the Items page's whole list in one small
 * file (2026-11-09). Before, the page loaded a name-only index and then asked
 * PokéAPI for each visible row (40 requests per screen, each a full item record
 * with every language's flavour text), and search could only match the slug.
 *
 * One row per item a trainer looks up: name, pocket group, category, cost,
 * short effect (English — PokéAPI has no Portuguese). Only the groups in
 * CATEGORY_GROUP / POCKET_GROUP are kept.
 *
 *   node scripts/build-item-list.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const API = 'https://pokeapi.co/api/v2';
const OUT = path.resolve('public/data/item-list.json');
const CONCURRENCY = 12;

// PokéAPI category → the page's group. A category not listed is left out:
// TM materials, picnic/sandwich/curry ingredients, loot, story and key items —
// over half of PokéAPI's list, and nothing a trainer building a team looks up.
const CATEGORY_GROUP = {
    // Held in battle
    'held-items': 'held', choice: 'held', 'type-enhancement': 'held', plates: 'held',
    jewels: 'held', 'species-specific': 'held', 'bad-held-items': 'held', scarves: 'held',
    memories: 'held', 'mega-stones': 'held', 'z-crystals': 'held', 'effort-training': 'held',
    training: 'held',
    // Berries (PokéAPI files them by effect; the pocket is what matters)
    // — resolved through the pocket below.
    // Healing and in-battle items
    healing: 'medicine', 'pp-recovery': 'medicine', revival: 'medicine', 'status-cures': 'medicine',
    vitamins: 'medicine', 'stat-boosts': 'medicine', flutes: 'medicine', spelunking: null,
    // Poké Balls
    'standard-balls': 'balls', 'special-balls': 'balls', 'apricorn-balls': 'balls',
    // Evolution and forms
    evolution: 'evolution', 'tera-shard': 'evolution',
};
const POCKET_GROUP = { berries: 'berries', pokeballs: 'balls', battle: 'medicine', medicine: 'medicine' };

const fetchJson = async (url, tries = 3) => {
    for (let i = 0; ; i += 1) {
        try {
            const res = await fetch(url.startsWith('http') ? url : `${API}${url}`);
            if (!res.ok) throw new Error(`${res.status} ${url}`);
            return await res.json();
        } catch (error) {
            if (i >= tries - 1) throw error;
            await new Promise((r) => setTimeout(r, 800 * (i + 1)));
        }
    }
};

const pool = async (list, worker) => {
    const out = new Array(list.length);
    let next = 0;
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
        while (next < list.length) {
            const i = next; next += 1;
            out[i] = await worker(list[i], i);
        }
    }));
    return out;
};

const clean = (text = '') => text.replace(/[\n\f\r­]+/g, ' ').replace(/\s+/g, ' ').trim();

const categories = await fetchJson('/item-category?limit=200');
const categoryPocket = new Map();
await pool(categories.results, async ({ name, url }) => {
    const data = await fetchJson(url);
    categoryPocket.set(name, data.pocket?.name || null);
});

const index = await fetchJson('/item?limit=3000');
let done = 0;
const rows = await pool(index.results, async ({ url }) => {
    const data = await fetchJson(url);
    done += 1;
    if (done % 200 === 0) console.log(`  ${done}/${index.results.length}`);
    const category = data.category?.name || '';
    const group = POCKET_GROUP[categoryPocket.get(category)] || CATEGORY_GROUP[category];
    if (!group) return null;
    const en = (data.effect_entries || []).find((e) => e.language?.name === 'en');
    const flavor = (data.flavor_text_entries || []).filter((e) => e.language?.name === 'en').pop();
    const effect = clean(en?.short_effect || en?.effect || flavor?.text || '');
    const enName = (data.names || []).find((n) => n.language?.name === 'en')?.name || data.name;
    return {
        n: data.name,
        id: data.id,
        en: enName,
        g: group,
        c: category,
        ...(data.cost ? { $: data.cost } : {}),
        ...(effect ? { e: effect } : {}),
        ...(data.sprites?.default ? {} : { ns: 1 }),
    };
});

const items = rows.filter(Boolean).sort((a, b) => a.id - b.id);
await fs.writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items }));
console.log(`item-list.json: ${items.length} items (${index.results.length} in PokéAPI)`);
