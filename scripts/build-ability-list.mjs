/**
 * Bakes public/data/ability-list.json — the Abilities page's whole list in one
 * small file (2026-11-09), instead of a PokéAPI request per visible row (each
 * one a full ability record with every Pokémon that has it). Main-series
 * abilities only; per row: name, short effect (English) and how many Pokémon
 * can have it. The detail page still reads the full record.
 *
 *   node scripts/build-ability-list.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const API = 'https://pokeapi.co/api/v2';
const OUT = path.resolve('public/data/ability-list.json');
const CONCURRENCY = 12;

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

const clean = (text = '') => text.replace(/[\n\f\r­]+/g, ' ').replace(/\s+/g, ' ').trim();

const index = await fetchJson('/ability?limit=1000');
const rows = new Array(index.results.length);
let next = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < index.results.length) {
        const i = next; next += 1;
        const data = await fetchJson(index.results[i].url);
        if (!data.is_main_series) continue;
        const en = (data.effect_entries || []).find((e) => e.language?.name === 'en');
        const flavor = (data.flavor_text_entries || []).filter((e) => e.language?.name === 'en').pop();
        rows[i] = {
            n: data.name,
            id: data.id,
            en: (data.names || []).find((x) => x.language?.name === 'en')?.name || data.name,
            e: clean(en?.short_effect || en?.effect || flavor?.flavor_text || ''),
            k: (data.pokemon || []).length,
        };
    }
}));

const abilities = rows.filter(Boolean).sort((a, b) => a.id - b.id);
await fs.writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), count: abilities.length, abilities }));
console.log(`ability-list.json: ${abilities.length} abilities`);
