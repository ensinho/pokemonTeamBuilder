import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// public/data/seo-dex.json is what an ability or item page says to a crawler
// (api/render-meta.js). Rebuilt by every build (scripts/prebuild.mjs); this
// keeps the committed copy in the shape the server reads.
const dex = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'seo-dex.json'), 'utf8'));

describe('seo-dex.json', () => {
    it('keys abilities by Showdown id: [name, description, holders]', () => {
        const [name, desc, holders] = dex.abilities.drizzle;
        expect(name).toBe('Drizzle');
        expect(desc).toMatch(/Rain/);
        expect(holders).toContain(279); // Pelipper
    });

    it('names the Pokémon a Mega Stone is for, and nothing for other items', () => {
        expect(dex.items.charizarditey[2]).toBe(6);
        expect(dex.items.leftovers[2]).toBeNull();
    });

    it('covers almost every battle item the Items page lists', () => {
        const battle = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'battle-items.json'), 'utf8')).items;
        const missing = battle.filter((i) => !dex.items[i.slug.replace(/[^a-z0-9]/g, '')]);
        expect(missing.length).toBeLessThan(battle.length * 0.05);
    });
});
