import fs from 'node:fs/promises';
import path from 'node:path';

// Builds public/data/move-types.json — a compact { [moveId]: type } map for every
// move, so the UI can colour move chips by type without a per-move API call.
// Source: Pokémon Showdown's bulk moves data (one request, all moves).
// moveId is the normalized name (lowercase, alphanumerics only): "Aurora Veil" → "auroraveil".
// Run: node scripts/build-move-types.mjs

const SRC = 'https://play.pokemonshowdown.com/data/moves.json';
const DATA_DIR = path.join(process.cwd(), 'public', 'data');

const main = async () => {
    const res = await fetch(SRC, { redirect: 'follow' });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const data = await res.json();

    const byId = {};
    for (const [id, move] of Object.entries(data)) {
        if (move && typeof move.type === 'string') byId[id] = move.type.toLowerCase();
    }

    const count = Object.keys(byId).length;
    if (count === 0) {
        console.warn('No move types parsed — keeping existing move-types.json.');
        return;
    }

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
        path.join(DATA_DIR, 'move-types.json'),
        `${JSON.stringify({ generatedAt: new Date().toISOString(), source: SRC, count, byId }, null, 2)}\n`,
        'utf8',
    );
    console.log(`Wrote ${count} move types to public/data/move-types.json`);
};

// Build-safe: never fail the build/deploy over an optional enrichment.
main().catch((err) => {
    console.error('Move-type refresh failed (keeping existing data):', err?.message || err);
    process.exitCode = 0;
});
