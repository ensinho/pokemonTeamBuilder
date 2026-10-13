import fs from 'node:fs/promises';
import path from 'node:path';
import { Dex } from '@pkmn/sim';

// Builds public/data/battle-dex.json — the handful of move and species fields
// the battle screen's tooltips show (type, category, power, accuracy, PP, short
// description; types, base stats, abilities, height, weight).
//
// Until 2026-10-06 BattlePopover imported `Dex` from @pkmn/sim directly, which
// shipped the whole simulator to the browser: a 6.5 MB chunk (1 MB gzip) that
// the service worker then precached for every visitor, battle or not. The sim
// belongs to api/battle-turn.js; the client reads this file instead.
//
// Arrays, not objects, keep it small — see the field order in FIELDS below and
// in src/utils/battleDex.js, which must match.
// Run: node scripts/build-battle-dex.mjs (no network — reads the installed sim).

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

const FIELDS = {
    moves: ['name', 'type', 'category', 'basePower', 'accuracy', 'pp', 'shortDesc'],
    species: ['name', 'types', 'baseStats', 'abilities', 'heightm', 'weightkg'],
};

const main = async () => {
    const moves = {};
    for (const move of Dex.moves.all()) {
        if (!move.exists) continue;
        moves[move.id] = [
            move.name,
            (move.type || 'Normal').toLowerCase(),
            move.category || 'Status',
            move.basePower || 0,
            move.accuracy === true ? true : (move.accuracy || 0),
            move.pp || 0,
            move.shortDesc || move.desc || '',
        ];
    }

    const species = {};
    for (const spec of Dex.species.all()) {
        if (!spec.exists) continue;
        const s = spec.baseStats;
        species[spec.id] = [
            spec.name,
            spec.types.map((t) => t.toLowerCase()),
            [s.hp, s.atk, s.def, s.spa, s.spd, s.spe],
            Object.values(spec.abilities || {}).filter(Boolean),
            spec.heightm,
            spec.weightkg,
        ];
    }

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
        path.join(DATA_DIR, 'battle-dex.json'),
        `${JSON.stringify({ generatedAt: new Date().toISOString(), fields: FIELDS, moves, species })}\n`,
        'utf8',
    );
    console.log(`Wrote ${Object.keys(moves).length} moves and ${Object.keys(species).length} species to public/data/battle-dex.json`);
};

main().catch((err) => {
    console.error('battle-dex build failed:', err?.message || err);
    process.exitCode = 1;
});
